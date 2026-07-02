import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  BarChart2, Calendar, Users, Scissors, Package, Gift,
  DollarSign, TrendingUp, ShoppingBag, AlertTriangle, Clock, Award,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAL   = '#0D9488'
const INDIGO = '#6366F1'
const BLUE   = '#3B82F6'

const TABS = [
  { id: 'sales',        label: 'Sales',        icon: DollarSign  },
  { id: 'appointments', label: 'Appointments',  icon: Calendar    },
  { id: 'staff',        label: 'Staff',         icon: Users       },
  { id: 'services',     label: 'Services',      icon: Scissors    },
  { id: 'clients',      label: 'Clients',       icon: Users       },
  { id: 'inventory',    label: 'Inventory',     icon: Package     },
  { id: 'loyalty',      label: 'Loyalty',       icon: Gift        },
  { id: 'eod',          label: 'End of Day',    icon: Clock       },
]

const PRESETS = [
  { label: 'Today',         days: 0 },
  { label: 'This Week',     days: 7 },
  { label: 'This Month',    days: 30 },
  { label: 'Last Month',    days: 60, offset: 30 },
  { label: 'Last 3 Months', days: 90 },
]

const STATUS_COLORS = {
  completed: 'bg-teal-100 text-teal-700',
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show:   'bg-slate-100 text-slate-500',
}

