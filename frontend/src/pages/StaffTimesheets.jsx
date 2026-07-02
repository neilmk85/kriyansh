import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Download } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

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

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Timesheets</h1>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
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
            <tr>
              <td colSpan={5} className="py-20">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Clock size={24} className="text-slate-400" />
                  </div>
                  <p className="text-[15px] font-bold text-slate-700">No timesheet data</p>
                  <p className="text-[13px] text-slate-400 max-w-xs">
                    Timesheets will appear here once team members clock in and out.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
