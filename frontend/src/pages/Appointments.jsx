import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar, Plus,
  Clock, User, RefreshCw, X, QrCode, AlertTriangle,
  Search, Check, UserPlus, Scissors, ChevronDown
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth,
  isToday, parseISO
} from 'date-fns'
import api from '@/lib/api'
import { formatTime, statusColor, cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_SLOTS_DAY = [
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM'
]

function buildCalendarDays(month) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 0 })
  const days  = []
  let cur = start
  while (cur <= end) { days.push(cur); cur = addDays(cur, 1) }
  return days
}

function portalStatusColor(status) {
  if (status === 'confirmed') return 'bg-teal-100 text-teal-700'
  if (status === 'completed') return 'bg-slate-100 text-slate-600'
  if (status === 'no_show')   return 'bg-red-100 text-red-600'
  return 'bg-indigo-100 text-indigo-700'
}

export default function Appointments() {
  const qc = useQueryClient()
  const [month, setMonth]       = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [calView, setCalView]   = useState('month')
  const [bookModal, setBookModal] = useState(false)
  const [gapFillToast, setGapFillToast] = useState(false)

  // Rebook pre-fill from URL params (?rebook=1&client_id=X&staff_id=Y&service=Z&suggested_date=YYYY-MM-DD)
  const [rebookParams, setRebookParams] = useState(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('rebook') === '1') {
      const suggestedDate = params.get('suggested_date')
      if (suggestedDate) {
        const d = new Date(suggestedDate + 'T00:00:00')
        if (!isNaN(d)) { setSelected(d); setMonth(d) }
      }
      setRebookParams({
        clientId:  params.get('client_id') || null,
        staffId:   params.get('staff_id') || null,
        service:   params.get('service') || null,
      })
      setBookModal(true)
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const monthKey  = format(month,    'yyyy-MM')
  const dateStr   = format(selected, 'yyyy-MM-dd')
  const calDays   = useMemo(() => buildCalendarDays(month), [month])

  const [portalBookings, setPortalBookings] = useState(() => JSON.parse(localStorage.getItem('ks_bookings') || '[]'))

  function reloadPortal() { setPortalBookings(JSON.parse(localStorage.getItem('ks_bookings') || '[]')) }

  useEffect(() => { reloadPortal() }, [selected])

  useEffect(() => {
    function onStorage(e) { if (e.key === 'ks_bookings') reloadPortal() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function updatePortalStatus(id, status) {
    const all = JSON.parse(localStorage.getItem('ks_bookings') || '[]')
    const upd = all.map(b => b.id === id ? { ...b, status } : b)
    localStorage.setItem('ks_bookings', JSON.stringify(upd))
    setPortalBookings(upd)
  }

  const selectedDateStr = selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const dayPortalBookings = portalBookings.filter(b => b.date === selectedDateStr && b.status !== 'cancelled')

  // Build a map of portal booking counts per calendar key (yyyy-MM-dd)
  const portalCountMap = useMemo(() => {
    const map = {}
    portalBookings.filter(b => b.status !== 'cancelled').forEach(b => {
      const d = new Date(b.date)
      if (!isNaN(d)) {
        const key = format(d, 'yyyy-MM-dd')
        map[key] = (map[key] || 0) + 1
      }
    })
    return map
  }, [portalBookings])

  const { data: riskScoresRaw = [] } = useQuery({
    queryKey: ['riskScores'],
    queryFn: () => api.get('/analytics/risk-scores?all=true').then(r => r.data).catch(() => []),
    staleTime: 60_000,
  })

  const riskMap = useMemo(() => {
    const map = {}
    const arr = Array.isArray(riskScoresRaw) ? riskScoresRaw : (riskScoresRaw.results || [])
    arr.forEach(item => {
      if (item.appointment_id) map[item.appointment_id] = item
    })
    return map
  }, [riskScoresRaw])

  const { data: calData = {} } = useQuery({
    queryKey: ['appt-calendar', monthKey],
    queryFn: () => api.get(`/appointments/calendar?month=${monthKey}`).then(r => r.data),
  })

  const { data: dayAppts = [], isLoading: dayLoading } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: () => api.get(`/appointments?date=${dateStr}`).then(r => r.data),
  })

  const patchStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries(['appointments', dateStr])
      qc.invalidateQueries(['appt-calendar', monthKey])
      qc.invalidateQueries(['dashboard'])
      if (variables.status === 'cancelled') {
        setGapFillToast(true)
        setTimeout(() => setGapFillToast(false), 3000)
      }
    },
  })

  const checkIn = useMutation({
    mutationFn: id => api.post('/checkin', { appointment_id: id }),
    onSuccess: () => {
      qc.invalidateQueries(['appointments', dateStr])
      qc.invalidateQueries(['appt-calendar', monthKey])
    },
  })

  const checkOut = useMutation({
    mutationFn: id => api.post('/checkout', { appointment_id: id }),
    onSuccess: () => {
      qc.invalidateQueries(['appointments', dateStr])
      qc.invalidateQueries(['appt-calendar', monthKey])
      qc.invalidateQueries(['dashboard'])
    },
  })

  function prevMonth() { setMonth(m => subMonths(m, 1)) }
  function nextMonth() { setMonth(m => addMonths(m, 1)) }

  function selectDay(d) {
    setSelected(d)
    if (!isSameMonth(d, month)) setMonth(d)
  }

  function cellStatus(d) {
    const key  = format(d, 'yyyy-MM-dd')
    const info = calData[key]
    if (!info || info.total === 0) return null
    if (info.total >= 8)  return 'full'
    if (info.total >= 4)  return 'busy'
    return 'free'
  }

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="flex gap-5 h-full">

      {/* ── LEFT panel ────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col min-w-0">

        {/* View toggle pills */}
        <div className="flex items-center gap-1 mb-4 bg-slate-100 rounded-xl p-1 self-start">
          {(['month', 'week', 'day']).map(v => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-colors',
                calView === v
                  ? 'bg-white text-[#0D9488] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Month nav header — shown for month/week/day */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => {
              if (calView === 'month') prevMonth()
              else if (calView === 'week') setSelected(addDays(selected, -7))
              else setSelected(addDays(selected, -1))
            }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <h2 className="text-[17px] font-bold text-slate-800">
              {calView === 'month' && format(month, 'MMMM yyyy')}
              {calView === 'week' && `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`}
              {calView === 'day' && format(selected, 'EEEE, MMM d yyyy')}
            </h2>
          </div>
          <button
            onClick={() => {
              if (calView === 'month') nextMonth()
              else if (calView === 'week') setSelected(addDays(selected, 7))
              else setSelected(addDays(selected, 1))
            }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* ── MONTH view ── */}
        {calView === 'month' && (
          <>
            <div className="flex items-center gap-4 mb-4 text-[11px] font-medium text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-200" /> New clients
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-200" /> Returning
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Slots free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Full
              </span>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1.5 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {calDays.map((d, i) => {
                const key            = format(d, 'yyyy-MM-dd')
                const info           = calData[key]
                const portalCount    = portalCountMap[key] || 0
                const totalCount     = (info?.total || 0) + portalCount
                const isSelected     = isSameDay(d, selected)
                const isCurrentMonth = isSameMonth(d, month)
                const isTodayDay     = isToday(d)

                return (
                  <div
                    key={i}
                    onClick={() => selectDay(d)}
                    className={cn(
                      'bg-white p-2 cursor-pointer transition-all group relative min-h-[72px]',
                      isSelected ? 'bg-[#0D9488]' : 'hover:bg-[#F0FDFA]',
                      !isCurrentMonth && !isSelected && 'opacity-40'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        'text-[13px] font-semibold',
                        isSelected ? 'text-white' : isTodayDay ? 'text-[#0D9488]' : 'text-slate-700'
                      )}>
                        {format(d, 'd')}
                      </span>
                      {isTodayDay && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
                      )}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
                      )}
                    </div>

                    {totalCount > 0 ? (
                      <div className="mt-1.5 space-y-0.5">
                        {info?.new > 0 && (
                          <div className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                          )}>
                            {info.new} new
                          </div>
                        )}
                        {info?.returning > 0 && (
                          <div className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                            isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                          )}>
                            {info.returning} returning
                          </div>
                        )}
                        {portalCount > 0 && (
                          <div className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                          )}>
                            {portalCount} online
                          </div>
                        )}
                      </div>
                    ) : isCurrentMonth ? (
                      <div className={cn(
                        'mt-1.5 text-[10px] font-semibold',
                        isSelected ? 'text-white/70' : 'text-green-500'
                      )}>
                        All free
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── DAY view ── */}
        {calView === 'day' && (
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {TIME_SLOTS_DAY.map(slot => {
              const booking = dayPortalBookings.find(b => b.time === slot)
              return (
                <div key={slot} className="flex items-start gap-3 min-h-[40px]">
                  <span className="text-[11px] text-slate-400 w-14 shrink-0 pt-1 font-medium">{slot}</span>
                  {booking ? (
                    <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-slate-800">{booking.clientName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">Portal</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', portalStatusColor(booking.status))}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{booking.service} · {booking.staff}</p>
                    </div>
                  ) : (
                    <div className="flex-1 border-b border-slate-100 h-full min-h-[36px]" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── WEEK view ── */}
        {calView === 'week' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
              {weekDays.map((day, i) => {
                const dayLabel = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                const dayBookings = portalBookings.filter(b => b.date === dayLabel && b.status !== 'cancelled')
                const isSelectedDay = isSameDay(day, selected)
                const isTodayDay = isToday(day)
                return (
                  <div key={i} className="flex flex-col border border-slate-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => { setSelected(day); setCalView('month') }}
                      className={cn(
                        'px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide transition-colors',
                        isSelectedDay ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : isTodayDay ? 'bg-teal-50 text-[#0D9488]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {format(day, 'EEE d')}
                    </button>
                    <div className="flex-1 max-h-48 overflow-y-auto p-1 space-y-1">
                      {dayBookings.length === 0 ? (
                        <p className="text-[10px] text-slate-200 text-center py-2">—</p>
                      ) : dayBookings.map(b => (
                        <div key={b.id} className="bg-indigo-50 rounded-lg px-2 py-1">
                          <p className="text-[10px] font-semibold text-slate-700 truncate">{b.clientName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{b.time} · {b.service}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Day detail panel ──────────────────────────── */}
      <div className="w-[340px] shrink-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">

        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Selected Date
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={reloadPortal}
                title="Reload portal bookings"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#6366F1] hover:bg-indigo-50 transition-colors"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => setBookModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[12px] font-semibold  transition-colors"
              >
                <Plus size={13} /> Book New
              </button>
            </div>
          </div>
          <p className="text-[17px] font-bold text-slate-800">
            {format(selected, 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {dayPortalBookings.length > 0 && (
            <PortalBookingsSection
              bookings={dayPortalBookings}
              onStatusChange={updatePortalStatus}
            />
          )}
          <AppointmentsList
            appts={dayAppts}
            loading={dayLoading}
            riskMap={riskMap}
            onStatusChange={(id, status) => patchStatus.mutate({ id, status })}
            onCheckIn={id => checkIn.mutate(id)}
            onCheckOut={id => checkOut.mutate(id)}
            onBookNew={() => setBookModal(true)}
          />
        </div>
      </div>

      {bookModal && (
        <BookAppointmentModal
          date={selected}
          rebookParams={rebookParams}
          onClose={() => { setBookModal(false); setRebookParams(null) }}
          onDone={() => {
            setBookModal(false)
            setRebookParams(null)
            qc.invalidateQueries(['appointments', dateStr])
            qc.invalidateQueries(['appt-calendar', monthKey])
          }}
        />
      )}

      {/* Gap-fill toast — shown after cancellation */}
      {gapFillToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl shadow-xl text-[13px] font-semibold pointer-events-none animate-in slide-in-from-bottom-2 duration-300">
          <Check size={15} />
          Gap-fill SMS sent to waitlist clients
        </div>
      )}
    </div>
  )
}

function AppointmentsList({ appts, loading, riskMap = {}, onStatusChange, onCheckIn, onCheckOut, onBookNew }) {
  const [expandId, setExpandId] = useState(null)

  if (loading) return (
    <div className="p-6 text-center text-slate-400 text-[13px]">Loading…</div>
  )

  if (appts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
        <Calendar size={24} className="text-slate-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">No appointments</p>
        <p className="text-[12px] text-slate-400">No appointments booked on this day</p>
      </div>
      <button
        onClick={onBookNew}
        className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold  transition-colors"
      >
        <Plus size={14} /> Book First Appointment
      </button>
    </div>
  )

  return (
    <div className="divide-y divide-slate-50">
      <div className="flex gap-3 px-4 py-3 bg-slate-50">
        <div className="flex-1 text-center">
          <p className="text-[18px] font-bold text-slate-800">{appts.length}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <p className="text-[18px] font-bold text-blue-600">
            {appts.filter(a => a.is_new).length}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">New</p>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1 text-center">
          <p className="text-[18px] font-bold text-purple-600">
            {appts.filter(a => !a.is_new).length}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Returning</p>
        </div>
      </div>

      {appts.map(appt => (
        <ApptCard
          key={appt.id}
          appt={appt}
          risk={riskMap[appt.id]}
          expanded={expandId === appt.id}
          onToggle={() => setExpandId(id => id === appt.id ? null : appt.id)}
          onStatusChange={s => onStatusChange(appt.id, s)}
          onCheckIn={() => onCheckIn(appt.id)}
          onCheckOut={() => onCheckOut(appt.id)}
        />
      ))}

    </div>
  )
}

function PortalBookingsSection({ bookings, onStatusChange }) {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 mb-3 mt-2">
        <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">Online Bookings</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {bookings.length}
        </span>
      </div>
      <div className="space-y-2">
        {bookings.map(b => (
          <div key={b.id} className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-slate-800">{b.clientName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">Portal</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', portalStatusColor(b.status))}>
                    {b.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{b.time} · {b.service}</p>
                <p className="text-[11px] text-slate-400">{b.staff}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {b.status !== 'confirmed' && (
                <button
                  onClick={() => onStatusChange(b.id, 'confirmed')}
                  className="text-[10px] px-2 py-1 rounded-full border border-teal-200 text-teal-700 hover:bg-teal-50 font-medium transition-colors"
                >
                  Confirm
                </button>
              )}
              {b.status !== 'completed' && (
                <button
                  onClick={() => onStatusChange(b.id, 'completed')}
                  className="text-[10px] px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                >
                  Complete
                </button>
              )}
              {b.status !== 'no_show' && (
                <button
                  onClick={() => onStatusChange(b.id, 'no_show')}
                  className="text-[10px] px-2 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  No Show
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApptCard({ appt, risk, expanded, onToggle, onStatusChange, onCheckIn, onCheckOut }) {
  const isNew = appt.client_name && !appt.is_returning
  const riskLevel = risk?.risk_level
  return (
    <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3 cursor-pointer" onClick={onToggle}>
        <div className="shrink-0 text-center w-10">
          <p className="text-[12px] font-bold text-slate-700 leading-tight">{formatTime(appt.start_at)}</p>
          <p className="text-[10px] text-slate-400">{formatTime(appt.end_at)}</p>
        </div>
        <div className="w-0.5 self-stretch rounded-full bg-[#0D9488] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{appt.client_name}</p>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {riskLevel === 'high' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-0.5">
                  <AlertTriangle size={9} /> High Risk
                </span>
              )}
              {riskLevel === 'medium' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                  ◈ Medium Risk
                </span>
              )}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                statusColor(appt.status)
              )}>
                {appt.status.replace('_', ' ')}
              </span>
              {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                <button
                  onClick={e => { e.stopPropagation(); onCheckIn() }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-500 text-white hover:bg-teal-600 transition-colors"
                >
                  Check In
                </button>
              )}
              {appt.status === 'checked_in' && (
                <button
                  onClick={e => { e.stopPropagation(); onCheckOut() }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                >
                  Check Out
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 truncate">{appt.staff_name}</p>
          {appt.client_phone && (
            <p className="text-[11px] text-slate-400">{appt.client_phone}</p>
          )}
          <span className={cn(
            'inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
            isNew ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          )}>
            {isNew ? 'New client' : 'Returning'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-[52px] flex flex-wrap gap-1.5">
          {['confirmed','checked_in','in_progress','completed','cancelled','no_show'].map(s => (
            <button key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                'text-[10px] px-2 py-1 rounded-full font-medium border transition-colors',
                appt.status === s
                  ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]'
                  : 'border-slate-200 text-slate-500 hover:border-[#0D9488] hover:text-[#0D9488]'
              )}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BookAppointmentModal({ date, onClose, onDone, rebookParams }) {
  const { data: allClients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients?q=').then(r => r.data) })
  const { data: staff = [] }      = useQuery({ queryKey: ['staff'],   queryFn: () => api.get('/staff').then(r => r.data) })
  const { data: services = [] }   = useQuery({ queryKey: ['services'],queryFn: () => api.get('/services').then(r => r.data) })

  // Client search
  const [clientQ, setClientQ]         = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClient, setShowNewClient]   = useState(false)
  const [newClient, setNewClient]     = useState({ first_name:'', last_name:'', phone:'', email:'' })
  const [savingClient, setSavingClient] = useState(false)

  // Service selection
  const [svcQ, setSvcQ]               = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState([])
  const [expandedCat, setExpandedCat] = useState(null)

  // Booking fields
  const [staffId, setStaffId]         = useState('')
  const [startTime, setStartTime]     = useState('10:00')
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  const searchRef = useRef(null)
  useEffect(() => { searchRef.current?.focus() }, [])

  // Pre-fill from rebook URL params once data is loaded
  useEffect(() => {
    if (!rebookParams) return
    if (rebookParams.staffId && staff.length > 0) {
      setStaffId(rebookParams.staffId)
    }
    if (rebookParams.clientId && allClients.length > 0) {
      const c = allClients.find(c => String(c.id) === String(rebookParams.clientId))
      if (c) { setSelectedClient(c); setClientQ(`${c.first_name} ${c.last_name}`) }
    }
    if (rebookParams.service && services.length > 0) {
      const svc = services.find(s => s.name === rebookParams.service)
      if (svc) setSelectedSvcs([svc])
    }
  }, [rebookParams, allClients, staff, services])

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientQ.trim()) return allClients.slice(0, 6)
    const q = clientQ.toLowerCase()
    return allClients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [allClients, clientQ])

  // Group services by category
  const svcGroups = useMemo(() => {
    const filtered = svcQ.trim()
      ? services.filter(s => s.name.toLowerCase().includes(svcQ.toLowerCase()) ||
          (s.category || '').toLowerCase().includes(svcQ.toLowerCase()))
      : services
    const groups = {}
    filtered.forEach(s => {
      const cat = s.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(s)
    })
    return groups
  }, [services, svcQ])

  const totalDuration = selectedSvcs.reduce((sum, s) => sum + (s.duration_min || 60), 0)
  const totalPrice    = selectedSvcs.reduce((sum, s) => sum + parseFloat(s.price || 0), 0)

  function toggleSvc(svc) {
    setSelectedSvcs(prev =>
      prev.find(s => s.id === svc.id)
        ? prev.filter(s => s.id !== svc.id)
        : [...prev, svc]
    )
  }

  async function createNewClient() {
    if (!newClient.first_name || !newClient.last_name) return
    setSavingClient(true)
    try {
      const res = await api.post('/clients', { ...newClient })
      const created = res.data
      setSelectedClient(created)
      setClientQ(`${created.first_name} ${created.last_name}`)
      setShowNewClient(false)
    } catch { setErr('Could not create client') }
    finally { setSavingClient(false) }
  }

  async function handleSubmit() {
    if (!selectedClient) { setErr('Select a client'); return }
    if (selectedSvcs.length === 0) { setErr('Select at least one service'); return }
    if (!staffId) { setErr('Select a staff member'); return }
    setErr('')
    setSaving(true)
    try {
      const ds     = format(date, 'yyyy-MM-dd')
      const startAt = new Date(`${ds}T${startTime}:00`)
      const endAt   = new Date(startAt.getTime() + totalDuration * 60000)
      await api.post('/appointments', {
        client_id: selectedClient.id,
        staff_id:  +staffId,
        start_at:  startAt.toISOString(),
        end_at:    endAt.toISOString(),
        notes,
        source: 'reception',
        services: selectedSvcs.map(s => ({ service_id: s.id, price: s.price, duration_min: s.duration_min })),
      })
      onDone()
    } catch { setErr('Failed to book appointment') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">New Appointment</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{format(date, 'EEEE, d MMMM yyyy')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── 1. Client ── */}
          <div className="px-6 py-5 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] flex items-center justify-center text-[11px] font-bold">1</div>
              <span className="text-[13px] font-bold text-slate-700">Select Client</span>
            </div>

            {selectedClient ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[14px] font-semibold text-slate-800">{selectedClient.first_name} {selectedClient.last_name}</p>
                  {selectedClient.phone && <p className="text-[12px] text-slate-500">{selectedClient.phone}</p>}
                </div>
                <button
                  onClick={() => { setSelectedClient(null); setClientQ(''); setShowNewClient(false) }}
                  className="text-[11px] text-teal-700 font-semibold hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={clientQ}
                    onChange={e => { setClientQ(e.target.value); setShowNewClient(false) }}
                    placeholder="Search by name, phone or email…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>

                {!showNewClient && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    {filteredClients.length > 0 ? filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientQ(`${c.first_name} ${c.last_name}`) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[12px] font-bold shrink-0">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{c.phone || c.email || 'No contact info'}</p>
                        </div>
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-[13px] text-slate-400 text-center">No clients found</div>
                    )}
                    <button
                      onClick={() => setShowNewClient(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#6366F1] hover:bg-indigo-50 transition-colors border-t border-slate-100"
                    >
                      <UserPlus size={14} /> Add New Client
                    </button>
                  </div>
                )}

                {showNewClient && (
                  <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-3">
                    <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-wide">New Client</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="First name *"
                        value={newClient.first_name}
                        onChange={e => setNewClient(p => ({ ...p, first_name: e.target.value }))}
                        className={inp}
                      />
                      <input
                        placeholder="Last name *"
                        value={newClient.last_name}
                        onChange={e => setNewClient(p => ({ ...p, last_name: e.target.value }))}
                        className={inp}
                      />
                    </div>
                    <input
                      placeholder="Phone"
                      value={newClient.phone}
                      onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                      className={inp}
                    />
                    <input
                      placeholder="Email"
                      value={newClient.email}
                      onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                      className={inp}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNewClient(false)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 text-[13px] text-slate-600 font-semibold hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createNewClient}
                        disabled={savingClient || !newClient.first_name || !newClient.last_name}
                        className="flex-1 py-2 rounded-xl bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                      >
                        {savingClient ? 'Saving…' : 'Add Client'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 2. Services ── */}
          <div className="px-6 py-5 border-b border-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] flex items-center justify-center text-[11px] font-bold">2</div>
                <span className="text-[13px] font-bold text-slate-700">Select Services</span>
              </div>
              {selectedSvcs.length > 0 && (
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  {selectedSvcs.length} selected · ${totalPrice.toFixed(2)} · {totalDuration}min
                </span>
              )}
            </div>

            {selectedSvcs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedSvcs.map(s => (
                  <span key={s.id} className="flex items-center gap-1 text-[11px] font-semibold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full">
                    {s.name}
                    <button onClick={() => toggleSvc(s)} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={svcQ}
                onChange={e => setSvcQ(e.target.value)}
                placeholder="Search services…"
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {Object.keys(svcGroups).length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-4">No services found</p>
              )}
              {Object.entries(svcGroups).map(([cat, svcs]) => {
                const isOpen = expandedCat === cat || svcQ.trim() !== ''
                return (
                  <div key={cat} className="border border-slate-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCat(isOpen && !svcQ ? null : cat)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Scissors size={13} className="text-slate-400" />
                        <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">{cat}</span>
                        <span className="text-[10px] text-slate-400">({svcs.length})</span>
                      </div>
                      <ChevronDown size={14} className={cn('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-slate-50">
                        {svcs.map(svc => {
                          const picked = selectedSvcs.some(s => s.id === svc.id)
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleSvc(svc)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left',
                                picked ? 'bg-teal-50' : 'hover:bg-slate-50'
                              )}
                            >
                              <div className={cn(
                                'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                                picked ? 'bg-[#0D9488] border-[#0D9488]' : 'border-slate-300'
                              )}>
                                {picked && <Check size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800">{svc.name}</p>
                                {svc.description && (
                                  <p className="text-[11px] text-slate-400 truncate">{svc.description}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[13px] font-bold text-slate-800">${parseFloat(svc.price || 0).toFixed(2)}</p>
                                <p className="text-[11px] text-slate-400">{svc.duration_min || 60}min</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 3. Staff & Time ── */}
          <div className="px-6 py-5 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] flex items-center justify-center text-[11px] font-bold">3</div>
              <span className="text-[13px] font-bold text-slate-700">Staff & Time</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Staff Member *</label>
                <select
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  className={inp}
                >
                  <option value="">Any available</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={inp}
                />
              </div>
            </div>
          </div>

          {/* ── 4. Notes ── */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px] font-bold">4</div>
              <span className="text-[13px] font-bold text-slate-700">Notes</span>
              <span className="text-[11px] text-slate-400">(optional)</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Allergies, preferences, special requests…"
              className={inp + ' resize-none'}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          {err && <p className="text-[12px] text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60 transition-colors"
            >
              {saving ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'
