import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Search, X, ChevronDown, Check,
  Truck, FileText, Users, Edit2, Trash2, Package,
  ArrowRight, AlertCircle, RefreshCw, History, TrendingUp, Calendar
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

// ─── Shared styles ───────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'
const btn = (variant = 'primary', size = 'md') => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-xl transition-all disabled:opacity-50'
  const sizes = { sm: 'px-3 py-1.5 text-[12px]', md: 'px-4 py-2.5 text-[13px]' }
  const variants = {
    primary: 'text-white shadow-sm hover:opacity-90',
    ghost: 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200',
    danger: 'text-red-600 hover:bg-red-50 bg-white border border-red-200',
  }
  return `${base} ${sizes[size]} ${variants[variant]}`
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:      { label: 'Draft',     bg: 'bg-slate-100',  text: 'text-slate-600'  },
  ordered:    { label: 'Ordered',   bg: 'bg-blue-100',   text: 'text-blue-700'   },
  partial:    { label: 'Partial',   bg: 'bg-amber-100',  text: 'text-amber-700'  },
  received:   { label: 'Received',  bg: 'bg-green-100',  text: 'text-green-700'  },
  cancelled:  { label: 'Cancelled', bg: 'bg-red-100',    text: 'text-red-700'    },
}
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
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

