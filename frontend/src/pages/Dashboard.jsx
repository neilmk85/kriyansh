import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, Calendar, Users, TrendingUp,
  Clock, ChevronRight, Scissors, Crown,
  TrendingDown, AlertCircle, CheckCircle, Zap, Star, Package
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatTime, statusColor, cn } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color = '#0D9488' }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-start gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[24px] font-bold text-slate-800 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function utilizationColor(pct) {
  if (pct >= 70) return { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
  if (pct >= 40) return { bar: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' }
  return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
}

function heatmapColor(utilization) {
  if (utilization > 0.8) return 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]'
  if (utilization > 0.6) return 'bg-[#2DD4BF]'
  if (utilization > 0.4) return 'bg-[#99F6E4]'
  if (utilization > 0.2) return 'bg-[#CCFBF1]'
  return 'bg-slate-50'
}

const HOURS = ['9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM']
const HOUR_VALS = [9,10,11,12,13,14,15,16,17,18,19,20]
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: topClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['topClients'],
    queryFn: () => api.get('/analytics/top-clients').then(r => r.data),
  })

  const { data: gapData, isLoading: gapLoading } = useQuery({
    queryKey: ['scheduleGaps'],
    queryFn: () => api.get('/analytics/schedule-gaps').then(r => r.data),
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['review-responses'],
    queryFn: () => api.get('/reviews').then(r => r.data),
  })

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data),
  })

  const lowStockItems = inventoryItems.filter(
    item => item.is_active && Number(item.stock_qty) <= Number(item.low_stock_threshold)
  )

  if (isLoading) return <DashboardSkeleton />

  const { stats = {}, upcoming = [], weekly_chart = [] } = data ?? {}

  // Utilization calc
  const totalSlots = (stats.total_staff || 1) * 8
  const utilizationPct = Math.round(((stats.today_appointments || 0) / totalSlots) * 100)
  const uColors = utilizationColor(utilizationPct)

  // Pending confirmations
  const pendingCount = stats.pending_appointments || 0

  // Heatmap data
  const heatmap = gapData?.heatmap || {}
  const gaps = gapData?.gaps || []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-slate-800">Dashboard</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign} label="Today's Revenue"
          value={formatCurrency(stats.today_revenue)}
          sub={`${stats.today_appointments} appointments`}
          color="#0D9488"
        />
        <StatCard
          icon={TrendingUp} label="This Month"
          value={formatCurrency(stats.month_revenue)}
          sub={`Avg ticket ${formatCurrency(stats.avg_ticket)}`}
          color="#8B5CF6"
        />
        <StatCard
          icon={Users} label="Active Clients"
          value={stats.active_clients?.toLocaleString()}
          sub="Total in CRM"
          color="#F59E0B"
        />
        <StatCard
          icon={Scissors} label="Staff"
          value={stats.total_staff}
          sub={`${stats.pending_appointments} appts pending`}
          color="#3B82F6"
        />
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Revenue chart — uses real weekly_chart from API */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">Weekly Revenue</h2>
              <p className="text-[12px] text-slate-400">This week so far</p>
            </div>
            <span className="text-[13px] font-semibold text-[#0D9488]">
              {formatCurrency(stats.week_revenue)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekly_chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: 'none' }}
                formatter={v => [formatCurrency(v), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2}
                fill="url(#tealGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming appointments */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-slate-800">Upcoming</h2>
            <a href="/appointments" className="flex items-center gap-1 text-[12px] text-[#0D9488] hover:underline">
              View all <ChevronRight size={12} />
            </a>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Calendar size={28} className="opacity-40" />
              <p className="text-[13px]">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {upcoming.map(appt => (
                <div key={appt.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">
                      {appt.client_name}
                    </p>
                    <p className="text-[12px] text-slate-400 truncate">
                      {appt.services || 'Service'} · {appt.staff_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-semibold text-slate-700">{formatTime(appt.start_at)}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusColor(appt.status))}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Command Center ── */}
      <div>
        <h2 className="text-[17px] font-bold text-slate-800 mb-4">Command Center</h2>

        {/* A) Utilization Gauge Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Chair Utilization */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Chair Utilization Today</p>
            <div className="flex items-end gap-2 mb-3">
              <span className={cn('text-[28px] font-bold leading-none', uColors.text)}>{utilizationPct}%</span>
              <span className="text-[12px] text-slate-400 mb-1">{stats.today_appointments}/{totalSlots} slots</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', uColors.bar)}
                style={{ width: `${Math.min(utilizationPct, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {utilizationPct >= 70 ? 'Great utilization!' : utilizationPct >= 40 ? 'Room to grow' : 'Consider promotions'}
            </p>
          </div>

          {/* Pending Confirmations */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Pending Confirmations</p>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                pendingCount > 0 ? 'bg-orange-50' : 'bg-green-50'
              )}>
                {pendingCount > 0
                  ? <AlertCircle size={22} className="text-orange-500" />
                  : <CheckCircle size={22} className="text-green-500" />
                }
              </div>
              <div>
                <p className="text-[28px] font-bold text-slate-800 leading-none">{pendingCount}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {pendingCount === 0 ? 'All confirmed' : `appointment${pendingCount !== 1 ? 's' : ''} unconfirmed`}
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <a href="/appointments" className="inline-flex items-center gap-1 mt-3 text-[12px] text-orange-500 font-semibold hover:underline">
                Review now <ChevronRight size={12} />
              </a>
            )}
          </div>

          {/* Revenue vs Last Week */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Today's Revenue</p>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="text-[#0D9488]" />
              <span className="text-[28px] font-bold text-slate-800 leading-none">{formatCurrency(stats.today_revenue)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Track vs last week once transactions accumulate
            </p>
          </div>
        </div>

        {/* B) Top 10 Clients */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-5">
          <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-slate-100">
            <Crown size={16} className="text-[#F59E0B]" />
            <h3 className="text-[15px] font-bold text-slate-800">Top Clients by Lifetime Value</h3>
          </div>
          {clientsLoading ? (
            <div className="p-6 text-center text-slate-400 text-[13px]">Loading clients…</div>
          ) : topClients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-[13px]">No client data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-10">#</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Spend</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Visits</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg/Visit</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topClients.slice(0, 10).map((client, i) => (
                    <tr key={client.id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-400 font-bold text-[12px]">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F0FDFA] text-[#0D9488] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(client.name || client.first_name || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                            {client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#0D9488]">{formatCurrency(client.total_spend || client.total_revenue || 0)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{client.visit_count || client.visits || 0}</td>
                      <td className="px-3 py-3 text-right text-slate-500">{formatCurrency(client.avg_per_visit || 0)}</td>
                      <td className="px-5 py-3 text-right text-slate-400 text-[12px]">
                        {client.last_visit ? (() => {
                          try { return format(parseISO(client.last_visit), 'MMM d, yyyy') } catch { return client.last_visit }
                        })() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* C) Schedule Heatmap */}
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <h3 className="text-[15px] font-bold text-slate-800">Schedule Heatmap</h3>
            <p className="text-[12px] text-slate-400 mt-0.5">Utilization by hour and day (last 30 days)</p>
          </div>

          {gapLoading ? (
            <div className="p-6 text-center text-slate-400 text-[13px]">Loading heatmap…</div>
          ) : (
            <div className="p-5">
              {/* Legend */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Utilization:</span>
                {[
                  { label: '<20%', cls: 'bg-slate-50 border border-slate-200' },
                  { label: '20-40%', cls: 'bg-[#CCFBF1]' },
                  { label: '40-60%', cls: 'bg-[#99F6E4]' },
                  { label: '60-80%', cls: 'bg-[#2DD4BF]' },
                  { label: '>80%', cls: 'bg-[#0D9488]' },
                ].map(({ label, cls }) => (
                  <span key={label} className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span className={cn('w-3 h-3 rounded-sm', cls)} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="w-12" />
                      {DAYS_SHORT.map(d => (
                        <th key={d} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center pb-1 w-12">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map((hour, hi) => {
                      const hourVal = HOUR_VALS[hi]
                      return (
                        <tr key={hour}>
                          <td className="text-[10px] text-slate-400 text-right pr-2 font-medium whitespace-nowrap">{hour}</td>
                          {DAYS_SHORT.map(day => {
                            const key = `${day}_${hourVal}`
                            const val = heatmap[key] ?? 0
                            const colorCls = heatmapColor(val)
                            const pct = Math.round(val * 100)
                            return (
                              <td key={day} title={`${day} ${hour}: ${pct}% utilization`}>
                                <div className={cn('w-full h-8 rounded-md flex items-center justify-center text-[10px] font-bold cursor-default transition-all hover:opacity-80', colorCls)}>
                                  {pct > 0 ? `${pct}%` : ''}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Gap suggestions */}
              {gaps.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Flash Deal Opportunities</p>
                  {gaps.slice(0, 3).map((gap, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <Zap size={14} className="text-orange-500 shrink-0" />
                      <p className="text-[12px] text-orange-700 font-medium">
                        <span className="font-bold">{gap.day}</span> at <span className="font-bold">{gap.time || `${gap.hour}:00`}</span> is your slowest slot — run a flash promotion
                        {gap.utilization !== undefined && (
                          <span className="ml-1 text-orange-500 font-normal">({Math.round((gap.utilization || 0) * 100)}% utilization)</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Low Stock Alerts ──────────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Package size={14} className="text-red-500" />
            </div>
            <h3 className="text-[13px] font-bold text-slate-900">Low Stock Alerts</h3>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold">
              {lowStockItems.length}
            </span>
            <a href="/inventory" className="ml-auto flex items-center gap-1 text-[12px] text-[#0D9488] hover:underline font-medium">
              Manage inventory <ChevronRight size={12} />
            </a>
          </div>
          <div className="divide-y divide-slate-50">
            {lowStockItems.slice(0, 8).map(item => {
              const qty = Number(item.stock_qty)
              const threshold = Number(item.low_stock_threshold)
              const isOut = qty <= 0
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isOut ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{item.name}</p>
                    {item.category && <p className="text-[11px] text-slate-400">{item.category}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[13px] font-bold ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                      {isOut ? 'Out of stock' : `${qty} ${item.unit || 'units'} left`}
                    </p>
                    <p className="text-[11px] text-slate-400">Min: {threshold} {item.unit || 'units'}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {lowStockItems.length > 8 && (
            <div className="px-5 py-3 border-t border-slate-100 text-center">
              <a href="/inventory" className="text-[12px] text-[#0D9488] hover:underline font-medium">
                +{lowStockItems.length - 8} more items need restocking
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Private Review Feedback ───────────────────────────── */}
      {reviews.filter(r => !r.is_public).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Star size={15} className="text-amber-400" />
            <h3 className="text-[13px] font-bold text-slate-900">Private Client Feedback</h3>
            <span className="ml-auto text-[11px] text-slate-400">Below 4★ — not shown publicly</span>
          </div>
          <div className="divide-y divide-slate-50">
            {reviews.filter(r => !r.is_public).slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={12}
                      className={n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-700 font-medium">{r.client_name}</p>
                  {r.comment && <p className="text-[12px] text-slate-500 mt-0.5 truncate">{r.comment}</p>}
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 h-60 bg-slate-200 rounded-2xl" />
        <div className="xl:col-span-2 h-60 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="h-72 bg-slate-200 rounded-2xl" />
      <div className="h-96 bg-slate-200 rounded-2xl" />
    </div>
  )
}
