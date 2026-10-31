import { describe, it, expect } from 'vitest';
import {
  evaluatePurchasePlan,
  calculateScenario,
  ProductInput,
  DemandInput,
  QuoteInput,
  MerchantPolicy,
} from './decision-engine';

describe('Munafa AI Decision Engine Specification Fixture Tests', () => {
  // Test Fixture Setup
  const sketchbookA3: ProductInput = {
    id: 'prod-a3-sketchbook',
    name: 'Sketchbook',
    variant: 'A3 Plain',
    sellingPricePaise: 12000, // ₹120.00
    onHandQuantity: 0,
    reservedQuantity: 0,
  };

  const confirmedDemand12: DemandInput = {
    id: 'demand-student-order',
    productId: 'prod-a3-sketchbook',
    variant: 'A3 Plain',
    requestedQuantity: 12,
    confirmedQuantity: 12,
    confirmationState: 'CONFIRMED_COMMITMENT',
    pickupDeadline: new Date('2026-11-05T17:00:00+05:30'),
  };

  const supplierAQuote: QuoteInput = {
    id: 'quote-supplier-a',
    supplierId: 'supplier-a',
    supplierName: 'Supplier A',
    productId: 'prod-a3-sketchbook',
    variant: 'A3 Plain',
    unitCostPaise: 8000, // ₹80.00
    packSize: 12,
    minOrderQuantity: 12,
    availableQuantity: 12,
    actionCostPaise: 3000, // ₹30.00
    deliveryLeadHours: 4,
    validUntil: new Date('2026-11-04T18:00:00+05:30'),
  };

  const supplierBQuote: QuoteInput = {
    id: 'quote-supplier-b',
    supplierId: 'supplier-b',
    supplierName: 'Supplier B',
    productId: 'prod-a3-sketchbook',
    variant: 'A3 Plain',
    unitCostPaise: 8500, // ₹85.00
    packSize: 6,
    minOrderQuantity: 6,
    availableQuantity: 12,
    actionCostPaise: 3000, // ₹30.00
    deliveryLeadHours: 4,
    validUntil: new Date('2026-11-04T18:00:00+05:30'),
  };

  const basePolicy: MerchantPolicy = {
    availableBudgetPaise: 100000, // ₹1,000.00
    minContributionPaise: 15000,  // ₹150.00
    maxSpeculativeUnits: 0,       // Default 0 speculative units
    maxSpeculativeCostPaise: 0,
    currentDateTime: new Date('2026-11-01T10:00:00+05:30'),
  };

  it('Case 1 - Budget ₹1,000: recommends 12 from A, outflow ₹990, contribution ₹450 if all 12 sell', () => {
    const policy = { ...basePolicy, availableBudgetPaise: 100000 };
    const result = evaluatePurchasePlan(
      sketchbookA3,
      confirmedDemand12,
      [supplierAQuote, supplierBQuote],
      policy
    );

    expect(result.hasFeasibleOption).toBe(true);
    expect(result.status).toBe('FEASIBLE');
    expect(result.bestCandidate).toBeDefined();

    const best = result.bestCandidate!;
    expect(best.supplierName).toBe('Supplier A');
    expect(best.quantity).toBe(12);
    expect(best.purchaseOutflowPaise).toBe(99000); // ₹990.00 (12 * 80 + 30)
    expect(best.scenarios.confirmedComplete.contributionPaise).toBe(45000); // ₹450.00
    expect(best.unresolvedDemandedUnits).toBe(0);
  });

  it('Case 2 - Budget ₹600: recommends 6 from B, outflow ₹540, contribution ₹180, 6 units stay unresolved', () => {
    const policy = { ...basePolicy, availableBudgetPaise: 60000 };
    const result = evaluatePurchasePlan(
      sketchbookA3,
      confirmedDemand12,
      [supplierAQuote, supplierBQuote],
      policy
    );

    expect(result.hasFeasibleOption).toBe(true);
    expect(result.status).toBe('FEASIBLE');
    expect(result.bestCandidate).toBeDefined();

    const best = result.bestCandidate!;
    expect(best.supplierName).toBe('Supplier B');
    expect(best.quantity).toBe(6);
    expect(best.purchaseOutflowPaise).toBe(54000); // ₹540.00 (6 * 85 + 30)
    expect(best.scenarios.confirmedComplete.contributionPaise).toBe(18000); // ₹180.00
    expect(best.unresolvedDemandedUnits).toBe(6); // 6 demanded units remain unresolved
  });

  it('Case 3 - Budget ₹500: returns no feasible purchase', () => {
    const policy = { ...basePolicy, availableBudgetPaise: 50000 };
    const result = evaluatePurchasePlan(
      sketchbookA3,
      confirmedDemand12,
      [supplierAQuote, supplierBQuote],
      policy
    );

    expect(result.hasFeasibleOption).toBe(false);
    expect(result.status).toBe('BUDGET_INSUFFICIENT');
    expect(result.bestCandidate).toBeUndefined();
    expect(result.blockers.some((b) => b.includes('Exceeds available budget'))).toBe(true);
  });

  it('Case 4 - Expired quote: blocks approval until reconfirmed', () => {
    const expiredSupplierAQuote: QuoteInput = {
      ...supplierAQuote,
      validUntil: new Date('2026-10-31T09:00:00+05:30'), // Already expired
    };

    const policy = {
      ...basePolicy,
      currentDateTime: new Date('2026-10-31T12:00:00+05:30'),
    };

    const result = evaluatePurchasePlan(
      sketchbookA3,
      confirmedDemand12,
      [expiredSupplierAQuote],
      policy
    );

    expect(result.hasFeasibleOption).toBe(false);
    expect(result.status).toBe('QUOTE_EXPIRED');
    expect(result.blockers.some((b) => b.includes('expired'))).toBe(true);
  });

  it('Case 5 - Zero confirmed demand under default policy: requests confirmation rather than approve purchase', () => {
    const unconfirmedDemand: DemandInput = {
      ...confirmedDemand12,
      confirmedQuantity: 0,
      confirmationState: 'ENQUIRY',
    };

    const result = evaluatePurchasePlan(
      sketchbookA3,
      unconfirmedDemand,
      [supplierAQuote, supplierBQuote],
      basePolicy
    );

    expect(result.hasFeasibleOption).toBe(false);
    expect(result.status).toBe('NEEDS_CONFIRMATION');
    expect(result.summaryMessage).toContain('Zero confirmed demand under default policy');
  });

  it('Case 6 - Extra scenario: If 12 from A purchased and only 8 sell', () => {
    // 12 purchased, unit cost ₹80, action cost ₹30, selling price ₹120, 8 sold
    const scenario = calculateScenario(
      12,
      8,
      12000, // ₹120
      8000,  // ₹80
      3000,  // ₹30
      'PARTIAL_SALE',
      '8 out of 12 units sold'
    );

    expect(scenario.soldQuantity).toBe(8);
    expect(scenario.revenuePaise).toBe(96000); // ₹960 (8 * 120)
    expect(scenario.cogsPaise).toBe(64000);    // ₹640 (8 * 80)
    expect(scenario.actionCostsPaise).toBe(3000); // ₹30
    expect(scenario.contributionPaise).toBe(29000); // ₹290 (960 - 640 - 30)
    expect(scenario.remainingStockQuantity).toBe(4); // 4 units remain
    expect(scenario.remainingStockCostPaise).toBe(32000); // Recorded cost ₹320 (4 * 80)
    expect(scenario.cashBalancePaise).toBe(-3000); // Receipts minus purchase outflow: 960 - 990 = -₹30
  });

  it('Case 7 - Variant separation: A3 and A4 remain separate and do not cross-match', () => {
    const quoteA4: QuoteInput = {
      ...supplierAQuote,
      id: 'quote-a4',
      variant: 'A4 Plain',
    };

    const result = evaluatePurchasePlan(
      sketchbookA3, // Needs A3 Plain
      confirmedDemand12,
      [quoteA4],
      basePolicy
    );

    expect(result.hasFeasibleOption).toBe(false);
    expect(result.blockers.some((b) => b.includes('does not match'))).toBe(true);
  });
});
