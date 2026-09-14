import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  X, Plus, ArrowDown, ArrowUp, ArrowUpDown, Users,
  Upload, GitMerge, FileSpreadsheet, FileText,
  CheckCircle2, AlertCircle, CloudUpload, Loader2,
  Pencil, Phone, Mail, Star, Calendar, ShoppingBag,
  Clock, MessageSquare, StickyNote,
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
                    label="All clients (CSV)"
                    onClick={() => { exportAllClients(); setOptionsOpen(false) }}
                  />
                  {selected.size > 0 && (
                    <OptionsItem
                      icon={FileText}
                      label={`Selected (${selected.size})`}
                      onClick={() => { exportClients(rows.filter(r => selected.has(r.id))); setOptionsOpen(false) }}
                    />
                  )}
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

      {/* ── 3-Layer Drawer ───────────────────────────────────────────────── */}
      <ClientDrawer
        slideOver={slideOver}
        onClose={() => setSlideOver(null)}
        onSave={d => {
          if (slideOver.mode === 'create') createMut.mutate(d)
          else updateMut.mutate({ id: slideOver.client.id, d })
        }}
        saving={createMut.isPending || updateMut.isPending}
        onAvatarExpand={c => setAvatarModal(c)}
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

// Full server-side export (all clients, all fields)
async function exportAllClients() {
  const token = localStorage.getItem('salonos_token')
  const res = await fetch('/api/v1/clients/export', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) { alert('Export failed'); return }
  const blob = await res.blob()
  downloadFile(blob, 'clients.csv', 'text/csv', true)
}

// Client-side export of the currently-visible (or selected) rows
function exportClients(subset) {
  const headers = [
    'First Name', 'Last Name', 'Email', 'Phone', 'Gender',
    'Total Spend', 'Total Visits', 'Loyalty Points', 'SMS Consent', 'Created At',
  ]
  const rows = subset.map(c => [
    c.first_name ?? '', c.last_name ?? '', c.email ?? '', c.phone ?? '',
    c.gender ?? '',
    c.total_spend ?? 0, c.total_visits ?? 0, c.loyalty_points ?? 0,
    c.sms_consent ? 'yes' : 'no',
    c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadFile(csv, 'clients.csv', 'text/csv')
}

function downloadFile(content, filename, mime, isBlob = false) {
  const blob = isBlob ? content : new Blob([content], { type: mime })
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
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[15px] select-none cursor-zoom-in hover:scale-110 hover:shadow-lg transition-transform duration-150 overflow-hidden"
          style={!c.avatar_url ? { background: color } : {}}
        >
          {c.avatar_url
            ? <img src={c.avatar_url} alt={fullName} className="w-full h-full object-cover" />
            : initial
          }
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

// ── Helpers ──────────────────────────────────────────────────────────────

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white placeholder:text-slate-300'
const BLANK = { first_name: '', last_name: '', email: '', phone: '', gender: '', notes: '', sms_consent: false, date_of_birth: '', anniversary: '', preferences: '', staff_alert: '', tags: '' }

function memberSince(iso) {
  if (!iso) return '—'
  const months = Math.max(0, Math.round((Date.now() - new Date(iso)) / (1000 * 60 * 60 * 24 * 30)))
  if (months < 1) return 'This month'
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}yr`
}

// ── 3-Layer Client Drawer ─────────────────────────────────────────────────

const EASE = 'ease-[cubic-bezier(.32,.72,0,1)]'

function ClientDrawer({ slideOver, onClose, onSave, saving, onAvatarExpand }) {
  const isOpen   = !!slideOver
  const isCreate = slideOver?.mode === 'create'
  const [layer2, setLayer2] = useState(null)
  const [layer3, setLayer3] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => { setLayer2(null); setLayer3(null) }, 350)
      return () => clearTimeout(t)
    }
    setLayer2(isCreate ? 'edit' : 'appointments')
    setLayer3(null)
  }, [slideOver?.client?.id, isOpen, isCreate])

  const l2Open = !!layer2
  const l3Open = !!layer3

  function handleBack1() { setLayer2(null); setLayer3(null) }
  function handleBack2() { setLayer3(null) }

  // All panels live in one flex-row container that slides in from the right.
  // Each panel expands/collapses via animated width so all visible panels
  // are always fully shown side-by-side.
  const W = 480

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Side-by-side panel container */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex shadow-2xl transition-transform duration-300 ${EASE}`}
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* ── Layer 1: Client Overview ── */}
        <aside
          className="h-full bg-[#F8F9FA] flex flex-col border-r border-slate-200/80 shrink-0"
          style={{ width: W }}
        >
          {isOpen && (
            <ClientOverview
              client={slideOver.client}
              isCreate={isCreate}
              onClose={onClose}
              onEdit={() => setLayer2('edit')}
              onSection={setLayer2}
              onAvatarExpand={() => onAvatarExpand?.(slideOver.client)}
            />
          )}
        </aside>

        {/* ── Layer 2: Edit form or Tabbed detail ── */}
        <aside
          className={`h-full bg-white flex flex-col border-r border-slate-200/80 shrink-0 overflow-hidden transition-[width] duration-300 ${EASE}`}
          style={{ width: l2Open ? W : 0 }}
        >
          {layer2 === 'edit' && (
            <ClientEditForm
              client={slideOver?.client}
              isCreate={isCreate}
              onBack={isCreate ? onClose : handleBack1}
              onClose={onClose}
              onSave={onSave}
              saving={saving}
            />
          )}
          {(layer2 === 'appointments' || layer2 === 'sales' || layer2 === 'notes') && (
            <ClientDetailTabs
              client={slideOver?.client}
              activeTab={layer2}
              onTab={setLayer2}
              onBack={handleBack1}
              onClose={onClose}
              onItem={item => setLayer3(item)}
              dimmed={false}
            />
          )}
        </aside>

        {/* ── Layer 3: Item Detail ── */}
        <aside
          className={`h-full bg-white flex flex-col shrink-0 overflow-hidden transition-[width] duration-300 ${EASE}`}
          style={{ width: l3Open ? W : 0 }}
        >
          {layer3 && (
            <ItemDetail item={layer3} onBack={handleBack2} onClose={onClose} />
          )}
        </aside>
      </div>
    </>
  )
}

