import { useState } from 'react'
import { ChevronRight, Check, Calendar, Clock, Scissors, User } from 'lucide-react'

// ── Hardcoded services fallback ───────────────────────────────────────────────
const FALLBACK_SERVICES = [
  { id: 1, name: 'Haircut & Style',    price: 65,  duration_min: 45, emoji: '✂️' },
  { id: 2, name: 'Color & Highlights', price: 140, duration_min: 90, emoji: '🎨' },
  { id: 3, name: 'Blowout',            price: 50,  duration_min: 45, emoji: '💨' },
  { id: 4, name: 'Keratin Treatment',  price: 200, duration_min: 120, emoji: '✨' },
  { id: 5, name: 'Bridal Package',     price: 350, duration_min: 180, emoji: '👰' },
  { id: 6, name: 'Deep Conditioning',  price: 45,  duration_min: 30, emoji: '💧' },
]

// ── Generate next 14 days ─────────────────────────────────────────────────────
function getNext14Days() {
  const days = []
  const now = new Date()
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d)
  }
  return days
}

// ── Generate 30-min slots 9am–5pm ─────────────────────────────────────────────
function getTimeSlots() {
  const slots = []
  for (let h = 9; h < 17; h++) {
    slots.push(`${h}:00`)
    slots.push(`${h}:30`)
  }
  return slots
}

function formatSlot(slot) {
  const [hStr, mStr] = slot.split(':')
  const h = parseInt(hStr)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m} ${ampm}`
}

function formatDayShort(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const DAYS_14 = getNext14Days()
const TIME_SLOTS = getTimeSlots()

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = [
    { n: 1, label: 'Service', icon: Scissors },
    { n: 2, label: 'Date',    icon: Calendar },
    { n: 3, label: 'Time',    icon: Clock    },
    { n: 4, label: 'Info',    icon: User     },
  ]
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex flex-col items-center gap-1`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              step > s.n ? 'bg-[#0D9488] text-white' :
              step === s.n ? 'bg-[#0D9488] text-white ring-4 ring-[#CCFBF1]' :
              'bg-slate-100 text-slate-400'
            }`}>
              {step > s.n ? <Check size={16} /> : <s.icon size={15} />}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              step >= s.n ? 'text-[#0D9488]' : 'text-slate-400'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 mx-1 mb-4 transition-colors ${
              step > s.n ? 'bg-[#0D9488]' : 'bg-slate-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [service, setService] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [services] = useState(FALLBACK_SERVICES)

  function handleConfirm(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    setStep(5)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDFA] to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-5 text-center shadow-sm">
        <h1 className="text-[22px] font-black tracking-tight text-[#0D9488]">
          KRIYANSH <span className="text-slate-800">SALON</span>
        </h1>
        <p className="text-[13px] text-slate-400 mt-1">Beverly Hills · Book your appointment online</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">

        {step < 5 && <StepBar step={step} />}

        {/* ── Step 1: Pick service ────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-[20px] font-bold text-slate-800 mb-1">Choose a Service</h2>
            <p className="text-[13px] text-slate-400 mb-5">Select what you'd like today</p>
            <div className="grid grid-cols-2 gap-3">
              {services.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => { setService(svc); setStep(2) }}
                  className={`text-left p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                    service?.id === svc.id
                      ? 'border-[#0D9488] bg-[#F0FDFA]'
                      : 'border-slate-200 bg-white hover:border-[#0D9488] hover:bg-[#F0FDFA]'
                  }`}
                >
                  <div className="text-2xl mb-2">{svc.emoji}</div>
                  <p className="text-[14px] font-bold text-slate-800 leading-tight">{svc.name}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{svc.duration_min} min</p>
                  <p className="text-[15px] font-bold text-[#0D9488] mt-2">${svc.price}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Pick date ───────────────────────────────────── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-[#0D9488] mb-4 transition-colors">
              ← Back
            </button>
            <h2 className="text-[20px] font-bold text-slate-800 mb-1">Choose a Date</h2>
            <p className="text-[13px] text-slate-400 mb-5">Pick any date in the next 2 weeks</p>
            <div className="flex flex-wrap gap-2">
              {DAYS_14.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setDate(d); setStep(3) }}
                  className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                    date && d.toDateString() === date.toDateString()
                      ? 'bg-[#0D9488] text-white border-[#0D9488]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]'
                  }`}
                >
                  {formatDayShort(d)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Pick time ───────────────────────────────────── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-[#0D9488] mb-4 transition-colors">
              ← Back
            </button>
            <h2 className="text-[20px] font-bold text-slate-800 mb-1">Choose a Time</h2>
            <p className="text-[13px] text-slate-400 mb-5">{formatDayShort(date)}</p>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => { setTime(slot); setStep(4) }}
                  className={`py-2.5 rounded-xl text-[13px] font-semibold border transition-all ${
                    time === slot
                      ? 'bg-[#0D9488] text-white border-[#0D9488]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]'
                  }`}
                >
                  {formatSlot(slot)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Enter name + phone ──────────────────────────── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-[#0D9488] mb-4 transition-colors">
              ← Back
            </button>
            <h2 className="text-[20px] font-bold text-slate-800 mb-1">Your Details</h2>
            <p className="text-[13px] text-slate-400 mb-5">Just your name and phone number</p>

            {/* Booking summary */}
            <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-4 mb-5 space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-800">{service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">{formatDayShort(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-800">{formatSlot(time)}</span>
              </div>
              <div className="flex justify-between border-t border-[#CCFBF1] pt-1.5">
                <span className="text-slate-500">Price</span>
                <span className="font-bold text-[#0D9488]">${service?.price}</span>
              </div>
            </div>

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="3105551234"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#0D9488] text-white text-[15px] font-bold hover:bg-[#0f766e] transition-colors mt-2 shadow-lg shadow-teal-200"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        )}

        {/* ── Step 5: Confirmation ────────────────────────────────── */}
        {step === 5 && (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <Check size={36} className="text-green-600" />
            </div>
            <h2 className="text-[26px] font-black text-slate-800 mb-2">Booking Received!</h2>
            <p className="text-[15px] text-slate-500 mb-6">
              Thank you, <span className="font-semibold text-slate-800">{form.name}</span>.<br />
              We'll confirm via text to <span className="font-semibold text-slate-800">{form.phone}</span>.
            </p>

            <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-2xl p-5 mb-6 text-left space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-800">{service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">{formatDayShort(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-800">{formatSlot(time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-semibold text-slate-800">{service?.duration_min} min</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 text-[13px] text-slate-500">
              <p className="font-semibold text-slate-800 mb-1">📍 Kriyansh Salon</p>
              <p>123 Rodeo Drive, Beverly Hills, CA 90210</p>
              <p className="mt-1">Please arrive 5 minutes early.</p>
            </div>

            <button
              onClick={() => { setStep(1); setService(null); setDate(null); setTime(null); setForm({ name: '', phone: '' }) }}
              className="w-full py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
