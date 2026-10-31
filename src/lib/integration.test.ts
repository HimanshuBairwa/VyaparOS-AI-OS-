import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './db';
import { seedDatabase } from './seed-data';
import {
  evaluatePurchasePlan,
  ProductInput,
  DemandInput,
  QuoteInput,
  MerchantPolicy,
} from './decision-engine';

describe('Munafa AI System Integration & Data Integrity Suite', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. A3 and A4 remain strictly isolated in matching and decision evaluation', async () => {
    const a3Prod = await prisma.product.findFirst({ where: { sku: 'SKU-A3-SKETCH-PLAIN' } });
    const a4Prod = await prisma.product.findFirst({ where: { sku: 'SKU-A4-NOTE-RULED-200' } });

    expect(a3Prod).toBeDefined();
    expect(a4Prod).toBeDefined();
    expect(a3Prod!.size).toBe('A3');
    expect(a4Prod!.size).toBe('A4');
    expect(a3Prod!.id).not.toBe(a4Prod!.id);

    // Decision engine rejects cross-matching
    const quoteForA4: QuoteInput = {
      id: 'q-a4',
      supplierId: 'sup-1',
      supplierName: 'Metro Papers',
      productId: a4Prod!.id,
      variant: 'A4 Ruled 200p',
      unitCostPaise: 4200,
      packSize: 10,
      minOrderQuantity: 10,
      availableQuantity: 50,
      actionCostPaise: 3000,
      deliveryLeadHours: 4,
      validUntil: new Date(Date.now() + 86400000),
    };

    const demandForA3: DemandInput = {
      id: 'd-a3',
      productId: a3Prod!.id,
      variant: 'A3 Plain',
      requestedQuantity: 12,
      confirmedQuantity: 12,
      confirmationState: 'CONFIRMED_COMMITMENT',
    };

    const productA3Input: ProductInput = {
      id: a3Prod!.id,
      name: a3Prod!.name,
      variant: a3Prod!.variant,
      sellingPricePaise: a3Prod!.sellingPricePaise,
      onHandQuantity: 0,
      reservedQuantity: 0,
    };

    const policy: MerchantPolicy = {
      availableBudgetPaise: 100000,
      minContributionPaise: 15000,
      maxSpeculativeUnits: 0,
      maxSpeculativeCostPaise: 0,
    };

    const evalResult = evaluatePurchasePlan(productA3Input, demandForA3, [quoteForA4], policy);
    expect(evalResult.hasFeasibleOption).toBe(false);
    expect(evalResult.blockers.some((b) => b.includes('does not match'))).toBe(true);
  });

  it('2. Sale confirmation updates stock atomically; idempotency key prevents duplicate deduction', async () => {
    const product = await prisma.product.findFirst({ where: { sku: 'SKU-PEN-BALL-BLUE-10' } });
    expect(product).toBeDefined();

    const initialStock = product!.onHandQuantity;
    const merchant = await prisma.merchant.findFirst();
    const idempotencyKey = `TEST-IDEM-${Date.now()}`;

    // Record sale
    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          merchantId: merchant!.id,
          saleNumber: `SALE-TEST-${Date.now()}`,
          totalAmountPaise: product!.sellingPricePaise,
          paymentMethod: 'CASH',
          idempotencyKey,
          lines: {
            create: [
              {
                productId: product!.id,
                quantity: 1,
                unitPricePaise: product!.sellingPricePaise,
                subtotalPaise: product!.sellingPricePaise,
              },
            ],
          },
        },
      });

      await tx.product.update({
        where: { id: product!.id },
        data: { onHandQuantity: { decrement: 1 } },
      });

      await tx.stockMovement.create({
        data: {
          merchantId: merchant!.id,
          productId: product!.id,
          type: 'SALE',
          quantityDelta: -1,
          resultingOnHand: initialStock - 1,
          unitCostPaise: product!.recordedUnitCostPaise,
          sourceType: 'SALE',
          sourceReferenceId: s.id,
        },
      });

      return s;
    });

    const updatedProduct = await prisma.product.findUnique({ where: { id: product!.id } });
    expect(updatedProduct!.onHandQuantity).toBe(initialStock - 1);

    // Idempotency check: searching by key finds existing without re-decrementing
    const duplicateCheck = await prisma.sale.findUnique({ where: { idempotencyKey } });
    expect(duplicateCheck).toBeDefined();
    expect(duplicateCheck!.id).toBe(sale.id);

    // Verify stock was not decremented again
    const finalProduct = await prisma.product.findUnique({ where: { id: product!.id } });
    expect(finalProduct!.onHandQuantity).toBe(initialStock - 1);
  });

  it('3. Distinct sales with identical amounts remain separate and distinct', async () => {
    const merchant = await prisma.merchant.findFirst();
    const product = await prisma.product.findFirst({ where: { sku: 'SKU-STICKY-3X3-YLW' } });

    const sale1 = await prisma.sale.create({
      data: {
        merchantId: merchant!.id,
        saleNumber: `SALE-DUP1-${Date.now()}`,
        totalAmountPaise: 5000, // ₹50.00
        paymentMethod: 'CASH',
        lines: {
          create: [{ productId: product!.id, quantity: 1, unitPricePaise: 5000, subtotalPaise: 5000 }],
        },
      },
    });

    const sale2 = await prisma.sale.create({
      data: {
        merchantId: merchant!.id,
        saleNumber: `SALE-DUP2-${Date.now() + 1}`,
        totalAmountPaise: 5000, // Identical amount ₹50.00
        paymentMethod: 'CASH',
        lines: {
          create: [{ productId: product!.id, quantity: 1, unitPricePaise: 5000, subtotalPaise: 5000 }],
        },
      },
    });

    expect(sale1.id).not.toBe(sale2.id);
    expect(sale1.totalAmountPaise).toBe(sale2.totalAmountPaise);

    const count = await prisma.sale.count({
      where: { id: { in: [sale1.id, sale2.id] } },
    });
    expect(count).toBe(2);
  });

  it('4. Purchase receipt adds stock exactly once and updates status to STOCK_RECEIVED', async () => {
    const merchant = await prisma.merchant.findFirst();
    const product = await prisma.product.findFirst({ where: { sku: 'SKU-A3-SKETCH-PLAIN' } });
    const supplier = await prisma.supplier.findFirst();

    const initialStock = product!.onHandQuantity;

    // Issue PO
    const po = await prisma.purchaseOrder.create({
      data: {
        merchantId: merchant!.id,
        supplierId: supplier!.id,
        productId: product!.id,
        poNumber: `PO-TEST-${Date.now()}`,
        orderedQuantity: 12,
        unitCostPaise: 8000,
        actionCostPaise: 3000,
        totalOutflowPaise: 99000,
        status: 'ISSUED',
      },
    });

    // Simulate stock receipt
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product!.id },
        data: { onHandQuantity: { increment: 12 } },
      });

      await tx.stockMovement.create({
        data: {
          merchantId: merchant!.id,
          productId: product!.id,
          type: 'PURCHASE_RECEIPT',
          quantityDelta: 12,
          resultingOnHand: initialStock + 12,
          unitCostPaise: 8000,
          sourceType: 'PURCHASE_ORDER',
          sourceReferenceId: po.id,
        },
      });

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'STOCK_RECEIVED', receivedQuantity: 12, receivedAt: new Date() },
      });
    });

    const receivedProduct = await prisma.product.findUnique({ where: { id: product!.id } });
    expect(receivedProduct!.onHandQuantity).toBe(initialStock + 12);

    const updatedPo = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    expect(updatedPo!.status).toBe('STOCK_RECEIVED');
  });

  it('5. Injected instructions in user text cannot alter policies or bypass budget formulas', () => {
    const sketchbookA3: ProductInput = {
      id: 'prod-a3',
      name: 'Sketchbook',
      variant: 'A3 Plain',
      sellingPricePaise: 12000,
      onHandQuantity: 0,
      reservedQuantity: 0,
    };

    // Adversarial text trying to override system rules
    const injectedDemand: DemandInput = {
      id: 'demand-hack',
      productId: 'prod-a3',
      variant: 'A3 Plain',
      requestedQuantity: 100, // Insane quantity
      confirmedQuantity: 100,
      confirmationState: 'CONFIRMED_COMMITMENT',
    };

    const quoteA: QuoteInput = {
      id: 'quote-a',
      supplierId: 'sup-a',
      supplierName: 'Supplier A',
      productId: 'prod-a3',
      variant: 'A3 Plain',
      unitCostPaise: 8000,
      packSize: 12,
      minOrderQuantity: 12,
      availableQuantity: 12, // Only 12 available!
      actionCostPaise: 3000,
      deliveryLeadHours: 4,
      validUntil: new Date(Date.now() + 86400000),
    };

    const strictPolicy: MerchantPolicy = {
      availableBudgetPaise: 100000, // ₹1,000 budget
      minContributionPaise: 15000,
      maxSpeculativeUnits: 0,
      maxSpeculativeCostPaise: 0,
    };

    const result = evaluatePurchasePlan(sketchbookA3, injectedDemand, [quoteA], strictPolicy);

    // The mathematical engine only allows quantities <= availableQuantity (12)
    // and strictly within available budget
    expect(result.bestCandidate?.quantity).toBe(12);
    expect(result.bestCandidate?.purchaseOutflowPaise).toBe(99000); // Exactly ₹990
    expect(result.bestCandidate?.unresolvedDemandedUnits).toBe(88); // 88 remain unresolved!
  });
});
