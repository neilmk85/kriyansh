import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Calendar, Clock, RotateCcw, Star,
  Gift, Package, CreditCard, ChevronRight, RefreshCw, CheckCircle2,
  Smartphone, History, AlertTriangle,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY = {
  red: {
    label: 'Act Today',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    stripe: 'border-l-4 border-red-500',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
  },
  yellow: {
    label: 'This Week',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    stripe: 'border-l-4 border-amber-400',
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  fyi: {
    label: 'FYI',
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    stripe: 'border-l-4 border-slate-300 dark:border-slate-600',
    icon: CheckCircle2,
    iconColor: 'text-slate-400',
  },
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, icon: Icon, iconBg, trend }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</p>}
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{Math.abs(trend).toFixed(0)}% vs same day last week</span>
        </div>
      )}
    </div>
  )
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({ insight, onAction }) {
  const cfg = PRIORITY[insight.priority] || PRIORITY.fyi
  const PIcon = cfg.icon
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${cfg.stripe} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}>
            <PIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none">{insight.emoji}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{insight.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 leading-snug">{insight.body}</p>
          </div>
        </div>
        {insight.action && insight.action_url && (
          <div className="mt-3 pl-7">
            <button
              onClick={() => onAction(insight.action_url)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              {insight.action}
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── History entry ─────────────────────────────────────────────────────────────

function HistoryRow({ entry, selected, onClick }) {
  const redCount = entry.insights.filter(i => i.priority === 'red').length
  const yellowCount = entry.insights.filter(i => i.priority === 'yellow').length
  const d = new Date(entry.date)
  const label = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        selected
          ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <div className="flex items-center gap-1.5">
          {redCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-medium">
              {redCount} urgent
            </span>
          )}
          {yellowCount > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
              {yellowCount}
            </span>
          )}
          {entry.whatsapp_sent && (
            <Smartphone size={12} className="text-teal-500" />
          )}
        </div>
      </div>
    </button>
  )
}

// ── Revenue trend mini-chart ──────────────────────────────────────────────────

