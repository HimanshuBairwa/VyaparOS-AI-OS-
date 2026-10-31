'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, ScreenTab } from '@/components/Navbar';
import { TodayScreen } from '@/components/TodayScreen';
import { RecordScreen } from '@/components/RecordScreen';
import { StockScreen } from '@/components/StockScreen';
import { DemandScreen } from '@/components/DemandScreen';
import { PurchasePlanScreen } from '@/components/PurchasePlanScreen';
import { OrdersScreen } from '@/components/OrdersScreen';
import { ReportsScreen } from '@/components/ReportsScreen';
import { PaytmSoundboxModal } from '@/components/PaytmSoundboxModal';
import { VyaparCopilotChat } from '@/components/VyaparCopilotChat';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('TODAY');
  const [recordInitialType, setRecordInitialType] = useState<'SALE' | 'DEMAND' | 'QUOTE'>('SALE');
  const [isPaytmModalOpen, setIsPaytmModalOpen] = useState<boolean>(false);
  
  // Navigation contextual target for Purchase Plan
  const [targetProductId, setTargetProductId] = useState<string | undefined>();
  const [targetDemandId, setTargetDemandId] = useState<string | undefined>();

  // Global bootstrap state
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const fetchBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching bootstrap data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demonstration data to the standard College Stationery Shop fixture?')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setNotification({
          type: 'success',
          message: 'Demonstration environment reset to default College Stationery Shop fixture.',
        });
        await fetchBootstrap();
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleOpenRecord = (type: 'SALE' | 'DEMAND' | 'QUOTE') => {
    setRecordInitialType(type);
    setCurrentTab('RECORD');
  };

  const handleNavigateToPurchasePlan = (productId: string, demandId: string) => {
    setTargetProductId(productId);
    setTargetDemandId(demandId);
    setCurrentTab('PURCHASE_PLAN');
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-semibold text-stone-800">Starting Munafa AI...</div>
          <div className="text-xs text-stone-500">Loading College Stationery Shop state</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        availableBudgetPaise={data.merchant.availableBudgetPaise}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        onOpenPaytmModal={() => setIsPaytmModalOpen(true)}
      />

      {/* Paytm Soundbox & Payments Modal */}
      <PaytmSoundboxModal
        isOpen={isPaytmModalOpen}
        onClose={() => setIsPaytmModalOpen(false)}
        onDataChanged={fetchBootstrap}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {notification && (
          <div className="mb-4 p-3 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center justify-between">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Screen 1: TODAY */}
        {currentTab === 'TODAY' && (
          <TodayScreen
            stats={data.stats}
            todaySales={data.todaySales}
            pendingDemand={data.pendingDemand}
            onNavigate={setCurrentTab}
            onOpenRecord={handleOpenRecord}
            onOpenPaytmModal={() => setIsPaytmModalOpen(true)}
          />
        )}

        {/* Screen 2: RECORD */}
        {currentTab === 'RECORD' && (
          <RecordScreen
            initialType={recordInitialType}
            products={data.products}
            suppliers={data.suppliers}
            merchantId={data.merchant.id}
            onEventCreated={fetchBootstrap}
          />
        )}

        {/* Screen 3: STOCK */}
        {currentTab === 'STOCK' && (
          <StockScreen
            products={data.products}
            stockMovements={data.recentMovements}
            merchantId={data.merchant.id}
            onStockUpdated={fetchBootstrap}
          />
        )}

        {/* Screen 4: DEMAND */}
        {currentTab === 'DEMAND' && (
          <DemandScreen
            pendingDemand={data.pendingDemand}
            onNavigateToPurchasePlan={handleNavigateToPurchasePlan}
            onRefresh={fetchBootstrap}
          />
        )}

        {/* Screen 5: PURCHASE PLAN */}
        {currentTab === 'PURCHASE_PLAN' && (
          <PurchasePlanScreen
            products={data.products}
            pendingDemand={data.pendingDemand}
            merchant={data.merchant}
            defaultProductId={targetProductId}
            defaultDemandId={targetDemandId}
            onPlanApproved={fetchBootstrap}
            onNavigate={setCurrentTab}
          />
        )}

        {/* Screen 6: ORDERS AND RESULTS */}
        {currentTab === 'ORDERS' && (
          <OrdersScreen
            orders={data.recentOrders}
            onOrderUpdated={fetchBootstrap}
          />
        )}

        {/* Screen 7: REPORTS */}
        {currentTab === 'REPORTS' && <ReportsScreen />}
      </main>

      {/* Floating Universal AI Copilot Bot (VyaparOS AI Sahayak) */}
      <VyaparCopilotChat
        onNavigateTab={setCurrentTab}
        availableBudgetPaise={data?.merchant?.spendableBudgetPaise || 100000}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-3.5 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">VyaparOS AI (व्यापारOS)</span>
            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-semibold">
              Paytm Merchant Growth AI Track
            </span>
          </div>
          <div className="text-[11px] text-stone-400">
            Autonomous Retail Decision Intelligence • No real payments or supplier orders executed
          </div>
        </div>
      </footer>
    </div>
  );
}
