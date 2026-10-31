'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  PackageCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Layers,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/decision-engine';
import { playPaytmPaymentReceived, playPaytmPayoutSent } from '@/lib/soundbox';

interface OrdersScreenProps {
  orders: any[];
  onOrderUpdated: () => void;
}

export function OrdersScreen({ orders, onOrderUpdated }: OrdersScreenProps) {
  const [selectedOrderForFulfill, setSelectedOrderForFulfill] = useState<any | null>(null);
  const [fulfillQuantity, setFulfillQuantity] = useState<number>(12);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_PAYTM'>('CASH');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Receiving Stock from Supplier
  const handleReceiveStock = async (orderId: string) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/receive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Stock received! ${data.order.receivedQuantity} units added to physical shelf stock atomically.`,
        });
        onOrderUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to receive stock' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error receiving stock' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Paying Supplier via Paytm Payouts
  const handlePaySupplierPaytm = async (order: any) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const isSupplierA = order.supplier.name.includes('A');
      const res = await fetch('/api/paytm/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: order.id,
          amountPaise: order.totalOutflowPaise,
          supplierName: order.supplier.name,
          supplierVpa: isSupplierA ? 'stationeryhub@paytm' : 'metropapers@paytm',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playPaytmPayoutSent(order.totalOutflowPaise / 100, order.supplier.name);
        setMessage({
          type: 'success',
          text: `Paid ${formatPaiseToRupees(order.totalOutflowPaise)} to ${order.supplier.name} via Paytm Payouts! UTR: ${data.result.utr}`,
        });
        onOrderUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Paytm Payout failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error executing Paytm payout' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Customer Pickup & Fulfillment
  const handleFulfillOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForFulfill) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/orders/${selectedOrderForFulfill.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soldQuantity: Number(fulfillQuantity),
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (paymentMethod === 'UPI_PAYTM') {
          const revenueRupees = (fulfillQuantity * (selectedOrderForFulfill.product?.sellingPricePaise || 12000)) / 100;
          playPaytmPaymentReceived(revenueRupees);
        }
        setMessage({
          type: 'success',
          text: `Customer order fulfilled! Sold ${fulfillQuantity} units. Realized contribution: ${formatPaiseToRupees(data.data.metrics.contributionPaise)}.`,
        });
        setSelectedOrderForFulfill(null);
        onOrderUpdated();
      } else {
        setMessage({ type: 'error', text: data.error || 'Fulfillment failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error fulfilling customer order' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Purchase Orders & Realized Results</h1>
        <p className="text-xs text-stone-600 mt-1">
          Complete purchase lifecycle tracker: Issued → Stock Received → Customer Fulfilled → Settled Contribution.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 text-xs rounded-md border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-teal-50 text-teal-800 border-teal-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-stone-200 text-stone-500 text-sm">
          No purchase orders issued yet. Approve a proposal in the &ldquo;Purchase Plan&rdquo; tab to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const outcome = order.outcomes?.[0];
            const isIssued = order.status === 'ISSUED';
            const isReceived = order.status === 'STOCK_RECEIVED';
            const isCompleted = order.status === 'COMPLETED';

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-stone-200 shadow-sm p-5 space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {order.poNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isCompleted
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : isReceived
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Supplier: <strong className="text-stone-800">{order.supplier.name}</strong> • Issued on {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-stone-500">Committed Outflow:</span>
                    <div className="text-base font-bold text-stone-900">
                      {formatPaiseToRupees(order.totalOutflowPaise)}
                    </div>
                  </div>
                </div>

                {/* Planned vs Actual Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Ordered Product</span>
                    <strong className="text-stone-900">{order.product.name} ({order.product.variant})</strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {order.orderedQuantity} units @ {formatPaiseToRupees(order.unitCostPaise)}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Stock Status</span>
                    <strong className="text-stone-900">
                      {isReceived || isCompleted ? `${order.receivedQuantity} units on shelf` : 'Awaiting delivery'}
                    </strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {order.receivedAt ? `Received ${new Date(order.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Pending physical arrival'}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Customer Fulfilled</span>
                    <strong className="text-stone-900">
                      {outcome ? `${outcome.actualQuantitySold} of ${order.orderedQuantity} sold` : '0 sold'}
                    </strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {outcome && outcome.remainingStockQuantity > 0 ? `${outcome.remainingStockQuantity} units buffer` : 'No unsold units'}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3 rounded border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Realized Contribution</span>
                    <strong className={outcome && outcome.actualContributionPaise > 0 ? 'text-teal-800 font-bold' : 'text-stone-900'}>
                      {outcome ? formatPaiseToRupees(outcome.actualContributionPaise) : 'Pending sales'}
                    </strong>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      {outcome ? `Revenue ${formatPaiseToRupees(outcome.actualRevenuePaise)}` : 'Awaiting customer pickup'}
                    </span>
                  </div>
                </div>

                {/* Outcome Notes */}
                {outcome?.notes && (
                  <div className="text-xs bg-teal-50/60 p-2.5 rounded border border-teal-200 text-teal-900 font-mono">
                    <strong>Recorded Outcome:</strong> {outcome.notes}
                  </div>
                )}

                {/* Operational Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  {order.paymentStatus === 'UNPAID' ? (
                    <button
                      onClick={() => handlePaySupplierPaytm(order)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#002970] hover:bg-[#001D4F] text-white text-xs font-bold transition shadow-sm"
                      title="Pay supplier wholesale cost using Paytm Payouts B2B UPI"
                    >
                      <Zap className="w-4 h-4 text-[#00BAF2]" />
                      Pay Supplier via Paytm ({formatPaiseToRupees(order.totalOutflowPaise)})
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Supplier Paid (Paytm Payouts)
                    </span>
                  )}

                  {isIssued && (
                    <button
                      onClick={() => handleReceiveStock(order.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-sm"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Receive Stock into Shelf Inventory
                    </button>
                  )}

                  {isReceived && (
                    <button
                      onClick={() => {
                        setSelectedOrderForFulfill(order);
                        setFulfillQuantity(order.orderedQuantity);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      Fulfill Customer Order
                    </button>
                  )}

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded border border-teal-200">
                      <CheckCircle2 className="w-4 h-4" />
                      Lifecycle Complete & Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fulfill Modal with Quantity Selection (Supports testing 8 units sold vs 12 units sold fixture!) */}
      {selectedOrderForFulfill && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="text-sm font-bold text-stone-900">
                Fulfill Order {selectedOrderForFulfill.poNumber}
              </h3>
              <button
                onClick={() => setSelectedOrderForFulfill(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFulfillOrder} className="space-y-3 text-xs">
              <p className="text-stone-600">
                Record actual student pickup for {selectedOrderForFulfill.product.name} ({selectedOrderForFulfill.product.variant}).
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700">Units Actually Picked Up & Paid:</label>
                  <span className="font-bold text-stone-900">{fulfillQuantity} units</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={selectedOrderForFulfill.orderedQuantity}
                  value={fulfillQuantity}
                  onChange={(e) => setFulfillQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFulfillQuantity(8)}
                    className="text-[10px] text-teal-700 underline font-medium"
                  >
                    Set 8 units (Spec partial fixture: 8 sold, 4 remain)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillQuantity(selectedOrderForFulfill.orderedQuantity)}
                    className="text-[10px] text-stone-600 underline"
                  >
                    Set {selectedOrderForFulfill.orderedQuantity} units (Full sell-through)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Customer Payment Method:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-stone-300 rounded bg-white text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI_PAYTM">UPI / Paytm QR (Simulated)</option>
                </select>
              </div>

              <div className="bg-stone-50 p-2.5 rounded border border-stone-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Selling Price:</span>
                  <span>{formatPaiseToRupees(selectedOrderForFulfill.product.sellingPricePaise)}/unit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Customer Revenue:</span>
                  <span className="font-bold">{formatPaiseToRupees(fulfillQuantity * selectedOrderForFulfill.product.sellingPricePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Unsold Units Left on Shelf:</span>
                  <span>{selectedOrderForFulfill.orderedQuantity - fulfillQuantity} units</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForFulfill(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded"
                >
                  {isProcessing ? 'Recording...' : 'Confirm Fulfillment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
