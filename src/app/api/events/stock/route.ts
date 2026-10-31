import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const StockMovementSchema = z.object({
  merchantId: z.string().min(1),
  productId: z.string().min(1),
  type: z.enum([
    'OPENING',
    'PURCHASE_RECEIPT',
    'CUSTOMER_RETURN',
    'SUPPLIER_RETURN',
    'DAMAGE',
    'DISCARD',
    'PHYSICAL_COUNT_CORRECTION',
  ]),
  quantityDelta: z.number().int(), // can be negative for damage/discard
  newPhysicalCount: z.number().int().optional(), // used if PHYSICAL_COUNT_CORRECTION
  unitCostPaise: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = StockMovementSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: parsed.productId },
      });

      if (!product) {
        throw new Error(`Product not found: ${parsed.productId}`);
      }

      let delta = parsed.quantityDelta;
      let resultingOnHand = product.onHandQuantity + delta;

      if (parsed.type === 'PHYSICAL_COUNT_CORRECTION' && parsed.newPhysicalCount !== undefined) {
        resultingOnHand = parsed.newPhysicalCount;
        delta = resultingOnHand - product.onHandQuantity;
      }

      if (resultingOnHand < 0) {
        throw new Error(`Invalid movement: resulting stock cannot be negative (${resultingOnHand}).`);
      }

      // Update product
      const updatedProduct = await tx.product.update({
        where: { id: parsed.productId },
        data: {
          onHandQuantity: resultingOnHand,
          lastPhysicalCountDate:
            parsed.type === 'PHYSICAL_COUNT_CORRECTION' ? new Date() : product.lastPhysicalCountDate,
          recordedUnitCostPaise: parsed.unitCostPaise ?? product.recordedUnitCostPaise,
        },
      });

      // Create ledger movement
      const movement = await tx.stockMovement.create({
        data: {
          merchantId: parsed.merchantId,
          productId: parsed.productId,
          type: parsed.type,
          quantityDelta: delta,
          resultingOnHand,
          unitCostPaise: parsed.unitCostPaise ?? product.recordedUnitCostPaise,
          sourceType: 'MANUAL',
          notes: parsed.notes || `Stock adjusted via ${parsed.type}`,
        },
        include: { product: true },
      });

      return { product: updatedProduct, movement };
    });

    return NextResponse.json({
      success: true,
      movement: result.movement,
      product: result.product,
      message: `Stock movement ${parsed.type} recorded. New on-hand: ${result.product.onHandQuantity} units.`,
    });
  } catch (error: any) {
    console.error('Error recording stock movement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record stock movement' },
      { status: 400 }
    );
  }
}
