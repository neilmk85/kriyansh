import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, Activity, Wallet, MessageSquare, Heart, FileText, Settings,
  LogOut, ArrowLeft, Camera, CreditCard, Plus, Trash2, Bell, Lock,
  AlertTriangle, Check, ChevronRight, ChevronDown, ChevronUp,
  Smartphone, Mail, Phone, Calendar, Star, Clock, X, Search,
  RotateCcw, XCircle, Gift, Package, Tag, RefreshCw, ChevronLeft,
} from 'lucide-react'




const SIDEBAR_ITEMS = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'activity',   label: 'Activity',   icon: Activity },
  { id: 'packages',    label: 'Packages',    icon: Package },
  { id: 'membership', label: 'Memberships', icon: CreditCard },
  { id: 'history',    label: 'History',     icon: Tag },
  { id: 'wallet',     label: 'Wallet',     icon: Wallet },
  { id: 'messages',   label: 'Messages',   icon: MessageSquare },
  { id: 'favourites', label: 'Favourites', icon: Heart },
  { id: 'forms',      label: 'Forms',      icon: FileText },
  { id: 'settings',   label: 'Settings',   icon: Settings },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TIME_SLOTS = (() => {
  const slots = []
  for (let h = 10; h <= 18; h++) {
    slots.push(`${h === 12 ? 12 : h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`)
    if (h < 18 || true) {
      if (h < 18) slots.push(`${h === 12 ? 12 : h > 12 ? h - 12 : h}:30 ${h < 12 ? 'AM' : 'PM'}`)
    }
  }
  return slots.filter((_, i) => i < 18)
})()

