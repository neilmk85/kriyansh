import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Eye, EyeOff, Mail, Phone, Lock,
  User, ChevronRight, Sparkles, Check,
} from 'lucide-react'

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="17" height="20" viewBox="0 0 170 200" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 2.13-9.501 3.24-12.742 3.35-4.929 0.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.378 0-10.857 2.346-20.221 7.045-28.068 3.693-6.303 8.606-11.275 14.755-14.925s12.793-5.51 19.948-5.629c3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 3.599 12.238 3.599 1.339 0 5.877-1.416 13.57-4.239 7.275-2.618 13.415-3.702 18.445-3.275 13.63 1.1 23.87 6.473 30.68 16.153-12.19 7.386-18.22 17.731-18.1 31.002 0.11 10.337 3.86 18.939 11.23 25.769 3.34 3.17 7.07 5.62 11.22 7.36-0.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.102-2.96 15.667-8.86 22.669-7.12 8.324-15.732 13.134-25.071 12.375-0.119-0.972-0.188-1.995-0.188-3.07 0-7.778 3.386-16.102 9.399-22.908 3.002-3.446 6.82-6.311 11.45-8.597 4.62-2.252 8.99-3.497 13.1-3.71 0.12 1.083 0.17 2.166 0.17 3.241z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

export default function CustomerAuth() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const initialMode     = params.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState(initialMode)
  const [step, setStep] = useState(initialMode === 'login' ? 'password' : 'email')
  const [inputMode, setInputMode] = useState('phone')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '9999999999', password: initialMode === 'login' ? 'test123' : '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handleContinue(e) {
    e.preventDefault()
    // Steps email/phone → password → (signup: name) advance without API call
    if (step === 'email') { setStep('password'); return }
    if (step === 'password' && mode === 'signup') { setStep('name'); return }

    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        // Try login; if the account doesn't exist yet, auto-register it so any
        // environment works without manual DB seeding.
        const phone = inputMode === 'phone' ? form.phone : ''
        const email = inputMode === 'email' ? form.email : ''
        let res = await fetch('/api/customer/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, email, password: form.password }),
        })
        let data = await res.json()
        if (!res.ok) {
          // Account not seeded — auto-register with demo details
          res = await fetch('/api/customer/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: 'Demo', last_name: 'Customer',
              email: 'demo@kriyansh.com', phone, password: form.password,
            }),
          })
          data = await res.json()
          if (!res.ok) { setError(data.error || 'Something went wrong'); return }
        }
        localStorage.setItem('salonos_customer_token', data.token)
        localStorage.setItem('salonos_customer', JSON.stringify(data.client))
        navigate('/home')
        return
      }

      // Signup flow
      const body = { first_name: form.firstName, last_name: form.lastName, email: form.email, phone: form.phone, password: form.password }
      const res = await fetch('/api/customer/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      localStorage.setItem('salonos_customer_token', data.token)
      localStorage.setItem('salonos_customer', JSON.stringify(data.client))
      navigate('/home')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const socialBtns = [
    { label: 'Continue with Google',   Icon: GoogleIcon,   bg: 'bg-white',     border: 'border-slate-200 hover:border-slate-300', text: 'text-slate-700' },
    { label: 'Continue with Facebook', Icon: FacebookIcon, bg: 'bg-[#1877F2]', border: 'border-[#1877F2]',                        text: 'text-white'     },
  ]

  function switchInputMode(m) { setInputMode(m); setStep('email'); setForm(f => ({ ...f, email: '', phone: '' })) }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left panel — image ────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-[44%] relative flex-col justify-between overflow-hidden p-12">

        {/* Full-bleed photo */}
        <img
          src="/saloon-login-image.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,20,0.65) 0%, rgba(10,10,20,0.10) 40%, rgba(10,10,20,0.70) 100%)' }} />

        <div className="relative z-10 flex items-center justify-between">
          <button onClick={() => navigate('/welcome')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-[14px] font-medium">
            <ArrowLeft size={16} /> Back to home
          </button>
          <div className="text-[20px] font-black">
            <span className="text-white">Kriyansh</span>
            <span className="text-white/60"> Beauty Bar</span>
          </div>
        </div>

        {/* Cursive tagline + Google Reviews — grouped at bottom */}
        <div className="relative z-10 space-y-3">
          {/* Perks chip */}
          <div className="hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2.5 space-y-1.5">
            <p className="text-[11px] text-white/70 leading-snug">
              Book appointments, manage your loyalty points, and access exclusive member perks — all in one place.
            </p>
            <div className="border-t border-white/15 pt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {[
                { icon: Sparkles, text: 'Earn points on every visit'           },
                { icon: Check,    text: 'Skip the queue with priority booking' },
                { icon: Lock,     text: 'Your data, always secure'             },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon size={11} className="text-white/60 shrink-0" />
                  <span className="text-[11px] text-white/75">{text}</span>
                </div>
              ))}
            </div>
          </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Roboto:ital@1&display=swap');
          @keyframes writeIn {
            0%   { clip-path: inset(0 100% 0 0); opacity: 0; }
            8%   { opacity: 1; }
            100% { clip-path: inset(0 0% 0 0); opacity: 1; }
          }
          .cursive-tagline {
            font-family: 'Roboto', sans-serif;
            font-style: italic;
            animation: writeIn 2.8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            white-space: nowrap;
          }
        `}</style>
        <p className="cursive-tagline text-white leading-none"
           style={{ fontSize: '28px', textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}>
          Your beauty journey starts here.
        </p>

        {/* Google Reviews widget */}
        <div>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-4 flex items-center gap-4">
            <svg width="22" height="22" viewBox="0 0 48 48" className="shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-[18px] leading-none">4.9</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FACC15"/>
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-white/55 text-[11px] mt-0.5">Based on 247 Google reviews</p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white relative">

        {/* Mobile back button */}
        <button onClick={() => navigate('/welcome')}
          className="md:hidden absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-[14px] font-medium">
          <ArrowLeft size={16} /> Home
        </button>

        {/* Mobile logo */}
        <div className="md:hidden text-[22px] font-black mb-10 text-center">
          <span className="text-[#0D9488]">Kriyansh</span>
          <span className="text-slate-900"> Salon</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[26px] font-black text-slate-900 leading-tight mb-1.5">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-[15px] text-slate-500">
              {mode === 'login'
                ? 'Sign in to access your bookings and loyalty rewards.'
                : 'Join thousands of happy clients at Kriyansh Salon.'}
            </p>
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-3 mb-7">
            {socialBtns.map(({ label, Icon, bg, border, text }) => (
              <button key={label}
                className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl border-2 ${bg} ${border} ${text} text-[14px] font-semibold hover:shadow-md transition-all active:scale-[0.98]`}>
                <Icon />
                <span className="flex-1 text-center">{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[13px] text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>


          {/* Form */}
          <form onSubmit={handleContinue} noValidate className="space-y-4">

            {/* Email / Phone — step 1 */}
            {step === 'email' && (
              <div>
                {inputMode === 'phone' ? (
                  <>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Phone number
                    </label>
                    <div className="flex items-center gap-0 rounded-2xl border-2 border-slate-200 focus-within:border-[#0D9488] focus-within:ring-4 focus-within:ring-[#CCFBF1] overflow-hidden transition-all">
                      <span className="flex items-center gap-1.5 pl-4 pr-3 py-3.5 text-[14px] text-slate-600 font-semibold border-r border-slate-200 shrink-0 bg-slate-50">
                        🇺🇸 +1
                      </span>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        placeholder="(555) 000-0000"
                        className="flex-1 px-4 py-3.5 text-[14px] outline-none bg-transparent placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setField('email', e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#CCFBF1] transition-all placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Password — step 2 */}
            {step === 'password' && (
              <>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl mb-5">
                  {inputMode === 'phone' ? <Phone size={15} className="text-slate-400 shrink-0" /> : <Mail size={15} className="text-slate-400 shrink-0" />}
                  <span className="text-[14px] text-slate-700 flex-1">{inputMode === 'phone' ? `+1 ${form.phone}` : form.email}</span>
                  <button type="button" onClick={() => setStep('email')}
                    className="text-[13px] font-semibold text-[#0D9488] hover:underline">
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    {mode === 'login' ? 'Password' : 'Create a password'}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setField('password', e.target.value)}
                      placeholder={mode === 'login' ? 'Enter your password' : 'Min. 8 characters'}
                      className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#CCFBF1] transition-all placeholder:text-slate-400"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {mode === 'login' && (
                    <button type="button"
                      className="text-[13px] text-[#0D9488] font-semibold mt-2 hover:underline">
                      Forgot password?
                    </button>
                  )}

                  {mode === 'signup' && (
                    <div className="mt-3 space-y-1.5">
                      {[
                        { check: form.password.length >= 8, text: '8+ characters' },
                        { check: /[A-Z]/.test(form.password), text: 'One uppercase letter' },
                        { check: /[0-9]/.test(form.password), text: 'One number' },
                      ].map(({ check, text }) => (
                        <div key={text} className="flex items-center gap-2 text-[12px]">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${check ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </div>
                          <span className={check ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Name — step 3 (signup only) */}
            {step === 'name' && (
              <>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl mb-5">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <span className="text-[14px] text-slate-700">{form.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'firstName', label: 'First name', placeholder: 'Jane' },
                    { key: 'lastName',  label: 'Last name',  placeholder: 'Smith' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          required
                          value={form[key]}
                          onChange={e => setField(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full pl-10 pr-3 py-3.5 rounded-2xl border-2 border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#CCFBF1] transition-all placeholder:text-slate-400"
                          autoFocus={key === 'firstName'}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Phone number <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setField('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 text-[14px] outline-none focus:border-[#0D9488] focus:ring-4 focus:ring-[#CCFBF1] transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Error message */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (step === 'email' && (inputMode === 'phone' ? !form.phone : !form.email))}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-[15px] font-black transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0D9488, #7C3AED)' }}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {step === 'name' ? 'Create my account' : step === 'password' && mode === 'login' ? 'Sign in' : 'Continue'}
                  <ChevronRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <p className="text-center text-[14px] text-slate-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStep('email') }}
              className="font-bold text-[#0D9488] hover:underline">
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>

          {/* Terms */}
          <p className="text-center text-[11px] text-slate-400 mt-5 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-slate-600">Terms of Service</a> and{' '}
            <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
