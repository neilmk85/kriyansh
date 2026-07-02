import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, X, Search, Check,
  MoreHorizontal, Scissors, SlidersHorizontal,
  ChevronDown, ArrowUpDown
} from 'lucide-react'
import api from '@/lib/api'

// ── Constants ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#0D9488', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#EF4444', '#10B981', '#F97316', '#6366F1', '#14B8A6',
]

const TREATMENT_TYPES = [
  'Hair Color', 'Haircut & Styling', 'Hair Treatment',
  'Nail Care', 'Facial', 'Massage', 'Waxing',
  'Eyebrows & Lashes', 'Makeup', 'Other',
]

const DURATION_OPTIONS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
  75, 90, 105, 120, 150, 180,
]

const BLANK = {
  name: '', category_id: '', treatment_type: '', description: '',
  price_type: 'fixed', price: '', duration_min: 60,
  deposit_amt: '', gender: 'any',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function lighten(hex, amt = 60) {
  const n = parseInt((hex || '#0D9488').replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + amt)
  const g = Math.min(255, ((n >> 8) & 0xff) + amt)
  const b = Math.min(255, (n & 0xff) + amt)
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function fmtDuration(min) {
  if (min < 60) return `${min} mins`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} hr, ${m} mins` : `${h} hr`
}

function fmtPrice(s) {
  if (s.price_type === 'free') return 'Free'
  const p = `US$ ${parseFloat(s.price || 0).toFixed(0)}`
  return s.price_type === 'from' ? `From ${p}` : p
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Services() {
  const qc = useQueryClient()

  const [selectedCatId, setSelectedCatId] = useState(null) // null = All
  const [search,        setSearch]        = useState('')
  const [slideOver,     setSlideOver]     = useState(null)
  const [showAddCat,    setShowAddCat]    = useState(false)
  const [editingCat,    setEditingCat]    = useState(null)
  const [openMenuId,    setOpenMenuId]    = useState(null)

  const { data: services   = [] } = useQuery({ queryKey: ['services'],   queryFn: () => api.get('/services').then(r => r.data)   })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })

  const deleteSvc = useMutation({
    mutationFn: id => api.delete(`/services/${id}`),
    onSuccess:  ()  => qc.invalidateQueries({ queryKey: ['services'] }),
  })

  const active = services.filter(s => s.is_active)

  const filtered = active.filter(s => {
    const q = search.toLowerCase()
    return (!q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q))
      && (selectedCatId === null || s.category_id === selectedCatId)
  })

  const catById = Object.fromEntries(categories.map(c => [c.id, c]))

  const catList = selectedCatId !== null
    ? categories.filter(c => c.id === selectedCatId)
    : categories

  const groups = [
    ...catList.map(cat => ({ key: `c-${cat.id}`, cat, items: filtered.filter(s => s.category_id === cat.id) })),
    ...(filtered.filter(s => !s.category_id).length > 0
      ? [{ key: 'uncat', cat: null, items: filtered.filter(s => !s.category_id) }]
      : [])
  ].filter(g => g.items.length > 0)

  useEffect(() => {
    const fn = () => setOpenMenuId(null)
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  const openCreate = () => setSlideOver({ mode: 'create', service: { ...BLANK } })
  const openEdit   = s  => setSlideOver({ mode: 'edit',   service: { ...BLANK, ...s, price_type: s.price_type || 'fixed' } })

  return (
    <div className="min-h-full bg-white">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-tight">Service menu</h1>
          <p className="text-[13.5px] text-slate-500 mt-0.5">
            View and manage the services offered by your business.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-6">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Options <ChevronDown size={14} className="text-slate-400" />
          </button>
          <button
            onClick={() => setShowAddCat(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Plus size={14} /> Category
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus size={14} /> Service
          </button>
        </div>
      </div>

      {/* ── Search + Filter bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative w-[260px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search service name"
            className="w-full pl-9 pr-4 py-2 text-[13.5px] border border-slate-200 rounded-xl outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-400"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <SlidersHorizontal size={14} /> Filters
        </button>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-[13.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowUpDown size={14} /> Manage order
        </button>
      </div>

      {/* ── Two-column content ────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Categories Panel ─────────────────────────────────────────────── */}
        <div className="w-[280px] shrink-0 border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-[14px] font-bold text-slate-800">Categories</h2>
          </div>

          <div className="py-1.5">
            {/* All categories */}
            <CatRow
              label="All categories"
              count={active.length}
              active={selectedCatId === null}
              onClick={() => setSelectedCatId(null)}
            />

            {categories.map(cat => (
              <CatRow
                key={cat.id}
                label={cat.name}
                count={active.filter(s => s.category_id === cat.id).length}
                active={selectedCatId === cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                onEdit={e => { e.stopPropagation(); setEditingCat({ ...cat }) }}
                onDelete={e => {
                  e.stopPropagation()
                  if (!confirm(`Delete "${cat.name}"?`)) return
                  api.delete(`/categories/${cat.id}`).then(() => {
                    qc.invalidateQueries({ queryKey: ['categories'] })
                    qc.invalidateQueries({ queryKey: ['services'] })
                    if (selectedCatId === cat.id) setSelectedCatId(null)
                  })
                }}
              />
            ))}
          </div>

          {/* Add / edit category inline */}
          <div className="px-3 py-2 border-t border-slate-100">
            {editingCat ? (
              <InlineCatForm
                initial={editingCat}
                onSave={d => api.put(`/categories/${editingCat.id}`, d).then(() => {
                  qc.invalidateQueries({ queryKey: ['categories'] }); setEditingCat(null)
                })}
                onCancel={() => setEditingCat(null)}
              />
            ) : showAddCat ? (
              <InlineCatForm
                initial={{ name: '', color: PRESET_COLORS[0] }}
                onSave={d => api.post('/categories', d).then(() => {
                  qc.invalidateQueries({ queryKey: ['categories'] }); setShowAddCat(false)
                })}
                onCancel={() => setShowAddCat(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddCat(true)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12.5px] text-slate-400 hover:text-[#0D9488] hover:bg-slate-50 transition-colors font-medium"
              >
                <Plus size={13} /> Add category
              </button>
            )}
          </div>
        </div>

        {/* ── Services List ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
          {active.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : groups.length === 0 ? (
            <div className="border border-slate-200 rounded-2xl py-16 text-center text-slate-400">
              <Search size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[13px]">No services match your search</p>
            </div>
          ) : (
            groups.map(({ key, cat, items }) => (
              <ServiceGroup
                key={key}
                cat={cat}
                items={items}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onEdit={openEdit}
                onDelete={id => deleteSvc.mutate(id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Slide-over ───────────────────────────────────────────────────── */}
      <ServiceSlideOver
        slideOver={slideOver}
        categories={categories}
        onClose={() => setSlideOver(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['services'] }); setSlideOver(null) }}
      />
    </div>
  )
}

// ── Category row ──────────────────────────────────────────────────────────

function CatRow({ label, count, active, onClick, onEdit, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className={`flex items-center px-4 py-2.5 cursor-pointer select-none transition-colors group ${
        active ? 'bg-[#EEF2FF]' : 'hover:bg-slate-50'
      }`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className={`flex-1 text-[13.5px] font-medium truncate ${active ? 'text-[#4F46E5]' : 'text-slate-700'}`}>
        {label}
      </span>

      {/* Count — hide on hover if editable */}
      {(!hover || !onEdit) && (
        <span className={`text-[13px] tabular-nums ${active ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
          {count}
        </span>
      )}

      {hover && onEdit && (
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit}   className="p-1 rounded text-slate-400 hover:text-[#0D9488] hover:bg-white transition-colors"><Pencil size={11}/></button>
          <button onClick={onDelete} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white transition-colors"><Trash2 size={11}/></button>
        </div>
      )}
    </div>
  )
}

