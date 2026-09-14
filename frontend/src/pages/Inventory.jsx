import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Package, AlertTriangle, DollarSign, Plus, Search, X,
  ChevronRight, ArrowUpCircle, ArrowDownCircle, Trash2,
  History, FlaskConical, SlidersHorizontal, TrendingDown,
  RotateCcw, ShoppingCart, ClipboardList,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function FilterPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all whitespace-nowrap ${
        active
          ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]'
          : 'bg-white border-slate-200 text-slate-600 hover:border-[#0D9488] hover:text-[#0D9488]'
      }`}>
      {children}
    </button>
  )
}

const MOVEMENT_META = {
  purchase:   { label: 'Purchase',   icon: ArrowUpCircle,  color: 'text-green-600',  bg: 'bg-green-50'  },
  sale:       { label: 'Sale',       icon: ShoppingCart,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-slate-600', bg: 'bg-slate-100' },
  wastage:    { label: 'Wastage',    icon: Trash2,         color: 'text-red-600',    bg: 'bg-red-50'    },
  stocktake:  { label: 'Stocktake',  icon: ClipboardList,  color: 'text-purple-600', bg: 'bg-purple-50' },
}

export default function Inventory() {
  const qc = useQueryClient()
  const [search,      setSearch]      = useState('')
  const [stockFilter, setStockFilter] = useState('all') // all | low | out
  const [catFilter,   setCatFilter]   = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  const categories = useMemo(() => {
    const s = new Set(items.map(i => i.category).filter(Boolean))
    return [...s]
  }, [items])

  const stats = useMemo(() => ({
    total:    items.length,
    lowStock: items.filter(i => i.is_active && Number(i.stock_qty) > 0 && Number(i.stock_qty) <= Number(i.low_stock_threshold)).length,
    outStock: items.filter(i => i.is_active && Number(i.stock_qty) <= 0).length,
    value:    items.reduce((s, i) => s + (i.retail_price ?? 0) * (i.stock_qty ?? 0), 0),
  }), [items])

  const filtered = useMemo(() => {
    return items.filter(i => {
      const q   = search.toLowerCase()
      const qty = Number(i.stock_qty)
      const thr = Number(i.low_stock_threshold)
      if (search && !i.name.toLowerCase().includes(q) && !(i.sku ?? '').toLowerCase().includes(q)) return false
      if (catFilter !== 'all' && i.category !== catFilter) return false
      if (stockFilter === 'low' && !(qty > 0 && qty <= thr)) return false
      if (stockFilter === 'out' && qty > 0) return false
      return true
    })
  }, [items, search, catFilter, stockFilter])

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">Inventory</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{stats.total} items · {formatCurrency(stats.value)} value</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Items"  value={stats.total}              icon={Package}       color="#0D9488"
          onClick={() => setStockFilter('all')} active={stockFilter === 'all'} />
        <StatCard label="Low Stock"    value={stats.lowStock}           icon={AlertTriangle} color="#F59E0B"
          onClick={() => setStockFilter('low')} active={stockFilter === 'low'}
          badge={stats.lowStock > 0 ? <Badge color="amber">{stats.lowStock}</Badge> : null} />
        <StatCard label="Out of Stock" value={stats.outStock}           icon={TrendingDown}  color="#EF4444"
          onClick={() => setStockFilter('out')} active={stockFilter === 'out'}
          badge={stats.outStock > 0 ? <Badge color="red">{stats.outStock}</Badge> : null} />
        <StatCard label="Stock Value"  value={formatCurrency(stats.value)} icon={DollarSign} color="#8B5CF6" />
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <FilterPill active={catFilter === 'all'} onClick={() => setCatFilter('all')}>All</FilterPill>
            {categories.map(cat => (
              <FilterPill key={cat} active={catFilter === cat} onClick={() => setCatFilter(cat)}>{cat}</FilterPill>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No items found</p>
        </div>
      ) : (
        <>
          {/* Mobile: card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filtered.map(item => (
              <MobileCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Product', 'Category', 'SKU', 'Stock', 'Threshold', 'Retail', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(item => {
                  const qty = Number(item.stock_qty)
                  const thr = Number(item.low_stock_threshold)
                  const isOut = qty <= 0
                  const isLow = qty > 0 && qty <= thr
                  return (
                    <tr key={item.id} onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
                            <Package size={14} />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500">{item.category || '—'}</td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-400 font-mono">{item.sku || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[13px] font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {qty} {item.unit || ''}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500">{item.low_stock_threshold} {item.unit || ''}</td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-700">{formatCurrency(item.retail_price)}</td>
                      <td className="px-5 py-3.5">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-semibold">
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
                            <AlertTriangle size={10} /> Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd    && <ItemDrawer onClose={() => { setShowAdd(false); qc.invalidateQueries(['inventory']) }} />}
      {selectedItem && <ItemDrawer item={selectedItem} onClose={() => { setSelectedItem(null); qc.invalidateQueries(['inventory']) }} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ color, children }) {
  const cls = color === 'red' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>
}

function StatCard({ icon: Icon, label, value, color, badge, onClick, active }) {
  const clickable = !!onClick
  return (
    <button type="button" onClick={onClick}
      className={`bg-white rounded-2xl border p-4 flex items-start gap-3 text-left transition-all w-full ${
        clickable
          ? active ? 'border-[#0D9488] ring-2 ring-[#CCFBF1] shadow-sm' : 'border-slate-200 hover:border-[#0D9488] hover:shadow-sm cursor-pointer'
          : 'border-slate-200 cursor-default'
      }`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide leading-tight">{label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-[20px] font-bold text-slate-800 leading-tight">{value ?? '—'}</p>
          {badge}
        </div>
      </div>
    </button>
  )
}

function MobileCard({ item, onClick }) {
  const qty = Number(item.stock_qty)
  const thr = Number(item.low_stock_threshold)
  const isOut = qty <= 0
  const isLow = qty > 0 && qty <= thr
  return (
    <button onClick={onClick}
      className={`bg-white rounded-2xl border p-4 text-left w-full transition-all hover:shadow-sm ${
        isOut ? 'border-red-200' : isLow ? 'border-amber-200' : 'border-slate-200'
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
            <Package size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 truncate">{item.name}</p>
            {item.category && <p className="text-[11px] text-slate-400">{item.category}</p>}
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-300 mt-1 shrink-0" />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className={`text-[15px] font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-slate-800'}`}>
            {isOut ? 'Out of stock' : `${qty} ${item.unit || 'units'}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Min: {item.low_stock_threshold} {item.unit || ''}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-slate-700">{formatCurrency(item.retail_price)}</p>
          {isOut ? (
            <span className="text-[11px] font-semibold text-red-500">Out</span>
          ) : isLow ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
              <AlertTriangle size={9} /> Low
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-green-600">OK</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Item Drawer ───────────────────────────────────────────────────────────────

const DRAWER_TABS = ['Details', 'Stock', 'History']
const UNITS = ['unit', 'ml', 'kg', 'g', 'L', 'oz', 'bottle', 'box', 'pack', 'tube']

const EMPTY = {
  name: '', category: '', sku: '', unit: 'unit',
  supplier: '',
  cost_price: '', retail_price: '', stock_qty: '', low_stock_threshold: '5',
}

function ItemDrawer({ item, onClose }) {
  const qc     = useQueryClient()
  const isEdit = !!item
  const [tab,    setTab]    = useState(isEdit ? 'Stock' : 'Details')
  const [form,   setForm]   = useState(isEdit ? {
    name:               item.name ?? '',
    category:           item.category ?? '',
    sku:                item.sku ?? '',
    unit:               item.unit ?? 'unit',
    supplier:           item.supplier ?? '',
    cost_price:         item.cost_price ?? '',
    retail_price:       item.retail_price ?? '',
    stock_qty:          item.stock_qty ?? '',
    low_stock_threshold: item.low_stock_threshold ?? '5',
  } : { ...EMPTY })
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Stock tab
  const [adjDelta,  setAdjDelta]  = useState('')
  const [adjNote,   setAdjNote]   = useState('')
  const [adjSaving, setAdjSaving] = useState(false)
  const [wastageQty, setWastageQty] = useState('')
  const [wastageReason, setWastageReason] = useState('')
  const [wastageSaving, setWastageSaving] = useState(false)
  const [stockMode, setStockMode] = useState('adjust') // adjust | wastage

  // History tab
  const { data: movements = [], isLoading: movLoading } = useQuery({
    queryKey: ['inventory-movements', item?.id],
    queryFn: () => api.get(`/inventory/${item.id}/movements`).then(r => r.data),
    enabled: isEdit && tab === 'History',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        cost_price:          +form.cost_price,
        retail_price:        +form.retail_price,
        stock_qty:           +form.stock_qty,
        low_stock_threshold: +form.low_stock_threshold,
      }
      if (isEdit) await api.put(`/inventory/${item.id}`, payload)
      else         await api.post('/inventory', payload)
      qc.invalidateQueries(['inventory'])
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This hides it from inventory.`)) return
    setDeleting(true)
    try {
      await api.delete(`/inventory/${item.id}`)
      qc.invalidateQueries(['inventory'])
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  async function handleAdjust(e) {
    e.preventDefault()
    if (!adjDelta) return
    setAdjSaving(true)
    try {
      await api.post(`/inventory/${item.id}/adjust`, { delta: +adjDelta, note: adjNote })
      qc.invalidateQueries(['inventory'])
      qc.invalidateQueries(['inventory-movements', item.id])
      setAdjDelta(''); setAdjNote('')
    } finally {
      setAdjSaving(false)
    }
  }

  async function handleWastage(e) {
    e.preventDefault()
    if (!wastageQty || +wastageQty <= 0) return
    setWastageSaving(true)
    try {
      await api.post(`/inventory/${item.id}/wastage`, { qty: +wastageQty, reason: wastageReason })
      qc.invalidateQueries(['inventory'])
      qc.invalidateQueries(['inventory-movements', item.id])
      setWastageQty(''); setWastageReason('')
    } finally {
      setWastageSaving(false)
    }
  }

  const qty = Number(item?.stock_qty ?? 0)
  const thr = Number(item?.low_stock_threshold ?? 0)
  const isOut = isEdit && qty <= 0
  const isLow = isEdit && qty > 0 && qty <= thr

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer — slides in from right */}
      <div className="relative ml-auto w-full max-w-md sm:max-w-lg bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0D9488]">
            <Package size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-slate-800 truncate">{isEdit ? item.name : 'Add Item'}</h2>
            {isEdit && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[12px] font-semibold ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                  {isOut ? 'Out of stock' : isLow ? `Low — ${qty} left` : `${qty} ${item.unit || 'units'} in stock`}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        {isEdit && (
          <div className="flex border-b border-slate-100 shrink-0">
            {DRAWER_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-[12px] font-semibold transition-colors ${
                  tab === t ? 'text-[#0D9488] border-b-2 border-[#0D9488]' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {t === 'History' && <span className="inline-flex items-center gap-1"><History size={11} /> {t}</span>}
                {t === 'Stock'   && <span className="inline-flex items-center gap-1"><SlidersHorizontal size={11} /> {t}</span>}
                {t === 'Details' && t}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Details tab ── */}
          {tab === 'Details' && (
            <form id="item-form" onSubmit={handleSave} className="space-y-4">
              <Field label="Name *">
                <input required value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Keratin Shampoo" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <input value={form.category} onChange={set('category')} className={inp} placeholder="e.g. Hair Care" />
                </Field>
                <Field label="SKU">
                  <input value={form.sku} onChange={set('sku')} className={inp} placeholder="e.g. SKU-001" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit">
                  <select value={form.unit} onChange={set('unit')} className={inp}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Supplier">
                  <input value={form.supplier} onChange={set('supplier')} className={inp} placeholder="Supplier name" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost Price ($)">
                  <input type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} className={inp} placeholder="0.00" />
                </Field>
                <Field label="Retail Price ($)">
                  <input type="number" step="0.01" min="0" value={form.retail_price} onChange={set('retail_price')} className={inp} placeholder="0.00" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={isEdit ? "Starting Stock" : "Stock Qty"}>
                  <input type="number" min="0" step="0.01" value={form.stock_qty} onChange={set('stock_qty')} className={inp} placeholder="0" />
                </Field>
                <Field label="Low Stock Alert">
                  <input type="number" min="0" step="0.01" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} className={inp} placeholder="5" />
                </Field>
              </div>
            </form>
          )}

          {/* ── Stock tab ── */}
          {tab === 'Stock' && isEdit && (
            <div className="space-y-5">
              {/* Current qty banner */}
              <div className={`rounded-2xl p-4 flex items-center gap-4 ${isOut ? 'bg-red-50 border border-red-100' : isLow ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOut ? 'bg-red-100' : isLow ? 'bg-amber-100' : 'bg-green-100'}`}>
                  {isOut ? <TrendingDown size={20} className="text-red-500" /> : isLow ? <AlertTriangle size={20} className="text-amber-600" /> : <Package size={20} className="text-green-600" />}
                </div>
                <div>
                  <p className={`text-[22px] font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-green-700'}`}>
                    {qty} <span className="text-[15px]">{item.unit || 'units'}</span>
                  </p>
                  <p className={`text-[12px] ${isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                    {isOut ? 'Out of stock' : isLow ? `Low — threshold is ${thr} ${item.unit || ''}` : 'In stock'}
                  </p>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setStockMode('adjust')}
                  className={`flex-1 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    stockMode === 'adjust' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
                  }`}>
                  <RotateCcw size={12} /> Adjust
                </button>
                <button onClick={() => setStockMode('wastage')}
                  className={`flex-1 py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    stockMode === 'wastage' ? 'bg-red-600 text-white' : 'bg-white text-slate-500 hover:text-slate-700'
                  }`}>
                  <FlaskConical size={12} /> Log Wastage
                </button>
              </div>

              {/* Adjust form */}
              {stockMode === 'adjust' && (
                <form onSubmit={handleAdjust} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[12px] font-semibold text-slate-600">Stock Adjustment</p>
                  <Field label="Quantity Change">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAdjDelta(v => v.startsWith('-') ? v.slice(1) : (v ? v : '0'))}
                        className={`px-3 py-2 rounded-xl border text-[12px] font-bold transition-colors ${!adjDelta.startsWith('-') ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                        + Add
                      </button>
                      <button type="button" onClick={() => setAdjDelta(v => v.startsWith('-') ? v : (v ? '-' + v : '-0'))}
                        className={`px-3 py-2 rounded-xl border text-[12px] font-bold transition-colors ${adjDelta.startsWith('-') ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                        − Remove
                      </button>
                      <input type="number" step="0.01" value={adjDelta.replace('-', '')}
                        onChange={e => setAdjDelta(adjDelta.startsWith('-') ? '-' + e.target.value : e.target.value)}
                        className={`${inp} flex-1`} placeholder="0" />
                    </div>
                  </Field>
                  <Field label="Note (optional)">
                    <input value={adjNote} onChange={e => setAdjNote(e.target.value)} className={inp} placeholder="e.g. Stock recount, damaged goods…" />
                  </Field>
                  {adjDelta && +adjDelta !== 0 && (
                    <p className="text-[12px] text-slate-500">
                      Stock will change from <strong>{qty}</strong> → <strong>{(qty + +adjDelta).toFixed(2)}</strong> {item.unit || 'units'}
                    </p>
                  )}
                  <button type="submit" disabled={adjSaving || !adjDelta || +adjDelta === 0}
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-[13px] font-semibold hover:bg-slate-900 disabled:opacity-60 transition-colors">
                    {adjSaving ? 'Saving…' : 'Apply Adjustment'}
                  </button>
                </form>
              )}

              {/* Wastage form */}
              {stockMode === 'wastage' && (
                <form onSubmit={handleWastage} className="space-y-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={14} className="text-red-500" />
                    <p className="text-[12px] font-semibold text-red-700">Log Wastage / Breakage</p>
                  </div>
                  <Field label="Quantity Wasted">
                    <input type="number" min="0.01" step="0.01" value={wastageQty}
                      onChange={e => setWastageQty(e.target.value)}
                      className={inp} placeholder={`How many ${item.unit || 'units'} wasted?`} />
                  </Field>
                  <Field label="Reason">
                    <input value={wastageReason} onChange={e => setWastageReason(e.target.value)}
                      className={inp} placeholder="e.g. Expired, dropped, mixed incorrectly…" />
                  </Field>
                  {wastageQty && +wastageQty > 0 && (
                    <p className="text-[12px] text-red-600">
                      Stock will decrease from <strong>{qty}</strong> → <strong>{Math.max(0, qty - +wastageQty).toFixed(2)}</strong> {item.unit || 'units'}
                    </p>
                  )}
                  <button type="submit" disabled={wastageSaving || !wastageQty || +wastageQty <= 0}
                    className="w-full py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {wastageSaving ? 'Logging…' : 'Log Wastage'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── History tab ── */}
          {tab === 'History' && isEdit && (
            <div>
              {movLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center">
                  <History size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-[13px] text-slate-500">No stock movements recorded yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">Adjustments, sales, purchases and wastage appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map(m => {
                    const meta = MOVEMENT_META[m.movement_type] ?? MOVEMENT_META.adjustment
                    const Icon = meta.icon
                    const isPos = m.delta >= 0
                    return (
                      <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                            <span className={`text-[13px] font-bold ${isPos ? 'text-green-600' : 'text-red-500'}`}>
                              {isPos ? '+' : ''}{m.delta > 0 ? '+' : ''}{Number(m.delta).toFixed(2)} {item.unit || ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5 gap-2">
                            <span className="text-[12px] text-slate-500 truncate">{m.reason || m.reference || '—'}</span>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {m.qty_before?.toFixed(1)} → {m.qty_after?.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4 shrink-0">
          {tab === 'Details' && (
            <div className="flex gap-3">
              {isEdit && (
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3.5 py-2.5 rounded-xl border border-red-200 text-red-500 text-[12px] font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button form="item-form" type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold disabled:opacity-60 transition-colors">
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          )}
          {tab === 'Stock' && (
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">
              Done
            </button>
          )}
          {tab === 'History' && (
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
