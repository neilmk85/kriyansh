import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Smile, Briefcase, UserCheck, Crown, Clock, CircleDollarSign, Cake,
  Users, Search, Plus, ChevronDown, X,
  Eye, Megaphone, Trash2, AlertCircle,
  Loader2, PenLine, CirclePlus, Bot, DollarSign, Star, Gift
} from 'lucide-react'
import api from '@/lib/api'

// ─── Standard segment icon/color map ─────────────────────────────────────────

const STD_ICON = {
  'new_clients':        Smile,          // 😊 smiley — matches Fresha
  'recent_clients':     Briefcase,      // 💼 briefcase — matches Fresha
  'first_visit':        UserCheck,      // ✓ person — first-timer
  'loyal_clients':      Crown,          // 👑 crown — matches Fresha
  'lapsed_clients':     Clock,          // ⏰ clock — matches Fresha
  'high_spenders':      CircleDollarSign, // $ in circle — matches Fresha
  'upcoming_birthdays': Cake,           // 🎂 cake — matches Fresha
}

// Icon options for the slide-over icon picker
const ICON_OPTIONS = [
  { key: 'users',     Icon: Users       },
  { key: 'smile',     Icon: Smile       },
  { key: 'briefcase', Icon: Briefcase   },
  { key: 'crown',     Icon: Crown       },
  { key: 'clock',     Icon: Clock       },
  { key: 'dollar',    Icon: DollarSign  },
  { key: 'cake',      Icon: Cake        },
  { key: 'bot',       Icon: Bot         },
  { key: 'eye',       Icon: Eye         },
  { key: 'megaphone', Icon: Megaphone   },
]

// ─── Rule config ──────────────────────────────────────────────────────────────

const FIELD_OPTIONS = [
  { value: 'total_spend',         label: 'Total spend ($)',       type: 'number' },
  { value: 'total_visits',        label: 'Total visits',          type: 'number' },
  { value: 'loyalty_points',      label: 'Loyalty points',        type: 'number' },
  { value: 'created_days_ago',    label: 'Days since joined',     type: 'days'   },
  { value: 'last_visit_days_ago', label: 'Days since last visit', type: 'days'   },
  { value: 'gender',              label: 'Gender',                type: 'gender' },
  { value: 'sms_consent',         label: 'SMS consent',           type: 'bool'   },
]

const NUM_OPS = [
  { value: 'gte', label: 'Is at least'    },
  { value: 'lte', label: 'Is at most'     },
  { value: 'gt',  label: 'Is greater than'},
  { value: 'lt',  label: 'Is less than'   },
  { value: 'eq',  label: 'Equals'         },
]
const DAYS_OPS = [
  { value: 'lte', label: 'Within last N days'  },
  { value: 'gte', label: 'More than N days ago' },
]
const GENDER_OPS = [{ value: 'eq', label: 'Is' }]
const BOOL_OPS   = [{ value: 'eq', label: 'Is' }]

function opsFor(type) {
  if (type === 'days')   return DAYS_OPS
  if (type === 'gender') return GENDER_OPS
  if (type === 'bool')   return BOOL_OPS
  return NUM_OPS
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name = '') {
  const COLORS = {
    A:'#7C3AED',B:'#0D9488',C:'#0284C7',D:'#2563EB',E:'#DB2777',
    F:'#EA580C',G:'#16A34A',H:'#DC2626',I:'#7C3AED',J:'#0891B2',
    K:'#D97706',L:'#9333EA',M:'#0D9488',N:'#2563EB',O:'#EA580C',
    P:'#16A34A',Q:'#6366F1',R:'#DC2626',S:'#0284C7',T:'#DB2777',
    U:'#7C3AED',V:'#059669',W:'#D97706',X:'#6366F1',Y:'#0891B2',Z:'#EC4899',
  }
  const l = (name||'').trim().toUpperCase()[0] || 'A'
  return COLORS[l] || '#0D9488'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0}).format(n||0)
}

// ─── StandardIcon — indigo diagonal gradient fill (matches Fresha) ───────────
// Light lavender top-left → indigo center → deep purple bottom-right

function StandardIcon({ segKey }) {
  const Icon = STD_ICON[segKey] || Users
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
      style={{
        background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 55%, #4338ca 100%)',
        boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
      }}
    >
      <Icon size={19} className="text-white" strokeWidth={1.75} />
    </div>
  )
}

// ─── CustomIcon — orange diagonal gradient fill (matches Fresha) ──────────────
// Amber/yellow top-left → orange center → deep red-orange bottom-right

function CustomIcon({ iconKey }) {
  const opt = ICON_OPTIONS.find(o => o.key === iconKey)
  const Icon = opt ? opt.Icon : PenLine
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
      style={{
        background: 'linear-gradient(135deg, #fcd34d 0%, #f97316 55%, #c2410c 100%)',
        boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
      }}
    >
      <Icon size={18} className="text-white" strokeWidth={1.75} />
    </div>
  )
}