function RevenueTrend({ history }) {
  const data = [...history]
    .reverse()
    .slice(-14)
    .map(entry => {
      const rev = entry.insights.find(i => i.title === 'Revenue Yesterday')
      return {
        date: new Date(entry.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
        redCount: entry.insights.filter(i => i.priority === 'red').length,
        insightCount: entry.insights.length,
      }
    })

  if (data.length < 3) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Urgent Items — Last 14 Days
      </h3>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="urgentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(v) => [v, 'Urgent items']}
          />
          <Area type="monotone" dataKey="redCount" stroke="#DC2626" fill="url(#urgentGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DailyBrief() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(null) // null = today

  const { data: today, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['brief-daily'],
    queryFn: () => api.get('/brief/daily').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['brief-history'],
    queryFn: () => api.get('/brief/history').then(r => r.data),
    staleTime: 10 * 60_000,
  })

  const handleAction = (url) => navigate(url)

  // What to display — today or a historical date
  const displayData = selectedDate
    ? history.find(h => h.date === selectedDate)
    : today

  const insights = displayData?.insights ?? []
  const redInsights = insights.filter(i => i.priority === 'red')
  const yellowInsights = insights.filter(i => i.priority === 'yellow')
  const fyiInsights = insights.filter(i => i.priority === 'fyi')

  const revenueChange = today && today.last_week_same_day > 0
    ? ((today.yesterday_revenue - today.last_week_same_day) / today.last_week_same_day) * 100
    : undefined

  const todayDateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Business Brief</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{todayDateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              Back to today
            </button>
          )}
          <button
            onClick={() => { setSelectedDate(null); refetch() }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Main column */}
          <div className="space-y-6">
            {/* KPI tiles — today's live stats */}
            {!selectedDate && today && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  label="Yesterday Revenue"
                  value={formatCurrency(today.yesterday_revenue)}
                  sub={`Last week: ${formatCurrency(today.last_week_same_day)}`}
                  icon={TrendingUp}
                  iconBg="bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
                  trend={revenueChange}
                />
                <StatTile
                  label="Today's Appointments"
                  value={today.today_appointments}
                  sub="Scheduled for today"
                  icon={Calendar}
                  iconBg="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                />
                <StatTile
                  label="Empty Slots (48h)"
                  value={today.empty_slots_48h}
                  sub={today.empty_slots_48h >= 6 ? 'High — consider a campaign' : 'Hours available'}
                  icon={Clock}
                  iconBg={today.empty_slots_48h >= 6
                    ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'}
                />
                <StatTile
                  label="Rebooking Due"
                  value={today.rebooking_due}
                  sub="Clients 30-60 days overdue"
                  icon={RotateCcw}
                  iconBg="bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                />
              </div>
            )}

            {/* Second KPI row */}
            {!selectedDate && today && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                  label="Memberships Expiring"
                  value={today.expiring_memberships}
                  sub="Within 7 days"
                  icon={CreditCard}
                  iconBg="bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                />
                <StatTile
                  label="Packages Expiring"
                  value={today.expiring_packages}
                  sub="Within 7 days"
                  icon={Package}
                  iconBg="bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
                />
                <StatTile
                  label="Bad Reviews"
                  value={today.unresponded_bad_reviews}
                  sub="Unresponded (≤ 3 stars)"
                  icon={Star}
                  iconBg={today.unresponded_bad_reviews > 0
                    ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                    : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}
                />
                <StatTile
                  label="Birthdays Today"
                  value={today.birthday_clients}
                  sub="Send them an offer"
                  icon={Gift}
                  iconBg="bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
                />
              </div>
            )}

            {/* Selected date banner */}
            {selectedDate && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                <History size={14} />
                Viewing brief from {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            )}

            {/* Insight sections */}
            {insights.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                <CheckCircle2 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">All clear — no insights for this day</p>
              </div>
            ) : (
              <div className="space-y-5">
                {redInsights.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                        🔴 Act Today
                      </h2>
                      <span className="ml-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        {redInsights.length} item{redInsights.length !== 1 ? 's' : ''} need attention now
                      </span>
                    </div>
                    <div className="space-y-2">
                      {redInsights.map((ins, i) => (
                        <InsightCard key={i} insight={ins} onAction={handleAction} />
                      ))}
                    </div>
                  </section>
                )}

                {yellowInsights.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                        🟡 This Week
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {yellowInsights.map((ins, i) => (
                        <InsightCard key={i} insight={ins} onAction={handleAction} />
                      ))}
                    </div>
                  </section>
                )}

                {fyiInsights.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                        💡 FYI
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {fyiInsights.map((ins, i) => (
                        <InsightCard key={i} insight={ins} onAction={handleAction} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — history + trend */}
          <aside className="space-y-4">
            {history.length > 0 && <RevenueTrend history={history} />}

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <History size={14} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brief History</h3>
              </div>
              <div className="p-2 space-y-0.5 max-h-[480px] overflow-y-auto">
                {/* Today entry */}
                {today && (
                  <HistoryRow
                    entry={{
                      date: today.date,
                      insights: today.insights ?? [],
                      whatsapp_sent: false,
                    }}
                    selected={selectedDate === null}
                    onClick={() => setSelectedDate(null)}
                  />
                )}
                {history.map(entry => (
                  entry.date !== today?.date && (
                    <HistoryRow
                      key={entry.date}
                      entry={entry}
                      selected={selectedDate === entry.date}
                      onClick={() => setSelectedDate(entry.date)}
                    />
                  )
                ))}
                {history.length === 0 && !today && (
                  <p className="text-xs text-gray-400 text-center py-6">No history yet</p>
                )}
              </div>
            </div>

            {/* WhatsApp info */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <Smartphone size={16} className="text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">WhatsApp Delivery</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5 leading-snug">
                    This brief is automatically sent to your WhatsApp at 8:00 AM every day.
                    Set your number in Settings → Business to enable delivery.
                  </p>
                  <button
                    onClick={() => handleAction('/admin/settings')}
                    className="mt-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1"
                  >
                    Go to Settings <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
