import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ApproveRequestSchema = z.object({
  merchantId: z.string().min(1),
  productId: z.string().min(1),
  supplierQuoteId: z.string().min(1),
  demandRequestId: z.string().optional().nullable(),
  proposedQuantity: z.number().int().positive(),
  unitCostPaise: z.number().int().positive(),
  actionCostPaise: z.number().int().nonnegative(),
  purchaseOutflowPaise: z.number().int().positive(),
  projectedRevenuePaise: z.number().int().nonnegative(),
  projectedContributionPaise: z.number().int().nonnegative(),
  scenarioBreakdownJson: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ApproveRequestSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch quote and verify it is not expired
      const quote = await tx.supplierQuote.findUnique({
        where: { id: parsed.supplierQuoteId },
        include: { supplier: true },
      });

      if (!quote) {
        throw new Error('Supplier quote not found.');
      }

      if (new Date(quote.validUntil).getTime() < Date.now()) {
        throw new Error(`Quote from ${quote.supplier.name} has expired on ${new Date(quote.validUntil).toLocaleString()}. Please request an updated quote.`);
      }

      // 2. Fetch merchant and verify budget is sufficient (prevent concurrent double-spending)
      const merchant = await tx.merchant.findUnique({
        where: { id: parsed.merchantId },
      });

      if (!merchant) {
        throw new Error('Merchant not found.');
      }

      if (merchant.availableBudgetPaise < parsed.purchaseOutflowPaise) {
        throw new Error(
          `Insufficient available budget: Required ₹${(parsed.purchaseOutflowPaise / 100).toFixed(2)}, Available ₹${(merchant.availableBudgetPaise / 100).toFixed(2)}.`
        );
      }

      // 3. Deduct allocated budget from available budget
      const newBudget = merchant.availableBudgetPaise - parsed.purchaseOutflowPaise;
      await tx.merchant.update({
        where: { id: merchant.id },
        data: { availableBudgetPaise: newBudget },
      });

      // 4. Create Proposal record
      const proposal = await tx.proposal.create({
        data: {
          merchantId: parsed.merchantId,
          productId: parsed.productId,
          supplierId: quote.supplierId,
          supplierQuoteId: quote.id,
          demandRequestId: parsed.demandRequestId,
          proposedQuantity: parsed.proposedQuantity,
          packSize: quote.packSize,
          unitCostPaise: parsed.unitCostPaise,
          actionCostPaise: parsed.actionCostPaise,
          purchaseOutflowPaise: parsed.purchaseOutflowPaise,
          projectedRevenuePaise: parsed.projectedRevenuePaise,
          projectedContributionPaise: parsed.projectedContributionPaise,
          scenarioBreakdownJson: parsed.scenarioBreakdownJson,
          status: 'APPROVED',
          inputSnapshotHash: `HASH-${Date.now()}`,
        },
      });

      // 5. Generate Purchase Order
      const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          proposalId: proposal.id,
          merchantId: parsed.merchantId,
          supplierId: quote.supplierId,
          productId: parsed.productId,
          poNumber,
          orderedQuantity: parsed.proposedQuantity,
          unitCostPaise: parsed.unitCostPaise,
          actionCostPaise: parsed.actionCostPaise,
          totalOutflowPaise: parsed.purchaseOutflowPaise,
          status: 'ISSUED',
        },
        include: { supplier: true, product: true },
      });

      // 6. Create initial Outcome tracking row
      await tx.outcome.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          plannedQuantity: parsed.proposedQuantity,
          actualQuantityReceived: 0,
          actualQuantitySold: 0,
          actualRevenuePaise: 0,
          actualCostPaise: 0,
          actualContributionPaise: 0,
          remainingStockQuantity: 0,
          cancellationCount: 0,
          notes: 'Purchase order issued to supplier.',
        },
      });

      // 7. If linked to demand request, reserve quantity
      if (parsed.demandRequestId) {
        await tx.product.update({
          where: { id: parsed.productId },
          data: {
            reservedQuantity: {
              increment: parsed.proposedQuantity,
            },
          },
        });
      }

      return { purchaseOrder, proposal, newBudget };
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: result.purchaseOrder,
      proposal: result.proposal,
      newAvailableBudgetPaise: result.newBudget,
      message: `Purchase Order ${result.purchaseOrder.poNumber} issued to ${result.purchaseOrder.supplier.name} for ${result.purchaseOrder.orderedQuantity} units.`,
    });
  } catch (error: any) {
    console.error('Error approving proposal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve proposal' },
      { status: 400 }
    );
  }
}
