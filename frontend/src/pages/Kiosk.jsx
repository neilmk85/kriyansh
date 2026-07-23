import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  Delete,
  Sparkles,
  Check,
  Clock,
  User,
  ArrowRight,
  Search,
  Calendar,
  UserPlus,
} from 'lucide-react'

const DARK_BG = {
  background: 'linear-gradient(135deg, #0F0F23 0%, #0D1B2A 40%, #0F2027 100%)',
}

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
}

const PRIMARY_BTN = {
  background: 'linear-gradient(135deg, #0D9488, #6366F1)',
}

const MUTED = { color: 'rgba(255,255,255,0.6)' }

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatTime(d) {
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatPhone(digits) {
  const d = digits.padEnd(10, '·')
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

// ─── Step: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }) { // onNext(mode: 'walkin'|'appointment')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={DARK_BG}
    >
      {/* Decorative glow orbs */}
      <div
        className="absolute top-[-120px] left-[-120px] w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)',
          boxShadow: '0 0 120px 60px rgba(13,148,136,0.15)',
        }}
      />
      <div
        className="absolute bottom-[-80px] right-[-80px] w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
          boxShadow: '0 0 100px 40px rgba(99,102,241,0.12)',
        }}
      />
      <div
        className="absolute top-1/3 right-24 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          boxShadow: '0 0 80px 40px rgba(99,102,241,0.13)',
        }}
      />

      {/* Date / time */}
      <div className="absolute top-10 right-12 text-right">
        <p className="text-4xl font-light text-white tracking-wide">{formatTime(now)}</p>
        <p className="text-base mt-1" style={MUTED}>{formatDate(now)}</p>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center text-center z-10 px-8 max-w-2xl">
        {/* Logo / icon badge */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(13,148,136,0.3), rgba(99,102,241,0.3))',
            border: '1px solid rgba(13,148,136,0.4)',
            boxShadow: '0 0 40px rgba(13,148,136,0.3)',
          }}
        >
          <Sparkles size={40} style={{ color: '#5EEAD4' }} />
        </div>

        <h1
          className="text-6xl font-bold text-white mb-3 tracking-tight"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: '-0.5px' }}
        >
          Kriyansh Beauty Bar
        </h1>

        <p className="text-2xl mb-14 tracking-wide" style={{ color: '#5EEAD4' }}>
          Welcome — how can we help you today?
        </p>

        {/* Two paths */}
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
          <button
            onClick={() => onNext('appointment')}
            className="flex-1 flex flex-col items-center gap-4 py-8 px-8 rounded-2xl text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgba(8,145,178,0.35) 0%, rgba(124,58,237,0.35) 100%)',
              border: '1.5px solid rgba(8,145,178,0.45)',
              boxShadow: '0 0 36px rgba(8,145,178,0.22)',
              minHeight: 160,
            }}
          >
            <Calendar size={36} style={{ color: '#67E8F9' }} />
            <div className="text-center">
              <p className="text-xl font-bold">I Have an Appointment</p>
              <p className="text-sm mt-1" style={MUTED}>Check in for a booked service</p>
            </div>
          </button>

          <button
            onClick={() => onNext('walkin')}
            className="flex-1 flex flex-col items-center gap-4 py-8 px-8 rounded-2xl text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              ...PRIMARY_BTN,
              boxShadow: '0 0 36px rgba(13,148,136,0.4)',
              animation: 'pulse-glow 2.5s ease-in-out infinite',
              minHeight: 160,
            }}
          >
            <UserPlus size={36} color="white" />
            <div className="text-center">
              <p className="text-xl font-bold">Walk-in</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Join the queue without a booking</p>
            </div>
          </button>
        </div>

        <p className="mt-10 text-base" style={MUTED}>
          Touch an option to begin
        </p>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(13,148,136,0.45), 0 8px 32px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 70px rgba(13,148,136,0.7), 0 8px 32px rgba(0,0,0,0.4); }
        }
      `}</style>
    </div>
  )
}

// ─── Step: Phone ─────────────────────────────────────────────────────────────

function PhoneStep({ phone, setPhone, onNext, onBack, loading, subtitle }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

  const handleKey = useCallback(
    (k) => {
      if (k === 'back') setPhone((p) => p.slice(0, -1))
      else if (k === 'clear') setPhone('')
      else if (phone.length < 10) setPhone((p) => p + k)
    },
    [phone, setPhone]
  )

  const ready = phone.length === 10

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      {/* Decorative orb */}
      <div
        className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        <h2 className="text-4xl font-bold text-white mb-2 text-center">Enter Your Phone Number</h2>
        <p className="text-xl mb-12 text-center" style={MUTED}>
          {subtitle || "We'll look up your profile"}
        </p>

        {/* Phone display */}
        <div
          className="rounded-2xl px-10 py-5 mb-10 text-center"
          style={{
            ...GLASS_CARD,
            minWidth: 340,
            boxShadow: ready ? '0 0 30px rgba(13,148,136,0.25)' : 'none',
            border: ready ? '1px solid rgba(13,148,136,0.5)' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
          }}
        >
          <span
            className="text-4xl font-mono font-semibold tracking-widest"
            style={{ color: ready ? '#5EEAD4' : 'rgba(255,255,255,0.85)' }}
          >
            {formatPhone(phone)}
          </span>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {keys.map((k) => {
            const isClear = k === 'clear'
            const isBack = k === 'back'
            return (
              <button
                key={k}
                onClick={() => handleKey(k)}
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: isClear
                    ? 'rgba(239,68,68,0.15)'
                    : isBack
                    ? 'rgba(99,102,241,0.2)'
                    : 'rgba(255,255,255,0.1)',
                  border: isClear
                    ? '1px solid rgba(239,68,68,0.25)'
                    : isBack
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {isBack ? <Delete size={26} /> : isClear ? <span className="text-lg font-bold" style={{color:'rgba(239,68,68,0.8)'}}>CLR</span> : k}
              </button>
            )
          })}
        </div>

        {/* Continue */}
        <button
          onClick={onNext}
          disabled={!ready || loading}
          className="py-5 px-20 rounded-2xl text-white text-xl font-semibold tracking-wide transition-all duration-300"
          style={{
            ...PRIMARY_BTN,
            opacity: ready && !loading ? 1 : 0.35,
            boxShadow: ready ? '0 0 32px rgba(13,148,136,0.4)' : 'none',
            minHeight: 72,
            minWidth: 280,
            cursor: ready && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Looking up…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ─── Step: Name ──────────────────────────────────────────────────────────────

function NameStep({ lookup, name, setName, onNext, onBack }) {
  const isReturning = lookup?.found === true
  const firstName = isReturning ? lookup.first_name : name.first
  const ready = isReturning ? true : name.first.trim().length > 0 && name.last.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute bottom-[-80px] right-[-80px] w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-12 pb-16 max-w-xl mx-auto w-full">
        {isReturning ? (
          <>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(13,148,136,0.35), rgba(99,102,241,0.35))',
                border: '1px solid rgba(13,148,136,0.5)',
                boxShadow: '0 0 40px rgba(13,148,136,0.3)',
              }}
            >
              <User size={40} style={{ color: '#5EEAD4' }} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3 text-center">
              Welcome back, {firstName}! 👋
            </h2>
            <p className="text-xl text-center mb-14" style={MUTED}>
              Great to see you again.
            </p>
            <div
              className="w-full rounded-2xl px-8 py-5 flex items-center gap-5 mb-12"
              style={{
                ...GLASS_CARD,
                border: '1px solid rgba(13,148,136,0.35)',
                boxShadow: '0 0 24px rgba(13,148,136,0.15)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
              >
                <Check size={20} color="white" />
              </div>
              <div>
                <p className="text-white text-xl font-medium">
                  {lookup.first_name} {lookup.last_name}
                </p>
                <p className="text-sm mt-0.5" style={MUTED}>Profile confirmed</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-bold text-white mb-3 text-center">
              Let's get you checked in
            </h2>
            <p className="text-xl text-center mb-12" style={MUTED}>
              First time here? Tell us your name.
            </p>
            <div className="w-full space-y-5 mb-12">
              <input
                type="text"
                placeholder="First Name"
                value={name.first}
                onChange={(e) => setName((n) => ({ ...n, first: e.target.value }))}
                className="w-full rounded-2xl px-7 py-5 text-xl text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-teal-400"
                style={{
                  ...GLASS_CARD,
                  minHeight: 72,
                }}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={name.last}
                onChange={(e) => setName((n) => ({ ...n, last: e.target.value }))}
                className="w-full rounded-2xl px-7 py-5 text-xl text-white placeholder-white/30 outline-none transition-all duration-300 focus:border-teal-400"
                style={{
                  ...GLASS_CARD,
                  minHeight: 72,
                }}
              />
            </div>
          </>
        )}

        <button
          onClick={onNext}
          disabled={!ready}
          className="w-full py-5 rounded-2xl text-white text-xl font-semibold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            ...PRIMARY_BTN,
            opacity: ready ? 1 : 0.35,
            boxShadow: ready ? '0 0 32px rgba(13,148,136,0.4)' : 'none',
            minHeight: 72,
          }}
        >
          Next <ArrowRight size={22} />
        </button>
      </div>
    </div>
  )
}

// ─── Step: SMS Consent (TCPA) ─────────────────────────────────────────────────

function ConsentStep({ lookup, name, phone, mode, smsConsent, setSmsConsent, onNext, onBack }) {
  const isReturning = lookup?.found === true
  const last4 = phone.slice(-4).padStart(4, '·')

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute top-[-60px] left-[-60px] w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.22) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-12 pb-12 max-w-xl mx-auto w-full">
        {isReturning && (
          <>
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, rgba(13,148,136,0.4), rgba(99,102,241,0.4))',
                border: '2px solid rgba(13,148,136,0.6)',
                boxShadow: '0 0 50px rgba(13,148,136,0.35)',
              }}
            >
              <User size={44} style={{ color: '#5EEAD4' }} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2 text-center">
              Welcome back, {lookup.first_name}! 👋
            </h2>
            <p className="text-base mb-6 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              📞 ****{last4}
            </p>
          </>
        )}

        {/* TCPA Consent card */}
        <div
          className="w-full rounded-2xl px-7 py-6 mb-7"
          style={{ ...GLASS_CARD, border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <h3 className="text-2xl font-bold text-white mb-3">Before we continue…</h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            By providing my phone number I consent to receive text messages sent by an automatic telephone dialing system.
            Message frequency varies. Message &amp; data rates may apply.
            Reply STOP to unsubscribe or HELP for help.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setSmsConsent(true)}
              className="w-full rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200"
              style={{
                background: smsConsent ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.06)',
                border: smsConsent ? '1.5px solid rgba(13,148,136,0.7)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: smsConsent ? '0 0 20px rgba(13,148,136,0.2)' : 'none',
              }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: smsConsent ? '#0D9488' : 'rgba(255,255,255,0.3)',
                  background: smsConsent ? '#0D9488' : 'transparent',
                }}
              >
                {smsConsent && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <span className="text-white text-lg font-medium">I want to receive text messages</span>
            </button>

            <button
              onClick={() => setSmsConsent(false)}
              className="w-full rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200"
              style={{
                background: !smsConsent ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)',
                border: !smsConsent ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: !smsConsent ? '#6366F1' : 'rgba(255,255,255,0.3)',
                  background: !smsConsent ? '#6366F1' : 'transparent',
                }}
              >
                {!smsConsent && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <span className="text-white text-lg font-medium">I don't want text messages</span>
            </button>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full py-5 rounded-2xl text-white text-xl font-semibold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          style={{ ...PRIMARY_BTN, boxShadow: '0 0 32px rgba(13,148,136,0.4)', minHeight: 72 }}
        >
          Continue <ArrowRight size={22} />
        </button>
      </div>
    </div>
  )
}

// ─── Step: Family Members ─────────────────────────────────────────────────────

function FamilyStep({ familyMembers, setFamilyMembers, onNext, onBack, submitting }) {
  const [adding, setAdding] = useState(false)
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')

  function addMember() {
    if (!newFirst.trim()) return
    setFamilyMembers((prev) => [...prev, { first: newFirst.trim(), last: newLast.trim(), serviceIds: [] }])
    setNewFirst('')
    setNewLast('')
    setAdding(false)
  }

  function removeMember(i) {
    setFamilyMembers((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-10 pb-12 max-w-xl mx-auto w-full">
        <div className="text-center mb-8 mt-4">
          <h2 className="text-4xl font-bold text-white mb-2">Anyone else joining you?</h2>
          <p className="text-xl" style={MUTED}>Add family members checking in together</p>
        </div>

        {familyMembers.length > 0 && (
          <div className="w-full space-y-3 mb-6">
            {familyMembers.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-6 py-4"
                style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.35)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
                >
                  <User size={18} color="white" />
                </div>
                <span className="text-white text-lg font-medium flex-1">{m.first} {m.last}</span>
                <button
                  onClick={() => removeMember(i)}
                  className="text-2xl leading-none transition-colors hover:text-red-400"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div
            className="w-full rounded-2xl p-6 mb-6 space-y-4"
            style={{ ...GLASS_CARD, border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <input
              type="text"
              placeholder="First Name"
              value={newFirst}
              onChange={(e) => setNewFirst(e.target.value)}
              className="w-full rounded-xl px-5 py-4 text-xl text-white placeholder-white/30 outline-none"
              style={{ ...GLASS_CARD, minHeight: 60 }}
            />
            <input
              type="text"
              placeholder="Last Name (optional)"
              value={newLast}
              onChange={(e) => setNewLast(e.target.value)}
              className="w-full rounded-xl px-5 py-4 text-xl text-white placeholder-white/30 outline-none"
              style={{ ...GLASS_CARD, minHeight: 60 }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setAdding(false); setNewFirst(''); setNewLast('') }}
                className="flex-1 py-4 rounded-xl text-lg font-semibold"
                style={{ ...GLASS_CARD, color: 'rgba(255,255,255,0.6)' }}
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                disabled={!newFirst.trim()}
                className="flex-1 py-4 rounded-xl text-white text-lg font-semibold"
                style={{
                  ...PRIMARY_BTN,
                  opacity: newFirst.trim() ? 1 : 0.35,
                  boxShadow: newFirst.trim() ? '0 0 20px rgba(13,148,136,0.35)' : 'none',
                }}
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-2xl py-5 mb-6 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              ...GLASS_CARD,
              border: '1.5px dashed rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              minHeight: 72,
            }}
          >
            <UserPlus size={22} />
            <span className="text-xl font-semibold">+ Add Family Member</span>
          </button>
        )}

        <button
          onClick={onNext}
          disabled={submitting}
          className="w-full py-5 rounded-2xl text-white text-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            ...PRIMARY_BTN,
            opacity: submitting ? 0.6 : 1,
            boxShadow: '0 0 32px rgba(13,148,136,0.4)',
            minHeight: 72,
            marginTop: 'auto',
          }}
        >
          {submitting
            ? 'Checking in…'
            : familyMembers.length > 0
            ? `Check In Everyone (${familyMembers.length + 1})`
            : 'Check In'}
          {!submitting && <ArrowRight size={22} />}
        </button>
      </div>
    </div>
  )
}

// ─── Step: Services ───────────────────────────────────────────────────────────

function ServicesStep({ services, selectedIds, setSelectedIds, onNext, onSkip, onBack }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const toggle = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const categories = useMemo(() => {
    const cats = [...new Set(services.map(s => s.category_name || 'Other'))]
    return ['All', ...cats]
  }, [services])

  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
      const matchesCat = activeCategory === 'All' || (s.category_name || 'Other') === activeCategory
      return matchesSearch && matchesCat
    })
  }, [services, search, activeCategory])

  const groups = useMemo(() => {
    return filtered.reduce((acc, s) => {
      const cat = s.category_name || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    }, {})
  }, [filtered])

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute top-[-60px] right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8 pb-8 overflow-y-auto">
        <div className="text-center mb-6 mt-2">
          <h2 className="text-4xl font-bold text-white mb-2">What would you like today?</h2>
          <p className="text-xl" style={MUTED}>
            Select one or more services{selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ''}
          </p>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-5"
          style={{ ...GLASS_CARD, border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Search size={22} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services…"
            className="flex-1 bg-transparent text-white text-xl outline-none placeholder-white/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-white/40 hover:text-white/70 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-3 pb-2 mb-6 scrollbar-hide" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: 52 }}>
          {categories.map(cat => {
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 flex-shrink-0"
                style={{
                  background: active ? 'linear-gradient(135deg, #0D9488, #6366F1)' : 'rgba(255,255,255,0.14)',
                  border: active ? '1.5px solid rgba(13,148,136,0.6)' : '1.5px solid rgba(255,255,255,0.22)',
                  color: active ? 'white' : 'rgba(255,255,255,0.85)',
                  boxShadow: active ? '0 0 20px rgba(13,148,136,0.35)' : 'none',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#5EEAD4' }}>
              {cat}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {items.map((s) => {
                const sel = selectedIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className="rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: sel ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(12px)',
                      border: sel
                        ? '1.5px solid rgba(13,148,136,0.7)'
                        : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: sel ? '0 0 24px rgba(13,148,136,0.25)' : 'none',
                      minHeight: 110,
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-lg font-semibold leading-snug pr-2">{s.name}</p>
                      {sel && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
                        >
                          <Check size={14} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-sm" style={MUTED}>
                        <Clock size={14} /> {s.duration} min
                      </span>
                      <span className="text-base font-semibold" style={{ color: '#5EEAD4' }}>
                        ${parseFloat(s.price).toFixed(0)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && services.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
            <Search size={40} style={{ color: 'rgba(255,255,255,0.2)' }} />
            <p className="text-xl" style={MUTED}>No services match "{search}"</p>
          </div>
        )}

        {services.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl" style={MUTED}>Loading services…</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-4 mt-4 sticky bottom-0 pb-2 pt-4"
          style={{ background: 'linear-gradient(to top, rgba(15,15,35,0.95) 60%, transparent)' }}>
          <button
            onClick={onSkip}
            className="flex-1 py-5 rounded-2xl text-xl font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{ ...GLASS_CARD, color: 'rgba(255,255,255,0.7)', minHeight: 72 }}
          >
            Skip / Any Service
          </button>
          <button
            onClick={onNext}
            disabled={selectedIds.length === 0}
            className="flex-1 py-5 rounded-2xl text-white text-xl font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            style={{
              ...PRIMARY_BTN,
              opacity: selectedIds.length > 0 ? 1 : 0.35,
              boxShadow: selectedIds.length > 0 ? '0 0 28px rgba(13,148,136,0.4)' : 'none',
              minHeight: 72,
            }}
          >
            Next <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Staff ──────────────────────────────────────────────────────────────

function StaffStep({ staff, selectedStaffId, setSelectedStaffId, onNext, onBack, submitting }) {
  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute bottom-20 left-[-40px] w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8 pb-8 overflow-y-auto">
        <div className="text-center mb-8 mt-2">
          <h2 className="text-4xl font-bold text-white mb-2">Any preference for stylist?</h2>
          <p className="text-xl" style={MUTED}>Optional — choose someone or let us decide</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Any Available */}
          <button
            onClick={() => setSelectedStaffId(null)}
            className="col-span-2 rounded-2xl p-6 flex items-center gap-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: selectedStaffId === null ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              border: selectedStaffId === null
                ? '1.5px solid rgba(13,148,136,0.7)'
                : '1px solid rgba(255,255,255,0.1)',
              boxShadow: selectedStaffId === null ? '0 0 24px rgba(13,148,136,0.25)' : 'none',
              minHeight: 88,
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(13,148,136,0.4), rgba(99,102,241,0.4))',
                border: '1px solid rgba(13,148,136,0.4)',
              }}
            >
              <Sparkles size={28} style={{ color: '#5EEAD4' }} />
            </div>
            <div className="text-left">
              <p className="text-white text-xl font-semibold">Any Available</p>
              <p className="text-sm mt-0.5" style={MUTED}>We'll assign the next available stylist</p>
            </div>
            {selectedStaffId === null && (
              <div
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
              >
                <Check size={16} color="white" />
              </div>
            )}
          </button>

          {/* Staff cards */}
          {staff.map((s) => {
            const sel = selectedStaffId === s.id
            const displayName = s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
            const words = displayName.split(' ').filter(Boolean)
            const initials = (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')
            const color = s.color || '#0D9488'
            const spec = s.specialization || (Array.isArray(s.specializations) ? s.specializations.join(' · ') : s.specializations)
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStaffId(s.id)}
                className="rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative"
                style={{
                  background: sel ? 'rgba(13,148,136,0.18)' : 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  border: sel
                    ? '1.5px solid rgba(13,148,136,0.7)'
                    : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: sel ? '0 0 24px rgba(13,148,136,0.25)' : 'none',
                  minHeight: 160,
                }}
              >
                {sel && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
                  >
                    <Check size={14} color="white" />
                  </div>
                )}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-white text-xl font-bold flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${color}80, ${color}40)`,
                    border: `2px solid ${color}60`,
                    boxShadow: sel ? `0 0 20px ${color}50` : 'none',
                  }}
                >
                  {initials.toUpperCase()}
                </div>
                <p className="text-white text-base font-semibold leading-snug">{displayName}</p>
                {spec && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={MUTED}>{spec}</p>
                )}
              </button>
            )
          })}

          {staff.length === 0 && (
            <p className="col-span-2 text-center text-xl py-8" style={MUTED}>
              Loading staff…
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-4 sticky bottom-0 pb-2 pt-4"
          style={{ background: 'linear-gradient(to top, rgba(15,15,35,0.95) 60%, transparent)' }}
        >
          <button
            onClick={() => { setSelectedStaffId(null); onNext(); }}
            className="flex-1 py-5 rounded-2xl text-xl font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{ ...GLASS_CARD, color: 'rgba(255,255,255,0.7)', minHeight: 72 }}
          >
            Skip
          </button>
          <button
            onClick={onNext}
            disabled={submitting}
            className="flex-1 py-5 rounded-2xl text-white text-xl font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            style={{
              ...PRIMARY_BTN,
              opacity: submitting ? 0.6 : 1,
              boxShadow: '0 0 28px rgba(13,148,136,0.4)',
              minHeight: 72,
            }}
          >
            {submitting ? 'Checking in…' : <>Check In <ArrowRight size={20} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function DoneStep({ checkedInName, onReset }) {
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); onReset(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [onReset])

  const firstName = checkedInName?.split(' ')[0] || checkedInName

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={DARK_BG}>
      {/* Big green pulse ring */}
      <div className="relative flex items-center justify-center mb-12">
        <div
          className="absolute w-52 h-52 rounded-full"
          style={{
            background: 'rgba(16,185,129,0.1)',
            animation: 'ring-pulse 2s ease-out infinite',
          }}
        />
        <div
          className="absolute w-40 h-40 rounded-full"
          style={{
            background: 'rgba(16,185,129,0.15)',
            animation: 'ring-pulse 2s ease-out 0.4s infinite',
          }}
        />
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #059669, #10B981)',
            boxShadow: '0 0 60px rgba(16,185,129,0.5)',
          }}
        >
          <Check size={52} color="white" strokeWidth={3} />
        </div>
      </div>

      <h2
        className="text-5xl font-bold text-white mb-4 text-center px-8"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      >
        You're checked in{firstName ? `, ${firstName}` : ''}!
      </h2>

      <p className="text-2xl text-center mb-4" style={MUTED}>
        We'll call your name shortly.
      </p>

      <div
        className="rounded-2xl px-8 py-4 mb-12 flex items-center gap-3"
        style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
        }}
      >
        <Clock size={20} style={{ color: '#34D399' }} />
        <p className="text-xl" style={{ color: '#34D399' }}>Estimated wait: ~10–15 min</p>
      </div>

      <p className="text-base" style={MUTED}>
        Returning to home in {countdown}…
      </p>

      <button
        onClick={onReset}
        className="mt-6 px-10 py-3 rounded-2xl text-base transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ ...GLASS_CARD, color: 'rgba(255,255,255,0.5)' }}
      >
        Done
      </button>

      <style>{`
        @keyframes ring-pulse {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Step: Appointment List ───────────────────────────────────────────────────

function AppointmentListStep({ appointments, loading, onCheckin, onBack, lookup }) {
  const [checkingIn, setCheckingIn] = useState(null)

  async function handleCheckin(appt) {
    setCheckingIn(appt.id)
    await onCheckin(appt)
    setCheckingIn(null)
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={DARK_BG}>
      <div
        className="absolute top-[-60px] right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      />

      <div className="flex items-center px-8 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={GLASS_CARD}
        >
          <ChevronLeft size={28} color="white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 pb-12">
        <div className="text-center mb-10 mt-2">
          {lookup?.found ? (
            <>
              <h2 className="text-4xl font-bold text-white mb-2">
                Welcome back, {lookup.first_name}! 👋
              </h2>
              <p className="text-xl" style={MUTED}>Tap your appointment below to check in</p>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-bold text-white mb-2">Your Appointments Today</h2>
              <p className="text-xl" style={MUTED}>Tap an appointment to check in</p>
            </>
          )}
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl" style={MUTED}>Looking up your appointments…</p>
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Calendar size={36} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
            <p className="text-2xl font-semibold text-white">No appointments found</p>
            <p className="text-lg text-center max-w-sm" style={MUTED}>
              We couldn't find any upcoming appointments for this number today.
            </p>
            <button
              onClick={onBack}
              className="mt-4 py-4 px-10 rounded-2xl text-white text-lg font-semibold transition-all duration-300 hover:scale-105"
              style={{ ...PRIMARY_BTN, boxShadow: '0 0 28px rgba(13,148,136,0.4)', minHeight: 64 }}
            >
              Try a Different Number
            </button>
          </div>
        )}

        {!loading && appointments.length > 0 && (
          <div className="w-full max-w-2xl space-y-4">
            {appointments.map(appt => (
              <div
                key={appt.id}
                className="rounded-2xl p-6 flex items-center justify-between gap-6"
                style={{ ...GLASS_CARD, border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(13,148,136,0.35))', border: '1px solid rgba(99,102,241,0.3)' }}
                  >
                    <Calendar size={24} style={{ color: '#A5B4FC' }} />
                  </div>
                  <div>
                    <p className="text-white text-xl font-bold">{appt.service_name}</p>
                    <p className="text-base mt-0.5" style={{ color: '#5EEAD4' }}>
                      {fmtTime(appt.start_at)}
                    </p>
                    {appt.staff_name && (
                      <p className="text-sm mt-0.5" style={MUTED}>with {appt.staff_name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleCheckin(appt)}
                  disabled={checkingIn === appt.id}
                  className="py-3 px-7 rounded-xl text-white text-base font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex-shrink-0"
                  style={{
                    ...PRIMARY_BTN,
                    opacity: checkingIn === appt.id ? 0.6 : 1,
                    boxShadow: '0 0 20px rgba(13,148,136,0.35)',
                    minHeight: 52,
                    minWidth: 120,
                  }}
                >
                  {checkingIn === appt.id ? 'Checking in…' : 'Check In'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Kiosk() {
  const [step, setStep] = useState('welcome')
  const [mode, setMode] = useState(null) // 'walkin' | 'appointment'
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState(null)
  const [name, setName] = useState({ first: '', last: '' })
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [selectedServiceIds, setSelectedServiceIds] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkedInName, setCheckedInName] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [apptLoading, setApptLoading] = useState(false)
  const [smsConsent, setSmsConsent] = useState(true)
  const [familyMembers, setFamilyMembers] = useState([])

  // Fetch services
  const fetchServices = useCallback(async () => {
    if (services.length > 0) return
    try {
      const res = await fetch('/api/public/services')
      if (res.ok) setServices(await res.json())
    } catch (e) {
      console.error('Failed to load services', e)
    }
  }, [services.length])

  // Fetch staff
  const fetchStaff = useCallback(async () => {
    if (staff.length > 0) return
    try {
      const res = await fetch('/api/public/staff')
      if (res.ok) setStaff(await res.json())
    } catch (e) {
      console.error('Failed to load staff', e)
    }
  }, [staff.length])

  // Prefetch both on mount
  useEffect(() => {
    fetchServices()
    fetchStaff()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Phone next — branches on mode
  const handlePhoneNext = async () => {
    if (mode === 'appointment') {
      setApptLoading(true)
      // Look up customer name alongside appointments
      const [apptRes, lookupRes] = await Promise.allSettled([
        fetch(`/api/public/appointments/today?phone=${phone}`),
        fetch(`/api/public/walkin/lookup?phone=${phone}`),
      ])
      if (lookupRes.status === 'fulfilled' && lookupRes.value.ok) {
        const data = await lookupRes.value.json()
        setLookup(data)
        if (data.found) {
          setName({ first: data.first_name || '', last: data.last_name || '' })
          setSmsConsent(data.sms_consent !== false)
        }
      }
      if (apptRes.status === 'fulfilled' && apptRes.value.ok) {
        setAppointments(await apptRes.value.json())
      } else {
        setAppointments([])
      }
      setApptLoading(false)
      setStep('consent')
      return
    }
    // walkin mode
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/public/walkin/lookup?phone=${phone}`)
      if (res.ok) {
        const data = await res.json()
        setLookup(data)
        if (data.found) {
          setName({ first: data.first_name || '', last: data.last_name || '' })
          setSmsConsent(data.sms_consent !== false)
          setStep('consent')
        } else {
          setStep('name')
        }
      } else {
        setLookup({ found: false })
        setStep('name')
      }
    } catch {
      setLookup({ found: false })
      setStep('name')
    } finally {
      setLookupLoading(false)
    }
  }

  // Appointment check-in
  const handleAppointmentCheckin = async (appt) => {
    try {
      const res = await fetch(`/api/public/appointments/${appt.id}/checkin`, { method: 'POST' })
      if (res.ok) {
        setCheckedInName(appt.client_name || '')
        setStep('done')
      } else {
        alert('Check-in failed. Please see the front desk.')
      }
    } catch {
      alert('Unable to connect. Please see the front desk.')
    }
  }

  // Submit check-in (primary + family members)
  const handleSubmit = async () => {
    setSubmitting(true)
    const fullName =
      lookup?.found
        ? `${lookup.first_name} ${lookup.last_name}`.trim()
        : `${name.first} ${name.last}`.trim()
    try {
      const res = await fetch('/api/public/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          phone,
          service_ids: selectedServiceIds,
          preferred_staff_id: selectedStaffId ?? undefined,
          sms_consent: smsConsent,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCheckedInName(data.name || fullName)
        // Post each family member as a separate queue entry
        for (const member of familyMembers) {
          const memberName = `${member.first} ${member.last}`.trim()
          if (!memberName) continue
          await fetch('/api/public/walkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: memberName,
              phone,
              service_ids: member.serviceIds || [],
              preferred_staff_id: selectedStaffId ?? undefined,
              sms_consent: smsConsent,
            }),
          })
        }
        setStep('done')
      } else {
        alert('Check-in failed. Please try again or see the front desk.')
      }
    } catch (e) {
      alert('Unable to connect. Please see the front desk.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset everything
  const handleReset = useCallback(() => {
    setStep('welcome')
    setMode(null)
    setPhone('')
    setLookup(null)
    setName({ first: '', last: '' })
    setSelectedServiceIds([])
    setSelectedStaffId(null)
    setCheckedInName('')
    setSubmitting(false)
    setAppointments([])
    setLookupLoading(false)
    setApptLoading(false)
    setSmsConsent(true)
    setFamilyMembers([])
  }, [])

  // ── Render steps ──

  if (step === 'welcome') {
    return <WelcomeStep onNext={(m) => { setMode(m); setStep('phone') }} />
  }

  if (step === 'appt-list') {
    return (
      <AppointmentListStep
        appointments={appointments}
        loading={apptLoading}
        lookup={lookup}
        onCheckin={handleAppointmentCheckin}
        onBack={() => setStep('consent')}
      />
    )
  }

  if (step === 'consent') {
    return (
      <ConsentStep
        lookup={lookup}
        name={name}
        phone={phone}
        mode={mode}
        smsConsent={smsConsent}
        setSmsConsent={setSmsConsent}
        onNext={() => {
          if (mode === 'appointment') {
            setStep('appt-list')
          } else {
            fetchServices()
            setStep('services')
          }
        }}
        onBack={() => {
          if (mode === 'appointment' || lookup?.found) {
            setStep('phone')
          } else {
            setStep('name')
          }
        }}
      />
    )
  }

  if (step === 'phone') {
    return (
      <PhoneStep
        phone={phone}
        setPhone={setPhone}
        loading={lookupLoading || apptLoading}
        onNext={handlePhoneNext}
        onBack={() => setStep('welcome')}
        subtitle={mode === 'appointment' ? "We'll find your booking" : "We'll look up your profile"}
      />
    )
  }

  if (step === 'name') {
    return (
      <NameStep
        lookup={lookup}
        name={name}
        setName={setName}
        onNext={() => setStep('consent')}
        onBack={() => setStep('phone')}
      />
    )
  }

  if (step === 'services') {
    return (
      <ServicesStep
        services={services}
        selectedIds={selectedServiceIds}
        setSelectedIds={setSelectedServiceIds}
        onNext={() => { fetchStaff(); setStep('staff') }}
        onSkip={() => { setSelectedServiceIds([]); fetchStaff(); setStep('staff') }}
        onBack={() => setStep('consent')}
      />
    )
  }

  if (step === 'staff') {
    return (
      <StaffStep
        staff={staff}
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        onNext={() => setStep('family')}
        onBack={() => setStep('services')}
        submitting={false}
      />
    )
  }

  if (step === 'family') {
    return (
      <FamilyStep
        familyMembers={familyMembers}
        setFamilyMembers={setFamilyMembers}
        onNext={handleSubmit}
        onBack={() => setStep('staff')}
        submitting={submitting}
      />
    )
  }

  if (step === 'done') {
    return <DoneStep checkedInName={checkedInName} onReset={handleReset} />
  }

  return null
}