// ─── PO Detail Modal ──────────────────────────────────────────────────────────
function PODetailModal({ po, onClose, onRefresh }) {
  const qc = useQueryClient()
  const [receiving, setReceiving] = useState(false)
  const [receiveQtys, setReceiveQtys] = useState({})
  const [toast, setToast] = useState(null)

  const { data: fullPO, isLoading } = useQuery({
    queryKey: ['purchase-order', po.id],
    queryFn: () => api.get(`/purchase-orders/${po.id}`).then(r => r.data),
  })

  const statusMut = useMutation({
    mutationFn: (status) => api.patch(`/purchase-orders/${po.id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order', po.id] })
      setToast({ message: 'Status updated', type: 'success' })
    },
  })

  const receiveMut = useMutation({
    mutationFn: (items) => api.post(`/purchase-orders/${po.id}/receive`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order', po.id] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setReceiving(false)
      setReceiveQtys({})
      setToast({ message: 'Stock received and inventory updated', type: 'success' })
    },
  })

  function startReceiving() {
    const qtys = {}
    fullPO?.items?.forEach(item => { qtys[item.id] = item.qty_received })
    setReceiveQtys(qtys)
    setReceiving(true)
  }

  function submitReceive() {
    const items = Object.entries(receiveQtys).map(([id, qty_received]) => ({
      id: Number(id),
      qty_received: Number(qty_received),
    }))
    receiveMut.mutate(items)
  }

  const currentPO = fullPO || po

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800">{currentPO.po_number}</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{currentPO.supplier_name} · {currentPO.order_date}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentPO.status} />
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Order Date', value: currentPO.order_date },
                  { label: 'Expected', value: currentPO.expected_date || '—' },
                  { label: 'Total', value: formatCurrency(currentPO.total_amount) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                    <p className="text-[14px] font-bold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {currentPO.notes && (
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-slate-500">{currentPO.notes}</p>
                </div>
              )}

              {/* Items table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Item', 'SKU', 'Ordered', 'Received', 'Unit Cost', 'Total'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(fullPO?.items || []).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.item_name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.sku || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{item.qty_ordered} {item.unit}</td>
                        <td className="px-4 py-3">
                          {receiving ? (
                            <input
                              type="number"
                              min="0"
                              max={item.qty_ordered}
                              step="0.01"
                              value={receiveQtys[item.id] ?? item.qty_received}
                              onChange={e => setReceiveQtys(q => ({ ...q, [item.id]: e.target.value }))}
                              className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#0D9488]"
                            />
                          ) : (
                            <span className={item.qty_received >= item.qty_ordered ? 'text-green-600 font-medium' : 'text-slate-600'}>
                              {item.qty_received}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="space-y-1.5 text-[13px] min-w-[200px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">{formatCurrency(currentPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium text-slate-800">{formatCurrency(currentPO.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="font-bold text-slate-800">{formatCurrency(currentPO.total_amount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2 justify-between">
          <div className="flex gap-2">
            {currentPO.status === 'draft' && (
              <button
                onClick={() => statusMut.mutate('ordered')}
                disabled={statusMut.isPending}
                className={btn('ghost', 'sm')}
              >
                <Truck size={13} /> Mark as Ordered
              </button>
            )}
            {(currentPO.status === 'ordered' || currentPO.status === 'partial') && !receiving && (
              <button onClick={startReceiving} className={btn('ghost', 'sm')}>
                <Package size={13} /> Receive Stock
              </button>
            )}
            {receiving && (
              <>
                <button
                  onClick={submitReceive}
                  disabled={receiveMut.isPending}
                  className={btn('primary', 'sm')}
                  style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
                >
                  <Check size={13} /> Confirm Receipt
                </button>
                <button onClick={() => setReceiving(false)} className={btn('ghost', 'sm')}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} className={btn('ghost', 'sm')}>Close</button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// ─── Supplier Modal ───────────────────────────────────────────────────────────
const EMPTY_SUPPLIER = { name: '', contact_name: '', phone: '', email: '', address: '', payment_terms: 'Net 30', notes: '' }

function SupplierModal({ supplier, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(supplier ? { ...supplier } : { ...EMPTY_SUPPLIER })
  const isEdit = !!supplier?.id

  const mut = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/suppliers/${supplier.id}`, data)
      : api.post('/suppliers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      onClose()
    },
  })

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); mut.mutate(form) }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier Name *</label>
              <input className={inp} value={form.name} onChange={f('name')} required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Person</label>
              <input className={inp} value={form.contact_name} onChange={f('contact_name')} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input className={inp} value={form.phone} onChange={f('phone')} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input className={inp} type="email" value={form.email} onChange={f('email')} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Terms</label>
              <input className={inp} value={form.payment_terms} onChange={f('payment_terms')} placeholder="Net 30" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
              <textarea className={inp} rows={2} value={form.address} onChange={f('address')} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
              <textarea className={inp} rows={2} value={form.notes} onChange={f('notes')} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mut.isPending}
              className={`${btn('primary', 'md')} flex-1`}
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
            >
              {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
            </button>
            <button type="button" onClick={onClose} className={btn('ghost', 'md')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Direct Purchase Form ─────────────────────────────────────────────────────
function DirectPurchaseForm() {
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({
    supplier_name: '',
    reference: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    notes: '',
    tax_pct: '',
  })
  const [items, setItems] = useState([
    { id: Date.now(), inventory_item_id: null, item_name: '', sku: '', unit: 'unit', qty: '', unit_cost: '' }
  ])
  const [itemSearch, setItemSearch] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState({})
  const dropdownRefs = useRef({})

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  const mut = useMutation({
    mutationFn: (data) => api.post('/direct-purchases', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direct-purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      setToast({ message: 'Purchase saved and inventory updated!', type: 'success' })
      // Reset
      setForm({ supplier_name: '', reference: '', purchase_date: new Date().toISOString().slice(0, 10), notes: '', tax_pct: '' })
      setItems([{ id: Date.now(), inventory_item_id: null, item_name: '', sku: '', unit: 'unit', qty: '', unit_cost: '' }])
    },
    onError: () => setToast({ message: 'Failed to save purchase', type: 'error' }),
  })

  // Close dropdown on outside click
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

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unit_cost) || 0), 0)
  const taxAmt = subtotal * ((parseFloat(form.tax_pct) || 0) / 100)
  const total = subtotal + taxAmt

  function addItem() {
    setItems(prev => [...prev, { id: Date.now(), inventory_item_id: null, item_name: '', sku: '', unit: 'unit', qty: '', unit_cost: '' }])
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
    } : it))
    setItemSearch(prev => ({ ...prev, [rowId]: invItem.name }))
    setDropdownOpen(prev => ({ ...prev, [rowId]: false }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      supplier_name: form.supplier_name,
      reference: form.reference,
      purchase_date: form.purchase_date,
      notes: form.notes,
      tax_amount: taxAmt,
      items: items.filter(it => it.item_name).map(it => ({
        inventory_item_id: it.inventory_item_id || undefined,
        item_name: it.item_name,
        sku: it.sku,
        unit: it.unit,
        qty: parseFloat(it.qty) || 0,
        unit_cost: parseFloat(it.unit_cost) || 0,
      })),
    }
    mut.mutate(payload)
  }

  const ff = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Purchase Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Supplier Name</label>
            <input className={inp} value={form.supplier_name} onChange={ff('supplier_name')} placeholder="e.g. Wella Distributors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reference #</label>
            <input className={inp} value={form.reference} onChange={ff('reference')} placeholder="Invoice or bill #" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Purchase Date</label>
            <input className={inp} type="date" value={form.purchase_date} onChange={ff('purchase_date')} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tax %</label>
            <input className={inp} type="number" min="0" step="0.01" value={form.tax_pct} onChange={ff('tax_pct')} placeholder="0" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <input className={inp} value={form.notes} onChange={ff('notes')} placeholder="Optional notes" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-slate-700">Items</h3>
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
                const filteredInv = inventoryItems.filter(inv =>
                  !itemSearch[item.id] ||
                  inv.name.toLowerCase().includes((itemSearch[item.id] || '').toLowerCase())
                )
                const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_cost) || 0)
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
                          placeholder="Search inventory or type name…"
                        />
                        {dropdownOpen[item.id] && filteredInv.length > 0 && (
                          <div className="absolute z-20 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                            {filteredInv.slice(0, 10).map(inv => (
                              <button
                                key={inv.id}
                                type="button"
                                className="w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-slate-50 text-left"
                                onMouseDown={() => selectInventoryItem(item.id, inv)}
                              >
                                <span className="font-medium text-slate-800">{inv.name}</span>
                                <span className="text-[11px] text-slate-400">{inv.sku || 'No SKU'}</span>
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
                      <input className={inp} type="number" min="0" step="0.01" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} placeholder="0" />
                    </td>
                    <td className="px-4 py-2.5 min-w-[110px]">
                      <input className={inp} type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                    </td>
                    <td className="px-4 py-2.5 min-w-[90px]">
                      <span className="font-medium text-slate-800">{formatCurrency(lineTotal)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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
          <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-[13px] text-[#0D9488] font-medium hover:underline">
            <Plus size={13} /> Add Item
          </button>
        </div>
      </div>

      {/* Summary + submit */}
      <div className="flex items-end justify-between gap-4">
        <button
          type="submit"
          disabled={mut.isPending || items.filter(it => it.item_name).length === 0}
          className={`${btn('primary', 'md')} px-6`}
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
        >
          {mut.isPending ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : 'Save & Update Inventory'}
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 min-w-[220px] space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({form.tax_pct || 0}%)</span>
            <span className="font-medium text-slate-800">{formatCurrency(taxAmt)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-1.5">
            <span className="font-semibold text-slate-800">Total</span>
            <span className="font-bold text-[#0D9488]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  )
}

// ─── Suppliers Tab ────────────────────────────────────────────────────────────
function SuppliersTab() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate-500">{suppliers.length} suppliers</p>
        <button
          onClick={() => { setEditSupplier(null); setShowModal(true) }}
          className={btn('primary', 'sm')}
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
        >
          <Plus size={13} /> Add Supplier
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users size={36} className="text-slate-300 mb-3" />
          <p className="text-[15px] font-semibold text-slate-600">No suppliers yet</p>
          <p className="text-[13px] text-slate-400 mt-1">Add your first supplier to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50">
              <tr>
                {['Name', 'Contact', 'Phone', 'Email', 'Payment Terms', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.payment_terms}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditSupplier(s); setShowModal(true) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#6366F1] hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMut.mutate(s.id) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SupplierModal supplier={editSupplier} onClose={() => { setShowModal(false); setEditSupplier(null) }} />
      )}
    </div>
  )
}

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────
function PurchaseOrdersTab() {
  const navigate = useNavigate()
  const [selectedPO, setSelectedPO] = useState(null)
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then(r => r.data),
  })

  const filtered = useMemo(() => {
    if (!search) return orders
    const q = search.toLowerCase()
    return orders.filter(po =>
      po.po_number.toLowerCase().includes(q) ||
      po.supplier_name.toLowerCase().includes(q)
    )
  }, [orders, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inp} pl-8`}
            placeholder="Search POs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => navigate('/purchases/new-order')}
          className={btn('primary', 'sm')}
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
        >
          <Plus size={13} /> New Purchase Order
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={36} className="text-slate-300 mb-3" />
          <p className="text-[15px] font-semibold text-slate-600">No purchase orders</p>
          <p className="text-[13px] text-slate-400 mt-1">Create your first PO to track orders from suppliers</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50">
              <tr>
                {['PO Number', 'Supplier', 'Order Date', 'Expected', 'Items', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedPO(po)}>
                  <td className="px-4 py-3 font-mono font-semibold text-[#0D9488]">{po.po_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{po.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{po.order_date}</td>
                  <td className="px-4 py-3 text-slate-500">{po.expected_date || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{po.item_count}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(po.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3">
                    <ArrowRight size={14} className="text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPO && (
        <PODetailModal po={selectedPO} onClose={() => setSelectedPO(null)} />
      )}
    </div>
  )
}

// ─── Direct Purchases Tab ─────────────────────────────────────────────────────
function DirectPurchasesTab() {
  const [showForm, setShowForm] = useState(true)
  const [selected, setSelected] = useState(null)

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['direct-purchases'],
    queryFn: () => api.get('/direct-purchases').then(r => r.data),
  })

  const { data: fullPurchase } = useQuery({
    queryKey: ['direct-purchase', selected?.id],
    queryFn: () => api.get(`/direct-purchases/${selected.id}`).then(r => r.data),
    enabled: !!selected,
  })

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(true)}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${showForm ? 'bg-[#0D9488] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          New Purchase
        </button>
        <button
          onClick={() => setShowForm(false)}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${!showForm ? 'bg-[#0D9488] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          History ({purchases.length})
        </button>
      </div>

      {showForm ? (
        <DirectPurchaseForm />
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart size={36} className="text-slate-300 mb-3" />
              <p className="text-[15px] font-semibold text-slate-600">No direct purchases yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50">
                  <tr>
                    {['Date', 'Supplier', 'Reference', 'Subtotal', 'Tax', 'Total', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchases.map(dp => (
                    <tr key={dp.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelected(dp)}>
                      <td className="px-4 py-3 text-slate-700">{dp.purchase_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{dp.supplier_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[12px]">{dp.reference || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(dp.subtotal)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(dp.tax_amount)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{formatCurrency(dp.total_amount)}</td>
                      <td className="px-4 py-3"><ArrowRight size={14} className="text-slate-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800">Direct Purchase</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">{selected.supplier_name || 'No supplier'} · {selected.purchase_date}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {fullPurchase ? (
                <div className="space-y-4">
                  {fullPurchase.notes && (
                    <p className="text-[13px] text-slate-500 bg-slate-50 rounded-xl px-4 py-3">{fullPurchase.notes}</p>
                  )}
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Item', 'Qty', 'Unit Cost', 'Total'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(fullPurchase.items || []).map(item => (
                        <tr key={item.id}>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{item.item_name}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.qty} {item.unit}</td>
                          <td className="px-3 py-2.5 text-slate-600">{formatCurrency(item.unit_cost)}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{formatCurrency(item.total_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end">
                    <div className="space-y-1 text-[13px] min-w-[180px]">
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(fullPurchase.subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(fullPurchase.tax_amount)}</span></div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold"><span>Total</span><span>{formatCurrency(fullPurchase.total_amount)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelected(null)} className={btn('ghost', 'sm')}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Purchase History Tab ─────────────────────────────────────────────────────
function PurchaseHistoryTab() {
  const [filter, setFilter] = useState('all') // all | po | direct
  const [search, setSearch] = useState('')

  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then(r => r.data),
  })

  const { data: directs = [], isLoading: directsLoading } = useQuery({
    queryKey: ['direct-purchases'],
    queryFn: () => api.get('/direct-purchases').then(r => r.data),
  })

  const loading = posLoading || directsLoading

  const combined = useMemo(() => {
    const poRows = pos.map(p => ({
      ...p,
      _type: 'po',
      _date: p.order_date,
      _supplier: p.supplier_name || '—',
      _ref: p.po_number,
    }))
    const dpRows = directs.map(d => ({
      ...d,
      _type: 'direct',
      _date: d.purchase_date,
      _supplier: d.supplier_name || '—',
      _ref: d.reference || '—',
    }))
    const all = [...poRows, ...dpRows].sort((a, b) => b._date.localeCompare(a._date))

    return all.filter(r => {
      if (filter === 'po' && r._type !== 'po') return false
      if (filter === 'direct' && r._type !== 'direct') return false
      if (search) {
        const q = search.toLowerCase()
        return r._supplier.toLowerCase().includes(q) || r._ref.toLowerCase().includes(q)
      }
      return true
    })
  }, [pos, directs, filter, search])

  const totalSpent = combined.reduce((s, r) => s + Number(r.total_amount || 0), 0)
  const thisMonth = combined.filter(r => {
    const d = new Date(r._date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, r) => s + Number(r.total_amount || 0), 0)

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: combined.length, icon: Package, color: '#6366F1' },
          { label: 'Total Spent (filtered)', value: formatCurrency(totalSpent), icon: TrendingUp, color: '#0D9488' },
          { label: 'This Month', value: formatCurrency(thisMonth), icon: Calendar, color: '#3B82F6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-[18px] font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {[['all','All'], ['po','Purchase Orders'], ['direct','Direct']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier or reference…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-slate-50 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : combined.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History size={36} className="text-slate-300 mb-3" />
          <p className="text-[15px] font-semibold text-slate-600">No purchase history</p>
          <p className="text-[13px] text-slate-400 mt-1">Create a purchase order or direct purchase to see history here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Date', 'Type', 'Supplier', 'Reference', 'Items', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {combined.map((row, i) => (
                <tr key={`${row._type}-${row.id}`} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row._date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      row._type === 'po'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-teal-50 text-teal-700'
                    }`}>
                      {row._type === 'po' ? <><FileText size={10} /> PO</> : <><ShoppingCart size={10} /> Direct</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row._supplier}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[12px]">{row._ref}</td>
                  <td className="px-4 py-3 text-slate-600">{row.item_count ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(row.total_amount)}</td>
                  <td className="px-4 py-3">
                    {row._type === 'po'
                      ? <StatusBadge status={row.status} />
                      : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">Completed</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[12px] text-slate-500">
            <span>{combined.length} records</span>
            <span className="font-semibold text-slate-700">Grand Total: {formatCurrency(totalSpent)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Purchases Page ──────────────────────────────────────────────────────
const TABS = [
  { id: 'orders',   label: 'Purchase Orders', icon: FileText  },
  { id: 'direct',   label: 'Direct Purchase', icon: ShoppingCart },
  { id: 'suppliers', label: 'Suppliers',       icon: Users    },
  { id: 'history',  label: 'History',          icon: History  },
]

export default function Purchases() {
  const [tab, setTab] = useState('orders')

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-slate-800">Purchases</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Manage suppliers, purchase orders, and ad-hoc stock purchases</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              tab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'orders'    && <PurchaseOrdersTab />}
      {tab === 'direct'    && <DirectPurchasesTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'history'   && <PurchaseHistoryTab />}
    </div>
  )
}