// ── Drawer panel header ────────────────────────────────────────────────────

function DrawerHeader({ onBack, onClose, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-slate-900 truncate">{title}</p>
        {subtitle && <p className="text-[12px] text-slate-400 mt-0">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ── Layer 1: Client Overview ────────────────────────────────────────────────

function ClientOverview({ client: c, isCreate, onClose, onEdit, onSection, onAvatarExpand }) {
  const dimmed = false // Layer 1 is always visible; dimming handled by backdrop
  if (!c && !isCreate) return null
  const fullName = `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'New Client'
  const color    = avatarColor(c?.first_name)
  const initial  = (c?.first_name?.[0] || '').toUpperCase()
  const stars    = Math.min(c?.loyalty_points || 0, 10)
  const spend    = parseFloat(c?.total_spend || 0)

  return (
    <div className={`flex flex-col h-full transition-opacity duration-300 ${dimmed ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Client profile</span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">

        {/* ── Hero card ── */}
        <div className="mx-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden mb-3">
          {/* Top gradient strip */}
          <div
            className="h-20 w-full"
            style={{
              background: `linear-gradient(135deg, ${color}CC 0%, ${color}88 100%)`,
            }}
          />

          <div className="px-5 pb-5">
            {/* Avatar overlapping strip */}
            <div className="flex items-end justify-between -mt-10 mb-3">
              <button
                onClick={onAvatarExpand}
                title="View full photo"
                className="group relative w-[72px] h-[72px] rounded-2xl overflow-hidden shadow-lg ring-4 ring-white cursor-zoom-in shrink-0"
              >
                {c?.avatar_url ? (
                  <img src={c.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-white font-black text-[26px]"
                    style={{ background: color }}
                  >
                    {initial}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg className="opacity-0 group-hover:opacity-80 transition-opacity drop-shadow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
                  </svg>
                </div>
              </button>

              {/* Edit button */}
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12.5px] font-semibold text-slate-600 transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>

            {/* Name */}
            <h2 className="text-[18px] font-bold text-slate-900 leading-tight">{fullName}</h2>

            {/* Gender */}
            {c?.gender && (
              <span className="inline-block mt-1 text-[11.5px] font-medium text-slate-400 capitalize">{c.gender}</span>
            )}

            {/* Contact */}
            <div className="mt-3 space-y-1.5">
              {c?.phone && (
                <div className="flex items-center gap-2 text-[13px] text-slate-600">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span>{c.phone}</span>
                </div>
              )}
              {c?.email && (
                <div className="flex items-center gap-2 text-[13px] text-slate-600">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
            </div>

            {/* Loyalty stars */}
            {stars > 0 && (
              <div className="flex items-center gap-1 mt-3">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} size={13} fill="#FBBF24" stroke="none" />
                ))}
                {Array.from({ length: 10 - stars }).map((_, i) => (
                  <Star key={`e${i}`} size={13} fill="none" stroke="#D1D5DB" strokeWidth={1.5} />
                ))}
                <span className="ml-1.5 text-[12px] text-slate-400">{c?.loyalty_points || 0} / 10</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mx-4 grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Total spend', value: `$${spend.toFixed(0)}` },
            { label: 'Visits',      value: c?.total_visits || 0 },
            { label: 'Member',      value: memberSince(c?.created_at) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] px-3 py-3 text-center">
              <p className="text-[15px] font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Section tiles ── */}
        <div className="mx-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">History</p>

          <SectionTile
            icon={Calendar}
            label="Appointments"
            badge={c?.total_visits ? `${c.total_visits} visit${c.total_visits !== 1 ? 's' : ''}` : null}
            onClick={() => onSection('appointments')}
          />
          <SectionTile
            icon={ShoppingBag}
            label="Sales"
            badge={spend > 0 ? `$${spend.toFixed(0)}` : null}
            onClick={() => onSection('sales')}
          />
          <SectionTile
            icon={StickyNote}
            label="Notes"
            badge={c?.notes ? 'Has notes' : null}
            onClick={() => onSection('notes')}
          />
          <SectionTile
            icon={MessageSquare}
            label="SMS marketing"
            badge={c?.sms_consent ? 'Opted in' : 'Opted out'}
            badgeColor={c?.sms_consent ? 'text-emerald-600' : 'text-slate-400'}
            onClick={() => onSection('edit')}
          />
        </div>

        {/* Member since */}
        {c?.created_at && (
          <p className="mx-4 mt-5 text-[12px] text-slate-400 text-center">
            Client since {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

function SectionTile({ icon: Icon, label, badge, badgeColor = 'text-slate-500', onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-shadow text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
        <Icon size={15} className="text-slate-600" />
      </div>
      <span className="flex-1 text-[13.5px] font-semibold text-slate-800">{label}</span>
      {badge && <span className={`text-[12px] font-medium ${badgeColor}`}>{badge}</span>}
      <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
    </button>
  )
}

// ── Layer 2: Edit Form ─────────────────────────────────────────────────────

function ClientEditForm({ client, isCreate, onBack, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...BLANK })

  useEffect(() => {
    setForm({ ...BLANK, ...(client || {}) })
  }, [client?.id])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      first_name: form.first_name, last_name: form.last_name,
      email: form.email, phone: form.phone, gender: form.gender,
      notes: form.notes, sms_consent: form.sms_consent,
      date_of_birth: form.date_of_birth || null,
      anniversary: form.anniversary || null,
      preferences: form.preferences || null,
      staff_alert: form.staff_alert || null,
      tags: form.tags || null,
    })
  }

  const color    = avatarColor(form.first_name)
  const initial  = (form.first_name?.[0] || '').toUpperCase()
  const fullName = `${form.first_name || ''} ${form.last_name || ''}`.trim()

  return (
    <>
      <DrawerHeader
        onBack={isCreate ? null : onBack}
        onClose={onClose}
        title={isCreate ? 'New client' : 'Edit details'}
        subtitle={!isCreate && fullName ? fullName : undefined}
      />

      <form id="client-edit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Avatar preview */}
        <div className="flex items-center gap-4 pb-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[20px] shadow-md shrink-0 overflow-hidden"
            style={!form.avatar_url ? { background: color } : {}}
          >
            {form.avatar_url
              ? <img src={form.avatar_url} alt={fullName} className="w-full h-full object-cover" />
              : initial
            }
          </div>
          {fullName && <p className="text-[15px] font-bold text-slate-800">{fullName}</p>}
        </div>

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

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Important Dates</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Birthday">
              <input type="date" value={form.date_of_birth || ''} onChange={set('date_of_birth')} className={inp} />
            </Field>
            <Field label="Anniversary">
              <input type="date" value={form.anniversary || ''} onChange={set('anniversary')} className={inp} />
            </Field>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Preferences & Alerts</p>
          <Field label="Preferences">
            <textarea value={form.preferences || ''} onChange={set('preferences')} rows={2} className={inp + ' resize-none'} placeholder="e.g. prefers no heat, likes balayage…" />
          </Field>
          <Field label="Staff Alert">
            <input value={form.staff_alert || ''} onChange={set('staff_alert')} className={inp} placeholder="e.g. Allergic to latex — warn stylist" />
          </Field>
          <Field label="Tags">
            <input value={form.tags || ''} onChange={set('tags')} className={inp} placeholder="e.g. VIP, Regular, Bridal" />
          </Field>
        </div>

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

      <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3 bg-white">
        <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" form="client-edit-form" disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : isCreate ? 'Add client' : 'Save changes'}
        </button>
      </div>
    </>
  )
}

// ── Layer 2: Tabbed Detail Panel ──────────────────────────────────────────


function ClientDetailTabs({ client: c, activeTab, onTab, onBack, onClose, onItem }) {
  const [notes, setNotes] = useState(c?.notes || '')
  const spend = parseFloat(c?.total_spend || 0)

  const { data: appts = [], isLoading: apptsLoading } = useQuery({
    queryKey: ['client-appts', c?.id],
    queryFn:  () => api.get(`/appointments/list?client_id=${c.id}`).then(r => r.data),
    enabled:  !!c?.id && activeTab === 'appointments',
  })

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['client-sales', c?.id],
    queryFn:  () => api.get(`/transactions?client_id=${c.id}`).then(r => r.data),
    enabled:  !!c?.id && activeTab === 'sales',
  })

  const SECTION_TABS = [
    { key: 'appointments', label: 'Appointments' },
    { key: 'sales',        label: 'Sales' },
    { key: 'notes',        label: 'Notes' },
  ]

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          {activeTab === 'appointments' ? 'Appointments' :
           activeTab === 'sales'        ? 'Sales' :
           activeTab === 'notes'        ? 'Notes' : 'Overview'}
        </p>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Horizontal tabs ── */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-100 shrink-0">
        {SECTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTab(tab.key)}
            className={`px-3 py-2 text-[13px] font-medium rounded-t-lg transition-colors relative ${
              activeTab === tab.key
                ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-slate-900 after:rounded-full'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.key === 'appointments' && (c?.total_visits || 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                {c.total_visits}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}

      {/* Appointments */}
      {activeTab === 'appointments' && (
        <div className="flex-1 overflow-y-auto p-5">
          {apptsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : appts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar size={32} className="text-slate-200 mb-3" />
              <p className="text-[13px] font-semibold text-slate-500">No appointments yet</p>
              <p className="text-[12px] text-slate-400 mt-1">Past and upcoming visits will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Past visits</p>
              {appts.map(appt => (
                <button key={appt.id} onClick={() => onItem({
                  type: 'appointment',
                  service: appt.service_names || '—',
                  staff: appt.staff_name,
                  date: appt.start_at_iso,
                  duration: appt.duration_min,
                  price: appt.total_price,
                  status: appt.status,
                })}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-800 truncate">{appt.service_names || '—'}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {appt.start_at} · {appt.staff_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="text-[13.5px] font-bold text-slate-800">${parseFloat(appt.total_price || 0).toFixed(0)}</p>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sales */}
      {activeTab === 'sales' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-slate-900 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Total spend</p>
              <p className="text-[24px] font-black text-white">${spend.toFixed(2)}</p>
            </div>
            <p className="text-[12px] text-slate-400">{c?.total_visits || 0} visit{(c?.total_visits || 0) !== 1 ? 's' : ''}</p>
          </div>
          {salesLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShoppingBag size={28} className="text-slate-200 mb-3" />
              <p className="text-[13px] font-semibold text-slate-500">No sales yet</p>
              <p className="text-[12px] text-slate-400 mt-1">Transactions for this client will appear here.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Purchases</p>
              <div className="space-y-2">
                {sales.map(sale => (
                  <button key={sale.id} onClick={() => onItem({
                    type: 'sale',
                    id: sale.id,
                    status: sale.status,
                    payMethod: sale.payment_method,
                    item: sale.items_count > 0
                      ? `${sale.items_count} item${sale.items_count !== 1 ? 's' : ''}`
                      : 'Transaction',
                    date: sale.created_at,
                    qty: sale.items_count || 1,
                    price: sale.grand_total,
                  })}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                      <ShoppingBag size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-slate-800 truncate">
                        {sale.items_count > 0
                          ? `${sale.items_count} item${sale.items_count !== 1 ? 's' : ''}`
                          : 'Transaction'}
                      </p>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {new Date(sale.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {sale.payment_method ? ` · ${sale.payment_method}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <p className="text-[13.5px] font-bold text-slate-800">${parseFloat(sale.grand_total || 0).toFixed(2)}</p>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <>
          <div className="flex-1 overflow-y-auto p-5">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write any notes about this client…"
              className="w-full h-full min-h-[300px] p-4 rounded-2xl border border-slate-200 text-[13.5px] text-slate-800 outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] resize-none placeholder:text-slate-300 transition-all leading-relaxed"
            />
          </div>
          <div className="px-5 py-4 border-t border-slate-100 shrink-0">
            <button className="w-full py-3 rounded-xl bg-slate-900 text-white text-[14px] font-bold hover:bg-slate-800 transition-colors">
              Save notes
            </button>
          </div>
        </>
      )}

    </div>
  )
}

// ── Layer 3: Item Detail ───────────────────────────────────────────────────

function ItemDetail({ item, onBack, onClose }) {
  if (!item) return null

  if (item.type === 'appointment') {
    const appt = item
    return (
      <>
        <DrawerHeader onBack={onBack} onClose={onClose} title={appt.service} subtitle="Appointment detail" />
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-slate-50 rounded-2xl overflow-hidden">
            {[
              { icon: Calendar, label: 'Date',     value: new Date(appt.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
              { icon: Clock,    label: 'Time',     value: new Date(appt.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) },
              { icon: Clock,    label: 'Duration', value: `${appt.duration} min` },
              { icon: Users,    label: 'Staff',    value: appt.staff },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3.5 px-5 py-3.5 border-b border-slate-200 last:border-0">
                <Icon size={14} className="text-slate-400 shrink-0" />
                <span className="text-[12px] text-slate-500 w-20 shrink-0">{label}</span>
                <span className="text-[13.5px] font-semibold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center justify-between">
            <span className="text-[14px] text-slate-300">Amount paid</span>
            <span className="text-[22px] font-black text-white">${appt.price}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-[13px] font-semibold text-emerald-600 capitalize">{appt.status}</span>
          </div>
        </div>
      </>
    )
  }

  // Sale detail
  const sale = item
  return <SaleDetail sale={sale} onBack={onBack} onClose={onClose} />
}

function SaleDetail({ sale, onBack, onClose }) {
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(null) // null | 'refund' | 'void'
  const [error, setError] = useState('')

  const actionMut = useMutation({
    mutationFn: (action) => api.post(`/transactions/${sale.id}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-sales'] })
      setConfirming(null)
    },
    onError: (err, action) => setError(err?.response?.data?.error || `Could not ${action} this sale`),
  })

  const statusBadge = {
    completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600' },
    refunded:  { label: 'Refunded',  cls: 'bg-amber-50 text-amber-600' },
    void:      { label: 'Void',      cls: 'bg-red-50 text-red-500' },
  }[sale.status] || { label: sale.status || 'Completed', cls: 'bg-slate-100 text-slate-500' }

  return (
    <>
      <DrawerHeader onBack={onBack} onClose={onClose} title={sale.item} subtitle="Sale detail" />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
          {sale.payMethod && <span className="text-[12px] text-slate-400 capitalize">via {sale.payMethod}</span>}
        </div>
        <div className="bg-slate-50 rounded-2xl overflow-hidden">
          {[
            { label: 'Date',       value: new Date(sale.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Quantity',   value: sale.qty },
            { label: 'Unit price', value: `$${(sale.price / sale.qty).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3.5 px-5 py-3.5 border-b border-slate-200 last:border-0">
              <span className="text-[12px] text-slate-500 w-24 shrink-0">{label}</span>
              <span className="text-[13.5px] font-semibold text-slate-800">{value}</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center justify-between">
          <span className="text-[14px] text-slate-300">Total</span>
          <span className="text-[22px] font-black text-white">${sale.price}</span>
        </div>

        {sale.id && sale.status === 'completed' && !confirming && (
          <div className="flex items-center justify-center gap-4 pt-1">
            <button onClick={() => { setError(''); setConfirming('refund') }} className="text-red-400 text-[12px] hover:text-red-600 transition-colors">
              Refund sale
            </button>
            <span className="text-slate-200">·</span>
            <button onClick={() => { setError(''); setConfirming('void') }} className="text-slate-400 text-[12px] hover:text-slate-600 transition-colors">
              Void sale
            </button>
          </div>
        )}

        {confirming && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-left">
            <p className="text-[13px] font-semibold text-red-700 mb-1">
              {confirming === 'void' ? 'Void' : 'Refund'} this ${sale.price} sale?
            </p>
            <p className="text-[11px] text-red-500 mb-3">
              This marks the sale as {confirming} and removes it from revenue reports. This cannot be undone.
            </p>
            {error && <p className="text-[11px] text-red-600 font-medium mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => actionMut.mutate(confirming)}
                disabled={actionMut.isPending}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {actionMut.isPending ? 'Processing…' : confirming === 'void' ? 'Void Sale' : 'Process Refund'}
              </button>
            </div>
          </div>
        )}
      </div>
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

const TEMPLATE_CSV = `First Name,Last Name,Email,Phone,Gender,Date of Birth,Notes
Jane,Doe,jane@example.com,3105550001,female,1990-05-15,VIP client
John,Smith,john@example.com,3105550002,male,,Referred by Jane`

function ImportModal({ onClose, onDone }) {
  const [step,        setStep]        = useState('upload') // upload | preview | importing | done
  const [rows,        setRows]        = useState([])
  const [onDuplicate, setOnDuplicate] = useState('skip')   // skip | update
  const [result,      setResult]      = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [importing,   setImporting]   = useState(false)
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
      if (parsed.length === 0) {
        alert('No recognisable client rows found. Ensure your CSV has headers like First Name, Last Name, Email, Phone.')
        return
      }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function runImport() {
    setImporting(true)
    try {
      const res = await api.post('/clients/import', { clients: rows, on_duplicate: onDuplicate })
      setResult(res.data)
      setStep('done')
    } catch {
      alert('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
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
              Upload a <strong className="text-slate-700">CSV</strong> file. Required columns: <code className="bg-slate-100 px-1 rounded text-[12px]">First Name</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Last Name</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Phone</code>. Optional: <code className="bg-slate-100 px-1 rounded text-[12px]">Email</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Gender</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Date of Birth</code>, <code className="bg-slate-100 px-1 rounded text-[12px]">Notes</code>
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

            <button
              onClick={() => downloadFile(TEMPLATE_CSV, 'clients-template.csv', 'text/csv')}
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
              Found <strong className="text-slate-900">{rows.length} client{rows.length !== 1 ? 's' : ''}</strong> ready to import.
            </p>

            {/* Preview table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-[12.5px]">
              <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 font-semibold text-slate-500 border-b border-slate-200">
                <span>First name</span><span>Last name</span><span>Email</span><span>Phone</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {rows.slice(0, 8).map((r, i) => (
                  <div key={i} className={`grid grid-cols-4 px-4 py-2.5 text-slate-700 ${i < rows.slice(0,8).length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <span className="truncate pr-2">{r.first_name || <span className="text-slate-300">—</span>}</span>
                    <span className="truncate pr-2">{r.last_name  || <span className="text-slate-300">—</span>}</span>
                    <span className="truncate pr-2">{r.email      || <span className="text-slate-300">—</span>}</span>
                    <span className="truncate">{r.phone      || <span className="text-slate-300">—</span>}</span>
                  </div>
                ))}
              </div>
              {rows.length > 8 && (
                <div className="px-4 py-2 bg-slate-50 text-slate-400 text-[12px] border-t border-slate-100">+ {rows.length - 8} more…</div>
              )}
            </div>

            {/* Duplicate handling */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-[12.5px] font-semibold text-slate-600">If a phone or email already exists:</p>
              <div className="flex gap-4">
                {[['skip', 'Skip duplicate'], ['update', 'Update with new data']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="dup" value={val} checked={onDuplicate === val}
                      onChange={() => setOnDuplicate(val)}
                      className="accent-[#0D9488]" />
                    <span className="text-[13px] text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep('upload')} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13.5px] font-semibold text-slate-600 hover:bg-slate-50">Back</button>
              <button
                onClick={runImport}
                disabled={importing}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[13.5px] font-bold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {importing ? <><Loader2 size={15} className="animate-spin" /> Importing…</> : `Import ${rows.length} client${rows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && result && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <CheckCircle2 size={52} className="text-[#0D9488]" />
            <div>
              <p className="text-[16px] font-bold text-slate-800">Import complete</p>
              <p className="text-[13.5px] text-slate-500 mt-1.5">
                {result.created > 0 && <><strong className="text-slate-700">{result.created}</strong> new client{result.created !== 1 ? 's' : ''} added</>}
                {result.created > 0 && (result.updated > 0 || result.skipped > 0) && ' · '}
                {result.updated > 0 && <><strong className="text-slate-700">{result.updated}</strong> updated</>}
                {result.updated > 0 && result.skipped > 0 && ' · '}
                {result.skipped > 0 && <><strong className="text-slate-700">{result.skipped}</strong> skipped</>}
              </p>
              {result.errors?.length > 0 && (
                <p className="text-[12.5px] text-red-500 mt-2 flex items-center justify-center gap-1">
                  <AlertCircle size={13}/> {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed
                </p>
              )}
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

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <p className="text-[17px] font-semibold text-white">{fullName}</p>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Photo or initials */}
      <div className="flex-1 flex items-center justify-center w-full px-8 pt-16 pb-8" onClick={e => e.stopPropagation()}>
        {c.avatar_url ? (
          <img
            src={c.avatar_url}
            alt={fullName}
            className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <div
            className="w-64 h-64 rounded-full flex items-center justify-center text-white font-black text-[96px] shadow-2xl"
            style={{ background: color }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
        {c.phone && <p className="text-[14px] text-white/50">{c.phone}</p>}
        <p className="text-[12px] text-white/25 mt-1">Click anywhere to close</p>
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
