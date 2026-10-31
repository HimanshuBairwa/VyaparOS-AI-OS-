'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sliders,
  DollarSign,
  Package,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  formatPaiseToRupees,
  rupeesToPaise,
  calculateScenario,
  DecisionResult,
} from '@/lib/decision-engine';
import { ScreenTab } from './Navbar';
import { AiAdvisorPanel } from './AiAdvisorPanel';

interface PurchasePlanScreenProps {
  products: any[];
  pendingDemand: any[];
  merchant: any;
  defaultProductId?: string;
  defaultDemandId?: string;
  onPlanApproved: () => void;
  onNavigate: (tab: ScreenTab) => void;
}

export function PurchasePlanScreen({
  products,
  pendingDemand,
  merchant,
  defaultProductId,
  defaultDemandId,
  onPlanApproved,
  onNavigate,
}: PurchasePlanScreenProps) {
  // Find initial product (defaults to A3 Plain Sketchbook fixture if available)
  const initialProduct =
    products.find((p) => p.id === defaultProductId) ||
    products.find((p) => p.sku === 'SKU-A3-SKETCH-PLAIN') ||
    products[0];

  const initialDemand =
    pendingDemand.find((d) => d.id === defaultDemandId) ||
    pendingDemand.find((d) => d.productId === initialProduct?.id) ||
    pendingDemand[0];

  const [selectedProductId, setSelectedProductId] = useState<string>(initialProduct?.id || '');
  const [selectedDemandId, setSelectedDemandId] = useState<string>(initialDemand?.id || '');

  // Synchronize when defaultProductId / defaultDemandId change
  useEffect(() => {
    if (defaultProductId) {
      setSelectedProductId(defaultProductId);
    }
    if (defaultDemandId) {
      setSelectedDemandId(defaultDemandId);
      const matched = pendingDemand.find((d) => d.id === defaultDemandId);
      if (matched) {
        setConfirmedQuantity(matched.quantity);
      }
    }
  }, [defaultProductId, defaultDemandId, pendingDemand]);

  // Simulation Preview Controls (Preview has NO external side effects!)
  const [budgetRupees, setBudgetRupees] = useState<number>(1000); // Defaults to ₹1,000
  const [confirmedQuantity, setConfirmedQuantity] = useState<number>(12); // Defaults to 12
  const [supplierPriceOverrideRupees, setSupplierPriceOverrideRupees] = useState<number | null>(null);
  const [maxSpeculativeUnits, setMaxSpeculativeUnits] = useState<number>(0);

  // Partial-sale scenario slider (e.g. What if 8 sell instead of 12?)
  const [partialSoldQuantity, setPartialSoldQuantity] = useState<number>(8);

  // Evaluation state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<DecisionResult | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalMessage, setApprovalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Run pure evaluation on parameter change
  const runEvaluation = async () => {
    if (!selectedProductId) return;
    setIsLoading(true);
    setApprovalMessage(null);

    try {
      const res = await fetch('/api/decision/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          demandId: selectedDemandId || undefined,
          budgetPaiseOverride: rupeesToPaise(budgetRupees),
          confirmedQtyOverride: Number(confirmedQuantity),
          supplierPriceOverridePaise: supplierPriceOverrideRupees
            ? rupeesToPaise(supplierPriceOverrideRupees)
            : undefined,
          maxSpeculativeUnitsOverride: Number(maxSpeculativeUnits),
        }),
      });

      const data = await res.json();
      if (data.evaluation) {
        setEvaluationResult(data.evaluation);
      }
    } catch (err: any) {
      console.error('Failed to evaluate plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, [
    selectedProductId,
    selectedDemandId,
    budgetRupees,
    confirmedQuantity,
    supplierPriceOverrideRupees,
    maxSpeculativeUnits,
  ]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const bestCandidate = evaluationResult?.bestCandidate;

  // Compute live extra scenario: partial sell-through
  const partialScenario = bestCandidate
    ? calculateScenario(
        bestCandidate.quantity,
        partialSoldQuantity,
        selectedProduct?.sellingPricePaise || 12000,
        bestCandidate.unitCostPaise,
        bestCandidate.actionCostPaise,
        'PARTIAL_SALE',
        `${partialSoldQuantity} out of ${bestCandidate.quantity} units sold`
      )
    : null;

  // Handle Approve Purchase
  const handleApprove = async () => {
    if (!bestCandidate || !selectedProduct) return;
    setIsApproving(true);
    setApprovalMessage(null);

    try {
      const res = await fetch('/api/decision/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          productId: selectedProduct.id,
          supplierQuoteId: bestCandidate.quoteId,
          demandRequestId: selectedDemandId || undefined,
          proposedQuantity: bestCandidate.quantity,
          unitCostPaise: bestCandidate.unitCostPaise,
          actionCostPaise: bestCandidate.actionCostPaise,
          purchaseOutflowPaise: bestCandidate.purchaseOutflowPaise,
          projectedRevenuePaise: bestCandidate.scenarios.confirmedComplete.revenuePaise,
          projectedContributionPaise: bestCandidate.scenarios.confirmedComplete.contributionPaise,
          scenarioBreakdownJson: JSON.stringify(bestCandidate.scenarios),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setApprovalMessage({
          type: 'success',
          text: `Proposal Approved! Purchase Order ${data.purchaseOrder.poNumber} issued to ${bestCandidate.supplierName}. Allocated budget: ${formatPaiseToRupees(bestCandidate.purchaseOutflowPaise)}.`,
        });
        onPlanApproved();
      } else {
        setApprovalMessage({
          type: 'error',
          text: data.error || 'Failed to approve proposal.',
        });
      }
    } catch (err: any) {
      setApprovalMessage({ type: 'error', text: 'Approval failed.' });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-teal-600" />
          <h1 className="text-xl font-bold text-stone-900">Purchase Decision Engine & Proposal Workspace</h1>
        </div>
        <p className="text-xs text-stone-600 mt-1">
          Synthesizes recorded sales, confirmed customer demand, supplier quotes, and cash budget to calculate mathematically verified purchase recommendations.
        </p>
      </div>

      {approvalMessage && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center justify-between border ${
            approvalMessage.type === 'success'
              ? 'bg-teal-50 text-teal-900 border-teal-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {approvalMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-teal-700" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-700" />
            )}
            <span className="font-medium">{approvalMessage.text}</span>
          </div>
          {approvalMessage.type === 'success' && (
            <button
              onClick={() => onNavigate('ORDERS')}
              className="ml-4 px-3 py-1 bg-teal-800 text-white rounded text-xs font-semibold hover:bg-teal-900"
            >
              View in Orders & Results →
            </button>
          )}
        </div>
      )}

      {/* SIMULATION PREVIEW BAR (Interactive Sliders with ZERO side effects) */}
      <div className="bg-white p-5 rounded-lg border-2 border-stone-300 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Interactive Preview Controls (Zero Side Effects)
            </span>
          </div>
          <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded font-mono">
            Preview Mode • Live Recalculation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Target Product */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Target Product Variant:</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded bg-white text-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.variant}) — {formatPaiseToRupees(p.sellingPricePaise)}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Preset & Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-stone-700">Purchasing Budget:</label>
              <span className="font-bold text-teal-800">₹{budgetRupees}</span>
            </div>
            <input
              type="range"
              min="300"
              max="2000"
              step="50"
              value={budgetRupees}
              onChange={(e) => setBudgetRupees(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            {/* Quick Preset Buttons for Spec Validation */}
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => setBudgetRupees(1000)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  budgetRupees === 1000
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                ₹1,000 (Case 1)
              </button>
              <button
                onClick={() => setBudgetRupees(600)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  budgetRupees === 600
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                ₹600 (Case 2)
              </button>
              <button
                onClick={() => setBudgetRupees(500)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  budgetRupees === 500
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                ₹500 (Case 3)
              </button>
            </div>
          </div>

          {/* Customer Confirmed Demand Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-stone-700">Confirmed Demand:</label>
              <span className="font-bold text-stone-900">{confirmedQuantity} units</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={confirmedQuantity}
              onChange={(e) => setConfirmedQuantity(parseInt(e.target.value, 10))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
              <button
                onClick={() => setConfirmedQuantity(0)}
                className="underline hover:text-stone-800"
              >
                Set 0 (Case 5 Spec)
              </button>
              <button
                onClick={() => setConfirmedQuantity(12)}
                className="underline hover:text-stone-800"
              >
                Reset 12 (Full Order)
              </button>
            </div>
          </div>

          {/* Speculative Inventory Policy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-stone-700">Speculative Policy:</label>
              <span className="font-bold text-stone-900">{maxSpeculativeUnits} units</span>
            </div>
            <select
              value={maxSpeculativeUnits}
              onChange={(e) => setMaxSpeculativeUnits(parseInt(e.target.value, 10))}
              className="w-full p-2 border border-stone-300 rounded bg-white text-xs"
            >
              <option value="0">Default: 0 Uncommitted (Strict)</option>
              <option value="6">Allow up to 6 speculative units</option>
              <option value="12">Allow up to 12 speculative units</option>
            </select>
            <span className="text-[10px] text-stone-500 mt-1 block">
              Merchant control over purchasing unsold buffer stock
            </span>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && !evaluationResult && (
        <div className="bg-white p-8 rounded-lg border border-stone-200 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
          <span>Evaluating feasible purchase proposals...</span>
        </div>
      )}

      {/* CORE EVALUATION RESULT CARD */}
      {evaluationResult && (
        <div className="space-y-6">
          {evaluationResult.hasFeasibleOption && bestCandidate ? (
            /* FEASIBLE PROPOSAL */
            <div className="bg-white rounded-lg border-2 border-teal-600 shadow-md overflow-hidden">
              {/* Proposal Header */}
              <div className="bg-teal-50/80 px-6 py-4 border-b border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Validated Recommendation
                    </span>
                    <span className="text-xs text-teal-900 font-semibold">
                      Ranked #1 for Maximum Contribution & Demand Coverage
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 mt-1">
                    Buy {bestCandidate.quantity} units from {bestCandidate.supplierName}
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-xs text-stone-500 font-semibold uppercase">Total Outflow Needed</div>
                  <div className="text-2xl font-black text-stone-900">
                    {formatPaiseToRupees(bestCandidate.purchaseOutflowPaise)}
                  </div>
                </div>
              </div>

              {/* Rationale & Source Breakdown */}
              <div className="p-6 space-y-5">
                {/* Why this suggestion? */}
                <div className="bg-stone-50 p-4 rounded-md border border-stone-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    <HelpCircle className="w-4 h-4 text-teal-600" />
                    Why this suggestion?
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {bestCandidate.whyThisSuggestion}
                  </p>
                  {bestCandidate.unresolvedDemandedUnits > 0 && (
                    <div className="mt-2 text-xs font-semibold text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      ⚠ Note: {bestCandidate.unresolvedDemandedUnits} customer-demanded units remain unresolved because supplier pack size and available budget do not permit purchasing more units without breaking policy constraints.
                    </div>
                  )}
                </div>

                {/* Key Material Inputs Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Proposed Supplier</span>
                    <strong className="text-stone-900 text-sm">{bestCandidate.supplierName}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">4-hr delivery</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Unit Cost</span>
                    <strong className="text-stone-900 text-sm">{formatPaiseToRupees(bestCandidate.unitCostPaise)}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Pack of {bestCandidate.quantity / bestCandidate.packCount}</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Action / Freight Cost</span>
                    <strong className="text-stone-900 text-sm">{formatPaiseToRupees(bestCandidate.actionCostPaise)}</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">Fixed per delivery</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Projected Contribution</span>
                    <strong className="text-teal-800 text-sm">
                      {formatPaiseToRupees(bestCandidate.scenarios.confirmedComplete.contributionPaise)}
                    </strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">If confirmed demand sells</span>
                  </div>
                </div>

                {/* NAMED SCENARIOS COMPARISON (No invented probabilities!) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Honest Scenario Analysis (Visible Leftover & Cash Balances)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Scenario 1: No Sale */}
                    <div className="p-3.5 rounded border border-stone-200 bg-stone-50 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-stone-800 text-xs mb-1">
                          Scenario A: Zero Sales (No-Sale)
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug">
                          {bestCandidate.scenarios.noSale.explanation}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-stone-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Revenue:</span>
                          <span className="font-semibold">{formatPaiseToRupees(bestCandidate.scenarios.noSale.revenuePaise)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Leftover Inventory:</span>
                          <span className="font-semibold text-stone-800">
                            {bestCandidate.scenarios.noSale.remainingStockQuantity} units ({formatPaiseToRupees(bestCandidate.scenarios.noSale.remainingStockCostPaise)})
                          </span>
                        </div>
                        <div className="flex justify-between text-red-700 font-bold">
                          <span>Net Cash Balance:</span>
                          <span>{formatPaiseToRupees(bestCandidate.scenarios.noSale.cashBalancePaise)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scenario 2: Confirmed Orders Complete */}
                    <div className="p-3.5 rounded border-2 border-teal-600 bg-teal-50/50 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-teal-900 text-xs mb-1">
                          Scenario B: Confirmed Demand Fulfills
                        </div>
                        <p className="text-[11px] text-teal-800 leading-snug">
                          {bestCandidate.scenarios.confirmedComplete.explanation}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-teal-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-stone-600">Revenue:</span>
                          <span className="font-semibold text-stone-900">
                            {formatPaiseToRupees(bestCandidate.scenarios.confirmedComplete.revenuePaise)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-600">Contribution:</span>
                          <span className="font-bold text-teal-800">
                            {formatPaiseToRupees(bestCandidate.scenarios.confirmedComplete.contributionPaise)}
                          </span>
                        </div>
                        <div className="flex justify-between text-teal-900 font-bold">
                          <span>Net Cash Balance:</span>
                          <span>{formatPaiseToRupees(bestCandidate.scenarios.confirmedComplete.cashBalancePaise)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scenario 3: Full Sell-Through */}
                    <div className="p-3.5 rounded border border-stone-200 bg-stone-50 flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-stone-800 text-xs mb-1">
                          Scenario C: Full Sell-Through
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug">
                          {bestCandidate.scenarios.fullSellThrough.explanation}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-stone-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Max Revenue:</span>
                          <span className="font-semibold text-stone-900">
                            {formatPaiseToRupees(bestCandidate.scenarios.fullSellThrough.revenuePaise)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Max Contribution:</span>
                          <span className="font-bold text-stone-900">
                            {formatPaiseToRupees(bestCandidate.scenarios.fullSellThrough.contributionPaise)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-stone-900">
                          <span>Net Cash Balance:</span>
                          <span>{formatPaiseToRupees(bestCandidate.scenarios.fullSellThrough.cashBalancePaise)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Extra Scenario Slider (Spec: What if 8 sell instead of 12?) */}
                  <div className="bg-stone-50 p-4 rounded-md border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-stone-800">
                          Interactive Outcome Simulator: What if only {partialSoldQuantity} units sell?
                        </span>
                        <p className="text-[11px] text-stone-500">
                          Tests capital tied up and cash balance without assuming guaranteed sell-through
                        </p>
                      </div>
                      <span className="font-mono font-bold text-stone-900 text-xs">
                        {partialSoldQuantity} / {bestCandidate.quantity} units
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={bestCandidate.quantity}
                      value={partialSoldQuantity}
                      onChange={(e) => setPartialSoldQuantity(parseInt(e.target.value, 10))}
                      className="w-full accent-teal-600"
                    />

                    {partialScenario && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] bg-white p-2.5 rounded border border-stone-200 font-mono">
                        <div>
                          <span className="text-stone-500 block text-[10px]">Revenue:</span>
                          <strong>{formatPaiseToRupees(partialScenario.revenuePaise)}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">COGS:</span>
                          <strong>{formatPaiseToRupees(partialScenario.cogsPaise)}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">Contribution:</span>
                          <strong className="text-teal-700">{formatPaiseToRupees(partialScenario.contributionPaise)}</strong>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">Unsold Stock:</span>
                          <span>{partialScenario.remainingStockQuantity} pcs ({formatPaiseToRupees(partialScenario.remainingStockCostPaise)})</span>
                        </div>
                        <div>
                          <span className="text-stone-500 block text-[10px]">Net Cash Flow:</span>
                          <strong className={partialScenario.cashBalancePaise < 0 ? 'text-red-600' : 'text-stone-900'}>
                            {formatPaiseToRupees(partialScenario.cashBalancePaise)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Copilot & Voice Advisor Panel */}
                <AiAdvisorPanel
                  candidate={bestCandidate}
                  product={selectedProduct}
                  demand={pendingDemand.find((d) => d.id === selectedDemandId)}
                  budgetPaise={rupeesToPaise(budgetRupees)}
                  onApplyBudget={(b) => setBudgetRupees(b)}
                />

                {/* ACTION BUTTONS (Approve, Edit Facts, Dismiss) */}
                <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('RECORD')}
                      className="px-3 py-2 border border-stone-300 rounded text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Edit facts
                    </button>
                    <button
                      onClick={() => setEvaluationResult(null)}
                      className="px-3 py-2 border border-stone-300 rounded text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    >
                      Dismiss
                    </button>
                  </div>

                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isApproving ? 'Approving...' : 'Approve Purchase & Issue PO'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* NO FEASIBLE OPTION / BLOCKERS */
            <div className="bg-white rounded-lg border-2 border-stone-300 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-stone-900">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold">
                  {evaluationResult.status === 'NEEDS_CONFIRMATION'
                    ? 'Customer Confirmation Required Before Purchasing'
                    : evaluationResult.status === 'BUDGET_INSUFFICIENT'
                    ? 'Insufficient Available Budget'
                    : evaluationResult.status === 'QUOTE_EXPIRED'
                    ? 'Supplier Quote Expired'
                    : 'No Feasible Purchase Option Found'}
                </h2>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed">
                {evaluationResult.summaryMessage}
              </p>

              {/* Blockers list */}
              <div className="bg-amber-50 p-4 rounded-md border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                  Identified Blockers:
                </span>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                  {evaluationResult.blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* Next useful clarification */}
              {evaluationResult.nextClarification && (
                <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded border border-stone-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Next Actionable Clarification:</strong> {evaluationResult.nextClarification}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
