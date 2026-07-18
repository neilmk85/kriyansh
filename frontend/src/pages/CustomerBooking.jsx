import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Clock, X, CalendarDays, User, Sparkles, Pencil, Search } from 'lucide-react'

const PROMO_CODES = {
  FIRST10:  { type: 'percent', val: 10 },
  WELCOME15: { type: 'percent', val: 15 },
  BEAUTY20:  { type: 'percent', val: 20 },
  GLOW50:    { type: 'amount', val: 50 },
  VIP100:    { type: 'amount', val: 100 },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function buildCalendar(year, month) {
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}

function to12h(t24) {
  if (!t24) return ''
  const [h, m] = t24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function toDateStr(year, month, day) {
  return [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-')
}

function buildStartAt(year, month, day, time24) {
  const [h, m] = time24.split(':').map(Number)
  return new Date(year, month, day, h, m, 0).toISOString()
}

function Stars({ filled = 5, size = 12 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i < Math.round(filled) ? '#FBBF24' : '#E5E7EB'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

export default function CustomerBooking() {
  const navigate = useNavigate()
  const location = useLocation()
  const preSelectedStaffId = location.state?.staffId ?? null
  const STEPS = ['Services', 'Date & Time', 'Stylist', 'Confirm']

  const [cart, setCart] = useState(location.state?.cart || [])
  const [editingServices, setEditingServices] = useState(false)
  const [svcSearch, setSvcSearch] = useState('')
  const [svcCategory, setSvcCategory] = useState('All')

  const today = new Date()
  const [step, setStep] = useState(0)
  const [selectedStaff, setSelectedStaff] = useState(preSelectedStaffId)
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay,  setSelectedDay]  = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null) // "HH:MM" 24h
  const [confirmed, setConfirmed] = useState(false)
  const [bookError, setBookError] = useState('')

  const [depositPaid, setDepositPaid] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherApplied, setVoucherApplied] = useState(null)
  const [voucherError, setVoucherError] = useState('')
  const [recurring, setRecurring] = useState(null)

  // ── API queries ──────────────────────────────────────────────────────
  const { data: staffRaw = [] } = useQuery({
    queryKey: ['public-staff'],
    queryFn: () => axios.get('/api/public/staff').then(r => r.data),
  })
  const staffList = useMemo(() => [
    { id: 0, name: 'Any Available', specialization: 'First available stylist', color: '#6366F1' },
    ...staffRaw,
  ], [staffRaw])

  const { data: servicesRaw = [] } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => axios.get('/api/public/services').then(r => r.data),
  })
  const services = useMemo(() =>
    servicesRaw.map(s => ({ ...s, duration: s.duration_min, category: s.category_name })),
    [servicesRaw]
  )
  const categories = useMemo(() =>
    ['All', ...Array.from(new Set(services.map(s => s.category_name).filter(Boolean)))],
    [services]
  )

  const effectiveStaffId = selectedStaff ?? 0
  const dateStr = selectedDay ? toDateStr(viewYear, viewMonth, selectedDay) : ''

  const { data: slots = [], isFetching: slotsLoading } = useQuery({
    queryKey: ['public-slots', effectiveStaffId, dateStr],
    queryFn: () => axios.get(`/api/public/slots?staff_id=${effectiveStaffId}&date=${dateStr}`).then(r => r.data),
    enabled: !!dateStr,
  })

  const bookMutation = useMutation({
    mutationFn: (body) => axios.post('/api/public/appointments', body).then(r => r.data),
    onSuccess: () => { setConfirmed(true); setBookError('') },
    onError: (err) => setBookError(err.response?.data?.error || 'Booking failed. Please try again.'),
  })

  // ── Derived ──────────────────────────────────────────────────────────
  const cells = buildCalendar(viewYear, viewMonth)
  const total    = cart.reduce((s, x) => s + x.price, 0)
  const duration = cart.reduce((s, x) => s + (x.duration_min ?? x.duration ?? 0), 0)

  const advanceSettings = (() => {
    try { return JSON.parse(localStorage.getItem('ks_advance_payment')) || { enabled: false, percent: 25 } }
    catch { return { enabled: false, percent: 25 } }
  })()
  const depositAmt = advanceSettings.enabled && total > 0
    ? Math.round(total * advanceSettings.percent / 100)
    : 0

  const finalTotal = (() => {
    if (!voucherApplied) return total
    if (voucherApplied.type === 'percent') return Math.max(0, total - Math.round(total * voucherApplied.val / 100))
    return Math.max(0, total - voucherApplied.val)
  })()

  const staffLabel = (() => {
    const member = staffList.find(s => s.id === effectiveStaffId)
    return member?.name || 'Any Available'
  })()

  const dateLabel = selectedDay
    ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  const filteredSvcs = services.filter(s => {
    const matchCat = svcCategory === 'All' || s.category_name === svcCategory
    const matchQ   = s.name.toLowerCase().includes(svcSearch.toLowerCase())
    return matchCat && matchQ
  })

  // ── Helpers ──────────────────────────────────────────────────────────
  function applyVoucher() {
    const code = voucherCode.trim().toUpperCase()
    const found = PROMO_CODES[code]
    if (!found) { setVoucherApplied(null); setVoucherError('Invalid promo code.'); return }
    setVoucherApplied(found); setVoucherError('')
  }

  function toggleService(svc) {
    setCart(c => c.find(x => x.id === svc.id) ? c.filter(x => x.id !== svc.id) : [...c, svc])
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null); setSelectedSlot(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null); setSelectedSlot(null)
  }

  function isPast(d) {
    const cell = new Date(viewYear, viewMonth, d)
    cell.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return cell < t
  }

  function canNext() {
    if (step === 0) return cart.length > 0
    if (step === 1) return selectedDay && selectedSlot
    if (step === 2) return true
    if (step === 3) return depositAmt === 0 || depositPaid
    return true
  }

  function handleNext() {
    if (step < 3) { setStep(s => s + 1); return }
    setBookError('')
    const customer = (() => {
      try { return JSON.parse(localStorage.getItem('salonos_customer')) || {} }
      catch { return {} }
    })()
    bookMutation.mutate({
      first_name: customer.first_name || '',
      last_name:  customer.last_name  || '',
      email:      customer.email      || '',
      phone:      customer.phone      || '',
      service_ids: cart.map(s => s.id),
      staff_id:   effectiveStaffId,
      start_at:   buildStartAt(viewYear, viewMonth, selectedDay, selectedSlot),
      notes:      '',
      payment_intent_id: '',
      deposit_paid: 0,
    })
  }

  // ── Confirmation screen ───────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
            <Check size={36} className="text-white" strokeWidth={3} />
          </div>
          <h1 className="text-[26px] font-black text-slate-900 mb-1">You're booked!</h1>
          <p className="text-[14px] text-slate-500 mb-6">
            We'll send a confirmation to your phone. See you soon!
          </p>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 text-left mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                <CalendarDays size={15} className="text-white" />
              </div>
              <div>
                <div className="text-[12px] text-slate-400 font-medium">Date & Time</div>
                <div className="text-[14px] font-bold text-slate-800">{dateLabel} · {to12h(selectedSlot)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                <User size={15} className="text-white" />
              </div>
              <div>
                <div className="text-[12px] text-slate-400 font-medium">Stylist</div>
                <div className="text-[14px] font-bold text-slate-800">{staffLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <div className="text-[12px] text-slate-400 font-medium">Services</div>
                <div className="text-[14px] font-bold text-slate-800">
                  {cart.map(s => s.name).join(', ')}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-[13px] text-slate-500">Total · {duration} min</span>
              <div className="flex items-center gap-2">
                {finalTotal < total && (
                  <span className="text-[13px] text-slate-400 line-through">${total}</span>
                )}
                <span className="text-[15px] font-black text-slate-800">${finalTotal}</span>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/home')}
            className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-slate-800">Book appointment</div>
            <div className="text-[11px] text-slate-400">Kriyansh Beauty Bar</div>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className={`transition-all rounded-full ${i === step ? 'w-6 h-2' : 'w-2 h-2'} ${i <= step ? 'bg-[#0D9488]' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-32">

        {/* ── Services summary pill (hidden on step 0 — that step IS service selection) */}
        {step > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap flex-1 min-w-0 mr-3">
              {cart.length === 0
                ? <span className="text-[12px] text-slate-400 italic">No services selected</span>
                : cart.map(s => (
                    <span key={s.id} className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 pl-2.5 pr-1.5 py-1 rounded-full">
                      {s.name}
                      <button onClick={() => toggleService(s)}
                        className="w-3.5 h-3.5 rounded-full bg-slate-300 hover:bg-red-400 flex items-center justify-center transition-colors">
                        <X size={8} className="text-white" />
                      </button>
                    </span>
                  ))
              }
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[13px] font-black text-slate-800">${total}</div>
                <div className="text-[11px] text-slate-400">~{duration} min</div>
              </div>
              <button onClick={() => setEditingServices(v => !v)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border-2 ${editingServices ? 'border-[#0D9488] bg-teal-50 text-[#0D9488]' : 'border-slate-200 text-slate-400 hover:border-[#0D9488] hover:text-[#0D9488]'}`}>
                <Pencil size={13} />
              </button>
            </div>
          </div>

          {editingServices && (
            <div className="border-t border-slate-100 px-4 pt-3 pb-4 space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                  placeholder="Search services…"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-[#0D9488] transition-all" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSvcCategory(cat)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${svcCategory === cat ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500'}`}
                    style={svcCategory === cat ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {filteredSvcs.map(svc => {
                  const inCart = cart.find(x => x.id === svc.id)
                  return (
                    <button key={svc.id} onClick={() => toggleService(svc)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all text-left ${inCart ? 'border-[#0D9488] bg-teal-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <div>
                        <span className="text-[13px] font-semibold text-slate-800">{svc.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                            <Clock size={9} /> ~{svc.duration_min} min
                          </span>
                          {svc.price > 0 && <span className="text-[11px] font-bold text-slate-600">${svc.price}</span>}
                          {svc.price === 0 && <span className="text-[11px] font-bold text-emerald-600">Free</span>}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${inCart ? 'border-[#0D9488] bg-[#0D9488]' : 'border-slate-300'}`}>
                        {inCart && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        )}

        {/* ── Step label ─────────────────────────────── */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-[#0D9488] uppercase tracking-widest mb-0.5">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-[22px] font-black text-slate-900">{STEPS[step]}</h2>
        </div>

        {/* ══ STEP 0 — Services ═══════════════════════ */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSvcCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${svcCategory === cat ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  style={svcCategory === cat ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] outline-none focus:border-[#0D9488] transition-all" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
              {filteredSvcs.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] text-slate-400">No services found</div>
              )}
              {filteredSvcs.map(svc => {
                const inCart = cart.find(x => x.id === svc.id)
                return (
                  <button key={svc.id} onClick={() => toggleService(svc)}
                    className={`w-full flex items-center justify-between px-4 py-4 text-left transition-colors ${inCart ? 'bg-teal-50/60' : 'hover:bg-slate-50/60'}`}>
                    <div className="flex-1 min-w-0 pr-4">
                      <span className="text-[14px] font-semibold text-slate-800">{svc.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[12px] text-slate-500">
                          <Clock size={10} className="text-slate-400" />~{svc.duration_min} min
                        </span>
                        {svc.price > 0 && <span className="text-[13px] font-bold text-slate-700">from ${svc.price}</span>}
                        {svc.price === 0 && <span className="text-[13px] font-bold text-emerald-600">Free</span>}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${inCart ? 'border-[#0D9488] bg-[#0D9488]' : 'border-slate-300'}`}>
                      {inCart && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ STEP 2 — Stylist ════════════════════════ */}
        {step === 2 && (
          <div className="space-y-3">
            {staffList.map(member => (
              <button key={member.id} onClick={() => setSelectedStaff(member.id)}
                className={`w-full flex items-center gap-4 bg-white rounded-2xl border-2 p-4 text-left transition-all ${selectedStaff === member.id ? 'border-[#0D9488] shadow-md' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: member.color || 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-slate-800">{member.name}</div>
                  <div className="text-[12px] text-slate-500">{member.specialization}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedStaff === member.id ? 'border-[#0D9488] bg-[#0D9488]' : 'border-slate-300'}`}>
                  {selectedStaff === member.id && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ══ STEP 1 — Date & Time ════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <ChevronLeft size={16} className="text-slate-500" />
                </button>
                <span className="text-[14px] font-bold text-slate-800">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />
                  const past = isPast(d)
                  const sel  = selectedDay === d
                  return (
                    <button key={d} disabled={past}
                      onClick={() => { setSelectedDay(d); setSelectedSlot(null) }}
                      className={`mx-auto w-9 h-9 rounded-full text-[13px] font-semibold transition-all flex items-center justify-center
                        ${past ? 'text-slate-300 cursor-not-allowed' : sel ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}`}
                      style={sel ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedDay && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-slate-400" />
                  <span className="text-[14px] font-bold text-slate-700">Available times</span>
                  {slotsLoading && <span className="text-[12px] text-slate-400 ml-auto">Loading…</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(slot => {
                    const sel = selectedSlot === slot.time
                    return (
                      <button key={slot.time} disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`py-2.5 rounded-xl text-[13px] font-semibold transition-all border-2
                          ${!slot.available
                            ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50 line-through'
                            : sel
                              ? 'text-white border-transparent shadow-md'
                              : 'border-slate-200 text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]'}`}
                        style={sel ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                        {to12h(slot.time)}
                      </button>
                    )
                  })}
                  {!slotsLoading && slots.length === 0 && (
                    <div className="col-span-3 text-center text-[13px] text-slate-400 py-4">
                      No available slots for this date
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3 — Confirm ════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
              {cart.map(svc => (
                <div key={svc.id} className="flex items-center justify-between px-4 py-3.5">
                  <div>
                    <div className="text-[14px] font-semibold text-slate-800">{svc.name}</div>
                    <div className="text-[12px] text-slate-400">{svc.duration_min ?? svc.duration} min</div>
                  </div>
                  <span className="text-[14px] font-bold text-slate-700">${svc.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50">
                <span className="text-[13px] font-bold text-slate-700">Total</span>
                <div className="flex items-center gap-2">
                  {finalTotal < total && (
                    <span className="text-[13px] text-slate-400 line-through">${total}</span>
                  )}
                  <span className="text-[16px] font-black text-slate-900">${finalTotal}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                  <CalendarDays size={15} className="text-white" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Date & Time</div>
                  <div className="text-[14px] font-bold text-slate-800">{dateLabel}</div>
                  <div className="text-[13px] text-slate-500">{to12h(selectedSlot)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                  <User size={15} className="text-white" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Stylist</div>
                  <div className="text-[14px] font-bold text-slate-800">{staffLabel}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4">
              <div className="text-[13px] font-bold text-slate-700 mb-3">Promo Code</div>
              {voucherApplied ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[#0D9488]">
                      {voucherCode.trim().toUpperCase()} applied
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {voucherApplied.type === 'percent'
                        ? `${voucherApplied.val}% off — saving $${total - finalTotal}`
                        : `$${voucherApplied.val} off`}
                    </div>
                  </div>
                  <button
                    onClick={() => { setVoucherApplied(null); setVoucherCode(''); setVoucherError('') }}
                    className="text-[12px] text-slate-400 hover:text-red-500 transition-colors font-medium">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={voucherCode}
                    onChange={e => { setVoucherCode(e.target.value); setVoucherError('') }}
                    onKeyDown={e => e.key === 'Enter' && applyVoucher()}
                    placeholder="Enter code…"
                    className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-[#0D9488] transition-all uppercase placeholder:normal-case" />
                  <button
                    onClick={applyVoucher}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                    Apply
                  </button>
                </div>
              )}
              {voucherError && (
                <div className="text-[12px] text-red-500 mt-2">{voucherError}</div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4">
              <div className="text-[13px] font-bold text-slate-700 mb-3">Frequency</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'One-time', value: null },
                  { label: 'Weekly', value: 'Weekly' },
                  { label: 'Every 2 Weeks', value: 'Every 2 Weeks' },
                  { label: 'Monthly', value: 'Monthly' },
                ].map(opt => {
                  const active = recurring === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setRecurring(opt.value)}
                      className={`px-3.5 py-2 rounded-full text-[12px] font-semibold border-2 transition-all ${active ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      style={active ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
              <div className="text-[12px] font-bold text-slate-600 mb-0.5">Cancellation policy</div>
              <div className="text-[12px] text-slate-500 leading-relaxed">
                Free cancellation up to 24 hours before your appointment. Late cancellations may incur a fee.
              </div>
            </div>

            {depositAmt > 0 && (
              <div className="bg-white rounded-2xl border-2 border-[#0D9488]/20 shadow-sm px-4 py-4">
                <div className="text-[13px] font-bold text-slate-700 mb-1">Deposit Required</div>
                <div className="text-[12px] text-slate-500 mb-3">
                  A deposit of <span className="font-bold text-slate-700">${depositAmt}</span> ({advanceSettings.percent}%) is required to confirm your booking.
                </div>
                {depositPaid ? (
                  <div className="flex items-center gap-2 text-[13px] font-bold text-emerald-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                    Deposit paid — ${depositAmt}
                  </div>
                ) : (
                  <button
                    onClick={() => setDepositPaid(true)}
                    className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                    Pay Deposit — ${depositAmt}
                  </button>
                )}
              </div>
            )}

            {bookError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-[13px] text-red-600 font-medium">
                {bookError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky bottom CTA ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 p-4 shadow-xl">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleNext}
            disabled={!canNext() || bookMutation.isPending}
            className={`w-full py-4 rounded-2xl text-white text-[15px] font-bold transition-all ${canNext() && !bookMutation.isPending ? 'shadow-lg hover:opacity-90 active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
            {bookMutation.isPending
              ? 'Confirming…'
              : step === 0 ? 'Choose Date & Time →'
              : step === 1 ? 'Choose Stylist →'
              : step === 2 ? 'Review Booking →'
              : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
