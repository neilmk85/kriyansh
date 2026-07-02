import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  User, Activity, Wallet, MessageSquare, Heart, Settings,
  LogOut, Camera, Edit3, Check, X, Star, Clock, Calendar,
  Gift, Scissors, Award, Bell, Lock, Trash2, Mail, Phone,
  CakeSlice, Users, Plus, Zap, CreditCard, RefreshCw,
  ChevronDown, ChevronRight, ChevronLeft, Search,
} from 'lucide-react'

/* ── mock data ─────────────────────────────────────────────────────────── */
const USER = {
  firstName: 'Nilesh', lastName: 'Kakade',
  email: 'nileshmk85@gmail.com', phone: '',
  dob: '', gender: '', tier: 'Gold',
  points: 1240, lifetime: 3850, memberSince: 'March 2023',
}

const UPCOMING = [
  { id: 1, service: 'Signature Haircut',  stylist: 'Aisha R.', date: 'Sun, 15 Jun 2026', time: '2:30 PM', duration: '60 min', price: 85  },
  { id: 2, service: 'Brow Sculpt & Tint', stylist: 'Priya M.', date: 'Tue, 24 Jun 2026', time: '11:00 AM',duration: '45 min', price: 55  },
]
const PAST = [
  { id: 3, service: 'Full Balayage + Toner', stylist: 'Aisha R.', date: 'Sat, 17 May 2026', time: '10:00 AM', price: 240, reviewed: false },
  { id: 4, service: 'Luxury Facial',         stylist: 'Zara K.',  date: 'Fri, 2 May 2026',  time: '3:00 PM',  price: 95,  reviewed: true  },
  { id: 5, service: 'Deep Tissue Massage',   stylist: 'Raj T.',   date: 'Mon, 14 Apr 2026', time: '1:30 PM',  price: 120, reviewed: true  },
  { id: 6, service: 'Gel Nail Art',          stylist: 'Priya M.',date: 'Sat, 5 Apr 2026',  time: '12:00 PM', price: 65,  reviewed: false },
]
const REWARDS = [
  { id: 1, name: '$10 off next visit',  type: 'amount_off',  status: 'available', earned: 'May 30, 2026' },
  { id: 2, name: '15% off any service', type: 'percent_off', status: 'available', earned: 'Apr 14, 2026' },
  { id: 3, name: 'Free blowdry',        type: 'free_service',status: 'used',      earned: 'Mar 22, 2026' },
]
const WALLET_TXN = [
  { pts: +15, label: 'Earned – Signature Haircut', date: 'May 17, 2026' },
  { pts: +24, label: 'Earned – Full Balayage',     date: 'Apr 17, 2026' },
  { pts: -50, label: 'Redeemed – $5 off',          date: 'Apr 5, 2026'  },
  { pts: +12, label: 'Earned – Luxury Facial',     date: 'Apr 2, 2026'  },
  { pts: +50, label: 'Welcome bonus',              date: 'Mar 10, 2026' },
]
const FAVOURITES = [
  { name: 'Signature Haircut',     category: 'Hair',   price: 85,  duration: '60 min',  rating: 4.9 },
  { name: 'Full Balayage + Toner', category: 'Colour', price: 240, duration: '180 min', rating: 5.0 },
  { name: 'Luxury Facial',         category: 'Facial', price: 95,  duration: '75 min',  rating: 4.8 },
]
const MESSAGES = [
  { id: 1, title: 'Appointment reminder',   body: 'Reminder: Signature Haircut with Aisha R. on Sun 15 Jun at 2:30 PM.',         time: '2h ago',  unread: true  },
  { id: 2, title: 'You earned 15 points!',  body: 'Great visit! You earned 15 loyalty points for your Haircut on May 17.',       time: 'May 17',  unread: true  },
  { id: 3, title: 'New reward unlocked 🎉', body: "Congrats! You've unlocked a \"$10 off next visit\" reward.",                  time: 'May 15',  unread: false },
  { id: 4, title: 'We miss you!',           body: "It's been a while — your hair deserves some love. Book your next visit.",     time: 'Apr 20',  unread: false },
  { id: 5, title: 'June Members Special',   body: 'Exclusive for Gold members: book any treatment in June and earn 2× points.', time: 'Jun 1',   unread: false },
]

