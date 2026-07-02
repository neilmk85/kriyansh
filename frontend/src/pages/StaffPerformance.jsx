import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, DollarSign, Calendar, TrendingUp, Clock } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const PERIODS = [
  { label: 'Last 7 days',  value: 7   },
  { label: 'Last 30 days', value: 30  },
  { label: 'Last 90 days', value: 90  },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).slice(0, 2).join('')
}

function rebookingColor(pct) {
  if (pct >= 50) return 'text-green-600 bg-green-50'
  if (pct >= 30) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

export default function StaffPerformance() {
  const [period, setPeriod] = useState(30)

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staffPerformance', period],
    queryFn: () => api.get(`/analytics/staff-performance?period=${period}`).then(r => r.data),
  })

  const totalRevenue      = staffList.reduce((s, m) => s + (m.total_revenue || 0), 0)
  const totalAppointments = staffList.reduce((s, m) => s + (m.total_appointments || 0), 0)
  const bestPerformer     = staffList.reduce((best, m) =>
    (m.total_revenue || 0) > (best?.total_revenue || 0) ? m : best, null)
  const topRevenue = bestPerformer?.total_revenue || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">Staff Performance</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Analytics and insights for your team</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                period === p.value
                  ? 'bg-white text-[#0D9488] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-[#0D9488]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Revenue ({period}d)</p>
            <p className="text-[24px] font-bold text-slate-800 leading-tight mt-0.5">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Appointments ({period}d)</p>
            <p className="text-[24px] font-bold text-slate-800 leading-tight mt-0.5">{totalAppointments.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best Performer</p>
            <p className="text-[18px] font-bold text-slate-800 leading-tight mt-0.5">
              {bestPerformer
                ? `${bestPerformer.first_name || ''} ${bestPerformer.last_name || bestPerformer.name || ''}`.trim() || bestPerformer.name || 'N/A'
                : '—'}
            </p>
            {bestPerformer && (
              <p className="text-[12px] text-slate-400">{formatCurrency(bestPerformer.total_revenue)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Staff cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[15px] font-semibold text-slate-600 mb-1">No completed appointments yet</p>
          <p className="text-[13px] text-slate-400">
            Staff performance data will appear here once appointments are completed.
            <br />Try selecting a different time period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staffList.map(staff => {
            const name       = `${staff.first_name || ''} ${staff.last_name || staff.name || ''}`.trim() || staff.name || 'Staff'
            const role       = staff.role || staff.position || 'Stylist'
            const revenue    = staff.total_revenue || 0
            const appts      = staff.total_appointments || 0
            const avgTicket  = staff.avg_ticket || (appts > 0 ? revenue / appts : 0)
            const rebook     = staff.rebooking_rate || 0
            const revPerHour = staff.revenue_per_hour || 0
            const relPct     = topRevenue > 0 ? Math.round((revenue / topRevenue) * 100) : 0
            const rbColors   = rebookingColor(rebook)

            return (
              <div key={staff.id || name} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[14px] font-bold flex items-center justify-center shrink-0">
                    {initials(name)}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">{name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{role}</p>
                  </div>
                </div>

                {/* Metrics 2x2 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#F0FDFA] rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Revenue</p>
                    <p className="text-[16px] font-bold text-[#0D9488]">{formatCurrency(revenue)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Appointments</p>
                    <p className="text-[16px] font-bold text-slate-700">{appts}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Avg Ticket</p>
                    <p className="text-[16px] font-bold text-slate-700">{formatCurrency(avgTicket)}</p>
                  </div>
                  <div className={cn('rounded-xl p-3', rbColors.split(' ')[1])}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Rebooking</p>
                    <p className={cn('text-[16px] font-bold', rbColors.split(' ')[0])}>{Math.round(rebook)}%</p>
                  </div>
                </div>

                {/* Rev per hour badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formatCurrency(revPerHour)}/hr revenue
                  </span>
                </div>

                {/* Progress bar vs top performer */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-400">vs. top performer</span>
                    <span className="text-[10px] font-semibold text-slate-500">{relPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0D9488] transition-all"
                      style={{ width: `${relPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
