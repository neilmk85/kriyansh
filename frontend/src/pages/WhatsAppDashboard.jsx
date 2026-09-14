import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  MessageSquare, MousePointer2, Calendar, Users, Award, DollarSign,
  TrendingUp, RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const DAYS_OPTIONS = [7, 14, 30, 90]

const TYPE_LABELS = {
  appointment_booked:    'Booking Confirmed',
  appointment_tomorrow:  'Tomorrow Reminder',
  appointment_completed: 'Post-Visit Follow-up',
  payment_received:      'Payment Receipt',
  membership_expiry_7d:  'Membership Expiry (7d)',
  package_expiry_7d:     'Package Expiry (7d)',
  birthday:              'Birthday Greeting',
  appointment_cancelled: 'Cancellation Notice',
  appointment_rescheduled: 'Reschedule Notice',
  rebooking_reminder:    'Rebooking Reminder',
  inactive_customer:     'Win-Back (60+ days)',
  package_balance:       'Package Balance',
  campaign:              'Marketing Campaign',
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${accent}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppDashboard() {
  const [days, setDays] = useState(30)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wa-performance', days],
    queryFn: () => api.get(`/whatsapp/performance?days=${days}`).then(r => r.data),
    staleTime: 60_000,
  })

  const t = data?.totals ?? {}
  const byType = data?.by_type ?? []
  const trend = data?.trend ?? []

  const pct = v => `${(v * 100).toFixed(1)}%`

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={22} className="text-green-500" />
            WhatsApp Performance
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Engagement and revenue attribution from WhatsApp messages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors
                  ${days === d
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label="Messages Sent"       value={t.messages_sent ?? 0}                         accent="bg-green-500" />
          <StatCard icon={MousePointer2} label="Clicked"             value={t.clicked ?? 0}       sub={pct(t.click_rate ?? 0) + ' click rate'} accent="bg-blue-500" />
          <StatCard icon={Calendar}      label="Bookings Generated"  value={t.bookings_generated ?? 0}                    accent="bg-indigo-500" />
          <StatCard icon={Users}         label="Customers Reactivated" value={t.reactivated_customers ?? 0}               accent="bg-purple-500" />
          <StatCard icon={Award}         label="Membership Renewals" value={t.membership_renewals ?? 0}                   accent="bg-amber-500" />
          <StatCard icon={DollarSign}    label="Revenue Attributed"  value={formatCurrency(t.revenue_attributed ?? 0)}    accent="bg-emerald-500" />
          <StatCard icon={TrendingUp}    label="Conversion Rate"     value={pct(t.conversion_rate ?? 0)} sub="of clicks → booking/payment" accent="bg-rose-500" />
          <StatCard icon={MessageSquare} label="Period"              value={`${days} days`}                               accent="bg-gray-400" />
        </div>
      )}

      {/* Trend chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Daily Activity</h2>
        {trend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gClicked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="sent"      name="Sent"      stroke="#22C55E" fill="url(#gSent)"    strokeWidth={2} />
              <Area type="monotone" dataKey="clicked"   name="Clicked"   stroke="#3B82F6" fill="url(#gClicked)" strokeWidth={2} />
              <Area type="monotone" dataKey="converted" name="Converted" stroke="#8B5CF6" fill="none"           strokeWidth={2} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-type breakdown table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">By Message Type</h2>
        </div>
        {byType.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No messages sent in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['Type', 'Sent', 'Clicked', 'Click Rate', 'Converted', 'Conv. Rate', 'Revenue'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byType.map(row => (
                  <tr key={row.message_type} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {TYPE_LABELS[row.message_type] ?? row.message_type}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{row.sent}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{row.clicked}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${row.click_rate >= 0.3 ? 'bg-green-100 text-green-700' :
                          row.click_rate >= 0.1 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {pct(row.click_rate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{row.converted}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${row.conversion_rate >= 0.2 ? 'bg-green-100 text-green-700' :
                          row.conversion_rate >= 0.05 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {pct(row.conversion_rate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-emerald-600">
                      {row.revenue > 0 ? formatCurrency(row.revenue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
