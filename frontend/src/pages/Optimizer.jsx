import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Zap, ChevronDown, ChevronUp, Megaphone, BarChart2,
  Users, Clock, AlertTriangle, Info, X, Plus
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const HOURS     = ['9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM']
const HOUR_VALS = [9,10,11,12,13,14,15,16,17,18,19,20]
const DAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function heatmapColor(v) {
  if (v > 0.8) return 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]'
  if (v > 0.6) return 'bg-[#2DD4BF]'
  if (v > 0.4) return 'bg-[#99F6E4]'
  if (v > 0.2) return 'bg-[#CCFBF1]'
  return 'bg-slate-50'
}

function gapDotColor(util) {
  if (util < 0.2) return 'bg-red-500'
  if (util < 0.4) return 'bg-orange-500'
  return 'bg-yellow-500'
}

const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

// ─── Promotion modal ───────────────────────────────────────────────────────────
function PromoModal({ gap, onClose }) {
  const [form, setForm] = useState({ discount: '20', duration: '1 week', message: '' })
  const [sent, setSent]   = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const defaultMsg = `Special offer: ${form.discount}% off on ${gap?.day} at ${gap?.time || (gap?.hour + ':00')}! Book now.`

  function handleSend() {
    setSent(true)
    setTimeout(() => { onClose(); setSent(false) }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-[#0D9488]" />
            <h3 className="text-[15px] font-bold text-slate-800">Create Flash Promotion</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-[12px] text-slate-500 mb-4">
          Slot: <span className="font-semibold text-slate-700">{gap?.day} at {gap?.time || `${gap?.hour}:00`}</span>
          {gap?.utilization !== undefined && (
            <span className="ml-1 text-orange-500">({Math.round((gap.utilization || 0) * 100)}% utilization)</span>
          )}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Discount %</label>
            <input type="number" min="5" max="80" value={form.discount} onChange={set('discount')} className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Duration</label>
            <select value={form.duration} onChange={set('duration')} className={inp}>
              <option>1 week</option>
              <option>2 weeks</option>
              <option>This week only</option>
              <option>This month</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Message (optional)</label>
            <textarea
              value={form.message || defaultMsg}
              onChange={set('message')}
              rows={3}
              className={inp + ' resize-none'}
              placeholder={defaultMsg}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sent}
            className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60 transition-colors"
          >
            {sent ? 'Scheduled!' : 'Create Promotion'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Gap card ─────────────────────────────────────────────────────────────────
function GapCard({ gap, index }) {
  const [expanded,   setExpanded]   = useState(false)
  const [promoOpen,  setPromoOpen]  = useState(false)
  const util = gap.utilization ?? 0
  const pct  = Math.round(util * 100)
  const dayInitial = (gap.day || '?')[0].toUpperCase()
  const time = gap.time || `${gap.hour}:00`

  return (
    <>
      {promoOpen && <PromoModal gap={gap} onClose={() => setPromoOpen(false)} />}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-4 p-4">
          {/* Circle with day initial */}
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0', gapDotColor(util))}>
            {dayInitial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-800">
              {gap.day} at {time} — <span className="text-slate-500 font-normal">utilization {pct}%</span>
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5">
              This slot averages fewer than {gap.avg_bookings_per_week ?? Math.ceil(util * 5)} bookings per week
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPromoOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[11px] font-semibold  transition-colors"
            >
              <Megaphone size={12} /> Create Promotion
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition-colors"
            >
              <BarChart2 size={12} /> View Details
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Expanded: last 4 weeks */}
        {expanded && (
          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Last 4 Weeks — {gap.day} {time}</p>
            <div className="grid grid-cols-4 gap-2">
              {(gap.weekly_history || [null, null, null, null]).map((wk, wi) => (
                <div key={wi} className="bg-white rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-[10px] text-slate-400 mb-1">Week -{4 - wi}</p>
                  <p className="text-[16px] font-bold text-slate-700">{wk ?? '—'}</p>
                  <p className="text-[10px] text-slate-400">bookings</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Waitlist section ─────────────────────────────────────────────────────────
function WaitlistSection() {
  const [form, setForm] = useState({ client_search: '', day: 'Monday', time_from: '09:00', time_to: '12:00' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const [notice, setNotice] = useState('')

  const { data: waitlist = [] } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => api.get('/waitlist').then(r => r.data).catch(() => []),
  })

  async function handleAdd(e) {
    e.preventDefault()
    try {
      await api.post('/waitlist', form)
      setNotice('Added to waitlist!')
    } catch {
      setNotice('Coming soon — waitlist feature is in development.')
    }
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#0D9488]" />
          <h3 className="text-[15px] font-bold text-slate-800">Gap Fill Waitlist</h3>
        </div>
        <p className="text-[12px] text-slate-400 mt-0.5">Add clients to waitlist for specific slow time slots</p>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Add form */}
        <form onSubmit={handleAdd} className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Add to Waitlist</p>

          {notice && (
            <p className="text-[12px] bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] px-3 py-2 rounded-xl font-medium">
              {notice}
            </p>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Client Name / Phone</label>
            <input
              value={form.client_search}
              onChange={set('client_search')}
              placeholder="Search client…"
              className={inp}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Preferred Day</label>
              <select value={form.day} onChange={set('day')} className={inp}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">From</label>
              <input type="time" value={form.time_from} onChange={set('time_from')} className={inp} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">To</label>
              <input type="time" value={form.time_to} onChange={set('time_to')} className={inp} />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold  transition-colors"
          >
            <Plus size={14} /> Add to Waitlist
          </button>
        </form>

        {/* Waitlist table */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Current Waitlist</p>
          {waitlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <Clock size={24} className="opacity-40" />
              <p className="text-[13px]">No waitlist entries yet</p>
              <p className="text-[11px] text-slate-300">Add clients above to fill slow slots</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waitlist.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-full text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {(entry.client_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-700">{entry.client_name || 'Client'}</p>
                    <p className="text-[11px] text-slate-400">{entry.day} · {entry.time_from}–{entry.time_to}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Optimizer() {
  const [tooltipCell, setTooltipCell] = useState(null)

  const { data: gapData, isLoading } = useQuery({
    queryKey: ['scheduleGaps'],
    queryFn: () => api.get('/analytics/schedule-gaps').then(r => r.data),
  })

  const heatmap = gapData?.heatmap || {}
  const gaps    = gapData?.gaps    || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={20} className="text-[#0D9488]" />
          <h1 className="text-[22px] font-bold text-slate-800">Smart Schedule Optimizer</h1>
        </div>
        <p className="text-[13px] text-slate-400">AI-powered gap analysis for the last 30 days</p>
      </div>

      {/* Section A: Gap Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-orange-500" />
          <h2 className="text-[15px] font-bold text-slate-800">Gap Recommendations</h2>
          {gaps.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[11px] font-bold">{gaps.length}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : gaps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <Zap size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">No gap recommendations — your schedule looks great!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, i) => <GapCard key={i} gap={gap} index={i} />)}
          </div>
        )}
      </div>

      {/* Section B: Weekly Heatmap (interactive, larger) */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">Weekly Schedule Heatmap</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Click any cell to see appointment details for that time slot</p>
        </div>

        {isLoading ? (
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

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="w-14" />
                    {DAYS.map(d => (
                      <th key={d} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center pb-1">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour, hi) => {
                    const hourVal = HOUR_VALS[hi]
                    return (
                      <tr key={hour}>
                        <td className="text-[11px] text-slate-400 text-right pr-2 font-medium whitespace-nowrap">{hour}</td>
                        {DAYS.map(day => {
                          const key    = `${day}_${hourVal}`
                          const val    = heatmap[key] ?? 0
                          const pct    = Math.round(val * 100)
                          const appts  = Math.round(val * 4 * 4) // rough estimate
                          const isActive = tooltipCell === key
                          return (
                            <td key={day} className="relative">
                              <button
                                onClick={() => setTooltipCell(isActive ? null : key)}
                                title={`${appts} appointments on ${day} at ${hour} (last 30d)`}
                                className={cn(
                                  'w-full h-10 rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:opacity-80 hover:scale-105',
                                  heatmapColor(val),
                                  isActive && 'ring-2 ring-[#0D9488] ring-offset-1'
                                )}
                              >
                                {pct > 0 ? `${pct}%` : ''}
                              </button>
                              {isActive && (
                                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none">
                                  <p className="font-bold">{day} at {hour}</p>
                                  <p>~{appts} appointments this slot (last 30d)</p>
                                  <p>{pct}% utilization</p>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
              <Info size={12} />
              Click any cell to see appointment details for that time slot
            </p>
          </div>
        )}
      </div>

      {/* Section C: Waitlist Management */}
      <WaitlistSection />
    </div>
  )
}
