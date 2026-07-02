import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp, X, Plus,
  ArrowDown, ArrowUp, ArrowUpDown, Users,
  Upload, GitMerge, FileSpreadsheet, FileText,
  CheckCircle2, AlertCircle, CloudUpload, Loader2
} from 'lucide-react'
import api from '@/lib/api'

// ── Avatar color palette (consistent per first letter) ───────────────────

const LETTER_COLORS = {
  A: '#7C3AED', B: '#0D9488', C: '#0284C7', D: '#2563EB',
  E: '#DB2777', F: '#EA580C', G: '#16A34A', H: '#DC2626',
  I: '#7C3AED', J: '#0D9488', K: '#D97706', L: '#9333EA',
  M: '#0F766E', N: '#1D4ED8', O: '#B45309', P: '#6D28D9',
  Q: '#0E7490', R: '#BE185D', S: '#374151', T: '#065F46',
  U: '#7C2D12', V: '#1E3A5F', W: '#14532D', X: '#4C1D95',
  Y: '#713F12', Z: '#881337',
}

function avatarColor(name = '') {
  const letter = (name || '').trim().toUpperCase()[0] || 'A'
  return LETTER_COLORS[letter] || '#0D9488'
}

// ── Date: "24 May 2026" ────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Clients() {
  const qc = useQueryClient()

  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState({ col: 'created_at', dir: 'desc' })
  const [selected,     setSelected]     = useState(new Set())
  const [slideOver,    setSlideOver]    = useState(null)
  const [avatarModal,  setAvatarModal]  = useState(null)
  const [optionsOpen,  setOptionsOpen]  = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)
  const [mergeOpen,    setMergeOpen]    = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn:  () => api.get(`/clients?q=${encodeURIComponent(search)}`).then(r => r.data),
    keepPreviousData: true,
  })

  const createMut = useMutation({
    mutationFn: d              => api.post('/clients', d),
    onSuccess:  ()             => { qc.invalidateQueries({ queryKey: ['clients'] }); setSlideOver(null) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d })    => api.put(`/clients/${id}`, d),
    onSuccess:  ()             => { qc.invalidateQueries({ queryKey: ['clients'] }); setSlideOver(null) },
  })

  const rows = useMemo(() => {
    return [...clients].sort((a, b) => {
      let av = a[sort.col] ?? '', bv = b[sort.col] ?? ''
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv+'').toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ?  1 : -1
      return 0
    })
  }, [clients, sort])

  function toggleSort(col) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )
  }

  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id))
  function toggleAll() { setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id))) }
  function toggleOne(id) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  return (
    <div className="min-h-full bg-white">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-900">Clients list</h1>
            <span className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {clients.length}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-500 mt-0.5">
            View, add, edit and delete your client's details.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-6">

          {/* Options dropdown */}
          <div className="relative">
            <button
              onClick={() => setOptionsOpen(o => !o)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Options {optionsOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>

            {optionsOpen && (
              <>
                {/* Click-outside overlay */}
                <div className="fixed inset-0 z-20" onClick={() => setOptionsOpen(false)} />
                <div className="absolute right-0 top-11 z-30 w-52 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 py-2 overflow-hidden">

                  <OptionsItem icon={Upload}   label="Import clients" onClick={() => { setOptionsOpen(false); setImportOpen(true) }} />
                  <OptionsItem icon={GitMerge} label="Merge clients"  onClick={() => { setOptionsOpen(false); setMergeOpen(true) }} />

                  <div className="mx-4 my-1.5 border-t border-slate-100" />
                  <p className="px-4 pt-1 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Export</p>

                  <OptionsItem
                    icon={FileSpreadsheet}
                    label="Excel"
                    onClick={() => { exportClients('xlsx', clients); setOptionsOpen(false) }}
                  />
                  <OptionsItem
                    icon={FileText}
                    label="CSV"
                    onClick={() => { exportClients('csv', clients); setOptionsOpen(false) }}
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setSlideOver({ mode: 'create', client: {} })}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative w-[300px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, email or phone"
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
          <ArrowUpDown size={14} /> Created at (newest first)
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)]">

        {/* Column headers */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="w-8 shrink-0">
            <Checkbox checked={allChecked} onChange={toggleAll} />
          </div>
          <SortHead label="Client name"   col="first_name"  sort={sort} onSort={toggleSort} className="flex-1" />
          <SortHead label="Mobile number" col="phone"       sort={sort} onSort={toggleSort} className="w-44" />
          <div className="w-36 text-[12.5px] font-semibold text-slate-600">Reviews</div>
          <SortHead label="Sales"         col="total_spend" sort={sort} onSort={toggleSort} className="w-32" />
          <SortHead label="Created at"    col="created_at"  sort={sort} onSort={toggleSort} className="w-36" />
          <div className="w-4" />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState search={search} onAdd={() => setSlideOver({ mode: 'create', client: {} })} />
        ) : (
          rows.map((c, i) => (
            <ClientRow
              key={c.id}
              client={c}
              checked={selected.has(c.id)}
              onCheck={e => { e.stopPropagation(); toggleOne(c.id) }}
              isLast={i === rows.length - 1}
              onEdit={() => setSlideOver({ mode: 'edit', client: c })}
              onAvatarClick={e => { e.stopPropagation(); setAvatarModal(c) }}
            />
          ))
        )}

        {rows.length > 0 && (
          <div className="flex justify-center items-center py-4 border-t border-slate-100">
            <span className="text-[13px] text-slate-500">
              {rows.length} client{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Slide-over ───────────────────────────────────────────────────── */}
      <ClientSlideOver
        slideOver={slideOver}
        onClose={() => setSlideOver(null)}
        onSave={d => {
          if (slideOver.mode === 'create') createMut.mutate(d)
          else updateMut.mutate({ id: slideOver.client.id, d })
        }}
        saving={createMut.isPending || updateMut.isPending}
      />

      {/* ── Avatar zoom modal ────────────────────────────────────────────── */}
      {avatarModal && <AvatarModal client={avatarModal} onClose={() => setAvatarModal(null)} />}

      {/* ── Import modal ─────────────────────────────────────────────────── */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); qc.invalidateQueries({ queryKey: ['clients'] }) }}
        />
      )}

      {/* ── Merge modal ──────────────────────────────────────────────────── */}
      {mergeOpen && (
        <MergeModal
          onClose={() => setMergeOpen(false)}
          onDone={() => { setMergeOpen(false); qc.invalidateQueries({ queryKey: ['clients'] }) }}
        />
      )}
    </div>
  )
}

