'use client';

import React, { useState } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  History,
  ArrowDownUp,
  Search,
} from 'lucide-react';
import { formatPaiseToRupees, rupeesToPaise } from '@/lib/decision-engine';

interface StockScreenProps {
  products: any[];
  stockMovements: any[];
  merchantId: string;
  onStockUpdated: () => void;
}

export function StockScreen({
  products,
  stockMovements,
  merchantId,
  onStockUpdated,
}: StockScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<any | null>(null);
  const [movementType, setMovementType] = useState<string>('PURCHASE_RECEIPT');
  const [quantityDelta, setQuantityDelta] = useState<number>(10);
  const [newPhysicalCount, setNewPhysicalCount] = useState<number>(0);
  const [unitCostRupees, setUnitCostRupees] = useState<number>(80);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.variant.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/events/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          productId: selectedProductForAdjust.id,
          type: movementType,
          quantityDelta: Number(quantityDelta),
          newPhysicalCount: movementType === 'PHYSICAL_COUNT_CORRECTION' ? Number(newPhysicalCount) : undefined,
          unitCostPaise: rupeesToPaise(unitCostRupees),
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Stock updated for ${selectedProductForAdjust.variant}. New on-hand: ${data.product.onHandQuantity}.`);
        setSelectedProductForAdjust(null);
        setNotes('');
        onStockUpdated();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage('Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Inventory & Continuous Stock Ledger</h1>
          <p className="text-xs text-stone-600 mt-1">
            Tracks physical on-hand quantity, reserved units, and unit costs through a continuous, auditable movement ledger.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variant or SKU..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-stone-300 rounded-md bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </div>
      </div>

      {message && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-md flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Product Stock Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Store Catalog Products ({filteredProducts.length} variants)
          </span>
          <span className="text-[11px] text-stone-500">
            All SKUs and variants are strictly isolated in inventory
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Product & Variant</th>
                <th className="px-3 py-2.5 font-semibold">SKU</th>
                <th className="px-3 py-2.5 font-semibold text-right">Selling Price</th>
                <th className="px-3 py-2.5 font-semibold text-right">Unit Cost</th>
                <th className="px-3 py-2.5 font-semibold text-center">On-Hand</th>
                <th className="px-3 py-2.5 font-semibold text-center">Reserved</th>
                <th className="px-3 py-2.5 font-semibold text-center">Available</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((p) => {
                const available = Math.max(0, p.onHandQuantity - p.reservedQuantity);
                const isOutOfStock = p.onHandQuantity <= 0;
                const isLowStock = available <= p.reorderThreshold && !isOutOfStock;

                return (
                  <tr key={p.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{p.name}</div>
                      <div className="text-[11px] text-stone-500">
                        {p.variant} • {p.packType}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-stone-500">
                      {p.sku}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-stone-900">
                      {formatPaiseToRupees(p.sellingPricePaise)}
                    </td>
                    <td className="px-3 py-3 text-right text-stone-600">
                      {formatPaiseToRupees(p.recordedUnitCostPaise)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-stone-900">
                      {p.onHandQuantity}
                    </td>
                    <td className="px-3 py-3 text-center text-amber-700 font-medium">
                      {p.reservedQuantity > 0 ? p.reservedQuantity : '—'}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-stone-800">
                      {available}
                    </td>
                    <td className="px-3 py-3">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedProductForAdjust(p);
                          setUnitCostRupees(Math.round(p.recordedUnitCostPaise / 100));
                          setNewPhysicalCount(p.onHandQuantity);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100"
                      >
                        <ArrowDownUp className="w-3 h-3" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal / Drawer */}
      {selectedProductForAdjust && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="text-sm font-bold text-stone-900">
                Adjust Stock: {selectedProductForAdjust.name} ({selectedProductForAdjust.variant})
              </h3>
              <button
                onClick={() => setSelectedProductForAdjust(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Movement Reason / Type:
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded bg-white text-xs"
                >
                  <option value="PURCHASE_RECEIPT">Purchase Receipt (Stock Received)</option>
                  <option value="CUSTOMER_RETURN">Customer Return (Restock)</option>
                  <option value="SUPPLIER_RETURN">Supplier Return (Debit Memo)</option>
                  <option value="DAMAGE">Damage (Shelf Defect)</option>
                  <option value="DISCARD">Discard / Spoiled</option>
                  <option value="PHYSICAL_COUNT_CORRECTION">Physical Count Correction (Audit)</option>
                </select>
              </div>

              {movementType === 'PHYSICAL_COUNT_CORRECTION' ? (
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Audited Physical Count on Shelf:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPhysicalCount}
                    onChange={(e) => setNewPhysicalCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 border border-stone-300 rounded text-xs"
                  />
                  <span className="text-[11px] text-stone-500 mt-0.5 block">
                    Current recorded: {selectedProductForAdjust.onHandQuantity} units. Delta will be computed automatically.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Quantity Change (Delta):
                  </label>
                  <input
                    type="number"
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 border border-stone-300 rounded text-xs"
                  />
                  <span className="text-[11px] text-stone-500 mt-0.5 block">
                    Use positive numbers to add stock, negative to reduce (e.g. -2 for damage).
                  </span>
                </div>
              )}

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Unit Cost (₹):
                </label>
                <input
                  type="number"
                  value={unitCostRupees}
                  onChange={(e) => setUnitCostRupees(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Audit Notes / Reason:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Physical inventory count verified by shopkeeper"
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForAdjust(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded"
                >
                  {isSubmitting ? 'Recording...' : 'Commit to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Continuous Movement Ledger History Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Continuous Movement Ledger Log (Last 30 Events)
            </span>
          </div>
          <span className="text-[11px] text-stone-500">
            Immutable audit trail
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="px-4 py-2 font-semibold">Timestamp</th>
                <th className="px-3 py-2 font-semibold">Product Variant</th>
                <th className="px-3 py-2 font-semibold">Movement Type</th>
                <th className="px-3 py-2 font-semibold text-right">Delta</th>
                <th className="px-3 py-2 font-semibold text-right">Resulting Stock</th>
                <th className="px-4 py-2 font-semibold">Notes / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stockMovements.slice(0, 15).map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/70">
                  <td className="px-4 py-2 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 font-medium text-stone-900">
                    {m.product.name} ({m.product.variant})
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                      {m.type}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-bold ${
                    m.quantityDelta > 0 ? 'text-teal-700' : m.quantityDelta < 0 ? 'text-red-700' : 'text-stone-600'
                  }`}>
                    {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-stone-800">
                    {m.resultingOnHand}
                  </td>
                  <td className="px-4 py-2 text-stone-500 max-w-xs truncate">
                    {m.notes || m.sourceReferenceId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
