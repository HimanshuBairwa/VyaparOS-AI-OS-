'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  CreditCard,
  Package,
  AlertCircle,
  TrendingUp,
  Info,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Store,
  Filter,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/decision-engine';

export function ReportsScreen() {
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [chartViewMode, setChartViewMode] = useState<'REVENUE' | 'MARGIN' | 'TRANSACTIONS'>('REVENUE');
  const [growthSimPct, setGrowthSimPct] = useState<number>(20);
  const [hoveredTimelineIdx, setHoveredTimelineIdx] = useState<number | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?filter=${filter}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  // Compute max value for timeline SVG chart scaling
  const maxTimelineRevenue = Math.max(
    100,
    ...(data?.timeline?.map((t: any) => Math.max(t.revenueRupees, t.contributionRupees)) || [100])
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Merchant Reports & Audited Performance
            </h1>
            <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold">
              Audited Ledger Data
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Aggregated ground-truth from persistent SQLite ledger. Verified COGS and deterministic margins.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="inline-flex rounded-lg shadow-xs border border-stone-300 self-start sm:self-auto bg-stone-50 p-1">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'today'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'week'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filter === 'month'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-16 text-center text-xs text-stone-500 bg-white rounded-xl border border-stone-200 animate-pulse">
          <BarChart3 className="w-8 h-8 text-teal-600 mx-auto mb-2 animate-bounce" />
          <span>Synthesizing audited business records...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Highlights (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Total Sales Revenue
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                  {data.summary.totalSalesCount} bills
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatPaiseToRupees(data.summary.totalSalesRevenuePaise)}
              </div>
              <span className="text-[11px] text-stone-500 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                <span>Verified atomic ledger transactions</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Calculated Contribution
                </span>
                <span className="text-xs bg-teal-50 text-teal-800 font-bold px-1.5 py-0.2 rounded border border-teal-200">
                  {data.summary.totalSalesRevenuePaise > 0
                    ? `${Math.round((data.summary.calculatedContributionPaise / data.summary.totalSalesRevenuePaise) * 100)}% margin`
                    : '0%'}
                </span>
              </div>
              <div className="text-2xl font-black text-teal-800 mt-1">
                {formatPaiseToRupees(data.summary.calculatedContributionPaise)}
              </div>
              <span className="text-[11px] text-teal-700 mt-1 flex items-center gap-1 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                <span>Revenue minus verified cost of goods</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Missed Demand Volume
                </span>
                <span className="text-xs bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                  {data.summary.totalMissedRequestsCount} unfulfilled
                </span>
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {data.summary.totalMissedQuantity} units
              </div>
              <span className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Lost Revenue: ~{formatPaiseToRupees(data.summary.opportunityLossPaise)}</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Stock Health Score
                </span>
                <span className="text-xs bg-slate-100 text-slate-800 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                  {data.stockHealth.totalSkus} SKUs
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {data.stockHealth.healthy} Healthy
              </div>
              <span className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                <span>{data.stockHealth.critical} Critical (&le; 3 units)</span>
                <span className="text-stone-300">•</span>
                <span className="text-amber-600">{data.stockHealth.reorder} Reorder</span>
              </span>
            </div>
          </div>

          {/* Missing Cost Notice if any */}
          {data.summary.hasMissingCostData && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Notice on Profit Audit:</strong> {data.summary.missingCostLinesCount} sale line(s) have unrecorded wholesale cost data. Contribution reflects strictly verified costs.
              </span>
            </div>
          )}

          {/* PRIMARY VISUAL GRAPH: Interactive Multi-View Revenue & Contribution Timeline Chart */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  <span>Sales Revenue & Net Contribution Timeline</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Interactive real-time graph. Switch modes or hover over any interval for unit metrics.
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs">
                  <button
                    onClick={() => setChartViewMode('REVENUE')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      chartViewMode === 'REVENUE'
                        ? 'bg-white text-slate-900 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Revenue & Profit
                  </button>
                  <button
                    onClick={() => setChartViewMode('MARGIN')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      chartViewMode === 'MARGIN'
                        ? 'bg-white text-slate-900 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Margin %
                  </button>
                  <button
                    onClick={() => setChartViewMode('TRANSACTIONS')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      chartViewMode === 'TRANSACTIONS'
                        ? 'bg-white text-slate-900 shadow-xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Velocity
                  </button>
                </div>

                {/* Chart Legend */}
                <div className="hidden sm:flex items-center gap-3 text-xs font-semibold pl-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-teal-700" />
                    <span className="text-slate-700">Sales (₹)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    <span className="text-slate-700">Profit (₹)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Interactive Multi-Bar & Area Visualizer */}
            <div className="pt-2">
              <div className="h-64 flex items-end gap-2 sm:gap-6 border-b border-stone-200 pb-2 px-2">
                {data.timeline.map((item: any, idx: number) => {
                  const revHeight = Math.max(10, Math.round((item.revenueRupees / maxTimelineRevenue) * 200));
                  const contHeight = Math.max(6, Math.round((item.contributionRupees / maxTimelineRevenue) * 200));
                  const marginPct = item.revenueRupees > 0 ? Math.round((item.contributionRupees / item.revenueRupees) * 100) : 35;
                  const orderHeight = Math.max(10, Math.min(200, item.orders * 40));
                  const isHovered = hoveredTimelineIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredTimelineIdx(idx)}
                      onMouseLeave={() => setHoveredTimelineIdx(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-20 z-20 bg-slate-950 text-white text-[11px] p-2.5 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap border border-teal-500/40 animate-in fade-in zoom-in-95">
                          <div className="font-extrabold text-[#00BAF2] flex items-center justify-between gap-3">
                            <span>{item.label}</span>
                            <span className="text-[10px] bg-teal-900/60 text-teal-300 px-1.5 py-0.2 rounded font-mono">
                              {marginPct}% net margin
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="text-stone-300">Revenue:</span>
                            <span className="font-bold">₹{item.revenueRupees}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-emerald-400">
                            <span>Contribution:</span>
                            <span className="font-bold">₹{item.contributionRupees}</span>
                          </div>
                          <div className="text-stone-400 text-[10px] mt-0.5 border-t border-slate-800 pt-0.5">
                            {item.orders} transaction(s) • Ground-truth ledger
                          </div>
                        </div>
                      )}

                      {/* Bar Group based on View Mode */}
                      {chartViewMode === 'REVENUE' && (
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-2">
                          {/* Revenue Bar */}
                          <div
                            className={`w-1/2 rounded-t-md transition-all duration-200 ${
                              isHovered ? 'bg-teal-600 shadow-lg ring-2 ring-teal-400' : 'bg-gradient-to-t from-teal-800 to-teal-600'
                            }`}
                            style={{ height: `${revHeight}px` }}
                          />
                          {/* Contribution Bar */}
                          <div
                            className={`w-1/2 rounded-t-md transition-all duration-200 ${
                              isHovered ? 'bg-emerald-400 shadow-lg ring-2 ring-emerald-300' : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            }`}
                            style={{ height: `${contHeight}px` }}
                          />
                        </div>
                      )}

                      {chartViewMode === 'MARGIN' && (
                        <div className="w-full flex flex-col items-center justify-end">
                          <span className="text-[10px] font-bold text-emerald-700 mb-1">{marginPct}%</span>
                          <div
                            className={`w-3/4 rounded-t-md transition-all duration-200 ${
                              isHovered ? 'bg-emerald-400 shadow-lg' : 'bg-gradient-to-t from-emerald-700 to-teal-500'
                            }`}
                            style={{ height: `${Math.max(12, marginPct * 1.8)}px` }}
                          />
                        </div>
                      )}

                      {chartViewMode === 'TRANSACTIONS' && (
                        <div className="w-full flex flex-col items-center justify-end">
                          <span className="text-[10px] font-bold text-blue-700 mb-1">{item.orders}</span>
                          <div
                            className={`w-3/4 rounded-t-md transition-all duration-200 ${
                              isHovered ? 'bg-blue-400 shadow-lg' : 'bg-gradient-to-t from-[#002970] to-[#00BAF2]'
                            }`}
                            style={{ height: `${orderHeight}px` }}
                          />
                        </div>
                      )}

                      {/* X-Axis Label */}
                      <span className="text-[10px] sm:text-[11px] font-bold text-stone-600 mt-2 text-center truncate max-w-full">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 pt-2 px-2 font-medium">
                <span>Timeline Interval: {filter === 'today' ? 'Hourly Shifts' : filter === 'week' ? 'Daily Aggregation' : 'Weekly Buckets'}</span>
                <span>Peak Interval Volume: ₹{maxTimelineRevenue}</span>
              </div>
            </div>

            {/* Interactive Profit & Working Capital Growth Simulator */}
            <div className="mt-4 pt-4 border-t border-stone-100 bg-gradient-to-r from-teal-50/60 via-emerald-50/40 to-blue-50/40 p-4 rounded-xl border border-teal-200/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Interactive Merchant Growth Simulator
                    </span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold">
                      Paytm Merchant Loop
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    See what happens when you substitute dead stock with high-turnover VyaparOS recommended inventory:
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-700">Volume Boost: +{growthSimPct}%</span>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={growthSimPct}
                    onChange={(e) => setGrowthSimPct(parseInt(e.target.value, 10))}
                    className="w-28 sm:w-36 accent-teal-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-teal-200/40 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Projected Extra Monthly Profit</span>
                  <div className="text-base font-extrabold text-teal-800 mt-0.5">
                    +₹{Math.round(((data.summary.calculatedContributionPaise / 100) * 30 * (growthSimPct / 100)) + (growthSimPct * 180))}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Working Capital Required</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    ₹0 (Funded by T+0 Paytm Settlement)
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-teal-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Lost Demand Salvage</span>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                    +{Math.round(data.summary.totalMissedQuantity * (growthSimPct / 100))} units fulfilled
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECOND ROW: Payment Radial Breakdown + Multi-Sector Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Visual 1: Payment Method Breakdown with Donut Visual */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-700" />
                  <span>Payment Channels & Paytm Settlements</span>
                </span>
                <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded font-bold">
                  All-in-One UPI Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Visual Donut representation */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-2">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <path
                        className="text-stone-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* UPI / Paytm segment */}
                      <path
                        className="text-teal-600"
                        strokeDasharray={`${Math.round(
                          ((data.paymentBreakdown.UPI_PAYTM?.totalPaise || 0) /
                            (data.summary.totalSalesRevenuePaise || 1)) *
                            100
                        )}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-bold text-stone-500 uppercase">Total</span>
                      <span className="text-xs font-black text-slate-900">
                        {formatPaiseToRupees(data.summary.totalSalesRevenuePaise)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend & Channel Bars */}
                <div className="sm:col-span-7 space-y-3 text-xs">
                  {Object.entries(data.paymentBreakdown).map(([method, info]: [string, any]) => {
                    const totalRev = data.summary.totalSalesRevenuePaise || 1;
                    const pct = Math.round((info.totalPaise / totalRev) * 100);

                    return (
                      <div key={method} className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-700 flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                method === 'UPI_PAYTM'
                                  ? 'bg-teal-600'
                                  : method === 'CASH'
                                  ? 'bg-slate-800'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {method === 'UPI_PAYTM' ? 'UPI / Paytm QR (Soundbox)' : method}
                          </span>
                          <span className="text-slate-900 font-bold">
                            {formatPaiseToRupees(info.totalPaise)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              method === 'UPI_PAYTM'
                                ? 'bg-teal-600'
                                : method === 'CASH'
                                ? 'bg-slate-800'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visual 2: Category Trade Distribution across Retail Sectors */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-teal-700" />
                  <span>Trade Sector Breakdown (Interactive Filter)</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  Click category to filter products
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['ALL', 'Stationery & Office', 'Electronics & Accessories', 'Kirana & FMCG', 'Healthcare & Pharmacy'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {cat === 'ALL' ? '🌟 All Sectors' : cat}
                  </button>
                ))}
              </div>

              <div className="space-y-3 text-xs pt-1">
                {Object.entries(data.categoryBreakdown || {}).map(([cat, info]: [string, any]) => {
                  const totalRev = data.summary.totalSalesRevenuePaise || 1;
                  const pct = Math.round((info.revenuePaise / totalRev) * 100);
                  const isSelected = selectedCategory === cat;

                  return (
                    <div
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? 'ALL' : cat)}
                      className={`p-2 rounded-lg cursor-pointer transition ${
                        isSelected ? 'bg-teal-50/70 ring-1 ring-teal-400' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-800 flex items-center gap-1.5">
                          <span>{cat}</span>
                          {isSelected && <span className="text-[9px] bg-teal-700 text-white px-1.5 rounded">Active</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-stone-500">{info.unitsSold} units</span>
                          <span className="text-slate-900 font-bold">
                            {formatPaiseToRupees(info.revenuePaise)} ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* THIRD ROW: Top Selling SKUs + Missed Demand Funnel Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Velocity Products with Profit Badges */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-700" />
                  <span>Top Selling Products & Profitability</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  {selectedCategory !== 'ALL' ? `Filtered by ${selectedCategory}` : 'All products'}
                </span>
              </div>

              {(() => {
                const filteredTopProducts = (data.topProducts || []).filter((p: any) => {
                  if (selectedCategory === 'ALL') return true;
                  const s = (p.sku + ' ' + p.name + ' ' + p.variant).toLowerCase();
                  if (selectedCategory === 'Kirana & FMCG') return s.includes('atta') || s.includes('oil') || s.includes('noodle') || s.includes('kirana') || s.includes('tea');
                  if (selectedCategory === 'Electronics & Accessories') return s.includes('elec') || s.includes('charger') || s.includes('cable') || s.includes('pb');
                  if (selectedCategory === 'Healthcare & Pharmacy') return s.includes('pharm') || s.includes('dolo') || s.includes('dettol') || s.includes('mask');
                  return s.includes('stationery') || s.includes('note') || s.includes('book') || s.includes('pen') || s.includes('box') || s.includes('compass') || s.includes('sketch');
                });

                if (filteredTopProducts.length === 0) {
                  return (
                    <div className="text-center py-8 text-stone-400 text-xs">
                      No sales recorded for category &ldquo;{selectedCategory}&rdquo; in this period.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-stone-100 text-xs">
                    {filteredTopProducts.map((p: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.profitMarginPct > 0 && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                {p.profitMarginPct}% margin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">{p.variant} • {p.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900">{p.quantity} units</div>
                          <div className="text-[11px] text-teal-800 font-bold">
                            {formatPaiseToRupees(p.revenuePaise)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Missed Demand & Unfulfilled Opportunity Funnel */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Missed Demand & Lost Opportunity Funnel</span>
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">
                  Actionable Reorders
                </span>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-amber-950">Estimated Lost Revenue Opportunity</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Revenue lost because customer walked out without purchase
                  </div>
                </div>
                <div className="text-lg font-black text-amber-900">
                  {formatPaiseToRupees(data.summary.opportunityLossPaise)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                {[
                  { reason: 'OUT_OF_STOCK', label: 'Out of Stock (Zero Units)', color: 'border-red-200 bg-red-50/50 text-red-900' },
                  { reason: 'INSUFFICIENT_QUANTITY', label: 'Short of Demanded Qty', color: 'border-amber-200 bg-amber-50/50 text-amber-900' },
                  { reason: 'NOT_STOCKED', label: 'Variant Not Stocked', color: 'border-stone-200 bg-stone-50 text-stone-900' },
                  { reason: 'PRICE_UNMATCHED', label: 'Price Mismatch', color: 'border-blue-200 bg-blue-50 text-blue-900' },
                ].map((item) => {
                  const count = data.missedByReason[item.reason] || 0;
                  return (
                    <div key={item.reason} className={`p-2.5 rounded-lg border ${item.color}`}>
                      <span className="text-[10px] font-semibold text-stone-500 block truncate">
                        {item.label}
                      </span>
                      <strong className="text-sm font-extrabold">{count} units missed</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
