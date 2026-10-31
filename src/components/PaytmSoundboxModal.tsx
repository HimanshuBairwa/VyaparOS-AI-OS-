'use client';

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Wifi,
  BatteryCharging,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Layers,
  X,
  CreditCard,
  Zap,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/decision-engine';
import {
  playPaytmSoundboxChime,
  playPaytmPaymentReceived,
  playPaytmSettlementCompleted,
} from '@/lib/soundbox';

interface PaytmSoundboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export function PaytmSoundboxModal({ isOpen, onClose, onDataChanged }: PaytmSoundboxModalProps) {
  const [activeTab, setActiveTab] = useState<'SOUNDBOX' | 'FEED' | 'DYNAMIC_QR'>('SOUNDBOX');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any | null>(null);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );

  // Dynamic QR form state
  const [qrAmountRupees, setQrAmountRupees] = useState<number>(240);
  const [qrCustomerName, setQrCustomerName] = useState<string>('Pooja Nair (Architecture)');
  const [qrNote, setQrNote] = useState<string>('Sketchbook & Drawing Sheets');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/paytm/status');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('Failed to load Paytm status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Instant Settlement (T+0)
  const handleInstantSettlement = async () => {
    setIsSettling(true);
    setNotification(null);
    try {
      const res = await fetch('/api/paytm/settle', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.result.settledCount > 0) {
        playPaytmSettlementCompleted(json.result.totalSettledPaise / 100);
        setNotification({
          type: 'success',
          message: `Settled ${formatPaiseToRupees(
            json.result.totalSettledPaise
          )} directly into Spendable Purchasing Budget!`,
        });
        await fetchStatus();
        if (onDataChanged) onDataChanged();
      } else {
        setNotification({
          type: 'info',
          message: json.result?.message || 'No unsettled collections found to settle.',
        });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: 'Failed to complete instant settlement.' });
    } finally {
      setIsSettling(false);
    }
  };

  // Handle Simulate Customer Scan & Pay
  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setNotification(null);
    try {
      const amountPaise = Math.round(qrAmountRupees * 100);
      const res = await fetch('/api/paytm/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE_PAY',
          amountPaise,
          referenceType: 'CUSTOM',
          referenceId: `COUNTER_${Date.now()}`,
          customerName: qrCustomerName,
          note: qrNote,
          paymentMode: 'PAYTM_UPI',
        }),
      });

      const json = await res.json();
      if (json.success) {
        playPaytmPaymentReceived(qrAmountRupees);
        setNotification({
          type: 'success',
          message: `Payment Received! ${formatPaiseToRupees(amountPaise)} from ${qrCustomerName}. Soundbox announced.`,
        });
        await fetchStatus();
        if (onDataChanged) onDataChanged();
      } else {
        setNotification({ type: 'error', message: json.error || 'Simulation failed' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Error processing simulation' });
    } finally {
      setIsSimulating(false);
    }
  };

  const currentUpiLink = `upi://pay?pa=paytmqr.collegecorner@paytm&pn=College%20Corner%20Stationery&am=${qrAmountRupees.toFixed(
    2
  )}&cu=INR&tn=${encodeURIComponent(qrNote)}&mc=5943`;

  const copyUpiLink = () => {
    navigator.clipboard.writeText(currentUpiLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002970] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#00BAF2] flex items-center justify-center font-bold text-white text-lg shadow-sm">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight">Paytm for Business</span>
                <span className="text-[10px] bg-[#00BAF2] text-[#002970] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                  Merchant Growth Suite
                </span>
              </div>
              <p className="text-xs text-sky-100">
                Connected to College Corner Stationery (MID: <span className="font-mono">COLL098765432</span>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Header: Soundbox Hardware Status Pill */}
        <div className="bg-sky-50 border-b border-sky-100 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs text-sky-900 gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center font-medium">
              <Radio className="w-3.5 h-3.5 mr-1 text-emerald-600 animate-pulse" />
              Paytm Soundbox 3.0 LCD (4G Online)
            </span>
            <span className="hidden sm:flex items-center text-slate-600">
              <Wifi className="w-3.5 h-3.5 mr-1 text-sky-600" /> Airtel 4G (Full Signal)
            </span>
            <span className="hidden sm:flex items-center text-slate-600">
              <BatteryCharging className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Battery: 88%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => playPaytmSoundboxChime('Paytm par ek sau das rupaye prapt hue')}
              className="text-xs bg-white text-sky-700 hover:text-sky-800 border border-sky-200 px-2 py-1 rounded font-semibold flex items-center shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              Test Chime
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5">
          <button
            onClick={() => setActiveTab('SOUNDBOX')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'SOUNDBOX'
                ? 'border-[#00BAF2] text-[#002970] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Soundbox & Settlement</span>
          </button>
          <button
            onClick={() => setActiveTab('FEED')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'FEED'
                ? 'border-[#00BAF2] text-[#002970] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Live Transactions ({data?.transactions?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('DYNAMIC_QR')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'DYNAMIC_QR'
                ? 'border-[#00BAF2] text-[#002970] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Dynamic Paytm QR</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`px-5 py-2 text-xs flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notification.type === 'info'
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: SOUNDBOX & SETTLEMENT */}
          {activeTab === 'SOUNDBOX' && (
            <div className="space-y-5">
              {/* Hardware Device Graphic & Instant Settlement Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Soundbox Display Card */}
                <div className="bg-gradient-to-br from-[#002970] to-[#0A1A3A] text-white p-5 rounded-xl shadow-md relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-wider uppercase text-[#00BAF2]">
                      Paytm Soundbox 3.0
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Connected
                    </span>
                  </div>

                  {/* LCD Screen Mockup */}
                  <div className="my-4 bg-emerald-950 border-2 border-emerald-700/60 rounded-lg p-3 font-mono shadow-inner">
                    <div className="flex justify-between items-center text-[10px] text-emerald-400">
                      <span>4G SIM • Airtel</span>
                      <span>Vol: 100%</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-300 tracking-tight my-1">
                      ₹{((data?.todayInboundPaise || 11000) / 100).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-emerald-400/80 truncate">
                      LATEST: {data?.transactions?.[0]?.customerName || 'Walk-in Student'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-sky-200 pt-2 border-t border-white/10">
                    <span>Dual Frequency Chime: 784Hz + 1046Hz</span>
                    <button
                      onClick={() =>
                        playPaytmSoundboxChime('Paytm par ek sau das rupaye prapt hue')
                      }
                      className="text-xs bg-[#00BAF2] text-[#002970] px-2.5 py-1 rounded font-bold hover:bg-sky-300 transition-colors"
                    >
                      Play Chime
                    </button>
                  </div>
                </div>

                {/* Instant Settlement Engine Card */}
                <div className="bg-white border-2 border-[#00BAF2]/30 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Paytm Instant Settlement (T+0)
                      </span>
                      <span className="text-[10px] bg-sky-100 text-[#002970] font-bold px-2 py-0.5 rounded">
                        Zero Fee
                      </span>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="text-2xl font-black text-slate-900">
                        {formatPaiseToRupees(data?.unsettledBalancePaise ?? 11000)}
                      </div>
                      <p className="text-xs text-slate-500">
                        Unsettled QR collections pending transfer into Spendable Purchasing Budget.
                      </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 leading-relaxed mb-4">
                      💡 <strong>Why Instant Settlement?</strong> Instead of waiting for next-day bank
                      settlement, settle immediately to unlock instant purchasing power for wholesale stock orders!
                    </div>
                  </div>

                  <button
                    onClick={handleInstantSettlement}
                    disabled={isSettling || (data?.unsettledBalancePaise ?? 0) === 0}
                    className="w-full bg-[#002970] hover:bg-[#001D4F] text-white py-2.5 px-4 rounded-lg font-bold text-xs shadow flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4 text-[#00BAF2]" />
                    <span>
                      {isSettling
                        ? 'Settling Funds...'
                        : (data?.unsettledBalancePaise ?? 0) === 0
                        ? 'All Collections Settled'
                        : `Instant Settle ${formatPaiseToRupees(data?.unsettledBalancePaise ?? 11000)} to Budget`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Settlement Impact Explanation */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center">
                  <ShieldCheck className="w-4 h-4 text-teal-600 mr-1.5" />
                  Paytm Merchant Growth Loop in Munafa AI
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002970] block mb-1">1. Inbound QR Payment</span>
                    Customer pays at counter via Paytm QR. Soundbox announces instantly. Funds held in unsettled balance.
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002970] block mb-1">2. Instant T+0 Settle</span>
                    Merchant clicks Instant Settle. Proceeds credit to Spendable Purchasing Budget immediately.
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-[#002970] block mb-1">3. Paytm Payout to Vendor</span>
                    Purchase plan approves wholesale order. Merchant pays Supplier A/B directly via Paytm Payouts with UTR.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE TRANSACTIONS FEED */}
          {activeTab === 'FEED' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Showing latest Paytm payments, vendor payouts, and settlement batches</span>
                <button
                  onClick={fetchStatus}
                  className="text-teal-700 hover:text-teal-900 font-medium flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Feed</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {(!data?.transactions || data.transactions.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No transactions recorded yet.
                  </div>
                ) : (
                  data.transactions.map((txn: any) => {
                    const isInbound = txn.direction === 'INBOUND_SALE';
                    const isPayout = txn.direction === 'OUTBOUND_PURCHASE';
                    const isSettlement = txn.direction === 'SETTLEMENT';

                    return (
                      <div
                        key={txn.id}
                        className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isInbound
                                ? 'bg-emerald-100 text-emerald-700'
                                : isPayout
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {isInbound && <ArrowDownLeft className="w-4 h-4" />}
                            {isPayout && <ArrowUpRight className="w-4 h-4" />}
                            {isSettlement && <Zap className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>
                                {isInbound
                                  ? txn.customerName || 'Walk-in Student'
                                  : isPayout
                                  ? `Payout to ${txn.supplierName || 'Wholesale Supplier'}`
                                  : 'Instant Settlement to Purchasing Budget'}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                  txn.isSettled
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {txn.isSettled ? 'SETTLED' : 'UNSETTLED'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {txn.transactionId} {txn.rrn ? `• RRN: ${txn.rrn}` : ''}{' '}
                              {txn.utr ? `• UTR: ${txn.utr}` : ''}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}{' '}
                              • {txn.paymentMode}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end space-y-1">
                          <div
                            className={`font-black text-sm ${
                              isInbound
                                ? 'text-emerald-700'
                                : isPayout
                                ? 'text-rose-700'
                                : 'text-[#002970]'
                            }`}
                          >
                            {isInbound ? '+' : isPayout ? '-' : ''}
                            {formatPaiseToRupees(txn.amountPaise)}
                          </div>

                          {isInbound && (
                            <button
                              onClick={() =>
                                playPaytmSoundboxChime(
                                  `Paytm par ${Math.round(txn.amountPaise / 100)} rupaye prapt hue`
                                )
                              }
                              className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-bold hover:bg-sky-100 flex items-center space-x-1 transition-colors"
                            >
                              <Volume2 className="w-3 h-3 mr-0.5" />
                              Dobaara Sunein
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC PAYTM QR CODE */}
          {activeTab === 'DYNAMIC_QR' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Form to configure amount */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dynamic Counter QR</h4>
                  <p className="text-xs text-slate-500">
                    Generate an instant Paytm All-in-One QR code with preset or custom rupees.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹ Rupees)
                  </label>
                  <input
                    type="number"
                    value={qrAmountRupees}
                    onChange={(e) => setQrAmountRupees(Number(e.target.value))}
                    min="1"
                    className="w-full text-base font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00BAF2] focus:outline-none"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex gap-2 mt-2">
                    {[110, 240, 600, 960, 1200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQrAmountRupees(amt)}
                        className={`text-xs px-2.5 py-1 rounded font-semibold border transition-colors ${
                          qrAmountRupees === amt
                            ? 'bg-[#002970] text-white border-[#002970]'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Reference
                  </label>
                  <input
                    type="text"
                    value={qrCustomerName}
                    onChange={(e) => setQrCustomerName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00BAF2] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bill / Item Note
                  </label>
                  <input
                    type="text"
                    value={qrNote}
                    onChange={(e) => setQrNote(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00BAF2] focus:outline-none"
                  />
                </div>

                {/* Presentation Hackathon Simulation Button */}
                <div className="pt-2">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-bold text-xs shadow flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-100" />
                    <span>
                      {isSimulating ? 'Processing...' : 'Simulate Customer Scan & Pay (Rings Soundbox)'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Instantly records payment, logs transaction, and plays audio chime for presentation.
                  </p>
                </div>
              </div>

              {/* Paytm Brand Standee Card with Dynamic QR */}
              <div className="bg-gradient-to-b from-[#002970] via-[#002970] to-[#0A1A3A] p-5 rounded-2xl text-white shadow-xl flex flex-col items-center text-center">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-black tracking-tight">Paytm</span>
                  <span className="text-[10px] bg-[#00BAF2] text-[#002970] px-1 py-0.2 rounded font-black uppercase">
                    All-in-One QR
                  </span>
                </div>

                <div className="text-xs font-semibold text-sky-100 mb-3">
                  College Corner Stationery
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-[#00BAF2] flex flex-col items-center">
                  {/* SVG QR Code Pattern Mockup */}
                  <div className="w-44 h-44 bg-white relative flex items-center justify-center border border-slate-100 rounded">
                    <svg className="w-full h-full p-2" viewBox="0 0 100 100">
                      {/* Realistic QR Corners */}
                      <rect x="5" y="5" width="25" height="25" fill="#002970" />
                      <rect x="9" y="9" width="17" height="17" fill="white" />
                      <rect x="13" y="13" width="9" height="9" fill="#00BAF2" />

                      <rect x="70" y="5" width="25" height="25" fill="#002970" />
                      <rect x="74" y="9" width="17" height="17" fill="white" />
                      <rect x="78" y="13" width="9" height="9" fill="#00BAF2" />

                      <rect x="5" y="70" width="25" height="25" fill="#002970" />
                      <rect x="9" y="74" width="17" height="17" fill="white" />
                      <rect x="13" y="78" width="9" height="9" fill="#00BAF2" />

                      {/* Data dots pattern */}
                      <rect x="35" y="8" width="5" height="5" fill="#002970" />
                      <rect x="45" y="8" width="5" height="5" fill="#002970" />
                      <rect x="55" y="8" width="5" height="5" fill="#002970" />
                      <rect x="35" y="18" width="5" height="5" fill="#002970" />
                      <rect x="48" y="18" width="7" height="7" fill="#00BAF2" />
                      <rect x="35" y="28" width="5" height="5" fill="#002970" />
                      <rect x="55" y="28" width="5" height="5" fill="#002970" />
                      <rect x="8" y="38" width="5" height="5" fill="#002970" />
                      <rect x="18" y="38" width="5" height="5" fill="#002970" />
                      <rect x="28" y="38" width="5" height="5" fill="#002970" />
                      <rect x="38" y="38" width="5" height="5" fill="#002970" />
                      <rect x="48" y="38" width="5" height="5" fill="#002970" />
                      <rect x="58" y="38" width="5" height="5" fill="#002970" />
                      <rect x="68" y="38" width="5" height="5" fill="#002970" />
                      <rect x="78" y="38" width="5" height="5" fill="#002970" />
                      <rect x="88" y="38" width="5" height="5" fill="#002970" />
                      <rect x="8" y="48" width="5" height="5" fill="#002970" />
                      <rect x="28" y="48" width="5" height="5" fill="#002970" />
                      <rect x="68" y="48" width="5" height="5" fill="#002970" />
                      <rect x="88" y="48" width="5" height="5" fill="#002970" />
                      <rect x="8" y="58" width="5" height="5" fill="#002970" />
                      <rect x="38" y="58" width="5" height="5" fill="#002970" />
                      <rect x="48" y="58" width="5" height="5" fill="#002970" />
                      <rect x="68" y="58" width="5" height="5" fill="#002970" />
                      <rect x="35" y="70" width="5" height="5" fill="#002970" />
                      <rect x="45" y="70" width="5" height="5" fill="#002970" />
                      <rect x="55" y="70" width="5" height="5" fill="#002970" />
                      <rect x="35" y="80" width="5" height="5" fill="#002970" />
                      <rect x="55" y="80" width="5" height="5" fill="#002970" />
                      <rect x="70" y="70" width="5" height="5" fill="#002970" />
                      <rect x="80" y="70" width="5" height="5" fill="#002970" />
                      <rect x="70" y="80" width="5" height="5" fill="#002970" />
                      <rect x="80" y="80" width="5" height="5" fill="#002970" />

                      {/* Center Brand Icon */}
                      <circle cx="50" cy="50" r="11" fill="#00BAF2" />
                      <text
                        x="50"
                        y="54"
                        fill="white"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        ₹
                      </text>
                    </svg>
                  </div>

                  <div className="text-slate-900 font-black text-base mt-2">
                    ₹{qrAmountRupees.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    paytmqr.collegecorner@paytm
                  </div>
                </div>

                {/* Accepted UPI Apps Footer */}
                <div className="mt-3 flex items-center space-x-2 text-[9px] text-sky-200">
                  <span>Accepted:</span>
                  <span className="font-bold">Paytm</span>
                  <span>•</span>
                  <span className="font-bold">GPay</span>
                  <span>•</span>
                  <span className="font-bold">PhonePe</span>
                  <span>•</span>
                  <span className="font-bold">BHIM</span>
                </div>

                <button
                  onClick={copyUpiLink}
                  className="mt-3 text-[11px] text-sky-200 hover:text-white flex items-center space-x-1 underline"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'UPI Link Copied!' : 'Copy UPI Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Paytm Merchant AI Integration • Production Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