function customerHeaders() {
  const token = localStorage.getItem('salonos_customer_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* no orange/amber — Bronze→teal, Silver→blue, Gold→indigo, Platinum→violet */
const TIER = {
  Bronze:   { color: '#0D9488', bg: '#F0FDF9', text: '#0F766E' },
  Silver:   { color: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  Gold:     { color: '#6366F1', bg: '#EEF2FF', text: '#4338CA' },
  Platinum: { color: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9' },
}
const TIER_NEXT = { Bronze: { next: 'Silver', threshold: 500 }, Silver: { next: 'Gold', threshold: 1500 }, Gold: { next: 'Platinum', threshold: 3000 }, Platinum: { next: null } }

const NAV = [
  { key: 'profile',    icon: User,          label: 'Profile'    },
  { key: 'activity',   icon: Activity,      label: 'Activity'   },
  { key: 'wallet',     icon: Wallet,        label: 'Wallet'     },
  { key: 'messages',   icon: MessageSquare, label: 'Messages',  badge: 2 },
  { key: 'favourites', icon: Heart,         label: 'Favourites' },
  { key: 'settings',   icon: Settings,      label: 'Settings'   },
]

/* ── Avatar ─────────────────────────────────────────────────────────────── */
function Av({ name, size = 40, editable, onEdit }) {
  const ini = name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full bg-[#0D9488] flex items-center justify-center text-white font-bold select-none"
        style={{ fontSize: size * 0.36 }}>
        {ini}
      </div>
      {editable && (
        <button onClick={onEdit}
          className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50">
          <Camera size={11} className="text-slate-500" />
        </button>
      )}
    </div>
  )
}

/* ── Tier badge ─────────────────────────────────────────────────────────── */
function TierBadge({ tier }) {
  const t = TIER[tier]; if (!t) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: t.bg, color: t.text }}>
      <Award size={9} strokeWidth={2.5} /> {tier}
    </span>
  )
}

/* ══ TREATMENTS PICKER ═════════════════════════════════════════════════════ */
const TREATMENT_CATEGORIES = [
  { key: 'all',       label: 'All treatments',      count: 113, icon: '✦',  color: '#6366F1' },
  { key: 'hair',      label: 'Hair & styling',       count: 24,  icon: '✂',  color: '#0D9488' },
  { key: 'colour',    label: 'Colour & highlights',  count: 18,  icon: '●',  color: '#3B82F6' },
  { key: 'nails',     label: 'Nails',                count: 16,  icon: '◆',  color: '#8B5CF6' },
  { key: 'brows',     label: 'Eyebrows & lashes',    count: 10,  icon: '〜', color: '#6366F1' },
  { key: 'facial',    label: 'Facials & skincare',   count: 14,  icon: '◎',  color: '#0D9488' },
  { key: 'massage',   label: 'Massage & body',       count: 12,  icon: '♦',  color: '#3B82F6' },
  { key: 'waxing',    label: 'Waxing & hair removal',count: 9,   icon: '▲',  color: '#8B5CF6' },
  { key: 'makeup',    label: 'Makeup',               count: 6,   icon: '★',  color: '#6366F1' },
  { key: 'spa',       label: 'Spa & wellness',       count: 4,   icon: '⬟',  color: '#0D9488' },
]

// SVG icons per category (Fresha-style outline icons in light indigo circles)
function CatIcon({ cat }) {
  const icons = {
    all:     <path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>,
    hair:    <path d="M6 3c0 3 3 5 3 8s-2 4-2 7M12 3c0 3 3 5 3 8s-2 4-2 7M18 3c0 3-2 5-2 8s2 4 2 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>,
    colour:  <><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    nails:   <><path d="M8 3h8v12a4 4 0 01-8 0V3z" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M8 7h8" stroke="currentColor" strokeWidth="1.8"/></>,
    brows:   <><path d="M4 10 Q12 5 20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M4 15 Q12 10 20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></>,
    facial:  <><circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M9 13s1 2 3 2 3-2 3-2M9.5 9h.5M14 9h.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    massage: <><path d="M5 14s0-7 7-7 7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M8 18c0-2 1.5-4 4-4s4 2 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/></>,
    waxing:  <><path d="M12 3L9 9H3l5 4-2 7 6-4 6 4-2-7 5-4h-6L12 3z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round"/></>,
    makeup:  <><path d="M12 2l1.5 5h5l-4 3 1.5 5L12 12l-4 3 1.5-5-4-3h5L12 2z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round"/></>,
    spa:     <><path d="M12 3c-4 4-5 8-2 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M12 3c4 4 5 8 2 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M8 21h8M12 14v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" className="text-[#6366F1]">
        {icons[cat] || icons.all}
      </svg>
    </div>
  )
}

function TreatmentsPicker({ onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = query.trim()
    ? TREATMENT_CATEGORIES.filter(c => c.key !== 'all' && c.label.toLowerCase().includes(query.toLowerCase()))
    : TREATMENT_CATEGORIES

  return (
    <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 w-[380px] overflow-hidden">
      {/* Search input */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus-within:border-[#6366F1] focus-within:bg-white transition-colors">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search treatments…"
            className="flex-1 text-[13px] outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Category list */}
      <div className="py-2 max-h-[340px] overflow-y-auto">
        {!query && (
          <p className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">All categories</p>
        )}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-[13px] text-slate-400 text-center">No treatments found for "{query}"</p>
        )}
        {filtered.map(cat => (
          <button key={cat.key}
            onClick={() => { onSelect(cat.key === 'all' ? 'All treatments' : cat.label); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group">
            <CatIcon cat={cat.key} />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium text-slate-800 group-hover:text-slate-900">{cat.label}</p>
            </div>
            <span className="text-[12px] text-slate-400 font-medium shrink-0">{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══ DATE-TIME PICKER ══════════════════════════════════════════════════════ */
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TIME_SLOTS = [
  { key: 'any',       label: 'Any time'  },
  { key: 'morning',   label: 'Morning',   sub: '9am – 12pm' },
  { key: 'afternoon', label: 'Afternoon', sub: '12pm – 5pm'  },
  { key: 'evening',   label: 'Evening',   sub: '5pm – 12am'  },
  { key: 'custom',    label: 'Custom'    },
]

function DateTimePicker({ onClose, onSelect }) {
  const today      = new Date(2026, 5, 13) // Jun 13 2026 (matches context date)
  const tomorrow   = new Date(2026, 5, 14)
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selDate, setSelDate] = useState(null)
  const [selTime, setSelTime] = useState('any')

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  // Build calendar grid (Mon-start)
  function buildGrid() {
    const first     = new Date(year, month, 1)
    const last      = new Date(year, month+1, 0)
    const startDay  = (first.getDay() + 6) % 7 // Mon=0
    const cells     = []
    for (let i = 0; i < startDay; i++) cells.push(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  function isToday(d)    { return d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate() }
  function isSelected(d) { return d && selDate && selDate.getFullYear() === year && selDate.getMonth() === month && selDate.getDate() === d }
  function isPast(d)     { return d && new Date(year, month, d) < today }

  function selectDate(d) {
    if (!d || isPast(d)) return
    setSelDate(new Date(year, month, d))
  }
  function selectQuick(date) { setYear(date.getFullYear()); setMonth(date.getMonth()); setSelDate(date) }

  function formatQuick(date) {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function handleApply() {
    const slot = TIME_SLOTS.find(t => t.key === selTime)
    const label = selDate
      ? `${selDate.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}${slot.key !== 'any' ? ` · ${slot.label}` : ''}`
      : slot.label
    onSelect(label)
    onClose()
  }

  const grid = buildGrid()

  return (
    <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 w-[620px] overflow-hidden">
      {/* Header bar with title + close */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-[13px] font-semibold text-slate-700">Select date &amp; time</span>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
          <X size={15} className="text-slate-400" />
        </button>
      </div>
      <div className="flex">
        {/* Left — quick picks */}
        <div className="w-[170px] shrink-0 border-r border-slate-100 p-4 flex flex-col gap-2">
          {[{ label: 'Today', date: today }, { label: 'Tomorrow', date: tomorrow }].map(({ label, date }) => (
            <button key={label}
              onClick={() => selectQuick(date)}
              className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left ${
                selDate && selDate.toDateString() === date.toDateString()
                  ? 'border-[#6366F1] bg-[#EEF2FF]'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <span className="text-[14px] font-semibold text-slate-900">{label}</span>
              <span className="text-[12px] text-slate-400 mt-0.5">{formatQuick(date)}</span>
            </button>
          ))}
        </div>

        {/* Right — calendar */}
        <div className="flex-1 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
            <span className="text-[14px] font-semibold text-slate-900">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map((d, i) => (
              <div key={i} className="flex items-center justify-center py-0.5">
                {d ? (
                  <button
                    onClick={() => selectDate(d)}
                    disabled={isPast(d)}
                    className={`w-8 h-8 rounded-full text-[13px] font-medium transition-all
                      ${isSelected(d) ? 'bg-[#6366F1] text-white font-semibold' : ''}
                      ${isToday(d) && !isSelected(d) ? 'border-2 border-[#6366F1] text-[#4338CA] font-semibold' : ''}
                      ${isPast(d) ? 'text-slate-300 cursor-not-allowed' : ''}
                      ${!isSelected(d) && !isToday(d) && !isPast(d) ? 'text-slate-700 hover:bg-slate-100' : ''}
                    `}>
                    {d}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time slots */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-semibold text-slate-500 shrink-0">Select time</span>
          {TIME_SLOTS.map(slot => (
            <button key={slot.key}
              onClick={() => setSelTime(slot.key)}
              className={`flex flex-col items-center px-4 py-2 rounded-xl border-2 text-[12px] font-semibold transition-all ${
                selTime === slot.key
                  ? 'border-[#6366F1] bg-[#EEF2FF] text-[#4338CA]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              <span>{slot.label}</span>
              {slot.sub && <span className="text-[10px] font-normal text-slate-400 mt-0.5">{slot.sub}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
        <button onClick={() => { setSelDate(null); setSelTime('any') }}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-700">
          Clear
        </button>
        <button onClick={handleApply}
          className="px-5 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-colors">
          Apply
        </button>
      </div>
    </div>
  )
}

/* ══ PROFILE TAB ═══════════════════════════════════════════════════════════ */
function ProfileTab({ user, setUser }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(user)

  const FIELDS = [
    { key: 'firstName', label: 'First name',   type: 'text',   icon: User       },
    { key: 'lastName',  label: 'Last name',    type: 'text',   icon: User       },
    { key: 'phone',     label: 'Phone number', type: 'tel',    icon: Phone      },
    { key: 'email',     label: 'Email',        type: 'email',  icon: Mail       },
    { key: 'dob',       label: 'Date of birth',type: 'date',   icon: CakeSlice  },
    { key: 'gender',    label: 'Gender',       type: 'select', icon: Users,
      opts: ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  ]

  const tierInfo = TIER_NEXT[user.tier]
  const pct = tierInfo.next
    ? Math.min((user.points / tierInfo.threshold) * 100, 100)
    : 100

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

      {/* ── Personal info ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          {editing
            ? <div className="flex items-center gap-2">
                <button onClick={() => { setDraft(user); setEditing(false) }}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
                  <X size={14} /> Cancel
                </button>
                <button onClick={() => { setUser(draft); setEditing(false) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-[13px] font-semibold hover:bg-[#0f766e]">
                  <Check size={13} /> Save changes
                </button>
              </div>
            : <button onClick={() => setEditing(true)}
                className="ml-auto text-[13px] font-semibold text-[#0D9488] hover:underline">
                Edit
              </button>
          }
        </div>

        {/* avatar + name */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
          <Av name={`${user.firstName} ${user.lastName}`} size={64} editable={editing} />
          <div>
            <p className="text-[17px] font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
            <div className="flex items-center gap-2 mt-1">
              <TierBadge tier={user.tier} />
              <span className="text-[12px] text-slate-400">Member since {user.memberSince}</span>
            </div>
          </div>
        </div>

        {/* fields */}
        <div>
          {FIELDS.map(({ key, label, type, icon: Icon, opts }, i) => (
            <div key={key}
              className={`grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-4 ${i < FIELDS.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <p className="text-[13px] font-semibold text-slate-700">{label}</p>
              {editing
                ? type === 'select'
                  ? <select value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      className="text-[13px] text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#0D9488] w-full max-w-xs">
                      {opts.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                    </select>
                  : <input type={type} value={draft[key]}
                      onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      className="text-[13px] text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#0D9488] w-full max-w-xs" />
                : <p className="text-[13px] text-slate-500">{user[key] || '—'}</p>
              }
            </div>
          ))}
        </div>
      </div>

      {/* ── Loyalty card ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* colored top strip */}
          <div className="h-1.5" style={{ background: TIER[user.tier].color }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Loyalty tier</p>
                <p className="text-[18px] font-bold text-slate-900 mt-0.5">{user.tier}</p>
              </div>
              <TierBadge tier={user.tier} />
            </div>

            <div className="mb-1 flex justify-between text-[12px] text-slate-500">
              <span>{user.points.toLocaleString()} pts</span>
              {tierInfo.next && <span>{tierInfo.threshold.toLocaleString()} pts</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: TIER[user.tier].color }} />
            </div>
            {tierInfo.next && (
              <p className="text-[12px] text-slate-400 mt-1.5">
                <span className="font-semibold" style={{ color: TIER[user.tier].color }}>
                  {(tierInfo.threshold - user.points).toLocaleString()} pts
                </span> away from {tierInfo.next}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[16px] font-bold text-slate-900">{user.points.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Available</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[16px] font-bold text-slate-900">{user.lifetime.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Lifetime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active rewards */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-[13px] font-semibold text-slate-900">Your rewards</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF9] text-[#0D9488]">
              {REWARDS.filter(r => r.status === 'available').length} active
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {REWARDS.filter(r => r.status === 'available').map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDF9] flex items-center justify-center shrink-0">
                  <Gift size={14} className="text-[#0D9488]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-400">{r.earned}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ ACTIVITY TAB ══════════════════════════════════════════════════════════ */
function ActivityTab({ appointments = [] }) {
  const [view, setView]    = useState('upcoming')
  const [reviewed, setRev] = useState({})

  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending')
  const past     = appointments.filter(a => ['completed','cancelled','no_show'].includes(a.status))

  function fmtDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
  }

  return (
    <div>
      <div className="flex gap-px bg-slate-200 rounded-lg w-fit mb-5 p-0.5">
        {['upcoming', 'past'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-5 py-1.5 rounded-md text-[13px] font-semibold transition-all capitalize ${v === view ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {v === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {view === 'upcoming' && (upcoming.length === 0
          ? <p className="text-[13px] text-slate-400 text-center py-10">No upcoming appointments</p>
          : upcoming.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF9] flex items-center justify-center shrink-0">
                  <Scissors size={18} className="text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-900">{a.services || 'Appointment'}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">with {a.staff_name}</p>
                  <span className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-2">
                    <Calendar size={12}/>{fmtDate(a.start_at)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold text-slate-900">${a.total}</p>
                <span className="text-[12px] text-emerald-600 font-medium capitalize">{a.status}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Reschedule</button>
              <button className="flex-1 py-2 rounded-lg border border-red-100 text-[13px] font-semibold text-red-500 hover:bg-red-50">Cancel</button>
            </div>
          </div>
        )))}

        {view === 'past' && (past.length === 0
          ? <p className="text-[13px] text-slate-400 text-center py-10">No past appointments</p>
          : past.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Scissors size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-slate-900">{a.services || 'Appointment'}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">with {a.staff_name}</p>
                  <span className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-2">
                    <Calendar size={12}/>{fmtDate(a.start_at)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-bold text-slate-900">${a.total}</p>
                <span className="text-[12px] text-slate-400 capitalize">{a.status}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700">Book again</button>
              {!reviewed[a.id]
                ? <button onClick={() => setRev(r => ({ ...r, [a.id]: true }))}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                    <Star size={13} className="text-slate-400"/> Leave review
                  </button>
                : <div className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-[13px] font-semibold flex items-center justify-center gap-1.5">
                    <Check size={13}/> Reviewed
                  </div>
              }
            </div>
          </div>
        )))}
      </div>
    </div>
  )
}

/* ══ WALLET TAB ════════════════════════════════════════════════════════════ */
function WalletTab({ user, loyalty = {} }) {
  const tierName = loyalty.tier_name || user.tier || 'Bronze'
  const t    = TIER[tierName] || TIER.Bronze
  const pts  = loyalty.balance ?? user.points ?? 0
  const next = loyalty.next_tier_name
  const nextPts = loyalty.next_tier_points || 0
  const pct  = next && nextPts > 0 ? Math.min((pts / nextPts) * 100, 100) : 100
  const txns   = loyalty.transactions || WALLET_TXN
  const rewards = loyalty.rewards || REWARDS

  return (
    <div className="space-y-5">
      {/* Balance card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="h-1.5" style={{ background: t.color }} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Points balance</p>
              <p className="text-[40px] font-bold text-slate-900 leading-none">{pts.toLocaleString()}</p>
              <p className="text-[13px] text-slate-400 mt-1">points available · {tierName} tier</p>
            </div>
            <TierBadge tier={tierName} />
          </div>
          <div className="h-2 rounded-full bg-slate-100 mb-1.5">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
          </div>
          {next && (
            <p className="text-[12px] text-slate-400">
              <span className="font-semibold" style={{ color: t.color }}>{Math.max(0, nextPts - pts).toLocaleString()} pts</span> to reach {next}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* History */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[14px] font-semibold text-slate-900">Points history</p>
          </div>
          <div className="divide-y divide-slate-50">
            {txns.length === 0
              ? <p className="text-[13px] text-slate-400 text-center py-8">No transactions yet</p>
              : txns.map((t, i) => {
                const pts = t.pts ?? t.points ?? 0
                const label = t.label ?? t.description ?? ''
                const date = t.date ?? (t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '')
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pts > 0 ? 'bg-[#F0FDF9]' : 'bg-slate-100'}`}>
                      {pts > 0 ? <Zap size={14} className="text-[#0D9488]"/> : <CreditCard size={14} className="text-slate-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{label}</p>
                      <p className="text-[11px] text-slate-400">{date}</p>
                    </div>
                    <span className={`text-[14px] font-bold shrink-0 ${pts > 0 ? 'text-[#0D9488]' : 'text-slate-500'}`}>
                      {pts > 0 ? '+' : ''}{pts}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[14px] font-semibold text-slate-900">Rewards</p>
            <span className="text-[11px] font-semibold text-[#0D9488] bg-[#F0FDF9] px-2 py-0.5 rounded-full">
              {rewards.filter(r => r.status === 'available').length} active
            </span>
          </div>
          <div className="p-4 space-y-3">
            {rewards.length === 0
              ? <p className="text-[13px] text-slate-400 text-center py-6">No rewards yet</p>
              : rewards.map(r => (
              <div key={r.id} className={`rounded-xl border p-4 ${r.status === 'available' ? 'border-[#0D9488]/20 bg-[#F0FDF9]' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === 'available' ? 'bg-[#CCFBF1]' : 'bg-slate-200'}`}>
                    <Gift size={14} className={r.status === 'available' ? 'text-[#0D9488]' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{r.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.earned ?? (r.granted_at ? new Date(r.granted_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '')}</p>
                    <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${r.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══ MESSAGES TAB ══════════════════════════════════════════════════════════ */
function MessagesTab() {
  const [read, setRead] = useState(new Set())
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <p className="text-[14px] font-semibold text-slate-900">Messages</p>
        <button className="text-[13px] font-medium text-[#0D9488] hover:underline">Mark all read</button>
      </div>
      <div className="divide-y divide-slate-50">
        {MESSAGES.map(m => (
          <div key={m.id} onClick={() => setRead(s => new Set([...s, m.id]))}
            className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!read.has(m.id) && m.unread ? 'bg-[#F0FDF9]' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF9] flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={15} className="text-[#0D9488]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{m.title}</p>
                {m.unread && !read.has(m.id) && <span className="w-2 h-2 rounded-full bg-[#0D9488] shrink-0" />}
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2">{m.body}</p>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">{m.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══ FAVOURITES TAB ════════════════════════════════════════════════════════ */
function FavouritesTab() {
  const [favs, setFavs] = useState(FAVOURITES.map(f => f.name))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {FAVOURITES.map(s => (
        <div key={s.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="h-28 bg-slate-50 flex items-center justify-center relative">
            <div className="w-11 h-11 rounded-xl bg-[#F0FDF9] flex items-center justify-center">
              <Scissors size={20} className="text-[#0D9488]" />
            </div>
            <button onClick={() => setFavs(f => f.includes(s.name) ? f.filter(x => x !== s.name) : [...f, s.name])}
              className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center hover:scale-110 transition-transform">
              <Heart size={14} className={favs.includes(s.name) ? 'text-red-500 fill-red-500' : 'text-slate-300'} />
            </button>
          </div>
          <div className="p-4">
            <p className="text-[14px] font-semibold text-slate-900">{s.name}</p>
            <p className="text-[12px] text-slate-400 mt-0.5 mb-3">{s.category} · {s.duration}</p>
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1 text-[12px] text-slate-600">
                <Star size={12} className="text-[#6366F1] fill-[#6366F1]" /> {s.rating}
              </span>
              <span className="text-[15px] font-bold text-slate-900">${s.price}</span>
            </div>
            <button className="w-full py-2 rounded-lg bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-700 transition-colors">
              Book now
            </button>
          </div>
        </div>
      ))}
      <button className="bg-white rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0D9488] hover:bg-[#F0FDF9] transition-all flex flex-col items-center justify-center gap-2 py-12 group">
        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-[#CCFBF1] flex items-center justify-center transition-colors">
          <Plus size={18} className="text-slate-400 group-hover:text-[#0D9488] transition-colors" />
        </div>
        <p className="text-[13px] font-medium text-slate-400 group-hover:text-[#0D9488] transition-colors">Browse services</p>
      </button>
    </div>
  )
}

/* ══ SETTINGS TAB ══════════════════════════════════════════════════════════ */
function SettingsTab() {
  const [n, setN] = useState({ sms: true, email: true, marketing: false, reminders: true })
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-5 max-w-xl">
      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[14px] font-semibold text-slate-900">Notifications</p>
          <p className="text-[12px] text-slate-400 mt-0.5">Choose how we stay in touch</p>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { k: 'reminders',  label: 'Appointment reminders', desc: 'SMS 48h and 3h before your visit' },
            { k: 'sms',        label: 'SMS confirmations',      desc: 'Booking and update texts'         },
            { k: 'email',      label: 'Email notifications',    desc: 'Receipts and confirmations'       },
            { k: 'marketing',  label: 'Promotions & offers',    desc: 'Exclusive deals and member perks' },
          ].map(({ k, label, desc }) => (
            <div key={k} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{label}</p>
                <p className="text-[12px] text-slate-400">{desc}</p>
              </div>
              <button onClick={() => setN(v => ({ ...v, [k]: !v[k] }))}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${n[k] ? 'bg-[#0D9488]' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${n[k] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5">
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
            {saved ? '✓ Saved' : 'Save preferences'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[14px] font-semibold text-slate-900">Security</p>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { icon: Lock,      label: 'Change password',     desc: 'Update your login password'      },
            { icon: RefreshCw, label: 'Connected accounts',  desc: 'Google, Apple, Facebook'         },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-slate-800">{label}</p>
                <p className="text-[12px] text-slate-400">{desc}</p>
              </div>
              <ChevronRight size={15} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>

      {/* Danger */}
      <div className="bg-white rounded-xl border border-red-100">
        <div className="px-6 py-4 border-b border-red-50">
          <p className="text-[14px] font-semibold text-red-600">Danger zone</p>
        </div>
        <button className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 transition-colors text-left">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={15} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-700">Delete account</p>
            <p className="text-[12px] text-red-400">Permanently remove your account and data</p>
          </div>
          <ChevronRight size={15} className="text-red-300" />
        </button>
      </div>
    </div>
  )
}

/* ══ PAGE ══════════════════════════════════════════════════════════════════ */
export default function CustomerProfile() {
  const navigate               = useNavigate()
  const [tab, setTab]          = useState('profile')
  const [uMenu, setUMenu]      = useState(false)

  // Redirect to auth if not logged in
  const storedClient = (() => { try { return JSON.parse(localStorage.getItem('salonos_customer') || 'null') } catch { return null } })()
  useEffect(() => { if (!storedClient) navigate('/auth') }, [storedClient, navigate])

  const { data: profileData } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: () => axios.get('/api/customer/profile', { headers: customerHeaders() }).then(r => r.data),
    enabled: !!storedClient,
  })
  const { data: appointmentsData = [] } = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: () => axios.get('/api/customer/appointments', { headers: customerHeaders() }).then(r => r.data),
    enabled: !!storedClient,
  })
  const { data: loyaltyData = {} } = useQuery({
    queryKey: ['customer-loyalty'],
    queryFn: () => axios.get('/api/customer/loyalty', { headers: customerHeaders() }).then(r => r.data),
    enabled: !!storedClient,
  })

  const [user, setUser] = useState(USER)
  useEffect(() => {
    if (profileData) {
      setUser(u => ({
        ...u,
        firstName: profileData.first_name,
        lastName:  profileData.last_name,
        email:     profileData.email,
        phone:     profileData.phone,
        gender:    profileData.gender,
        dob:       profileData.dob,
      }))
    }
  }, [profileData])
  const [calOpen, setCalOpen]       = useState(false)
  const [treatOpen, setTreatOpen]   = useState(false)
  const [timeLabel, setTimeLabel]   = useState('Any time')
  const [treatLabel, setTreatLabel] = useState('All treatments')
  const calRef                      = useRef(null)
  const treatRef                    = useRef(null)

  // Close both dropdowns when clicking outside the search bar container
  useEffect(() => {
    function handler(e) {
      if (treatRef.current && !treatRef.current.contains(e.target)) {
        setCalOpen(false)
        setTreatOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const TAB_CONTENT = {
    profile:    <ProfileTab user={user} setUser={setUser} />,
    activity:   <ActivityTab appointments={appointmentsData} />,
    wallet:     <WalletTab user={user} loyalty={loyaltyData} />,
    messages:   <MessagesTab />,
    favourites: <FavouritesTab />,
    settings:   <SettingsTab />,
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="px-8 h-[60px] flex items-center gap-6">
          <a href="/welcome" className="text-[18px] font-bold shrink-0">
            <span className="text-[#0D9488]">Kriyansh</span>
            <span className="text-slate-900"> Salon</span>
          </a>

          {/* Search pill — Fresha style */}
          <div className="hidden md:flex flex-1 max-w-[560px] mx-auto relative" ref={treatRef}>
            <div className={`flex w-full rounded-full border bg-white shadow-sm overflow-hidden transition-shadow ${calOpen || treatOpen ? 'border-slate-300 shadow-md' : 'border-slate-200 hover:shadow-md'}`}>

              {/* All treatments button */}
              <button
                onClick={() => { setTreatOpen(v => !v); setCalOpen(false) }}
                className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium flex-1 border-r border-slate-200 transition-colors ${treatOpen ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Search size={13} className={treatOpen ? 'text-[#6366F1] shrink-0' : 'text-slate-400 shrink-0'} />
                <span className={treatLabel !== 'All treatments' ? 'text-slate-900' : ''}>{treatLabel}</span>
              </button>

              <button
                onClick={() => setCalOpen(v => !v)}
                className={`flex items-center gap-2 px-5 py-2.5 text-[13px] flex-1 font-medium transition-colors ${calOpen ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Calendar size={13} className={calOpen ? 'text-[#6366F1]' : 'text-slate-400'} />
                <span className={calOpen || timeLabel !== 'Any time' ? 'text-slate-900' : 'text-slate-600'}>{timeLabel}</span>
              </button>
              <button className="m-1.5 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-700 transition-colors shrink-0">
                Search
              </button>
            </div>

            {/* Dropdowns rendered OUTSIDE overflow-hidden pill so they aren't clipped */}
            {treatOpen && (
              <TreatmentsPicker
                onClose={() => setTreatOpen(false)}
                onSelect={label => setTreatLabel(label)}
              />
            )}
            {calOpen && (
              <DateTimePicker
                onClose={() => setCalOpen(false)}
                onSelect={label => setTimeLabel(label)}
              />
            )}
          </div>

          {/* User avatar */}
          <div className="relative ml-auto shrink-0">
            <button onClick={() => setUMenu(v => !v)}
              className="flex items-center gap-2 border border-slate-200 rounded-full pl-2 pr-3 py-1 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
              <Av name={`${user.firstName} ${user.lastName}`} size={28} />
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${uMenu ? 'rotate-180' : ''}`} />
            </button>
            {uMenu && (
              <div className="absolute right-0 top-11 w-44 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50 py-1">
                {NAV.map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => { setTab(key); setUMenu(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${tab === key ? 'bg-[#F0FDF9] text-[#0D9488] font-semibold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => { localStorage.removeItem('salonos_customer_token'); localStorage.removeItem('salonos_customer'); navigate('/auth') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Layout ───────────────────────────────────────────────────── */}
      <div className="flex">

        {/* Sidebar — flush to left edge */}
        <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-white border-r border-slate-200 min-h-[calc(100vh-60px)] sticky top-[60px] self-start">
          {/* User card */}
          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Av name={`${user.firstName} ${user.lastName}`} size={44} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 truncate">
                  {user.firstName.toLowerCase()} {user.lastName.toLowerCase()}
                </p>
                <div className="mt-1"><TierBadge tier={user.tier} /></div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-2">
            {NAV.map(({ key, icon: Icon, label, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-[13.5px] font-medium transition-colors ${
                  tab === key
                    ? 'bg-[#EEF2FF] text-[#4338CA]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <Icon size={16} strokeWidth={tab === key ? 2.5 : 2} />
                <span className="flex-1 text-left">{label}</span>
                {badge && (
                  <span className="w-5 h-5 rounded-full bg-[#0D9488] text-white text-[10px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sign out at bottom */}
          <div className="border-t border-slate-100 py-2">
            <button onClick={() => { localStorage.removeItem('salonos_customer_token'); localStorage.removeItem('salonos_customer'); navigate('/auth') }}
              className="w-full flex items-center gap-3 px-5 py-3 text-[13.5px] font-medium text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {NAV.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors ${tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 px-8 py-8">
          <h1 className="text-[22px] font-bold text-slate-900 mb-5 capitalize">{tab}</h1>
          {TAB_CONTENT[tab]}
        </main>
      </div>
    </div>
  )
}
