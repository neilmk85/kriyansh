import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, AlertTriangle, DollarSign, Plus, Search, X } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function StatCard({ icon: Icon, label, value, sub, color = '#0D9488', badge }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[24px] font-bold text-slate-800 leading-tight">{value ?? '—'}</p>
          {badge}
        </div>
        {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', category: '', sku: '', unit: 'unit',
  cost_price: '', retail_price: '', stock_qty: '', low_stock_threshold: '5',
}

export default function Inventory() {
  const qc = useQueryClient()
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editItem,   setEditItem]   = useState(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  // Derive categories from items
  const categories = useMemo(() => {
    const s = new Set(items.map(i => i.category).filter(Boolean))
    return [...s]
  }, [items])

  // Stats
  const totalItems    = items.length
  const lowStockItems = items.filter(i => i.stock_qty <= i.low_stock_threshold).length
  const totalValue    = items.reduce((s, i) => s + (i.retail_price ?? 0) * (i.stock_qty ?? 0), 0)

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
        || (i.sku ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === 'all' || i.category === catFilter
      return matchSearch && matchCat
    })
  }, [items, search, catFilter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">Inventory</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{totalItems} items total</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold  transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Package}       label="Total Items"       value={totalItems}          color="#0D9488" />
        <StatCard
          icon={AlertTriangle} label="Low Stock Items"  value={lowStockItems}       color="#EF4444"
          badge={lowStockItems > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold">
              {lowStockItems} low
            </span>
          ) : null}
        />
        <StatCard icon={DollarSign}    label="Total Stock Value" value={formatCurrency(totalValue)} color="#8B5CF6" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryPill active={catFilter === 'all'} onClick={() => setCatFilter('all')}>All</CategoryPill>
          {categories.map(cat => (
            <CategoryPill key={cat} active={catFilter === cat} onClick={() => setCatFilter(cat)}>{cat}</CategoryPill>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No inventory items found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Category', 'SKU', 'Unit', 'Stock Qty', 'Threshold', 'Retail Price', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const isLow = item.stock_qty <= item.low_stock_threshold
                return (
                  <tr key={item.id}
                    onClick={() => setEditItem(item)}
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
                    <td className="px-5 py-3.5 text-[12px] text-slate-500">{item.unit || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[13px] font-bold ${isLow ? 'text-red-500' : 'text-slate-800'}`}>
                        {item.stock_qty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-500">{item.low_stock_threshold}</td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-700">{formatCurrency(item.retail_price)}</td>
                    <td className="px-5 py-3.5">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-semibold">
                          <AlertTriangle size={10} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <InventoryModal onClose={() => setShowAdd(false)} />}
      {editItem && <InventoryModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function CategoryPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all whitespace-nowrap ${
        active ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]' : 'bg-white border-slate-200 text-slate-600 hover:border-[#0D9488] hover:text-[#0D9488]'
      }`}>
      {children}
    </button>
  )
}

function InventoryModal({ item, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!item
  const [form, setForm] = useState(isEdit ? {
    name:               item.name ?? '',
    category:           item.category ?? '',
    sku:                item.sku ?? '',
    unit:               item.unit ?? 'unit',
    cost_price:         item.cost_price ?? '',
    retail_price:       item.retail_price ?? '',
    stock_qty:          item.stock_qty ?? '',
    low_stock_threshold: item.low_stock_threshold ?? '5',
  } : { ...EMPTY_FORM })
  const [saving,        setSaving]        = useState(false)
  const [adjustOpen,    setAdjustOpen]    = useState(false)
  const [adjustForm,    setAdjustForm]    = useState({ delta: '', note: '' })
  const [adjustSaving,  setAdjustSaving]  = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
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

  async function handleAdjust(e) {
    e.preventDefault()
    setAdjustSaving(true)
    try {
      await api.post(`/inventory/${item.id}/adjust`, {
        delta: +adjustForm.delta,
        note:   adjustForm.note,
      })
      qc.invalidateQueries(['inventory'])
      setAdjustOpen(false)
      setAdjustForm({ delta: '', note: '' })
    } finally {
      setAdjustSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-800">{isEdit ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Field label="Unit">
            <select value={form.unit} onChange={set('unit')} className={inp}>
              <option value="unit">unit</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="oz">oz</option>
              <option value="bottle">bottle</option>
              <option value="box">box</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost Price ($)">
              <input type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} className={inp} placeholder="0.00" />
            </Field>
            <Field label="Retail Price ($)">
              <input type="number" step="0.01" min="0" value={form.retail_price} onChange={set('retail_price')} className={inp} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock Qty">
              <input type="number" min="0" value={form.stock_qty} onChange={set('stock_qty')} className={inp} placeholder="0" />
            </Field>
            <Field label="Low Stock Threshold">
              <input type="number" min="0" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} className={inp} placeholder="5" />
            </Field>
          </div>

          {/* Adjust Stock sub-form (edit only) */}
          {isEdit && (
            <div>
              <button type="button" onClick={() => setAdjustOpen(o => !o)}
                className="text-[12px] text-[#0D9488] font-semibold hover:underline flex items-center gap-1">
                {adjustOpen ? <X size={12} /> : <Plus size={12} />}
                Adjust Stock
              </button>
              {adjustOpen && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <p className="text-[12px] font-semibold text-slate-600">Stock Adjustment</p>
                  <Field label="Delta (+ to add, - to remove)">
                    <input type="number" value={adjustForm.delta}
                      onChange={e => setAdjustForm(f => ({ ...f, delta: e.target.value }))}
                      className={inp} placeholder="e.g. +10 or -5" />
                  </Field>
                  <Field label="Note">
                    <input value={adjustForm.note}
                      onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
                      className={inp} placeholder="e.g. Stock recount" />
                  </Field>
                  <button type="button" onClick={handleAdjust} disabled={adjustSaving || !adjustForm.delta}
                    className="w-full py-2 rounded-xl bg-slate-700 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors">
                    {adjustSaving ? 'Saving…' : 'Apply Adjustment'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
