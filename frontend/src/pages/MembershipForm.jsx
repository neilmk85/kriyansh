import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, BadgeCheck, Check, ChevronDown, ChevronUp,
  Globe, ShoppingCart, FileText, Palette, Clock, Repeat,
  Users, ToggleLeft, ToggleRight, Infinity
} from 'lucide-react'
import api from '@/lib/api'

// ─── Preset colours (matches Fresha palette) ──────────────────────────────
const COLORS = [
  '#E53E3E', '#ED8936', '#ECC94B', '#48BB78', '#38B2AC',
  '#0D9488', '#4299E1', '#667EEA', '#9F7AEA', '#ED64A6',
  '#F687B3', '#FC8181', '#68D391', '#63B3ED', '#B794F4',
  '#1A202C', '#4A5568', '#A0AEC0',
]

const FREQUENCY_OPTS = [
  { value: 'daily',       label: 'Daily'       },
  { value: 'weekly',      label: 'Weekly'       },
  { value: 'fortnightly', label: 'Fortnightly'  },
  { value: 'monthly',     label: 'Monthly'      },
  { value: 'quarterly',   label: 'Quarterly'    },
  { value: 'annual',      label: 'Annual'       },
]

const VALIDITY_OPTS = [
  { value: 7,   label: '1 week'    },
  { value: 14,  label: '2 weeks'   },
  { value: 30,  label: '1 month'   },
  { value: 60,  label: '2 months'  },
  { value: 90,  label: '3 months'  },
  { value: 180, label: '6 months'  },
  { value: 365, label: '1 year'    },
  { value: 730, label: '2 years'   },
]

const DURATION_OPTS = [
  { value: 1,   label: '1 month'   },
  { value: 2,   label: '2 months'  },
  { value: 3,   label: '3 months'  },
  { value: 6,   label: '6 months'  },
  { value: 12,  label: '1 year'    },
  { value: 24,  label: '2 years'   },
  { value: 0,   label: 'No end date' },
]

const EMPTY = {
  name:                   '',
  description:            '',
  color:                  '#0D9488',
  payment_type:           'recurring',    // 'one_time' | 'recurring'
  price:                  '',
  payment_frequency:      'monthly',
  validity_days:          30,
  billing_cycle:          'monthly',
  sessions_type:          'unlimited',    // 'limited' | 'unlimited'
  sessions_count:         1,
  service_discount_pct:   0,
  enable_online_sales:    true,
  enable_online_redemption: true,
  terms_conditions:       '',
  service_ids:            [],
}

// ─── Section wrapper ──────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] flex items-center justify-center shrink-0">
          <Icon size={17} className="text-[#0D9488]" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-slate-800">{title}</p>
          {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-[13.5px] font-semibold text-slate-700">{label}</p>
        {description && <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="shrink-0 transition-colors"
      >
        {value
          ? <ToggleRight size={32} className="text-[#0D9488]" />
          : <ToggleLeft  size={32} className="text-slate-300" />
        }
      </button>
    </div>
  )
}

const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-white'
const sel = inp

