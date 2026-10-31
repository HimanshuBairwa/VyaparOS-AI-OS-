'use client';

import React from 'react';
import {
  TrendingUp,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/decision-engine';
import { ScreenTab } from './Navbar';

interface TodayScreenProps {
  stats: {
    todaySalesCount: number;
    todaySalesTotalPaise: number;
    availableBudgetPaise: number;
    pendingDemandCount: number;
    quotesCount: number;
    ordersCount: number;
  };
  todaySales: any[];
  pendingDemand: any[];
  onNavigate: (tab: ScreenTab) => void;
  onOpenRecord: (type: 'SALE' | 'DEMAND' | 'QUOTE') => void;
  onOpenPaytmModal?: () => void;
}

export function TodayScreen({
  stats,
  todaySales,
  pendingDemand,
  onNavigate,
  onOpenRecord,
  onOpenPaytmModal,
}: TodayScreenProps) {
  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recorded Sales Today */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Recorded sales today</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {formatPaiseToRupees(stats.todaySalesTotalPaise)}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              ({stats.todaySalesCount} sale{stats.todaySalesCount === 1 ? '' : 's'})
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Atomic ledger entries recorded with payment confirmation
          </p>
        </div>

        {/* Money Available */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Money available</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-800">
              {formatPaiseToRupees(stats.availableBudgetPaise)}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Unreserved spendable budget for inventory purchases
          </p>
        </div>

        {/* Requests Needing Confirmation */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider">
            <span>Requests needing confirmation</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">
              {stats.pendingDemandCount}
            </span>
            <span className="text-xs text-stone-500 font-medium">unfulfilled requests</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Customer commitments awaiting stock reorder
          </p>
        </div>
      </div>

      {/* Paytm Soundbox & Instant Settlement Hub Banner */}
      {onOpenPaytmModal && (
        <div className="bg-gradient-to-r from-[#002970] via-[#002970] to-[#0A1A3A] text-white p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-[#00BAF2]/20">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00BAF2] text-[#002970] flex items-center justify-center font-black text-xl shadow">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight">Paytm Soundbox 3.0 & Instant Settlement</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  4G Online
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Collect UPI payments at the counter with Hindi voice announcements and instant T+0 settlement to your purchasing budget.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPaytmModal}
            className="px-4 py-2 rounded-lg bg-[#00BAF2] hover:bg-sky-400 text-[#002970] text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <span>Open Paytm Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Quick Capture Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onOpenRecord('SALE')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            Record a sale
          </button>
          <button
            onClick={() => onOpenRecord('DEMAND')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium hover:bg-amber-100 transition"
          >
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Customer asked for…
          </button>
          <button
            onClick={() => onOpenRecord('QUOTE')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 text-sm font-medium hover:bg-teal-100 transition"
          >
            <TrendingUp className="w-4 h-4 text-teal-700" />
            Add supplier quote
          </button>
        </div>
      </div>

      {/* Prioritised Action Cards (Up to Three) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Prioritised Action Cards
          </h2>
          <span className="text-xs text-stone-500">Evaluated against current inventory & quotes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Customer Order Opportunity */}
          <div className="bg-white p-5 rounded-lg border-2 border-teal-600 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-teal-700 mb-2">
                <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Priority 1: Urgent Demand
                </span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">
                12 units of A3 Plain Sketchbooks Needed
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Fine arts student requested 12 sketchbooks for tomorrow&apos;s project. Current shelf stock is 0.
                Supplier A offers 12 pcs @ ₹80/pc (Outflow ₹990 with ₹30 delivery).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-800">
                Projected Profit: ₹450
              </span>
              <button
                onClick={() => onNavigate('PURCHASE_PLAN')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                Review purchase
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Supplier Quote Expiry Watch */}
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-2">
                <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  Priority 2: Quote Watch
                </span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">
                Supplier A Quote Valid for 3 Days
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Wholesale pack of 12 @ ₹80/unit. Delivery charge ₹30. Guaranteed 4-hour delivery meets customer pickup deadline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Status: Valid</span>
              <button
                onClick={() => onNavigate('PURCHASE_PLAN')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900"
              >
                Inspect plan
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Spendable Cash Availability */}
          <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-2">
                <span className="bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  Priority 3: Liquidity Check
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-stone-900 text-base">
                ₹1,000 Spendable Budget Available
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Sufficient cash on hand to finance the 12-pack purchase from Supplier A (₹990 outflow) with zero overdraft risk.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Surplus: +₹10</span>
              <button
                onClick={() => onNavigate('PURCHASE_PLAN')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                Simulate budget
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Recorded Transactions Snapshot */}
      <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Today&apos;s Confirmed Sales
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            Atomic ledger records
          </span>
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm">
            No sales recorded today yet. Use &ldquo;Record a sale&rdquo; above.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {todaySales.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-stone-900 flex items-center gap-2">
                    <span>{sale.saleNumber}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 font-mono">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {sale.lines.map((l: any) => `${l.quantity}x ${l.product.name} (${l.product.variant})`).join(', ')}
                    {sale.notes && ` • ${sale.notes}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-stone-900">
                    {formatPaiseToRupees(sale.totalAmountPaise)}
                  </div>
                  <div className="text-[11px] text-teal-700 font-medium">
                    Stock deducted
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