const STOCK_COLORS = {
  ok:  'bg-teal-100 text-teal-700',
  low: 'bg-blue-100 text-blue-700',
  out: 'bg-red-100 text-red-600',
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = TEAL }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[24px] font-bold text-slate-800 leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[12px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[13.5px] font-semibold text-slate-700">{title}</h3>
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

function Badge({ label, cls }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

function Th({ children, right }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}>
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

// ── Date range picker ─────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function DateRangePicker({ from, to, onChange }) {
  const [active, setActive] = useState('This Month')

  function applyPreset(p) {
    setActive(p.label)
    if (p.days === 0) {
      onChange({ from: todayStr(), to: todayStr() })
    } else if (p.offset) {
      onChange({ from: offsetDate(p.days), to: offsetDate(p.offset) })
    } else {
      onChange({ from: offsetDate(p.days - 1), to: todayStr() })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => applyPreset(p)}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
            active === p.label
              ? 'border-[#0D9488] bg-teal-50 text-[#0D9488]'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          value={from}
          onChange={e => { setActive(''); onChange({ from: e.target.value, to }) }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-700 outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
        />
        <span className="text-slate-400 text-[12px]">—</span>
        <input
          type="date"
          value={to}
          onChange={e => { setActive(''); onChange({ from, to: e.target.value }) }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-700 outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
        />
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-[12px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-800">
            {currency ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────

function SalesTab({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sales', range.from, range.to],
    queryFn: () => api.get(`/reports/sales?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    </div>
  )

  const d = data || {}
  const daily = d.daily || []
  const topServices = d.top_services || []
  const paymentMethods = d.payment_methods || []

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue"  value={formatCurrency(d.total_revenue  ?? 0)} color={TEAL}   />
        <StatCard icon={ShoppingBag} label="Transactions"  value={d.total_tx ?? 0}                       color={INDIGO} />
        <StatCard icon={TrendingUp}  label="Avg Ticket"    value={formatCurrency(d.avg_ticket     ?? 0)} color={BLUE}   />
        <StatCard icon={Award}       label="Total Tips"    value={formatCurrency(d.total_tips     ?? 0)} color={TEAL}   />
      </div>

      {/* Area chart */}
      <Card title="Daily Revenue">
        <div className="p-4">
          {daily.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-10">No data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TEAL} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<ChartTooltip currency />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={TEAL} strokeWidth={2} fill="url(#gradRev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top services table */}
        <Card title="Top Services by Revenue">
          {topServices.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">No service data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr><Th>#</Th><Th>Service</Th><Th right>Bookings</Th><Th right>Revenue</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topServices.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <Td muted>{i + 1}</Td>
                      <Td bold>{s.name}</Td>
                      <Td right>{s.bookings}</Td>
                      <Td right bold>{formatCurrency(s.revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payment method table */}
        <Card title="Revenue by Payment Method">
          {paymentMethods.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">No payment data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr><Th>Method</Th><Th right>Count</Th><Th right>Revenue</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentMethods.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <Td bold><span className="capitalize">{p.method}</span></Td>
                      <Td right>{p.count}</Td>
                      <Td right bold>{formatCurrency(p.revenue)}</Td>
                    </tr>
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

// ── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'appointments', range.from, range.to],
    queryFn: () => api.get(`/reports/appointments?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    </div>
  )

  const d = data || {}
  const daily = d.daily || []
  const rate  = d.completion_rate ? d.completion_rate.toFixed(1) : '0.0'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar}      label="Total"       value={d.total    ?? 0} color={TEAL}   />
        <StatCard icon={Award}         label="Completed"   value={d.completed ?? 0} color={INDIGO} />
        <StatCard icon={AlertTriangle} label="Cancelled"   value={d.cancelled ?? 0} color={BLUE}   />
        <StatCard icon={Clock}         label="No-Shows"    value={d.no_shows  ?? 0} color={TEAL}   />
      </div>

      {/* Completion rate banner */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[12px] text-slate-500 uppercase tracking-wide font-medium">Completion Rate</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(parseFloat(rate), 100)}%`, background: `linear-gradient(90deg, ${TEAL}, ${INDIGO})` }}
              />
            </div>
            <span className="text-[20px] font-bold text-slate-800 w-16 text-right">{rate}%</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <Card title="Daily Appointment Breakdown">
        <div className="p-4">
          {daily.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-10">No data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" fill={TEAL}    radius={[3,3,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444"  radius={[3,3,0,0]} />
                <Bar dataKey="no_show"   name="No Show"   fill={BLUE}    radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────

function StaffTab({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'staff', range.from, range.to],
    queryFn: () => api.get(`/reports/staff?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  return (
    <Card title="Staff Performance">
      {isLoading ? <Skeleton rows={5} /> : data.length === 0 ? (
        <p className="text-[13px] text-slate-400 text-center py-10">No data for this period</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <Th>#</Th><Th>Staff Member</Th><Th right>Appointments</Th>
                <Th right>Completed</Th><Th right>Revenue</Th>
                <Th right>Tips</Th><Th right>Avg Ticket</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <Td muted>{i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color || INDIGO }} />
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                  </Td>
                  <Td right>{s.appointments}</Td>
                  <Td right>{s.completed}</Td>
                  <Td right bold>{formatCurrency(s.revenue)}</Td>
                  <Td right>{formatCurrency(s.tips)}</Td>
                  <Td right bold>{formatCurrency(s.avg_ticket)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Services Tab ──────────────────────────────────────────────────────────────

function ServicesTab({ range }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'services', range.from, range.to],
    queryFn: () => api.get(`/reports/services?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  return (
    <Card title="Services Performance">
      {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? (
        <p className="text-[13px] text-slate-400 text-center py-10">No service data for this period</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <Th>#</Th><Th>Service</Th><Th>Category</Th>
                <Th right>Bookings</Th><Th right>Revenue</Th><Th right>Avg Price</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <Td muted>{i + 1}</Td>
                  <Td bold>{s.name}</Td>
                  <Td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                      {s.category}
                    </span>
                  </Td>
                  <Td right>{s.bookings}</Td>
                  <Td right bold>{formatCurrency(s.revenue)}</Td>
                  <Td right>{formatCurrency(s.avg_price)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Clients Tab ───────────────────────────────────────────────────────────────

function ClientsTab({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'clients', range.from, range.to],
    queryFn: () => api.get(`/reports/clients?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
      </div>
      <div className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    </div>
  )

  const d = data || {}
  const topClients = d.top_clients || []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="New Clients"  value={d.new_clients ?? 0} color={TEAL}   />
        <StatCard icon={TrendingUp}    label="Returning"    value={d.returning    ?? 0} color={INDIGO} />
        <StatCard icon={AlertTriangle} label="At-Risk (45d)" value={d.at_risk     ?? 0} color={BLUE}   />
        <StatCard icon={Clock}         label="Lapsed (90d)" value={d.lapsed       ?? 0} color={TEAL}   />
      </div>

      <Card title="Top Clients by Spend">
        {topClients.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-10">No client data found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <Th>#</Th><Th>Client</Th><Th right>Visits</Th>
                  <Th right>Total Spend</Th><Th right>Avg / Visit</Th><Th right>Last Visit</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <Td muted>{c.rank}</Td>
                    <Td bold>{c.name}</Td>
                    <Td right>{c.total_visits}</Td>
                    <Td right bold>{formatCurrency(c.total_spend)}</Td>
                    <Td right>{formatCurrency(c.avg_per_visit)}</Td>
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

// ── Inventory Tab ─────────────────────────────────────────────────────────────

function InventoryTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => api.get('/reports/inventory').then(r => r.data),
  })

  const stats = useMemo(() => {
    const ok  = data.filter(i => i.status === 'ok').length
    const low = data.filter(i => i.status === 'low').length
    const out = data.filter(i => i.status === 'out').length
    return { ok, low, out, total: data.length }
  }, [data])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total Items"  value={stats.total} color={TEAL}   />
        <StatCard icon={Award}         label="In Stock"     value={stats.ok}    color={INDIGO} />
        <StatCard icon={AlertTriangle} label="Low Stock"    value={stats.low}   color={BLUE}   />
        <StatCard icon={Package}       label="Out of Stock" value={stats.out}   color={TEAL}   />
      </div>

      <Card title="Inventory Status">
        {isLoading ? <Skeleton rows={6} /> : data.length === 0 ? (
          <p className="text-[13px] text-slate-400 text-center py-10">No inventory items found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <Th>Name</Th><Th>SKU</Th><Th>Category</Th>
                  <Th right>Qty</Th><Th right>Min Qty</Th><Th>Status</Th>
                  <Th right>Cost</Th><Th right>Sell Price</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${item.status === 'low' ? 'bg-blue-50/40' : ''}`}
                  >
                    <Td bold>{item.name}</Td>
                    <Td muted>{item.sku || '—'}</Td>
                    <Td>{item.category || '—'}</Td>
                    <Td right bold>{item.quantity}</Td>
                    <Td right muted>{item.min_quantity}</Td>
                    <Td>
                      <Badge
                        label={item.status === 'ok' ? 'In Stock' : item.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                        cls={STOCK_COLORS[item.status] || 'bg-slate-100 text-slate-500'}
                      />
                    </Td>
                    <Td right>{formatCurrency(item.cost_price)}</Td>
                    <Td right bold>{formatCurrency(item.selling_price)}</Td>
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

// ── Loyalty Tab ───────────────────────────────────────────────────────────────

function LoyaltyTab({ range }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'loyalty', range.from, range.to],
    queryFn: () => api.get(`/reports/loyalty?from=${range.from}&to=${range.to}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
    </div>
  )

  const d = data || {}

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Award}      label="Points Earned"   value={(d.points_earned   ?? 0).toLocaleString()} color={TEAL}   />
      <StatCard icon={Gift}       label="Points Redeemed" value={(d.points_redeemed ?? 0).toLocaleString()} color={INDIGO} />
      <StatCard icon={Users}      label="Active Members"  value={(d.active_members  ?? 0).toLocaleString()} color={BLUE}   />
      <StatCard icon={TrendingUp} label="Net Points"      value={(d.net_points      ?? 0).toLocaleString()} color={TEAL}   />
    </div>
  )
}

// ── End of Day Tab ────────────────────────────────────────────────────────────

function EndOfDayTab() {
  const [date, setDate] = useState(todayStr)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'eod', date],
    queryFn: () => api.get(`/reports/eod?date=${date}`).then(r => r.data),
  })

  const d = data || {}
  const payments = d.payments || []

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-[13px] font-medium text-slate-600">Date:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={DollarSign}    label="Revenue"        value={formatCurrency(d.revenue        ?? 0)} color={TEAL}   />
            <StatCard icon={ShoppingBag}   label="Transactions"   value={d.transactions   ?? 0}                 color={INDIGO} />
            <StatCard icon={Award}         label="Tips"           value={formatCurrency(d.tips           ?? 0)} color={BLUE}   />
            <StatCard icon={TrendingUp}    label="Tax Collected"  value={formatCurrency(d.tax            ?? 0)} color={TEAL}   />
            <StatCard icon={AlertTriangle} label="Discounts Given" value={formatCurrency(d.discounts     ?? 0)} color={INDIGO} />
            <StatCard icon={Users}         label="Unique Clients" value={d.unique_clients ?? 0}                 color={BLUE}   />
          </div>

          {/* Payment breakdown */}
          <Card title="Payment Breakdown">
            {payments.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-8">No transactions for this day</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr><Th>Payment Method</Th><Th right>Count</Th><Th right>Revenue</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <Td bold><span className="capitalize">{p.method}</span></Td>
                        <Td right>{p.count}</Td>
                        <Td right bold>{formatCurrency(p.revenue)}</Td>
                      </tr>
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

// ── Main Reports page ─────────────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales')

  const defaultFrom = useMemo(() => offsetDate(29), [])
  const defaultTo   = useMemo(() => todayStr(),     [])
  const [range, setRange] = useState({ from: defaultFrom, to: defaultTo })

  const showDateRange = activeTab !== 'inventory' && activeTab !== 'eod'

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-slate-800 flex items-center gap-2.5">
          <BarChart2 size={22} style={{ color: TEAL }} />
          Reports
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Business insights and analytics</p>
      </div>

      {/* Tab nav */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex flex-wrap gap-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              style={active ? { background: `linear-gradient(135deg, ${TEAL} 0%, ${INDIGO} 100%)` } : {}}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Date range picker (hidden for inventory + eod) */}
      {showDateRange && (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5">
          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'sales'        && <SalesTab        range={range} />}
      {activeTab === 'appointments' && <AppointmentsTab range={range} />}
      {activeTab === 'staff'        && <StaffTab        range={range} />}
      {activeTab === 'services'     && <ServicesTab     range={range} />}
      {activeTab === 'clients'      && <ClientsTab      range={range} />}
      {activeTab === 'inventory'    && <InventoryTab />}
      {activeTab === 'loyalty'      && <LoyaltyTab      range={range} />}
      {activeTab === 'eod'          && <EndOfDayTab />}
    </div>
  )
}
