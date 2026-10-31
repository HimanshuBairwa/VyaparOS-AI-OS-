'use client';

import React from 'react';
import {
  Calendar,
  PlusCircle,
  Package,
  AlertCircle,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  RotateCcw,
  Volume2,
  Store,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/decision-engine';

export type ScreenTab =
  | 'TODAY'
  | 'RECORD'
  | 'STOCK'
  | 'DEMAND'
  | 'PURCHASE_PLAN'
  | 'ORDERS'
  | 'REPORTS';

interface NavbarProps {
  currentTab: ScreenTab;
  onTabChange: (tab: ScreenTab) => void;
  availableBudgetPaise: number;
  onResetDemo: () => void;
  isResetting: boolean;
  onOpenPaytmModal?: () => void;
}

export function Navbar({
  currentTab,
  onTabChange,
  availableBudgetPaise,
  onResetDemo,
  isResetting,
  onOpenPaytmModal,
}: NavbarProps) {
  const tabs = [
    { id: 'TODAY' as ScreenTab, label: 'Today', icon: Calendar },
    { id: 'RECORD' as ScreenTab, label: 'Record', icon: PlusCircle },
    { id: 'STOCK' as ScreenTab, label: 'Stock', icon: Package },
    { id: 'DEMAND' as ScreenTab, label: 'Demand', icon: AlertCircle },
    { id: 'PURCHASE_PLAN' as ScreenTab, label: 'Purchase Plan', icon: TrendingUp },
    { id: 'ORDERS' as ScreenTab, label: 'Orders & Results', icon: ShoppingBag },
    { id: 'REPORTS' as ScreenTab, label: 'Reports', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-3">
          {/* Brand Mark: VyaparOS AI (Munafa AI) */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-700 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm">
              V
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-none flex items-center gap-1">
                <span>VyaparOS AI</span>
                <span className="text-[10px] text-stone-400 font-normal hidden xl:inline">(Munafa AI)</span>
              </div>
              <div className="text-[10px] text-teal-700 font-bold tracking-wide mt-0.5 truncate max-w-[130px] sm:max-w-none">
                Universal Retail Copilot
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Horizontal scroll on mobile, compact on desktop) */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1 shrink min-w-0 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Paytm Soundbox, Budget, Reset */}
          <div className="flex items-center pl-2 sm:pl-3 border-l border-stone-200 space-x-2 shrink-0">
            {onOpenPaytmModal && (
              <button
                onClick={onOpenPaytmModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#002970] text-white hover:bg-[#001D4F] transition shadow-xs text-xs font-semibold shrink-0"
                title="Open Paytm Soundbox 3.0 & Payments Hub"
              >
                <span className="w-2 h-2 rounded-full bg-[#00BAF2] animate-pulse"></span>
                <Volume2 className="w-3.5 h-3.5 text-[#00BAF2]" />
                <span className="hidden md:inline">Paytm Soundbox</span>
              </button>
            )}

            <div className="text-right hidden sm:block shrink-0">
              <div className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                Money Available
              </div>
              <div className="text-sm font-black text-teal-800 leading-none">
                {formatPaiseToRupees(availableBudgetPaise)}
              </div>
            </div>

            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="inline-flex items-center gap-1 text-xs bg-stone-50 hover:bg-stone-100 text-stone-700 px-2 py-1.5 rounded-lg border border-stone-200 font-medium transition shadow-xs shrink-0"
              title="Reset demonstration data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-stone-500 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{isResetting ? 'Resetting...' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
