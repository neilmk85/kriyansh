import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Send, Users, Mail, MessageSquare, X, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const SEGMENTS = [
  { value: 'all',      label: 'All Clients',      color: 'bg-slate-100 text-slate-600 border-slate-200'     },
  { value: 'vip',      label: 'VIP',              color: 'bg-purple-100 text-purple-700 border-purple-200'  },
  { value: 'at_risk',  label: 'At-Risk (30-60d)',  color: 'bg-orange-100 text-orange-700 border-orange-200'  },
  { value: 'lapsed',   label: 'Lapsed (60d+)',     color: 'bg-red-100 text-red-600 border-red-200'           },
  { value: 'new',      label: 'New Clients',       color: 'bg-blue-100 text-blue-700 border-blue-200'        },
]

function SegmentBadge({ segment, size = 'sm' }) {
  const s = SEGMENTS.find(x => x.value === segment) ?? SEGMENTS[0]
  const cls = size === 'sm'
    ? `text-[11px] px-2 py-0.5 rounded-full font-semibold border ${s.color}`
    : `text-[12px] px-2.5 py-1 rounded-full font-semibold border ${s.color}`
  return <span className={cls}>{s.label}</span>
}

function StatusBadge({ status }) {
  const cls = status === 'sent'
    ? 'bg-green-100 text-green-700'
    : 'bg-slate-100 text-slate-500'
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}

const EMPTY_FORM = {
  name: '', segment: 'all', channel: 'sms', message: '',
}

