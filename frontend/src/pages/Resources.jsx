import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Armchair, DoorOpen, Bed, Layers, Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '@/lib/api'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

const ICONS = [
  { key: 'armchair', label: 'Chair', Icon: Armchair },
  { key: 'room',     label: 'Room',  Icon: DoorOpen },
  { key: 'bed',      label: 'Bed',   Icon: Bed },
]
const iconFor = key => (ICONS.find(i => i.key === key) || ICONS[0]).Icon

const BLANK = { name: '', icon: 'armchair' }

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

export default function Resources() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | { mode: 'create'|'edit', item }

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn:  () => api.get('/resources').then(r => r.data),
  })

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await api.delete(`/resources/${id}`)
    qc.invalidateQueries({ queryKey: ['resources'] })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-800">Rooms & Resources</h1>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-[12px] font-bold text-slate-600">
              {resources.length}
            </span>
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Chairs, rooms, or stations that can be booked alongside a team member — the schedule will flag double-bookings.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create', item: { ...BLANK } })}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-[13px] font-semibold transition-colors"
          style={{ background: '#0D9488' }}
        >
          <Plus size={15} /> Add Resource
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="p-14 text-center">
            <Layers size={38} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold text-[14px]">No resources yet</p>
            <p className="text-slate-400 text-[13px] mt-1">Add a chair, room, or station to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {resources.map(res => {
              const Icon = iconFor(res.icon)
              return (
                <div key={res.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0D9488] shrink-0">
                    <Icon size={17} />
                  </div>
                  <span className="text-[13.5px] font-semibold text-slate-800 flex-1 truncate">{res.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ mode: 'edit', item: { ...BLANK, ...res } })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0D9488] hover:bg-[#F0FDFA] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(res.id, res.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <ResourceModal
          mode={modal.mode}
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function ResourceModal({ mode, item, onClose }) {
  const qc = useQueryClient()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({ ...item })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) await api.put(`/resources/${item.id}`, form)
      else        await api.post('/resources', form)
      qc.invalidateQueries({ queryKey: ['resources'] })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-800">
            {isEdit ? 'Edit Resource' : 'Add Resource'}
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

          <Field label="Name" required>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inp}
              placeholder="e.g. Chair 1, Color Room, Station A"
              autoFocus
            />
          </Field>

          <Field label="Type">
            <div className="grid grid-cols-3 gap-2">
              {ICONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, icon: key }))}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[12px] font-semibold transition-colors ${
                    form.icon === key
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
              style={{ background: '#0D9488' }}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
