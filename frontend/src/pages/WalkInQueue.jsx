import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users2, Clock, Check, X, UserCheck, RefreshCw,
  Tag, User, ChevronDown, Plus
} from 'lucide-react'
import api from '@/lib/api'

/* ─── helpers ─────────────────────────────────────────── */

function fmt(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function staffName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim()
}

function statusPill(status) {
  switch (status) {
    case 'upcoming':   return 'bg-indigo-100 text-indigo-700'
    case 'waiting':    return 'bg-amber-100 text-amber-700'
    case 'in_service': return 'bg-teal-100 text-teal-700'
    case 'completed':  return 'bg-green-100 text-green-700'
    case 'cancelled':  return 'bg-red-100 text-red-600'
    case 'no_show':    return 'bg-red-100 text-red-600'
    default:           return 'bg-slate-100 text-slate-500'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'upcoming':   return 'Upcoming'
    case 'waiting':    return 'Waiting'
    case 'in_service': return 'In Service'
    case 'completed':  return 'Completed'
    case 'cancelled':  return 'Cancelled'
    case 'no_show':    return 'No-show'
    default:           return status
  }
}

const CARD_SHADOW = 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]'

/* ─── StartModal (assign staff, walk-ins only) ────────────── */

function StartModal({ entry, staff, onStart, onClose }) {
  const [staffId, setStaffId] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onStart(entry, 'in_service', staffId ? parseInt(staffId) : undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className={`bg-white rounded-2xl p-6 w-full max-w-sm ${CARD_SHADOW}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-slate-900">Assign Staff</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[13px] text-slate-500 mb-4">
          Starting service for <span className="font-semibold text-slate-700">{entry.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 block">
              Staff Member
            </label>
            <div className="relative">
              <select
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 pr-8"
              >
                <option value="">— Any available —</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{staffName(s)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-[14px] font-semibold hover:bg-[#0f766e] active:scale-[0.98] transition-all"
            >
              Start Service
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── AddWalkInModal ───────────────────────────────────── */

function AddWalkInModal({ services, staff, onAdd, onClose, busy }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceIds, setServiceIds] = useState([])
  const [preferredStaffId, setPreferredStaffId] = useState('')

  function toggleService(id) {
    setServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      phone: phone.trim() || undefined,
      service_ids: serviceIds,
      preferred_staff_id: preferredStaffId ? parseInt(preferredStaffId) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className={`bg-white rounded-2xl p-6 w-full max-w-md ${CARD_SHADOW} max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-slate-900">Add Walk-in</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 block">
              Client name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Client name or Walk-in"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 block">
              Phone (optional)
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {services.length > 0 && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 block">
                Services
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {services.map(s => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`text-[12px] font-medium py-1.5 px-2.5 rounded-lg border transition-colors ${
                      serviceIds.includes(s.id)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 block">
              Preferred staff (optional)
            </label>
            <div className="relative">
              <select
                value={preferredStaffId}
                onChange={e => setPreferredStaffId(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 pr-8"
              >
                <option value="">— Any available —</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{staffName(s)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-[14px] font-semibold hover:bg-[#0f766e] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Add to Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── QueueCard ────────────────────────────────────────── */

function QueueCard({ entry, staff, onAction }) {
  const [showStartModal, setShowStartModal] = useState(false)
  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(entry.status)
  const isAppt = entry.type === 'appointment'

  const services = entry.services || 'Any service'
  const longWait = (entry.wait_minutes || 0) > 15

  const timeLabel =
    entry.status === 'upcoming'   ? 'Scheduled' :
    entry.status === 'waiting'    ? 'Checked in' :
    entry.status === 'in_service' ? 'Started' :
    'Completed'

  const timeValue =
    entry.status === 'upcoming'                                          ? entry.start_at :
    ['completed', 'cancelled', 'no_show'].includes(entry.status)         ? (entry.completed_at || entry.started_at || entry.checked_in_at) :
    entry.status === 'in_service'                                        ? entry.started_at :
    entry.checked_in_at

  return (
    <>
      <div className={`bg-white rounded-2xl p-4 ${CARD_SHADOW} space-y-2.5`}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-bold text-slate-900 leading-snug">{entry.name}</span>
          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusPill(entry.status)}`}>
            {statusLabel(entry.status)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            isAppt ? 'bg-purple-50 text-purple-600 border border-purple-200' : 'bg-slate-100 text-slate-500'
          }`}>
            {isAppt ? 'Appointment' : 'Walk-in'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <Tag size={12} className="shrink-0 text-slate-400" />
          <span>{services}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <User size={12} className="shrink-0 text-slate-400" />
          {isAppt ? (
            entry.assigned_staff_name
              ? <span>{entry.assigned_staff_name}</span>
              : <span className="italic text-slate-400">Unassigned</span>
          ) : entry.preferred_staff_name ? (
            <span>
              {entry.preferred_staff_name}
              {entry.assigned_staff_name && entry.assigned_staff_name !== entry.preferred_staff_name && (
                <span className="text-teal-600 font-medium"> → Assigned to {entry.assigned_staff_name}</span>
              )}
            </span>
          ) : entry.assigned_staff_name ? (
            <span className="text-teal-600 font-medium">Assigned to {entry.assigned_staff_name}</span>
          ) : (
            <span className="italic text-slate-400">Any available</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <Clock size={12} className="shrink-0 text-slate-400" />
          <span>{timeLabel}&nbsp;{fmt(timeValue)}</span>
          {(entry.status === 'waiting' || entry.status === 'in_service') && entry.wait_minutes != null && (
            <span className={`ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              longWait ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {entry.wait_minutes}m {entry.status === 'in_service' ? 'in service' : 'wait'}
            </span>
          )}
        </div>

        {entry.notes && (
          <p className="text-[12px] italic text-slate-400 leading-snug">{entry.notes}</p>
        )}

        {!isTerminal && (
          <div className="pt-1 space-y-2">
            {entry.status === 'upcoming' && (
              <button
                onClick={() => onAction(entry, 'checked_in')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                <UserCheck size={14} />
                Check In
              </button>
            )}

            {entry.status === 'waiting' && (
              <>
                <button
                  onClick={() => isAppt ? onAction(entry, 'in_service') : setShowStartModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0D9488] text-white text-[13px] font-semibold hover:bg-[#0f766e] active:scale-[0.98] transition-all"
                >
                  <UserCheck size={14} />
                  Start Service
                </button>
                <button
                  onClick={() => onAction(entry, 'no_show')}
                  className="w-full py-2 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  No-show
                </button>
              </>
            )}

            {entry.status === 'in_service' && (
              <>
                <button
                  onClick={() => onAction(entry, 'completed')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-[13px] font-semibold hover:bg-green-700 active:scale-[0.98] transition-all"
                >
                  <Check size={14} />
                  Mark Complete
                </button>
                <button
                  onClick={() => onAction(entry, 'cancelled')}
                  className="w-full py-2 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showStartModal && (
        <StartModal
          entry={entry}
          staff={staff}
          onStart={onAction}
          onClose={() => setShowStartModal(false)}
        />
      )}
    </>
  )
}

/* ─── QueueColumn ──────────────────────────────────────── */

function QueueColumn({ title, color, entries, staff, onAction }) {
  const colors = {
    indigo: { dot: 'bg-indigo-400', badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', header: 'bg-indigo-50' },
    amber:  { dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700',  border: 'border-amber-200',  header: 'bg-amber-50' },
    teal:   { dot: 'bg-teal-400',   badge: 'bg-teal-100 text-teal-700',    border: 'border-teal-200',   header: 'bg-teal-50' },
    slate:  { dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600',  border: 'border-slate-200',  header: 'bg-slate-50' },
  }
  const c = colors[color] || colors.slate

  return (
    <div className={`flex flex-col rounded-2xl border ${c.border} overflow-hidden`}>
      <div className={`${c.header} px-4 py-3 flex items-center gap-2 border-b ${c.border}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
        <span className="text-[13px] font-bold text-slate-700">{title}</span>
        <span className={`ml-auto text-[12px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
          {entries.length}
        </span>
      </div>

      <div className="flex-1 p-3 space-y-3 min-h-[200px] bg-white/60">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <span className="text-[13px]">Nothing here</span>
          </div>
        ) : (
          entries.map(entry => (
            <QueueCard
              key={`${entry.type}-${entry.id}`}
              entry={entry}
              staff={staff}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─── StatChip / TypeFilter ────────────────────────────── */

function StatChip({ label, count, color }) {
  const c = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    teal:  'bg-teal-50 border-teal-200 text-teal-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  }[color] || 'bg-slate-50 border-slate-200 text-slate-600'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[13px] font-semibold ${c}`}>
      <span className="text-[20px] font-black">{count}</span>
      <span className="font-medium opacity-80">{label}</span>
    </div>
  )
}

function TypeFilter({ value, onChange }) {
  const opts = [
    { key: 'all',         label: 'All' },
    { key: 'appointment', label: 'Appointments' },
    { key: 'walkin',      label: 'Walk-ins' },
  ]
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            value === o.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ─── WalkInQueue (main page) ──────────────────────────── */

export default function WalkInQueue() {
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const { data: queue = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue').then(r => r.data),
    refetchInterval: 20_000,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: ({ entry, status, assigned_staff_id }) => {
      const path = entry.type === 'appointment'
        ? `/appointments/${entry.id}/status`
        : `/walkins/${entry.id}/status`
      return api.patch(path, {
        status,
        ...(assigned_staff_id != null ? { assigned_staff_id } : {}),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] })
    },
  })

  const addMutation = useMutation({
    mutationFn: (body) => api.post('/walkins', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] })
      setShowAddModal(false)
    },
  })

  function handleAction(entry, status, assignedStaffId) {
    mutation.mutate({ entry, status, assigned_staff_id: assignedStaffId })
  }

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ['queue'] })
  }

  const visible = typeFilter === 'all' ? queue : queue.filter(i => i.type === typeFilter)

  const upcoming  = visible.filter(i => i.status === 'upcoming')
  const waiting   = visible.filter(i => i.status === 'waiting')
  const inService = visible.filter(i => i.status === 'in_service')
  const done      = visible.filter(i => ['completed', 'cancelled', 'no_show'].includes(i.status))

  const refreshedDisplay = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Users2 size={18} className="text-[#0D9488]" />
            </div>
            <h1 className="text-[22px] font-bold text-slate-900">Queue</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-teal-600">Live · 20s</span>
            </span>
          </div>
          <p className="mt-0.5 ml-11 text-[13px] text-slate-400">{today}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StatChip label="Upcoming"   count={upcoming.length}  color="indigo" />
          <StatChip label="Waiting"    count={waiting.length}   color="amber" />
          <StatChip label="In Service" count={inService.length} color="teal"  />
          <StatChip label="Done Today" count={done.length}      color="slate" />

          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.97] transition-all"
            >
              <Plus size={14} />
              Add Walk-in
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <span className="text-[12px] text-slate-400 hidden sm:inline">
              {refreshedDisplay}
            </span>
          </div>
        </div>
      </div>

      <TypeFilter value={typeFilter} onChange={setTypeFilter} />

      {/* ── Kanban grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw size={22} className="animate-spin mr-2" />
          <span className="text-[14px]">Loading queue…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <QueueColumn title="Upcoming"   color="indigo" entries={upcoming}  staff={staff} onAction={handleAction} />
          <QueueColumn title="Waiting"    color="amber"  entries={waiting}   staff={staff} onAction={handleAction} />
          <QueueColumn title="In Service" color="teal"   entries={inService} staff={staff} onAction={handleAction} />
          <QueueColumn title="Completed"  color="slate"  entries={done}      staff={staff} onAction={handleAction} />
        </div>
      )}

      {showAddModal && (
        <AddWalkInModal
          services={services}
          staff={staff}
          busy={addMutation.isPending}
          onAdd={(body) => addMutation.mutate(body)}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
