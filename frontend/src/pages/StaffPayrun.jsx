import { useState, useEffect, useCallback } from 'react'
import { Plus, DollarSign, ChevronDown, ChevronUp, X, Receipt, Trash2 } from 'lucide-react'

const API = '/api'

const STATUS_COLORS = {
  draft:     'bg-slate-100 text-slate-600',
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const STATUS_LABEL = {
  draft: 'Draft',
  pending: 'Pending',
  completed: 'Completed',
}

function fmt(n) {
  return `$${(Number(n) || 0).toFixed(2)}`
}

function fmtHours(h) {
  const v = Number(h) || 0
  return `${v.toFixed(1)}h`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtCreated(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── New Pay Run Modal ─────────────────────────────────────────────────────────
function NewPayrunModal({ onClose, onCreated }) {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo]   = useState(today)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/payruns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
        body: JSON.stringify({ period_from: from, period_to: to, notes }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create pay run')
      }
      const data = await res.json()
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-900">New pay run</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Fortnightly pay run — 1–14 Sep"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create pay run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pay Run Row (expandable) ──────────────────────────────────────────────────
function PayrunRow({ payrun, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [approving, setApproving] = useState(false)

  async function loadItems() {
    if (items) return
    setLoadingItems(true)
    try {
      const res = await fetch(`${API}/payruns/${payrun.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } finally {
      setLoadingItems(false)
    }
  }

  function toggle() {
    if (!open) loadItems()
    setOpen(v => !v)
  }

  async function approve() {
    setApproving(true)
    try {
      const res = await fetch(`${API}/payruns/${payrun.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (res.ok) onStatusChange(payrun.id, 'completed')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={toggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800">
            {fmtDate(payrun.period_from)} — {fmtDate(payrun.period_to)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Created {fmtCreated(payrun.created_at)} · {payrun.item_count} staff member{payrun.item_count !== 1 ? 's' : ''}
            {payrun.notes ? ` · ${payrun.notes}` : ''}
          </p>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_COLORS[payrun.status]}`}>
          {STATUS_LABEL[payrun.status]}
        </span>

        <p className="text-[15px] font-black text-slate-900 w-24 text-right">
          {fmt(payrun.total_amount)}
        </p>

        {payrun.status === 'draft' && (
          <button
            onClick={e => { e.stopPropagation(); approve() }}
            disabled={approving}
            className="ml-2 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {approving ? '…' : 'Approve'}
          </button>
        )}

        <span className="text-slate-300 ml-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Expanded: staff breakdown */}
      {open && (
        <div className="bg-slate-50 border-t border-slate-100 px-5 pb-4">
          {loadingItems ? (
            <p className="text-[13px] text-slate-400 py-4 text-center">Loading breakdown…</p>
          ) : items && items.length > 0 ? (
            <table className="w-full mt-3 text-[12px]">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="pb-2 font-semibold">Staff member</th>
                  <th className="pb-2 font-semibold text-right">Hours</th>
                  <th className="pb-2 font-semibold text-right">Rate</th>
                  <th className="pb-2 font-semibold text-right">Base pay</th>
                  <th className="pb-2 font-semibold text-right">Commission</th>
                  <th className="pb-2 font-semibold text-right">Tips</th>
                  <th className="pb-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-slate-700">{item.staff_name}</td>
                    <td className="py-2 text-right text-slate-500">{fmtHours(item.hours_worked)}</td>
                    <td className="py-2 text-right text-slate-500">{fmt(item.hourly_rate)}/h</td>
                    <td className="py-2 text-right text-slate-500">{fmt(item.base_pay)}</td>
                    <td className="py-2 text-right text-slate-500">{fmt(item.commission)}</td>
                    <td className="py-2 text-right text-slate-500">{fmt(item.tips)}</td>
                    <td className="py-2 text-right font-bold text-slate-900">{fmt(item.total_pay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={6} className="pt-2 font-bold text-slate-700 text-right pr-4">Total</td>
                  <td className="pt-2 font-black text-slate-900 text-right">{fmt(payrun.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-[13px] text-slate-400 py-4 text-center">No staff items found.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Deduction Modal ────────────────────────────────────────────────────────
function AddDeductionModal({ staff, onClose, onCreated }) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    const amt = Number(amount)
    if (!staffId || !(amt > 0)) { setError('Select a team member and enter a positive amount'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/fee-deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
        body: JSON.stringify({ staff_id: Number(staffId), amount: amt, reason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to add deduction')
      }
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-900">Add fee deduction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1">Team member</label>
            <select
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1">Amount</label>
            <input
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. broken tool replacement"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Add deduction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fee Deductions Section ──────────────────────────────────────────────────────
function FeeDeductionsSection() {
  const [staff, setStaff] = useState([])
  const [deductions, setDeductions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('salonos_token')}` }
      const [staffRes, dedRes] = await Promise.all([
        fetch(`${API}/staff`, { headers }),
        fetch(`${API}/fee-deductions`, { headers }),
      ])
      if (staffRes.ok) setStaff(await staffRes.json())
      if (dedRes.ok) setDeductions(await dedRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    const res = await fetch(`${API}/fee-deductions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
    })
    if (res.ok) setDeductions(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-slate-800">Fee deductions</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all"
        >
          <Plus size={14} /> Add deduction
        </button>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deductions.length === 0 ? (
        <div className="py-14 flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Receipt size={20} className="text-slate-400" />
          </div>
          <p className="text-[13px] font-semibold text-slate-600">No fee deductions</p>
          <p className="text-[12px] text-slate-400 max-w-xs">Deductions reduce a team member's net pay in the Pay Summary report.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Team member</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {deductions.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-[13px] text-slate-500">{fmtCreated(d.created_at)}</td>
                <td className="px-5 py-3 text-[13px] font-semibold text-slate-800">{d.staff_name}</td>
                <td className="px-5 py-3 text-[13px] text-slate-500">{d.reason || '—'}</td>
                <td className="px-5 py-3 text-[13px] font-bold text-slate-900 text-right">{fmt(d.amount)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <AddDeductionModal
          staff={staff}
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StaffPayrun() {
  const [payruns, setPayruns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/payruns`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('salonos_token')}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPayruns(data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleCreated(newPayrun) {
    setPayruns(prev => [newPayrun, ...prev])
    load() // reload to get accurate item_count
  }

  function handleStatusChange(id, status) {
    setPayruns(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  // Derived stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const totalPaidMonth = payruns
    .filter(p => p.status === 'completed' && p.period_from >= monthStart)
    .reduce((s, p) => s + Number(p.total_amount), 0)
  const pendingPayruns = payruns.filter(p => p.status === 'draft' || p.status === 'pending')
  const pendingTotal = pendingPayruns.reduce((s, p) => s + Number(p.total_amount), 0)
  const staffCount = payruns.length > 0
    ? Math.max(...payruns.slice(0, 3).map(p => p.item_count))
    : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Pay runs</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-[13px] font-bold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all"
        >
          <Plus size={15} /> New pay run
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Total paid this month</p>
          <p className="text-[24px] font-black text-slate-900">{fmt(totalPaidMonth)}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {payruns.filter(p => p.status === 'completed' && p.period_from >= monthStart).length} pay runs
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Pending approval</p>
          <p className="text-[24px] font-black text-slate-900">{fmt(pendingTotal)}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">{pendingPayruns.length} pay run{pendingPayruns.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Team members on payroll</p>
          <p className="text-[24px] font-black text-slate-900">{staffCount}</p>
          <p className="text-[12px] text-slate-400 mt-0.5">active members</p>
        </div>
      </div>

      <FeeDeductionsSection />

      {/* Pay runs list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-800">All pay runs</h2>
          <span className="text-[12px] text-slate-400">{payruns.length} total</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payruns.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <DollarSign size={24} className="text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-700">No pay runs yet</p>
            <p className="text-[13px] text-slate-400 max-w-xs">
              Create your first pay run to start managing staff payroll.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-1 flex items-center gap-2 px-4 py-2 rounded-full text-white text-[13px] font-semibold bg-gradient-to-r from-[#0D9488] to-[#6366F1] hover:opacity-90 transition-all"
            >
              <Plus size={14} /> Create pay run
            </button>
          </div>
        ) : (
          payruns.map(p => (
            <PayrunRow key={p.id} payrun={p} onStatusChange={handleStatusChange} />
          ))
        )}
      </div>

      {showModal && (
        <NewPayrunModal onClose={() => setShowModal(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
