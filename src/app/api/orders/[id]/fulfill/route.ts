import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const FulfillRequestSchema = z.object({
  soldQuantity: z.number().int().positive().optional(),
  sellingPricePaise: z.number().int().positive().optional(),
  paymentMethod: z.enum(['CASH', 'UPI_PAYTM', 'KHATA_DUE']).default('CASH'),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json().catch(() => ({}));
    const parsed = FulfillRequestSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { product: true, supplier: true, outcomes: true, proposal: true },
      });

      if (!order) {
        throw new Error('Purchase order not found');
      }

      if (order.status !== 'STOCK_RECEIVED') {
        throw new Error('Stock must be received from supplier before customer order can be fulfilled.');
      }

      const soldQty = parsed.soldQuantity ?? order.orderedQuantity;
      const sellingPrice = parsed.sellingPricePaise ?? order.product.sellingPricePaise;
      const revenuePaise = soldQty * sellingPrice;
      const cogsPaise = soldQty * order.unitCostPaise;
      const contributionPaise = revenuePaise - cogsPaise - order.actionCostPaise;
      const remainingStockQty = order.orderedQuantity - soldQty;
      const remainingCostPaise = remainingStockQty * order.unitCostPaise;
      const cashBalancePaise = revenuePaise - order.totalOutflowPaise;

      // 1. Deduct sold quantity from on-hand stock and release reservation
      const newOnHand = Math.max(0, order.product.onHandQuantity - soldQty);
      const newReserved = Math.max(0, order.product.reservedQuantity - order.orderedQuantity);

      const updatedProduct = await tx.product.update({
        where: { id: order.productId },
        data: {
          onHandQuantity: newOnHand,
          reservedQuantity: newReserved,
        },
      });

      // 2. Record Sale
      const saleNumber = `SALE-FULFILL-${order.poNumber}`;
      const sale = await tx.sale.create({
        data: {
          merchantId: order.merchantId,
          saleNumber,
          totalAmountPaise: revenuePaise,
          paymentMethod: parsed.paymentMethod,
          paymentStatus: 'PAID',
          notes: `Fulfilled against PO ${order.poNumber} (${soldQty} of ${order.orderedQuantity} units)`,
          lines: {
            create: [
              {
                productId: order.productId,
                quantity: soldQty,
                unitPricePaise: sellingPrice,
                subtotalPaise: revenuePaise,
              },
            ],
          },
        },
      });

      // 3. Record stock movement
      await tx.stockMovement.create({
        data: {
          merchantId: order.merchantId,
          productId: order.productId,
          type: 'SALE',
          quantityDelta: -soldQty,
          resultingOnHand: newOnHand,
          unitCostPaise: order.unitCostPaise,
          sourceType: 'SALE',
          sourceReferenceId: sale.id,
          notes: `Customer fulfilled: ${soldQty} units sold at ₹${(sellingPrice / 100).toFixed(2)}`,
        },
      });

      // 4. Update PurchaseOrder status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
        },
      });

      // 5. Update DemandRequest status if present
      if (order.proposal?.demandRequestId) {
        await tx.demandRequest.update({
          where: { id: order.proposal.demandRequestId },
          data: { status: 'FULFILLED' },
        });
      }

      // 6. Update Outcome record
      let outcome = order.outcomes[0];
      if (outcome) {
        outcome = await tx.outcome.update({
          where: { id: outcome.id },
          data: {
            actualQuantitySold: soldQty,
            actualRevenuePaise: revenuePaise,
            actualCostPaise: cogsPaise + order.actionCostPaise,
            actualContributionPaise: contributionPaise,
            remainingStockQuantity: remainingStockQty,
            notes: `Sold ${soldQty} of ${order.orderedQuantity}. Contribution: ₹${(contributionPaise / 100).toFixed(2)}. Remaining stock: ${remainingStockQty} units (recorded cost ₹${(remainingCostPaise / 100).toFixed(2)}). Cash balance: ₹${(cashBalancePaise / 100).toFixed(2)}.`,
          },
        });
      }

      // 7. Merchant spendable budget replenished by revenue earned
      const merchant = await tx.merchant.findUnique({ where: { id: order.merchantId } });
      if (merchant) {
        await tx.merchant.update({
          where: { id: merchant.id },
          data: {
            availableBudgetPaise: merchant.availableBudgetPaise + revenuePaise,
          },
        });
      }

      return {
        updatedOrder,
        updatedProduct,
        sale,
        outcome,
        metrics: {
          soldQuantity: soldQty,
          revenuePaise,
          cogsPaise,
          actionCostsPaise: order.actionCostPaise,
          contributionPaise,
          remainingStockQuantity: remainingStockQty,
          remainingCostPaise,
          cashBalancePaise,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Customer order fulfilled! Recorded ${result.metrics.soldQuantity} units sold. Realized contribution: ₹${(result.metrics.contributionPaise / 100).toFixed(2)}.`,
    });
  } catch (error: any) {
    console.error('Error fulfilling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fulfill order' },
      { status: 400 }
    );
  }
}
