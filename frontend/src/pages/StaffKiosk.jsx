import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import {
  Users, Clock, CheckCircle2, Plus, X, Star,
  RefreshCw, AlertTriangle, Scissors, Phone,
  ChevronRight, Bell, Timer, User, Search, ChevronDown, Check
} from 'lucide-react'

// No-auth axios instance — all kiosk endpoints are public
const ax = axios.create({ baseURL: '/api/v1/public/kiosk' })

// ── SearchableSelect ─────────────────────────────────────────────────────────

function SearchableSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const choose = opt => {
    onChange(opt ? opt.value : '')
    setOpen(false)
    setQuery('')
  }

  const handleTriggerClick = () => {
    setOpen(v => !v)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleTriggerClick}
        className={`w-full flex items-center justify-between bg-white border rounded-xl px-4 py-2.5 text-sm transition-colors text-left ${
          open ? 'border-teal-500 ring-1 ring-teal-200' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selected && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); choose(null) }}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-slate-400 text-center">No results</li>
            ) : filtered.map(opt => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => choose(opt)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                    String(value) === String(opt.value)
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                  {String(value) === String(opt.value) && (
                    <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function waitBadge(mins) {
  if (mins < 10) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (mins < 20) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

function staffStatusDot(s) {
  if (s === 'available') return 'bg-emerald-400'
  if (s === 'break') return 'bg-amber-400'
  return 'bg-red-400'
}

function staffStatusLabel(s) {
  if (s === 'available') return 'Available'
  if (s === 'break') return 'On Break'
  return 'Busy'
}

function staffStatusText(s) {
  if (s === 'available') return 'text-emerald-600'
  if (s === 'break') return 'text-amber-600'
  return 'text-red-500'
}

function nextStaffStatus(s) {
  if (s === 'available') return 'busy'
  if (s === 'busy') return 'break'
  return 'available'
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({ member, onToggle }) {
  const [toggling, setToggling] = useState(false)

  const toggle = async () => {
    if (toggling) return
    setToggling(true)
    await onToggle(member.id, nextStaffStatus(member.kiosk_status))
    setToggling(false)
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
    >
      <div className="relative flex-shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: member.color || '#0D9488' }}
          >
            {member.name.charAt(0)}
          </div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${staffStatusDot(member.kiosk_status)}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 text-sm font-medium truncate">{member.name}</p>
        <p className={`text-xs font-medium ${staffStatusText(member.kiosk_status)}`}>
          {staffStatusLabel(member.kiosk_status)}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
    </button>
  )
}

// ── Queue card ────────────────────────────────────────────────────────────────

function QueueCard({ item, staffList, onStatusChange, onSelect, selected }) {
  const [busy, setBusy] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  const changeStatus = async (status, assignedStaffId) => {
    setBusy(true)
    await onStatusChange(item, status, assignedStaffId)
    setBusy(false)
    setShowAssign(false)
  }

  const isSelected = selected?.id === item.id && selected?.type === item.type

  return (
    <div
      className={`rounded-2xl border transition-all bg-white ${
        isSelected
          ? 'border-teal-300 shadow-md ring-1 ring-teal-200'
          : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-slate-900 font-semibold text-[15px]">{item.name}</h3>
              {item.is_recurring && (
                <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 rounded-full px-2 py-0.5 font-medium">
                  Recurring
                </span>
              )}
              <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                {item.type === 'walkin' ? 'Walk-in' : 'Appt'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{item.services || 'No service specified'}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {item.status !== 'completed' && (
              <span className={`text-xs border rounded-full px-2 py-0.5 flex items-center gap-1 font-medium ${waitBadge(item.wait_minutes)}`}>
                <Timer className="w-3 h-3" />
                {item.wait_minutes}m
              </span>
            )}
            {item.loyalty_stars > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500 text-xs font-medium">
                <Star className="w-3 h-3 fill-current" />
                {item.loyalty_stars}
              </span>
            )}
          </div>
        </div>

        {item.assigned_staff_name && (
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <User className="w-3 h-3" />
            {item.assigned_staff_name}
          </p>
        )}

        {item.status !== 'completed' && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.status === 'waiting' && !showAssign && (
              <>
                <button
                  onClick={() => setShowAssign(true)}
                  disabled={busy}
                  className="flex-1 text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
                >
                  Seat Now
                </button>
                <button
                  onClick={() => onSelect(item)}
                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 py-1.5 px-3 rounded-lg transition-colors"
                >
                  Details
                </button>
              </>
            )}
            {item.status === 'waiting' && showAssign && (
              <div className="w-full space-y-2">
                <p className="text-xs text-slate-500 font-medium">Assign to stylist:</p>
                <div className="flex flex-wrap gap-1.5">
                  {staffList.filter(s => s.kiosk_status === 'available').map(s => (
                    <button
                      key={s.id}
                      onClick={() => changeStatus('in_service', s.id)}
                      disabled={busy}
                      className="text-xs bg-teal-50 hover:bg-teal-100 disabled:opacity-50 text-teal-700 border border-teal-200 font-medium py-1 px-2.5 rounded-lg transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                  <button
                    onClick={() => changeStatus('in_service', undefined)}
                    disabled={busy}
                    className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 py-1 px-2.5 rounded-lg transition-colors"
                  >
                    No assign
                  </button>
                  <button
                    onClick={() => setShowAssign(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 py-1 px-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {item.status === 'in_service' && (
              <>
                <button
                  onClick={() => changeStatus('completed')}
                  disabled={busy}
                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </button>
                <button
                  onClick={() => onSelect(item)}
                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 py-1.5 px-3 rounded-lg transition-colors"
                >
                  Details
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ item, staffList, onStatusChange, onClose }) {
  const [busy, setBusy] = useState(false)

  const changeStatus = async (status, assignedStaffId) => {
    setBusy(true)
    await onStatusChange(item, status, assignedStaffId)
    setBusy(false)
  }

  if (!item) return null

  const statusColor = item.status === 'waiting' ? 'bg-amber-400' : item.status === 'in_service' ? 'bg-teal-500' : 'bg-emerald-500'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="text-slate-800 font-semibold text-[15px]">Client Details</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Identity */}
        <div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
            <span className="text-white font-bold text-lg">{item.name.charAt(0)}</span>
          </div>
          <h3 className="text-slate-900 font-bold text-lg leading-tight">{item.name}</h3>
          {item.phone && (
            <a href={`tel:${item.phone}`}
              className="text-slate-500 text-sm flex items-center gap-1 mt-0.5 hover:text-teal-600 transition-colors">
              <Phone className="w-3.5 h-3.5" />
              {item.phone}
            </a>
          )}
        </div>

        {/* Loyalty */}
        {item.loyalty_stars > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-amber-700 text-xs font-semibold mb-1.5">Loyalty Stars</p>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(item.loyalty_stars, 10) }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              {Array.from({ length: Math.max(0, 10 - item.loyalty_stars) }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-slate-200" />
              ))}
            </div>
            <p className="text-amber-600 text-xs mt-1">{item.loyalty_stars} star{item.loyalty_stars !== 1 ? 's' : ''} total</p>
          </div>
        )}

        {/* Services */}
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-slate-400 text-xs font-medium mb-1">Services</p>
          <p className="text-slate-800 text-sm font-medium">{item.services || 'Not specified'}</p>
        </div>

        {/* Status */}
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-slate-400 text-xs font-medium mb-1">Status</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <p className="text-slate-800 text-sm font-medium capitalize">{item.status.replace('_', ' ')}</p>
            {item.status !== 'completed' && (
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${waitBadge(item.wait_minutes)}`}>
                {item.wait_minutes}m
              </span>
            )}
          </div>
        </div>

        {/* Assigned */}
        {item.assigned_staff_name && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-slate-400 text-xs font-medium mb-1">Assigned To</p>
            <p className="text-slate-800 text-sm font-medium">{item.assigned_staff_name}</p>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-slate-400 text-xs font-medium mb-1">Notes</p>
            <p className="text-slate-700 text-sm">{item.notes}</p>
          </div>
        )}

        {/* Recurring */}
        {item.is_recurring && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
            <p className="text-purple-700 text-xs font-semibold flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              Recurring Client
            </p>
            <p className="text-purple-600 text-xs mt-1">Recurring appointment — confirm deposit when booking next visit.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {item.status !== 'completed' && (
        <div className="p-4 border-t border-slate-100 space-y-2">
          {item.status === 'waiting' && (
            <>
              <p className="text-xs text-slate-500 font-medium mb-2">Seat with stylist:</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {staffList.filter(s => s.kiosk_status === 'available').map(s => (
                  <button
                    key={s.id}
                    onClick={() => changeStatus('in_service', s.id)}
                    disabled={busy}
                    className="text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => changeStatus('in_service', undefined)}
                disabled={busy}
                className="w-full text-sm bg-teal-50 hover:bg-teal-100 disabled:opacity-50 text-teal-700 font-semibold py-2 rounded-xl border border-teal-200 transition-colors"
              >
                Seat (unassigned)
              </button>
            </>
          )}
          {item.status === 'in_service' && (
            <button
              onClick={() => changeStatus('completed')}
              disabled={busy}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Complete
            </button>
          )}
          <button
            onClick={() => changeStatus('cancelled')}
            disabled={busy}
            className="w-full text-xs text-slate-400 hover:text-red-500 py-1.5 transition-colors"
          >
            Cancel / No-show
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add Walk-in modal ─────────────────────────────────────────────────────────

function AddWalkInModal({ staffList, services, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', phone: '', service_ids: [], staff_id: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setBusy(true)
    try {
      await ax.post('/walkin', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        service_ids: form.service_ids.map(Number).filter(Boolean),
        preferred_staff_id: form.staff_id ? Number(form.staff_id) : undefined,
      })
      onAdded()
      onClose()
    } catch {
      setError('Failed to add walk-in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-100 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-bold text-[16px]">Add Walk-in</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Client name *"
            required
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
          />
          <input
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="Phone (optional)"
            type="tel"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
          />
          <SearchableSelect
            options={services.map(s => ({ value: s.id, label: s.name }))}
            value={form.service_ids[0] || ''}
            onChange={v => set('service_ids', v ? [v] : [])}
            placeholder="Select service (optional)"
          />
          <SearchableSelect
            options={staffList.map(s => ({ value: s.id, label: s.name }))}
            value={form.staff_id}
            onChange={v => set('staff_id', v || '')}
            placeholder="Any stylist"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {busy ? 'Adding…' : 'Add to Queue'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffKiosk() {
  const [queue, setQueue] = useState([])
  const [depositReminders, setDepositReminders] = useState([])
  const [staffList, setStaffList] = useState([])
  const [services, setServices] = useState([])
  const [activeTab, setActiveTab] = useState('waiting')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showAddWalkIn, setShowAddWalkIn] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef(null)
  const now = useNow()

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [qRes, sRes] = await Promise.all([
        ax.get('/queue'),
        ax.get('/staff'),
      ])
      setQueue(qRes.data.queue || [])
      setDepositReminders(qRes.data.deposit_reminders || [])
      setStaffList(sRes.data || [])
    } catch {}
    finally { setRefreshing(false) }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await ax.get('/services')
      setServices(res.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchAll()
    fetchServices()
    intervalRef.current = setInterval(() => fetchAll(true), 20_000)
    return () => clearInterval(intervalRef.current)
  }, [fetchAll, fetchServices])

  const handleStatusChange = async (item, newStatus, assignedStaffId) => {
    try {
      if (item.type === 'walkin') {
        await ax.patch(`/walkin/${item.id}/status`, {
          status: newStatus,
          assigned_staff_id: assignedStaffId || undefined,
        })
      } else {
        await ax.patch(`/appointment/${item.id}/status`, { status: newStatus })
      }
      await fetchAll(true)
      if (selectedItem?.id === item.id && selectedItem?.type === item.type) {
        setSelectedItem(null)
      }
    } catch {}
  }

  const handleStaffToggle = async (staffId, newStatus) => {
    try {
      await ax.patch(`/staff/${staffId}/status`, { status: newStatus })
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, kiosk_status: newStatus } : s))
    } catch {}
  }

  const waiting    = queue.filter(i => i.status === 'waiting')
  const inService  = queue.filter(i => i.status === 'in_service')
  const done       = queue.filter(i => i.status === 'completed')
  const tabItems   = activeTab === 'waiting' ? waiting : activeTab === 'in_service' ? inService : done

  const TABS = [
    { key: 'waiting',    label: 'Waiting',    count: waiting.length },
    { key: 'in_service', label: 'In Service', count: inService.length },
    { key: 'completed',  label: 'Done',       count: done.length },
  ]

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-5 h-14 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-[15px]">Kriyansh Beauty Bar</span>
          <span className="text-slate-300 text-xs font-light hidden sm:inline">· Staff View</span>
        </div>

        <div className="flex items-center gap-3">
          {depositReminders.length > 0 && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-xs font-medium">
              <Bell className="w-3.5 h-3.5" />
              {depositReminders.length} deposit{depositReminders.length > 1 ? 's' : ''} pending
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
          <button
            onClick={() => fetchAll()}
            disabled={refreshing}
            className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Staff panel */}
        <aside className="hidden lg:flex w-56 flex-col bg-white border-r border-slate-100 flex-shrink-0 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Stylists
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
            {staffList.length === 0
              ? <p className="text-slate-400 text-xs text-center py-6">No staff found</p>
              : staffList.map(s => (
                <StaffCard key={s.id} member={s} onToggle={handleStaffToggle} />
              ))
            }
          </div>
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => setShowAddWalkIn(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Walk-in
            </button>
          </div>
        </aside>

        {/* Center: Queue */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Deposit reminders banner */}
          {depositReminders.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-700 text-xs font-semibold">Deposit Reminders</p>
                  {depositReminders.map(r => (
                    <p key={r.id} className="text-slate-600 text-xs mt-0.5 truncate">
                      <span className="text-amber-700 font-medium">{r.client_name}</span>
                      {' — '}{r.services} · {fmtDate(r.start_at)} at {fmtTime(r.start_at)}
                      {r.recurring_frequency && ` (${r.recurring_frequency})`}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-white flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                <span className={`text-xs ${activeTab === tab.key ? 'text-slate-300' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
            {/* Mobile add button */}
            <button
              onClick={() => setShowAddWalkIn(true)}
              className="ml-auto lg:hidden flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Walk-in
            </button>
          </div>

          {/* Queue list */}
          <div className="flex-1 overflow-y-auto p-4">
            {tabItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mb-3">
                  {activeTab === 'waiting'    ? <Clock       className="w-7 h-7 text-slate-300" /> :
                   activeTab === 'in_service' ? <Scissors    className="w-7 h-7 text-slate-300" /> :
                                                <CheckCircle2 className="w-7 h-7 text-slate-300" />}
                </div>
                <p className="text-slate-400 text-sm">
                  {activeTab === 'waiting'    ? 'No one waiting right now' :
                   activeTab === 'in_service' ? 'No clients in service' :
                                                'No completed clients yet today'}
                </p>
              </div>
            ) : (
              <div className={`grid gap-3 ${selectedItem ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                {tabItems.map(item => (
                  <QueueCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    staffList={staffList}
                    onStatusChange={handleStatusChange}
                    onSelect={setSelectedItem}
                    selected={selectedItem}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right: Detail panel */}
        {selectedItem && (
          <aside className="w-72 xl:w-80 flex flex-col bg-white border-l border-slate-100 flex-shrink-0 shadow-sm">
            <DetailPanel
              item={selectedItem}
              staffList={staffList}
              onStatusChange={handleStatusChange}
              onClose={() => setSelectedItem(null)}
            />
          </aside>
        )}
      </div>

      {/* Add Walk-in modal */}
      {showAddWalkIn && (
        <AddWalkInModal
          staffList={staffList}
          services={services}
          onClose={() => setShowAddWalkIn(false)}
          onAdded={() => fetchAll(true)}
        />
      )}
    </div>
  )
}
