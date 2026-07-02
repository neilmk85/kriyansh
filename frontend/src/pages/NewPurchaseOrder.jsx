import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Check, AlertCircle, RefreshCw, ChevronDown
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function Label({ children }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-[13px] font-medium text-white
      ${type === 'success' ? 'bg-[#0D9488]' : 'bg-red-500'}`}>
      {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  )
}

export default function NewPurchaseOrder() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    notes: '',
    tax_pct: '',
  })

  const [items, setItems] = useState([
    { id: Date.now(), inventory_item_id: null, item_name: '', sku: '', unit: 'unit', qty_ordered: '', unit_cost: '' }
  ])

  const [itemSearch, setItemSearch] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState({})
  const dropdownRefs = useRef({})

  // Data
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  })
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e) {
      Object.keys(dropdownRefs.current).forEach(key => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(e.target)) {
          setDropdownOpen(prev => ({ ...prev, [key]: false }))
        }
      })
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Computed totals
  const subtotal = items.reduce((s, it) =>
    s + (parseFloat(it.qty_ordered) || 0) * (parseFloat(it.unit_cost) || 0), 0)
  const taxAmt = subtotal * ((parseFloat(form.tax_pct) || 0) / 100)
  const total = subtotal + taxAmt

  // Item helpers
  function addItem() {
    setItems(prev => [...prev, {
      id: Date.now(), inventory_item_id: null,
      item_name: '', sku: '', unit: 'unit', qty_ordered: '', unit_cost: ''
    }])
  }
  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }
  function updateItem(id, key, value) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: value } : it))
  }
  function selectInventoryItem(rowId, invItem) {
    setItems(prev => prev.map(it => it.id === rowId ? {
      ...it,
      inventory_item_id: invItem.id,
      item_name: invItem.name,
      sku: invItem.sku || '',
      unit: invItem.unit || 'unit',
      unit_cost: invItem.cost_price || it.unit_cost,
    } : it))
    setItemSearch(prev => ({ ...prev, [rowId]: invItem.name }))
    setDropdownOpen(prev => ({ ...prev, [rowId]: false }))
  }

  // Mutations
  const createMut = useMutation({
    mutationFn: (data) => api.post('/purchase-orders', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setToast({ message: `Purchase order ${res.data.po_number} created`, type: 'success' })
      setTimeout(() => navigate('/purchases'), 1500)
    },
    onError: () => setToast({ message: 'Failed to create purchase order', type: 'error' }),
  })

  function buildPayload(status) {
    return {
      supplier_id: parseInt(form.supplier_id) || 0,
      order_date: form.order_date,
      expected_date: form.expected_date || undefined,
      notes: form.notes,
      tax_amount: taxAmt,
      items: items
        .filter(it => it.item_name)
        .map(it => ({
          inventory_item_id: it.inventory_item_id || undefined,
          item_name: it.item_name,
          sku: it.sku,
          unit: it.unit || 'unit',
          qty_ordered: parseFloat(it.qty_ordered) || 0,
          unit_cost: parseFloat(it.unit_cost) || 0,
        })),
    }
  }

  function handleDraft(e) {
    e.preventDefault()
    createMut.mutate(buildPayload('draft'))
  }

  function handleOrder(e) {
    e.preventDefault()
    // Create as draft, then immediately mark as ordered
    createMut.mutate(buildPayload('draft'))
  }

  const ff = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const validItems = items.filter(it => it.item_name)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/purchases')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">New Purchase Order</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Create a formal order for a supplier</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left — form */}
        <div className="col-span-2 space-y-5">

          {/* PO Details card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-[13px] font-semibold text-slate-700 mb-4">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Supplier *</Label>
                <div className="relative">
                  <select
                    className={inp}
                    value={form.supplier_id}
                    onChange={ff('supplier_id')}
                    required
                  >
                    <option value="">Select a supplier…</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {suppliers.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No suppliers yet — go to Purchases → Suppliers to add one first.
                  </p>
                )}
              </div>
              <div>
                <Label>Order Date *</Label>
                <input className={inp} type="date" value={form.order_date} onChange={ff('order_date')} required />
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <input className={inp} type="date" value={form.expected_date} onChange={ff('expected_date')} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <textarea
                  className={inp}
                  rows={2}
                  value={form.notes}
                  onChange={ff('notes')}
                  placeholder="Special instructions, delivery notes…"
                />
              </div>
            </div>
          </div>

          {/* Line items card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-[13px] font-semibold text-slate-700">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50">
                  <tr>
                    {['Item', 'SKU', 'Unit', 'Qty', 'Unit Cost', 'Total', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => {
                    const filtered = inventoryItems.filter(inv =>
                      !itemSearch[item.id] ||
                      inv.name.toLowerCase().includes((itemSearch[item.id] || '').toLowerCase())
                    )
                    const lineTotal = (parseFloat(item.qty_ordered) || 0) * (parseFloat(item.unit_cost) || 0)
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 min-w-[200px]">
                          <div className="relative" ref={el => dropdownRefs.current[item.id] = el}>
                            <input
                              className={inp}
                              value={itemSearch[item.id] !== undefined ? itemSearch[item.id] : item.item_name}
                              onChange={e => {
                                setItemSearch(prev => ({ ...prev, [item.id]: e.target.value }))
                                updateItem(item.id, 'item_name', e.target.value)
                                updateItem(item.id, 'inventory_item_id', null)
                                setDropdownOpen(prev => ({ ...prev, [item.id]: true }))
                              }}
                              onFocus={() => setDropdownOpen(prev => ({ ...prev, [item.id]: true }))}
                              placeholder="Search or type item name…"
                            />
                            {dropdownOpen[item.id] && filtered.length > 0 && (
                              <div className="absolute z-20 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                                {filtered.slice(0, 10).map(inv => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    className="w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-slate-50 text-left"
                                    onMouseDown={() => selectInventoryItem(item.id, inv)}
                                  >
                                    <span className="font-medium text-slate-800">{inv.name}</span>
                                    <span className="text-[11px] text-slate-400">{formatCurrency(inv.cost_price)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 min-w-[100px]">
                          <input className={inp} value={item.sku} onChange={e => updateItem(item.id, 'sku', e.target.value)} placeholder="SKU" />
                        </td>
                        <td className="px-4 py-2.5 min-w-[90px]">
                          <input className={inp} value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} placeholder="unit" />
                        </td>
                        <td className="px-4 py-2.5 min-w-[90px]">
                          <input className={inp} type="number" min="0" step="0.01" value={item.qty_ordered} onChange={e => updateItem(item.id, 'qty_ordered', e.target.value)} placeholder="0" />
                        </td>
                        <td className="px-4 py-2.5 min-w-[110px]">
                          <input className={inp} type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                        </td>
                        <td className="px-4 py-2.5 min-w-[90px]">
                          <span className="font-medium text-slate-800">{formatCurrency(lineTotal)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-[13px] text-[#0D9488] font-medium hover:underline"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Right — summary sidebar */}
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 sticky top-0">
            <h2 className="text-[13px] font-semibold text-slate-700">Order Summary</h2>

            <div>
              <Label>Tax %</Label>
              <input
                className={inp}
                type="number"
                min="0"
                step="0.01"
                value={form.tax_pct}
                onChange={ff('tax_pct')}
                placeholder="0"
              />
            </div>

            <div className="space-y-2 text-[13px] pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="text-slate-700">{validItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({form.tax_pct || 0}%)</span>
                <span className="font-medium text-slate-800">{formatCurrency(taxAmt)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800">Grand Total</span>
                <span className="font-bold text-[18px]" style={{ color: '#0D9488' }}>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleOrder}
                disabled={createMut.isPending || validItems.length === 0 || !form.supplier_id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
              >
                {createMut.isPending
                  ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                  : <><Check size={13} /> Save &amp; Send Order</>
                }
              </button>
              <button
                type="button"
                onClick={handleDraft}
                disabled={createMut.isPending || validItems.length === 0 || !form.supplier_id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="w-full text-center text-[12px] text-slate-400 hover:text-slate-600 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
