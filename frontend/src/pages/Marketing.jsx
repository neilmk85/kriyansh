import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, Plus, Send, Users, Mail, MessageSquare, X,
  CheckCircle2, Clock, Sparkles, ChevronRight, Eye,
} from 'lucide-react'
import api from '@/lib/api'

// ── Constants ────────────────────────────────────────────────────────────────

const SEGMENTS = [
  {
    value: 'all',
    label: 'All Clients',
    desc: 'Every client in your database',
    icon: Users,
    iconColor: '#64748b',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    badge: 'bg-slate-100 text-slate-600',
  },
  {
    value: 'new',
    label: 'New Clients',
    desc: 'First visit in the last 30 days',
    icon: Sparkles,
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'vip',
    label: 'VIP',
    desc: 'High-value, frequent visitors',
    icon: CheckCircle2,
    iconColor: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    value: 'at_risk',
    label: 'At-Risk',
    desc: 'No visit in 30–60 days',
    icon: Clock,
    iconColor: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'lapsed',
    label: 'Lapsed',
    desc: 'No visit in over 60 days',
    icon: MessageSquare,
    iconColor: '#DC2626',
    bg: '#FFF1F2',
    border: '#FECDD3',
    badge: 'bg-red-100 text-red-600',
  },
]

// ── Small helpers ────────────────────────────────────────────────────────────

function SegmentBadge({ segment }) {
  const s = SEGMENTS.find(x => x.value === segment) ?? SEGMENTS[0]
  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>
      {s.label}
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'sent')
    return <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700"><CheckCircle2 size={10} /> Sent</span>
  return <span className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-500 capitalize">{status || 'Draft'}</span>
}

