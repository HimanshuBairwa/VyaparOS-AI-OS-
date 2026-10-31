'use client';

import React from 'react';
import {
  AlertCircle,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  QrCode,
} from 'lucide-react';
import { ScreenTab } from './Navbar';
import { playPaytmPaymentReceived } from '@/lib/soundbox';
import { formatPaiseToRupees } from '@/lib/decision-engine';

interface DemandScreenProps {
  pendingDemand: any[];
  onNavigateToPurchasePlan: (productId: string, demandId: string) => void;
  onRefresh: () => void;
}

export function DemandScreen({
  pendingDemand,
  onNavigateToPurchasePlan,
  onRefresh,
}: DemandScreenProps) {
  const [isProcessingId, setIsProcessingId] = React.useState<string | null>(null);

  const handleCollectAdvance = async (d: any) => {
    setIsProcessingId(d.id);
    try {
      const unitPrice = d.product?.sellingPricePaise || 12000;
      const advancePaise = Math.round((d.quantity * unitPrice) * 0.5); // 50% advance deposit
      const res = await fetch('/api/paytm/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE_PAY',
          amountPaise: advancePaise,
          referenceType: 'DEMAND_ADVANCE',
          referenceId: d.id,
          customerName: d.customerName || 'Student Customer',
          note: `50% Advance for ${d.quantity} units ${d.product?.variant || 'Notebooks'}`,
          paymentMode: 'PAYTM_UPI',
        }),
      });

      const json = await res.json();
      if (json.success) {
        playPaytmPaymentReceived(advancePaise / 100);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingId(null);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Missed Customer Demand Requests</h1>
          <p className="text-xs text-stone-600 mt-1">
            Unfulfilled walk-in and phone requests. Confirmed commitments feed the purchase decision engine; casual enquiries remain explicitly uncommitted.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md self-start sm:self-auto">
          {pendingDemand.length} Pending Request{pendingDemand.length === 1 ? '' : 's'}
        </span>
      </div>

      {pendingDemand.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-stone-200 text-stone-500 text-sm">
          No unfulfilled demand requests recorded. All customer requests have either been satisfied or closed.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingDemand.map((d) => {
            const isConfirmed = d.confirmationState === 'CONFIRMED_COMMITMENT';

            return (
              <div
                key={d.id}
                className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider border ${
                        isConfirmed
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {isConfirmed ? 'Confirmed Commitment' : 'General Enquiry Only'}
                    </span>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {d.requiredBy
                        ? `Needed: ${new Date(d.requiredBy).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : 'No strict deadline'}
                    </span>
                  </div>

                  {/* Product Title and Quantity */}
                  <h3 className="text-base font-bold text-stone-900">
                    {d.quantity} units — {d.product ? `${d.product.name} (${d.product.variant})` : d.rawItemDescription}
                  </h3>

                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    {d.rawItemDescription}
                  </p>

                  {/* Metadata tags */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-600">
                    <span className="bg-stone-100 px-2 py-0.5 rounded">
                      Reason: <strong className="text-stone-800">{d.failureReason}</strong>
                    </span>
                    <span className="bg-stone-100 px-2 py-0.5 rounded">
                      Source: <strong className="text-stone-800">{d.source}</strong>
                    </span>
                    {d.customerName && (
                      <span className="bg-stone-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-400" />
                        {d.customerName}
                      </span>
                    )}
                    {d.customerContact && (
                      <span className="bg-stone-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Phone className="w-3 h-3 text-stone-400" />
                        {d.customerContact}
                      </span>
                    )}

                    {d.advanceAmountPaise > 0 ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Advance: {formatPaiseToRupees(d.advanceAmountPaise)} (Paytm)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCollectAdvance(d)}
                        disabled={isProcessingId === d.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#002970] hover:bg-[#001D4F] text-white text-[11px] font-semibold transition"
                        title="Collect 50% advance deposit via Paytm All-in-One QR"
                      >
                        <QrCode className="w-3 h-3 text-[#00BAF2]" />
                        {isProcessingId === d.id ? 'Collecting...' : 'Take Paytm Advance (50%)'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Footer with Action */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500">
                    {isConfirmed
                      ? '✓ Validated for purchase engine'
                      : '⚠ Unconfirmed demand excluded from spendable budget'}
                  </div>
                  {d.productId && (
                    <button
                      onClick={() => onNavigateToPurchasePlan(d.productId, d.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                      Plan Purchase
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
