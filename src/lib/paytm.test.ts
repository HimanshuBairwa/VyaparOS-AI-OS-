import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './db';
import {
  generatePaytmDynamicQr,
  recordPaytmInboundPayment,
  executePaytmVendorPayout,
  executePaytmInstantSettlement,
  getPaytmLedgerAndStatus,
} from './paytm-service';
import { seedDatabase } from './seed-data';

describe('Paytm Merchant Growth & Soundbox Integration Suite', () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it('1. Generates authentic Paytm All-in-One UPI dynamic intent string', () => {
    const qrResult = generatePaytmDynamicQr({
      amountPaise: 24000, // ₹240.00
      referenceType: 'SALE',
      referenceId: 'SALE-TEST-001',
      customerName: 'Aarav Sharma',
      note: 'Fine Arts Sketchbooks',
    });

    expect(qrResult.merchantVpa).toBe('paytmqr.collegecorner@paytm');
    expect(qrResult.amountRupees).toBe('240.00');
    expect(qrResult.amountPaise).toBe(24000);
    expect(qrResult.upiDeepLink).toContain('upi://pay?');
    expect(qrResult.upiDeepLink).toContain('pa=paytmqr.collegecorner%40paytm');
    expect(qrResult.upiDeepLink).toContain('am=240.00');
    expect(qrResult.upiDeepLink).toContain('mc=5943');
    expect(qrResult.qrId).toMatch(/^PTM_\d+_/);
  });

  it('2. Records inbound Paytm QR payment and creates unsettled PaymentEvent', async () => {
    const merchant = await prisma.merchant.findFirst();
    expect(merchant).toBeDefined();

    const paymentRes = await recordPaytmInboundPayment({
      merchantId: merchant!.id,
      amountPaise: 12000, // ₹120.00
      referenceType: 'SALE',
      referenceId: 'TEST-SALE-101',
      customerName: 'Pooja Nair',
      paymentMode: 'PAYTM_UPI',
      notes: 'Counter QR scan',
    });

    expect(paymentRes.transactionId).toMatch(/^PTM_TXN_/);
    expect(paymentRes.rrn).toHaveLength(12);
    expect(paymentRes.announcementText).toBe('Paytm par 120 rupaye prapt hue');

    const savedEvent = await prisma.paymentEvent.findUnique({
      where: { transactionId: paymentRes.transactionId },
    });
    expect(savedEvent).toBeDefined();
    expect(savedEvent!.amountPaise).toBe(12000);
    expect(savedEvent!.direction).toBe('INBOUND_SALE');
    expect(savedEvent!.isSettled).toBe(false); // Unsettled until instant settlement
  });

  it('3. Executes Paytm Instant Settlement (T+0): credits spendable budget atomically', async () => {
    const merchant = await prisma.merchant.findFirst();
    const initialBudget = merchant!.availableBudgetPaise;

    // Seed creates 1 unsettled payment of ₹110. Add one more for ₹120
    await recordPaytmInboundPayment({
      merchantId: merchant!.id,
      amountPaise: 12000,
      referenceType: 'SALE',
      referenceId: 'TEST-SALE-SETTLE',
      customerName: 'Campus Student',
    });

    const statusBefore = await getPaytmLedgerAndStatus(merchant!.id);
    expect(statusBefore.unsettledBalancePaise).toBe(23000); // ₹110 + ₹120 = ₹230

    // Trigger instant settlement
    const settleResult = await executePaytmInstantSettlement(merchant!.id);
    expect(settleResult.settledCount).toBe(2);
    expect(settleResult.totalSettledPaise).toBe(23000);
    expect(settleResult.newAvailableBudgetPaise).toBe(initialBudget + 23000);

    // Verify unsettled balance is now zero
    const statusAfter = await getPaytmLedgerAndStatus(merchant!.id);
    expect(statusAfter.unsettledBalancePaise).toBe(0);

    // Verify ledger contains the SETTLEMENT transaction
    const settlementEvent = await prisma.paymentEvent.findFirst({
      where: { direction: 'SETTLEMENT', merchantId: merchant!.id },
    });
    expect(settlementEvent).toBeDefined();
    expect(settlementEvent!.amountPaise).toBe(23000);
    expect(settlementEvent!.isSettled).toBe(true);
  });

  it('4. Executes Paytm Vendor Payout (B2B): verifies UTR and budget deduction', async () => {
    const merchant = await prisma.merchant.findFirst();
    const supplier = await prisma.supplier.findFirst({ where: { name: { contains: 'A' } } });
    const product = await prisma.product.findFirst({ where: { variant: 'A3 Plain' } });

    // Issue a purchase order for ₹990 (12 units @ ₹80 + ₹30 delivery)
    const po = await prisma.purchaseOrder.create({
      data: {
        merchantId: merchant!.id,
        supplierId: supplier!.id,
        productId: product!.id,
        poNumber: `PO-TEST-PAYOUT-${Date.now()}`,
        orderedQuantity: 12,
        unitCostPaise: 8000,
        actionCostPaise: 3000,
        totalOutflowPaise: 99000, // ₹990.00
        paymentStatus: 'UNPAID',
      },
    });

    const initialBudget = merchant!.availableBudgetPaise; // ₹1,000.00

    const payoutRes = await executePaytmVendorPayout({
      merchantId: merchant!.id,
      purchaseOrderId: po.id,
      amountPaise: 99000,
      supplierName: supplier!.name,
      supplierVpa: 'stationeryhub@paytm',
    });

    expect(payoutRes.success).toBe(true);
    expect(payoutRes.utr).toMatch(/^PAYTM\d+/);
    expect(payoutRes.newAvailableBudgetPaise).toBe(initialBudget - 99000); // ₹1,000 - ₹990 = ₹10
    expect(payoutRes.announcementText).toContain('Stationery Hub');

    // Verify PO status is updated to PAID
    const updatedPo = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    expect(updatedPo!.paymentStatus).toBe('PAID');

    // Verify outbound PaymentEvent is recorded with UTR
    const payoutEvent = await prisma.paymentEvent.findUnique({
      where: { transactionId: payoutRes.payoutId },
    });
    expect(payoutEvent).toBeDefined();
    expect(payoutEvent!.direction).toBe('OUTBOUND_PURCHASE');
    expect(payoutEvent!.amountPaise).toBe(99000);
  });

  it('5. Prevents vendor payout when merchant budget is insufficient', async () => {
    const merchant = await prisma.merchant.findFirst();
    const supplier = await prisma.supplier.findFirst();
    const product = await prisma.product.findFirst();

    const po = await prisma.purchaseOrder.create({
      data: {
        merchantId: merchant!.id,
        supplierId: supplier!.id,
        productId: product!.id,
        poNumber: `PO-TEST-OVERFLOW-${Date.now()}`,
        orderedQuantity: 50,
        unitCostPaise: 8000,
        actionCostPaise: 3000,
        totalOutflowPaise: 403000, // ₹4,030.00 (Exceeds ₹1,000 budget)
        paymentStatus: 'UNPAID',
      },
    });

    await expect(
      executePaytmVendorPayout({
        merchantId: merchant!.id,
        purchaseOrderId: po.id,
        amountPaise: 403000,
        supplierName: supplier!.name,
        supplierVpa: 'supplier@paytm',
      })
    ).rejects.toThrow('Insufficient spendable budget');
  });
});