// ── Service Group (category section) ──────────────────────────────────────

function ServiceGroup({ cat, items, openMenuId, setOpenMenuId, onEdit, onDelete }) {
  const label = cat?.name || 'Uncategorized'
  const color = cat?.color || '#0D9488'
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const fn = () => setMenuOpen(false)
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [menuOpen])

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-bold text-slate-900">{label}</h2>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Actions <ChevronDown size={13} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 z-30 py-1 w-44">
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                <Plus size={13} className="text-slate-400" /> Add service here
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Service rows */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        {items.map((s, i) => (
          <ServiceRow
            key={s.id}
            service={s}
            accentColor={color}
            isLast={i === items.length - 1}
            menuOpen={openMenuId === s.id}
            onMenuToggle={e => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id) }}
            onEdit={() => { setOpenMenuId(null); onEdit(s) }}
            onDelete={() => { setOpenMenuId(null); onDelete(s.id) }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Service Row ────────────────────────────────────────────────────────────

function ServiceRow({ service: s, accentColor, isLast, menuOpen, onMenuToggle, onEdit, onDelete }) {
  return (
    <div className={`flex items-stretch bg-white hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}>

      {/* Left accent bar — lighter shade */}
      <div className="w-1 shrink-0" style={{ background: lighten(accentColor, 80) }} />

      {/* Content */}
      <div className="flex-1 flex items-center px-4 py-3.5 gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 leading-snug">{s.name}</p>
          <p className="text-[12.5px] text-slate-500 mt-0.5">{fmtDuration(s.duration_min)}</p>
          {s.description && (
            <p className="text-[12.5px] text-slate-400 mt-0.5 truncate">{s.description}</p>
          )}
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <span className={`text-[14px] font-semibold ${s.price_type === 'free' ? 'text-slate-400' : 'text-slate-900'}`}>
            {fmtPrice(s)}
          </span>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0">
          <button
            onClick={onMenuToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 z-30 py-1 w-36">
              <button onClick={onEdit}   className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                <Pencil size={13} className="text-slate-400" /> Edit
              </button>
              <button onClick={onDelete} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Scissors size={24} className="text-slate-400" />
      </div>
      <h3 className="text-[16px] font-bold text-slate-700 mb-2">No services yet</h3>
      <p className="text-[13.5px] text-slate-400 max-w-xs leading-relaxed mb-5">
        Add your first service to start taking bookings.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors"
      >
        <Plus size={15} /> Add service
      </button>
    </div>
  )
}

// ── Inline Category Form ───────────────────────────────────────────────────

function InlineCatForm({ initial, onSave, onCancel }) {
  const [name,  setName]  = useState(initial.name  || '')
  const [color, setColor] = useState(initial.color || PRESET_COLORS[0])
  const ref = useRef(null)
  useEffect(() => ref.current?.focus(), [])

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-sm">
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), color }) }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Category name"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] transition-all"
      />
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform shrink-0"
            style={{ background: c }}
          >
            {color === c && <Check size={9} className="text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button onClick={onCancel} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
        <button onClick={() => { if (name.trim()) onSave({ name: name.trim(), color }) }} className="flex-1 py-1.5 rounded-lg text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[12px] font-semibold ">Save</button>
      </div>
    </div>
  )
}

// ── Slide-over form ────────────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-300'

function ServiceSlideOver({ slideOver, categories, onClose, onSaved }) {
  const isOpen = !!slideOver
  const isEdit = slideOver?.mode === 'edit'
  const [form,   setForm]   = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (slideOver) setForm({ ...BLANK, ...slideOver.service })
  }, [slideOver])

  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setV = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name:         form.name,
        description:  form.description,
        category_id:  form.category_id ? +form.category_id : null,
        duration_min: +form.duration_min,
        price:        form.price_type === 'free' ? 0 : +form.price,
        deposit_amt:  form.deposit_amt ? +form.deposit_amt : 0,
        gender:       form.gender,
        price_type:   form.price_type,
        is_active:    true,
      }
      if (isEdit) await api.put(`/services/${slideOver.service.id}`, payload)
      else        await api.post('/services', payload)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside className={`fixed top-0 right-0 h-full w-[440px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-[17px] font-bold text-slate-800">{isEdit ? 'Edit service' : 'New service'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form id="svc-form" onSubmit={submit} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          <Field label="Treatment name *">
            <input required value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Balayage" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Menu category">
              <select value={form.category_id} onChange={set('category_id')} className={inp}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Treatment type">
              <select value={form.treatment_type} onChange={set('treatment_type')} className={inp}>
                <option value="">Select…</option>
                {TREATMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} rows={3} className={inp + ' resize-none'} placeholder="Brief description…" />
          </Field>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pricing &amp; Duration</p>

            <Field label="Price type">
              <div className="flex gap-2">
                {['fixed', 'from', 'free'].map(v => (
                  <button key={v} type="button" onClick={() => setV('price_type', v)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold capitalize border-2 transition-all ${
                      form.price_type === v ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {form.price_type !== 'free' && (
                <Field label={form.price_type === 'from' ? 'Starting from ($)' : 'Price ($)'}>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                    <input type="number" step="0.01" min="0" required value={form.price} onChange={set('price')} className={inp + ' pl-7'} placeholder="0.00" />
                  </div>
                </Field>
              )}
              <Field label="Duration">
                <select value={form.duration_min} onChange={set('duration_min')} className={inp}>
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{fmtDuration(d)}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Additional options</p>

            <Field label="Deposit ($)  —  optional">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                <input type="number" step="0.01" min="0" value={form.deposit_amt} onChange={set('deposit_amt')} className={inp + ' pl-7'} placeholder="0.00" />
              </div>
            </Field>

            <div className="mt-4">
              <Field label="Suitable for">
                <div className="flex gap-2">
                  {[['any', 'Everyone'], ['female', 'Women'], ['male', 'Men']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setV('gender', v)}
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                        form.gender === v ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        </form>

        <div className="px-7 py-4 border-t border-slate-100 shrink-0 flex gap-3 bg-white">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="svc-form" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add service'}
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
