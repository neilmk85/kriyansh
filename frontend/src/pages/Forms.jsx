import { useState, useEffect } from 'react'
import {
  FileText, Plus, Trash2, Edit2, Eye, X, Check,
  ChevronUp, ChevronDown, AlignLeft, Square, Calendar,
  PenLine, ClipboardList, ToggleLeft, ToggleRight
} from 'lucide-react'

const FIELD_TYPES = [
  { key: 'text',      label: 'Text' },
  { key: 'longtext',  label: 'Long Text' },
  { key: 'checkbox',  label: 'Checkbox' },
  { key: 'date',      label: 'Date' },
  { key: 'signature', label: 'Signature' },
]

export default function Forms() {
  const [tab, setTab] = useState('Forms')
  const [forms, setForms] = useState(() => JSON.parse(localStorage.getItem('ks_forms') || '[]'))
  useEffect(() => { localStorage.setItem('ks_forms', JSON.stringify(forms)) }, [forms])

  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [previewForm, setPreviewForm] = useState(null)
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const [builderName, setBuilderName] = useState('')
  const [builderFields, setBuilderFields] = useState([])

  function openNewBuilder() {
    setShowBuilder(true)
    setEditingForm(null)
    setBuilderName('')
    setBuilderFields([])
  }

  function openEditBuilder(f) {
    setShowBuilder(true)
    setEditingForm(f)
    setBuilderName(f.name)
    setBuilderFields([...f.fields])
  }

  function closeBuilder() {
    setShowBuilder(false)
    setEditingForm(null)
    setBuilderName('')
    setBuilderFields([])
  }

  function addField(type) {
    setBuilderFields(prev => [
      ...prev,
      { id: prev.length + forms.length + 10 + Date.now(), label: '', type, required: false }
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
      setToast({ type: 'error', text: 'Add a name and at least one field.' })
      return
    }
    if (editingForm) {
      setForms(prev => prev.map(f =>
        f.id === editingForm.id
          ? { ...f, name: builderName.trim(), fields: builderFields }
          : f
      ))
      setToast({ type: 'success', text: 'Form updated.' })
    } else {
      setForms(prev => [
        ...prev,
        {
          id: forms.length + 1,
          name: builderName.trim(),
          fields: builderFields,
          createdAt: 'Jun 14, 2026',
          responseCount: 0,
        },
      ])
      setToast({ type: 'success', text: 'Form created.' })
    }
    closeBuilder()
  }

  function deleteForm(id) {
    setForms(prev => prev.filter(f => f.id !== id))
    setToast({ type: 'success', text: 'Form deleted.' })
  }

  const responses = JSON.parse(localStorage.getItem('ks_form_responses') || '[]')

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

          {forms.length === 0 ? (
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
              {forms.map(form => (
                <div key={form.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <p className="text-[16px] font-bold text-slate-800">{form.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full">
                      {form.fields.length} fields
                    </span>
                    <span className="text-[11px] text-slate-400">Created {form.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setPreviewForm(form)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Eye size={13} />
                      Preview
                    </button>
                    <button
                      onClick={() => openEditBuilder(form)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteForm(form.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[12px] font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors ml-auto"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Responses Tab */}
      {tab === 'Responses' && (
        <div>
          {responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList size={52} className="text-slate-300 mb-4" />
              <p className="text-[17px] font-bold text-slate-700 mb-1">No responses yet</p>
              <p className="text-slate-400 text-[14px]">Responses will appear here once clients submit intake forms.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Client</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {responses.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-600">{r.date}</td>
                      <td className="px-5 py-3 text-slate-800 font-medium">{r.client}</td>
                      <td className="px-5 py-3 text-slate-600">{r.form}</td>
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
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeBuilder}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            {/* Builder Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-800">
                {editingForm ? `Edit: ${editingForm.name}` : 'New Form'}
              </h2>
              <button
                onClick={closeBuilder}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Builder Body */}
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
                      <button
                        onClick={() => moveField(idx, -1)}
                        disabled={idx === 0}
                        className={`p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors ${idx === 0 ? 'opacity-30' : ''}`}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveField(idx, 1)}
                        disabled={idx === builderFields.length - 1}
                        className={`p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors ${idx === builderFields.length - 1 ? 'opacity-30' : ''}`}
                      >
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
                      {FIELD_TYPES.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateField(idx, 'required', !field.required)}
                      className="transition-colors"
                    >
                      {field.required
                        ? <ToggleRight size={22} className="text-[#0D9488]" />
                        : <ToggleLeft size={22} className="text-slate-400" />
                      }
                    </button>
                    <button
                      onClick={() => removeField(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
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

            {/* Builder Footer */}
            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeBuilder}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[14px] font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-[14px] font-semibold"
                style={{ background: 'linear-gradient(135deg,#0D9488 0%,#6366F1 100%)' }}
              >
                Save Form
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
              <button
                onClick={() => setPreviewForm(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
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
                    <input
                      type="text"
                      disabled
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400"
                      placeholder="Short text…"
                    />
                  )}
                  {field.type === 'longtext' && (
                    <textarea
                      disabled
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400 resize-none"
                      placeholder="Long text…"
                    />
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-[13px] text-slate-400">Check to confirm</span>
                    </div>
                  )}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      disabled
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-400"
                    />
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
