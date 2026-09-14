import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Search, MessageSquare, TrendingUp, Users, CheckCircle2, Edit2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const TABS = ['Overview', 'All Reviews']

// ── helpers ───────────────────────────────────────────────────────────────────

function StarRow({ count, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-amber-400">
        <Star size={13} fill="currentColor" />
      </span>
      <span className="text-amber-400 text-[12px] font-semibold w-2">{label}</span>
    </div>
  )
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          className={i <= rating ? 'text-amber-400' : 'text-slate-200'}
          fill={i <= rating ? 'currentColor' : 'currentColor'}
        />
      ))}
    </div>
  )
}

function ClientAvatar({ name }) {
  const colors = [
    ['#0D9488', '#CCFBF1'],
    ['#6366F1', '#E0E7FF'],
    ['#D97706', '#FEF3C7'],
    ['#DB2777', '#FCE7F3'],
    ['#7C3AED', '#EDE9FE'],
    ['#0284C7', '#E0F2FE'],
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  const [fg, bg] = colors[idx]
  const parts = name ? name.trim().split(/\s+/) : ['?']
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2)
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{ background: bg, color: fg }}
    >
      {initials.toUpperCase()}
    </div>
  )
}

function ReviewCard({ review }) {
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const respond = useMutation({
    mutationFn: (response) =>
      api.put(`/reviews/${review.id}/respond`, { response }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputation'] })
      setReplying(false)
      setEditing(false)
      setDraft('')
    },
  })

  const handleEdit = () => {
    setDraft(review.owner_response || '')
    setEditing(true)
    setReplying(false)
  }

  const handleReply = () => {
    setDraft('')
    setReplying(true)
    setEditing(false)
  }

  const handleCancel = () => {
    setReplying(false)
    setEditing(false)
    setDraft('')
  }

  const handleSave = () => {
    if (!draft.trim()) return
    respond.mutate(draft.trim())
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors overflow-hidden">
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
                <CheckCircle2 size={10} />
                Verified visit
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

          {/* Owner response display */}
          {review.owner_response && !editing && (
            <div className="mt-3 pl-3 border-l-2 border-teal-400">
              <p className="text-[11px] font-semibold text-teal-700 mb-1">Owner response</p>
              <p className="text-[13px] text-slate-600 leading-relaxed italic">"{review.owner_response}"</p>
              <button
                onClick={handleEdit}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800 transition-colors"
              >
                <Edit2 size={11} /> Edit
              </button>
            </div>
          )}

          {/* Reply / Edit textarea */}
          {(replying || editing) && (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                rows={3}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Write your response…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none transition-all"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || respond.isPending}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {respond.isPending ? 'Saving…' : 'Save response'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {respond.isError && (
                <p className="text-[11px] text-red-500">Failed to save. Please try again.</p>
              )}
            </div>
          )}

          {/* Reply button — only when no response and not replying */}
          {!review.owner_response && !replying && !editing && (
            <button
              onClick={handleReply}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
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
  const avg = data?.avg_rating ?? 0
  const total = data?.total_reviews ?? 0
  const dist = data?.distribution ?? {}
  const reviews = data?.reviews ?? []

  const statCards = [
    {
      label: 'Overall Rating',
      value: avg > 0 ? avg.toFixed(1) : '—',
      sub: avg > 0 ? `from ${total} review${total !== 1 ? 's' : ''}` : 'No reviews yet',
      icon: Star,
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      extra: avg > 0 ? (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={12}
              className={i <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200'}
              fill="currentColor"
            />
          ))}
        </div>
      ) : null,
    },
    {
      label: 'Total Reviews',
      value: total,
      sub: 'Public reviews collected',
      icon: MessageSquare,
      iconColor: '#6366F1',
      iconBg: '#E0E7FF',
    },
    {
      label: 'Response Rate',
      value: '—',
      sub: 'Responses coming soon',
      icon: TrendingUp,
      iconColor: '#0D9488',
      iconBg: '#CCFBF1',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(card => {
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

      {/* Star distribution */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
        <h3 className="text-[14px] font-semibold text-slate-800 mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(star => {
            const count = dist[String(star)] ?? 0
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-8 shrink-0">
                  <span className="text-[13px] font-semibold text-slate-700">{star}</span>
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #0D9488 0%, #6366F1 100%)',
                    }}
                  />
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
            <p className="text-[12px] text-slate-400 mt-1">Reviews will appear here once clients submit them</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 6).map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
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
      {/* Search bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by client name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white"
        />
      </div>

      {/* Results count */}
      <p className="text-[12px] text-slate-400">
        {filtered.length} review{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </p>

      {/* Review list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Users size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-[14px] font-medium text-slate-500">
            {search ? 'No reviews match your search' : 'No reviews yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnlineReputation() {
  const [tab, setTab] = useState('Overview')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reputation'],
    queryFn: () => api.get('/reputation').then(r => r.data),
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
          >
            <Star size={18} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-[22px] font-bold text-slate-900">Online Reputation</h1>
        </div>
        <p className="text-[13px] text-slate-500 ml-12">Monitor client reviews and your salon's star rating</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-[13.5px] font-semibold transition-all border-b-2 -mb-px',
              tab === t
                ? 'text-[#0D9488] border-[#0D9488]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-[14px] font-medium text-red-600">Failed to load reputation data</p>
          <p className="text-[12px] text-red-400 mt-1">Please refresh and try again</p>
        </div>
      ) : tab === 'Overview' ? (
        <OverviewTab data={data} />
      ) : (
        <AllReviewsTab reviews={data?.reviews ?? []} />
      )}
    </div>
  )
}
