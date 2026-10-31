import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  evaluatePurchasePlan,
  ProductInput,
  DemandInput,
  QuoteInput,
  MerchantPolicy,
} from '@/lib/decision-engine';
import { z } from 'zod';

const EvaluateRequestSchema = z.object({
  productId: z.string().min(1),
  demandId: z.string().optional().nullable(),
  budgetPaiseOverride: z.number().int().nonnegative().optional(),
  confirmedQtyOverride: z.number().int().nonnegative().optional(),
  supplierPriceOverridePaise: z.number().int().positive().optional(),
  maxSpeculativeUnitsOverride: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = EvaluateRequestSchema.parse(body);

    // Fetch product
    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
      include: { merchant: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch demand request if provided, otherwise default to product pending demand
    let demandRequest = parsed.demandId
      ? await prisma.demandRequest.findUnique({ where: { id: parsed.demandId } })
      : await prisma.demandRequest.findFirst({
          where: { productId: product.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        });

    // Fetch all supplier quotes for this product
    const quotes = await prisma.supplierQuote.findMany({
      where: { productId: product.id },
      include: { supplier: true },
    });

    const merchant = product.merchant;

    // Build Decision Engine Inputs
    const productInput: ProductInput = {
      id: product.id,
      name: product.name,
      variant: product.variant,
      sellingPricePaise: product.sellingPricePaise,
      onHandQuantity: product.onHandQuantity,
      reservedQuantity: product.reservedQuantity,
    };

    const requestedQty = parsed.confirmedQtyOverride !== undefined
      ? parsed.confirmedQtyOverride
      : (demandRequest?.quantity ?? 0);

    const demandInput: DemandInput = {
      id: demandRequest?.id ?? 'virtual-demand',
      productId: product.id,
      variant: product.variant,
      requestedQuantity: requestedQty,
      confirmedQuantity: requestedQty,
      confirmationState: (demandRequest?.confirmationState as 'ENQUIRY' | 'CONFIRMED_COMMITMENT') ?? 'CONFIRMED_COMMITMENT',
      pickupDeadline: demandRequest?.requiredBy ?? undefined,
    };

    const quoteInputs: QuoteInput[] = quotes.map((q) => {
      // Allow overriding supplier price in simulation preview
      const unitCost = parsed.supplierPriceOverridePaise !== undefined
        ? parsed.supplierPriceOverridePaise
        : q.unitCostPaise;

      return {
        id: q.id,
        supplierId: q.supplierId,
        supplierName: q.supplier.name,
        productId: q.productId,
        variant: q.variant,
        unitCostPaise: unitCost,
        packSize: q.packSize,
        minOrderQuantity: q.minOrderQuantity,
        availableQuantity: q.availableQuantity,
        actionCostPaise: q.actionCostPaise,
        deliveryLeadHours: q.deliveryLeadHours,
        validUntil: q.validUntil,
      };
    });

    const policy: MerchantPolicy = {
      availableBudgetPaise: parsed.budgetPaiseOverride !== undefined
        ? parsed.budgetPaiseOverride
        : merchant.availableBudgetPaise,
      minContributionPaise: merchant.minContributionPaise,
      maxSpeculativeUnits: parsed.maxSpeculativeUnitsOverride !== undefined
        ? parsed.maxSpeculativeUnitsOverride
        : merchant.maxSpeculativeUnits,
      maxSpeculativeCostPaise: merchant.maxSpeculativeCostPaise,
      currentDateTime: new Date(),
    };

    // Run pure evaluation function (NO SIDE EFFECTS)
    const evaluation = evaluatePurchasePlan(productInput, demandInput, quoteInputs, policy);

    return NextResponse.json({
      product: productInput,
      demand: demandInput,
      policy: {
        availableBudgetPaise: policy.availableBudgetPaise,
        minContributionPaise: policy.minContributionPaise,
        maxSpeculativeUnits: policy.maxSpeculativeUnits,
      },
      evaluation,
    });
  } catch (error: any) {
    console.error('Error evaluating purchase plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate purchase plan' },
      { status: 400 }
    );
  }
}
