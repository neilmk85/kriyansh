import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Users, X } from 'lucide-react'
import api from '@/lib/api'
import { initials } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function toDateStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// ── ShiftBlock ────────────────────────────────────────────────────────────
function ShiftBlock({ shift, color, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-full text-left px-2 py-1 rounded-lg text-white text-[11px] font-semibold leading-tight mb-1 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: color || '#0D9488' }}
      >
        <div>{shift.start_time}–{shift.end_time}</div>
        {shift.notes && (
          <div className="truncate opacity-80 text-[10px]">{shift.notes}</div>
        )}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-44 text-left">
          <p className="text-[12px] font-semibold text-slate-700 mb-0.5">
            {shift.start_time} – {shift.end_time}
          </p>
          {shift.notes && (
            <p className="text-[11px] text-slate-500 mb-2">{shift.notes}</p>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(shift.id); setOpen(false) }}
            className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-600 font-medium"
          >
            <X size={12} /> Delete shift
          </button>
        </div>
      )}
    </div>
  )
}

// ── AddShiftModal ─────────────────────────────────────────────────────────
function AddShiftModal({ staff, defaultDate, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    staff_id: staff[0]?.id ?? '',
    shift_date: defaultDate,
    start_time: '09:00',
    end_time: '18:00',
    notes: '',
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.staff_id || !form.shift_date) return
    onSubmit({ ...form, staff_id: Number(form.staff_id) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 z-10 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-900">Add shift</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Team member</label>
            <select
              value={form.staff_id}
              onChange={e => set('staff_id', e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              required
            >
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date</label>
            <input
              type="date"
              value={form.shift_date}
              onChange={e => set('shift_date', e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Start time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                required
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">End time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. covering for morning shift"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-full border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-10 rounded-full text-white text-[14px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Saving…' : 'Add shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function StaffShifts() {
  const qc = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState('')

  const dates = getWeekDates(weekOffset)
  const weekStart = toDateStr(dates[0])

  const startLabel = dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel   = dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  })

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', weekStart],
    queryFn: () => api.get(`/shifts?week_start=${weekStart}`).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: body => api.post('/shifts', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts', weekStart] })
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/shifts/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts', weekStart] }),
  })

  function openModal(date) {
    setModalDate(date || toDateStr(new Date()))
    setModalOpen(true)
  }

  // Build lookup: shiftMap[dateStr][staffId] = [shift, ...]
  const shiftMap = {}
  for (const s of shifts) {
    if (!shiftMap[s.shift_date]) shiftMap[s.shift_date] = {}
    if (!shiftMap[s.shift_date][s.staff_id]) shiftMap[s.shift_date][s.staff_id] = []
    shiftMap[s.shift_date][s.staff_id].push(s)
  }

  const staffById = Object.fromEntries(staff.map(s => [s.id, s]))

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Scheduled shifts</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-[13px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all"
        >
          <Plus size={15} /> Add shift
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setWeekOffset(v => v - 1)}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={15} className="text-slate-600" />
        </button>
        <span className="text-[14px] font-semibold text-slate-700 min-w-[200px] text-center">
          {startLabel} – {endLabel}
        </span>
        <button
          onClick={() => setWeekOffset(v => v + 1)}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ChevronRight size={15} className="text-slate-600" />
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className="px-3 py-1 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100">
          <div className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Team member</div>
          {dates.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`px-2 py-3 text-center border-l border-slate-100 ${isToday ? 'bg-teal-50' : ''}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? 'text-[#0D9488]' : 'text-slate-400'}`}>
                  {DAYS[d.getDay()]}
                </div>
                <div className={`text-[15px] font-bold mt-0.5 ${isToday ? 'text-[#0D9488]' : 'text-slate-700'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {shiftsLoading ? (
          <div className="py-10 text-center text-[13px] text-slate-400">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-700">No shifts scheduled</p>
            <p className="text-[13px] text-slate-400 max-w-xs">
              Add shifts for your team members to see their schedule here.
            </p>
            <button
              onClick={() => openModal()}
              className="mt-1 flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all"
            >
              <Plus size={14} /> Add first shift
            </button>
          </div>
        ) : (
          staff.map(member => (
            <div
              key={member.id}
              className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100 last:border-0 min-h-[72px]"
            >
              {/* Name cell */}
              <div className="px-4 py-3 flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                  style={{ backgroundColor: member.color || '#0D9488' }}
                >
                  {initials(`${member.first_name} ${member.last_name}`)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800 truncate">
                    {member.first_name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{member.last_name}</div>
                </div>
              </div>

              {/* Day cells */}
              {dates.map((d, i) => {
                const dateStr = toDateStr(d)
                const dayShifts = shiftMap[dateStr]?.[member.id] ?? []
                const isToday = d.toDateString() === new Date().toDateString()
                return (
                  <div
                    key={i}
                    onClick={() => openModal(dateStr)}
                    className={`px-1.5 py-2 border-l border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-teal-50/40' : ''}`}
                  >
                    {dayShifts.map(shift => (
                      <ShiftBlock
                        key={shift.id}
                        shift={shift}
                        color={member.color || '#0D9488'}
                        onDelete={id => deleteMutation.mutate(id)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <AddShiftModal
          staff={staff}
          defaultDate={modalDate}
          onClose={() => setModalOpen(false)}
          onSubmit={body => createMutation.mutate(body)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