// ─── ActionsDropdown ──────────────────────────────────────────────────────────

function ActionsDropdown({ seg, onEdit, onDuplicate, onViewClients, onSendBlast, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [open])

  function act(fn) { return () => { setOpen(false); fn() } }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
      >
        Actions
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.13)] border border-slate-100 py-1.5 overflow-hidden">
          <button onClick={act(onEdit)}
            className="w-full flex items-center px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors">
            Edit segment
          </button>
          <button onClick={act(onDuplicate)}
            className="w-full flex items-center px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors">
            Duplicate
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button onClick={act(onViewClients)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors">
            <span>View clients</span>
            {seg.count > 0 && (
              <span className="bg-indigo-50 text-indigo-600 text-[11.5px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                {seg.count}
              </span>
            )}
          </button>
          <button onClick={act(onSendBlast)}
            className="w-full flex items-center px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors">
            Send a blast
          </button>
          {seg.type === 'custom' && (
            <>
              <div className="my-1 h-px bg-slate-100" />
              <button onClick={act(onDelete)}
                className="w-full flex items-center px-4 py-2.5 text-[13.5px] text-red-500 hover:bg-red-50 transition-colors">
                Delete segment
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SegmentCard ──────────────────────────────────────────────────────────────

function SegmentCard({ seg, onEdit, onDuplicate, onViewClients, onSendBlast, onDelete }) {
  const isStd = seg.type === 'standard'

  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.11)] transition-shadow">
      {/* Icon */}
      {isStd
        ? <StandardIcon segKey={seg.seg_key} />
        : <CustomIcon iconKey={seg.icon} />
      }

      {/* Name + count + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-slate-900 leading-tight">{seg.name}</span>
          <span className={`text-[13.5px] font-semibold ${seg.count > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
            {seg.count}
          </span>
        </div>
        <p className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">{seg.description}</p>
      </div>

      {/* Actions */}
      <ActionsDropdown
        seg={seg}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onViewClients={onViewClients}
        onSendBlast={onSendBlast}
        onDelete={onDelete}
      />
    </div>
  )
}

// ─── RuleRow ──────────────────────────────────────────────────────────────────

