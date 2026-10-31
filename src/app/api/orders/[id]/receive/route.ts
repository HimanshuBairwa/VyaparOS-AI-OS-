import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { product: true, supplier: true, outcomes: true },
      });

      if (!order) {
        throw new Error('Purchase order not found');
      }

      if (order.status === 'STOCK_RECEIVED' || order.status === 'COMPLETED') {
        throw new Error('Stock for this purchase order has already been received into inventory.');
      }

      const receivedQty = order.orderedQuantity;
      const newOnHand = order.product.onHandQuantity + receivedQty;

      // 1. Update Product on-hand quantity
      const updatedProduct = await tx.product.update({
        where: { id: order.productId },
        data: { onHandQuantity: newOnHand },
      });

      // 2. Record StockMovement continuous ledger
      const movement = await tx.stockMovement.create({
        data: {
          merchantId: order.merchantId,
          productId: order.productId,
          type: 'PURCHASE_RECEIPT',
          quantityDelta: receivedQty,
          resultingOnHand: newOnHand,
          unitCostPaise: order.unitCostPaise,
          sourceType: 'PURCHASE_ORDER',
          sourceReferenceId: order.id,
          notes: `Received ${receivedQty} units against PO ${order.poNumber} from ${order.supplier.name}`,
        },
      });

      // 3. Update PurchaseOrder status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: 'STOCK_RECEIVED',
          receivedQuantity: receivedQty,
          receivedAt: new Date(),
        },
      });

      // 4. Update Outcome row
      if (order.outcomes.length > 0) {
        await tx.outcome.update({
          where: { id: order.outcomes[0].id },
          data: {
            actualQuantityReceived: receivedQty,
            actualCostPaise: order.totalOutflowPaise,
            remainingStockQuantity: receivedQty,
            notes: 'Goods physically received and added to shelf stock.',
          },
        });
      }

      return { updatedOrder, updatedProduct, movement };
    });

    return NextResponse.json({
      success: true,
      order: result.updatedOrder,
      product: result.updatedProduct,
      movement: result.movement,
      message: `Successfully received ${result.updatedOrder.receivedQuantity} units into inventory! Stock on hand is now ${result.updatedProduct.onHandQuantity}.`,
    });
  } catch (error: any) {
    console.error('Error receiving order stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to receive order' },
      { status: 400 }
    );
  }
}
