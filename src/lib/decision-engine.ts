/**
 * Munafa AI Decision Engine
 * 
 * Pure, deterministic, testable module that calculates feasible purchase options
 * for small merchants.
 * 
 * Rules:
 * - All monetary values use integer paise (1 Rupee = 100 paise).
 * - purchase_outflow = quantity * supplier_unit_cost + action_costs
 * - scenario_revenue = sold_quantity * selling_price
 * - scenario_contribution = scenario_revenue - cost_of_units_sold - applicable_action_costs
 * - scenario_cash_balance = actual_or_scenario_receipts - purchase_outflow
 * - Default policy: zero speculative units permitted unless merchant explicitly permits it.
 * - Confirmed unpaid demand is not spendable cash.
 */

export interface ProductInput {
  id: string;
  name: string;
  variant: string;
  sellingPricePaise: number;
  onHandQuantity: number;
  reservedQuantity: number;
}

export interface DemandInput {
  id: string;
  productId?: string;
  variant?: string;
  requestedQuantity: number;
  confirmedQuantity: number;
  confirmationState: 'ENQUIRY' | 'CONFIRMED_COMMITMENT';
  pickupDeadline?: Date;
}

export interface QuoteInput {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  variant: string;
  unitCostPaise: number;
  packSize: number;
  minOrderQuantity: number;
  availableQuantity: number;
  actionCostPaise: number;
  deliveryLeadHours: number;
  validUntil: Date;
}

export interface MerchantPolicy {
  availableBudgetPaise: number;
  minContributionPaise: number;
  maxSpeculativeUnits: number; // default 0
  maxSpeculativeCostPaise: number; // default 0
  currentDateTime?: Date;
}

export interface ScenarioResult {
  name: 'NO_SALE' | 'CONFIRMED_COMPLETE' | 'FULL_SELL_THROUGH' | 'PARTIAL_SALE';
  soldQuantity: number;
  revenuePaise: number;
  cogsPaise: number;
  actionCostsPaise: number;
  contributionPaise: number;
  remainingStockQuantity: number;
  remainingStockCostPaise: number;
  cashBalancePaise: number; // scenario_revenue - purchase_outflow
  explanation: string;
}

export interface CandidateEvaluation {
  quoteId: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  packCount: number;
  unitCostPaise: number;
  actionCostPaise: number;
  purchaseOutflowPaise: number;
  speculativeUnits: number;
  unresolvedDemandedUnits: number;
  isFeasible: boolean;
  blockers: string[];
  scenarios: {
    noSale: ScenarioResult;
    confirmedComplete: ScenarioResult;
    fullSellThrough: ScenarioResult;
  };
  rankingScore: number;
  whyThisSuggestion: string;
}

export interface DecisionResult {
  hasFeasibleOption: boolean;
  status: 'FEASIBLE' | 'NO_FEASIBLE_OPTION' | 'NEEDS_CONFIRMATION' | 'BUDGET_INSUFFICIENT' | 'QUOTE_EXPIRED';
  bestCandidate?: CandidateEvaluation;
  allEvaluations: CandidateEvaluation[];
  summaryMessage: string;
  blockers: string[];
  nextClarification?: string;
}

/**
 * Format paise to Indian Rupees display (e.g. ₹1,000 or ₹120.50)
 */
