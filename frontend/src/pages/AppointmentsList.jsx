import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, ArrowUpDown, ArrowDown, ArrowUp, Calendar, Download } from 'lucide-react'
import api from '@/lib/api'

const STATUS_COLORS = {
  scheduled:   'bg-slate-100 text-slate-600',
  confirmed:   'bg-blue-50 text-blue-700',
  checked_in:  'bg-teal-50 text-teal-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  completed:   'bg-green-50 text-green-700',
  cancelled:   'bg-red-50 text-red-600',
  no_show:     'bg-amber-50 text-amber-700',
}

const STATUS_LABELS = {
  scheduled: 'Scheduled', confirmed: 'Confirmed', checked_in: 'Checked In',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
}

const PERIODS = [
  { label: 'Today',          days: 0  },
  { label: 'This week',      days: 7  },
  { label: 'This month',     days: 30 },
  { label: 'Last 3 months',  days: 90 },
  { label: 'All time',       days: -1 },
]

function toISODate(d) { return d.toISOString().split('T')[0] }

export default function AppointmentsList() {
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState('all')
  const [period,      setPeriod]      = useState(1) // index into PERIODS
  const [sort,        setSort]        = useState({ col: 'start_at', dir: 'desc' })
  const [showFilters, setShowFilters] = useState(false)

  const { from, to } = useMemo(() => {
    const p = PERIODS[period]
    if (p.days === -1) return { from: '', to: '' }
    const now = new Date()
    const f = new Date(now)
    f.setDate(f.getDate() - p.days)
    return { from: toISODate(f), to: toISODate(now) }
  }, [period])

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['appts-list', from, to, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return api.get(`/appointments/list?${params}`).then(r => r.data)
    },
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = q
      ? rows.filter(r =>
          r.client_name.toLowerCase().includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          (r.service_names || '').toLowerCase().includes(q)
        )
      : rows
    return [...list].sort((a, b) => {
      let av = a[sort.col] ?? '', bv = b[sort.col] ?? ''
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ?  1 : -1
      return 0
    })
  }, [rows, search, sort])

  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  function handleExport() {
    const headers = ['Ref','Client','Date','Services','Staff','Status','Total']
    const rows = filtered.map(r => [
      r.ref,
      r.client_name,
      r.start_at ? new Date(r.start_at).toLocaleDateString() : '',
      r.service_names || '',
      r.staff_name || '',
      STATUS_LABELS[r.status] || r.status,
      (r.total_price || 0).toFixed(2),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalRevenue = filtered.reduce((sum, r) => sum + (r.total_price || 0), 0)

  return (
    <div className="bg-white min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-900">Appointments</h1>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {filtered.length}
            </span>
          </div>
          <p className="text-[13.5px] text-slate-500 mt-0.5">View, filter and export appointments booked by your clients.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by client or ref…"
            className="w-full pl-8 pr-4 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] bg-white placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* Period picker */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriod(i)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                period === i ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter !== 'all' ? 'border-[#0D9488] bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal size={13} /> Filters {statusFilter !== 'all' && '· 1'}
        </button>

        <div className="flex-1" />

        {/* Summary */}
        {filtered.length > 0 && (
          <span className="text-[13px] text-slate-500 font-medium">
            {filtered.length} appointments · US$ {totalRevenue.toFixed(2)}
          </span>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Status</span>
          {['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[120px_1fr_1fr_140px_150px_80px_120px_90px_90px] items-center px-5 py-3.5 bg-slate-50 border-b border-slate-200 gap-3">
          <Th label="Ref #"           col="ref"          sort={sort} onSort={toggleSort} />
          <Th label="Client"          col="client_name"  sort={sort} onSort={toggleSort} />
          <Th label="Service"         col="service_names" sort={sort} onSort={toggleSort} />
          <Th label="Scheduled"       col="start_at"     sort={sort} onSort={toggleSort} />
          <Th label="Created"         col="created_at"   sort={sort} onSort={toggleSort} />
          <Th label="Dur."            col="duration_min" sort={sort} onSort={toggleSort} right />
          <Th label="Team member"     col="staff_name"   sort={sort} onSort={toggleSort} />
          <Th label="Price"           col="total_price"  sort={sort} onSort={toggleSort} right />
          <div className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide text-right">Status</div>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar size={22} className="text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-700 mb-1">No appointments found</p>
            <p className="text-[13px] text-slate-400">Try adjusting the period or filters</p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[120px_1fr_1fr_140px_150px_80px_120px_90px_90px] items-center px-5 py-3.5 gap-3 hover:bg-slate-50 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="font-mono text-[12px] font-bold text-[#0D9488]">#{r.ref}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{r.client_name}</p>
                {r.client_phone && <p className="text-[11px] text-slate-400 truncate">{r.client_phone}</p>}
              </div>
              <p className="text-[13px] text-slate-700 truncate">{r.service_names || <span className="text-slate-300">—</span>}</p>
              <p className="text-[12.5px] text-slate-700">{r.start_at}</p>
              <p className="text-[12px] text-slate-500">{r.created_at}</p>
              <p className="text-[13px] text-slate-700 text-right">
                {r.duration_min >= 60
                  ? `${Math.floor(r.duration_min / 60)}h${r.duration_min % 60 ? ` ${r.duration_min % 60}m` : ''}`
                  : `${r.duration_min}m`}
              </p>
              <p className="text-[13px] text-slate-700 truncate">{r.staff_name}</p>
              <p className="text-[13px] font-semibold text-slate-900 text-right">
                {r.total_price > 0 ? `US$ ${r.total_price.toFixed(2)}` : <span className="text-slate-300">—</span>}
              </p>
              <div className="flex justify-end">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
            </div>
          ))
        )}

        {filtered.length > 0 && (
          <div className="flex justify-center items-center py-4 border-t border-slate-100">
            <span className="text-[13px] text-slate-400">{filtered.length} records</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Th({ label, col, sort, onSort, right }) {
  const active = sort.col === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors select-none ${right ? 'justify-end w-full' : ''}`}
    >
      {label}
      {active
        ? sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        : <ArrowUpDown size={10} className="text-slate-300" />}
    </button>
  )
}
