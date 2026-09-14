import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  DollarSign, Calendar, Users, Scissors, Package, Gift, Star,
  TrendingUp, ShoppingBag, AlertTriangle, Clock, Award,
  Download, BarChart2, UserCheck, ChevronRight, FileText,
  Receipt, XCircle, Tag, Percent, Wallet, ArrowUpDown,
  ArrowDownLeft, ArrowUpRight, CreditCard, Landmark,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL   = '#0D9488'
const INDIGO = '#6366F1'
const BLUE   = '#3B82F6'

// ── Report catalogue ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'finance',
    label: 'Finance',
    icon: Landmark,
    reports: [
      { id: 'finance-summary',          label: 'Finance summary',              description: 'High-level summary of sales, payments and liabilities.',                    icon: Landmark      },
      { id: 'payments-summary',         label: 'Payments summary',             description: 'Payments split by payment methods.',                                        icon: CreditCard    },
      { id: 'payment-transactions',     label: 'Payment transactions',         description: 'Detailed view of all payment transactions.',                                icon: ArrowUpDown   },
      { id: 'cashflow-summary',         label: 'Cash flow summary',            description: 'Overview of funds inflow and outflows.',                                    icon: ArrowUpRight  },
      { id: 'cashflow-statement',       label: 'Cash flow statement',          description: 'Detailed record of cash flow over a selected period.',                      icon: ArrowDownLeft },
      { id: 'service-charges',          label: 'Service charges',              description: 'Breakdown of service charge revenue.',                                      icon: Scissors      },
      { id: 'liability-summary',        label: 'Liability summary',            description: 'Overview of company liabilities by type, excluding voided gift cards.',     icon: Wallet        },
      { id: 'liability-activity',       label: 'Liability activity',           description: 'Detailed view of liability-related transactions.',                          icon: FileText      },
      { id: 'prepayments-by-period',    label: 'Prepayments by time period',   description: 'Analysis of prepayments over a selected time period.',                     icon: Calendar      },
      { id: 'prepayment-list',          label: 'Prepayment list',              description: 'Complete record of all prepayments.',                                       icon: Receipt       },
      { id: 'taxes-list',               label: 'Taxes list',                   description: 'Complete listing of all tax transactions.',                                 icon: Tag           },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    reports: [
      { id: 'sales-summary',     label: 'Sales summary',                    description: 'Sales quantities and value, excluding tips and gift card sales.',              icon: DollarSign    },
      { id: 'sales-by-period',   label: 'Sales by time period',             description: 'Detailed sales data broken down by selected time periods.',                    icon: BarChart2     },
      { id: 'sales-list',        label: 'Sales list',                       description: 'Complete listing of all sales transactions.',                                  icon: FileText      },
      { id: 'sales-log-detail',  label: 'Sales log detail',                 description: 'In-depth view into each sale transaction with line items.',                    icon: Receipt       },
      { id: 'giftcard-period',   label: 'Gift card by time period',         description: 'Gift card sales and usage data based on selected time periods.',              icon: Gift          },
      { id: 'giftcard-list',     label: 'Gift card list',                   description: 'Full list of issued and outstanding gift cards.',                             icon: Gift          },
      { id: 'membership-list',   label: 'Membership list',                  description: 'Complete list of active memberships.',                                        icon: Award         },
      { id: 'packages-list',     label: 'Packages list',                    description: 'Operational details of your packages including benefits and financials.',     icon: Package       },
      { id: 'packages-summary',  label: 'Packages summary',                 description: 'Aggregated view of packages performance.',                                    icon: ShoppingBag   },
      { id: 'packages-benefits', label: 'Packages benefits consumption',    description: 'Benefit-level package redemptions and recognized revenue.',                  icon: TrendingUp    },
      { id: 'discount-summary',  label: 'Discount summary',                 description: 'Overview of discounts granted and their impact on sales.',                   icon: Percent       },
      { id: 'taxes-summary',     label: 'Taxes summary',                    description: 'Summary of all tax-related transactions.',                                    icon: Tag           },
      { id: 'eod',               label: 'End of Day',                       description: 'Daily transaction summary — revenue, tips, tax and payment breakdown.',       icon: Receipt       },
    ],
  },
  {
    id: 'appts',
    label: 'Appointments',
    icon: Calendar,
    reports: [
      { id: 'appts-summary',       label: 'Appointments summary',              description: 'General overview of appointment trends, completion rate and no-shows.',  icon: Calendar  },
      { id: 'appts-list',          label: 'Appointments list',                 description: 'Full list of scheduled appointments for the selected period.',            icon: FileText  },
      { id: 'appts-cancellations', label: 'Cancellations & no-show summary',   description: 'Insight into appointment cancellations and no-shows.',                  icon: XCircle   },
      { id: 'waitlist-detail',     label: 'Waitlist detail',                   description: 'Detailed view of waitlist entries for the selected period.',               icon: Clock     },
      { id: 'waitlist-summary',    label: 'Waitlist summary',                  description: 'Overview of waitlist trends, including appointments booked and expired.',   icon: BarChart2 },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    reports: [
      { id: 'staff',                  label: 'Staff performance',        description: 'Revenue, appointments completed, tips and avg ticket per team member.',       icon: Users      },
      { id: 'working-hours-activity', label: 'Working hours activity',   description: 'Detailed view of team members worked hours, shifts, and timesheets.',         icon: Clock      },
      { id: 'break-activity',         label: 'Break activity',           description: "Detailed view of team members' breaks.",                                      icon: Clock      },
      { id: 'attendance-summary',     label: 'Attendance summary',       description: "Overview of team members' punctuality and attendance for their shifts.",      icon: UserCheck  },
      { id: 'wages-detail',           label: 'Wages detail',             description: 'Detailed view of wages earned by team members.',                              icon: DollarSign },
      { id: 'wages-summary',          label: 'Wages summary',            description: 'Overview of wages earned by team members.',                                   icon: BarChart2  },
      { id: 'fee-deduction-activity', label: 'Fee deduction activity',   description: 'Complete list of fees applied to team member earnings.',                      icon: Receipt    },
      { id: 'fee-deduction-summary',  label: 'Fee deduction summary',    description: 'Overview of fees applied to earnings by team member and sale items.',         icon: Percent    },
      { id: 'pay-summary',            label: 'Pay summary',              description: 'Overview of team member compensation.',                                       icon: Wallet     },
      { id: 'scheduled-shifts',       label: 'Scheduled shifts',         description: 'Detailed view of team members scheduled shifts.',                             icon: Calendar   },
      { id: 'working-hours-summary',  label: 'Working hours summary',    description: 'Overview of operational hours and productivity.',                             icon: BarChart2  },
      { id: 'team-time-off',          label: 'Team time off report',     description: 'Detailed view of team time off.',                                             icon: AlertTriangle },
      { id: 'tips-summary',           label: 'Tips summary',             description: 'Analysis of gratuity income.',                                               icon: Award      },
      { id: 'tips-detail',            label: 'Tips detail',              description: 'Comprehensive breakdown of all tips received.',                               icon: FileText   },
      { id: 'commission-activity',    label: 'Commission activity',      description: 'Full list of all sales with commissions payable.',                            icon: TrendingUp },
      { id: 'commission-summary',     label: 'Commission summary',       description: 'Overview of commission earned by team members and sale items.',               icon: ShoppingBag },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: Scissors,
    reports: [
      { id: 'services', label: 'Services breakdown', description: 'Bookings and revenue by service across the selected date range.', icon: Scissors },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: UserCheck,
    reports: [
      { id: 'clients',         label: 'Client overview',  description: 'New clients, returning visits, at-risk and lapsed client counts.',                              icon: UserCheck  },
      { id: 'client-summary',  label: 'Client summary',   description: 'Overview of new, returning and walk-in clients with appointments in the chosen timeframe.',     icon: Users      },
      { id: 'client-list',     label: 'Client list',      description: 'Comprehensive list of all active clients.',                                                     icon: FileText   },
      { id: 'client-insights', label: 'Client insights',  description: 'Deep dive into individual client behaviour and preferences.',                                   icon: TrendingUp },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    reports: [
      { id: 'stock-on-hand',         label: 'Stock on hand',          description: 'Current status and quantity of stock items.',     icon: Package    },
      { id: 'stock-movement-summary',label: 'Stock movement summary',  description: 'Summary of stock inflow and outflow.',            icon: BarChart2  },
      { id: 'stock-movement-log',    label: 'Stock movement log',      description: 'Detailed record of all stock movements.',         icon: FileText   },
      { id: 'product-list',          label: 'Product list',            description: 'Comprehensive list of all products.',            icon: ShoppingBag },
      { id: 'ordered-stock',         label: 'Ordered stock',           description: 'Detailed record of all stock orders.',           icon: Receipt    },
    ],
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    icon: Star,
    reports: [
      { id: 'loyalty', label: 'Points & rewards', description: 'Stars earned, stars redeemed and active loyalty members.', icon: Star },
    ],
  },
]

function getCategoryById(id) { return CATEGORIES.find(c => c.id === id) }
function getReportById(id) {
  for (const cat of CATEGORIES) {
    const r = cat.reports.find(r => r.id === id)
    if (r) return { report: r, category: cat }
  }
  return null
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }
function offsetDate(days) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10)
}

const PRESETS = [
  { label: 'Today',         getValue: () => ({ from: todayStr(),     to: todayStr()     }) },
  { label: 'This Week',     getValue: () => ({ from: offsetDate(6),  to: todayStr()     }) },
  { label: 'This Month',    getValue: () => ({ from: offsetDate(29), to: todayStr()     }) },
  { label: 'Last Month',    getValue: () => ({ from: offsetDate(59), to: offsetDate(30) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: offsetDate(89), to: todayStr()     }) },
]

const NO_DATE_REPORTS = new Set(['eod', 'inventory', 'stock-on-hand', 'product-list', 'packages-list', 'membership-list', 'giftcard-list', 'prepayment-list', 'liability-summary', 'client-list'])

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = TEAL }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-[22px] font-bold text-slate-800 leading-tight mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {title && (
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-slate-700">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-slate-100 rounded-lg" />
      ))}
    </div>
  )
}

