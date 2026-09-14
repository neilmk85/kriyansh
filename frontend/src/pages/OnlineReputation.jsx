import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Star, Search, MessageSquare, TrendingUp, Users, CheckCircle2,
  Edit2, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const TABS = ['Overview', 'All Reviews', 'Negative Feedback', 'By Staff & Service']

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          className={i <= rating ? 'text-amber-400' : 'text-slate-200'}
          fill="currentColor" />
      ))}
    </div>
  )
}

function ClientAvatar({ name }) {
  const colors = [
    ['#0D9488','#CCFBF1'],['#6366F1','#E0E7FF'],['#D97706','#FEF3C7'],
    ['#DB2777','#FCE7F3'],['#7C3AED','#EDE9FE'],['#0284C7','#E0F2FE'],
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  const [fg, bg] = colors[idx]
  const parts = name ? name.trim().split(/\s+/) : ['?']
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2)
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{ background: bg, color: fg }}>
      {initials.toUpperCase()}
    </div>
  )
}

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, showAlert }) {
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const respond = useMutation({
    mutationFn: (response) => api.put(`/reviews/${review.id}/respond`, { response }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation'] })
      setReplying(false); setEditing(false); setDraft('')
    },
  })

  return (
    <div className={cn(
      'rounded-xl border bg-white hover:border-slate-300 transition-colors overflow-hidden',
      showAlert && review.rating <= 3 ? 'border-red-200' : 'border-slate-200'
    )}>
      {showAlert && review.rating <= 3 && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border-b border-red-100">
          <AlertTriangle size={13} className="text-red-500" />
          <span className="text-[11px] font-semibold text-red-600">Low rating — consider responding</span>
          {!review.owner_response && (
            <span className="ml-auto text-[10px] text-red-400">No response yet</span>
          )}
        </div>
      )}
      <div className="flex items-start gap-3 p-4">
        <ClientAvatar name={review.client_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold text-slate-800">{review.client_name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{review.created_at}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StarRating rating={review.rating} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700">
                <CheckCircle2 size={10} /> Verified
              </span>
            </div>
          </div>
          {review.comment && (
            <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">{review.comment}</p>
          )}
          {review.service && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              Service: <span className="font-medium text-slate-500">{review.service}</span>
            </p>
          )}
          {review.owner_response && !editing && (
            <div className="mt-3 pl-3 border-l-2 border-teal-400">
              <p className="text-[11px] font-semibold text-teal-700 mb-1">Owner response</p>
              <p className="text-[13px] text-slate-600 leading-relaxed italic">"{review.owner_response}"</p>
              <button onClick={() => { setDraft(review.owner_response); setEditing(true) }}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800">
                <Edit2 size={11} /> Edit
              </button>
            </div>
          )}
          {(replying || editing) && (
            <div className="mt-3 space-y-2">
              <textarea autoFocus rows={3} value={draft} onChange={e => setDraft(e.target.value)}
                placeholder="Write your response…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none" />
              <div className="flex items-center gap-2">
                <button onClick={() => respond.mutate(draft.trim())}
                  disabled={!draft.trim() || respond.isPending}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {respond.isPending ? 'Saving…' : 'Save response'}
                </button>
                <button onClick={() => { setReplying(false); setEditing(false); setDraft('') }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!review.owner_response && !replying && !editing && (
            <button onClick={() => setReplying(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800">
              <MessageSquare size={12} /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const avg   = data?.avg_rating ?? 0
  const total = data?.total_reviews ?? 0
  const dist  = data?.distribution ?? {}
  const trend = data?.trend ?? []
  const reviews = data?.reviews ?? []

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Overall Rating',
            value: avg > 0 ? avg.toFixed(1) : '—',
            sub: avg > 0 ? `from ${total} review${total !== 1 ? 's' : ''}` : 'No reviews yet',
            icon: Star, iconColor: '#F59E0B', iconBg: '#FEF3C7',
            extra: avg > 0 ? (
              <div className="flex items-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={12} className={i <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200'} fill="currentColor" />
                ))}
              </div>
            ) : null,
          },
          {
            label: 'Total Reviews',
            value: total,
            sub: 'Verified client reviews',
            icon: MessageSquare, iconColor: '#6366F1', iconBg: '#E0E7FF',
          },
          {
            label: 'Negative Reviews',
            value: (data?.negative_reviews ?? []).length,
            sub: '1–3 star ratings',
            icon: AlertTriangle, iconColor: '#EF4444', iconBg: '#FEE2E2',
          },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  {card.extra}
                  <p className="text-[12px] text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
                  <Icon size={18} style={{ color: card.iconColor }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Rating trend chart */}
      {trend.length > 0 && (
        <div className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
          <h3 className="text-[14px] font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-teal-500" /> Rating Trend (last 6 months)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v.toFixed(2), 'Avg Rating']} />
              <Area type="monotone" dataKey="avg" name="Avg Rating"
                stroke="#0D9488" fill="url(#gAvg)" strokeWidth={2} dot={{ r: 3, fill: '#0D9488' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribution */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
        <h3 className="text-[14px] font-semibold text-slate-800 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5,4,3,2,1].map(star => {
            const count = dist[String(star)] ?? 0
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-8 shrink-0">
                  <span className="text-[13px] font-semibold text-slate-700">{star}</span>
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0D9488 0%,#6366F1 100%)' }} />
                </div>
                <span className="text-[12px] text-slate-500 w-6 text-right shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent reviews */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
        <h3 className="text-[14px] font-semibold text-slate-800 mb-4">Recent Reviews</h3>
        {reviews.length === 0 ? (
          <div className="text-center py-10">
            <Star size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-[14px] font-medium text-slate-500">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 6).map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── All Reviews tab ───────────────────────────────────────────────────────────

function AllReviewsTab({ reviews }) {
  const [search, setSearch] = useState('')
  const filtered = (reviews ?? []).filter(r =>
    r.client_name?.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search by client name…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-white" />
      </div>
      <p className="text-[12px] text-slate-400">
        {filtered.length} review{filtered.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
      </p>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Users size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-[14px] font-medium text-slate-500">{search ? 'No reviews match your search' : 'No reviews yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  )
}

// ── Negative Feedback tab ─────────────────────────────────────────────────────

function NegativeFeedbackTab({ reviews }) {
  const neg = (reviews ?? []).filter(r => r.rating <= 3)
  const unresponded = neg.filter(r => !r.owner_response)

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={cn(
        'rounded-xl p-4 flex items-center gap-3',
        unresponded.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
      )}>
        <AlertTriangle size={18} className={unresponded.length > 0 ? 'text-red-500' : 'text-green-500'} />
        <div>
          <p className={cn('text-[13px] font-semibold', unresponded.length > 0 ? 'text-red-700' : 'text-green-700')}>
            {unresponded.length > 0
              ? `${unresponded.length} review${unresponded.length !== 1 ? 's' : ''} need${unresponded.length === 1 ? 's' : ''} a response`
              : 'All negative reviews have been responded to'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{neg.length} total low-rating reviews (1–3 stars)</p>
        </div>
      </div>

      {neg.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Star size={32} className="mx-auto text-green-300 mb-3" fill="currentColor" />
          <p className="text-[14px] font-medium text-slate-500">No negative reviews</p>
          <p className="text-[12px] text-slate-400 mt-1">Clients are happy! Keep it up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {neg.map(r => <ReviewCard key={r.id} review={r} showAlert />)}
        </div>
      )}
    </div>
  )
}

// ── By Staff & Service tab ────────────────────────────────────────────────────

function StaffServiceTab({ byStaff, byService }) {
  const [expanded, setExpanded] = useState('staff')

  const RatingBar = ({ avg }) => (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{
          width: `${(avg / 5) * 100}%`,
          background: avg >= 4 ? '#0D9488' : avg >= 3 ? '#F59E0B' : '#EF4444',
        }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums text-slate-700 w-8 text-right">{avg.toFixed(1)}</span>
    </div>
  )

  const Section = ({ id, title, icon: Icon, rows, nameKey }) => (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setExpanded(expanded === id ? null : id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-teal-500" />
          <span className="text-[14px] font-semibold text-slate-800">{title}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">{rows.length}</span>
        </div>
        {expanded === id ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {expanded === id && (
        <div className="border-t border-slate-100">
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate-400">No data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Reviews</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-48">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{row[nameKey]}</td>
                    <td className="px-5 py-3 text-slate-500 tabular-nums">{row.count}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <StarRating rating={Math.round(row.avg)} size={12} />
                        <RatingBar avg={row.avg} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <Section id="staff"   title="By Staff Member" icon={Users}   rows={byStaff}   nameKey="staff_name" />
      <Section id="service" title="By Service"       icon={Star}    rows={byService} nameKey="service_name" />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function OnlineReputation() {
  const [tab, setTab] = useState('Overview')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reputation'],
    queryFn: () => api.get('/reputation').then(r => r.data),
  })

  const negCount = (data?.negative_reviews ?? []).filter(r => !r.owner_response).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}>
            <Star size={18} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-900">Online Reputation</h1>
        </div>
        <p className="text-[13px] text-slate-500 ml-12">Monitor client reviews and your salon's star rating</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-[13.5px] font-semibold transition-all border-b-2 -mb-px',
              tab === t ? 'text-[#0D9488] border-[#0D9488]' : 'text-slate-500 border-transparent hover:text-slate-700'
            )}>
            {t}
            {t === 'Negative Feedback' && negCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {negCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-[14px] font-medium text-red-600">Failed to load reputation data</p>
        </div>
      ) : tab === 'Overview' ? (
        <OverviewTab data={data} />
      ) : tab === 'All Reviews' ? (
        <AllReviewsTab reviews={data?.reviews ?? []} />
      ) : tab === 'Negative Feedback' ? (
        <NegativeFeedbackTab reviews={data?.negative_reviews ?? []} />
      ) : (
        <StaffServiceTab byStaff={data?.by_staff ?? []} byService={data?.by_service ?? []} />
      )}
    </div>
  )
}