function RuleRow({ rule, idx, onChange, onRemove }) {
  const fieldDef = FIELD_OPTIONS.find(f => f.value === rule.field) || FIELD_OPTIONS[0]
  const ops = opsFor(fieldDef.type)

  function upd(patch) { onChange(idx, { ...rule, ...patch }) }

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <select
        value={rule.field}
        onChange={e => {
          const newField = e.target.value
          const newType  = FIELD_OPTIONS.find(f => f.value === newField)?.type || 'number'
          upd({ field: newField, operator: opsFor(newType)[0].value, value: '' })
        }}
        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-700 bg-white outline-none focus:border-indigo-400"
      >
        {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        value={rule.operator}
        onChange={e => upd({ operator: e.target.value })}
        className="w-40 shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-700 bg-white outline-none focus:border-indigo-400"
      >
        {ops.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>

      {fieldDef.type === 'gender' ? (
        <select value={rule.value} onChange={e => upd({ value: e.target.value })}
          className="w-24 shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-700 bg-white outline-none focus:border-indigo-400">
          <option value="">Pick</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      ) : fieldDef.type === 'bool' ? (
        <select value={rule.value} onChange={e => upd({ value: e.target.value })}
          className="w-24 shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-700 bg-white outline-none focus:border-indigo-400">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input type="number" min={0} value={rule.value} onChange={e => upd({ value: e.target.value })}
          placeholder="Value"
          className="w-24 shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-700 bg-white outline-none focus:border-indigo-400" />
      )}

      <button onClick={() => onRemove(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── SegmentSlideOver ─────────────────────────────────────────────────────────

function SegmentSlideOver({ mode, segment, onClose, onSave }) {
  const isEdit = mode === 'edit'
  const isStd  = segment?.type === 'standard'

  const [name,   setName]   = useState(segment?.name        || '')
  const [desc,   setDesc]   = useState(segment?.description || '')
  const [icon,   setIcon]   = useState(segment?.icon        || 'users')
  const [rules,  setRules]  = useState(() => {
    if (!segment?.rules) return []
    try { return typeof segment.rules === 'string' ? JSON.parse(segment.rules) : segment.rules }
    catch { return [] }
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  function addRule()              { setRules(r => [...r, { field:'total_spend', operator:'gte', value:'' }]) }
  function changeRule(idx, val)   { setRules(r => r.map((x,i) => i===idx ? val : x)) }
  function removeRule(idx)        { setRules(r => r.filter((_,i) => i!==idx)) }

  async function save() {
    if (!name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr('')
    try {
      await onSave({ name, description: desc, icon, rules: isStd ? undefined : rules })
    } catch(e) {
      setErr(e?.response?.data?.error || 'Failed to save')
      setSaving(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-[480px] bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">
              {isEdit ? 'Edit segment' : 'New custom segment'}
            </h2>
            {isStd && (
              <p className="text-[12px] text-slate-400 mt-0.5">Standard — name, description and icon only</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Segment name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Regulars, VIP Members…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Describe who this segment captures…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all resize-none" />
          </div>

          {/* Icon picker (custom only) */}
          {!isStd && (
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(opt => {
                  const sel = icon === opt.key
                  return (
                    <button key={opt.key} onClick={() => setIcon(opt.key)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border-2 ${
                        sel ? 'border-orange-400 bg-orange-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                      }`}
                      style={{ background: sel ? 'linear-gradient(135deg,#f9731620,#fb923c20)' : '' }}>
                      <opt.Icon size={16} className={sel ? 'text-orange-500' : 'text-slate-500'} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rules (custom only) */}
          {!isStd && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12.5px] font-semibold text-slate-700">Conditions</label>
                <span className="text-[11.5px] text-slate-400">All conditions must match</span>
              </div>
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <RuleRow key={i} rule={rule} idx={i} onChange={changeRule} onRemove={removeRule} />
                ))}
              </div>
              <button onClick={addRule}
                className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                <Plus size={13} /> Add condition
              </button>
              {rules.length === 0 && (
                <p className="text-[12px] text-slate-400 mt-1.5 italic">No conditions — matches all active clients</p>
              )}
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 text-[12.5px] text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
              <AlertCircle size={13} /> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? 'Save changes' : 'Create segment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ViewClientsModal ─────────────────────────────────────────────────────────

function ViewClientsModal({ seg, onClose }) {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['segment-clients', seg.id],
    queryFn: () => api.get(`/client-segments/${seg.id}/clients`).then(r => r.data),
  })

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {seg.type === 'standard'
              ? <StandardIcon segKey={seg.seg_key} />
              : <CustomIcon iconKey={seg.icon} />}
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-[15px] font-bold text-slate-900">{seg.name}</h2>
                {!isLoading && (
                  <span className="text-[13px] font-semibold text-indigo-600">{clients.length}</span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-400 mt-0.5">{seg.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Users size={36} className="mb-3 text-slate-200" />
              <p className="text-[13.5px] font-medium text-slate-600 mb-1">No clients in this segment yet</p>
              <p className="text-[12px] text-slate-400">Clients matching the segment rules will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Client','Mobile','Sales','Last visit'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const full = `${c.first_name} ${c.last_name}`.trim()
                  const ini  = ((c.first_name||'')[0]||'') + ((c.last_name||'')[0]||'')
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ backgroundColor: avatarColor(full) }}>
                            {ini.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900">{full || '—'}</p>
                            {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-slate-600">{c.phone || '—'}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-slate-700">{fmtMoney(c.total_spend)}</td>
                      <td className="px-5 py-3 text-[12px] text-slate-500">{c.last_visit_at ? fmtDate(c.last_visit_at) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── OptionsMenu ──────────────────────────────────────────────────────────────

function OptionsMenu({ segments }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [open])

  function exportCSV() {
    setOpen(false)
    const rows = [['ID','Name','Type','Count','Description']]
    segments.forEach(s => rows.push([s.id, s.name, s.type, s.count, s.description]))
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    a.download = 'client-segments.csv'
    a.click()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-all"
      >
        Options
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.13)] border border-slate-100 py-1.5">
          <button onClick={exportCSV}
            className="w-full flex items-center px-4 py-2.5 text-[13.5px] text-slate-700 hover:bg-slate-50 transition-colors">
            Export segments
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientSegments() {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const [tab,            setTab]            = useState('standard')
  const [search,         setSearch]         = useState('')
  const [slideOver,      setSlideOver]      = useState(null) // { mode:'add'|'edit', segment }
  const [viewingSegment, setViewingSegment] = useState(null)

  const { data: allSegs = [], isLoading } = useQuery({
    queryKey: ['client-segments'],
    queryFn: () => api.get('/client-segments').then(r => r.data),
    staleTime: 60_000,
  })

  const standardSegs = allSegs.filter(s => s.type === 'standard')
  const customSegs   = allSegs.filter(s => s.type === 'custom')

  const shownStd = standardSegs.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
  const shownCst = customSegs.filter(s   => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  // Mutations
  const createMut = useMutation({
    mutationFn: data      => api.post('/client-segments', data),
    onSuccess:  ()        => { qc.invalidateQueries({ queryKey:['client-segments'] }); setSlideOver(null) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/client-segments/${id}`, data),
    onSuccess:  ()        => { qc.invalidateQueries({ queryKey:['client-segments'] }); setSlideOver(null) },
  })
  const deleteMut = useMutation({
    mutationFn: id        => api.delete(`/client-segments/${id}`),
    onSuccess:  ()        => qc.invalidateQueries({ queryKey:['client-segments'] }),
  })
  const dupMut = useMutation({
    mutationFn: id        => api.post(`/client-segments/${id}/duplicate`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey:['client-segments'] })
      // switch to custom tab to see the new duplicate
      setTab('custom')
    },
  })

  async function handleSave(data) {
    if (slideOver.mode === 'edit') {
      await updateMut.mutateAsync({ id: slideOver.segment.id, ...data })
    } else {
      await createMut.mutateAsync(data)
    }
  }

  function handleDelete(seg) {
    if (!window.confirm(`Delete "${seg.name}"? This cannot be undone.`)) return
    deleteMut.mutate(seg.id)
  }

  function handleSendBlast(seg) {
    navigate(`/marketing?segment_id=${seg.id}&segment_name=${encodeURIComponent(seg.name)}`)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[860px] mx-auto">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[22px] font-bold text-slate-900">Client segments</h1>
            {allSegs.length > 0 && (
              <span className="text-[17px] font-semibold text-slate-400">{allSegs.length}</span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500 max-w-xl leading-relaxed">
            Create and manage automated segments you can easily use across the platform
            including marketing tools, reporting, and calendar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <OptionsMenu segments={allSegs} />
          <button
            onClick={() => { setSlideOver({ mode:'add', segment:null }); setTab('custom') }}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Tabs + Search ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab('standard')}
            className={`px-5 py-2 rounded-full text-[13.5px] font-semibold transition-all ${
              tab === 'standard'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`px-5 py-2 rounded-full text-[13.5px] font-semibold transition-all ${
              tab === 'custom'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name"
            className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all w-48 bg-white"
          />
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={26} className="animate-spin text-slate-300" />
        </div>
      ) : tab === 'standard' ? (

        /* ── Standard segments ─────────────────────────────────── */
        <div className="space-y-3">
          {shownStd.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              {search ? <p className="text-[13px]">No segments match "{search}"</p> : <p>No standard segments</p>}
            </div>
          ) : (
            shownStd.map(seg => (
              <SegmentCard
                key={seg.id}
                seg={seg}
                onEdit={()        => setSlideOver({ mode:'edit', segment:seg })}
                onDuplicate={()   => dupMut.mutate(seg.id)}
                onViewClients={() => setViewingSegment(seg)}
                onSendBlast={()   => handleSendBlast(seg)}
                onDelete={()      => handleDelete(seg)}
              />
            ))
          )}
        </div>

      ) : (

        /* ── Custom segments ───────────────────────────────────── */
        <div>
          {/* Section heading */}
          <h2 className="text-[15px] font-bold text-slate-800 mb-3">
            Custom client segments
          </h2>

          {shownCst.length === 0 && !search ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-slate-400" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700 mb-1">No custom segments yet</p>
              <p className="text-[12.5px] text-slate-400 mb-5 max-w-xs mx-auto">
                Create segments to target specific groups of clients in your marketing and reports
              </p>
              <button
                onClick={() => setSlideOver({ mode:'add', segment:null })}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 transition-all"
              >
                <Plus size={14} /> Create your first segment
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {shownCst.length === 0 ? (
                  <div className="text-center py-10 text-[13px] text-slate-400">
                    No segments match "{search}"
                  </div>
                ) : (
                  shownCst.map(seg => (
                    <SegmentCard
                      key={seg.id}
                      seg={seg}
                      onEdit={()        => setSlideOver({ mode:'edit', segment:seg })}
                      onDuplicate={()   => dupMut.mutate(seg.id)}
                      onViewClients={() => setViewingSegment(seg)}
                      onSendBlast={()   => handleSendBlast(seg)}
                      onDelete={()      => handleDelete(seg)}
                    />
                  ))
                )}
              </div>

              {/* Add segment button at bottom */}
              {!search && (
                <button
                  onClick={() => setSlideOver({ mode:'add', segment:null })}
                  className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <CirclePlus size={16} className="text-slate-400" />
                  Add segment
                </button>
              )}
            </>
          )}
        </div>

      )}

      {/* ── Slide-over ─────────────────────────────────────────────── */}
      {slideOver && (
        <SegmentSlideOver
          mode={slideOver.mode}
          segment={slideOver.segment}
          onClose={() => setSlideOver(null)}
          onSave={handleSave}
        />
      )}

      {/* ── View clients modal ──────────────────────────────────────── */}
      {viewingSegment && (
        <ViewClientsModal
          seg={viewingSegment}
          onClose={() => setViewingSegment(null)}
        />
      )}
    </div>
  )
}
