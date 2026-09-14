import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList, Plus, Trash2, ChevronLeft,
  CheckCircle2, AlertTriangle, Search, X,
} from 'lucide-react'
import api from '@/lib/api'

// ── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

const STATUS = {
  draft:       { label: 'Draft',       cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700'   },
  completed:   { label: 'Completed',   cls: 'bg-[#CCFBF1] text-[#0D9488]' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

// ── Main page ────────────────────────────────────────────────────────────────

export default function Stocktakes() {
  const [openId,  setOpenId]  = useState(null)
  const [newModal, setNewModal] = useState(false)

  if (openId) {
    return <CountView stocktakeId={openId} onBack={() => setOpenId(null)} />
  }

  return <ListView onOpen={setOpenId} onNew={() => setNewModal(true)} newModal={newModal} closeNew={() => setNewModal(false)} />
}

// ── List view ────────────────────────────────────────────────────────────────

function ListView({ onOpen, onNew, newModal, closeNew }) {
  const qc = useQueryClient()

  const { data: stocktakes = [], isLoading } = useQuery({
    queryKey: ['stocktakes'],
    queryFn:  () => api.get('/stocktakes').then(r => r.data),
  })

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete stocktake "${name}"?`)) return
    await api.delete(`/stocktakes/${id}`)
    qc.invalidateQueries({ queryKey: ['stocktakes'] })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-800">Stocktakes</h1>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {stocktakes.length}
            </span>
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">Count your stock and identify variances.</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-[13px] font-semibold transition-colors"
          style={{ background: '#0D9488' }}
        >
          <Plus size={15} /> New Stocktake
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stocktakes.length === 0 ? (
          <div className="p-14 text-center">
            <ClipboardList size={38} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-[14px]">No stocktakes yet</p>
            <p className="text-slate-400 text-[13px] mt-1">Run a stock count to track variances.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Date', 'Status', 'Items counted', 'Variances found', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stocktakes.map(st => (
                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
                        <ClipboardList size={13} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-800">{st.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500">{fmtDate(st.created_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={st.status} /></td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-700 font-medium">{st.item_count ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {st.variance_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-amber-600">
                        <AlertTriangle size={12} /> {st.variance_count}
                      </span>
                    ) : (
                      <span className="text-[13px] text-slate-400">{st.variance_count ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpen(st.id)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#0D9488] bg-[#F0FDFA] hover:bg-[#CCFBF1] transition-colors"
                      >
                        Open
                      </button>
                      {st.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(st.id, st.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {newModal && <NewStocktakeModal onClose={closeNew} onCreated={closeNew} />}
    </div>
  )
}

// ── New stocktake modal ──────────────────────────────────────────────────────

function NewStocktakeModal({ onClose, onCreated }) {
  const qc = useQueryClient()
  const [form, setForm]   = useState({ name: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/stocktakes', form)
      qc.invalidateQueries({ queryKey: ['stocktakes'] })
      onCreated()
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">New Stocktake</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12.5px]">{error}</div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Monthly Count – Sep 2026" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} className={inp} placeholder="Optional notes…" />
          </div>
          <p className="text-[12px] text-slate-400">
            All current inventory items will be automatically added to this stocktake.
          </p>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold disabled:opacity-60 transition-colors"
              style={{ background: '#0D9488' }}>
              {saving ? 'Creating…' : 'Create stocktake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Count view ───────────────────────────────────────────────────────────────

function CountView({ stocktakeId, onBack }) {
  const qc = useQueryClient()

  const { data: st, isLoading } = useQuery({
    queryKey: ['stocktakes', stocktakeId],
    queryFn:  () => api.get(`/stocktakes/${stocktakeId}`).then(r => r.data),
  })

  // Local counted_qty state: { [item_id]: string }
  const [counts, setCounts] = useState({})
  const [saving,     setSaving]     = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saveError,  setSaveError]  = useState('')

  // Initialise counts from server data when loaded
  const items = st?.items ?? []
  const isReadOnly = st?.status === 'completed'

  // Effective counted value: local override first, then server value
  function getCounted(item) {
    if (counts[item.id] !== undefined) return counts[item.id]
    return item.counted_qty !== null && item.counted_qty !== undefined
      ? String(item.counted_qty)
      : ''
  }

  function variance(item) {
    const c = parseFloat(getCounted(item))
    const e = parseFloat(item.expected_qty ?? 0)
    if (isNaN(c)) return null
    return c - e
  }

  function varianceColor(v) {
    if (v === null) return 'text-slate-400'
    if (v === 0)   return 'text-[#0D9488] font-semibold'
    if (v > 0)     return 'text-[#0D9488] font-semibold'
    if (v >= -5)   return 'text-amber-500 font-semibold'
    return 'text-red-500 font-semibold'
  }

  // Summary stats
  const summary = useMemo(() => {
    let itemsWithVariance = 0
    let totalVariance = 0
    for (const item of items) {
      const v = variance(item)
      if (v !== null && v !== 0) { itemsWithVariance++; totalVariance += v }
    }
    return { total: items.length, itemsWithVariance, totalVariance }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, counts])

  const allCounted = items.length > 0 && items.every(item => getCounted(item) !== '')

  async function handleSave() {
    setSaving(true); setSaveError('')
    try {
      const payload = items.map(item => ({
        id: item.id,
        counted_qty: parseFloat(getCounted(item)) || 0,
      }))
      await api.put(`/stocktakes/${stocktakeId}/items`, { items: payload })
      qc.invalidateQueries({ queryKey: ['stocktakes', stocktakeId] })
      qc.invalidateQueries({ queryKey: ['stocktakes'] })
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!allCounted) return
    if (!window.confirm('Mark this stocktake as completed? This cannot be undone.')) return
    setCompleting(true)
    try {
      await api.post(`/stocktakes/${stocktakeId}/complete`)
      qc.invalidateQueries({ queryKey: ['stocktakes', stocktakeId] })
      qc.invalidateQueries({ queryKey: ['stocktakes'] })
    } finally {
      setCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!st) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Stocktake not found.</p>
        <button onClick={onBack} className="mt-4 text-[#0D9488] text-[13px] font-semibold hover:underline">← Back</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 font-medium mt-0.5 shrink-0 transition-colors"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-slate-800">{st.name}</h1>
              <StatusBadge status={st.status} />
            </div>
            <p className="text-[13px] text-slate-400 mt-0.5">
              Started {fmtDate(st.created_at)}
              {st.completed_at ? ` · Completed ${fmtDate(st.completed_at)}` : ''}
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2 shrink-0">
            {saveError && <p className="text-red-500 text-[12px]">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Counts'}
            </button>
            <button
              onClick={handleComplete}
              disabled={!allCounted || completing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40 transition-colors"
              style={{ background: '#0D9488' }}
              title={!allCounted ? 'Count all items before completing' : ''}
            >
              <CheckCircle2 size={14} />
              {completing ? 'Completing…' : 'Complete Stocktake'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No items in this stocktake.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Product', 'SKU', 'Expected qty', isReadOnly ? 'Counted qty' : 'Counted qty', 'Variance'].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => {
                const v = variance(item)
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-semibold text-slate-800">{item.product_name}</td>
                    <td className="px-5 py-3 text-[12px] text-slate-400 font-mono">{item.sku || '—'}</td>
                    <td className="px-5 py-3 text-[13px] text-slate-600">{item.expected_qty ?? '—'}</td>
                    <td className="px-5 py-3">
                      {isReadOnly ? (
                        <span className="text-[13px] text-slate-700 font-medium">
                          {item.counted_qty !== null && item.counted_qty !== undefined ? item.counted_qty : '—'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={getCounted(item)}
                          onChange={e => setCounts(c => ({ ...c, [item.id]: e.target.value }))}
                          className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white text-center"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[13px] ${varianceColor(v)}`}>
                        {v === null ? '—' : v > 0 ? `+${v}` : String(v)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Summary row */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-5 py-3 text-[12px] font-bold text-slate-600 uppercase tracking-wide">
                  Summary
                </td>
                <td className="px-5 py-3 text-[13px] font-bold text-slate-700">{summary.total} items</td>
                <td className="px-5 py-3 text-[13px] font-semibold text-slate-500">
                  {summary.itemsWithVariance > 0
                    ? <span className="text-amber-500">{summary.itemsWithVariance} with variance</span>
                    : <span className="text-[#0D9488]">All matched</span>
                  }
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[13px] font-bold ${
                    summary.totalVariance === 0 ? 'text-[#0D9488]' :
                    summary.totalVariance > 0   ? 'text-[#0D9488]' :
                    'text-amber-500'
                  }`}>
                    {summary.totalVariance > 0 ? `+${summary.totalVariance}` : String(summary.totalVariance)} units
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