export default function MembershipForm() {
  const { id }     = useParams()          // present on edit, absent on add
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const isEdit     = !!id

  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [svcOpen, setSvcOpen] = useState(false)  // service picker expanded

  // Fetch existing plan on edit
  const { data: existingPlans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn:  () => api.get('/membership-plans').then(r => r.data),
  })

  useEffect(() => {
    if (isEdit && existingPlans.length) {
      const plan = existingPlans.find(p => String(p.id) === id)
      if (plan) {
        setForm({
          name:                   plan.name             ?? '',
          description:            plan.description      ?? '',
          color:                  plan.color            ?? '#0D9488',
          payment_type:           plan.payment_type     ?? 'recurring',
          price:                  String(plan.price     ?? ''),
          payment_frequency:      plan.payment_frequency ?? 'monthly',
          validity_days:          plan.validity_days    ?? 30,
          billing_cycle:          plan.billing_cycle    ?? 'monthly',
          sessions_type:          plan.sessions_type    ?? 'unlimited',
          sessions_count:         plan.sessions_count   ?? 1,
          service_discount_pct:   plan.service_discount_pct ?? 0,
          enable_online_sales:    plan.enable_online_sales    !== false,
          enable_online_redemption: plan.enable_online_redemption !== false,
          terms_conditions:       plan.terms_conditions ?? '',
          service_ids:            plan.service_ids      ?? [],
        })
      }
    }
  }, [isEdit, id, existingPlans])

  // Fetch all services for the service picker
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn:  () => api.get('/services').then(r => r.data),
  })

  // Group services by category
  const servicesByCategory = allServices.reduce((acc, svc) => {
    const cat = svc.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  function set(k) {
    return (val) => setForm(f => ({ ...f, [k]: typeof val === 'object' && val?.target !== undefined ? val.target.value : val }))
  }

  function toggleService(sid) {
    setForm(f => ({
      ...f,
      service_ids: f.service_ids.includes(sid)
        ? f.service_ids.filter(x => x !== sid)
        : [...f.service_ids, sid],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Membership name is required.'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Please enter a valid price.'); return }

    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        price:                parseFloat(form.price),
        sessions_count:       parseInt(form.sessions_count) || 0,
        service_discount_pct: parseFloat(form.service_discount_pct) || 0,
        billing_cycle:        form.payment_frequency,   // keep backward compat
      }
      if (isEdit) {
        await api.put(`/membership-plans/${id}`, payload)
      } else {
        await api.post('/membership-plans', payload)
      }
      qc.invalidateQueries(['membership-plans'])
      navigate('/memberships')
    } catch {
      setError('Failed to save membership. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedServiceNames = allServices
    .filter(s => form.service_ids.includes(s.id))
    .map(s => s.name)

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/memberships')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={16} />
          Memberships
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-semibold text-sm">
          {isEdit ? 'Edit membership' : 'Add membership'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 1. Basic Info ─────────────────────────────────────── */}
        <Section icon={BadgeCheck} title="Basic info" subtitle="What clients will see when browsing memberships">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Membership name *
              </label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Premium Monthly"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Explain the membership offer and any specific policies that apply…"
                className={inp + ' resize-none'}
              />
            </div>
          </div>
        </Section>

        {/* ── 2. Services & Sessions ────────────────────────────── */}
        <Section
          icon={Users}
          title="Services and sessions"
          subtitle="Choose which services are included and set session limits"
        >
          <div className="space-y-5">
            {/* Service picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Included services
              </label>
              <button
                type="button"
                onClick={() => setSvcOpen(o => !o)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13.5px] hover:border-[#0D9488] transition-colors bg-white"
              >
                <span className={form.service_ids.length ? 'text-slate-700' : 'text-slate-400'}>
                  {form.service_ids.length === 0
                    ? 'Select services…'
                    : `${form.service_ids.length} service${form.service_ids.length > 1 ? 's' : ''} selected`}
                </span>
                {svcOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
              </button>

              {/* Selected service tags */}
              {form.service_ids.length > 0 && !svcOpen && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedServiceNames.map(name => (
                    <span key={name} className="text-[12px] px-2.5 py-1 bg-[#CCFBF1] text-[#0D9488] rounded-full font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown */}
              {svcOpen && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white">
                  {allServices.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-slate-400">No services found</p>
                  ) : (
                    Object.entries(servicesByCategory).map(([cat, svcs]) => (
                      <div key={cat}>
                        <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                          {cat}
                        </p>
                        {svcs.map(svc => {
                          const selected = form.service_ids.includes(svc.id)
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => toggleService(svc.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                selected ? 'bg-[#0D9488] border-[#0D9488]' : 'border-slate-300'
                              }`}>
                                {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-[13.5px] text-slate-700 text-left flex-1">{svc.name}</span>
                              <span className="text-[12px] text-slate-400">${parseFloat(svc.price || 0).toFixed(2)}</span>
                            </button>
                          )
                        })}
                      </div>
                    ))
                  )}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSvcOpen(false)}
                      className="px-4 py-1.5 bg-[#0D9488] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0f766e] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sessions */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Sessions
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, sessions_type: 'unlimited' }))}
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    form.sessions_type === 'unlimited'
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Infinity size={17} />
                  <div className="text-left">
                    <p className="text-[13px] font-semibold">Unlimited</p>
                    <p className="text-[11px] opacity-70">No session limit</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, sessions_type: 'limited' }))}
                  className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    form.sessions_type === 'limited'
                      ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Users size={17} />
                  <div className="text-left">
                    <p className="text-[13px] font-semibold">Limited</p>
                    <p className="text-[11px] opacity-70">Set a fixed number</p>
                  </div>
                </button>
              </div>
              {form.sessions_type === 'limited' && (
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Number of sessions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.sessions_count}
                    onChange={e => setForm(f => ({ ...f, sessions_count: e.target.value }))}
                    className={inp + ' max-w-[160px]'}
                    placeholder="e.g. 10"
                  />
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── 3. Pricing & Payment ──────────────────────────────── */}
        <Section
          icon={Repeat}
          title="Pricing and payment"
          subtitle="Set how clients are billed for this membership"
        >
          <div className="space-y-5">
            {/* Payment type toggle */}
            <div className="flex gap-3">
              {[
                { value: 'recurring',  label: 'Recurring payments', desc: 'Charged on renewal dates'   },
                { value: 'one_time',   label: 'One-time payment',   desc: 'Clients pay once at purchase'},
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, payment_type: opt.value }))}
                  className={`flex-1 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                    form.payment_type === opt.value
                      ? 'border-[#0D9488] bg-[#F0FDFA]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`text-[13.5px] font-bold ${form.payment_type === opt.value ? 'text-[#0D9488]' : 'text-slate-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Recurring fields */}
            {form.payment_type === 'recurring' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Payment frequency
                    </label>
                    <select
                      value={form.payment_frequency}
                      onChange={e => setForm(f => ({ ...f, payment_frequency: e.target.value, billing_cycle: e.target.value }))}
                      className={sel}
                    >
                      {FREQUENCY_OPTS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Price per cycle ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                        className={inp + ' pl-7'}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Length of membership
                  </label>
                  <select
                    value={form.validity_days === 0 ? 0 : DURATION_OPTS.find(o => o.value * 30 === form.validity_days)?.value ?? form.validity_days}
                    onChange={e => {
                      const months = parseInt(e.target.value)
                      setForm(f => ({ ...f, validity_days: months === 0 ? 0 : months * 30 }))
                    }}
                    className={sel + ' max-w-xs'}
                  >
                    {DURATION_OPTS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* One-time fields */}
            {form.payment_type === 'one_time' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Validity period
                    </label>
                    <select
                      value={form.validity_days}
                      onChange={e => setForm(f => ({ ...f, validity_days: parseInt(e.target.value) }))}
                      className={sel}
                    >
                      {VALIDITY_OPTS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Price ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13.5px]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                        className={inp + ' pl-7'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service discount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Service discount (%)
                <span className="ml-2 normal-case font-normal text-slate-400">Optional — members get this % off at checkout</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.service_discount_pct}
                  onChange={e => setForm(f => ({ ...f, service_discount_pct: e.target.value }))}
                  placeholder="0"
                  className={inp + ' max-w-[120px]'}
                />
                <span className="text-[13px] text-slate-400">%</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 4. Colour ─────────────────────────────────────────── */}
        <Section icon={Palette} title="Colour" subtitle="Choose a colour for this membership card">
          <div className="flex flex-wrap gap-3">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-9 h-9 rounded-xl transition-all hover:scale-110 relative"
                style={{ backgroundColor: c }}
                title={c}
              >
                {form.color === c && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check size={16} className="text-white drop-shadow" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
            {/* Preview */}
            <div
              className="ml-auto flex items-center gap-3 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-sm"
              style={{ backgroundColor: form.color }}
            >
              <BadgeCheck size={16} />
              {form.name || 'Membership name'}
            </div>
          </div>
        </Section>

        {/* ── 5. Online Sales & Redemption ─────────────────────── */}
        <Section
          icon={Globe}
          title="Online sales and redemption"
          subtitle="Control how clients can purchase and use this membership online"
        >
          <div>
            <ToggleRow
              label="Enable online sales"
              description="Allow clients to purchase this membership from your online booking page"
              value={form.enable_online_sales}
              onChange={v => setForm(f => ({ ...f, enable_online_sales: v }))}
            />
            <ToggleRow
              label="Enable online redemption"
              description="Allow members to book and redeem sessions online"
              value={form.enable_online_redemption}
              onChange={v => setForm(f => ({ ...f, enable_online_redemption: v }))}
            />
          </div>
        </Section>

        {/* ── 6. Terms & Conditions ────────────────────────────── */}
        <Section
          icon={FileText}
          title="Terms and conditions"
          subtitle="Add any membership-specific rules or policies (optional)"
        >
          <textarea
            rows={4}
            value={form.terms_conditions}
            onChange={e => setForm(f => ({ ...f, terms_conditions: e.target.value }))}
            placeholder="e.g. This membership is non-transferable. Sessions expire at the end of each billing period. Cancellations require 30 days notice…"
            className={inp + ' resize-none'}
          />
        </Section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">
            {error}
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/memberships')}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl text-[14px] font-bold hover:bg-[#0f766e] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <BadgeCheck size={16} />
                {isEdit ? 'Save changes' : 'Create membership'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