export default function Marketing() {
  const qc = useQueryClient()
  const [selectedId,   setSelectedId]   = useState(null)
  const [showBuilder,  setShowBuilder]  = useState(false)
  const [form,         setForm]         = useState({ ...EMPTY_FORM })
  const [sendConfirm,  setSendConfirm]  = useState(null) // { campaignId, count, channel }
  const [segmentCount, setSegmentCount] = useState(null)
  const [loadingCount, setLoadingCount] = useState(false)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => api.get('/marketing/campaigns').then(r => r.data),
  })

  const selectedCampaign = campaigns.find(c => c.id === selectedId)

  // Fetch segment count when segment changes in builder
  const fetchSegmentCount = useCallback(async (segment) => {
    setLoadingCount(true)
    try {
      const res = await api.get(`/marketing/segments/${segment}/count`)
      setSegmentCount(res.data?.count ?? res.data ?? null)
    } catch {
      setSegmentCount(null)
    } finally {
      setLoadingCount(false)
    }
  }, [])

  useEffect(() => {
    if (showBuilder) fetchSegmentCount(form.segment)
  }, [form.segment, showBuilder, fetchSegmentCount])

  // Segment analytics
  const { data: segmentStats = {} } = useQuery({
    queryKey: ['segment-stats'],
    queryFn: async () => {
      const results = {}
      await Promise.all(SEGMENTS.map(async s => {
        try {
          const res = await api.get(`/marketing/segments/${s.value}/count`)
          results[s.value] = res.data?.count ?? res.data ?? 0
        } catch {
          results[s.value] = null
        }
      }))
      return results
    },
  })

  const createMutation = useMutation({
    mutationFn: body => api.post('/marketing/campaigns', body),
    onSuccess: (res) => {
      qc.invalidateQueries(['marketing-campaigns'])
      setSelectedId(res.data?.id)
      setShowBuilder(false)
    },
  })

  const sendMutation = useMutation({
    mutationFn: id => api.post(`/marketing/campaigns/${id}/send`),
    onSuccess: () => {
      qc.invalidateQueries(['marketing-campaigns'])
      setSendConfirm(null)
    },
  })

  async function handleSaveDraft(e) {
    e.preventDefault()
    createMutation.mutate({ ...form })
  }

  async function handleSendNow(e) {
    e.preventDefault()
    // Save draft first, then confirm send
    const res = await api.post('/marketing/campaigns', { ...form })
    qc.invalidateQueries(['marketing-campaigns'])
    const id = res.data?.id
    setSendConfirm({ campaignId: id, count: segmentCount, channel: form.channel })
    setShowBuilder(false)
  }

  const smsLimit = 140
  const isSmsCapped = form.channel === 'sms' && form.message.length >= smsLimit

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-slate-800">Marketing</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Send targeted campaigns to your client segments</p>
      </div>

      {/* Segment analytics row */}
      <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl border border-slate-200 px-5 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-1">Segments</span>
        {SEGMENTS.map(s => (
          <div key={s.value} className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full font-semibold border ${s.color}`}>
            {s.label}
            {segmentStats[s.value] !== null && segmentStats[s.value] !== undefined ? (
              <span className="font-bold">{segmentStats[s.value]}</span>
            ) : (
              <span className="opacity-40">—</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* LEFT: Campaigns list */}
        <div className="w-80 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-slate-700">Campaigns</p>
            <button
              onClick={() => { setShowBuilder(true); setSelectedId(null); setForm({ ...EMPTY_FORM }); setSegmentCount(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-lg text-[12px] font-semibold  transition-colors">
              <Plus size={12} /> New Campaign
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <Megaphone size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[13px] text-slate-500">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <button key={c.id}
                  onClick={() => { setSelectedId(c.id); setShowBuilder(false) }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedId === c.id
                      ? 'border-[#0D9488] bg-[#F0FDFA]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[13px] font-semibold text-slate-800 leading-tight">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SegmentBadge segment={c.segment} />
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                      c.channel === 'sms'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {c.channel?.toUpperCase()}
                    </span>
                    {c.sent_count > 0 && (
                      <span className="text-[11px] text-slate-400">{c.sent_count} sent</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Builder or Detail */}
        <div className="flex-1">
          {showBuilder && (
            <CampaignBuilder
              form={form}
              setForm={setForm}
              segmentCount={segmentCount}
              loadingCount={loadingCount}
              smsLimit={smsLimit}
              isSmsCapped={isSmsCapped}
              saving={createMutation.isPending}
              onSaveDraft={handleSaveDraft}
              onSendNow={handleSendNow}
              onClose={() => setShowBuilder(false)}
            />
          )}

          {!showBuilder && selectedCampaign && (
            <CampaignDetail
              campaign={selectedCampaign}
              onSend={() => setSendConfirm({ campaignId: selectedCampaign.id, count: selectedCampaign.recipient_count, channel: selectedCampaign.channel })}
            />
          )}

          {!showBuilder && !selectedCampaign && (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
              <Megaphone size={40} className="text-slate-200 mb-3" />
              <p className="text-[15px] font-semibold text-slate-400">Select a campaign or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Send confirmation modal */}
      {sendConfirm && (
        <SendConfirmModal
          count={sendConfirm.count}
          channel={sendConfirm.channel}
          sending={sendMutation.isPending}
          onConfirm={() => sendMutation.mutate(sendConfirm.campaignId)}
          onClose={() => setSendConfirm(null)}
        />
      )}
    </div>
  )
}

function CampaignBuilder({ form, setForm, segmentCount, loadingCount, smsLimit, isSmsCapped, saving, onSaveDraft, onSendNow, onClose }) {
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value ?? e }))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[16px] font-bold text-slate-800">New Campaign</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
      </div>

      <form className="space-y-4">
        <Field label="Campaign Name *">
          <input required value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Summer Promo" />
        </Field>

        <Field label="Target Segment">
          <div className="flex items-center gap-2">
            <select value={form.segment} onChange={set('segment')} className={inp}>
              {SEGMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12px] font-semibold text-slate-600 whitespace-nowrap">
              <Users size={12} />
              {loadingCount ? (
                <span className="text-slate-400">…</span>
              ) : segmentCount !== null ? (
                <span>{segmentCount} clients</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </Field>

        <Field label="Channel">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, channel: 'sms' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-colors ${
                form.channel === 'sms' ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              <MessageSquare size={14} /> SMS
            </button>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, channel: 'email' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-colors ${
                form.channel === 'email' ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              <Mail size={14} /> Email
            </button>
          </div>
        </Field>

        <Field label={`Message ${form.channel === 'sms' ? `(${form.message.length}/${smsLimit})` : ''}`}>
          <textarea
            value={form.message}
            onChange={e => {
              const val = form.channel === 'sms' ? e.target.value.slice(0, smsLimit) : e.target.value
              setForm(f => ({ ...f, message: val }))
            }}
            rows={4}
            className={inp + ' resize-none ' + (isSmsCapped ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100' : '')}
            placeholder={form.channel === 'sms' ? 'Hi {name}, we have a special offer for you...' : 'Write your email message here...'}
          />
          {isSmsCapped && (
            <p className="text-[11px] text-amber-600 mt-1">SMS limit reached (140 characters)</p>
          )}
        </Field>

        {/* Preview */}
        {form.message && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Preview</p>
            <div className={`rounded-xl p-3 ${form.channel === 'sms' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{form.message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onSaveDraft} disabled={saving || !form.name}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={onSendNow} disabled={saving || !form.name || !form.message}
            className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            <Send size={14} /> Send Now
          </button>
        </div>
      </form>
    </div>
  )
}

function CampaignDetail({ campaign: c, onSend }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">{c.name}</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">{formatDate(c.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} />
          {c.status !== 'sent' && (
            <button onClick={onSend}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-lg text-[12px] font-semibold  transition-colors">
              <Send size={12} /> Send Now
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 text-[13px]">
        <div className="flex justify-between py-2 border-b border-slate-50">
          <span className="text-slate-500">Segment</span>
          <SegmentBadge segment={c.segment} />
        </div>
        <div className="flex justify-between py-2 border-b border-slate-50">
          <span className="text-slate-500">Channel</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
            c.channel === 'sms'
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'
          }`}>{c.channel?.toUpperCase()}</span>
        </div>
        {c.sent_count > 0 && (
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Sent to</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-green-500" /> {c.sent_count} clients
            </span>
          </div>
        )}
      </div>

      {c.message && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Message</p>
          <div className={`rounded-xl p-4 ${c.channel === 'sms' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
            <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{c.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SendConfirmModal({ count, channel, sending, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
          <Send size={20} className="text-[#0D9488]" />
        </div>
        <h2 className="text-[17px] font-bold text-slate-800 mb-2">Confirm Send</h2>
        <p className="text-[13px] text-slate-500 mb-5">
          Send to{' '}
          <span className="font-semibold text-slate-800">{count !== null ? `${count} clients` : 'selected clients'}</span>
          {' '}via{' '}
          <span className="font-semibold text-slate-800">{channel?.toUpperCase()}</span>?
          {' '}This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={sending}
            className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60 flex items-center justify-center gap-2">
            {sending ? 'Sending…' : <><Send size={13} /> Send Now</>}
          </button>
        </div>
      </div>
    </div>
  )
}
