import { useState } from 'react'
import { Plus, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_COLORS = {
  draft:     'bg-slate-100 text-slate-600',
  pending:   'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

export default function StaffPayrun() {
  const [open, setOpen] = useState(null)

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Pay runs</h1>
        <button className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-[13px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all">
          <Plus size={15} /> New pay run
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total paid this month', value: '$0.00', sub: '0 pay runs' },
          { label: 'Pending approval',      value: '$0.00', sub: '0 pay runs' },
          { label: 'Team members on payroll', value: '0',  sub: 'active members' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
            <p className="text-[12px] text-slate-400 font-medium mb-1">{c.label}</p>
            <p className="text-[24px] font-black text-slate-900">{c.value}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Pay runs list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-800">All pay runs</h2>
        </div>

        {/* Empty state */}
        <div className="py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <DollarSign size={24} className="text-slate-400" />
          </div>
          <p className="text-[15px] font-bold text-slate-700">No pay runs yet</p>
          <p className="text-[13px] text-slate-400 max-w-xs">
            Create your first pay run to start managing staff payroll.
          </p>
          <button className="mt-1 flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all">
            <Plus size={14} /> Create pay run
          </button>
        </div>
      </div>
    </div>
  )
}