function Th({ children, right }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, right, bold, muted }) {
  return (
    <td className={`px-4 py-3 text-[13px] ${right ? 'text-right' : ''} ${bold ? 'font-semibold text-slate-800' : muted ? 'text-slate-400' : 'text-slate-700'}`}>
      {children}
    </td>
  )
}

function Empty({ text = 'No data for this period' }) {
  return <p className="text-[13px] text-slate-400 text-center py-12">{text}</p>
}

function ChartTip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-[12px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-800">{currency ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Category card grid ────────────────────────────────────────────────────────

function CategoryGrid({ category, onSelectReport }) {
  return (
    <div className="space-y-3">
      {category.reports.map(report => {
        const Icon = report.icon
        return (
          <button
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            className="w-full flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 text-left hover:border-teal-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-50 transition-colors">
              <Icon size={18} className="text-indigo-500 group-hover:text-teal-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800">{report.label}</p>
              <p className="text-[13px] text-slate-500 mt-0.5">{report.description}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 flex-shrink-0 transition-colors" />
          </button>
        )
      })}
    </div>
  )
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

function DateRangePicker({ from, to, onChange }) {
  const [active, setActive] = useState('This Month')
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => { setActive(p.label); onChange(p.getValue()) }}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
            active === p.label ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >{p.label}</button>
      ))}
      <div className="flex items-center gap-1.5">
        <input type="date" value={from}
          onChange={e => { setActive(''); onChange({ from: e.target.value, to }) }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100" />
        <span className="text-slate-400 text-[12px]">—</span>
        <input type="date" value={to}
          onChange={e => { setActive(''); onChange({ from, to: e.target.value }) }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100" />
      </div>
    </div>
  )
}

// ── Report components ─────────────────────────────────────────────────────────

function RevenueReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sales', range.from, range.to],
    queryFn: () => api.get(`/reports/sales?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton />
  const d = data || {}
  const daily = d.daily || []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}  label="Total Revenue"  value={formatCurrency(d.total_revenue ?? 0)} color={TEAL}   />
        <StatCard icon={ShoppingBag} label="Transactions"   value={d.total_tx ?? 0}                      color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Ticket"     value={formatCurrency(d.avg_ticket ?? 0)}    color={BLUE}   />
        <StatCard icon={Award}       label="Tips Collected" value={formatCurrency(d.total_tips ?? 0)}    color={TEAL}   />
      </div>
      <Card title="Daily Revenue">
        <div className="p-4">
          {daily.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TEAL} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<ChartTip currency />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={TEAL} strokeWidth={2} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Top Services by Revenue">
          {(d.top_services || []).length === 0 ? <Empty text="No service data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>#</Th><Th>Service</Th><Th right>Bookings</Th><Th right>Revenue</Th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(d.top_services || []).map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50"><Td muted>{i + 1}</Td><Td bold>{s.name}</Td><Td right>{s.bookings}</Td><Td right bold>{formatCurrency(s.revenue)}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Revenue by Payment Method">
          {(d.payment_methods || []).length === 0 ? <Empty text="No payment data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Method</Th><Th right>Count</Th><Th right>Revenue</Th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(d.payment_methods || []).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50"><Td bold><span className="capitalize">{p.method}</span></Td><Td right>{p.count}</Td><Td right bold>{formatCurrency(p.revenue)}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function ApptsBaseData({ range }) {
  return useQuery({
    queryKey: ['reports', 'appointments', range.from, range.to],
    queryFn: () => api.get(`/reports/appointments?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
}