export function formatPaiseToRupees(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  
  const rupeesFormatted = rupees.toLocaleString('en-IN');
  const formatted = remainder > 0 
    ? `₹${rupeesFormatted}.${remainder.toString().padStart(2, '0')}` 
    : `₹${rupeesFormatted}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Convert Rupees to paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Calculate scenario breakdown for a given candidate quantity and unit cost
 */
export function calculateScenario(
  candidateQty: number,
  soldQty: number,
  sellingPricePaise: number,
  unitCostPaise: number,
  actionCostPaise: number,
  name: ScenarioResult['name'],
  explanation: string
): ScenarioResult {
  const actualSold = Math.min(candidateQty, Math.max(0, soldQty));
  const remainingQty = candidateQty - actualSold;
  const revenuePaise = actualSold * sellingPricePaise;
  const cogsPaise = actualSold * unitCostPaise;
  const contributionPaise = revenuePaise - cogsPaise - actionCostPaise;
  const purchaseOutflow = candidateQty * unitCostPaise + actionCostPaise;
  const cashBalancePaise = revenuePaise - purchaseOutflow;
  const remainingStockCostPaise = remainingQty * unitCostPaise;

  return {
    name,
    soldQuantity: actualSold,
    revenuePaise,
    cogsPaise,
    actionCostsPaise: actionCostPaise,
    contributionPaise,
    remainingStockQuantity: remainingQty,
    remainingStockCostPaise,
    cashBalancePaise,
    explanation,
  };
}

/**
 * Pure decision function: generates and ranks feasible purchase options
 */
export function evaluatePurchasePlan(
  product: ProductInput,
  demand: DemandInput,
  quotes: QuoteInput[],
  policy: MerchantPolicy
): DecisionResult {
  const currentDateTime = policy.currentDateTime ?? new Date();
  const blockers: string[] = [];
  const evaluations: CandidateEvaluation[] = [];

  // Available stock on hand after current reservations
  const availableOnHand = Math.max(0, product.onHandQuantity - product.reservedQuantity);

  // Policy check: zero confirmed demand
  const effectiveConfirmedDemand = demand.confirmationState === 'CONFIRMED_COMMITMENT' 
    ? demand.confirmedQuantity 
    : 0;

  if (effectiveConfirmedDemand === 0 && policy.maxSpeculativeUnits === 0) {
    return {
      hasFeasibleOption: false,
      status: 'NEEDS_CONFIRMATION',
      allEvaluations: [],
      summaryMessage: 'Zero confirmed demand under default policy. Customer confirmation requested before purchasing speculative stock.',
      blockers: ['No customer-confirmed demand recorded and speculative purchasing policy is disabled.'],
      nextClarification: 'Ask customer for confirmation before buying to avoid risking capital.',
    };
  }

  // Net units required from suppliers to satisfy customer commitment
  const netRequiredUnits = Math.max(0, effectiveConfirmedDemand - availableOnHand);

  // If we already have enough stock on hand
  if (netRequiredUnits === 0 && policy.maxSpeculativeUnits === 0) {
    return {
      hasFeasibleOption: false,
      status: 'NO_FEASIBLE_OPTION',
      allEvaluations: [],
      summaryMessage: `Existing available stock (${availableOnHand} units) is sufficient to fulfill confirmed demand (${effectiveConfirmedDemand} units). No purchase needed.`,
      blockers: ['Sufficient stock already on hand.'],
    };
  }

  // Evaluate candidate quotes
  for (const quote of quotes) {
    const quoteBlockers: string[] = [];

    // 1. Variant matching check
    if (quote.variant.toLowerCase().trim() !== product.variant.toLowerCase().trim()) {
      quoteBlockers.push(`Quote variant "${quote.variant}" does not match requested "${product.variant}".`);
    }

    // 2. Quote validity check
    if (new Date(quote.validUntil).getTime() < currentDateTime.getTime()) {
      quoteBlockers.push(`Quote from ${quote.supplierName} expired on ${new Date(quote.validUntil).toLocaleDateString()}. Block approval until reconfirmed.`);
    }

    // 3. Delivery deadline check
    if (demand.pickupDeadline) {
      const estimatedDeliveryTime = new Date(currentDateTime.getTime() + quote.deliveryLeadHours * 60 * 60 * 1000);
      if (estimatedDeliveryTime.getTime() > new Date(demand.pickupDeadline).getTime()) {
        quoteBlockers.push(`Delivery lead time (${quote.deliveryLeadHours}h) cannot meet customer pickup deadline.`);
      }
    }

    // Determine candidate quantities based on pack size and minimum order quantity
    const candidateQuantities: number[] = [];
    const packSize = Math.max(1, quote.packSize);
    const minQty = Math.max(quote.minOrderQuantity, packSize);

    // Enumerate candidate pack quantities up to available quantity
    for (let qty = minQty; qty <= quote.availableQuantity; qty += packSize) {
      candidateQuantities.push(qty);
    }

    // If no candidate quantities within supplier available limit
    if (candidateQuantities.length === 0) {
      quoteBlockers.push(`Supplier available stock (${quote.availableQuantity}) is less than minimum order quantity (${minQty}).`);
    }

    for (const qty of candidateQuantities) {
      const candidateBlockers = [...quoteBlockers];
      const purchaseOutflow = qty * quote.unitCostPaise + quote.actionCostPaise;
      const speculativeUnits = Math.max(0, qty - netRequiredUnits);
      const unresolvedUnits = Math.max(0, netRequiredUnits - qty);

      // Check speculative limit
      if (speculativeUnits > policy.maxSpeculativeUnits) {
        candidateBlockers.push(`Exceeds maximum permitted speculative inventory (${speculativeUnits} > ${policy.maxSpeculativeUnits}).`);
      }

      // Check budget
      if (purchaseOutflow > policy.availableBudgetPaise) {
        const shortfall = purchaseOutflow - policy.availableBudgetPaise;
        candidateBlockers.push(`Exceeds available budget ${formatPaiseToRupees(policy.availableBudgetPaise)} by ${formatPaiseToRupees(shortfall)}.`);
      }

      // Calculate scenarios
      // Scenario 1: No sale
      const noSaleScenario = calculateScenario(
        qty,
        0,
        product.sellingPricePaise,
        quote.unitCostPaise,
        quote.actionCostPaise,
        'NO_SALE',
        `If zero units sell, all ${qty} units remain as recorded inventory at cost ${formatPaiseToRupees(qty * quote.unitCostPaise)}.`
      );

      // Scenario 2: Confirmed complete (all confirmed demand sells up to purchased qty)
      const confirmedSold = Math.min(qty, effectiveConfirmedDemand);
      const confirmedScenario = calculateScenario(
        qty,
        confirmedSold,
        product.sellingPricePaise,
        quote.unitCostPaise,
        quote.actionCostPaise,
        'CONFIRMED_COMPLETE',
        `If all ${confirmedSold} customer-confirmed units sell at ${formatPaiseToRupees(product.sellingPricePaise)}, contribution is ${formatPaiseToRupees(confirmedSold * product.sellingPricePaise - confirmedSold * quote.unitCostPaise - quote.actionCostPaise)}.`
      );

      // Scenario 3: Full sell-through (all purchased units sell)
      const fullSellThroughScenario = calculateScenario(
        qty,
        qty,
        product.sellingPricePaise,
        quote.unitCostPaise,
        quote.actionCostPaise,
        'FULL_SELL_THROUGH',
        `If all ${qty} units sell at ${formatPaiseToRupees(product.sellingPricePaise)}, maximum contribution is ${formatPaiseToRupees(qty * product.sellingPricePaise - qty * quote.unitCostPaise - quote.actionCostPaise)}.`
      );

      // Check minimum contribution rule on confirmed complete
      if (confirmedScenario.contributionPaise < policy.minContributionPaise) {
        candidateBlockers.push(
          `Projected contribution (${formatPaiseToRupees(confirmedScenario.contributionPaise)}) is below merchant threshold of ${formatPaiseToRupees(policy.minContributionPaise)}.`
        );
      }

      const isFeasible = candidateBlockers.length === 0;

      // Ranking score calculation:
      // Primary: Fulfilling confirmed demand without exceeding budget,
      // Secondary: Contribution under confirmed complete scenario,
      // Penalty: Unresolved demanded units and speculative units.
      let rankingScore = 0;
      if (isFeasible) {
        // High score baseline for feasibility
        rankingScore = 1000000;
        // Prioritize contribution
        rankingScore += confirmedScenario.contributionPaise;
        // Heavy penalty for leaving confirmed customer demand unresolved
        rankingScore -= unresolvedUnits * 50000;
        // Small penalty for unnecessary speculative units
        rankingScore -= speculativeUnits * 2000;
      }

      const whyThisSuggestion = isFeasible
        ? `Purchase ${qty} units from ${quote.supplierName} (${qty / packSize} pack${qty / packSize > 1 ? 's' : ''}). Outflow ${formatPaiseToRupees(purchaseOutflow)}, delivering ${formatPaiseToRupees(confirmedScenario.contributionPaise)} contribution.`
        : `Cannot recommend ${qty} from ${quote.supplierName}: ${candidateBlockers[0]}`;

      evaluations.push({
        quoteId: quote.id,
        supplierId: quote.supplierId,
        supplierName: quote.supplierName,
        quantity: qty,
        packCount: Math.round(qty / packSize),
        unitCostPaise: quote.unitCostPaise,
        actionCostPaise: quote.actionCostPaise,
        purchaseOutflowPaise: purchaseOutflow,
        speculativeUnits,
        unresolvedDemandedUnits: unresolvedUnits,
        isFeasible,
        blockers: candidateBlockers,
        scenarios: {
          noSale: noSaleScenario,
          confirmedComplete: confirmedScenario,
          fullSellThrough: fullSellThroughScenario,
        },
        rankingScore,
        whyThisSuggestion,
      });
    }
  }

  // Filter feasible and sort by ranking score descending
  const feasibleEvaluations = evaluations.filter((e) => e.isFeasible);
  feasibleEvaluations.sort((a, b) => b.rankingScore - a.rankingScore);

  if (feasibleEvaluations.length > 0) {
    const best = feasibleEvaluations[0];
    const unresolvedNote = best.unresolvedDemandedUnits > 0 
      ? ` Note: ${best.unresolvedDemandedUnits} demanded units remain unresolved due to supplier pack or budget limits.` 
      : '';

    return {
      hasFeasibleOption: true,
      status: 'FEASIBLE',
      bestCandidate: best,
      allEvaluations: evaluations,
      summaryMessage: `Recommended: ${best.quantity} units from ${best.supplierName} for ${formatPaiseToRupees(best.purchaseOutflowPaise)} outflow.${unresolvedNote}`,
      blockers: [],
    };
  }

  // If no feasible options, extract top blockers
  const allBlockers = Array.from(new Set(evaluations.flatMap((e) => e.blockers)));
  
  // Check if budget was the universal issue
  const isBudgetConstraint = evaluations.length > 0 && evaluations.every((e) => e.blockers.some((b) => b.includes('Exceeds available budget')));
  const isQuoteExpired = quotes.length > 0 && quotes.every((q) => new Date(q.validUntil).getTime() < currentDateTime.getTime());

  let status: DecisionResult['status'] = 'NO_FEASIBLE_OPTION';
  let nextClarification = 'Adjust budget, negotiate supplier price or pack size, or verify customer requirements.';

  if (isQuoteExpired) {
    status = 'QUOTE_EXPIRED';
    nextClarification = 'Request fresh supplier quotes before approving purchase.';
  } else if (isBudgetConstraint) {
    status = 'BUDGET_INSUFFICIENT';
    const minNeededOutflow = Math.min(...evaluations.map((e) => e.purchaseOutflowPaise));
    const shortfall = minNeededOutflow - policy.availableBudgetPaise;
    nextClarification = `Increase purchasing budget by at least ${formatPaiseToRupees(shortfall)} to enable purchase.`;
  }

  return {
    hasFeasibleOption: false,
    status,
    allEvaluations: evaluations,
    summaryMessage: 'No feasible purchase option found matching budget, quote validity, and contribution criteria.',
    blockers: allBlockers.length > 0 ? allBlockers : ['No quotes or options meet criteria.'],
    nextClarification,
  };
}
