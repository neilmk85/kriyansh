import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, Save, Star, MessageSquare, User, Lock } from 'lucide-react'
import api from '@/lib/api'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-[13px] font-semibold flex items-center gap-2 animate-fade-in">
      ✓ {message}
    </div>
  )
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }

const DEFAULT_HOURS = DAYS.map(d => ({
  day: d,
  is_open: d !== 'sunday',
  open_time: '09:00',
  close_time: '19:00',
}))

export default function Settings() {
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  // ── Salon Info state ──────────────────────────────────────────────
  const [info, setInfo] = useState({
    salon_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    tax_rate: '10.25',
  })

  // ── Business Hours state ──────────────────────────────────────────
  const [hours, setHours] = useState(DEFAULT_HOURS)

  // ── Review Automation state ───────────────────────────────────────
  const [review, setReview] = useState({
    review_enabled: false,
    review_channel: 'sms',
    review_delay_hours: 2,
    yelp_url: '',
    google_review_url: '',
  })

  // Populate from API
  useEffect(() => {
    if (!data) return
    if (data.salon_name !== undefined) {
      setInfo(prev => ({
        ...prev,
        salon_name: data.salon_name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        zip: data.zip ?? '',
        timezone: data.timezone ?? 'America/Los_Angeles',
        currency: data.currency ?? 'USD',
        tax_rate: data.tax_rate != null ? String(data.tax_rate) : '10.25',
      }))
    }
    if (Array.isArray(data.hours) && data.hours.length) {
      setHours(data.hours)
    }
    setReview({
      review_enabled: !!data.review_enabled,
      review_channel: data.review_channel ?? 'sms',
      review_delay_hours: data.review_delay_hours ?? 2,
      yelp_url: data.yelp_url ?? '',
      google_review_url: data.google_review_url ?? '',
    })
  }, [data])

  // ── Mutations ─────────────────────────────────────────────────────
  const saveInfo = useMutation({
    mutationFn: () => api.put('/settings', { ...info, tax_rate: parseFloat(info.tax_rate) }),
    onSuccess: () => { qc.invalidateQueries(['settings']); setToast('Salon info saved') },
  })

  const saveHours = useMutation({
    mutationFn: () => api.put('/settings', { hours }),
    onSuccess: () => { qc.invalidateQueries(['settings']); setToast('Business hours saved') },
  })

  const saveReview = useMutation({
    mutationFn: () => api.put('/settings', {
      ...review,
      review_delay_hours: parseInt(review.review_delay_hours) || 2,
    }),
    onSuccess: () => { qc.invalidateQueries(['settings']); setToast('Review settings saved') },
  })

  function setInfoField(k) {
    return e => setInfo(prev => ({ ...prev, [k]: e.target.value }))
  }

  function setHourField(day, field, value) {
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h))
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-[13px]">Loading…</div>
  )

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div>
        <h1 className="text-[22px] font-bold text-slate-800 flex items-center gap-2">
          <Settings2 size={20} className="text-[#0D9488]" /> Settings
        </h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Manage your salon configuration</p>
      </div>

      {/* ── Section A: Salon Info ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800">Salon Information</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Basic info about your business</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Salon Name">
            <input value={info.salon_name} onChange={setInfoField('salon_name')} className={inp} placeholder="Kriyansh Salon" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input value={info.phone} onChange={setInfoField('phone')} className={inp} placeholder="3105551234" />
            </Field>
            <Field label="Email">
              <input type="email" value={info.email} onChange={setInfoField('email')} className={inp} placeholder="hello@salon.com" />
            </Field>
          </div>

          <Field label="Address">
            <input value={info.address} onChange={setInfoField('address')} className={inp} placeholder="123 Rodeo Drive" />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input value={info.city} onChange={setInfoField('city')} className={inp} placeholder="Beverly Hills" />
            </Field>
            <Field label="State">
              <input value={info.state} onChange={setInfoField('state')} className={inp} placeholder="CA" />
            </Field>
            <Field label="Zip">
              <input value={info.zip} onChange={setInfoField('zip')} className={inp} placeholder="90210" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Timezone">
              <select value={info.timezone} onChange={setInfoField('timezone')} className={inp}>
                <option value="America/Los_Angeles">Pacific (LA)</option>
                <option value="America/Denver">Mountain (Denver)</option>
                <option value="America/Chicago">Central (Chicago)</option>
                <option value="America/New_York">Eastern (New York)</option>
              </select>
            </Field>
            <Field label="Currency">
              <input value="USD" disabled className={inp + ' opacity-60 cursor-not-allowed'} />
            </Field>
            <Field label="Tax Rate (%)">
              <input
                type="number" step="0.01" min="0" max="30"
                value={info.tax_rate} onChange={setInfoField('tax_rate')}
                className={inp} placeholder="10.25"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => saveInfo.mutate()}
            disabled={saveInfo.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold  disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {saveInfo.isPending ? 'Saving…' : 'Save Salon Info'}
          </button>
        </div>
      </div>

      {/* ── Section B: Business Hours ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="mb-5">
          <h2 className="text-[16px] font-bold text-slate-800">Business Hours</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Set your opening hours for each day</p>
        </div>

        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[120px_80px_1fr_1fr] gap-3 px-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Day</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Open</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Opens at</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Closes at</span>
          </div>

          {hours.map(h => (
            <div
              key={h.day}
              className={`grid grid-cols-[120px_80px_1fr_1fr] gap-3 items-center px-3 py-2.5 rounded-xl transition-colors ${
                h.is_open ? 'bg-[#F0FDFA] border border-[#CCFBF1]' : 'bg-slate-50 border border-slate-100'
              }`}
            >
              <span className={`text-[13px] font-semibold ${h.is_open ? 'text-slate-800' : 'text-slate-400'}`}>
                {DAY_LABELS[h.day]}
              </span>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setHourField(h.day, 'is_open', !h.is_open)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                  h.is_open ? 'bg-[#0D9488]' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  h.is_open ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>

              <input
                type="time"
                value={h.open_time}
                disabled={!h.is_open}
                onChange={e => setHourField(h.day, 'open_time', e.target.value)}
                className={`px-3 py-2 rounded-xl border text-[13px] outline-none transition-all ${
                  h.is_open
                    ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
                    : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />

              <input
                type="time"
                value={h.close_time}
                disabled={!h.is_open}
                onChange={e => setHourField(h.day, 'close_time', e.target.value)}
                className={`px-3 py-2 rounded-xl border text-[13px] outline-none transition-all ${
                  h.is_open
                    ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
                    : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => saveHours.mutate()}
            disabled={saveHours.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold  disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {saveHours.isPending ? 'Saving…' : 'Save Business Hours'}
          </button>
        </div>
      </div>

      {/* ── Review Automation ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star size={16} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">Review Automation</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Send review requests after checkout. 4★+ goes to Yelp/Google; below 4★ stays private.</p>
            </div>
          </div>
          {/* Enable toggle */}
          <button
            onClick={() => setReview(p => ({ ...p, review_enabled: !p.review_enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${review.review_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${review.review_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className={`space-y-4 transition-opacity ${review.review_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          {/* Channel selector */}
          <Field label="Send Via">
            <div className="flex gap-3">
              {[
                { value: 'sms', label: 'SMS', icon: '💬' },
                { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setReview(p => ({ ...p, review_channel: opt.value }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                    review.review_channel === opt.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Email is always sent in addition when a client's email is on file.
            </p>
          </Field>

          {/* Delay */}
          <Field label="Send After (hours)">
            <div className="flex items-center gap-3">
              {[1, 2, 4, 6, 12, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setReview(p => ({ ...p, review_delay_hours: h }))}
                  className={`px-3 py-2 rounded-xl border text-[13px] font-medium transition-all ${
                    review.review_delay_hours === h
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Yelp Review URL">
              <input className={inp} placeholder="https://yelp.com/biz/…"
                value={review.yelp_url}
                onChange={e => setReview(p => ({ ...p, yelp_url: e.target.value }))} />
            </Field>
            <Field label="Google Review URL">
              <input className={inp} placeholder="https://g.page/…"
                value={review.google_review_url}
                onChange={e => setReview(p => ({ ...p, google_review_url: e.target.value }))} />
            </Field>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex gap-2">
            <MessageSquare size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-blue-700">
              Add <strong>TWILIO_ACCOUNT_SID</strong>, <strong>TWILIO_AUTH_TOKEN</strong>, and <strong>TWILIO_FROM_NUMBER</strong> to the backend <code>.env</code> to activate sending. Add <strong>SENDGRID_API_KEY</strong> for emails.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => saveReview.mutate()}
            disabled={saveReview.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {saveReview.isPending ? 'Saving…' : 'Save Review Settings'}
          </button>
        </div>
      </div>

      {/* ── My Account ─────────────────────────────────────────────── */}
      <MyAccount onToast={setToast} />
    </div>
  )
}

function MyAccount({ onToast }) {
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [pass, setPass] = useState({ current_password: '', new_password: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passError, setPassError] = useState('')

  useEffect(() => {
    api.get('/auth/me').then(r => setProfile({
      first_name: r.data.first_name || '',
      last_name:  r.data.last_name  || '',
      email:      r.data.email      || '',
      phone:      r.data.phone      || '',
    })).catch(() => {})
  }, [])

  async function saveProfile() {
    setSavingProfile(true)
    try {
      await api.put('/auth/me', profile)
      onToast('Profile updated')
    } catch {
      onToast('Failed to save')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword() {
    setPassError('')
    if (pass.new_password !== pass.confirm) { setPassError('New passwords do not match'); return }
    if (pass.new_password.length < 6) { setPassError('Password must be at least 6 characters'); return }
    setSavingPass(true)
    try {
      await api.put('/auth/password', { current_password: pass.current_password, new_password: pass.new_password })
      setPass({ current_password: '', new_password: '', confirm: '' })
      onToast('Password changed')
    } catch (e) {
      setPassError(e.response?.data?.error || 'Failed to change password')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <User size={16} className="text-indigo-500" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">My Account</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Update your name, email and password</p>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-4">
        <h4 className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Personal Info</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name">
            <input className={inp} value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
          </Field>
          <Field label="Last name">
            <input className={inp} value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className={inp} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <input className={inp} type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button onClick={saveProfile} disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors">
            <Save size={14} />
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Change password */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={13} className="text-slate-400" />
          <h4 className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest">Change Password</h4>
        </div>
        <div className="grid grid-cols-1 gap-4 max-w-sm">
          <Field label="Current password">
            <input className={inp} type="password" value={pass.current_password}
              onChange={e => setPass(p => ({ ...p, current_password: e.target.value }))} />
          </Field>
          <Field label="New password">
            <input className={inp} type="password" value={pass.new_password}
              onChange={e => setPass(p => ({ ...p, new_password: e.target.value }))} />
          </Field>
          <Field label="Confirm new password">
            <input className={inp} type="password" value={pass.confirm}
              onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} />
          </Field>
        </div>
        {passError && <p className="text-[12px] text-red-500">{passError}</p>}
        <div className="flex justify-end">
          <button onClick={savePassword} disabled={savingPass || !pass.current_password || !pass.new_password}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors">
            <Lock size={14} />
            {savingPass ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