/* ── Toast ──────────────────────────────────────────────────── */
function Toast({ message }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-xl animate-fade-in">
      <Check size={14} className="text-emerald-400" /> {message}
    </div>
  )
}

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-indigo-500' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/* ── Sections ───────────────────────────────────────────────── */
function ProfileSection({ onSave, onRefresh }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', dob: '', gender: '' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) return
    fetch('/api/customer/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setForm({
        firstName: d.first_name || '',
        lastName:  d.last_name  || '',
        email:     d.email      || '',
        phone:     d.phone      || '',
        dob:       d.dob        || '',
        gender:    d.gender     || '',
      }))
      .catch(() => {})
  }, [])

  async function handleSave() {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name:  form.lastName,
          email:      form.email,
          gender:     form.gender,
          dob:        form.dob,
          sms_consent: true,
        }),
      })
      if (res.ok) {
        const stored = JSON.parse(localStorage.getItem('salonos_customer') || '{}')
        localStorage.setItem('salonos_customer', JSON.stringify({
          ...stored, first_name: form.firstName, last_name: form.lastName, email: form.email,
        }))
        onRefresh?.()
        onSave('Changes saved')
      } else {
        onSave('Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const rawPhone = form.phone.replace(/\D/g, '').slice(-4)
  const namePart = (form.firstName.slice(0, 4) || 'USER').toUpperCase().padEnd(4, 'X')
  const referralCode = namePart + rawPhone

  function handleCopy() {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-black text-slate-900 mb-1">Profile</h2>
        <p className="text-[13px] text-slate-400">Manage your personal information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-black"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
            {form.firstName[0]}
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center border-2 border-white">
            <Camera size={11} className="text-white" />
          </button>
        </div>
        <div>
          <div className="text-[15px] font-bold text-slate-900">{form.firstName} {form.lastName}</div>
          <div className="text-[12px] text-slate-400">{form.phone}</div>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'First name', key: 'firstName', type: 'text', col: 1 },
          { label: 'Last name',  key: 'lastName',  type: 'text', col: 1 },
          { label: 'Email',      key: 'email',     type: 'email', col: 2 },
          { label: 'Phone',      key: 'phone',     type: 'tel', col: 2, readOnly: true },
          { label: 'Date of birth', key: 'dob',   type: 'date', col: 1 },
          { label: 'Gender',     key: 'gender',    type: 'select', col: 1, options: ['','Male','Female','Non-binary','Prefer not to say'] },
        ].map(f => (
          <div key={f.key} className={f.col === 2 ? 'col-span-2' : ''}>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">{f.label}</label>
            {f.type === 'select' ? (
              <select value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] text-slate-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200">
                {f.options.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
              </select>
            ) : (
              <input type={f.type} value={form[f.key]} onChange={e => !f.readOnly && set(f.key, e.target.value)}
                readOnly={f.readOnly}
                className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none transition-all
                  ${f.readOnly ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Referral code */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
        <div className="text-[13px] font-bold text-slate-800">Referral Code</div>
        <div className="text-[12px] text-slate-500">Earn 100 bonus points when a friend books their first appointment.</div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 font-mono text-[15px] font-bold tracking-widest text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
            {referralCode}
          </div>
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'text-white'}`}
            style={copied ? {} : { background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
            {copied ? <><Check size={13}/> Copied</> : 'Copy Code'}
          </button>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="px-6 py-2.5 rounded-xl text-white text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

const ACTIVITY_FILTERS = [
  { id: 'all',          label: 'All',         icon: null },
  { id: 'appointment',  label: 'Appointments', icon: Calendar },
  { id: 'gift',         label: 'Gift Cards',   icon: Gift },
  { id: 'membership',   label: 'Memberships',  icon: Tag },
]

const STATUS_META = {
  confirmed: { label: 'Confirmed',  color: 'text-indigo-600 bg-indigo-50' },
  completed:  { label: 'Completed',  color: 'text-emerald-600 bg-emerald-50' },
  cancelled:  { label: 'Cancelled',  color: 'text-red-500 bg-red-50' },
  'no-show':  { label: 'No-show',    color: 'text-slate-500 bg-slate-100' },
}

const TYPE_ICON = {
  appointment: Calendar,
  gift:        Gift,
  membership:  Tag,
}

function ReviewModal({ item, onClose, onSubmit }) {
  const [stars, setStars] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-black text-slate-900">Leave a review</div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="text-[13px] text-slate-500 mb-4">{item.service} · {item.date}</div>
        <div className="flex gap-1.5 mb-4">
          {[1,2,3,4,5].map(n => (
            <button key={n} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} onClick={() => setStars(n)}>
              <Star size={28} className={n <= (hovered || stars) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
            </button>
          ))}
        </div>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Tell us about your experience…"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] resize-none focus:outline-none focus:border-indigo-400 mb-4" />
        <button onClick={() => onSubmit(stars, comment)} disabled={stars === 0}
          className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
          Submit review
        </button>
      </div>
    </div>
  )
}

function RescheduleCalendar({ item, onClose, onConfirm }) {
  const [rsYear] = useState(2026)
  const [rsMonth, setRsMonth] = useState(5)
  const [rsDay, setRsDay] = useState(null)
  const [rsTime, setRsTime] = useState(null)

  const TODAY_YEAR = 2026
  const TODAY_MONTH = 5
  const TODAY_DAY = 14

  const firstDow = new Date(rsYear, rsMonth, 1).getDay()
  const daysInMonth = new Date(rsYear, rsMonth + 1, 0).getDate()

  function isPast(day) {
    if (rsYear < TODAY_YEAR) return true
    if (rsYear === TODAY_YEAR && rsMonth < TODAY_MONTH) return true
    if (rsYear === TODAY_YEAR && rsMonth === TODAY_MONTH && day <= TODAY_DAY) return true
    return false
  }

  function prevMonth() {
    setRsMonth(m => {
      if (m === 0) return 0
      return m - 1
    })
    setRsDay(null)
    setRsTime(null)
  }

  function nextMonth() {
    setRsMonth(m => m + 1)
    setRsDay(null)
    setRsTime(null)
  }

  const slots = []
  for (let h = 10; h <= 18; h++) {
    const ampm = h < 12 ? 'AM' : 'PM'
    const display = h === 12 ? 12 : h > 12 ? h - 12 : h
    slots.push(`${display}:00 ${ampm}`)
    if (h < 18) slots.push(`${display}:30 ${ampm}`)
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="text-[14px] font-black text-slate-900 mb-3">Select new date & time</div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
          <ChevronLeft size={14} className="text-slate-500" />
        </button>
        <div className="text-[13px] font-bold text-slate-800">{MONTH_NAMES[rsMonth]} {rsYear}</div>
        <button onClick={nextMonth} className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50">
          <ChevronRight size={14} className="text-slate-500" />
        </button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-4">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const past = isPast(day)
          const selected = rsDay === day
          return (
            <button key={day} disabled={past} onClick={() => { setRsDay(day); setRsTime(null) }}
              className={`aspect-square rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center
                ${past ? 'text-slate-300 cursor-not-allowed' : selected ? 'text-white' : 'text-slate-700 hover:bg-indigo-50'}
              `}
              style={selected ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
              {day}
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {rsDay && (
        <>
          <div className="text-[12px] font-bold text-slate-500 mb-2">Available times</div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {slots.map(slot => (
              <button key={slot} onClick={() => setRsTime(slot)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                  ${rsTime === slot ? 'text-white border-transparent' : 'text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}
                `}
                style={rsTime === slot ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                {slot}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">
          Cancel
        </button>
        <button onClick={() => onConfirm(rsYear, rsMonth, rsDay, rsTime)} disabled={!rsDay || !rsTime}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
          Confirm Reschedule
        </button>
      </div>
    </div>
  )
}

function ManageModal({ item, onClose, onCancel, onReschedule }) {
  const [view, setView] = useState('menu')
  const [cancelReason, setCancelReason] = useState('')

  if (view === 'cancel') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-700 mb-4"><ChevronLeft size={14}/>Back</button>
        <div className="text-[16px] font-black text-slate-900 mb-1">Cancel appointment</div>
        <div className="text-[13px] text-slate-500 mb-4">{item.service} · {item.date} at {item.time}</div>
        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Reason (optional)</label>
        <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] mb-4 focus:outline-none focus:border-indigo-400">
          <option value="">Select a reason…</option>
          <option>Schedule conflict</option>
          <option>Feeling unwell</option>
          <option>Found another provider</option>
          <option>Other</option>
        </select>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Keep it</button>
          <button onClick={() => onCancel(item.id)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600">Cancel appointment</button>
        </div>
      </div>
    </div>
  )

  if (view === 'reschedule') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-700 mb-4"><ChevronLeft size={14}/>Back</button>
        <div className="text-[16px] font-black text-slate-900 mb-1">Reschedule appointment</div>
        <div className="text-[13px] text-slate-500 mb-2">{item.service} · currently {item.date} at {item.time}</div>
        <RescheduleCalendar
          item={item}
          onClose={onClose}
          onConfirm={(yr, mo, day, time) => onReschedule(item.id, yr, mo, day, time)}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-black text-slate-900">Manage appointment</div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 mb-5">
          <div className="text-[14px] font-bold text-slate-900">{item.service}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">with {item.staff} · {item.date} at {item.time}</div>
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
            <Clock size={11}/>{item.duration} min · ${item.amount}
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={() => setView('reschedule')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 rounded-2xl text-left hover:bg-indigo-100 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center"><RefreshCw size={15} className="text-indigo-600"/></div>
            <div>
              <div className="text-[13px] font-bold text-slate-900">Reschedule</div>
              <div className="text-[11px] text-slate-400">Pick a new date or time</div>
            </div>
          </button>
          <button onClick={() => setView('cancel')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 rounded-2xl text-left hover:bg-red-100 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center"><XCircle size={15} className="text-red-500"/></div>
            <div>
              <div className="text-[13px] font-bold text-red-600">Cancel appointment</div>
              <div className="text-[11px] text-slate-400">Free cancellation up to 24h before</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function toDisplayDate(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function toDisplayTime(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function apiApptToItem(a) {
  const durationMs = new Date(a.end_at) - new Date(a.start_at)
  return {
    id: a.id,
    type: 'appointment',
    service: a.services ? a.services.split(', ')[0] : 'Service',
    services: a.services ? a.services.split(', ') : [],
    staff: a.staff_name,
    date: toDisplayDate(a.start_at),
    time: toDisplayTime(a.start_at),
    status: a.status === 'no_show' ? 'no-show' : a.status,
    amount: a.total,
    duration: Math.round(durationMs / 60000),
    reviewed: false,
  }
}

function ActivitySection({ navigate, onSave }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewItem, setReviewItem] = useState(null)
  const [manageItem, setManageItem] = useState(null)
  const [loyalty, setLoyalty] = useState(null)

  function fetchAppointments() {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) { setLoading(false); return }
    return fetch('/api/customer/appointments', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data.map(apiApptToItem)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAppointments()
    const token = localStorage.getItem('salonos_customer_token')
    if (token) {
      fetch('/api/customer/loyalty', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data && typeof data.balance === 'number') setLoyalty(data) })
        .catch(() => {})
    }
  }, [])

  const upcoming = items.filter(a => a.status === 'confirmed')
  const past      = items.filter(a => a.status !== 'confirmed')

  function applyFilter(list) {
    return list
      .filter(a => filter === 'all' || a.type === filter)
      .filter(a => !search || a.service.toLowerCase().includes(search.toLowerCase()))
  }

  async function handleCancel(id) {
    const token = localStorage.getItem('salonos_customer_token')
    try {
      const res = await fetch(`/api/customer/appointments/${id}/cancel`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setItems(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
        onSave('Appointment cancelled')
      } else {
        const d = await res.json()
        onSave(d.error || 'Could not cancel')
      }
    } catch { onSave('Could not cancel') }
    setManageItem(null)
  }

  async function handleReschedule(id, yr, mo, day, time) {
    const token = localStorage.getItem('salonos_customer_token')
    // Convert display time like "10:00 AM" to ISO
    const [timePart, period] = time.split(' ')
    let [hh, mm] = timePart.split(':').map(Number)
    if (period === 'PM' && hh !== 12) hh += 12
    if (period === 'AM' && hh === 12) hh = 0
    const d = new Date(yr, mo, day, hh, mm)
    const startAt = d.toISOString()
    try {
      const res = await fetch(`/api/customer/appointments/${id}/reschedule`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_at: startAt }),
      })
      if (res.ok) {
        fetchAppointments()
        onSave('Appointment rescheduled')
      } else {
        const err = await res.json()
        onSave(err.error || 'Could not reschedule')
      }
    } catch { onSave('Could not reschedule') }
    setManageItem(null)
  }

  function handleReviewSubmit(starRating, reviewComment) {
    const item = reviewItem
    const existingReviews = JSON.parse(localStorage.getItem('ks_reviews') || '[]')
    existingReviews.push({
      id: existingReviews.length + 1,
      bookingId: item.id,
      service: item.service,
      staff: item.staff,
      date: item.date,
      rating: starRating,
      comment: reviewComment,
    })
    localStorage.setItem('ks_reviews', JSON.stringify(existingReviews))

    setItems(prev => {
      const updated = prev.map(a => a.id === item.id ? { ...a, reviewed: true } : a)
      persistNonStatic(updated)
      return updated
    })
    setReviewItem(null)
  }

  const upcomingFiltered = applyFilter(upcoming)
  const pastFiltered     = applyFilter(past)

  const grouped = pastFiltered.reduce((acc, a) => {
    const month = a.date.replace(/\d+,\s*/, '')
    if (!acc[month]) acc[month] = []
    acc[month].push(a)
    return acc
  }, {})

  const loyaltyBalance = loyalty?.balance ?? 0
  const loyaltyTier = loyalty?.tier_name || 'Bronze'

  const AppointmentCard = ({ a }) => {
    const Icon = TYPE_ICON[a.type] || Calendar
    const meta = STATUS_META[a.status]
    const isUpcoming = a.status === 'confirmed'

    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Icon size={20} className={a.type === 'membership' ? 'text-violet-500' : a.type === 'gift' ? 'text-pink-500' : 'text-indigo-400'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[14px] font-bold text-slate-900 leading-snug">{a.service}</div>
              <div className="text-[14px] font-black text-slate-800 shrink-0">${a.amount}</div>
            </div>
            {a.staff && (
              <div className="text-[12px] text-slate-400 mt-0.5">with {a.staff}</div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {a.date && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar size={10}/>{a.date}{a.time ? ` · ${a.time}` : ''}
                </div>
              )}
              {a.duration > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={10}/>{a.duration} min
                </div>
              )}
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.color}`}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>

        {(isUpcoming || a.status === 'completed' || a.status === 'cancelled') && (
          <div className="border-t border-slate-50 px-4 py-2.5 flex items-center gap-2">
            {isUpcoming && (
              <button onClick={() => setManageItem(a)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <Settings size={12}/> Manage
              </button>
            )}
            {(a.status === 'completed' || a.status === 'cancelled') && a.type === 'appointment' && (
              <button onClick={() => navigate('/home')}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <RotateCcw size={12}/> Rebook
              </button>
            )}
            {a.status === 'completed' && !a.reviewed && a.type === 'appointment' && (
              <button onClick={() => setReviewItem(a)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-yellow-600 hover:text-yellow-700 px-3 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                <Star size={12}/> Leave review
              </button>
            )}
            {a.status === 'completed' && a.reviewed && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400"><Check size={11}/> Reviewed</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const isEmpty = !loading && upcomingFiltered.length === 0 && pastFiltered.length === 0

  return (
    <div className="space-y-5">
      {reviewItem && <ReviewModal item={reviewItem} onClose={() => setReviewItem(null)} onSubmit={handleReviewSubmit} />}
      {manageItem && <ManageModal item={manageItem} onClose={() => setManageItem(null)} onCancel={handleCancel} onReschedule={handleReschedule} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-black text-slate-900">Activity</h2>
          <p className="text-[13px] text-slate-400">Your appointments, memberships & purchases</p>
        </div>
        <button onClick={() => setShowSearch(v => !v)}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <Search size={14} className="text-slate-500"/>
        </button>
      </div>

      {showSearch && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search activity…" autoFocus
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400"/>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {ACTIVITY_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all
              ${filter === f.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {f.icon && <f.icon size={11}/>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Loyalty summary card */}
      <div className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
        <div className="text-white">
          <div className="text-[18px] font-black">{loyaltyBalance} pts · {loyaltyTier} Member</div>
          <div className="text-[12px] opacity-70 mt-0.5">Your current loyalty balance</div>
        </div>
        <button onClick={() => navigate('/account?tab=wallet')}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[12px] font-bold transition-colors">
          View Loyalty
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4">
            <Calendar size={28} className="text-indigo-300"/>
          </div>
          <div className="text-[16px] font-black text-slate-700 mb-1">No activity</div>
          <div className="text-[13px] text-slate-400 max-w-[220px]">
            Your appointments, purchases and memberships will appear here
          </div>
          <button onClick={() => navigate('/home')}
            className="mt-5 px-5 py-2 rounded-xl text-[13px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            Book an appointment
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingFiltered.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Upcoming</div>
              <div className="space-y-3">
                {upcomingFiltered.map(a => <AppointmentCard key={a.id} a={a}/>)}
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([month, list]) => (
            <div key={month}>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{month}</div>
              <div className="space-y-3">
                {list.map(a => <AppointmentCard key={a.id} a={a}/>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WalletSection() {
  const [loyalty, setLoyalty] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) return
    fetch('/api/customer/loyalty', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data && typeof data.balance === 'number') setLoyalty(data) })
      .catch(() => {})
  }, [])

  const balance = loyalty?.balance ?? 0
  const tierName = loyalty?.tier_name || 'Bronze'
  const tierColor = loyalty?.tier_color || '#6366F1'
  const nextTier = loyalty?.next_tier_name
  const nextPts = loyalty?.next_tier_points || 500
  const rewards = loyalty?.rewards || []
  const pct = nextPts > 0 ? Math.min((balance / nextPts) * 100, 100) : 100

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-black text-slate-900 mb-1">Wallet</h2>
        <p className="text-[13px] text-slate-400">Your loyalty points and available rewards</p>
      </div>

      {/* Loyalty points card */}
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${tierColor} 0%, #6366F1 100%)` }}>
        <div className="text-[12px] font-semibold opacity-70 mb-1">Loyalty Points · {tierName}</div>
        <div className="text-[36px] font-black">{balance.toLocaleString()}</div>
        {nextTier && (
          <>
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] opacity-60 mt-1">{nextPts - balance} pts to {nextTier}</div>
          </>
        )}
      </div>

      {/* Available rewards */}
      {rewards.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-slate-700 mb-3">Available rewards</div>
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Gift size={18} className="text-amber-500 shrink-0" />
                <div>
                  <div className="text-[13px] font-bold text-slate-900">{r.name}</div>
                  <div className="text-[11px] text-slate-500">{r.reward_type === 'amount_off' ? `$${r.value} off` : r.reward_type === 'percent_off' ? `${r.value}% off` : r.reward_type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {loyalty?.transactions?.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-slate-700 mb-3">Recent points activity</div>
          <div className="space-y-1">
            {loyalty.transactions.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="text-[13px] text-slate-700">{t.description || (t.type === 'earn' ? 'Points earned' : t.type === 'redeem' ? 'Points redeemed' : 'Adjustment')}</div>
                <div className={`text-[13px] font-bold ${t.type === 'earn' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : '-'}{Math.abs(t.points)} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment info note */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
        <CreditCard size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-[13px] font-semibold text-slate-700">Payment methods</div>
          <div className="text-[12px] text-slate-400 mt-0.5">Payment methods are saved securely during checkout.</div>
        </div>
      </div>
    </div>
  )
}

function ComingSoon({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-300" />
      </div>
      <div className="text-[16px] font-black text-slate-700 mb-1">{title}</div>
      <div className="text-[13px] text-slate-400 max-w-[240px]">{description}</div>
      <span className="mt-4 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold">Coming soon</span>
    </div>
  )
}

function MessagesSection() {
  return <ComingSoon icon={MessageSquare} title="Messages" description="In-app messaging with the salon will be available soon." />
}


function FavouritesSection() {
  return <ComingSoon icon={Heart} title="Favourites" description="Save your favourite services for quick booking — coming soon." />
}

function FormsSection() {
  return <ComingSoon icon={FileText} title="Health Forms" description="Digital health intake forms will be available in a future update." />
}

/* ── Packages ───────────────────────────────────────────────── */
function PackagesSection() {
  const [packages, setPackages] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) return
    fetch('/api/customer/packages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPackages(Array.isArray(data) ? data : []))
      .catch(() => setPackages([]))
  }, [])

  const STATUS_COLOR = {
    active:     'bg-emerald-50 text-emerald-700',
    exhausted:  'bg-slate-100 text-slate-500',
    expired:    'bg-red-50 text-red-500',
    cancelled:  'bg-slate-100 text-slate-400',
  }

  if (packages === null) return <div className="py-12 text-center text-[13px] text-slate-400">Loading…</div>

  if (packages.length === 0) return (
    <div className="space-y-4">
      <div><h2 className="text-[22px] font-black text-slate-900 mb-1">Packages</h2><p className="text-[13px] text-slate-400">Your purchased service bundles</p></div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4"><Package size={24} className="text-indigo-300"/></div>
        <div className="text-[16px] font-black text-slate-700 mb-1">No packages yet</div>
        <div className="text-[13px] text-slate-400 max-w-[220px]">Service packages you purchase will appear here</div>
      </div>
    </div>
  )

  const active = packages.filter(p => p.status === 'active')
  const past   = packages.filter(p => p.status !== 'active')

  return (
    <div className="space-y-6">
      <div><h2 className="text-[22px] font-black text-slate-900 mb-1">Packages</h2><p className="text-[13px] text-slate-400">Your purchased service bundles</p></div>

      {active.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Active</div>
          <div className="space-y-3">
            {active.map(p => (
              <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">{p.name}</div>
                    {p.services && <div className="text-[12px] text-slate-400 mt-0.5">{p.services}</div>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[p.status] || 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[12px] text-slate-500">
                  <span>{p.used_count} / {p.total_qty} sessions used</span>
                  {p.expires_at && <span>Expires {new Date(p.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.total_qty > 0 ? (p.used_count / p.total_qty) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Past</div>
          <div className="space-y-3">
            {past.map(p => (
              <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 opacity-70">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-bold text-slate-700">{p.name}</div>
                    {p.services && <div className="text-[12px] text-slate-400 mt-0.5">{p.services}</div>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[p.status] || 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                </div>
                <div className="text-[12px] text-slate-400 mt-2">{p.used_count} / {p.total_qty} sessions · Purchased {new Date(p.purchased_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── History ────────────────────────────────────────────────── */
function HistorySection() {
  const [txns, setTxns] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) return
    fetch('/api/customer/transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setTxns(Array.isArray(data) ? data : []))
      .catch(() => setTxns([]))
  }, [])

  if (txns === null) return <div className="py-12 text-center text-[13px] text-slate-400">Loading…</div>

  if (txns.length === 0) return (
    <div className="space-y-4">
      <div><h2 className="text-[22px] font-black text-slate-900 mb-1">History</h2><p className="text-[13px] text-slate-400">Your payment receipts</p></div>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-3xl flex items-center justify-center mb-4"><Tag size={24} className="text-indigo-300"/></div>
        <div className="text-[16px] font-black text-slate-700 mb-1">No transactions yet</div>
        <div className="text-[13px] text-slate-400 max-w-[220px]">Your payment receipts will appear here</div>
      </div>
    </div>
  )

  const METHOD_ICON = { card: '💳', cash: '💵', tap: '📱' }

  return (
    <div className="space-y-5">
      <div><h2 className="text-[22px] font-black text-slate-900 mb-1">History</h2><p className="text-[13px] text-slate-400">Your payment receipts</p></div>
      <div className="space-y-2">
        {txns.map(t => (
          <div key={t.id} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">{METHOD_ICON[t.payment_method] || '💳'}</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{t.items || 'Services'}</div>
                <div className="text-[11px] text-slate-400">{t.staff_name ? `with ${t.staff_name} · ` : ''}{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-black text-slate-900">${Number(t.grand_total).toFixed(2)}</div>
              <div className={`text-[10px] font-bold ${t.status === 'completed' ? 'text-emerald-600' : t.status === 'refunded' ? 'text-amber-600' : 'text-red-500'}`}>{t.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MembershipSection() {
  const [membership, setMembership] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('salonos_customer_token')
    if (!token) { setLoading(false); return }
    fetch('/api/customer/membership', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMembership(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <h2 className="text-[20px] font-bold text-slate-900 mb-1">Memberships</h2>
      <p className="text-[13px] text-slate-400 mb-6">Your active membership plan</p>

      {!membership ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <Tag size={28} className="text-indigo-400" />
          </div>
          <p className="text-[16px] font-bold text-slate-700 mb-1">No active membership</p>
          <p className="text-[13px] text-slate-400">Ask your salon to set up a membership plan for you</p>
        </div>
      ) : (
        <div className="max-w-md">
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
            style={{ background: `linear-gradient(135deg, ${membership.color || '#0D9488'}, ${membership.color ? membership.color + 'cc' : '#6366F1'})` }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest mb-1">Active Plan</p>
                  <h3 className="text-[22px] font-black text-white">{membership.name}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Tag size={22} className="text-white" />
                </div>
              </div>
              {membership.description && (
                <p className="text-white/80 text-[13px] mb-5">{membership.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/15 rounded-xl px-4 py-3">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Monthly</p>
                  <p className="text-white text-[18px] font-black">${membership.price}</p>
                </div>
                {membership.discount_pct > 0 && (
                  <div className="bg-white/15 rounded-xl px-4 py-3">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Discount</p>
                    <p className="text-white text-[18px] font-black">{membership.discount_pct}% off</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-black/10 px-6 py-3 flex items-center justify-between">
              <span className="text-white/70 text-[12px]">Member since {membership.start_date}</span>
              {membership.next_billing_date && (
                <span className="text-white/70 text-[12px]">Renews {membership.next_billing_date}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsSection({ onSave, navigate }) {
  const [notifs, setNotifs] = useState({ smsAppt: true, whatsappAppt: true, emailMkt: true, smsMkt: true, whatsappMkt: false })
  const toggle = k => setNotifs(n => ({ ...n, [k]: !n[k] }))
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  async function handleChangePassword() {
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    if (pwForm.next.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true)
    const token = localStorage.getItem('salonos_customer_token')
    try {
      const res = await fetch('/api/customer/auth/password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwForm({ current: '', next: '', confirm: '' })
        onSave('Password updated')
      } else {
        setPwError(data.error || 'Failed to change password')
      }
    } catch { setPwError('Failed to change password') }
    finally { setPwSaving(false) }
  }
  const [showDelete, setShowDelete] = useState(false)
  const [cancelPolicy, setCancelPolicy] = useState(() => {
    const saved = localStorage.getItem('ks_cancel_policy')
    return saved ? JSON.parse(saved) : { type: 'percent', percent: 20 }
  })
  function saveCancelPolicy(patch) {
    const next = { ...cancelPolicy, ...patch }
    setCancelPolicy(next)
    localStorage.setItem('ks_cancel_policy', JSON.stringify(next))
    onSave('Cancellation policy saved')
  }
  const [advancePayment, setAdvancePayment] = useState(() => {
    const saved = localStorage.getItem('ks_advance_payment')
    return saved ? JSON.parse(saved) : { enabled: false, percent: 25 }
  })
  function saveAdvancePayment(patch) {
    const next = { ...advancePayment, ...patch }
    setAdvancePayment(next)
    localStorage.setItem('ks_advance_payment', JSON.stringify(next))
    onSave('Advance payment saved')
  }

  const Row = ({ label, k }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2.5">
        {k.includes('sms') || k.includes('whatsapp') ? <Smartphone size={14} className="text-slate-400" /> : <Mail size={14} className="text-slate-400" />}
        <span className="text-[14px] text-slate-700">{label}</span>
      </div>
      <Toggle on={notifs[k]} onChange={() => { toggle(k); onSave('Preferences saved') }} />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-black text-slate-900 mb-1">Settings</h2>
        <p className="text-[13px] text-slate-400">Manage your preferences and account</p>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-indigo-500" />
          <span className="text-[15px] font-bold text-slate-900">My notifications</span>
        </div>
        <p className="text-[12px] text-slate-400 mb-4">We will send you updates about your appointments, news and offers.</p>

        <div className="mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Appointment notifications</div>
        <Row label="Text message" k="smsAppt" />
        <Row label="WhatsApp" k="whatsappAppt" />

        <div className="mt-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Marketing notifications</div>
        <Row label="Email" k="emailMkt" />
        <Row label="Text message" k="smsMkt" />
        <Row label="WhatsApp" k="whatsappMkt" />

        <p className="text-[11px] text-slate-400 mt-3">If you previously opted out of text messages by texting STOP, please reply with START to opt back in.</p>
      </div>

      {/* Change password */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-indigo-500" />
          <span className="text-[15px] font-bold text-slate-900">Change password</span>
        </div>
        <div className="space-y-3">
          {[['current','Current password'],['next','New password'],['confirm','Confirm new password']].map(([k,lbl]) => (
            <div key={k}>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">{lbl}</label>
              <input type="password" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
            </div>
          ))}
          {pwError && <p className="text-[12px] text-red-500">{pwError}</p>}
          <button onClick={handleChangePassword} disabled={pwSaving || !pwForm.current || !pwForm.next}
            className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
            Update password
          </button>
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <XCircle size={16} className="text-indigo-500" />
          <span className="text-[15px] font-bold text-slate-900">Cancellation policy</span>
        </div>
        <p className="text-[12px] text-slate-400 mb-5">Set how cancellations are handled for your appointments.</p>

        <div className="space-y-3">
          <div onClick={() => saveCancelPolicy({ type: 'percent' })}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${cancelPolicy.type === 'percent' ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${cancelPolicy.type === 'percent' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {cancelPolicy.type === 'percent' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-900">Deduct % on cancellation</div>
              <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">A % of the advance amount paid is deducted as a cancellation fee. The remaining advance balance is refunded.</div>
              {cancelPolicy.type === 'percent' && (
                <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] font-semibold text-slate-500 shrink-0">Deduction</label>
                    <input type="number" min="1" max="100"
                      value={cancelPolicy.percent}
                      onChange={e => setCancelPolicy(p => ({ ...p, percent: Math.min(100, Math.max(1, Number(e.target.value))) }))}
                      className="w-16 border border-indigo-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-indigo-600 focus:outline-none focus:border-indigo-400 text-center bg-white" />
                    <span className="text-[12px] text-slate-500 font-semibold">% of advance paid</span>
                    <button onClick={() => saveCancelPolicy({ type: 'percent' })}
                      className="ml-auto px-3 py-1.5 rounded-lg text-[12px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>Save</button>
                  </div>
                  {(() => {
                    const adv = advancePayment.enabled ? advancePayment.percent : 25
                    const advAmt = adv
                    const deducted = Math.round(advAmt * cancelPolicy.percent / 100)
                    const refunded = advAmt - deducted
                    return (
                      <div className="text-[11px] bg-white border border-indigo-100 rounded-lg px-3 py-2 text-slate-600 space-y-0.5">
                        <div className="text-slate-400">Example: $100 service · ${adv} advance paid</div>
                        <div>
                          Deducted: <span className="font-bold text-red-500">${deducted}</span>
                          &nbsp;·&nbsp; Refunded: <span className="font-bold text-emerald-600">${refunded}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <div onClick={() => saveCancelPolicy({ type: 'advance' })}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${cancelPolicy.type === 'advance' ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${cancelPolicy.type === 'advance' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
              {cancelPolicy.type === 'advance' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-900">Non-refundable advance</div>
              <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">The advance amount collected at booking (set below) is forfeited on cancellation. No additional fee is charged.</div>
              {cancelPolicy.type === 'advance' && (
                <div className="mt-2 text-[11px] text-indigo-600 font-semibold">
                  Advance % is configured in the "Booking advance payment" card below.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Advance Payment */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-500" />
            <span className="text-[15px] font-bold text-slate-900">Booking advance payment</span>
          </div>
          <Toggle on={advancePayment.enabled} onChange={v => saveAdvancePayment({ enabled: v })} />
        </div>
        <p className="text-[12px] text-slate-400 mb-4">Require customers to pay a minimum % of the service total upfront when booking.</p>

        {advancePayment.enabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-[12px] font-semibold text-slate-500 shrink-0">Minimum advance</label>
              <input type="number" min="1" max="100"
                value={advancePayment.percent}
                onChange={e => setAdvancePayment(p => ({ ...p, percent: Math.min(100, Math.max(1, Number(e.target.value))) }))}
                className="w-16 border border-indigo-200 rounded-xl px-2 py-1.5 text-[13px] font-bold text-indigo-600 focus:outline-none focus:border-indigo-400 text-center" />
              <span className="text-[12px] text-slate-500 font-semibold">% of service total</span>
              <button onClick={() => saveAdvancePayment({})}
                className="ml-auto px-4 py-1.5 rounded-lg text-[12px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>Save</button>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">Example: $100 appointment</div>
              <div className="text-[13px] font-bold text-slate-800">
                Paid at booking: <span className="text-indigo-600">${advancePayment.percent}</span>
                &nbsp;·&nbsp;
                Due at appointment: <span className="text-slate-600">${100 - advancePayment.percent}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              This advance is collected when the customer confirms their booking. The remaining balance is due at the appointment.
            </div>
          </div>
        )}
      </div>

      {/* Delete account */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <span className="text-[15px] font-bold text-slate-900">Delete account</span>
        </div>
        <p className="text-[13px] text-slate-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="px-5 py-2.5 rounded-xl text-red-600 border border-red-200 bg-red-50 text-[13px] font-bold hover:bg-red-100 transition-colors">
            Delete my account
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="text-[13px] font-semibold text-red-700">Are you absolutely sure? Type <strong>DELETE</strong> to confirm.</div>
            <input placeholder="Type DELETE to confirm"
              className="w-full border border-red-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-red-400 bg-white" />
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600">Confirm delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────── */
export default function CustomerAccount() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = searchParams.get('tab') || 'profile'
  const [toast, setToast] = useState(null)
  const [customer, setCustomer] = useState(() => JSON.parse(localStorage.getItem('salonos_customer') || '{}'))

  function refreshCustomer() {
    setCustomer(JSON.parse(localStorage.getItem('salonos_customer') || '{}'))
  }

  function setSection(s) { setSearchParams({ tab: s }) }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {toast && <Toast message={toast} />}

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-8">

        {/* ── Sidebar ────────────────────────────────────── */}
        <aside className="w-56 shrink-0">
          {/* User chip */}
          <div className="flex items-center gap-3 mb-6 px-1">
            <button onClick={() => navigate('/home')} className="text-slate-400 hover:text-slate-700 mr-1">
              <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
              {(customer.first_name || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-900 truncate">{customer.first_name} {customer.last_name}</div>
              <div className="text-[11px] text-slate-400 truncate">{customer.phone}</div>
            </div>
          </div>

          <nav className="space-y-0.5">
            {SIDEBAR_ITEMS.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative
                  ${section === item.id ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}>
                <item.icon size={16} className={section === item.id ? 'text-indigo-500' : 'text-slate-400'} />
                <span className="text-[13px]">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center">{item.badge}</span>
                ) : null}
              </button>
            ))}

            <div className="pt-3 mt-3 border-t border-slate-200">
              <button onClick={() => navigate('/auth')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={16} className="text-red-400" />
                <span className="text-[13px]">Log out</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* ── Content ────────────────────────────────────── */}
        <main className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[600px]">
          {section === 'profile'    && <ProfileSection    onSave={showToast} onRefresh={refreshCustomer} />}
          {section === 'activity'   && <ActivitySection   navigate={navigate} onSave={showToast} />}
          {section === 'packages'    && <PackagesSection    />}
          {section === 'membership'  && <MembershipSection  />}
          {section === 'history'     && <HistorySection     />}
          {section === 'wallet'     && <WalletSection     />}
          {section === 'messages'   && <MessagesSection   />}
          {section === 'favourites' && <FavouritesSection />}
          {section === 'forms'      && <FormsSection      />}
          {section === 'settings'   && <SettingsSection   onSave={showToast} navigate={navigate} />}
        </main>
      </div>
    </div>
  )
}
