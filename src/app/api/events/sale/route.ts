import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const SaleLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
});

const SaleRequestSchema = z.object({
  merchantId: z.string().min(1),
  lines: z.array(SaleLineSchema).min(1),
  paymentMethod: z.enum(['CASH', 'UPI_PAYTM', 'KHATA_DUE']).default('CASH'),
  paymentStatus: z.enum(['PAID', 'PENDING', 'DUE']).default('PAID'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SaleRequestSchema.parse(body);

    // 1. Idempotency check: if an idempotency key was provided and already exists, return the existing sale
    if (parsed.idempotencyKey) {
      const existing = await prisma.sale.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        include: { lines: { include: { product: true } } },
      });
      if (existing) {
        return NextResponse.json({
          sale: existing,
          isDuplicate: true,
          message: 'Sale already recorded with this submission key.',
        });
      }
    }

    // 2. Calculate total amount
    const totalAmountPaise = parsed.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPricePaise,
      0
    );

    const saleNumber = `SALE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Atomic transaction: create Sale, SaleLines, update Product stock, and record StockMovement
    const result = await prisma.$transaction(async (tx) => {
      // Create Sale
      const sale = await tx.sale.create({
        data: {
          merchantId: parsed.merchantId,
          saleNumber,
          totalAmountPaise,
          paymentMethod: parsed.paymentMethod,
          paymentStatus: parsed.paymentStatus,
          notes: parsed.notes,
          idempotencyKey: parsed.idempotencyKey,
          lines: {
            create: parsed.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPricePaise: l.unitPricePaise,
              subtotalPaise: l.quantity * l.unitPricePaise,
            })),
          },
        },
        include: { lines: { include: { product: true } } },
      });

      // Update inventory and record stock movements
      for (const line of parsed.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });

        if (!product) {
          throw new Error(`Product not found: ${line.productId}`);
        }

        const newOnHand = product.onHandQuantity - line.quantity;

        // Update product on-hand quantity
        await tx.product.update({
          where: { id: line.productId },
          data: { onHandQuantity: newOnHand },
        });

        // Record stock movement continuous ledger
        await tx.stockMovement.create({
          data: {
            merchantId: parsed.merchantId,
            productId: line.productId,
            type: 'SALE',
            quantityDelta: -line.quantity,
            resultingOnHand: newOnHand,
            unitCostPaise: product.recordedUnitCostPaise,
            sourceType: 'SALE',
            sourceReferenceId: sale.id,
            notes: `Sale ${saleNumber} confirmed (${line.quantity} units)`,
          },
        });
      }

      // If paid via UPI/Paytm, record Paytm payment event idempotently
      if (parsed.paymentMethod === 'UPI_PAYTM') {
        const txnId = `PTM_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const rrn = `6${Math.floor(10000000000 + Math.random() * 90000000000)}`;
        await tx.paymentEvent.create({
          data: {
            merchantId: parsed.merchantId,
            provider: 'PAYTM_TEST',
            direction: 'INBOUND_SALE',
            amountPaise: totalAmountPaise,
            referenceType: 'SALE',
            referenceId: sale.id,
            transactionId: txnId,
            status: 'SUCCESS',
            isSettled: false,
            idempotencyKey: `IDEM-PAY-${sale.id}`,
            payloadJson: JSON.stringify({
              rrn,
              paymentMode: 'PAYTM_UPI',
              customerName: 'Counter Customer',
              soundboxAnnounced: true,
            }),
          },
        });
      }

      return sale;
    });

    return NextResponse.json({
      success: true,
      sale: result,
      message: `Sale ${saleNumber} recorded and stock ledger updated atomically.`,
    });
  } catch (error: any) {
    console.error('Error recording sale:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record sale' },
      { status: 400 }
    );
  }
}
