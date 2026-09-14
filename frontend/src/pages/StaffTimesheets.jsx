import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, Download } from 'lucide-react'
import api from '@/lib/api'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, mins / 60)
}

function exportCSV(rows) {
  const header = ['Team Member', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Status']
  const lines = [header, ...rows.map(r => [
    r.name,
    r.regular.toFixed(2),
    r.overtime.toFixed(2),
    r.total.toFixed(2),
    r.status,
  ])]
  const csv = lines.map(l => l.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'timesheets.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function StaffTimesheets() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', monthParam],
    queryFn: () => api.get(`/shifts?month=${monthParam}`).then(r => r.data),
  })

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(r => r.data),
  })

  const staffMap = useMemo(() => {
    const m = {}
    staffList.forEach(s => { m[s.id] = s.name || s.full_name || `Staff #${s.id}` })
    return m
  }, [staffList])

  const today = now.toISOString().slice(0, 10)

  // Group shifts by staff, then by date, compute hours per day
  const rows = useMemo(() => {
    const byStaff = {}
    shifts.forEach(shift => {
      const id = shift.staff_id
      if (!byStaff[id]) byStaff[id] = {}
      const date = shift.shift_date
      if (!byStaff[id][date]) byStaff[id][date] = 0
      byStaff[id][date] += parseHours(shift.start_time, shift.end_time)
    })

    return Object.entries(byStaff).map(([id, days]) => {
      let regular = 0, overtime = 0
      const dates = Object.keys(days)
      dates.forEach(date => {
        const h = days[date]
        regular  += Math.min(h, 8)
        overtime += Math.max(0, h - 8)
      })
      const allPast = dates.every(d => d < today)
      return {
        id: Number(id),
        name: staffMap[Number(id)] || `Staff #${id}`,
        regular,
        overtime,
        total: regular + overtime,
        status: allPast ? 'Approved' : 'Pending',
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [shifts, staffMap, today])

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Timesheets</h1>
        <button
          onClick={() => rows.length && exportCSV(rows)}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Download size={14} className="text-slate-400" /> Export
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={prev}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronLeft size={15} className="text-slate-600" />
        </button>
        <span className="text-[14px] font-semibold text-slate-700 min-w-[160px] text-center">
          {MONTHS[month]} {year}
        </span>
        <button onClick={next}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronRight size={15} className="text-slate-600" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Team member</th>
              <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Regular hours</th>
              <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Overtime</th>
              <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Total hours</th>
              <th className="text-left px-5 py-3.5 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {shiftsLoading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-[13px] text-slate-400">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Clock size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[15px] font-bold text-slate-700">No timesheet data</p>
                    <p className="text-[13px] text-slate-400 max-w-xs">
                      Timesheets will appear here once shifts are scheduled for this month.
                    </p>
                  </div>
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.id} className={i < rows.length - 1 ? 'border-b border-slate-100' : ''}>
                <td className="px-5 py-3.5 text-[13px] font-medium text-slate-800">{row.name}</td>
                <td className="px-5 py-3.5 text-[13px] text-slate-600">{row.regular.toFixed(1)}h</td>
                <td className="px-5 py-3.5 text-[13px] text-slate-600">
                  {row.overtime > 0
                    ? <span className="text-amber-600 font-medium">{row.overtime.toFixed(1)}h</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-800">{row.total.toFixed(1)}h</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    row.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
