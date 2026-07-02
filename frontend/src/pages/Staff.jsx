import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronUp,
  Star, Mail, Phone, Calendar, Clock, UserMinus, Pencil,
  Download, Settings2, Link2, ListOrdered, X, User, Check,
} from 'lucide-react'
import api from '@/lib/api'
import { initials } from '@/lib/utils'

const DAYS = [
  { key: 'sunday',    label: 'Sunday'    },
  { key: 'monday',    label: 'Monday'    },
  { key: 'tuesday',   label: 'Tuesday'   },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday'  },
  { key: 'friday',    label: 'Friday'    },
  { key: 'saturday',  label: 'Saturday'  },
]

const DEFAULT_SCHEDULE = DAYS.map(d => ({
  day: d.key,
  working: d.key !== 'sunday',
  start_time: '09:00',
  end_time: '18:00',
}))

function useOutsideClick(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

export default function Staff() {
  const navigate = useNavigate()
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [modalTab, setModalTab]           = useState('profile')
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState(new Set())
  const [optionsOpen, setOptionsOpen]     = useState(false)
  const [actionsOpen, setActionsOpen]     = useState(null)
  const optionsRef = useRef(null)
  useOutsideClick(optionsRef, () => setOptionsOpen(false))

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  })

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email ?? ''} ${s.specializations ?? ''}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const allChecked   = filtered.length > 0 && filtered.every(s => selected.has(s.id))
  const someChecked  = filtered.some(s => selected.has(s.id))

  function toggleAll() {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

  function toggleOne(id) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function openModal(s, tab = 'profile') {
    setSelectedStaff(s)
    setModalTab(tab)
    setActionsOpen(null)
  }

  const roleLabel = r => {
    if (!r) return 'Staff'
    const map = { owner: 'Workspace owner', manager: 'Manager', staff: 'Staff', receptionist: 'Receptionist' }
    return map[r] ?? r
  }

  return (
    <div className="-m-6 p-6 min-h-full bg-white">
    <div className="">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-slate-900">Team members</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[13px] font-semibold">
            {staff.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Options dropdown */}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setOptionsOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              Options
              {optionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {optionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl z-30 overflow-hidden py-1">
                {[
                  { icon: Link2,       label: 'Create share link'    },
                  { icon: ListOrdered, label: 'Change order'         },
                  { icon: Settings2,   label: 'Team settings'        },
                ].map(({ icon: Icon, label }) => (
                  <button key={label} onClick={() => setOptionsOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                    <Icon size={15} className="text-slate-400" /> {label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <p className="px-4 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Export</p>
                {['CSV', 'Excel'].map(fmt => (
                  <button key={fmt} onClick={() => setOptionsOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                    <Download size={15} className="text-slate-400" /> {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button onClick={() => navigate('/staff/add')} className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 transition-colors">
            Add
          </button>
        </div>
      </div>

      {/* ── Search + Filter bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search team members"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all placeholder:text-slate-400" />
          </div>

          {/* Filters button */}
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <SlidersHorizontal size={14} className="text-slate-400" /> Filters
          </button>
        </div>

        {/* Custom order */}
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
          <ArrowUpDown size={14} className="text-slate-400" /> Custom order
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-slate-400" />
          </div>
          <p className="text-[16px] font-bold text-slate-700 mb-1">No team members yet</p>
          <p className="text-[13px] text-slate-400 mb-5">Add your first team member to get started</p>
          <button onClick={() => navigate('/staff/add')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-[13px] font-bold">
            Add team member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {/* Checkbox header */}
                <th className="w-12 px-4 py-3.5">
                  <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} onChange={toggleAll} />
                </th>
                {/* Name */}
                <th className="text-left px-4 py-3.5">
                  <button className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-800">
                    Name <ArrowUpDown size={12} className="text-slate-400" />
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3.5 text-[12px] font-semibold text-slate-600 uppercase tracking-wide">Permission role</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[13px] text-slate-400">
                    No results for "{search}"
                  </td>
                </tr>
              ) : filtered.map(s => (
                <TeamRow
                  key={s.id}
                  s={s}
                  checked={selected.has(s.id)}
                  onCheck={() => toggleOne(s.id)}
                  actionsOpen={actionsOpen === s.id}
                  onActionsToggle={() => setActionsOpen(v => v === s.id ? null : s.id)}
                  onActionsClose={() => setActionsOpen(null)}
                  onEdit={() => openModal(s, 'profile')}
                  onViewCalendar={() => openModal(s, 'schedule')}
                  onViewSchedule={() => openModal(s, 'schedule')}
                  roleLabel={roleLabel(s.role)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Staff modal ─────────────────────────────────────────────────────── */}
      {selectedStaff && (
        <StaffModal
          staff={selectedStaff}
          initialTab={modalTab}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
    </div>
  )
}

// ── Team Row ──────────────────────────────────────────────────────────────────
function TeamRow({ s, checked, onCheck, actionsOpen, onActionsToggle, onActionsClose, onEdit, onViewCalendar, onViewSchedule, roleLabel }) {
  const ref = useRef(null)
  useOutsideClick(ref, onActionsClose)

  const avatarBg = s.color || '#0D9488'

  const ACTIONS = [
    { icon: Pencil,     label: 'Edit',                  handler: onEdit          },
    { icon: Calendar,   label: 'View calendar',          handler: onViewCalendar  },
    { icon: Clock,      label: 'View scheduled shifts',  handler: onViewSchedule  },
    { icon: UserMinus,  label: 'Add time off',           handler: onActionsClose  },
  ]

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors group">
      {/* Checkbox */}
      <td className="px-4 py-4">
        <Checkbox checked={checked} onChange={onCheck} />
      </td>

      {/* Name + role + rating */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm"
            style={{ background: avatarBg }}>
            {initials(`${s.first_name} ${s.last_name}`)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900">{s.first_name} {s.last_name}</p>
            {s.specializations && (
              <p className="text-[12px] text-slate-500 mt-0.5">{s.specializations}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-semibold text-slate-600">5.0</span>
            </div>
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-4 py-4">
        <div className="space-y-1">
          {s.email && (
            <p className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <Mail size={12} className="text-slate-400 shrink-0" /> {s.email}
            </p>
          )}
          {s.phone && (
            <p className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <Phone size={12} className="text-slate-400 shrink-0" /> {s.phone}
            </p>
          )}
          {!s.email && !s.phone && <span className="text-[12px] text-slate-400">—</span>}
        </div>
      </td>

      {/* Permission role */}
      <td className="px-4 py-4">
        <span className="text-[13px] text-slate-700">{roleLabel}</span>
      </td>

      {/* Actions dropdown */}
      <td className="px-4 py-4">
        <div className="relative flex justify-end" ref={ref}>
          <button
            onClick={onActionsToggle}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-colors ${
              actionsOpen
                ? 'border-slate-400 bg-slate-50 text-slate-800'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}>
            Actions {actionsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {actionsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 overflow-hidden py-1.5">
              {ACTIONS.map(({ icon: Icon, label, handler }) => (
                <button key={label}
                  onClick={() => { handler(); onActionsClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                  <Icon size={14} className="text-slate-400 shrink-0" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate = false, onChange }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className="cursor-pointer flex items-center">
      <input type="checkbox" ref={ref} checked={checked} onChange={onChange}
        className="sr-only" />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
        checked || indeterminate
          ? 'bg-slate-900 border-slate-900'
          : 'bg-white border-slate-300 hover:border-slate-400'
      }`}>
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
        {!checked && indeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
      </div>
    </label>
  )
}

// ── Staff Modal ───────────────────────────────────────────────────────────────
function StaffModal({ staff: s, initialTab = 'profile', onClose }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
              style={{ background: s.color || '#0D9488' }}>
              {initials(`${s.first_name} ${s.last_name}`)}
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-800">{s.first_name} {s.last_name}</h2>
              {s.specializations && <p className="text-[12px] text-slate-400">{s.specializations}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {[
            { key: 'profile',  label: 'Profile',  Icon: User     },
            { key: 'schedule', label: 'Schedule', Icon: Calendar },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
                tab === key
                  ? 'border-[#0D9488] text-[#0D9488]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {tab === 'profile' ? <ProfileTab staff={s} /> : <ScheduleTab staff={s} />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ staff: s }) {
  const rows = [
    { label: 'Email',          value: s.email || '—'                        },
    { label: 'Phone',          value: s.phone || '—'                        },
    { label: 'Role',           value: s.role || 'Staff'                     },
    { label: 'Commission',     value: `${s.commission_pct ?? 0}%`           },
    { label: 'Online booking', value: s.accepts_online ? '✓ Enabled' : 'Off' },
    ...(s.bio             ? [{ label: 'Bio',             value: s.bio             }] : []),
    ...(s.specializations ? [{ label: 'Specializations', value: s.specializations }] : []),
  ]
  return (
    <div className="p-6 space-y-0">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between py-3 border-b border-slate-50 last:border-0">
          <span className="text-[13px] text-slate-500">{label}</span>
          <span className="text-[13px] font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
        </div>
      ))}
    </div>
  )
}

function ScheduleTab({ staff: s }) {
  const qc = useQueryClient()
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [status, setStatus] = useState(null)

  const { isLoading } = useQuery({
    queryKey: ['staff-schedule', s.id],
    queryFn: () => api.get(`/staff/${s.id}/schedule`).then(r => r.data),
    onSuccess: data => { if (Array.isArray(data) && data.length) setSchedule(data) },
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/staff/${s.id}/schedule`, schedule),
    onSuccess: () => { setStatus('success'); setTimeout(() => setStatus(null), 3000) },
    onError:   () => { setStatus('error');   setTimeout(() => setStatus(null), 3000) },
  })

  function setField(day, field, value) {
    setSchedule(prev => prev.map(d => d.day === day ? { ...d, [field]: value } : d))
  }

  if (isLoading) return <div className="p-6 text-center text-[13px] text-slate-400">Loading schedule…</div>

  return (
    <div className="p-6 space-y-4">
      {status === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold px-4 py-2.5 rounded-xl">
          ✓ Schedule saved successfully
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-2.5 rounded-xl">
          Failed to save. Please try again.
        </div>
      )}

      <div className="grid grid-cols-[110px_52px_1fr_1fr] gap-2 px-1">
        {['Day', 'On', 'Start', 'End'].map(h => (
          <span key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{h}</span>
        ))}
      </div>

      {schedule.map(d => {
        const dayLabel = DAYS.find(x => x.key === d.day)?.label ?? d.day
        return (
          <div key={d.day}
            className={`grid grid-cols-[110px_52px_1fr_1fr] gap-2 items-center px-3 py-2.5 rounded-xl transition-colors ${
              d.working ? 'bg-[#F0FDFA] border border-[#CCFBF1]' : 'bg-slate-50 border border-slate-100'
            }`}>
            <span className={`text-[13px] font-semibold ${d.working ? 'text-slate-800' : 'text-slate-400'}`}>
              {dayLabel}
            </span>
            <button type="button" onClick={() => setField(d.day, 'working', !d.working)}
              className={`relative w-9 h-[18px] rounded-full transition-colors ${d.working ? 'bg-[#0D9488]' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                d.working ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`} />
            </button>
            <input type="time" value={d.start_time} disabled={!d.working}
              onChange={e => setField(d.day, 'start_time', e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl border text-[12px] outline-none transition-all ${
                d.working
                  ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
                  : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`} />
            <input type="time" value={d.end_time} disabled={!d.working}
              onChange={e => setField(d.day, 'end_time', e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl border text-[12px] outline-none transition-all ${
                d.working
                  ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
                  : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
              }`} />
          </div>
        )
      })}

      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
        className="w-full py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60 transition-colors mt-2">
        {saveMutation.isPending ? 'Saving…' : 'Save Schedule'}
      </button>
    </div>
  )
}