function ApptsSummaryReport({ range }) {
  const { data, isLoading } = ApptsBaseData({ range })
  if (isLoading) return <LoadSkeleton />
  const d = data || {}
  const daily = d.daily || []
  const rate = d.completion_rate ? d.completion_rate.toFixed(1) : '0.0'
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Calendar}      label="Total"      value={d.total     ?? 0} color={TEAL}   />
        <StatCard icon={Award}         label="Completed"  value={d.completed ?? 0} color={INDIGO} />
        <StatCard icon={AlertTriangle} label="Cancelled"  value={d.cancelled ?? 0} color={BLUE}   />
        <StatCard icon={Clock}         label="No-Shows"   value={d.no_shows  ?? 0} color={TEAL}   />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Completion Rate</p>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(parseFloat(rate), 100)}%`, background: `linear-gradient(90deg, ${TEAL}, ${INDIGO})` }} />
          </div>
          <span className="text-[20px] font-bold text-slate-800 w-16 text-right tabular-nums">{rate}%</span>
        </div>
      </div>
      <Card title="Daily Breakdown">
        <div className="p-4">
          {daily.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" fill={TEAL}    radius={[3,3,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[3,3,0,0]} />
                <Bar dataKey="no_show"   name="No Show"   fill={BLUE}    radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function ApptsListReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'appts-list', range.from, range.to],
    queryFn: () => api.get(`/reports/appointments/list?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton />
  const rows = data || []

  const STATUS_CLS = {
    completed: 'bg-teal-50 text-teal-700',
    confirmed: 'bg-blue-50 text-blue-700',
    pending:   'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-50 text-red-600',
    no_show:   'bg-amber-50 text-amber-700',
  }

  return (
    <Card title={`Appointments (${rows.length})`}>
      {rows.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Services</Th><Th>Stylist</Th><Th>Status</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td>{r.services}</Td>
                  <Td>{r.staff}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </Td>
                  <Td right bold>{formatCurrency(r.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ApptsCancellationsReport({ range }) {
  const { data, isLoading } = ApptsBaseData({ range })
  if (isLoading) return <LoadSkeleton />
  const d = data || {}
  const daily = (d.daily || []).filter(row => (row.cancelled || 0) + (row.no_show || 0) > 0)
  const total = (d.cancelled ?? 0) + (d.no_shows ?? 0)
  const rate  = d.total ? ((total / d.total) * 100).toFixed(1) : '0.0'
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Cancelled"         value={d.cancelled ?? 0}                             color={BLUE}   />
        <StatCard icon={XCircle}       label="No-Shows"          value={d.no_shows  ?? 0}                             color={TEAL}   />
        <StatCard icon={Calendar}      label="Total Appointments" value={d.total     ?? 0}                             color={INDIGO} />
        <StatCard icon={TrendingUp}    label="Loss Rate"          value={`${rate}%`}                                  color={TEAL}   />
      </div>
      <Card title="Cancellations & No-Shows by Day">
        <div className="p-4">
          {daily.length === 0 ? <Empty text="No cancellations or no-shows in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[3,3,0,0]} />
                <Bar dataKey="no_show"   name="No Show"   fill={BLUE}    radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function StaffReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'staff', range.from, range.to],
    queryFn: () => api.get(`/reports/staff?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Staff Performance">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>#</Th><Th>Team Member</Th><Th right>Appointments</Th><Th right>Completed</Th><Th right>Revenue</Th><Th right>Tips</Th><Th right>Avg Ticket</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td muted>{i + 1}</Td>
                  <Td><div className="flex items-center gap-2.5"><span className="w-3 h-3 rounded-full" style={{ background: s.color || INDIGO }} /><span className="font-medium text-slate-800">{s.name}</span></div></Td>
                  <Td right>{s.appointments}</Td><Td right>{s.completed}</Td>
                  <Td right bold>{formatCurrency(s.revenue)}</Td><Td right>{formatCurrency(s.tips)}</Td><Td right bold>{formatCurrency(s.avg_ticket)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ServicesReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'services', range.from, range.to],
    queryFn: () => api.get(`/reports/services?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Services Breakdown">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>#</Th><Th>Service</Th><Th>Category</Th><Th right>Bookings</Th><Th right>Revenue</Th><Th right>Avg Price</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td muted>{i + 1}</Td><Td bold>{s.name}</Td>
                  <Td><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">{s.category}</span></Td>
                  <Td right>{s.bookings}</Td><Td right bold>{formatCurrency(s.revenue)}</Td><Td right>{formatCurrency(s.avg_price)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ClientsReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'clients', range.from, range.to],
    queryFn: () => api.get(`/reports/clients?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="New Clients"    value={d.new_clients ?? 0} color={TEAL}   />
        <StatCard icon={TrendingUp}    label="Returning"      value={d.returning    ?? 0} color={INDIGO} />
        <StatCard icon={AlertTriangle} label="At-Risk (45d)"  value={d.at_risk      ?? 0} color={BLUE}   />
        <StatCard icon={Clock}         label="Lapsed (90d)"   value={d.lapsed       ?? 0} color={TEAL}   />
      </div>
      <Card title="Top Clients by Spend">
        {(d.top_clients || []).length === 0 ? <Empty text="No client data found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>#</Th><Th>Client</Th><Th right>Visits</Th><Th right>Total Spend</Th><Th right>Avg / Visit</Th><Th right>Last Visit</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(d.top_clients || []).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td muted>{c.rank}</Td><Td bold>{c.name}</Td><Td right>{c.total_visits}</Td>
                    <Td right bold>{formatCurrency(c.total_spend)}</Td><Td right>{formatCurrency(c.avg_per_visit)}</Td>
                    <Td right muted>{c.last_visit ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function InventoryReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => api.get('/reports/inventory').then(r => r.data),
  })
  const ok  = data.filter(i => i.status === 'ok').length
  const low = data.filter(i => i.status === 'low').length
  const out = data.filter(i => i.status === 'out').length
  const SCLS = { ok: 'bg-teal-50 text-teal-700', low: 'bg-amber-50 text-amber-700', out: 'bg-red-50 text-red-600' }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total Items"  value={data.length} color={TEAL}   />
        <StatCard icon={Award}         label="In Stock"     value={ok}          color={INDIGO} />
        <StatCard icon={AlertTriangle} label="Low Stock"    value={low}         color={BLUE}   />
        <StatCard icon={Package}       label="Out of Stock" value={out}         color={TEAL}   />
      </div>
      <Card title="Inventory Status">
        {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No inventory items found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Name</Th><Th>SKU</Th><Th>Category</Th><Th right>Qty</Th><Th right>Min</Th><Th>Status</Th><Th right>Cost</Th><Th right>Sell Price</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <Td bold>{item.name}</Td><Td muted>{item.sku || '—'}</Td><Td>{item.category || '—'}</Td>
                    <Td right bold>{item.quantity}</Td><Td right muted>{item.min_quantity}</Td>
                    <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SCLS[item.status] || 'bg-slate-100 text-slate-500'}`}>{item.status === 'ok' ? 'In Stock' : item.status === 'low' ? 'Low Stock' : 'Out of Stock'}</span></Td>
                    <Td right>{formatCurrency(item.cost_price)}</Td><Td right bold>{formatCurrency(item.selling_price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function LoyaltyReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'loyalty', range.from, range.to],
    queryFn: () => api.get(`/reports/loyalty?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}</div>
  const d = data || {}
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard icon={Award}      label="Stars Earned"   value={(d.points_earned   ?? 0).toLocaleString()} color={TEAL}   />
      <StatCard icon={Gift}       label="Stars Redeemed" value={(d.points_redeemed ?? 0).toLocaleString()} color={INDIGO} />
      <StatCard icon={Users}      label="Active Members" value={(d.active_members  ?? 0).toLocaleString()} color={BLUE}   />
      <StatCard icon={TrendingUp} label="Net Stars"      value={(d.net_points      ?? 0).toLocaleString()} color={TEAL}   />
    </div>
  )
}

function EndOfDayReport() {
  const [date, setDate] = useState(todayStr)
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'eod', date],
    queryFn: () => api.get(`/reports/eod?date=${date}`).then(r => r.data),
  })
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-[13px] font-medium text-slate-600">Date:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100" />
      </div>
      {isLoading ? <LoadSkeleton cols={3} /> : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard icon={DollarSign}    label="Revenue"         value={formatCurrency(d.revenue      ?? 0)} color={TEAL}   />
            <StatCard icon={ShoppingBag}   label="Transactions"    value={d.transactions  ?? 0}                color={INDIGO} />
            <StatCard icon={Award}         label="Tips"            value={formatCurrency(d.tips         ?? 0)} color={BLUE}   />
            <StatCard icon={TrendingUp}    label="Tax Collected"   value={formatCurrency(d.tax          ?? 0)} color={TEAL}   />
            <StatCard icon={AlertTriangle} label="Discounts Given" value={formatCurrency(d.discounts    ?? 0)} color={INDIGO} />
            <StatCard icon={Users}         label="Unique Clients"  value={d.unique_clients ?? 0}               color={BLUE}   />
          </div>
          <Card title="Payment Breakdown">
            {(d.payments || []).length === 0 ? <Empty text="No transactions for this day" /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Payment Method</Th><Th right>Count</Th><Th right>Revenue</Th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {(d.payments || []).map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50"><Td bold><span className="capitalize">{p.method}</span></Td><Td right>{p.count}</Td><Td right bold>{formatCurrency(p.revenue)}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function LoadSkeleton({ cols = 4 }) {
  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-4`}>
        {Array.from({ length: cols }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
    </div>
  )
}

function WaitlistDetailReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'waitlist-detail', range.from, range.to],
    queryFn: () => api.get(`/reports/waitlist/detail?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const STATUS_CLS = {
    waiting:  'bg-blue-50 text-blue-700',
    notified: 'bg-amber-50 text-amber-700',
    booked:   'bg-teal-50 text-teal-700',
    expired:  'bg-slate-100 text-slate-500',
  }
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <Card title={`Waitlist Entries (${data.length})`}>
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No waitlist entries for this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Client</Th><Th>Service</Th><Th>Preferred Day</Th><Th>Time Window</Th><Th>Status</Th><Th right>Added</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <Td bold>{row.client}</Td>
                  <Td>{row.service || '—'}</Td>
                  <Td>{row.preferred_day != null ? DAYS[row.preferred_day] : 'Any'}</Td>
                  <Td>{row.time_start && row.time_end ? `${row.time_start} – ${row.time_end}` : 'Any'}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[row.status] || 'bg-slate-100 text-slate-600'}`}>
                      {row.status}
                    </span>
                  </Td>
                  <Td right muted>{row.created_at}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function WaitlistSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'waitlist-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/waitlist/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  const daily = d.daily || []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Clock}      label="Total Added"  value={d.total    ?? 0} color={TEAL}   />
        <StatCard icon={Award}      label="Booked"       value={d.booked   ?? 0} color={INDIGO} />
        <StatCard icon={XCircle}    label="Expired"      value={d.expired  ?? 0} color={BLUE}   />
        <StatCard icon={Users}      label="Still Waiting" value={d.waiting ?? 0} color={TEAL}   />
      </div>
      <Card title="Waitlist Activity by Day">
        <div className="p-4">
          {daily.length === 0 ? <Empty text="No waitlist activity in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="added"  name="Added"  fill={INDIGO} radius={[3,3,0,0]} />
                <Bar dataKey="booked" name="Booked" fill={TEAL}   radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Finance reports ───────────────────────────────────────────────────────────

function FinanceSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'finance-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}  label="Total Revenue"      value={formatCurrency(d.total_revenue   ?? 0)} color={TEAL}   />
        <StatCard icon={CreditCard}  label="Total Payments"     value={formatCurrency(d.total_payments  ?? 0)} color={INDIGO} />
        <StatCard icon={Wallet}      label="Outstanding Liab."  value={formatCurrency(d.total_liabilities ?? 0)} color={BLUE} />
        <StatCard icon={TrendingUp}  label="Net Revenue"        value={formatCurrency(d.net_revenue     ?? 0)} color={TEAL}   />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Revenue by Payment Method">
          {(d.payment_breakdown || []).length === 0 ? <Empty text="No payment data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Method</Th><Th right>Count</Th><Th right>Amount</Th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {d.payment_breakdown.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50"><Td bold><span className="capitalize">{p.method}</span></Td><Td right>{p.count}</Td><Td right bold>{formatCurrency(p.amount)}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Liability Breakdown">
          {(d.liability_breakdown || []).length === 0 ? <Empty text="No liabilities" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Type</Th><Th right>Outstanding</Th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {d.liability_breakdown.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50"><Td bold>{l.type}</Td><Td right bold>{formatCurrency(l.amount)}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function PaymentsSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'payments-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/payments-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={CreditCard}  label="Total Payments"  value={formatCurrency(d.total ?? 0)} color={TEAL}   />
        <StatCard icon={ShoppingBag} label="Transactions"    value={d.count ?? 0}                  color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Transaction" value={formatCurrency(d.avg   ?? 0)} color={BLUE}   />
      </div>
      <Card title="Payments by Method">
        {(d.by_method || []).length === 0 ? <Empty text="No payment data" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Payment Method</Th><Th right>Transactions</Th><Th right>Amount</Th><Th right>Tips</Th><Th right>Total</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.by_method.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td bold><span className="capitalize">{p.method}</span></Td>
                    <Td right>{p.count}</Td>
                    <Td right bold>{formatCurrency(p.amount)}</Td>
                    <Td right>{formatCurrency(p.tips)}</Td>
                    <Td right bold>{formatCurrency(p.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function PaymentTransactionsReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'payment-transactions', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/payment-transactions?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const STATUS_CLS = { completed: 'bg-teal-50 text-teal-700', refunded: 'bg-amber-50 text-amber-700', void: 'bg-slate-100 text-slate-500' }
  return (
    <Card title={`Payment Transactions (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Method</Th><Th>Status</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Tips</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td><span className="capitalize">{r.payment_method}</span></Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></Td>
                  <Td right>{formatCurrency(r.subtotal)}</Td>
                  <Td right>{formatCurrency(r.tax)}</Td>
                  <Td right>{formatCurrency(r.tips)}</Td>
                  <Td right bold>{formatCurrency(r.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CashFlowSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'cashflow-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/cashflow-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  const daily = d.daily || []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ArrowUpRight}  label="Total Inflow"   value={formatCurrency(d.inflow     ?? 0)} color={TEAL}   />
        <StatCard icon={ArrowDownLeft} label="Refunds"        value={formatCurrency(d.outflow    ?? 0)} color={BLUE}   />
        <StatCard icon={DollarSign}    label="Net Cash Flow"  value={formatCurrency(d.net        ?? 0)} color={INDIGO} />
        <StatCard icon={ShoppingBag}   label="Transactions"   value={d.count ?? 0}                      color={TEAL}   />
      </div>
      <Card title="Cash Flow by Day">
        <div className="p-4">
          {daily.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<ChartTip currency />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inflow"  name="Inflow"  fill={TEAL}  radius={[3,3,0,0]} />
                <Bar dataKey="outflow" name="Refunds" fill={BLUE}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function CashFlowStatementReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'cashflow-statement', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/cashflow-statement?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Cash Flow Statement">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th right>Transactions</Th><Th right>Inflow</Th><Th right>Refunds</Th><Th right>Tax</Th><Th right>Tips</Th><Th right>Net</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.date}</Td>
                  <Td right>{r.transactions}</Td>
                  <Td right bold>{formatCurrency(r.inflow)}</Td>
                  <Td right>{formatCurrency(r.outflow)}</Td>
                  <Td right>{formatCurrency(r.tax)}</Td>
                  <Td right>{formatCurrency(r.tips)}</Td>
                  <Td right bold>{formatCurrency(r.net)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ServiceChargesReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'service-charges', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/service-charges?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Service Charges">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No service charge data" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Service</Th><Th>Category</Th><Th right>Bookings</Th><Th right>Revenue</Th><Th right>Avg Price</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.name}</Td>
                  <Td><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">{r.category}</span></Td>
                  <Td right>{r.bookings}</Td>
                  <Td right bold>{formatCurrency(r.revenue)}</Td>
                  <Td right>{formatCurrency(r.avg_price)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function LiabilitySummaryReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'liability-summary'],
    queryFn: () => api.get('/reports/finance/liability-summary').then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Gift}    label="Gift Card Balance"     value={formatCurrency(d.gift_cards    ?? 0)} color={TEAL}   />
        <StatCard icon={Package} label="Package Balance"       value={formatCurrency(d.packages      ?? 0)} color={INDIGO} />
        <StatCard icon={Award}   label="Membership Liabilities" value={formatCurrency(d.memberships  ?? 0)} color={BLUE}   />
      </div>
      <Card title="Liability Details">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Type</Th><Th>Description</Th><Th right>Count</Th><Th right>Outstanding Value</Th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50"><Td bold>Gift Cards</Td><Td muted>Active, unredeemed balance</Td><Td right>{d.gift_cards_count ?? 0}</Td><Td right bold>{formatCurrency(d.gift_cards ?? 0)}</Td></tr>
              <tr className="hover:bg-slate-50"><Td bold>Packages</Td><Td muted>Purchased but unused sessions</Td><Td right>{d.packages_count ?? 0}</Td><Td right bold>{formatCurrency(d.packages ?? 0)}</Td></tr>
              <tr className="hover:bg-slate-50"><Td bold>Memberships</Td><Td muted>Active recurring plans</Td><Td right>{d.memberships_count ?? 0}</Td><Td right bold>{formatCurrency(d.memberships ?? 0)}</Td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function LiabilityActivityReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'liability-activity', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/liability-activity?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const TYPE_CLS = {
    'Gift Card Issued':   'bg-teal-50 text-teal-700',
    'Gift Card Redeemed': 'bg-blue-50 text-blue-700',
    'Package Sold':       'bg-indigo-50 text-indigo-700',
    'Package Redeemed':   'bg-amber-50 text-amber-700',
  }
  return (
    <Card title={`Liability Activity (${data.length} events)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No liability activity in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Type</Th><Th>Client</Th><Th>Description</Th><Th right>Amount</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_CLS[r.type] || 'bg-slate-100 text-slate-600'}`}>{r.type}</span></Td>
                  <Td bold>{r.client}</Td>
                  <Td>{r.description}</Td>
                  <Td right bold>{formatCurrency(r.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PrepaymentsByPeriodReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'prepayments-by-period', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/prepayments-by-period?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  const daily = d.daily || []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={DollarSign}  label="Total Prepayments"   value={formatCurrency(d.total ?? 0)} color={TEAL}   />
        <StatCard icon={Calendar}    label="Appointments w/ Deposit" value={d.count ?? 0}              color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Deposit"          value={formatCurrency(d.avg   ?? 0)} color={BLUE}   />
      </div>
      <Card title="Prepayments by Day">
        <div className="p-4">
          {daily.length === 0 ? <Empty text="No prepayments in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<ChartTip currency />} />
                <Bar dataKey="total" name="Prepayments" fill={TEAL} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function PrepaymentListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'prepayment-list'],
    queryFn: () => api.get('/reports/finance/prepayment-list').then(r => r.data),
  })
  return (
    <Card title={`Prepayments (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No prepayments found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Client</Th><Th>Date</Th><Th>Service</Th><Th>Staff</Th><Th right>Deposit Paid</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.client}</Td>
                  <Td muted>{r.date}</Td>
                  <Td>{r.services}</Td>
                  <Td>{r.staff}</Td>
                  <Td right bold>{formatCurrency(r.deposit_paid)}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${r.status === 'completed' ? 'bg-teal-50 text-teal-700' : r.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function TaxesListReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'taxes-list', range.from, range.to],
    queryFn: () => api.get(`/reports/finance/taxes-list?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Tax Transactions (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No tax transactions in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Method</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td><span className="capitalize">{r.payment_method}</span></Td>
                  <Td right>{formatCurrency(r.subtotal)}</Td>
                  <Td right bold>{formatCurrency(r.tax)}</Td>
                  <Td right bold>{formatCurrency(r.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Sales sub-reports ────────────────────────────────────────────────────────

function SalesSummaryReport({ range }) {
  return <RevenueReport range={range} />
}

function SalesByPeriodReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'sales-by-period', range.from, range.to],
    queryFn: () => api.get(`/reports/sales/by-period?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Sales by Time Period">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Period</Th><Th right>Transactions</Th><Th right>Revenue</Th><Th right>Tax</Th><Th right>Tips</Th><Th right>Discounts</Th><Th right>Net</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{row.period}</Td>
                  <Td right>{row.transactions}</Td>
                  <Td right bold>{formatCurrency(row.revenue)}</Td>
                  <Td right>{formatCurrency(row.tax)}</Td>
                  <Td right>{formatCurrency(row.tips)}</Td>
                  <Td right>{formatCurrency(row.discounts)}</Td>
                  <Td right bold>{formatCurrency(row.net)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function SalesListReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'sales-list', range.from, range.to],
    queryFn: () => api.get(`/reports/sales/list?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const STATUS_CLS = { completed: 'bg-teal-50 text-teal-700', refunded: 'bg-amber-50 text-amber-700', void: 'bg-slate-100 text-slate-500' }
  return (
    <Card title={`Transactions (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Staff</Th><Th>Method</Th><Th>Status</Th><Th right>Subtotal</Th><Th right>Tips</Th><Th right>Tax</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td>{r.staff}</Td>
                  <Td><span className="capitalize">{r.payment_method}</span></Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></Td>
                  <Td right>{formatCurrency(r.subtotal)}</Td>
                  <Td right>{formatCurrency(r.tips)}</Td>
                  <Td right>{formatCurrency(r.tax)}</Td>
                  <Td right bold>{formatCurrency(r.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function SalesLogDetailReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'sales-log-detail', range.from, range.to],
    queryFn: () => api.get(`/reports/sales/log-detail?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Sales Log (${data.length} line items)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Item</Th><Th>Type</Th><Th right>Qty</Th><Th right>Unit Price</Th><Th right>Discount</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td>{r.item_name}</Td>
                  <Td><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 capitalize">{r.item_type}</span></Td>
                  <Td right>{r.quantity}</Td>
                  <Td right>{formatCurrency(r.unit_price)}</Td>
                  <Td right>{r.discount > 0 ? <span className="text-red-500">-{formatCurrency(r.discount)}</span> : '—'}</Td>
                  <Td right bold>{formatCurrency(r.total)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function GiftCardByPeriodReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'giftcard-period', range.from, range.to],
    queryFn: () => api.get(`/reports/gift-cards/by-period?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Gift}        label="Issued"          value={d.issued        ?? 0}                         color={TEAL}   />
        <StatCard icon={DollarSign}  label="Total Value"     value={formatCurrency(d.total_value   ?? 0)}         color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Redeemed"        value={formatCurrency(d.total_redeemed ?? 0)}        color={BLUE}   />
        <StatCard icon={Award}       label="Outstanding"     value={formatCurrency(d.total_outstanding ?? 0)}     color={TEAL}   />
      </div>
      <Card title="Gift Card Activity by Day">
        <div className="p-4">
          {(d.daily || []).length === 0 ? <Empty text="No gift card activity in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={50} />
                <Tooltip content={<ChartTip currency />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="issued"   name="Issued"   fill={INDIGO} radius={[3,3,0,0]} />
                <Bar dataKey="redeemed" name="Redeemed" fill={TEAL}   radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function GiftCardListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'giftcard-list'],
    queryFn: () => api.get('/reports/gift-cards/list').then(r => r.data),
  })
  const STATUS_CLS = { active: 'bg-teal-50 text-teal-700', redeemed: 'bg-slate-100 text-slate-500', expired: 'bg-red-50 text-red-600' }
  return (
    <Card title={`Gift Cards (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No gift cards found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Code</Th><Th>Recipient</Th><Th>From</Th><Th right>Initial</Th><Th right>Redeemed</Th><Th right>Balance</Th><Th>Status</Th><Th right>Issued</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold><span className="font-mono text-[12px]">{r.code}</span></Td>
                  <Td>{r.recipient || '—'}</Td>
                  <Td>{r.sender || '—'}</Td>
                  <Td right>{formatCurrency(r.initial_amount)}</Td>
                  <Td right>{formatCurrency(r.redeemed_amount)}</Td>
                  <Td right bold>{formatCurrency(r.balance)}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></Td>
                  <Td right muted>{r.issued_at}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function MembershipListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'membership-list'],
    queryFn: () => api.get('/reports/memberships/list').then(r => r.data),
  })
  const STATUS_CLS = { active: 'bg-teal-50 text-teal-700', cancelled: 'bg-red-50 text-red-600', expired: 'bg-slate-100 text-slate-500', paused: 'bg-amber-50 text-amber-700' }
  return (
    <Card title={`Memberships (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No memberships found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Client</Th><Th>Plan</Th><Th>Billing</Th><Th right>Price</Th><Th>Status</Th><Th right>Started</Th><Th right>Next Bill</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.client}</Td>
                  <Td>{r.plan}</Td>
                  <Td><span className="capitalize">{r.billing_cycle}</span></Td>
                  <Td right bold>{formatCurrency(r.price)}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></Td>
                  <Td right muted>{r.started_at}</Td>
                  <Td right muted>{r.next_billing_at || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PackagesListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'packages-list'],
    queryFn: () => api.get('/reports/packages/list').then(r => r.data),
  })
  return (
    <Card title={`Packages (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No packages found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Client</Th><Th>Package</Th><Th right>Price Paid</Th><Th right>Sessions Used</Th><Th right>Sessions Left</Th><Th>Status</Th><Th right>Purchased</Th><Th right>Expires</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.client}</Td>
                  <Td>{r.package_name}</Td>
                  <Td right bold>{formatCurrency(r.price_paid)}</Td>
                  <Td right>{r.sessions_used}</Td>
                  <Td right>{r.sessions_remaining ?? '∞'}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${r.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span></Td>
                  <Td right muted>{r.purchased_at}</Td>
                  <Td right muted>{r.expires_at || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PackagesSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'packages-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/packages/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Packages Summary">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No package sales in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Package</Th><Th right>Sold</Th><Th right>Revenue</Th><Th right>Sessions Used</Th><Th right>Sessions Remaining</Th><Th right>Avg Price</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.package_name}</Td>
                  <Td right>{r.sold}</Td>
                  <Td right bold>{formatCurrency(r.revenue)}</Td>
                  <Td right>{r.sessions_used}</Td>
                  <Td right>{r.sessions_remaining}</Td>
                  <Td right>{formatCurrency(r.avg_price)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PackagesBenefitsReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'packages-benefits', range.from, range.to],
    queryFn: () => api.get(`/reports/packages/benefits?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Package Benefits Consumption">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No package redemptions in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Client</Th><Th>Package</Th><Th>Service</Th><Th>Staff</Th><Th right>Value</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.client}</Td>
                  <Td>{r.package_name}</Td>
                  <Td>{r.service}</Td>
                  <Td>{r.staff || '—'}</Td>
                  <Td right bold>{formatCurrency(r.value)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function DiscountSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'discount-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/discounts/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Percent}     label="Total Discounts"     value={formatCurrency(d.total_discount ?? 0)} color={TEAL}   />
        <StatCard icon={ShoppingBag} label="Transactions w/ Discount" value={d.tx_with_discount ?? 0}         color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Discount"        value={formatCurrency(d.avg_discount ?? 0)}  color={BLUE}   />
      </div>
      <Card title="Discounts by Day">
        <div className="p-4">
          {(d.daily || []).length === 0 ? <Empty text="No discounts in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={50} />
                <Tooltip content={<ChartTip currency />} />
                <Bar dataKey="discount" name="Discount" fill={INDIGO} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function TaxesSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'taxes-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/taxes/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Tag}         label="Total Tax Collected" value={formatCurrency(d.total_tax    ?? 0)} color={TEAL}   />
        <StatCard icon={ShoppingBag} label="Taxable Transactions" value={d.taxable_tx ?? 0}                   color={INDIGO} />
        <StatCard icon={DollarSign}  label="Taxable Revenue"     value={formatCurrency(d.taxable_revenue ?? 0)} color={BLUE} />
      </div>
      <Card title="Tax by Day">
        <div className="p-4">
          {(d.daily || []).length === 0 ? <Empty text="No tax data in this period" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TEAL} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={50} />
                <Tooltip content={<ChartTip currency />} />
                <Area type="monotone" dataKey="tax" name="Tax" stroke={TEAL} strokeWidth={2} fill="url(#gTax)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Team reports ──────────────────────────────────────────────────────────────

function WorkingHoursActivityReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'working-hours-activity', range.from, range.to],
    queryFn: () => api.get(`/reports/team/working-hours-activity?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Working Hours (${data.length} shifts)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No shifts recorded in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff</Th><Th>Date</Th><Th>Start</Th><Th>End</Th><Th right>Hours</Th><Th>{''}</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td>{r.shift_date}</Td>
                  <Td>{r.start_time}</Td>
                  <Td>{r.end_time}</Td>
                  <Td right bold>{r.hours}h</Td>
                  <Td>{r.notes || ''}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function WorkingHoursSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'working-hours-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/working-hours-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Working Hours Summary">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No shift data in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff Member</Th><Th right>Shifts</Th><Th right>Total Hours</Th><Th right>Avg Hours/Shift</Th><Th right>Revenue</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.shifts}</Td>
                  <Td right bold>{r.total_hours}h</Td>
                  <Td right>{r.avg_hours}h</Td>
                  <Td right bold>{formatCurrency(r.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function AttendanceSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'attendance-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/attendance-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Attendance Summary">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No shift data in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff Member</Th><Th right>Scheduled</Th><Th right>Worked</Th><Th right>Total Hours</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.scheduled}</Td>
                  <Td right>{r.worked}</Td>
                  <Td right bold>{r.total_hours}h</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ScheduledShiftsReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'scheduled-shifts', range.from, range.to],
    queryFn: () => api.get(`/reports/team/scheduled-shifts?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <Card title={`Scheduled Shifts (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No scheduled shifts found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff</Th><Th>Date</Th><Th>Day</Th><Th>Start</Th><Th>End</Th><Th right>Hours</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td>{r.shift_date}</Td>
                  <Td muted>{DAYS[new Date(r.shift_date + 'T00:00:00').getDay()]}</Td>
                  <Td>{r.start_time}</Td>
                  <Td>{r.end_time}</Td>
                  <Td right bold>{r.hours}h</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function TipsSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'tips-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/tips-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Award}       label="Total Tips"      value={formatCurrency(d.total_tips ?? 0)} color={TEAL}   />
        <StatCard icon={Users}       label="Staff w/ Tips"   value={d.staff_count ?? 0}                color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Tip"         value={formatCurrency(d.avg_tip   ?? 0)} color={BLUE}   />
      </div>
      <Card title="Tips by Staff Member">
        {(d.by_staff || []).length === 0 ? <Empty text="No tips in this period" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Staff</Th><Th right>Transactions</Th><Th right>Tips Received</Th><Th right>Avg Tip</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.by_staff.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td bold>{r.staff}</Td>
                    <Td right>{r.count}</Td>
                    <Td right bold>{formatCurrency(r.tips)}</Td>
                    <Td right>{formatCurrency(r.avg_tip)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function TipsDetailReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'tips-detail', range.from, range.to],
    queryFn: () => api.get(`/reports/team/tips-detail?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Tips Detail (${data.length} transactions)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No tips in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Staff</Th><Th>Client</Th><Th>Method</Th><Th right>Sale Total</Th><Th right>Tip</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.staff}</Td>
                  <Td>{r.client}</Td>
                  <Td><span className="capitalize">{r.payment_method}</span></Td>
                  <Td right>{formatCurrency(r.sale_total)}</Td>
                  <Td right bold>{formatCurrency(r.tip)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CommissionActivityReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'commission-activity', range.from, range.to],
    queryFn: () => api.get(`/reports/team/commission-activity?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Commission Activity (${data.length} sales)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No commission data in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Staff</Th><Th>Client</Th><Th right>Sale Total</Th><Th right>Comm %</Th><Th right>Commission</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.staff}</Td>
                  <Td>{r.client}</Td>
                  <Td right>{formatCurrency(r.sale_total)}</Td>
                  <Td right muted>{r.commission_pct}%</Td>
                  <Td right bold>{formatCurrency(r.commission)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CommissionSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'commission-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/commission-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Commission Summary">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No commission data in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff Member</Th><Th right>Sales</Th><Th right>Revenue</Th><Th right>Comm %</Th><Th right>Commission Earned</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.sales}</Td>
                  <Td right>{formatCurrency(r.revenue)}</Td>
                  <Td right muted>{r.commission_pct}%</Td>
                  <Td right bold>{formatCurrency(r.commission)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function fmtTime(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return iso }
}

function BreakActivityReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'break-activity', range.from, range.to],
    queryFn: () => api.get(`/reports/team/break-activity?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Break Activity (${data.length} breaks)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No breaks logged in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Staff</Th><Th>Start</Th><Th>End</Th><Th right>Duration</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.staff}</Td>
                  <Td>{fmtTime(r.start_at)}</Td>
                  <Td>{r.end_at ? fmtTime(r.end_at) : <span className="text-amber-600 font-semibold">In progress</span>}</Td>
                  <Td right>{r.duration_min != null ? `${r.duration_min} min` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function WagesDetailReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'wages-detail', range.from, range.to],
    queryFn: () => api.get(`/reports/team/wages-detail?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Wages Detail (${data.length} shifts)`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No shifts in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Staff</Th><Th right>Hours</Th><Th right>Hourly Rate</Th><Th right>Wage</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td muted>{r.shift_date}</Td>
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.hours}</Td>
                  <Td right muted>{formatCurrency(r.hourly_rate)}</Td>
                  <Td right bold>{formatCurrency(r.wage)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function WagesSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'wages-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/wages-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Wages Summary">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No wages data in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff Member</Th><Th right>Shifts</Th><Th right>Total Hours</Th><Th right>Hourly Rate</Th><Th right>Total Wage</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.shifts}</Td>
                  <Td right>{r.total_hours}</Td>
                  <Td right muted>{formatCurrency(r.hourly_rate)}</Td>
                  <Td right bold>{formatCurrency(r.total_wage)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function FeeDeductionActivityReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'fee-deduction-activity', range.from, range.to],
    queryFn: () => api.get(`/reports/team/fee-deduction-activity?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Fee Deduction Activity (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No fee deductions in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Staff</Th><Th>Reason</Th><Th right>Amount</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td bold>{r.staff}</Td>
                  <Td>{r.reason || '—'}</Td>
                  <Td right bold>{formatCurrency(r.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function FeeDeductionSummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'fee-deduction-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/fee-deduction-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title="Fee Deduction Summary">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No fee deductions in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff Member</Th><Th right>Deductions</Th><Th right>Total Amount</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td right>{r.count}</Td>
                  <Td right bold>{formatCurrency(r.total_amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PaySummaryReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'pay-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/team/pay-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const totals = data.reduce((acc, r) => ({
    wages: acc.wages + r.wages, commission: acc.commission + r.commission,
    tips: acc.tips + r.tips, netPay: acc.netPay + r.net_pay,
  }), { wages: 0, commission: 0, tips: 0, netPay: 0 })
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Clock}       label="Total Wages"     value={formatCurrency(totals.wages)}      color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Total Commission" value={formatCurrency(totals.commission)} color={TEAL}   />
        <StatCard icon={Award}       label="Total Tips"      value={formatCurrency(totals.tips)}       color={BLUE}   />
        <StatCard icon={Wallet}      label="Total Net Pay"   value={formatCurrency(totals.netPay)}     color={TEAL}   />
      </div>
      <Card title="Compensation by Team Member">
        {data.length === 0 ? <Empty text="No pay data in this period" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Staff Member</Th><Th right>Wages</Th><Th right>Commission</Th><Th right>Tips</Th><Th right>Deductions</Th><Th right>Net Pay</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td bold>{r.staff}</Td>
                    <Td right>{formatCurrency(r.wages)}</Td>
                    <Td right>{formatCurrency(r.commission)}</Td>
                    <Td right>{formatCurrency(r.tips)}</Td>
                    <Td right muted>{r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : formatCurrency(0)}</Td>
                    <Td right bold>{formatCurrency(r.net_pay)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

const TIME_OFF_STATUS_COLORS = {
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
}

function TeamTimeOffReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'team-time-off', range.from, range.to],
    queryFn: () => api.get(`/reports/team/time-off?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  return (
    <Card title={`Team Time Off (${data.length})`}>
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? <Empty text="No time off in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Staff</Th><Th>Start</Th><Th>End</Th><Th>Reason</Th><Th right>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold>{r.staff}</Td>
                  <Td muted>{r.start_date}</Td>
                  <Td muted>{r.end_date}</Td>
                  <Td>{r.reason || '—'}</Td>
                  <Td right>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${TIME_OFF_STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Inventory reports ─────────────────────────────────────────────────────────

function StockOnHandReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'stock-on-hand'],
    queryFn: () => api.get('/reports/inventory/stock-on-hand').then(r => r.data),
  })
  const ok  = data.filter(i => i.status === 'ok').length
  const low = data.filter(i => i.status === 'low').length
  const out = data.filter(i => i.status === 'out').length
  const SCLS = { ok: 'bg-teal-50 text-teal-700', low: 'bg-amber-50 text-amber-700', out: 'bg-red-50 text-red-600' }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total Items"   value={data.length} color={TEAL}   />
        <StatCard icon={Award}         label="In Stock"      value={ok}           color={INDIGO} />
        <StatCard icon={AlertTriangle} label="Low Stock"     value={low}          color={BLUE}   />
        <StatCard icon={XCircle}       label="Out of Stock"  value={out}          color={TEAL}   />
      </div>
      <Card title="Stock Levels">
        {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No inventory items found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th right>Qty</Th><Th right>Min</Th><Th>Status</Th><Th right>Cost</Th><Th right>Retail</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <Td bold>{item.name}</Td>
                    <Td muted>{item.sku || '—'}</Td>
                    <Td>{item.category || '—'}</Td>
                    <Td right bold>{item.stock_qty}</Td>
                    <Td right muted>{item.low_stock_threshold}</Td>
                    <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SCLS[item.status]}`}>{item.status === 'ok' ? 'In Stock' : item.status === 'low' ? 'Low Stock' : 'Out of Stock'}</span></Td>
                    <Td right>{formatCurrency(item.cost_price)}</Td>
                    <Td right bold>{formatCurrency(item.retail_price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function StockMovementSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'stock-movement-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/inventory/stock-movement-summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={3} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={ArrowUpRight}  label="Stock In (Orders)"   value={d.stock_in_qty   ?? 0} color={TEAL}   />
        <StatCard icon={ArrowDownLeft} label="Stock Out (Sales)"   value={d.stock_out_qty  ?? 0} color={BLUE}   />
        <StatCard icon={DollarSign}    label="Purchase Value"      value={formatCurrency(d.purchase_value ?? 0)} color={INDIGO} />
      </div>
      <Card title="Movement by Product">
        {(d.by_product || []).length === 0 ? <Empty text="No stock movements in this period" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Product</Th><Th right>Stock In</Th><Th right>Stock Out</Th><Th right>Net Change</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.by_product.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td bold>{r.name}</Td>
                    <Td right>{r.stock_in}</Td>
                    <Td right>{r.stock_out}</Td>
                    <Td right bold><span className={r.net >= 0 ? 'text-teal-600' : 'text-red-500'}>{r.net >= 0 ? '+' : ''}{r.net}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function StockMovementLogReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'stock-movement-log', range.from, range.to],
    queryFn: () => api.get(`/reports/inventory/stock-movement-log?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const TYPE_CLS = { 'Stock In': 'bg-teal-50 text-teal-700', 'Stock Out': 'bg-blue-50 text-blue-700' }
  return (
    <Card title={`Stock Movements (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No stock movements in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Date</Th><Th>Type</Th><Th>Product</Th><Th>Reference</Th><Th right>Qty</Th><Th right>Unit Cost</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td muted>{r.date}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_CLS[r.type] || 'bg-slate-100 text-slate-600'}`}>{r.type}</span></Td>
                  <Td bold>{r.product}</Td>
                  <Td muted>{r.reference}</Td>
                  <Td right>{r.qty}</Td>
                  <Td right>{formatCurrency(r.unit_cost)}</Td>
                  <Td right bold>{formatCurrency(r.total_cost)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ProductListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'product-list'],
    queryFn: () => api.get('/reports/inventory/product-list').then(r => r.data),
  })
  return (
    <Card title={`Products (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No products found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>#</Th><Th>Product</Th><Th>SKU</Th><Th>Category</Th><Th>Supplier</Th><Th right>Cost</Th><Th right>Retail</Th><Th right>Stock</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td muted>{i + 1}</Td>
                  <Td bold>{r.name}</Td>
                  <Td muted>{r.sku || '—'}</Td>
                  <Td>{r.category || '—'}</Td>
                  <Td>{r.supplier || '—'}</Td>
                  <Td right>{formatCurrency(r.cost_price)}</Td>
                  <Td right bold>{formatCurrency(r.retail_price)}</Td>
                  <Td right>{r.stock_qty}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function OrderedStockReport({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'ordered-stock', range.from, range.to],
    queryFn: () => api.get(`/reports/inventory/ordered-stock?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  const STATUS_CLS = { draft: 'bg-slate-100 text-slate-500', ordered: 'bg-blue-50 text-blue-700', partial: 'bg-amber-50 text-amber-700', received: 'bg-teal-50 text-teal-700', cancelled: 'bg-red-50 text-red-600' }
  return (
    <Card title={`Stock Orders (${data.length})`}>
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? <Empty text="No stock orders in this period" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>PO Number</Th><Th>Supplier</Th><Th>Order Date</Th><Th>Expected</Th><Th>Status</Th><Th right>Items</Th><Th right>Total</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td bold><span className="font-mono text-[12px]">{r.po_number}</span></Td>
                  <Td>{r.supplier}</Td>
                  <Td muted>{r.order_date}</Td>
                  <Td muted>{r.expected_date || '—'}</Td>
                  <Td><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_CLS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></Td>
                  <Td right>{r.item_count}</Td>
                  <Td right bold>{formatCurrency(r.total_amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Client reports ────────────────────────────────────────────────────────────

function ClientSummaryReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'client-summary', range.from, range.to],
    queryFn: () => api.get(`/reports/clients/summary?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  const daily = d.daily || []
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Clients"    value={d.total     ?? 0} color={TEAL}   />
        <StatCard icon={Award}      label="New Clients"      value={d.new_clients ?? 0} color={INDIGO} />
        <StatCard icon={TrendingUp} label="Returning"        value={d.returning   ?? 0} color={BLUE}   />
        <StatCard icon={UserCheck}  label="Walk-ins"         value={d.walk_ins    ?? 0} color={TEAL}   />
      </div>
      <Card title="New vs Returning by Day">
        <div className="p-4">
          {daily.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="new_clients" name="New"       fill={INDIGO} radius={[3,3,0,0]} />
                <Bar dataKey="returning"   name="Returning" fill={TEAL}   radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

function ClientListReport() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'client-list'],
    queryFn: () => api.get('/reports/clients/list').then(r => r.data),
  })
  return (
    <Card title={`All Clients (${data.length})`}>
      {isLoading ? <Skeleton rows={8} /> : data.length === 0 ? <Empty text="No clients found" /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>#</Th><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th right>Visits</Th><Th right>Total Spend</Th><Th right>Stars</Th><Th right>Last Visit</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td muted>{i + 1}</Td>
                  <Td bold>{c.name}</Td>
                  <Td>{c.phone}</Td>
                  <Td muted>{c.email || '—'}</Td>
                  <Td right>{c.total_visits}</Td>
                  <Td right bold>{formatCurrency(c.total_spend)}</Td>
                  <Td right>{c.loyalty_points}</Td>
                  <Td right muted>{c.last_visit || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ClientInsightsReport({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'client-insights', range.from, range.to],
    queryFn: () => api.get(`/reports/clients/insights?from=${range.from}&to=${range.to}`).then(r => r.data),
  })
  if (isLoading) return <LoadSkeleton cols={4} />
  const d = data || {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Active Clients"   value={d.active        ?? 0}                       color={TEAL}   />
        <StatCard icon={TrendingUp}    label="Avg Visits / Client" value={(d.avg_visits ?? 0).toFixed(1)}          color={INDIGO} />
        <StatCard icon={DollarSign}    label="Avg Spend / Client" value={formatCurrency(d.avg_spend ?? 0)}         color={BLUE}   />
        <StatCard icon={Star}          label="Loyalty Members"  value={d.loyalty_members ?? 0}                     color={TEAL}   />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Top Clients by Spend">
          {(d.top_spenders || []).length === 0 ? <Empty text="No spend data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>#</Th><Th>Client</Th><Th right>Visits</Th><Th right>Total Spend</Th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {d.top_spenders.map((c, i) => (
                    <tr key={c.id} className="hover:bg-slate-50"><Td muted>{i+1}</Td><Td bold>{c.name}</Td><Td right>{c.visits}</Td><Td right bold>{formatCurrency(c.spend)}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Client Retention">
          <div className="p-5 space-y-4">
            {[
              { label: 'Active (visited in 30d)',    value: d.active_30d    ?? 0, color: TEAL   },
              { label: 'At Risk (31–60d)',            value: d.at_risk       ?? 0, color: '#F59E0B' },
              { label: 'Lapsed (61–90d)',             value: d.lapsed        ?? 0, color: BLUE   },
              { label: 'Lost (90d+)',                 value: d.lost          ?? 0, color: '#EF4444' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-slate-600">{row.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min((row.value / Math.max(d.active ?? 1, 1)) * 100, 100)}%`, background: row.color }} />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 w-8 text-right tabular-nums">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Referral Sources">
        {(d.referral_sources || []).length === 0 ? <Empty text="No referral data" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100"><tr><Th>Source</Th><Th right>Clients</Th><Th right>% of Total</Th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {d.referral_sources.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <Td bold><span className="capitalize">{r.source || 'Unknown'}</span></Td>
                    <Td right>{r.count}</Td>
                    <Td right muted>{d.active ? ((r.count / d.active) * 100).toFixed(1) : '0'}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function renderReportComponent(reportId, range) {
  switch (reportId) {
    case 'finance-summary':        return <FinanceSummaryReport        range={range} />
    case 'payments-summary':       return <PaymentsSummaryReport       range={range} />
    case 'payment-transactions':   return <PaymentTransactionsReport   range={range} />
    case 'cashflow-summary':       return <CashFlowSummaryReport       range={range} />
    case 'cashflow-statement':     return <CashFlowStatementReport     range={range} />
    case 'service-charges':        return <ServiceChargesReport        range={range} />
    case 'liability-summary':      return <LiabilitySummaryReport      />
    case 'liability-activity':     return <LiabilityActivityReport     range={range} />
    case 'prepayments-by-period':  return <PrepaymentsByPeriodReport   range={range} />
    case 'prepayment-list':        return <PrepaymentListReport        />
    case 'taxes-list':             return <TaxesListReport             range={range} />
    case 'sales-summary':      return <SalesSummaryReport      range={range} />
    case 'sales-by-period':    return <SalesByPeriodReport     range={range} />
    case 'sales-list':         return <SalesListReport         range={range} />
    case 'sales-log-detail':   return <SalesLogDetailReport    range={range} />
    case 'giftcard-period':    return <GiftCardByPeriodReport  range={range} />
    case 'giftcard-list':      return <GiftCardListReport      />
    case 'membership-list':    return <MembershipListReport    />
    case 'packages-list':      return <PackagesListReport      />
    case 'packages-summary':   return <PackagesSummaryReport   range={range} />
    case 'packages-benefits':  return <PackagesBenefitsReport  range={range} />
    case 'discount-summary':   return <DiscountSummaryReport   range={range} />
    case 'taxes-summary':      return <TaxesSummaryReport      range={range} />
    case 'eod':                return <EndOfDayReport          />
    case 'appts-summary':        return <ApptsSummaryReport        range={range} />
    case 'appts-list':           return <ApptsListReport           range={range} />
    case 'appts-cancellations':  return <ApptsCancellationsReport  range={range} />
    case 'waitlist-detail':      return <WaitlistDetailReport      range={range} />
    case 'waitlist-summary':     return <WaitlistSummaryReport     range={range} />
    case 'staff':                    return <StaffReport                  range={range} />
    case 'working-hours-activity':   return <WorkingHoursActivityReport  range={range} />
    case 'working-hours-summary':    return <WorkingHoursSummaryReport   range={range} />
    case 'attendance-summary':       return <AttendanceSummaryReport     range={range} />
    case 'scheduled-shifts':         return <ScheduledShiftsReport       range={range} />
    case 'tips-summary':             return <TipsSummaryReport           range={range} />
    case 'tips-detail':              return <TipsDetailReport            range={range} />
    case 'commission-activity':      return <CommissionActivityReport    range={range} />
    case 'commission-summary':       return <CommissionSummaryReport     range={range} />
    case 'break-activity':           return <BreakActivityReport         range={range} />
    case 'wages-detail':             return <WagesDetailReport           range={range} />
    case 'wages-summary':            return <WagesSummaryReport          range={range} />
    case 'fee-deduction-activity':   return <FeeDeductionActivityReport  range={range} />
    case 'fee-deduction-summary':    return <FeeDeductionSummaryReport   range={range} />
    case 'pay-summary':              return <PaySummaryReport            range={range} />
    case 'team-time-off':            return <TeamTimeOffReport           range={range} />
    case 'services':             return <ServicesReport            range={range} />
    case 'clients':              return <ClientsReport             range={range} />
    case 'client-summary':       return <ClientSummaryReport      range={range} />
    case 'client-list':          return <ClientListReport         />
    case 'client-insights':      return <ClientInsightsReport     range={range} />
    case 'inventory':            return <InventoryReport           />
    case 'stock-on-hand':        return <StockOnHandReport         />
    case 'stock-movement-summary': return <StockMovementSummaryReport range={range} />
    case 'stock-movement-log':   return <StockMovementLogReport    range={range} />
    case 'product-list':         return <ProductListReport         />
    case 'ordered-stock':        return <OrderedStockReport        range={range} />
    case 'loyalty':              return <LoyaltyReport             range={range} />
    default:                     return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') || 'sales'
  const reportId   = searchParams.get('report')   || null

  const [range, setRange] = useState({ from: offsetDate(29), to: todayStr() })
  const queryClient = useQueryClient()

  const category = getCategoryById(categoryId)
  const found    = reportId ? getReportById(reportId) : null
  const activeReport = found?.report

  const showDateRange = reportId ? !NO_DATE_REPORTS.has(reportId) : false

  function goCategory(catId) {
    setSearchParams({ category: catId })
  }
  function goReport(repId) {
    setSearchParams({ category: categoryId, report: repId })
  }
  function goBack() {
    setSearchParams({ category: categoryId })
  }

  function handleExport() {
    if (!reportId) return

    const dateStr = new Date().toISOString().slice(0, 10)

    function downloadCsv(filename, rows, cols) {
      if (!rows || rows.length === 0) return
      const escape = v => {
        const s = v == null ? '' : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s
      }
      const lines = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    }

    // Reports that return arrays directly
    const ARRAY_REPORTS = {
      'payment-transactions':   { qk: ['reports','payment-transactions',range.from,range.to],   cols: ['date','client','payment_method','status','subtotal','tax','tips','total'] },
      'cashflow-statement':     { qk: ['reports','cashflow-statement',range.from,range.to],     cols: ['date','transactions','inflow','outflow','tax','tips','net'] },
      'service-charges':        { qk: ['reports','service-charges',range.from,range.to],        cols: ['name','category','bookings','revenue','avg_price'] },
      'liability-activity':     { qk: ['reports','liability-activity',range.from,range.to],     cols: ['date','type','client','description','amount'] },
      'prepayment-list':        { qk: ['reports','prepayment-list'],                            cols: ['client','date','services','staff','deposit_paid','status'] },
      'taxes-list':             { qk: ['reports','taxes-list',range.from,range.to],             cols: ['date','client','payment_method','subtotal','tax','total'] },
      'sales-by-period':        { qk: ['reports','sales-by-period',range.from,range.to],        cols: ['period','transactions','revenue','tax','tips','discounts','net'] },
      'sales-list':             { qk: ['reports','sales-list',range.from,range.to],             cols: ['date','client','staff','payment_method','status','subtotal','tips','tax','total'] },
      'sales-log-detail':       { qk: ['reports','sales-log-detail',range.from,range.to],       cols: ['date','client','item_name','item_type','quantity','unit_price','discount','total'] },
      'giftcard-list':          { qk: ['reports','giftcard-list'],                              cols: ['code','recipient','sender','initial_amount','redeemed_amount','balance','status','issued_at'] },
      'membership-list':        { qk: ['reports','membership-list'],                            cols: ['client','plan','billing_cycle','price','status','started_at','next_billing_at'] },
      'packages-list':          { qk: ['reports','packages-list'],                              cols: ['client','package_name','price_paid','sessions_used','sessions_remaining','status','purchased_at','expires_at'] },
      'packages-summary':       { qk: ['reports','packages-summary',range.from,range.to],       cols: ['package_name','sold','revenue','sessions_used','sessions_remaining','avg_price'] },
      'packages-benefits':      { qk: ['reports','packages-benefits',range.from,range.to],      cols: ['date','client','package_name','service','staff','value'] },
      'appts-list':             { qk: ['reports','appts-list',range.from,range.to],             cols: ['date','client','services','staff','status','total'] },
      'waitlist-detail':        { qk: ['reports','waitlist-detail',range.from,range.to],        cols: ['client','service','preferred_day','time_start','time_end','status','created_at'] },
      'staff':                  { qk: ['reports','staff',range.from,range.to],                  cols: ['name','appointments','completed','revenue','tips','avg_ticket'] },
      'working-hours-activity': { qk: ['reports','working-hours-activity',range.from,range.to], cols: ['staff','shift_date','start_time','end_time','hours','notes'] },
      'working-hours-summary':  { qk: ['reports','working-hours-summary',range.from,range.to],  cols: ['staff','shifts','total_hours','avg_hours','revenue'] },
      'attendance-summary':     { qk: ['reports','attendance-summary',range.from,range.to],     cols: ['staff','scheduled','worked','total_hours'] },
      'scheduled-shifts':       { qk: ['reports','scheduled-shifts',range.from,range.to],       cols: ['staff','shift_date','start_time','end_time','hours'] },
      'tips-detail':            { qk: ['reports','tips-detail',range.from,range.to],            cols: ['date','staff','client','payment_method','sale_total','tip'] },
      'commission-activity':    { qk: ['reports','commission-activity',range.from,range.to],    cols: ['date','staff','client','sale_total','commission_pct','commission'] },
      'commission-summary':     { qk: ['reports','commission-summary',range.from,range.to],     cols: ['staff','sales','revenue','commission_pct','commission'] },
      'services':               { qk: ['reports','services',range.from,range.to],               cols: ['name','category','bookings','revenue','avg_price'] },
      'client-list':            { qk: ['reports','client-list'],                                cols: ['name','phone','email','total_visits','total_spend','loyalty_points','last_visit'] },
      'stock-on-hand':          { qk: ['reports','stock-on-hand'],                             cols: ['name','sku','category','stock_qty','low_stock_threshold','status','cost_price','retail_price'] },
      'stock-movement-log':     { qk: ['reports','stock-movement-log',range.from,range.to],    cols: ['date','type','product','reference','qty','unit_cost','total_cost'] },
      'product-list':           { qk: ['reports','product-list'],                              cols: ['name','sku','category','supplier','cost_price','retail_price','stock_qty'] },
      'ordered-stock':          { qk: ['reports','ordered-stock',range.from,range.to],         cols: ['po_number','supplier','order_date','expected_date','status','item_count','total_amount'] },
      'inventory':              { qk: ['reports','inventory'],                                 cols: ['name','sku','category','quantity','min_quantity','status','cost_price','selling_price'] },
      'break-activity':         { qk: ['reports','break-activity',range.from,range.to],        cols: ['date','staff','start_at','end_at','duration_min'] },
      'wages-detail':           { qk: ['reports','wages-detail',range.from,range.to],          cols: ['shift_date','staff','hours','hourly_rate','wage'] },
      'wages-summary':          { qk: ['reports','wages-summary',range.from,range.to],         cols: ['staff','shifts','total_hours','hourly_rate','total_wage'] },
      'fee-deduction-activity': { qk: ['reports','fee-deduction-activity',range.from,range.to],cols: ['date','staff','reason','amount'] },
      'fee-deduction-summary':  { qk: ['reports','fee-deduction-summary',range.from,range.to], cols: ['staff','count','total_amount'] },
      'pay-summary':            { qk: ['reports','pay-summary',range.from,range.to],           cols: ['staff','wages','commission','tips','deductions','net_pay'] },
      'team-time-off':          { qk: ['reports','team-time-off',range.from,range.to],         cols: ['staff','start_date','end_date','reason','status'] },
    }

    if (ARRAY_REPORTS[reportId]) {
      const { qk, cols } = ARRAY_REPORTS[reportId]
      const rows = queryClient.getQueryData(qk) || []
      downloadCsv(`report-${reportId}-${dateStr}.csv`, rows, cols)
      return
    }

    // Object-based summary reports — extract the most useful table/array
    switch (reportId) {
      case 'finance-summary': {
        const d = queryClient.getQueryData(['reports','finance-summary',range.from,range.to]) || {}
        downloadCsv(`report-finance-summary-${dateStr}.csv`, d.payment_breakdown || [], ['method','count','amount'])
        break
      }
      case 'payments-summary': {
        const d = queryClient.getQueryData(['reports','payments-summary',range.from,range.to]) || {}
        downloadCsv(`report-payments-summary-${dateStr}.csv`, d.by_method || [], ['method','count','amount','tips','total'])
        break
      }
      case 'cashflow-summary': {
        const d = queryClient.getQueryData(['reports','cashflow-summary',range.from,range.to]) || {}
        downloadCsv(`report-cashflow-summary-${dateStr}.csv`, d.daily || [], ['date','inflow','outflow'])
        break
      }
      case 'liability-summary': {
        const d = queryClient.getQueryData(['reports','liability-summary']) || {}
        const rows = [
          { type: 'Gift Cards',   count: d.gift_cards_count ?? 0,   outstanding: d.gift_cards   ?? 0 },
          { type: 'Packages',     count: d.packages_count ?? 0,     outstanding: d.packages     ?? 0 },
          { type: 'Memberships',  count: d.memberships_count ?? 0,  outstanding: d.memberships  ?? 0 },
        ]
        downloadCsv(`report-liability-summary-${dateStr}.csv`, rows, ['type','count','outstanding'])
        break
      }
      case 'prepayments-by-period': {
        const d = queryClient.getQueryData(['reports','prepayments-by-period',range.from,range.to]) || {}
        downloadCsv(`report-prepayments-by-period-${dateStr}.csv`, d.daily || [], ['date','total'])
        break
      }
      case 'giftcard-period': {
        const d = queryClient.getQueryData(['reports','giftcard-period',range.from,range.to]) || {}
        downloadCsv(`report-giftcard-period-${dateStr}.csv`, d.daily || [], ['date','issued','redeemed'])
        break
      }
      case 'discount-summary': {
        const d = queryClient.getQueryData(['reports','discount-summary',range.from,range.to]) || {}
        downloadCsv(`report-discount-summary-${dateStr}.csv`, d.daily || [], ['date','discount'])
        break
      }
      case 'taxes-summary': {
        const d = queryClient.getQueryData(['reports','taxes-summary',range.from,range.to]) || {}
        downloadCsv(`report-taxes-summary-${dateStr}.csv`, d.daily || [], ['date','tax'])
        break
      }
      case 'sales-summary': {
        const d = queryClient.getQueryData(['reports','sales',range.from,range.to]) || {}
        downloadCsv(`report-sales-summary-${dateStr}.csv`, d.daily || [], ['date','revenue'])
        break
      }
      case 'appts-summary': {
        const d = queryClient.getQueryData(['reports','appointments',range.from,range.to]) || {}
        downloadCsv(`report-appts-summary-${dateStr}.csv`, d.daily || [], ['date','completed','cancelled','no_show'])
        break
      }
      case 'appts-cancellations': {
        const d = queryClient.getQueryData(['reports','appointments',range.from,range.to]) || {}
        downloadCsv(`report-appts-cancellations-${dateStr}.csv`, d.daily || [], ['date','cancelled','no_show'])
        break
      }
      case 'waitlist-summary': {
        const d = queryClient.getQueryData(['reports','waitlist-summary',range.from,range.to]) || {}
        downloadCsv(`report-waitlist-summary-${dateStr}.csv`, d.daily || [], ['date','added','booked'])
        break
      }
      case 'tips-summary': {
        const d = queryClient.getQueryData(['reports','tips-summary',range.from,range.to]) || {}
        downloadCsv(`report-tips-summary-${dateStr}.csv`, d.by_staff || [], ['staff','count','tips','avg_tip'])
        break
      }
      case 'stock-movement-summary': {
        const d = queryClient.getQueryData(['reports','stock-movement-summary',range.from,range.to]) || {}
        downloadCsv(`report-stock-movement-summary-${dateStr}.csv`, d.by_product || [], ['name','stock_in','stock_out','net'])
        break
      }
      case 'client-summary': {
        const d = queryClient.getQueryData(['reports','client-summary',range.from,range.to]) || {}
        downloadCsv(`report-client-summary-${dateStr}.csv`, d.daily || [], ['date','new_clients','returning'])
        break
      }
      case 'clients': {
        const d = queryClient.getQueryData(['reports','clients',range.from,range.to]) || {}
        downloadCsv(`report-clients-${dateStr}.csv`, d.top_clients || [], ['rank','name','total_visits','total_spend','avg_per_visit','last_visit'])
        break
      }
      case 'client-insights': {
        const d = queryClient.getQueryData(['reports','client-insights',range.from,range.to]) || {}
        downloadCsv(`report-client-insights-${dateStr}.csv`, d.top_spenders || [], ['name','visits','spend'])
        break
      }
      case 'loyalty': {
        const d = queryClient.getQueryData(['reports','loyalty',range.from,range.to]) || {}
        const rows = [
          { metric: 'Stars Earned',   value: d.points_earned   ?? 0 },
          { metric: 'Stars Redeemed', value: d.points_redeemed ?? 0 },
          { metric: 'Active Members', value: d.active_members  ?? 0 },
          { metric: 'Net Stars',      value: d.net_points      ?? 0 },
        ]
        downloadCsv(`report-loyalty-${dateStr}.csv`, rows, ['metric','value'])
        break
      }
      case 'eod': {
        const d = queryClient.getQueryData(['reports','eod',todayStr()]) || {}
        downloadCsv(`report-eod-${dateStr}.csv`, d.payments || [], ['method','count','revenue'])
        break
      }
      default:
        break
    }
  }

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ minHeight: 'calc(100vh - 64px)' }}>

      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart2 size={16} className="text-teal-600" />
          <span className="text-[14px] font-bold text-slate-800">Reports</span>
        </div>
        <nav className="px-2 py-3 space-y-0.5">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = categoryId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => goCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-colors ${
                  active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} className={active ? 'text-teal-600' : 'text-slate-400'} />
                {cat.label}
                <span className="ml-auto text-[11px] font-medium text-slate-400">{cat.reports.length}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 mb-1">
            <span>Reports</span>
            <ChevronRight size={12} />
            <button onClick={() => goCategory(categoryId)} className={`hover:text-slate-600 transition-colors ${!reportId ? 'text-slate-700 font-medium' : ''}`}>
              {category?.label}
            </button>
            {activeReport && (
              <>
                <ChevronRight size={12} />
                <span className="text-slate-700 font-medium">{activeReport.label}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {reportId && (
                <button onClick={goBack} className="text-[12px] text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1">
                  ← Back
                </button>
              )}
              <h1 className="text-[18px] font-bold text-slate-800">
                {activeReport ? activeReport.label : category?.label}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {showDateRange && <DateRangePicker from={range.from} to={range.to} onChange={setRange} />}
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {reportId
            ? renderReportComponent(reportId, range)
            : category && <CategoryGrid category={category} onSelectReport={goReport} />
          }
        </div>
      </div>
    </div>
  )
}