// ── Options dropdown helpers ──────────────────────────────────────────────

function OptionsItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors"
    >
      <Icon size={15} className="text-slate-400 shrink-0" />
      {label}
    </button>
  )
}

function exportClients(format, clients) {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Total Spend', 'Total Visits', 'Created At']
  const rows = clients.map(c => [
    c.first_name, c.last_name, c.email, c.phone,
    c.total_spend, c.total_visits,
    new Date(c.created_at).toLocaleDateString('en-GB'),
  ])

  if (format === 'csv') {
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    downloadFile(csv, 'clients.csv', 'text/csv')
  } else {
    // Simple TSV wrapped as xls
    const tsv = [headers, ...rows].map(r => r.join('\t')).join('\n')
    downloadFile(tsv, 'clients.xls', 'application/vnd.ms-excel')
  }
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
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

// ── Sort header ───────────────────────────────────────────────────────────

function SortHead({ label, col, sort, onSort, className = '' }) {
  const active = sort.col === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900 transition-colors select-none ${className}`}
    >
      {label}
      {active
        ? sort.dir === 'asc'
          ? <ArrowUp   size={12} className="text-slate-700" />
          : <ArrowDown size={12} className="text-slate-700" />
        : <ArrowUpDown size={11} className="text-slate-300" />
      }
    </button>
  )
}

// ── Client Row ────────────────────────────────────────────────────────────

function ClientRow({ client: c, checked, onCheck, isLast, onEdit, onAvatarClick }) {
  const [hover, setHover] = useState(false)
  const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim()
  const color    = avatarColor(c.first_name)
  const initial  = (c.first_name?.[0] || '').toUpperCase()

  return (
    <div
      className={`flex items-center px-5 py-4 cursor-pointer transition-colors bg-white ${!isLast ? 'border-b border-slate-100' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onEdit}
    >
      {/* Checkbox */}
      <div className="w-8 shrink-0" onClick={onCheck}>
        <Checkbox checked={checked} onChange={onCheck} />
      </div>

      {/* Avatar + name */}
      <div className="flex-1 flex items-center gap-3.5 min-w-0 pr-4">
        <div
          onClick={onAvatarClick}
          title="Click to enlarge"
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[15px] select-none cursor-zoom-in hover:scale-110 hover:shadow-lg transition-transform duration-150"
          style={{ background: color }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 leading-snug truncate">{fullName}</p>
          {c.email && <p className="text-[12px] text-slate-400 mt-0.5 truncate">{c.email}</p>}
        </div>
      </div>

      {/* Phone */}
      <div className="w-44 shrink-0">
        <span className="text-[13.5px] text-slate-700">{c.phone || <span className="text-slate-300">—</span>}</span>
      </div>

      {/* Reviews */}
      <div className="w-36 shrink-0">
        <span className="text-[13.5px] text-slate-300">—</span>
      </div>

      {/* Sales */}
      <div className="w-32 shrink-0">
        <span className="text-[13.5px] font-medium text-slate-800">
          US$ {parseFloat(c.total_spend || 0).toFixed(0)}
        </span>
      </div>

      {/* Created at */}
      <div className="w-36 shrink-0">
        <span className="text-[13.5px] text-slate-700">{fmtDate(c.created_at)}</span>
      </div>

      <div className="w-4" />
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ search, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Users size={24} className="text-slate-400" />
      </div>
      {search ? (
        <>
          <h3 className="text-[15px] font-bold text-slate-700 mb-1">No clients found</h3>
          <p className="text-[13px] text-slate-400">Try a different name, email or phone number</p>
        </>
      ) : (
        <>
          <h3 className="text-[15px] font-bold text-slate-700 mb-2">No clients yet</h3>
          <p className="text-[13px] text-slate-400 max-w-xs leading-relaxed mb-5">
            Add your first client to start managing appointments and sales.
          </p>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-semibold hover:bg-slate-800 transition-colors">
            <Plus size={15} /> Add client
          </button>
        </>
      )}
    </div>
  )
}

// ── Add / Edit Slide-over ─────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-300'

const BLANK = { first_name: '', last_name: '', email: '', phone: '', gender: '', notes: '', sms_consent: false }

function ClientSlideOver({ slideOver, onClose, onSave, saving }) {
  const isOpen = !!slideOver
  const isEdit = slideOver?.mode === 'edit'
  const [form, setForm] = useState({ ...BLANK })

  useEffect(() => {
    if (slideOver) setForm({ ...BLANK, ...slideOver.client })
  }, [slideOver])

  const set  = k => e  => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, gender: form.gender, notes: form.notes, sms_consent: form.sms_consent })
  }

  const color   = avatarColor(form.first_name)
  const initial = (form.first_name?.[0] || '').toUpperCase()

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside className={`fixed top-0 right-0 h-full w-[460px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-[17px] font-bold text-slate-800">{isEdit ? 'Edit client' : 'New client'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form id="client-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          {/* Avatar preview */}
          {(form.first_name || form.last_name) && (
            <div className="flex justify-center pb-1">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-[22px] shadow-md"
                style={{ background: color }}
              >
                {initial}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name *">
              <input required value={form.first_name} onChange={set('first_name')} className={inp} placeholder="e.g. Andrea" />
            </Field>
            <Field label="Last name *">
              <input required value={form.last_name} onChange={set('last_name')} className={inp} placeholder="e.g. Santoyo" />
            </Field>
          </div>

          <Field label="Email address">
            <input type="email" value={form.email} onChange={set('email')} className={inp} placeholder="email@example.com" />
          </Field>

          <Field label="Mobile number">
            <input type="tel" value={form.phone} onChange={set('phone')} className={inp} placeholder="+1 (323) 000-0000" />
          </Field>

          <Field label="Gender">
            <div className="flex gap-2">
              {[['', 'Any'], ['female', 'Female'], ['male', 'Male']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => setForm(f => ({ ...f, gender: v }))}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                    form.gender === v ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={set('notes')} rows={3} className={inp + ' resize-none'} placeholder="Any notes about this client…" />
          </Field>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, sms_consent: !f.sms_consent }))}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.sms_consent ? 'bg-[#0D9488]' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.sms_consent ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-slate-700">SMS marketing consent</p>
                <p className="text-[12px] text-slate-400">Client agrees to receive SMS promotions</p>
              </div>
            </label>
          </div>

        </form>

        <div className="px-7 py-4 border-t border-slate-100 shrink-0 flex gap-3 bg-white">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="client-form" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </aside>
    </>
  )
}

// ── CSV / Excel parser ────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else cur += ch
  }
  result.push(cur.trim())
  return result
}

const HEADER_MAP = {
  'first name': 'first_name', 'firstname': 'first_name', 'first_name': 'first_name', 'given name': 'first_name',
  'last name': 'last_name', 'lastname': 'last_name', 'last_name': 'last_name', 'surname': 'last_name', 'family name': 'last_name',
  'email': 'email', 'email address': 'email', 'e-mail': 'email',
  'phone': 'phone', 'mobile': 'phone', 'mobile number': 'phone', 'phone number': 'phone', 'cell': 'phone', 'telephone': 'phone',
  'gender': 'gender', 'sex': 'gender',
  'notes': 'notes', 'note': 'notes', 'comments': 'notes',
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const rawHeaders = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, '').trim())
  const fieldKeys   = rawHeaders.map(h => HEADER_MAP[h] || null)
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line)
    const obj  = {}
    fieldKeys.forEach((key, i) => { if (key) obj[key] = (vals[i] || '').replace(/^"|"$/g, '').trim() })
    return obj
  }).filter(r => r.first_name || r.email || r.phone)
}

// ── Import Modal ──────────────────────────────────────────────────────────

function ImportModal({ onClose, onDone }) {
  const [step,     setStep]     = useState('upload') // upload | preview | importing | done
  const [rows,     setRows]     = useState([])
  const [progress, setProgress] = useState({ done: 0, failed: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      if (parsed.length === 0) { alert('No recognisable client rows found. Ensure your CSV has headers like First Name, Last Name, Email, Phone.'); return }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setStep('importing')
    setProgress({ done: 0, failed: 0, total: rows.length })
    let done = 0, failed = 0
    for (const row of rows) {
      try {
        await api.post('/clients', {
          first_name: row.first_name || '',
          last_name:  row.last_name  || '',
          email:      row.email      || '',
          phone:      row.phone      || '',
          gender:     row.gender     || '',
          notes:      row.notes      || '',
          sms_consent: false,
        })
        done++
      } catch { failed++ }
      setProgress({ done, failed, total: rows.length })
    }
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-[17px] font-bold text-slate-800">Import clients</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><X size={16}/></button>
        </div>

        {/* Step: upload */}
        {step === 'upload' && (
          <div className="p-6 space-y-5">
            <p className="text-[13.5px] text-slate-500 leading-relaxed">
              Upload a <strong className="text-slate-700">CSV</strong> file with columns: <code className="bg-slate-100 px-1 rounded text-[12px]">First Name</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Last Name</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Email</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Phone</code>
            </p>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver ? 'border-[#0D9488] bg-[#F0FDFA]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CloudUpload size={36} className={dragOver ? 'text-[#0D9488]' : 'text-slate-300'} />
              <div className="text-center">
                <p className="text-[14px] font-semibold text-slate-700">Drop your CSV file here</p>
                <p className="text-[13px] text-slate-400 mt-0.5">or click to browse</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files[0])} />

            {/* Download template */}
            <button
              onClick={() => downloadFile('First Name,Last Name,Email,Phone,Gender,Notes\nJane,Doe,jane@example.com,+1 310 000 0000,female,VIP client', 'clients-template.csv', 'text/csv')}
              className="flex items-center gap-2 text-[13px] text-[#0D9488] hover:underline font-medium"
            >
              <FileText size={14}/> Download CSV template
            </button>

            <div className="flex justify-end">
              <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && (
          <div className="p-6 space-y-4">
            <p className="text-[13.5px] text-slate-600">
              Found <strong className="text-slate-900">{rows.length} client{rows.length !== 1 ? 's' : ''}</strong> ready to import. Preview of first 5:
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[12.5px]">
              <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 font-semibold text-slate-500 border-b border-slate-200">
                <span>First name</span><span>Last name</span><span>Email</span><span>Phone</span>
              </div>
              {rows.slice(0, 5).map((r, i) => (
                <div key={i} className={`grid grid-cols-4 px-4 py-2.5 text-slate-700 ${i < 4 ? 'border-b border-slate-100' : ''}`}>
                  <span className="truncate">{r.first_name || <span className="text-slate-300">—</span>}</span>
                  <span className="truncate">{r.last_name  || <span className="text-slate-300">—</span>}</span>
                  <span className="truncate">{r.email      || <span className="text-slate-300">—</span>}</span>
                  <span className="truncate">{r.phone      || <span className="text-slate-300">—</span>}</span>
                </div>
              ))}
              {rows.length > 5 && (
                <div className="px-4 py-2 bg-slate-50 text-slate-400 text-[12px]">+ {rows.length - 5} more…</div>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep('upload')} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={runImport}                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-bold hover:bg-slate-800">
                Import {rows.length} client{rows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Step: importing */}
        {step === 'importing' && (
          <div className="p-10 flex flex-col items-center gap-5">
            <Loader2 size={40} className="text-[#0D9488] animate-spin" />
            <div className="text-center">
              <p className="text-[15px] font-bold text-slate-800">Importing clients…</p>
              <p className="text-[13px] text-slate-500 mt-1">{progress.done} of {progress.total} done</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-[#0D9488] rounded-full transition-all duration-300"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={48} className="text-[#0D9488]" />
            <div>
              <p className="text-[16px] font-bold text-slate-800">Import complete!</p>
              <p className="text-[13.5px] text-slate-500 mt-1">
                {progress.done} imported successfully{progress.failed > 0 ? `, ${progress.failed} failed` : ''}
              </p>
            </div>
            <button onClick={onDone} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-bold hover:bg-slate-800">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Merge Modal ───────────────────────────────────────────────────────────

function MergeModal({ onClose, onDone }) {
  const [primaryQ,   setPrimaryQ]   = useState('')
  const [secondaryQ, setSecondaryQ] = useState('')
  const [primary,    setPrimary]    = useState(null)
  const [secondary,  setSecondary]  = useState(null)
  const [merging,    setMerging]    = useState(false)
  const [done,       setDone]       = useState(false)

  const { data: primaryResults   = [] } = useQuery({
    queryKey: ['clients-search', primaryQ],
    queryFn:  () => primaryQ.trim().length >= 2 ? api.get(`/clients?q=${encodeURIComponent(primaryQ)}`).then(r => r.data.slice(0, 6)) : Promise.resolve([]),
    enabled:  primaryQ.trim().length >= 2,
  })
  const { data: secondaryResults = [] } = useQuery({
    queryKey: ['clients-search', secondaryQ],
    queryFn:  () => secondaryQ.trim().length >= 2 ? api.get(`/clients?q=${encodeURIComponent(secondaryQ)}`).then(r => r.data.slice(0, 6)) : Promise.resolve([]),
    enabled:  secondaryQ.trim().length >= 2,
  })

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  async function doMerge() {
    if (!primary || !secondary) return
    setMerging(true)
    try {
      await api.post('/clients/merge', { primary_id: primary.id, secondary_id: secondary.id })
      setDone(true)
    } catch (err) {
      alert(err?.response?.data?.error || 'Merge failed')
    } finally { setMerging(false) }
  }

  const canMerge = primary && secondary && primary.id !== secondary.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">Merge clients</h2>
            <p className="text-[12.5px] text-slate-400 mt-0.5">The primary client is kept. The secondary client's data and history are merged in, then removed.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors ml-4 shrink-0"><X size={16}/></button>
        </div>

        {done ? (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={48} className="text-[#0D9488]" />
            <div>
              <p className="text-[16px] font-bold text-slate-800">Clients merged!</p>
              <p className="text-[13.5px] text-slate-500 mt-1">All history has been consolidated into {primary.first_name} {primary.last_name}.</p>
            </div>
            <button onClick={onDone} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-bold hover:bg-slate-800">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-5">

            <div className="grid grid-cols-2 gap-4">

              {/* Primary picker */}
              <ClientPicker
                label="Keep (primary)"
                accent="#0D9488"
                query={primaryQ}
                onQuery={v => { setPrimaryQ(v); setPrimary(null) }}
                results={primaryResults.filter(r => !secondary || r.id !== secondary.id)}
                selected={primary}
                onSelect={c => { setPrimary(c); setPrimaryQ('') }}
                onClear={() => setPrimary(null)}
              />

              {/* Secondary picker */}
              <ClientPicker
                label="Remove (secondary)"
                accent="#EF4444"
                query={secondaryQ}
                onQuery={v => { setSecondaryQ(v); setSecondary(null) }}
                results={secondaryResults.filter(r => !primary || r.id !== primary.id)}
                selected={secondary}
                onSelect={c => { setSecondary(c); setSecondaryQ('') }}
                onClear={() => setSecondary(null)}
              />
            </div>

            {/* Comparison */}
            {primary && secondary && (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-[12.5px]">
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 font-semibold text-slate-500 border-b border-slate-200 text-[11.5px] uppercase tracking-wide">
                  <span>Field</span><span className="text-[#0D9488]">Keep (primary)</span><span className="text-red-500">Remove (secondary)</span>
                </div>
                {[
                  ['Name',      `${primary.first_name} ${primary.last_name}`,   `${secondary.first_name} ${secondary.last_name}`],
                  ['Email',     primary.email  || '—', secondary.email  || '—'],
                  ['Phone',     primary.phone  || '—', secondary.phone  || '—'],
                  ['Total spend', `$${parseFloat(primary.total_spend||0).toFixed(2)}`, `$${parseFloat(secondary.total_spend||0).toFixed(2)}`],
                  ['Visits',    primary.total_visits || 0, secondary.total_visits || 0],
                  ['Loyalty pts', primary.loyalty_points || 0, secondary.loyalty_points || 0],
                ].map(([field, pv, sv]) => (
                  <div key={field} className="grid grid-cols-3 px-4 py-2.5 border-b border-slate-100 last:border-0 text-slate-700">
                    <span className="font-medium text-slate-500">{field}</span>
                    <span className="font-semibold text-slate-800">{pv}</span>
                    <span className="text-slate-500 line-through decoration-red-300">{sv}</span>
                  </div>
                ))}
                <div className="px-4 py-2.5 bg-amber-50 text-amber-700 text-[12px] font-medium">
                  ⚠ Totals (spend, visits, loyalty) will be <strong>added together</strong> on the primary client.
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={doMerge}
                disabled={!canMerge || merging}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[13.5px] font-bold hover:bg-red-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {merging ? <><Loader2 size={15} className="animate-spin"/>Merging…</> : 'Merge clients'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ClientPicker({ label, accent, query, onQuery, results, selected, onSelect, onClear }) {
  const color = avatarColor(selected?.first_name)
  return (
    <div className="space-y-2">
      <p className="text-[11.5px] font-bold uppercase tracking-wide" style={{ color: accent }}>{label}</p>

      {selected ? (
        <div className="flex items-center gap-3 p-3 border-2 rounded-xl" style={{ borderColor: accent + '40', background: accent + '08' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[14px] shrink-0" style={{ background: color }}>
            {(selected.first_name?.[0] || '').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{selected.first_name} {selected.last_name}</p>
            <p className="text-[11.5px] text-slate-400 truncate">{selected.email || selected.phone || '—'}</p>
          </div>
          <button onClick={onClear} className="text-slate-300 hover:text-slate-500 shrink-0"><X size={14}/></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            value={query}
            onChange={e => onQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {results.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ background: avatarColor(c.first_name) }}>
                    {(c.first_name?.[0] || '').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{c.email || c.phone || '—'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Avatar Zoom Modal ─────────────────────────────────────────────────────

function AvatarModal({ client: c, onClose }) {
  const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim()
  const color    = avatarColor(c.first_name)
  const initial  = (c.first_name?.[0] || '').toUpperCase()

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4 select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Large avatar */}
        <div
          className="w-40 h-40 rounded-full flex items-center justify-center text-white font-black text-[64px] shadow-2xl ring-4 ring-white/20"
          style={{ background: color }}
        >
          {initial}
        </div>

        {/* Name + email */}
        <div className="text-center">
          <p className="text-[20px] font-bold text-white">{fullName}</p>
          {c.email && <p className="text-[14px] text-white/60 mt-0.5">{c.email}</p>}
          {c.phone && <p className="text-[14px] text-white/60 mt-0.5">{c.phone}</p>}
        </div>

        {/* Dismiss hint */}
        <p className="text-[12px] text-white/30 mt-1">Click anywhere to close</p>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}
