import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, MessageSquare, Mail, Users, Clock, Sparkles, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'

const SEGMENTS = [
  {
    value: 'all',
    label: 'All Clients',
    desc: 'Every client in your database',
    icon: Users,
    iconColor: '#64748b',
    bg: '#F8FAFC',
    border: '#E2E8F0',
  },
  {
    value: 'new',
    label: 'New Clients',
    desc: 'First visit in the last 30 days',
    icon: Sparkles,
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    value: 'vip',
    label: 'VIP',
    desc: 'High-value, frequent visitors',
    icon: CheckCircle2,
    iconColor: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    value: 'at_risk',
    label: 'At-Risk',
    desc: 'No visit in 30–60 days',
    icon: Clock,
    iconColor: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    value: 'lapsed',
    label: 'Lapsed',
    desc: 'No visit in over 60 days',
    icon: MessageSquare,
    iconColor: '#DC2626',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
]

const SMS_LIMIT = 140

export default function NewCampaign() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    segment: searchParams.get('segment') ?? 'all',
    channel: 'sms',
    message: '',
  })
  const [segmentCount, setSegmentCount] = useState(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [sendConfirm, setSendConfirm] = useState(false)

  const fetchSegmentCount = useCallback(async (segment) => {
    setLoadingCount(true)
    try {
      const res = await api.get(`/marketing/segments/${segment}/count`)
      setSegmentCount(res.data?.count ?? res.data ?? null)
    } catch { setSegmentCount(null) }
    finally { setLoadingCount(false) }
  }, [])

  useEffect(() => { fetchSegmentCount(form.segment) }, [form.segment, fetchSegmentCount])

  const saveMutation = useMutation({
    mutationFn: body => api.post('/marketing/campaigns', body),
    onSuccess: () => {
      qc.invalidateQueries(['marketing-campaigns'])
      navigate('/admin/marketing')
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/marketing/campaigns', { ...form })
      await api.post(`/marketing/campaigns/${res.data.id}/send`)
      return res.data.id
    },
    onSuccess: () => {
      qc.invalidateQueries(['marketing-campaigns'])
      navigate('/admin/marketing')
    },
  })

  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const isSmsCapped = form.channel === 'sms' && form.message.length >= SMS_LIMIT
  const canSubmit = form.name.trim() && form.message.trim()
  const selectedSegment = SEGMENTS.find(s => s.value === form.segment)

  return (
    <div className="max-w-2xl mx-auto">

      {/* Back nav */}
      <button
        onClick={() => navigate('/admin/marketing')}
        className="flex items-center gap-2 text-[13px] text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Marketing
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-slate-900">New Campaign</h1>
        <p className="text-[14px] text-slate-500 mt-1">Choose your audience, write your message, and send or save as a draft.</p>
      </div>

      <div className="space-y-8">

        {/* ── Step 1: Name ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            1 · Campaign name
          </h2>
          <input
            value={form.name}
            onChange={e => set('name')(e.target.value)}
            placeholder="e.g. Summer Re-engagement, Back to School Promo…"
            className="w-full px-4 py-3 text-[14px] rounded-xl border border-slate-200 outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] bg-white transition-all placeholder:text-slate-300"
          />
        </section>

        {/* ── Step 2: Audience ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            2 · Target audience
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {SEGMENTS.map(s => {
              const Icon = s.icon
              const active = form.segment === s.value
              return (
                <label
                  key={s.value}
                  className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    active
                      ? 'border-[#0D9488] bg-[#F0FDFA] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input type="radio" className="sr-only" checked={active} onChange={() => set('segment')(s.value)} />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: active ? `${s.iconColor}22` : s.bg, border: `1px solid ${s.border}` }}
                  >
                    <Icon size={17} style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-800">{s.label}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{s.desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {active && (
                      <span className="text-[14px] font-bold text-[#0D9488]">
                        {loadingCount
                          ? <span className="text-slate-300">…</span>
                          : segmentCount != null ? segmentCount : '—'}
                      </span>
                    )}
                    {active && segmentCount != null && (
                      <p className="text-[11px] text-slate-400">clients</p>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                    active ? 'border-[#0D9488] bg-[#0D9488]' : 'border-slate-300'
                  }`}>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </label>
              )
            })}
          </div>
        </section>

        {/* ── Step 3: Channel ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            3 · Channel
          </h2>
          <div className="flex gap-3">
            {[
              { value: 'sms', icon: MessageSquare, label: 'SMS', desc: 'Text message, up to 140 characters' },
              { value: 'email', icon: Mail, label: 'Email', desc: 'Full email with no character limit' },
            ].map(ch => {
              const Icon = ch.icon
              const active = form.channel === ch.value
              return (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => set('channel')(ch.value)}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                    active
                      ? 'border-[#0D9488] bg-[#F0FDFA] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? 'bg-[#0D9488]' : 'bg-slate-100'
                  }`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-[14px] font-semibold ${active ? 'text-[#0D9488]' : 'text-slate-800'}`}>{ch.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{ch.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Step 4: Message ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
              4 · Message
            </h2>
            {form.channel === 'sms' && (
              <span className={`text-[12px] font-semibold ${isSmsCapped ? 'text-red-500' : 'text-slate-400'}`}>
                {form.message.length} / {SMS_LIMIT}
              </span>
            )}
          </div>
          <textarea
            value={form.message}
            onChange={e => {
              const val = form.channel === 'sms' ? e.target.value.slice(0, SMS_LIMIT) : e.target.value
              set('message')(val)
            }}
            rows={6}
            placeholder={form.channel === 'sms'
              ? 'Hi {name}, we miss you at Kriyansh Beauty Bar! Book your next appointment…'
              : 'Write your email message here…'}
            className={`w-full px-4 py-3.5 text-[14px] rounded-xl border outline-none transition-all resize-none bg-white placeholder:text-slate-300 leading-relaxed ${
              isSmsCapped
                ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                : 'border-slate-200 focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1]'
            }`}
          />
          {isSmsCapped && <p className="text-[12px] text-red-500 mt-1.5">Character limit reached for SMS</p>}

          {/* Live preview */}
          {form.message && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Preview</p>
              <div className={`rounded-xl p-4 text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed ${
                form.channel === 'sms' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                {form.message}
              </div>
            </div>
          )}
        </section>

        {/* ── Summary + Actions ────────────────────────────────────────────── */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Summary</h2>
          <div className="space-y-2.5 text-[13px] mb-5">
            <Row label="Campaign" value={form.name || <span className="text-slate-300 italic">Not set</span>} />
            <Row
              label="Audience"
              value={
                <span className="flex items-center gap-2">
                  {selectedSegment?.label}
                  {segmentCount != null && !loadingCount && (
                    <span className="text-[11px] font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded-full">
                      {segmentCount} clients
                    </span>
                  )}
                </span>
              }
            />
            <Row label="Channel" value={form.channel.toUpperCase()} />
            <Row label="Message" value={form.message ? `${form.message.length} chars` : <span className="text-slate-300 italic">Not written</span>} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => saveMutation.mutate({ ...form })}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-[13.5px] font-semibold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              onClick={() => setSendConfirm(true)}
              disabled={!canSubmit}
              className="flex-1 py-3 rounded-xl text-white bg-[#0D9488] hover:bg-[#0B8279] text-[13.5px] font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Send size={15} /> Send Now
            </button>
          </div>
        </section>
      </div>

      {/* ── Send confirmation ─────────────────────────────────────────────── */}
      {sendConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-5">
              <Send size={24} className="text-[#0D9488]" />
            </div>
            <h2 className="text-[18px] font-bold text-slate-900 mb-2">Ready to send?</h2>
            <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
              This will send your {form.channel.toUpperCase()} to{' '}
              <strong className="text-slate-900">{segmentCount != null ? `${segmentCount} client${segmentCount !== 1 ? 's' : ''}` : 'selected clients'}</strong>.
              {' '}This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSendConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-white bg-[#0D9488] hover:bg-[#0B8279] text-[13px] font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {sendMutation.isPending ? 'Sending…' : <><Send size={13} /> Confirm Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  )
}