function ChannelPill({ channel }) {
  if (channel === 'sms')
    return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700"><MessageSquare size={9} /> SMS</span>
  return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700"><Mail size={9} /> Email</span>
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Marketing() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [sendConfirm, setSendConfirm] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(null) // campaign id

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => api.get('/marketing/campaigns').then(r => r.data),
  })

  const { data: segmentStats = {} } = useQuery({
    queryKey: ['segment-stats'],
    queryFn: async () => {
      const results = {}
      await Promise.all(SEGMENTS.map(async s => {
        try {
          const res = await api.get(`/marketing/segments/${s.value}/count`)
          results[s.value] = res.data?.count ?? res.data ?? 0
        } catch { results[s.value] = null }
      }))
      return results
    },
  })

  const sendMutation = useMutation({
    mutationFn: id => api.post(`/marketing/campaigns/${id}/send`),
    onSuccess: () => { qc.invalidateQueries(['marketing-campaigns']); setSendConfirm(null) },
  })

  const previewCampaign = campaigns.find(c => c.id === previewOpen)

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Marketing</h1>
          <p className="text-[13.5px] text-slate-500 mt-0.5">Send targeted campaigns to the right clients at the right time.</p>
        </div>
        <button
          onClick={() => navigate('/admin/marketing/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold bg-[#0D9488] hover:bg-[#0B8279] transition-colors shadow-sm"
        >
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* ── Audience segments ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your Audience</h2>
        <div className="grid grid-cols-5 gap-3">
          {SEGMENTS.map(s => {
            const count = segmentStats[s.value]
            const Icon = s.icon
            return (
              <div
                key={s.value}
                className="rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all group"
                style={{ background: s.bg, borderColor: s.border }}
                onClick={() => navigate(`/admin/marketing/new?segment=${s.value}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.iconColor}18` }}>
                    <Icon size={15} style={{ color: s.iconColor }} />
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
                </div>
                <div className="text-[22px] font-bold text-slate-900 mb-0.5 tabular-nums">
                  {count != null ? count : <span className="text-slate-300 text-[18px]">—</span>}
                </div>
                <div className="text-[12.5px] font-semibold text-slate-700">{s.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{s.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Campaigns ───────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">Campaigns</h2>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_130px_90px_100px_90px_80px] items-center px-5 py-3 bg-slate-50 border-b border-slate-200 gap-4">
            {['Campaign', 'Segment', 'Channel', 'Status', 'Sent to', ''].map(h => (
              <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-200">
                <Megaphone size={20} className="text-slate-400" />
              </div>
              <p className="text-[15px] font-bold text-slate-700 mb-1">No campaigns yet</p>
              <p className="text-[13px] text-slate-400 mb-4">Click a segment card above to start your first campaign.</p>
              <button
                onClick={() => navigate('/admin/marketing/new')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold bg-[#0D9488] hover:bg-[#0B8279] transition-colors"
              >
                <Plus size={13} /> Create Campaign
              </button>
            </div>
          ) : (
            campaigns.map((c, i) => (
              <div
                key={c.id}
                className={`grid grid-cols-[1fr_130px_90px_100px_90px_80px] items-center px-5 py-4 gap-4 hover:bg-slate-50 transition-colors ${i < campaigns.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-900 truncate">{c.name}</p>
                  {c.created_at && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <SegmentBadge segment={c.segment} />
                <ChannelPill channel={c.channel} />
                <StatusBadge status={c.status} />
                <span className="text-[13px] text-slate-600 font-medium">
                  {c.sent_count > 0 ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-500" /> {c.sent_count}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setPreviewOpen(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                  {c.status !== 'sent' && (
                    <button
                      onClick={() => setSendConfirm({ campaignId: c.id, count: c.recipient_count, channel: c.channel })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D9488] hover:bg-teal-50 transition-colors"
                      title="Send now"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Preview drawer ───────────────────────────────────────────────────── */}
      {previewCampaign && (
        <PreviewDrawer
          campaign={previewCampaign}
          onSend={() => { setPreviewOpen(null); setSendConfirm({ campaignId: previewCampaign.id, count: previewCampaign.recipient_count, channel: previewCampaign.channel }) }}
          onClose={() => setPreviewOpen(null)}
        />
      )}

      {/* ── Send confirmation modal ──────────────────────────────────────────── */}
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

// ── Preview drawer ────────────────────────────────────────────────────────────

function PreviewDrawer({ campaign: c, onSend, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-[15px] font-bold text-slate-900">{c.name}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={c.status} />
            <SegmentBadge segment={c.segment} />
            <ChannelPill channel={c.channel} />
          </div>
          {c.sent_count > 0 && (
            <div className="flex items-center gap-2 text-[13px] text-slate-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <CheckCircle2 size={14} className="text-green-600" />
              Sent to <strong>{c.sent_count} clients</strong>
            </div>
          )}
          {c.message && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Message</p>
              <div className={`rounded-xl p-4 text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed ${
                c.channel === 'sms' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                {c.message}
              </div>
            </div>
          )}
          {c.created_at && (
            <p className="text-[12px] text-slate-400">
              Created {new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        {c.status !== 'sent' && (
          <div className="border-t border-slate-200 p-5">
            <button
              onClick={onSend}
              className="w-full py-2.5 rounded-xl text-white bg-[#0D9488] hover:bg-[#0B8279] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Send size={14} /> Send Now
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Send confirmation modal ───────────────────────────────────────────────────

function SendConfirmModal({ count, channel, sending, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
          <Send size={22} className="text-[#0D9488]" />
        </div>
        <h2 className="text-[17px] font-bold text-slate-900 mb-2">Ready to send?</h2>
        <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
          This will deliver your {channel?.toUpperCase()} message to{' '}
          <span className="font-bold text-slate-800">{count != null ? `${count} client${count !== 1 ? 's' : ''}` : 'your selected clients'}</span>.
          {' '}This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={sending}
            className="flex-1 py-2.5 rounded-xl text-white bg-[#0D9488] hover:bg-[#0B8279] text-[13px] font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {sending ? 'Sending…' : <><Send size={13} /> Confirm Send</>}
          </button>
        </div>
      </div>
    </div>
  )
}
