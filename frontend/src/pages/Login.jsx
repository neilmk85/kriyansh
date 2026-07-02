import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login }               = useAuth()
  const navigate                = useNavigate()
  const [email, setEmail]       = useState('owner@kriyansh.com')
  const [password, setPassword] = useState('admin123')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading]   = useState(false)

  function validate() {
    const errs = {}
    if (!email.trim())              errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address'
    if (!password)                  errs.password = 'Password is required'
    else if (password.length < 6)  errs.password = 'Password must be at least 6 characters'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const chips = [
    { style: { top:'7%',  left:'7%'  }, label: 'Smart Booking',  value: '↓ 62% No-Shows',  sub: 'Deposits + reminders',    delay: '0.4s'  },
    { style: { top:'6%',  right:'6%' }, label: 'PAX A920 POS',   value: '+22% Avg Ticket',  sub: 'Tap · Chip · Tip prompt', delay: '0.75s' },
    { style: { top:'39%', left:'5%'  }, label: 'Loyalty Engine', value: '3× Retention',     sub: 'Points · Tiers · Rewards',delay: '1.1s'  },
    { style: { top:'55%', right:'6%' }, label: 'Live Analytics', value: '$3,842 Today',      sub: 'Real-time revenue view',  delay: '1.45s' },
    { style: { top:'62%', left:'6%'  }, label: 'Auto Reminders', value: 'SMS Reminders',     sub: 'T-48h · T-3h · No-show', delay: '1.8s'  },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,700;0,800;1,700;1,800&display=swap');

        @keyframes typewriter {
          from { width: 0; }
          to   { width: 12ch; }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(28px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes taglineFade {
          from { opacity: 0; }
          to   { opacity: 0.75; }
        }

        .logo-name {
          font-size: 26px; font-weight: 800;
          letter-spacing: 0.10em;
          overflow: hidden; white-space: nowrap;
          width: 0;
          animation: typewriter 1.2s steps(9, end) 0.3s forwards;
        }

        .chip-card {
          position: absolute;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 16px;
          padding: 12px 16px;
          color: white;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.25);
          min-width: 180px;
          animation: floatIn 1.0s cubic-bezier(0.22,1,0.36,1) both;
        }

        .tagline-where {
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.22em; text-transform: uppercase;
          opacity: 0; margin-bottom: 2px;
          text-shadow: 0 1px 8px rgba(0,0,0,0.4);
          animation: slideLeft 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s forwards;
        }
        .tagline-beauty {
          font-family: 'Cormorant Garant', serif;
          font-style: italic; font-size: 44px; font-weight: 800;
          line-height: 1; letter-spacing: -0.01em;
          color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,0.35);
          margin-bottom: 0; opacity: 0;
          animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.5s forwards;
        }
        .tagline-meets {
          font-family: 'Cormorant Garant', serif;
          font-style: normal; font-size: 40px; font-weight: 700;
          line-height: 1; letter-spacing: 0.01em;
          color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,0.35);
          margin-bottom: 10px; opacity: 0;
          animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.72s forwards;
        }
        .tagline-sub {
          font-size: 12px; font-weight: 400;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 6px rgba(0,0,0,0.3);
          opacity: 0;
          animation: taglineFade 0.8s ease 1s forwards;
        }

        .btn-signin {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%);
          border: none; border-radius: 13px;
          color: white; font-size: 15px; font-weight: 700;
          font-family: 'Inter', sans-serif; cursor: pointer;
          box-shadow: 0 4px 18px rgba(13,148,136,0.32);
          transition: transform 0.15s, box-shadow 0.2s;
          position: relative; overflow: hidden;
        }
        .btn-signin::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
        }
        .btn-signin:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 26px rgba(13,148,136,0.38);
        }
        .btn-signin:active { transform: translateY(0); }
        .btn-signin:disabled { opacity: 0.65; cursor: not-allowed; }

        .btn-social {
          flex: 1; height: 48px;
          background: white; border: 1.5px solid #E2E8F0;
          border-radius: 12px; font-size: 13px; font-weight: 500;
          font-family: 'Inter', sans-serif; color: #0F172A;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .btn-social:hover {
          border-color: #CBD5E1;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }
      `}</style>

      <div style={{ display:'flex', height:'100vh', width:'100vw', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>

        {/* ── LEFT — Image + chips + tagline ─────────────────────────── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

          {/* Photo */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage: "url('https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1400&q=85&fit=crop&crop=faces,top')",
            backgroundSize:'cover', backgroundPosition:'50% 15%',
          }} />

          {/* Dark gradient overlay */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to top, rgba(10,40,38,0.55) 0%, rgba(10,40,38,0.10) 50%, transparent 100%)',
            zIndex:1,
          }} />

          {/* Logo top-centre */}
          <div style={{ position:'absolute', top:28, left:0, right:0, zIndex:4, display:'flex', justifyContent:'center' }}>
            <img src="/logo.png" alt="Kriyansh Beauty Bar" style={{ height:80 }} />
          </div>

          {/* Chips */}
          <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none' }}>
            {chips.map((c, i) => (
              <div key={i} className="chip-card" style={{ ...c.style, animationDelay: c.delay }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', opacity:0.75, marginBottom:2 }}>
                  {c.label}
                </div>
                <div style={{ fontSize:14, fontWeight:700, lineHeight:1.2 }}>{c.value}</div>
                <div style={{ fontSize:10, opacity:0.65, marginTop:1 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <div style={{ position:'absolute', bottom:36, left:36, zIndex:3, color:'white', maxWidth:340 }}>
            <div className="tagline-where">Where</div>
            <div className="tagline-beauty">Beauty</div>
            <div className="tagline-meets">Meets Business.</div>
            <div className="tagline-sub">Trusted by 500+ salons across Los Angeles</div>
          </div>
        </div>

        {/* ── RIGHT — Form ───────────────────────────────────────────── */}
        <div style={{
          width:'42%', minWidth:420,
          display:'flex', flexDirection:'column',
          justifyContent:'center',
          padding:'52px 64px',
          background:'#FFFFFF',
          position:'relative', zIndex:2,
        }}>
          {/* Logo */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:52 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'linear-gradient(135deg,#0D9488,#14B8A6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontSize:18,
              boxShadow:'0 4px 14px rgba(13,148,136,0.3)',
            }}>✦</div>
            <div className="logo-name" style={{ color:'#0F172A' }}>
              SALON<span style={{ color:'#0D9488' }}>OS</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:28, fontWeight:800, color:'#0F172A', letterSpacing:'-0.02em', margin:0 }}>
              Sign In
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div style={{
              marginBottom:20, padding:'12px 14px',
              background:'#FEF2F2', border:'1.5px solid #FECACA',
              borderRadius:10, fontSize:13, color:'#DC2626',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:7 }}>
                Email
              </label>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email:'' })) }}
                placeholder="you@salonos.com"
                style={{
                  width:'100%', height:48, padding:'0 16px',
                  border: fieldErrors.email ? '1.5px solid #F87171' : '1.5px solid #E2E8F0',
                  borderRadius:12, fontSize:14, fontFamily:'Inter,sans-serif',
                  color:'#0F172A', background: fieldErrors.email ? '#FFF5F5' : '#FAFCFF',
                  outline:'none', boxSizing:'border-box',
                  transition:'border-color 0.18s, box-shadow 0.18s',
                }}
                onFocus={e => { e.target.style.borderColor='#14B8A6'; e.target.style.boxShadow='0 0 0 3px rgba(20,184,166,0.12)'; e.target.style.background='#fff' }}
                onBlur={e  => { e.target.style.borderColor = fieldErrors.email ? '#F87171' : '#E2E8F0'; e.target.style.boxShadow='none' }}
              />
              {fieldErrors.email && (
                <p style={{ fontSize:12, color:'#EF4444', marginTop:5, marginBottom:0, display:'flex', alignItems:'center', gap:4 }}>
                  <span>✕</span> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:7 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password:'' })) }}
                  placeholder="••••••••••"
                  style={{
                    width:'100%', height:48, padding:'0 44px 0 16px',
                    border: fieldErrors.password ? '1.5px solid #F87171' : '1.5px solid #E2E8F0',
                    borderRadius:12, fontSize:14, fontFamily:'Inter,sans-serif',
                    color:'#0F172A', background: fieldErrors.password ? '#FFF5F5' : '#FAFCFF',
                    outline:'none', boxSizing:'border-box',
                    transition:'border-color 0.18s, box-shadow 0.18s',
                  }}
                  onFocus={e => { e.target.style.borderColor='#14B8A6'; e.target.style.boxShadow='0 0 0 3px rgba(20,184,166,0.12)'; e.target.style.background='#fff' }}
                  onBlur={e  => { e.target.style.borderColor = fieldErrors.password ? '#F87171' : '#E2E8F0'; e.target.style.boxShadow='none' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {fieldErrors.password && (
                <p style={{ fontSize:12, color:'#EF4444', marginTop:5, marginBottom:0, display:'flex', alignItems:'center', gap:4 }}>
                  <span>✕</span> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Forgot */}
            <div style={{ textAlign:'right', marginTop:-8, marginBottom:28 }}>
              <a href="#" style={{ fontSize:12, fontWeight:600, color:'#0D9488', textDecoration:'none' }}>
                Forgot password?
              </a>
            </div>

            {/* Sign In */}
            <button type="submit" className="btn-signin" disabled={loading} style={{ marginBottom:22 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            {/* Or divider */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
              <span style={{ fontSize:12, color:'#94A3B8', whiteSpace:'nowrap' }}>or</span>
              <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
            </div>

            {/* Social */}
            <div style={{ display:'flex', gap:12 }}>
              <button type="button" className="btn-social">
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button type="button" className="btn-social">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
