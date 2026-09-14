import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings2, Save, Star, MessageSquare, User, Lock,
  Globe, Share2, CalendarOff, Plus, Trash2, Upload, Image,
  Terminal, Wifi, WifiOff, Loader2,
} from 'lucide-react'
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

function SectionCard({ icon, title, subtitle, children, onSave, saving, saveLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
      {onSave && (
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving…' : (saveLabel || 'Save')}
          </button>
        </div>
      )}
    </div>
  )
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-[13px] font-semibold flex items-center gap-2">
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

const AUS_TIMEZONES = [
  { value: 'Australia/Melbourne', label: 'Melbourne / Sydney (AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST, no DST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST, no DST)' },
  { value: 'Australia/Lord_Howe', label: 'Lord Howe Island' },
]

export default function Settings() {
  const qc = useQueryClient()
  const [toast, setToast] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  // ── Salon Info ──────────────────────────────────────────────────────
  const [info, setInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'Australia/Melbourne',
    currency: 'AUD',
    tax_rate: '10',
    logo_url: '',
    abn: '',
    gst_registered: false,
    website_url: '',
    instagram_url: '',
    facebook_url: '',
  })

  // ── Business Hours ──────────────────────────────────────────────────
  const [hours, setHours] = useState(DEFAULT_HOURS)

  // ── Review Automation ───────────────────────────────────────────────
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
    setInfo(prev => ({
      ...prev,
      name:           data.name           ?? '',
      phone:          data.phone          ?? '',
      email:          data.email          ?? '',
      address:        data.address        ?? '',
      city:           data.city           ?? '',
      state:          data.state          ?? '',
      zip:            data.zip            ?? '',
      timezone:       data.timezone       ?? 'Australia/Melbourne',
      currency:       data.currency       ?? 'AUD',
      tax_rate:       data.tax_rate != null ? String(data.tax_rate) : '10',
      logo_url:       data.logo_url       ?? '',
      abn:            data.abn            ?? '',
      gst_registered: !!data.gst_registered,
      website_url:    data.website_url    ?? '',
      instagram_url:  data.instagram_url  ?? '',
      facebook_url:   data.facebook_url   ?? '',
    }))
    if (Array.isArray(data.hours) && data.hours.length) {
      setHours(data.hours)
    }
    setReview({
      review_enabled:    !!data.review_enabled,
      review_channel:    data.review_channel    ?? 'sms',
      review_delay_hours: data.review_delay_hours ?? 2,
      yelp_url:          data.yelp_url           ?? '',
      google_review_url: data.google_review_url  ?? '',
    })
  }, [data])

  // ── Mutations ───────────────────────────────────────────────────────
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

      {/* ── A: Salon Info ─────────────────────────────────────────── */}
      <SectionCard
        title="Salon Information"
        subtitle="Basic info about your business"
        onSave={() => saveInfo.mutate()}
        saving={saveInfo.isPending}
        saveLabel="Save Salon Info"
      >
        {/* Logo */}
        <LogoUpload
          value={info.logo_url}
          onChange={url => setInfo(prev => ({ ...prev, logo_url: url }))}
          onToast={setToast}
        />

        <Field label="Salon Name">
          <input value={info.name} onChange={setInfoField('name')} className={inp} placeholder="Kriyansh Beauty Bar" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input value={info.phone} onChange={setInfoField('phone')} className={inp} placeholder="03 9000 0000" />
          </Field>
          <Field label="Email">
            <input type="email" value={info.email} onChange={setInfoField('email')} className={inp} placeholder="hello@salon.com.au" />
          </Field>
        </div>

        <Field label="Address">
          <input value={info.address} onChange={setInfoField('address')} className={inp} placeholder="123 Collins Street" />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="City / Suburb">
            <input value={info.city} onChange={setInfoField('city')} className={inp} placeholder="Melbourne" />
          </Field>
          <Field label="State">
            <select value={info.state} onChange={setInfoField('state')} className={inp}>
              {['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Postcode">
            <input value={info.zip} onChange={setInfoField('zip')} className={inp} placeholder="3000" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Timezone">
            <select value={info.timezone} onChange={setInfoField('timezone')} className={inp}>
              {AUS_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <input value="AUD" disabled className={inp + ' opacity-60 cursor-not-allowed'} />
          </Field>
          <Field label="GST Rate (%)">
            <input
              type="number" step="0.5" min="0" max="30"
              value={info.tax_rate} onChange={setInfoField('tax_rate')}
              className={inp} placeholder="10"
            />
          </Field>
        </div>

        {/* GST / ABN */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Tax Details</p>
          <div className="grid grid-cols-2 gap-4 items-end">
            <Field label="ABN">
              <input value={info.abn} onChange={setInfoField('abn')} className={inp} placeholder="12 345 678 901" maxLength={14} />
            </Field>
            <div className="flex items-center gap-3 pb-2.5">
              <button
                type="button"
                onClick={() => setInfo(prev => ({ ...prev, gst_registered: !prev.gst_registered }))}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${info.gst_registered ? 'bg-[#0D9488]' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${info.gst_registered ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-[13px] text-slate-700">Registered for GST</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── B: Social & Online ───────────────────────────────────── */}
      <SectionCard
        icon={<Globe size={16} className="text-teal-600" />}
        title="Social & Online"
        subtitle="Links shown on your booking page and receipts"
        onSave={() => saveInfo.mutate()}
        saving={saveInfo.isPending}
        saveLabel="Save Links"
      >
        <Field label="Website">
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={info.website_url} onChange={setInfoField('website_url')} className={inp + ' pl-8'} placeholder="https://yoursalon.com.au" />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">IG</span>
              <input value={info.instagram_url} onChange={setInfoField('instagram_url')} className={inp + ' pl-8'} placeholder="https://instagram.com/yoursalon" />
            </div>
          </Field>
          <Field label="Facebook">
            <div className="relative">
              <Share2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={info.facebook_url} onChange={setInfoField('facebook_url')} className={inp + ' pl-8'} placeholder="https://facebook.com/yoursalon" />
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ── C: Business Hours ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="mb-5">
          <h2 className="text-[15px] font-bold text-slate-800">Business Hours</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Set your opening hours for each day</p>
        </div>

        <div className="space-y-2">
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
              <button
                type="button"
                onClick={() => setHourField(h.day, 'is_open', !h.is_open)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${h.is_open ? 'bg-[#0D9488]' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${h.is_open ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <input
                type="time"
                value={h.open_time}
                disabled={!h.is_open}
                onChange={e => setHourField(h.day, 'open_time', e.target.value)}
                className={`px-3 py-2 rounded-xl border text-[13px] outline-none transition-all ${
                  h.is_open ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
                    : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
              <input
                type="time"
                value={h.close_time}
                disabled={!h.is_open}
                onChange={e => setHourField(h.day, 'close_time', e.target.value)}
                className={`px-3 py-2 rounded-xl border text-[13px] outline-none transition-all ${
                  h.is_open ? 'border-slate-200 bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
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
            className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {saveHours.isPending ? 'Saving…' : 'Save Business Hours'}
          </button>
        </div>
      </div>

      {/* ── D: Holidays ──────────────────────────────────────────── */}
      <HolidaysSection onToast={setToast} />

      {/* ── E: Review Automation ─────────────────────────────────── */}
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
          <button
            onClick={() => setReview(p => ({ ...p, review_enabled: !p.review_enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${review.review_enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${review.review_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className={`space-y-4 transition-opacity ${review.review_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
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
            <p className="text-[11px] text-slate-400 mt-1.5">Email is always sent in addition when a client's email is on file.</p>
          </Field>

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
              Add <strong>TWILIO_ACCOUNT_SID</strong>, <strong>TWILIO_AUTH_TOKEN</strong>, and <strong>TWILIO_FROM_NUMBER</strong> to the backend <code>.env</code> to activate sending.
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

      {/* ── F: PAX Terminal ──────────────────────────────────────── */}
      <PAXSettingsSection onToast={setToast} />

      {/* ── G: My Account ────────────────────────────────────────── */}
      <MyAccount onToast={setToast} />
    </div>
  )
}

// ── PAX Terminal Settings ─────────────────────────────────────────────
function PAXSettingsSection({ onToast }) {
  const [ip,   setIp]   = useState('')
  const [port, setPort] = useState('10009')
  const [loading, setLoading] = useState(true)
  const [pingStatus, setPingStatus] = useState(null) // null | 'checking' | true | false
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/pax/settings').then(r => {
      setIp(r.data?.pax_terminal_ip || '')
      setPort(String(r.data?.pax_terminal_port || 10009))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handlePing() {
    setPingStatus('checking')
    try {
      const r = await api.get('/pax/ping')
      setPingStatus(r.data?.online === true)
    } catch {
      setPingStatus(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/pax/settings', { pax_terminal_ip: ip, pax_terminal_port: parseInt(port) || 10009 })
      onToast('PAX terminal settings saved')
      setPingStatus(null)
    } catch {
      onToast('Failed to save PAX settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <Terminal size={16} className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">PAX Terminal</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Connect a PAX payment terminal on your local network (POSLINK HTTP)</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Field label="Terminal IP Address">
              <input value={ip} onChange={e => { setIp(e.target.value); setPingStatus(null) }}
                className={inp} placeholder="192.168.1.100" />
            </Field>
            <Field label="Port">
              <input value={port} onChange={e => setPort(e.target.value)}
                className={inp} placeholder="10009" />
            </Field>
          </div>

          {ip && (
            <div className="flex items-center gap-3">
              <button onClick={handlePing} disabled={pingStatus === 'checking'}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors">
                {pingStatus === 'checking' ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                Test Connection
              </button>
              {pingStatus === true && (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-green-600">
                  <Wifi size={13} /> Terminal online
                </span>
              )}
              {pingStatus === false && (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-red-500">
                  <WifiOff size={13} /> Unreachable — check IP and that terminal is powered on
                </span>
              )}
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-[12px] text-slate-500 space-y-1">
            <p><strong>Supported models:</strong> PAX A920, A920 Pro, S300, S500, S920, E600, IM30, A80</p>
            <p>Terminal must be on the same LAN. Default POSLINK port is <code>10009</code>.</p>
            <p>In POS → Card/Tap → a "Send to Terminal" button appears when the terminal is online.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold disabled:opacity-60 transition-colors">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Terminal Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Logo Upload ───────────────────────────────────────────────────────
function LogoUpload({ value, onChange, onToast }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload?type=logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
      onToast('Logo uploaded — save to keep it')
    } catch {
      onToast('Logo upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
        {value
          ? <img src={value} alt="Logo" className="w-full h-full object-contain p-1" />
          : <Image size={24} className="text-slate-300" />
        }
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-slate-700">Salon Logo</p>
        <p className="text-[11px] text-slate-400">PNG or JPG, shown on booking page and receipts</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-colors disabled:opacity-50"
          >
            <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload Logo'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ── Holidays Section ──────────────────────────────────────────────────
function HolidaysSection({ onToast }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ date: '', name: '', repeat_yearly: false })
  const [adding, setAdding] = useState(false)

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => api.get('/holidays').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/holidays', form),
    onSuccess: () => {
      qc.invalidateQueries(['holidays'])
      setForm({ date: '', name: '', repeat_yearly: false })
      setAdding(false)
      onToast('Holiday added')
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/holidays/${id}`),
    onSuccess: () => { qc.invalidateQueries(['holidays']); onToast('Holiday removed') },
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <CalendarOff size={16} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-800">Public Holidays & Closures</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Dates when the salon is closed — blocked from online bookings</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[12px] font-semibold hover:bg-teal-100 transition-colors"
        >
          <Plus size={13} /> Add Holiday
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Name">
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inp}
                placeholder="e.g. Christmas Day"
              />
            </Field>
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.date || !form.name}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white bg-[#0D9488] text-[13px] font-semibold disabled:opacity-50 transition-colors"
            >
              <Plus size={13} /> {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.repeat_yearly}
              onChange={e => setForm(p => ({ ...p, repeat_yearly: e.target.checked }))}
              className="w-4 h-4 rounded accent-teal-600"
            />
            <span className="text-[12px] text-slate-600">Repeat every year</span>
          </label>
        </div>
      )}

      {/* List */}
      {holidays.length === 0 ? (
        <p className="text-[13px] text-slate-400 text-center py-6">No holidays added yet</p>
      ) : (
        <div className="space-y-2">
          {holidays.map(h => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-50 border border-orange-100">
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{h.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  {h.repeat_yearly && <span className="ml-2 text-teal-600">· repeats yearly</span>}
                </p>
              </div>
              <button
                onClick={() => remove.mutate(h.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── My Account ────────────────────────────────────────────────────────
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
