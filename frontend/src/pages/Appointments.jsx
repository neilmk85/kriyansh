import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Calendar, Plus,
  Clock, User, RefreshCw, X, QrCode, AlertTriangle,
  Search, Check, UserPlus, Scissors, ChevronDown, List,
  MoreHorizontal, Activity, CreditCard, FileText
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth,
  isToday, parseISO
} from 'date-fns'
import api from '@/lib/api'
import { formatTime, statusColor, cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  const navigate = useNavigate()
  const [month, setMonth]       = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [calView, setCalView]   = useState('month')
  const [bookModal, setBookModal] = useState(false)
  const [bookPrefill, setBookPrefill] = useState(null) // { staffId, time, clientId, clientName, clientPhone, services } — from a grid-slot click or Rebook
  const [gapFillToast, setGapFillToast] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [focusedStaffId, setFocusedStaffId] = useState(null)
  const [hoverPopup, setHoverPopup] = useState(null) // { key, x, y, info }
  const hoverTimer = useRef(null)

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

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekFromStr = format(weekStart, 'yyyy-MM-dd')
  const weekToStr   = format(weekDays[6], 'yyyy-MM-dd')

  const { data: weekApptsRaw = [], isLoading: weekLoading } = useQuery({
    queryKey: ['appointments-week', weekFromStr, weekToStr],
    queryFn: () => api.get(`/appointments/list?from=${weekFromStr}&to=${weekToStr}`).then(r => r.data),
    enabled: calView === 'week',
  })

  const { data: dayStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  })

  const reschedule = useMutation({
    mutationFn: ({ id, start_at, end_at, staff_id }) =>
      api.patch(`/appointments/${id}/reschedule`, { start_at, end_at, staff_id }),
    onSuccess: () => {
      qc.invalidateQueries(['appointments', dateStr])
      qc.invalidateQueries(['appt-calendar', monthKey])
    },
    onError: (err) => {
      setRescheduleError(err?.response?.data?.error || 'Could not reschedule that appointment')
      setTimeout(() => setRescheduleError(''), 4000)
    },
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

  async function handleRebook(appt) {
    const full = await api.get(`/appointments/${appt.id}`).then(r => r.data).catch(() => null)
    if (!full) return
    setBookPrefill({
      staffId: full.staff_id,
      clientId: full.client_id,
      clientName: full.client_name,
      clientPhone: full.client_phone,
      services: (full.services || []).map(s => ({ id: s.service_id, name: s.service_name, price: s.price, duration_min: s.duration_min })),
    })
    setBookModal(true)
  }

  async function handleCheckout(appt) {
    const full = await api.get(`/appointments/${appt.id}`).then(r => r.data).catch(() => null)
    if (!full) return
    navigate('/admin/pos', {
      state: {
        clientId: full.client_id,
        clientName: full.client_name,
        clientPhone: full.client_phone,
        services: (full.services || []).map(s => ({ id: s.service_id, name: s.service_name, price: s.price, duration_min: s.duration_min })),
      },
    })
  }

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

  const showHover = useCallback((e, key, info, totalCount) => {
    if (!totalCount) return
    clearTimeout(hoverTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const vw   = window.innerWidth
    const popW = 220
    const x    = (rect.right + popW + 12 > vw) ? rect.left - popW - 4 : rect.right + 4
    const y    = Math.min(rect.top, window.innerHeight - 180)
    setHoverPopup({ key, x, y, info, totalCount })
  }, [])

  const hideHover = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHoverPopup(null), 80)
  }, [])

  return (
    <div className="flex gap-5 h-full">

      {/* ── LEFT panel ────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col min-w-0">

        {/* View toggle pills */}
        <div className="flex items-center gap-2 mb-4 self-start">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
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
          <button
            onClick={() => navigate('/admin/appointments/list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <List size={13} /> List view
          </button>
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
                    onMouseEnter={(e) => showHover(e, key, info, totalCount)}
                    onMouseLeave={hideHover}
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

        {/* ── Hover popup ── */}
        {hoverPopup && (
          <div
            style={{ position: 'fixed', top: hoverPopup.y, left: hoverPopup.x, zIndex: 9999, width: 220 }}
            onMouseEnter={() => clearTimeout(hoverTimer.current)}
            onMouseLeave={hideHover}
            className="bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-bold text-slate-800">
                {format(parseISO(hoverPopup.key), 'EEE, MMM d')}
              </span>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#0D9488] text-white text-[11px] font-bold">
                {hoverPopup.totalCount}
              </span>
            </div>
            <div className="space-y-1.5">
              {hoverPopup.info?.new > 0 && (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-slate-600">{hoverPopup.info.new} new {hoverPopup.info.new === 1 ? 'client' : 'clients'}</span>
                </div>
              )}
              {hoverPopup.info?.returning > 0 && (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <span className="text-slate-600">{hoverPopup.info.returning} returning</span>
                </div>
              )}
              {hoverPopup.info?.total > 0 && !hoverPopup.info?.new && !hoverPopup.info?.returning && (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                  <span className="text-slate-600">{hoverPopup.info.total} appointment{hoverPopup.info.total !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            {hoverPopup.info?.status_breakdown && Object.entries(hoverPopup.info.status_breakdown).length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                {Object.entries(hoverPopup.info.status_breakdown).map(([s, n]) => n > 0 && (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {n} {s}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] text-slate-400">Click to view full day schedule</p>
            </div>
          </div>
        )}

        {/* ── DAY view — staff columns, drag to reschedule ── */}
        {calView === 'day' && (
          <StaffDayGrid
            date={selected}
            staff={dayStaff}
            appts={dayAppts}
            loading={dayLoading}
            focusedStaffId={focusedStaffId}
            onToggleFocus={id => setFocusedStaffId(cur => cur === id ? null : id)}
            onReschedule={(id, start_at, end_at, staff_id) => reschedule.mutate({ id, start_at, end_at, staff_id })}
            onSlotClick={(staffId, time) => { setBookPrefill({ staffId, time }); setBookModal(true) }}
            error={rescheduleError}
          />
        )}

        {/* ── WEEK view — real appointments, one column per day ── */}
        {calView === 'week' && (
          <WeekGrid
            weekDays={weekDays}
            appts={weekApptsRaw}
            loading={weekLoading}
            selected={selected}
            onSelectDay={day => { setSelected(day); setCalView('day') }}
          />
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
            onRebook={handleRebook}
            onCheckout={handleCheckout}
            dateStr={dateStr}
            monthKey={monthKey}
          />
        </div>
      </div>

      {bookModal && (
        <BookAppointmentModal
          date={selected}
          rebookParams={rebookParams}
          bookPrefill={bookPrefill}
          onClose={() => { setBookModal(false); setRebookParams(null); setBookPrefill(null) }}
          onDone={() => {
            setBookModal(false)
            setRebookParams(null)
            setBookPrefill(null)
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

// ── Staff-column day grid — click a header to focus one stylist, drag a
//    card to move it to a new time or a different stylist's column ──────────

const GRID_START_HOUR = 9
const GRID_END_HOUR   = 21
const PX_PER_MIN       = 64 / 60 // 64px per hour
const SNAP_MIN         = 15
const GRID_HEIGHT      = (GRID_END_HOUR - GRID_START_HOUR) * 60 * PX_PER_MIN

function minutesSinceGridStart(date) {
  return (date.getHours() - GRID_START_HOUR) * 60 + date.getMinutes()
}

function StaffDayGrid({ date, staff, appts, loading, focusedStaffId, onToggleFocus, onReschedule, onSlotClick, error }) {
  const bodyRef = useRef(null)
  const colRefs = useRef({})
  const [drag, setDrag] = useState(null) // { id, staffId, durationMin, top, colStaffId }
  const autoScrolledFor = useRef(null)

  // On first render for a given date, scroll the grid so the earliest
  // appointment (or the current time, if viewing today) is in view instead
  // of defaulting to GRID_START_HOUR — otherwise afternoon/evening bookings
  // are invisible below the fold until the user manually scrolls down.
  useEffect(() => {
    if (loading) return
    const el = bodyRef.current
    if (!el) return
    const dateKey = date ? format(date, 'yyyy-MM-dd') : null
    if (autoScrolledFor.current === dateKey) return
    autoScrolledFor.current = dateKey

    const relevant = appts.filter(a => a.status !== 'cancelled')
    const targetMin = relevant.length > 0
      ? Math.min(...relevant.map(a => minutesSinceGridStart(new Date(a.start_at))))
      : (date && isToday(date) ? minutesSinceGridStart(new Date()) : null)
    if (targetMin === null) return
    el.scrollTop = Math.max(0, targetMin * PX_PER_MIN - 40)
  }, [date, loading, appts])

  const visibleStaff = focusedStaffId ? staff.filter(s => s.id === focusedStaffId) : staff
  const liveAppts = appts.filter(a => a.status !== 'cancelled')

  const hours = []
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) hours.push(h)

  function fmtHour(h) {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12} ${ampm}`
  }

  function apptGeometry(appt) {
    const start = new Date(appt.start_at)
    const end   = new Date(appt.end_at)
    const top   = Math.max(0, minutesSinceGridStart(start) * PX_PER_MIN)
    const height = Math.max(22, (end - start) / 60000 * PX_PER_MIN)
    return { top, height, durationMin: Math.round((end - start) / 60000) }
  }

  function timeStringAt(clientY, columnEl) {
    const rect = columnEl.getBoundingClientRect()
    const rawMin = (clientY - rect.top) / PX_PER_MIN
    const snapped = Math.round(rawMin / SNAP_MIN) * SNAP_MIN
    const clamped = Math.min(Math.max(0, snapped), (GRID_END_HOUR - GRID_START_HOUR) * 60 - SNAP_MIN)
    const totalMin = GRID_START_HOUR * 60 + clamped
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function beginDrag(e, appt) {
    e.preventDefault()
    const { top, durationMin } = apptGeometry(appt)
    setDrag({
      id: appt.id,
      origStaffId: appt.staff_id,
      colStaffId: appt.staff_id,
      durationMin,
      origTop: top,
      top,
      startClientY: e.clientY,
      moved: false,
    })
  }

  useEffect(() => {
    if (!drag) return
    function onMove(e) {
      const deltaY = e.clientY - drag.startClientY
      if (Math.abs(deltaY) > 3) {
        setDrag(d => d && { ...d, moved: true })
      }
      const rawTop = drag.origTop + deltaY
      const snappedTop = Math.round(rawTop / (SNAP_MIN * PX_PER_MIN)) * (SNAP_MIN * PX_PER_MIN)
      const clampedTop = Math.min(Math.max(0, snappedTop), GRID_HEIGHT - 10)

      // Which staff column is the pointer over?
      let colStaffId = drag.colStaffId
      for (const s of visibleStaff) {
        const el = colRefs.current[s.id]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX < rect.right) { colStaffId = s.id; break }
      }
      setDrag(d => d && { ...d, top: clampedTop, colStaffId })
    }
    function onUp() {
      setDrag(d => {
        if (d && d.moved) {
          const startMin = d.top / PX_PER_MIN
          const newStart = new Date()
          newStart.setHours(GRID_START_HOUR, 0, 0, 0)
          newStart.setMinutes(newStart.getMinutes() + startMin)
          const newEnd = new Date(newStart.getTime() + d.durationMin * 60000)
          onReschedule(d.id, newStart.toISOString(), newEnd.toISOString(), d.colStaffId)
        }
        return null
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, visibleStaff, onReschedule])

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">Loading…</div>

  if (staff.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">Add a team member to see the day grid</div>
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-[12px] font-medium">{error}</div>
      )}

      {/* Staff header row */}
      <div className="flex border-b border-slate-200 pb-2 mb-1">
        <div className="w-12 shrink-0" />
        <div className="flex-1 flex gap-1">
          {focusedStaffId && (
            <button
              onClick={() => onToggleFocus(focusedStaffId)}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 border border-slate-200"
            >
              ← All staff
            </button>
          )}
          {visibleStaff.map(s => (
            <button
              key={s.id}
              onClick={() => onToggleFocus(s.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors',
                focusedStaffId === s.id ? 'text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
              style={focusedStaffId === s.id ? { background: s.color || '#0D9488' } : {}}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: s.color || '#0D9488' }}>
                {(s.first_name?.[0] || '?').toUpperCase()}
              </span>
              {s.first_name}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable grid body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: GRID_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-12 shrink-0 relative">
            {hours.map(h => (
              <div key={h} className="absolute left-0 right-0 text-[10px] text-slate-400 font-medium -translate-y-1/2"
                style={{ top: (h - GRID_START_HOUR) * 60 * PX_PER_MIN }}>
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Staff columns */}
          <div className="flex-1 flex relative">
            {visibleStaff.map(s => {
              const colAppts = liveAppts.filter(a => a.staff_id === s.id && !(drag && drag.id === a.id))
              const draggedHere = drag && drag.colStaffId === s.id
              return (
                <div
                  key={s.id}
                  ref={el => { colRefs.current[s.id] = el }}
                  onClick={e => {
                    if (e.target.closest('[title="Drag to reschedule"]')) return
                    onSlotClick(s.id, timeStringAt(e.clientY, colRefs.current[s.id]))
                  }}
                  className="flex-1 relative border-l border-slate-100 first:border-l-0 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  {hours.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: (h - GRID_START_HOUR) * 60 * PX_PER_MIN }} />
                  ))}

                  {colAppts.map(appt => {
                    const { top, height } = apptGeometry(appt)
                    return (
                      <div
                        key={appt.id}
                        onMouseDown={e => beginDrag(e, appt)}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded-lg px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing select-none border',
                          statusColor(appt.status)
                        )}
                        style={{ top, height, borderColor: 'rgba(0,0,0,0.06)' }}
                        title="Drag to reschedule"
                      >
                        <p className="text-[11px] font-bold truncate leading-tight">{appt.client_name}</p>
                        {height > 34 && <p className="text-[10px] opacity-80 truncate leading-tight">{new Date(appt.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>}
                      </div>
                    )
                  })}

                  {draggedHere && drag && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 overflow-hidden border-2 border-dashed border-[#0D9488] bg-white/90 shadow-lg pointer-events-none z-10"
                      style={{ top: drag.top, height: Math.max(22, drag.durationMin * PX_PER_MIN) }}
                    >
                      <p className="text-[11px] font-bold text-[#0D9488] truncate leading-tight">
                        {liveAppts.find(a => a.id === drag.id)?.client_name}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Week view — 7 day columns of real appointments, styled like the day grid ──

function WeekGrid({ weekDays, appts, loading, selected, onSelectDay }) {
  const byDay = useMemo(() => {
    const map = {}
    for (const a of appts) {
      if (a.status === 'cancelled') continue
      const key = format(new Date(a.start_at_iso), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    for (const key in map) map[key].sort((x, y) => new Date(x.start_at_iso) - new Date(y.start_at_iso))
    return map
  }, [appts])

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {loading && <div className="text-center text-slate-400 text-[12px] py-2">Loading…</div>}
      <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0">
        {weekDays.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayAppts = byDay[key] || []
          const isSelectedDay = isSameDay(day, selected)
          const isTodayDay = isToday(day)
          return (
            <div key={i} className="flex flex-col border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => onSelectDay(day)}
                className={cn(
                  'px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide transition-colors shrink-0',
                  isSelectedDay ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : isTodayDay ? 'bg-teal-50 text-[#0D9488]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                )}
              >
                {format(day, 'EEE d')}
              </button>
              <div className="flex-1 overflow-y-auto p-1 space-y-1">
                {dayAppts.length === 0 ? (
                  <p className="text-[10px] text-slate-200 text-center py-2">—</p>
                ) : dayAppts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onSelectDay(day)}
                    className={cn('w-full text-left rounded-lg px-2 py-1 border transition-colors hover:brightness-95', statusColor(a.status))}
                    style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                  >
                    <p className="text-[10px] font-bold truncate leading-tight">
                      {new Date(a.start_at_iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {a.client_name}
                    </p>
                    <p className="text-[9.5px] opacity-75 truncate leading-tight">{a.staff_name}{a.service_names ? ` · ${a.service_names}` : ''}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AppointmentsList({ appts, loading, riskMap = {}, onStatusChange, onCheckIn, onCheckOut, onBookNew, onRebook, onCheckout, dateStr, monthKey }) {
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
          onRebook={() => onRebook(appt)}
          onCheckout={() => onCheckout(appt)}
          dateStr={dateStr}
          monthKey={monthKey}
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

function ApptHoverCard({ appt, rect }) {
  const CARD_W = 320
  const viewW = window.innerWidth
  const left = rect.right + 12 + CARD_W > viewW
    ? rect.left - CARD_W - 8
    : rect.right + 12
  const top = Math.min(rect.top, window.innerHeight - 400)

  const initial = (appt.client_name || '?')[0].toUpperCase()

  // Format time range
  function fmtT(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    let h = d.getHours(), m = d.getMinutes()
    const ampm = h >= 12 ? 'pm' : 'am'
    h = h % 12 || 12
    return `${h}:${String(m).padStart(2, '0')}${ampm}`
  }
  const timeRange = `${fmtT(appt.start_at)} – ${fmtT(appt.end_at)}`

  // Status badge color
  function statusBadgeColor(s) {
    if (s === 'confirmed')   return 'text-teal-600'
    if (s === 'completed')   return 'text-slate-600'
    if (s === 'no_show')     return 'text-red-600'
    if (s === 'checked_in')  return 'text-indigo-600'
    if (s === 'cancelled')   return 'text-gray-500'
    return 'text-blue-600'
  }

  const serviceNames = appt.service_names
    ? appt.service_names.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const isNew = appt.client_name && !appt.is_returning

  return (
    <div
      style={{ position: 'fixed', top, left, width: CARD_W, zIndex: 9999 }}
      className="rounded-2xl shadow-2xl border border-slate-100 bg-white overflow-hidden pointer-events-none"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 py-3 rounded-t-2xl flex items-center justify-between">
        <span className="text-white font-bold text-[13px]">{timeRange}</span>
        <span className={`bg-white text-[11px] font-bold capitalize px-2 py-0.5 rounded-full ${statusBadgeColor(appt.status)}`}>
          {(appt.status || '').replace('_', ' ')}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Client row */}
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 flex items-center justify-center rounded-full bg-teal-500 text-white font-bold text-[15px]"
            style={{ width: 40, height: 40 }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-slate-900 truncate">{appt.client_name}</p>
            {appt.client_phone && (
              <p className="text-[12px] text-slate-400">{appt.client_phone}</p>
            )}
          </div>
        </div>

        {/* Tags row */}
        {(() => {
          const tags = []
          if (appt.no_show_count > 0) tags.push(
            <span key="ns" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              {appt.no_show_count} no-show{appt.no_show_count > 1 ? 's' : ''}
            </span>
          )
          if (isNew) tags.push(
            <span key="new" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">New client</span>
          )
          if (!isNew) tags.push(
            <span key="ret" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Returning</span>
          )
          if (appt.source === 'online' || appt.source === 'portal') tags.push(
            <span key="online" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Online</span>
          )
          if (appt.risk_level === 'high') tags.push(
            <span key="risk" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">High risk</span>
          )
          if (tags.length === 0) return null
          return <div className="flex flex-wrap gap-1.5">{tags}</div>
        })()}

        <div className="border-t border-slate-100" />

        {/* Notes / promo code */}
        {appt.notes && (
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-slate-600">{appt.notes}</p>
          </div>
        )}

        {/* Services */}
        {serviceNames.length > 0 ? (
          <div className="space-y-1.5">
            {serviceNames.map((svcName, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-800 truncate">{svcName}</span>
                  {i === 0 && appt.total_price != null && (
                    <span className="text-[13px] font-bold text-slate-900 shrink-0">
                      US$ {parseFloat(appt.total_price).toFixed(0)}
                    </span>
                  )}
                </div>
                {i === 0 && (
                  <p className="text-[11px] text-slate-400">
                    {[appt.staff_name, appt.duration_min ? `${appt.duration_min}min` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : appt.total_price != null ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-slate-800">Service</span>
            <span className="text-[13px] font-bold text-slate-900">US$ {parseFloat(appt.total_price).toFixed(0)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function activityLabel(a) {
  switch (a.action) {
    case 'status_changed': return `Status changed to ${(a.meta?.status || '').replace('_', ' ')}`
    case 'rescheduled':    return 'Rescheduled'
    case 'service_added':  return `Added service: ${a.meta?.service_name || ''}`
    case 'note_updated':   return 'Note updated'
    default:               return a.action
  }
}

function QuickActionsMenu({ appt, onRebook, onCheckout, dateStr, monthKey }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu') // menu | note | service | activity
  const [noteText, setNoteText] = useState(appt.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [svcQ, setSvcQ] = useState('')
  const [addingSvcId, setAddingSvcId] = useState(null)
  const [addSvcError, setAddSvcError] = useState('')
  const menuRef = useRef(null)

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(r => r.data),
    enabled: view === 'service',
  })
  const { data: activityLog = [], isLoading: activityLoading } = useQuery({
    queryKey: ['appt-activity', appt.id],
    queryFn: () => api.get(`/appointments/${appt.id}/activity`).then(r => r.data),
    enabled: view === 'activity',
  })

  function close() { setOpen(false); setView('menu') }

  useEffect(() => {
    if (!open) return
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) close() }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function saveNote() {
    setSavingNote(true)
    try {
      await api.patch(`/appointments/${appt.id}/notes`, { notes: noteText })
      qc.invalidateQueries(['appointments', dateStr])
      close()
    } finally {
      setSavingNote(false)
    }
  }

  async function addService(svc) {
    setAddingSvcId(svc.id)
    setAddSvcError('')
    try {
      await api.post(`/appointments/${appt.id}/services`, {
        service_id: svc.id, price: svc.price, duration_min: svc.duration_min, service_name: svc.name,
      })
      qc.invalidateQueries(['appointments', dateStr])
      qc.invalidateQueries(['appt-calendar', monthKey])
      close()
    } catch (err) {
      setAddSvcError(err?.response?.data?.error || 'Could not add that service')
    } finally {
      setAddingSvcId(null)
    }
  }

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(svcQ.toLowerCase()))

  return (
    <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => { setOpen(o => !o); setView('menu') }}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-30 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 w-56 py-1 text-left">
          {view === 'menu' && (
            <>
              <button onClick={() => setView('note')} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50 transition-colors">
                <FileText size={13} className="text-slate-400" /> {appt.notes ? 'Edit note' : 'Add note'}
              </button>
              <button onClick={() => setView('service')} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50 transition-colors">
                <Plus size={13} className="text-slate-400" /> Add service
              </button>
              <button onClick={() => setView('activity')} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50 transition-colors">
                <Activity size={13} className="text-slate-400" /> View activity
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => { close(); onRebook() }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50 transition-colors">
                <RefreshCw size={13} className="text-slate-400" /> Rebook
              </button>
              <button onClick={() => { close(); onCheckout() }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0D9488] hover:bg-teal-50 transition-colors">
                <CreditCard size={13} /> Checkout
              </button>
            </>
          )}

          {view === 'note' && (
            <div className="p-3 space-y-2">
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                placeholder="Allergies, preferences, special requests…"
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#0D9488] resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setView('menu')} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-500">Back</button>
                <button onClick={saveNote} disabled={savingNote} className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-semibold disabled:opacity-60">
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {view === 'service' && (
            <div className="p-2">
              <input
                autoFocus
                value={svcQ}
                onChange={e => setSvcQ(e.target.value)}
                placeholder="Search services…"
                className="w-full px-2.5 py-1.5 mb-1.5 rounded-lg border border-slate-200 text-[12.5px] outline-none focus:border-[#0D9488]"
              />
              {addSvcError && <p className="px-1 pb-1 text-[11px] text-red-500">{addSvcError}</p>}
              <div className="max-h-52 overflow-y-auto">
                {filteredServices.slice(0, 30).map(s => (
                  <button
                    key={s.id}
                    onClick={() => addService(s)}
                    disabled={addingSvcId === s.id}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left disabled:opacity-50"
                  >
                    <span className="text-[12px] text-slate-700 truncate">{s.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{addingSvcId === s.id ? '…' : `$${s.price}`}</span>
                  </button>
                ))}
                {filteredServices.length === 0 && <p className="text-[12px] text-slate-400 text-center py-3">No matching services</p>}
              </div>
              <button onClick={() => setView('menu')} className="w-full mt-1 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-500">Back</button>
            </div>
          )}

          {view === 'activity' && (
            <div className="p-3 max-h-64 overflow-y-auto">
              {activityLoading ? (
                <p className="text-[12px] text-slate-400 text-center py-3">Loading…</p>
              ) : activityLog.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-3">No activity recorded yet</p>
              ) : (
                <div className="space-y-2.5">
                  {activityLog.map((a, i) => (
                    <div key={i} className="text-[11.5px]">
                      <p className="font-semibold text-slate-700">{activityLabel(a)}</p>
                      <p className="text-slate-400">{a.actor_name || 'System'} · {new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setView('menu')} className="w-full mt-2 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-500">Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ApptCard({ appt, risk, expanded, onToggle, onStatusChange, onCheckIn, onCheckOut, onRebook, onCheckout, dateStr, monthKey }) {
  const isNew = appt.client_name && !appt.is_returning
  const riskLevel = risk?.risk_level
  const [hoverRect, setHoverRect] = useState(null)
  const cardRef = useRef(null)
  return (
    <div
      className="px-4 py-3 hover:bg-slate-50 transition-colors"
      ref={cardRef}
      onMouseEnter={() => setHoverRect(cardRef.current?.getBoundingClientRect())}
      onMouseLeave={() => setHoverRect(null)}
    >
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
              <QuickActionsMenu appt={appt} onRebook={onRebook} onCheckout={onCheckout} dateStr={dateStr} monthKey={monthKey} />
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
          {appt.status === 'no_show' && appt.deposit_paid > 0 && (
            <span className={cn(
              'inline-block ml-1 mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
              appt.deposit_charged
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            )}>
              {appt.deposit_charged
                ? `Deposit charged $${appt.deposit_paid.toFixed(2)}`
                : 'Deposit not charged'}
            </span>
          )}
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
      {hoverRect && ReactDOM.createPortal(
        <ApptHoverCard appt={appt} rect={hoverRect} />,
        document.body
      )}
    </div>
  )
}

function BookAppointmentModal({ date, onClose, onDone, rebookParams, bookPrefill }) {
  const { data: allClients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients?q=').then(r => r.data) })
  const { data: staff = [] }      = useQuery({ queryKey: ['staff'],   queryFn: () => api.get('/staff').then(r => r.data) })
  const { data: services = [] }   = useQuery({ queryKey: ['services'],queryFn: () => api.get('/services').then(r => r.data) })
  const { data: resources = [] }  = useQuery({ queryKey: ['resources'],queryFn: () => api.get('/resources').then(r => r.data) })

  // Client search — prefilled when opened via Rebook
  const [clientQ, setClientQ]         = useState(() => bookPrefill?.clientName || '')
  const [selectedClient, setSelectedClient] = useState(() => bookPrefill?.clientId ? {
    id: bookPrefill.clientId,
    first_name: (bookPrefill.clientName || '').split(' ')[0] || '',
    last_name: (bookPrefill.clientName || '').split(' ').slice(1).join(' '),
    phone: bookPrefill.clientPhone || '',
  } : null)
  const [showNewClient, setShowNewClient]   = useState(false)
  const [newClient, setNewClient]     = useState({ first_name:'', last_name:'', phone:'', email:'' })
  const [savingClient, setSavingClient] = useState(false)

  // Service selection — prefilled when opened via Rebook
  const [svcQ, setSvcQ]               = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState(() => bookPrefill?.services || [])
  const [expandedCat, setExpandedCat] = useState(null)
  const [svcListOpen, setSvcListOpen] = useState(true)

  // Booking fields — prefilled when opened by clicking an empty grid slot
  const [staffId, setStaffId]         = useState(() => bookPrefill?.staffId ? String(bookPrefill.staffId) : '')
  const [resourceId, setResourceId]   = useState('')
  const [startTime, setStartTime]     = useState(() => bookPrefill?.time || '10:00')
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

  // Only staff who can perform every selected service (a service with no
  // staff_ids restriction is open to everyone).
  const eligibleStaff = useMemo(() => staff.filter(s =>
    selectedSvcs.every(svc => !svc.staff_ids?.length || svc.staff_ids.includes(s.id))
  ), [staff, selectedSvcs])

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
    if (!eligibleStaff.some(s => String(s.id) === String(staffId))) {
      setErr('The selected team member cannot perform one of the chosen services'); return
    }
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
        resource_id: resourceId ? +resourceId : undefined,
        source: 'reception',
        services: selectedSvcs.map(s => ({ service_id: s.id, price: s.price, duration_min: s.duration_min })),
      })
      onDone()
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to book appointment') }
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
            <button
              type="button"
              onClick={() => setSvcListOpen(o => !o)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] flex items-center justify-center text-[11px] font-bold">2</div>
                <span className="text-[13px] font-bold text-slate-700">Select Services</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedSvcs.length > 0 && (
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {selectedSvcs.length} selected · ${totalPrice.toFixed(2)} · {totalDuration}min
                  </span>
                )}
                <ChevronDown size={15} className={cn('text-slate-400 transition-transform', svcListOpen && 'rotate-180')} />
              </div>
            </button>

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

            {svcListOpen && (
            <>
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
            </>
            )}
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
                  {eligibleStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
                {selectedSvcs.length > 0 && eligibleStaff.length < staff.length && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Showing only team members who can perform the selected service{selectedSvcs.length > 1 ? 's' : ''}.
                  </p>
                )}
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
            {resources.length > 0 && (
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room / Chair / Station</label>
                <select
                  value={resourceId}
                  onChange={e => setResourceId(e.target.value)}
                  className={inp}
                >
                  <option value="">None</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
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
