import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, SlidersHorizontal, ArrowUpDown,
  ChevronDown, X, Package, Pencil, Trash2, ArrowUp, ArrowDown
} from 'lucide-react'
import api from '@/lib/api'

// ── helpers ────────────────────────────────────────────────────────────────

const fmt = n => `US$ ${parseFloat(n || 0).toFixed(2)}`

const BLANK = {
  name: '', category: '', sku: '', supplier: '',
  unit: 'each', cost_price: '', retail_price: '',
  stock_qty: '', low_stock_threshold: '5',
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Products() {
  const qc = useQueryClient()

  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(new Set())
  const [sort,      setSort]      = useState({ col: 'created_at', dir: 'desc' })
  const [slideOver, setSlideOver] = useState(null)
  const [deleteId,  setDeleteId]  = useState(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn:  () => api.get('/inventory').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: d              => api.post('/inventory', d),
    onSuccess:  ()             => { qc.invalidateQueries({ queryKey: ['inventory'] }); setSlideOver(null) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d })    => api.put(`/inventory/${id}`, d),
    onSuccess:  ()             => { qc.invalidateQueries({ queryKey: ['inventory'] }); setSlideOver(null) },
  })
  const deleteMut = useMutation({
    mutationFn: id             => api.delete(`/inventory/${id}`),
    onSuccess:  ()             => { qc.invalidateQueries({ queryKey: ['inventory'] }); setDeleteId(null) },
  })

  // Filter + sort
  const rows = useMemo(() => {
    const q = search.toLowerCase()
    let list = items.filter(it =>
      !q ||
      it.name.toLowerCase().includes(q) ||
      (it.sku || '').toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      let av = a[sort.col] ?? '', bv = b[sort.col] ?? ''
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv+'').toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 :  1
      if (av > bv) return sort.dir === 'asc' ?  1 : -1
      return 0
    })
  }, [items, search, sort])

  function toggleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
  }

  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id))
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id)))
  }
  function toggleOne(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const openAdd  = ()  => setSlideOver({ mode: 'create', item: { ...BLANK } })
  const openEdit = it  => setSlideOver({ mode: 'edit',   item: { ...BLANK, ...it } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-900">Product list</h1>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {items.length}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-500 mt-0.5">
            Add and manage your products in stock.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-6">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Options <ChevronDown size={14} className="text-slate-400" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Search + filter bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative w-[340px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name or barcode"
            className="w-full pl-9 pr-4 py-2 text-[13.5px] border border-slate-200 rounded-xl outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-400"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <SlidersHorizontal size={14} /> Filters
        </button>
        <div className="flex-1" />
        <button
          onClick={() => toggleSort('created_at')}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowUpDown size={14} /> Updated (newest first)
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">

        {/* Column headers */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="w-8 shrink-0">
            <Checkbox checked={allChecked} onChange={toggleAll} />
          </div>
          <SortHead label="Product name" col="name"         sort={sort} onSort={toggleSort} className="flex-1" />
          <SortHead label="Category"     col="category"     sort={sort} onSort={toggleSort} className="w-36" />
          <SortHead label="Supplier"     col="supplier"     sort={sort} onSort={toggleSort} className="w-36" />
          <SortHead label="Quantity"     col="stock_qty"    sort={sort} onSort={toggleSort} className="w-28 justify-end" />
          <SortHead label="Retail price" col="retail_price" sort={sort} onSort={toggleSort} className="w-32 justify-end" />
          <div className="w-16" />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState search={search} onAdd={openAdd} />
        ) : (
          rows.map((item, i) => (
            <ProductRow
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onCheck={() => toggleOne(item.id)}
              isLast={i === rows.length - 1}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeleteId(item.id)}
            />
          ))
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex justify-center items-center py-4 border-t border-slate-100">
            <span className="text-[13px] text-slate-500">1 of 1</span>
          </div>
        )}
      </div>

      {/* ── Slide-over ───────────────────────────────────────────────────── */}
      <ProductSlideOver
        slideOver={slideOver}
        onClose={() => setSlideOver(null)}
        onSave={d => {
          if (slideOver.mode === 'create') createMut.mutate(d)
          else updateMut.mutate({ id: slideOver.item.id, d })
        }}
        saving={createMut.isPending || updateMut.isPending}
      />

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Delete product?</h3>
            <p className="text-[13px] text-slate-500 mb-5">This will permanently remove the product from your list.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Checkbox ──────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
        checked ? 'bg-slate-800 border-slate-800' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

// ── Sortable column header ─────────────────────────────────────────────────

function SortHead({ label, col, sort, onSort, className = '' }) {
  const active = sort.col === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900 transition-colors select-none ${className}`}
    >
      {label}
      <span>
        {active
          ? sort.dir === 'asc'
            ? <ArrowUp size={12} className="text-slate-700" />
            : <ArrowDown size={12} className="text-slate-700" />
          : <ArrowUpDown size={11} className="text-slate-300" />
        }
      </span>
    </button>
  )
}

// ── Product Row ────────────────────────────────────────────────────────────

function ProductRow({ item, checked, onCheck, isLast, onEdit, onDelete }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className={`flex items-center px-5 py-4 transition-colors ${hover ? 'bg-slate-50' : 'bg-white'} ${!isLast ? 'border-b border-slate-100' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Checkbox */}
      <div className="w-8 shrink-0">
        <Checkbox checked={checked} onChange={onCheck} />
      </div>

      {/* Thumbnail + name */}
      <div className="flex-1 flex items-center gap-4 min-w-0 pr-4">
        <ProductThumb url={item.image_url} name={item.name} />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 leading-snug truncate">{item.name}</p>
          {item.sku && (
            <p className="text-[12px] text-slate-400 mt-0.5">SKU:&nbsp;&nbsp;{item.sku}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="w-36 shrink-0">
        <span className="text-[13.5px] text-slate-700">{item.category || <span className="text-slate-300">—</span>}</span>
      </div>

      {/* Supplier */}
      <div className="w-36 shrink-0">
        <span className="text-[13.5px] text-slate-700">{item.supplier || <span className="text-slate-300">—</span>}</span>
      </div>

      {/* Quantity */}
      <div className="w-28 shrink-0 text-right">
        <span className={`text-[13.5px] font-medium ${item.is_low_stock ? 'text-red-500' : 'text-slate-800'}`}>
          {Number(item.stock_qty) % 1 === 0 ? Math.floor(item.stock_qty) : item.stock_qty}
        </span>
      </div>

      {/* Retail price */}
      <div className="w-32 shrink-0 text-right">
        <span className="text-[13.5px] font-medium text-slate-800">{fmt(item.retail_price)}</span>
      </div>

      {/* Hover actions */}
      <div className="w-16 shrink-0 flex justify-end gap-1">
        {hover && (
          <>
            <button onClick={onEdit}   className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><Pencil size={13} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50  transition-colors"><Trash2  size={13} /></button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Product thumbnail ──────────────────────────────────────────────────────

function ProductThumb({ url, name }) {
  if (url) {
    return <img src={url} alt={name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0" />
  }
  return (
    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
      <Package size={20} className="text-slate-300" />
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ search, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Package size={24} className="text-slate-400" />
      </div>
      {search ? (
        <>
          <h3 className="text-[15px] font-bold text-slate-700 mb-1">No products found</h3>
          <p className="text-[13px] text-slate-400">Try a different search term</p>
        </>
      ) : (
        <>
          <h3 className="text-[15px] font-bold text-slate-700 mb-2">No products yet</h3>
          <p className="text-[13px] text-slate-400 max-w-xs leading-relaxed mb-5">
            Add your retail products to track stock and sell to clients.
          </p>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors">
            <Plus size={15} /> Add product
          </button>
        </>
      )}
    </div>
  )
}

// ── Add / Edit slide-over ──────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-300'

function ProductSlideOver({ slideOver, onClose, onSave, saving }) {
  const isOpen = !!slideOver
  const isEdit = slideOver?.mode === 'edit'
  const [form, setForm] = useState({ ...BLANK })

  useEffect(() => {
    if (slideOver) setForm({ ...BLANK, ...slideOver.item })
  }, [slideOver])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      name:               form.name,
      category:           form.category,
      sku:                form.sku,
      supplier:           form.supplier,
      unit:               form.unit || 'each',
      cost_price:         parseFloat(form.cost_price)         || 0,
      retail_price:       parseFloat(form.retail_price)       || 0,
      stock_qty:          parseFloat(form.stock_qty)          || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 5,
    })
  }

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside className={`fixed top-0 right-0 h-full w-[460px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-[17px] font-bold text-slate-800">{isEdit ? 'Edit product' : 'Add product'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form id="prod-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          <Field label="Product name *">
            <input required value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Omnilux Contour" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <input value={form.category} onChange={set('category')} className={inp} placeholder="e.g. Skincare" />
            </Field>
            <Field label="Supplier">
              <input value={form.supplier} onChange={set('supplier')} className={inp} placeholder="e.g. Omnilux" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU / Barcode">
              <input value={form.sku} onChange={set('sku')} className={inp} placeholder="e.g. OMN-12345" />
            </Field>
            <Field label="Unit">
              <select value={form.unit} onChange={set('unit')} className={inp}>
                <option value="each">Each</option>
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="oz">oz</option>
                <option value="pair">Pair</option>
                <option value="pack">Pack</option>
              </select>
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cost price ($)">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                  <input type="number" step="0.01" min="0" value={form.cost_price} onChange={set('cost_price')} className={inp + ' pl-7'} placeholder="0.00" />
                </div>
              </Field>
              <Field label="Retail price ($)">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                  <input type="number" step="0.01" min="0" value={form.retail_price} onChange={set('retail_price')} className={inp + ' pl-7'} placeholder="0.00" />
                </div>
              </Field>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Stock</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current stock">
                <input type="number" step="0.01" min="0" value={form.stock_qty} onChange={set('stock_qty')} className={inp} placeholder="0" />
              </Field>
              <Field label="Low stock alert at">
                <input type="number" step="1" min="0" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} className={inp} placeholder="5" />
              </Field>
            </div>
          </div>

        </form>

        <div className="px-7 py-4 border-t border-slate-100 shrink-0 flex gap-3 bg-white">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="prod-form" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </aside>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}
