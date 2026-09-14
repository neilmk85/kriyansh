import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Trash2, Edit2, Eye, X, Check,
  ChevronUp, ChevronDown, AlignLeft, Square, Calendar,
  PenLine, ClipboardList, ToggleLeft, ToggleRight, Link, Copy
} from 'lucide-react'
import api from '@/lib/api'

const FIELD_TYPES = [
  { key: 'text',      label: 'Text' },
  { key: 'longtext',  label: 'Long Text' },
  { key: 'checkbox',  label: 'Checkbox' },
  { key: 'date',      label: 'Date' },
  { key: 'signature', label: 'Signature' },
]

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Forms() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Forms')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [previewForm, setPreviewForm] = useState(null)
  const [responsesForm, setResponsesForm] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 2500)
  }

  const [builderName, setBuilderName] = useState('')
  const [builderFields, setBuilderFields] = useState([])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => api.get('/forms').then(r => r.data),
  })

  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ['form-responses', responsesForm?.id],
    queryFn: () => api.get(`/forms/${responsesForm.id}/responses`).then(r => r.data),
    enabled: !!responsesForm,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: d => api.post('/forms', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); showToast('Form created.') },
    onError: () => showToast('Failed to create form.', 'error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => api.put(`/forms/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); showToast('Form updated.') },
    onError: () => showToast('Failed to update form.', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/forms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['forms'] }); showToast('Form deleted.') },
    onError: () => showToast('Failed to delete form.', 'error'),
  })

  // ── Builder helpers ───────────────────────────────────────────────────────
  function openNewBuilder() {
    setShowBuilder(true); setEditingForm(null)
    setBuilderName(''); setBuilderFields([])
  }

  function openEditBuilder(f) {
    setShowBuilder(true); setEditingForm(f)
    setBuilderName(f.name)
    setBuilderFields(Array.isArray(f.fields) ? [...f.fields] : JSON.parse(f.fields || '[]'))
  }

  function closeBuilder() {
    setShowBuilder(false); setEditingForm(null)
    setBuilderName(''); setBuilderFields([])
  }

  function addField(type) {
    setBuilderFields(prev => [
      ...prev,
      { id: `f_${Date.now()}`, label: '', type, required: false }
    ])
  }

  function updateField(idx, key, val) {
    setBuilderFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f))
  }

  function removeField(idx) {
    setBuilderFields(prev => prev.filter((_, i) => i !== idx))
  }

  function moveField(idx, dir) {
    setBuilderFields(prev => {
      const next = [...prev]
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= next.length) return next
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  function saveForm() {
    if (!builderName.trim() || builderFields.length === 0) {
      showToast('Add a name and at least one field.', 'error')
      return
    }
    const payload = { name: builderName.trim(), fields: builderFields }
    if (editingForm) {
      updateMut.mutate({ id: editingForm.id, d: payload }, { onSuccess: closeBuilder })
    } else {
      createMut.mutate(payload, { onSuccess: closeBuilder })
    }
  }

  function copyLink(formId) {
    const url = `https://store.kriyanshbeautybar.com/forms/${formId}`
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!'))
  }

  // ── Responses count helper ────────────────────────────────────────────────
  function openResponses(form) {
    setResponsesForm(form)
    setTab('Responses')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Banner */}
      <div
        className="-mx-6 -mt-6 mb-7 rounded-b-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}
      >
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-[26px] font-black text-white tracking-tight">Intake Forms</h1>
                <p className="text-white/70 text-[13px] mt-0.5">Digital forms · Consent · Pre-visit questionnaires</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <span className="text-white text-[13px] font-semibold">{forms.length} forms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {['Forms', 'Responses'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-[14px] font-semibold transition-colors relative ${
              tab === t ? 'text-[#0D9488]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0D9488]" />
            )}
          </button>
        ))}
      </div>

      {/* Forms Tab */}
      {tab === 'Forms' && (
        <div>
          <div className="flex justify-end mb-5">
            <button
              onClick={openNewBuilder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[14px] font-semibold shadow-sm"
              style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}
            >
              <Plus size={16} />
              New Form
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 text-slate-400 text-[14px]">Loading…</div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={52} className="text-slate-300 mb-4" />
              <p className="text-[17px] font-bold text-slate-700 mb-1">No forms yet</p>
              <p className="text-slate-400 text-[14px] mb-6">Create digital intake forms, consent forms, and questionnaires.</p>
              <button
                onClick={openNewBuilder}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[14px] font-semibold"
                style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}
              >
                <Plus size={16} />
                Create Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forms.map(form => {
                const fields = Array.isArray(form.fields) ? form.fields : (JSON.parse(form.fields || '[]'))
                return (
                  <div key={form.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <p className="text-[16px] font-bold text-slate-800">{form.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full">
                        {fields.length} fields
                      </span>
                      <span className="text-[11px] text-slate-400">Created {fmt(form.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setPreviewForm({ ...form, fields })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                      >
                        <Eye size={13} />
                        Preview
                      </button>
                      <button
                        onClick={() => openEditBuilder({ ...form, fields })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => openResponses(form)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                      >
                        <ClipboardList size={13} />
                        Responses
                      </button>
                      <button
                        onClick={() => copyLink(form.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors"
                      >
                        <Copy size={13} />
                        Copy link
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(form.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[12px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors ml-auto"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Responses Tab */}
      {tab === 'Responses' && (
        <div>
          {/* Form selector */}
          <div className="flex items-center gap-3 mb-5">
            <select
              value={responsesForm?.id ?? ''}
              onChange={e => {
                const f = forms.find(f => String(f.id) === e.target.value)
                setResponsesForm(f || null)
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-slate-700 outline-none focus:border-[#0D9488] bg-white"
            >
              <option value="">— Select a form —</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {!responsesForm ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList size={52} className="text-slate-300 mb-4" />
              <p className="text-[17px] font-bold text-slate-700 mb-1">Select a form</p>
              <p className="text-slate-400 text-[14px]">Choose a form above to see its submissions.</p>
            </div>
          ) : responsesLoading ? (
            <div className="flex justify-center py-20 text-slate-400 text-[14px]">Loading…</div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList size={52} className="text-slate-300 mb-4" />
              <p className="text-[17px] font-bold text-slate-700 mb-1">No responses yet</p>
              <p className="text-slate-400 text-[14px]">Responses will appear here once clients submit this form.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 text-[13px] text-slate-500">
                {responses.length} submission{responses.length !== 1 ? 's' : ''} for <span className="font-semibold text-slate-700">{responsesForm.name}</span>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Client ID</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Responses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responses.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{fmt(r.submitted_at)}</td>
                      <td className="px-5 py-3 text-slate-600">{r.client_id ?? 'Anonymous'}</td>
                      <td className="px-5 py-3 text-slate-500 text-[12px] max-w-xs truncate">
                        {typeof r.responses === 'string' ? r.responses : JSON.stringify(r.responses)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form Builder Slide-over */}
      {showBuilder && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeBuilder} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-800">
                {editingForm ? `Edit: ${editingForm.name}` : 'New Form'}
              </h2>
              <button onClick={closeBuilder} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <input
                type="text"
                value={builderName}
                onChange={e => setBuilderName(e.target.value)}
                placeholder="Form name…"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] outline-none focus:border-[#0D9488] bg-slate-50 focus:bg-white transition-colors"
              />

              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fields</p>

              <div className="space-y-2">
                {builderFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className={`p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors ${idx === 0 ? 'opacity-30' : ''}`}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveField(idx, 1)} disabled={idx === builderFields.length - 1} className={`p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors ${idx === builderFields.length - 1 ? 'opacity-30' : ''}`}>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={field.label}
                      onChange={e => updateField(idx, 'label', e.target.value)}
                      placeholder="Field label…"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] bg-slate-50 focus:bg-white transition-colors"
                    />
                    <select
                      value={field.type}
                      onChange={e => updateField(idx, 'type', e.target.value)}
                      className="px-2 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-600 outline-none focus:border-[#0D9488] bg-slate-50 cursor-pointer"
                    >
                      {FIELD_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <button onClick={() => updateField(idx, 'required', !field.required)} className="transition-colors">
                      {field.required
                        ? <ToggleRight size={22} className="text-[#0D9488]" />
                        : <ToggleLeft size={22} className="text-slate-400" />
                      }
                    </button>
                    <button onClick={() => removeField(idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-2">+ Add Field</p>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => addField(t.key)}
                      className="px-3 py-1.5 rounded-full border border-slate-200 text-[12px] text-slate-600 font-medium hover:border-[#0D9488] hover:text-[#0D9488] hover:bg-teal-50 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button onClick={closeBuilder} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[14px] font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={createMut.isPending || updateMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-[14px] font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}
              >
                {(createMut.isPending || updateMut.isPending) ? 'Saving…' : 'Save Form'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-slate-800">{previewForm.name}</h2>
              <button onClick={() => setPreviewForm(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {previewForm.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">
                    {field.label || 'Untitled field'}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input type="text" disabled className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400" placeholder="Short text…" />
                  )}
                  {field.type === 'longtext' && (
                    <textarea disabled rows={3} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400 resize-none" placeholder="Long text…" />
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-[13px] text-slate-400">Check to confirm</span>
                    </div>
                  )}
                  {field.type === 'date' && (
                    <input type="date" disabled className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400" />
                  )}
                  {field.type === 'signature' && (
                    <div className="w-full h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-slate-300">
                        <PenLine size={16} />
                        <span className="text-[12px]">Signature area</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-full px-4 py-2.5 flex items-center gap-2 shadow-xl text-[13px] font-medium">
          <Check size={14} className="text-teal-400" />
          {toast.text}
        </div>
      )}
    </div>
  )
}
