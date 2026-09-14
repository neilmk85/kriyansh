import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import api from '@/lib/api'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

const BLANK = {
  name: '', contact_name: '', phone: '', email: '',
  payment_terms: 'Net 30', address: '', notes: '',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function Suppliers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(null) // null | { mode: 'create'|'edit', item }

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => api.get('/suppliers').then(r => r.data),
  })

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || '').toLowerCase().includes(q)
    )
  }, [suppliers, search])

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete supplier "${name}"? This cannot be undone.`)) return
    await api.delete(`/suppliers/${id}`)
    qc.invalidateQueries({ queryKey: ['suppliers'] })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-800">Suppliers</h1>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {suppliers.length}
            </span>
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">Manage your product suppliers and contacts.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create', item: { ...BLANK } })}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-[13px] font-semibold transition-colors"
          style={{ background: '#0D9488' }}
        >
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or contact…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <Truck size={38} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-[14px]">No suppliers yet</p>
            <p className="text-slate-400 text-[13px] mt-1">Add your first supplier to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name', 'Contact person', 'Phone', 'Email', 'Payment terms', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
                        <Truck size={13} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-600">{s.contact_name || '—'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-600 font-mono">{s.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-600">{s.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    {s.payment_terms ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        {s.payment_terms}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', item: { ...BLANK, ...s } })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D9488] hover:bg-[#F0FDFA] transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <SupplierModal
          mode={modal.mode}
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function SupplierModal({ mode, item, onClose }) {
  const qc = useQueryClient()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({ ...item })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) await api.put(`/suppliers/${item.id}`, form)
      else        await api.post('/suppliers', form)
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">
            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12.5px]">
              {error}
            </div>
          )}

          <Field label="Supplier name" required>
            <input value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Beauty Wholesale Co." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact person">
              <input value={form.contact_name} onChange={set('contact_name')} className={inp} placeholder="Jane Smith" />
            </Field>
            <Field label="Payment terms">
              <input value={form.payment_terms} onChange={set('payment_terms')} className={inp} placeholder="Net 30" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input value={form.phone} onChange={set('phone')} className={inp} placeholder="+1 555 000 0000" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={set('email')} type="email" className={inp} placeholder="contact@example.com" />
            </Field>
          </div>

          <Field label="Address">
            <textarea
              value={form.address} onChange={set('address')}
              rows={2} className={inp} placeholder="Street, City, State, ZIP"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes} onChange={set('notes')}
              rows={2} className={inp} placeholder="Any extra notes…"
            />
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
              style={{ background: '#0D9488' }}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
