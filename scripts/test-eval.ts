import { prisma } from '../src/lib/db';
import { evaluatePurchasePlan } from '../src/lib/decision-engine';

async function test() {
  const product = await prisma.product.findFirst({
    where: { sku: 'SKU-A3-SKETCH-PLAIN' },
    include: { merchant: true },
  });

  console.log('Product:', product?.id, product?.name, product?.variant);

  const demandRequest = await prisma.demandRequest.findFirst({
    where: { productId: product!.id },
  });
  console.log('Demand:', demandRequest?.id, demandRequest?.quantity);

  const quotes = await prisma.supplierQuote.findMany({
    where: { productId: product!.id },
    include: { supplier: true },
  });
  console.log('Quotes count:', quotes.length);
  for (const q of quotes) {
    console.log('Quote:', q.supplier.name, q.unitCostPaise, q.validUntil);
  }

  const evaluation = evaluatePurchasePlan(
    {
      id: product!.id,
      name: product!.name,
      variant: product!.variant,
      sellingPricePaise: product!.sellingPricePaise,
      onHandQuantity: product!.onHandQuantity,
      reservedQuantity: product!.reservedQuantity,
    },
    {
      id: demandRequest!.id,
      productId: product!.id,
      variant: product!.variant,
      requestedQuantity: 12,
      confirmedQuantity: 12,
      confirmationState: 'CONFIRMED_COMMITMENT',
    },
    quotes.map((q) => ({
      id: q.id,
      supplierId: q.supplierId,
      supplierName: q.supplier.name,
      productId: q.productId,
      variant: q.variant,
      unitCostPaise: q.unitCostPaise,
      packSize: q.packSize,
      minOrderQuantity: q.minOrderQuantity,
      availableQuantity: q.availableQuantity,
      actionCostPaise: q.actionCostPaise,
      deliveryLeadHours: q.deliveryLeadHours,
      validUntil: q.validUntil,
    })),
    {
      availableBudgetPaise: 100000,
      minContributionPaise: 15000,
      maxSpeculativeUnits: 0,
      maxSpeculativeCostPaise: 0,
    }
  );

  console.log('Evaluation hasFeasibleOption:', evaluation.hasFeasibleOption);
  console.log('Best candidate:', evaluation.bestCandidate?.supplierName, evaluation.bestCandidate?.quantity);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
