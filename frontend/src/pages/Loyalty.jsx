import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Star, TrendingUp, Users, Award, ChevronRight, X,
  Tag, UserPlus, Check, Trash2, Plus, ToggleLeft, ToggleRight,
  CircleDollarSign, Percent, Sparkles, Package, AlertCircle,
  Zap, Crown, Shield, Clock, FileText, ArrowRight, Settings2,
  BadgeCheck, Flame, Heart
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, initials } from '@/lib/utils'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'
const TABS = ['Overview', 'Rewards', 'Referrals', 'Settings']

const TIER_CONFIG = {
  Bronze:   { from: '#F97316', to: '#EA580C', ring: '#F97316', light: '#FFF7ED', text: '#9A3412' },
  Silver:   { from: '#3B82F6', to: '#2563EB', ring: '#3B82F6', light: '#EFF6FF', text: '#1E40AF' },
  Gold:     { from: '#F59E0B', to: '#D97706', ring: '#F59E0B', light: '#FFFBEB', text: '#92400E' },
  Platinum: { from: '#8B5CF6', to: '#7C3AED', ring: '#8B5CF6', light: '#F5F3FF', text: '#4C1D95' },
}

const REWARD_TYPE_META = {
  amount_off:   { label: '$ off',        icon: CircleDollarSign, from: '#059669', to: '#0D9488' },
  percent_off:  { label: '% off',        icon: Percent,          from: '#6366F1', to: '#8B5CF6' },
  free_service: { label: 'Free service', icon: Sparkles,         from: '#D97706', to: '#EA580C' },
  free_product: { label: 'Free product', icon: Package,          from: '#2563EB', to: '#4F46E5' },
}

const TRIGGER_TYPE_LABELS = {
  points:   'At points milestone',
  tier:     'On tier unlock',
  referral: 'On referral',
  manual:   'Manual only',
}

function TierPill({ name }) {
  const c = TIER_CONFIG[name]
  if (!c) return <span className="text-[11px] text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: c.light, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.ring }} />
      {name}
    </span>
  )
}

function Spinner({ size = 5 }) {
  return <div className={`w-${size} h-${size} border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin`} />
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function Loyalty() {
  const [tab, setTab] = useState('Overview')
  const [selectedClient, setSelectedClient] = useState(null)

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients?q=').then(r => r.data),
  })
  const { data: tiers = [], isLoading: loadingTiers } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: () => api.get('/loyalty/tiers').then(r => r.data),
  })
  const { data: stats = {} } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: () => api.get('/loyalty/stats').then(r => r.data),
    refetchInterval: 30_000,
  })

  const sorted = [...clients].sort((a, b) =>
    (b.loyalty_points ?? b.loyalty_balance ?? 0) - (a.loyalty_points ?? a.loyalty_balance ?? 0)
  )

  function getTierForPoints(pts) {
    if (!tiers.length) return null
    return [...tiers].sort((a, b) => b.min_points - a.min_points).find(t => pts >= t.min_points)
  }

  const totalPts = clients.reduce((s, c) => s + (c.loyalty_points ?? 0), 0)
  const avgPts = clients.length ? Math.round(totalPts / clients.length) : 0
  const activeMembers = stats.total_members ?? clients.filter(c => (c.loyalty_points ?? 0) > 0).length

  return (
    <div className="space-y-0">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden -mx-6 -mt-6 mb-7 rounded-b-3xl" style={{
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 40%, #6366F1 100%)'
      }}>
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full opacity-5" style={{ background: '#fff' }} />
        <div className="absolute top-1/2 -right-4 w-24 h-24 rounded-full opacity-[0.07]" style={{ background: '#fff' }} />

        <div className="relative z-10 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <Award size={26} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-0.5">Loyalty Program</p>
                <h1 className="text-[26px] font-bold text-white leading-tight">Reward Your Best Clients</h1>
                <p className="text-[13px] text-white/55 mt-0.5">Points · Tiers · Rewards · Referrals</p>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: Users,      label: 'Members',     value: activeMembers },
                { icon: Zap,        label: 'Pts today',   value: stats.issued_today ?? '—' },
                { icon: TrendingUp, label: 'Avg pts',     value: avgPts },
                { icon: Gift,       label: 'Redeemed',    value: stats.redeemed_today ?? '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                  <Icon size={16} className="text-white/70" />
                  <div>
                    <p className="text-white text-[18px] font-bold leading-tight">{value}</p>
                    <p className="text-white/55 text-[11px] font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-100 mb-7">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative px-5 py-3.5 text-[14px] font-semibold transition-all ${
              tab === t ? 'text-[#0D9488]' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t}
            {tab === t && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#0D9488] rounded-t-sm" />}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <OverviewTab
          clients={sorted} tiers={tiers}
          loadingClients={loadingClients} loadingTiers={loadingTiers}
          getTierForPoints={getTierForPoints}
          onSelectClient={setSelectedClient}
        />
      )}
      {tab === 'Rewards' && <RewardsTab />}
      {tab === 'Referrals' && <ReferralsTab clients={clients} />}
      {tab === 'Settings' && <SettingsTab />}

      {selectedClient && (
        <ClientLoyaltyModal client={selectedClient} tiers={tiers} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ clients, tiers, loadingClients, loadingTiers, getTierForPoints, onSelectClient }) {
  const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)

  return (
    <div className="space-y-8">

      {/* Tier Journey */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-800">Membership Tiers</h2>
          <span className="text-[12px] text-slate-400">{sortedTiers.length} tiers configured</span>
        </div>

        {loadingTiers ? (
          <div className="flex justify-center py-10"><Spinner size={6} /></div>
        ) : (
          <div className="relative">
            {/* Connecting track line */}
            {sortedTiers.length > 1 && (
              <div className="absolute top-[42px] left-[calc(12.5%+8px)] right-[calc(12.5%+8px)] h-0.5 hidden xl:block"
                style={{ background: 'linear-gradient(to right, #D97706, #94A3B8, #CA8A04, #7C3AED)', opacity: 0.25 }} />
            )}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {sortedTiers.map(tier => {
                const cfg = TIER_CONFIG[tier.name] ?? TIER_CONFIG.Silver
                const memberCount = clients.filter(cl =>
                  getTierForPoints(cl.loyalty_points ?? 0)?.name === tier.name
                ).length
                return (
                  <div key={tier.id}
                    className="relative bg-white rounded-2xl p-5 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06),0_6px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all cursor-default">
                    {/* Top gradient strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, ${cfg.from}, ${cfg.to})` }} />
                    {/* Tier icon circle */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
                      <Crown size={20} className="text-white" />
                    </div>
                    <p className="text-[16px] font-bold text-slate-800">{tier.name}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: cfg.text }}>
                      {tier.min_points === 0 ? 'Starting tier' : `${tier.min_points.toLocaleString()}+ points`}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discount</p>
                        <p className="text-[20px] font-bold text-slate-800 mt-0.5">{tier.discount_pct}<span className="text-[13px] text-slate-400">%</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Members</p>
                        <p className="text-[20px] font-bold text-slate-800 mt-0.5">{memberCount}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Client Table */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-800">Client Loyalty</h2>
          <span className="text-[12px] text-slate-400">{clients.length} clients</span>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          {loadingClients ? (
            <div className="p-16 flex justify-center"><Spinner size={6} /></div>
          ) : clients.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
                <Gift size={28} className="text-[#0D9488]" />
              </div>
              <p className="text-[16px] font-bold text-slate-700 mb-1">No loyalty members yet</p>
              <p className="text-[13px] text-slate-400">Clients appear here once they earn their first points</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['Client', 'Tier', 'Balance', 'Progress to next', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const balance = c.loyalty_points ?? c.loyalty_balance ?? 0
                  const tier = getTierForPoints(balance)
                  const cfg = TIER_CONFIG[tier?.name] ?? { from: '#94A3B8', to: '#64748B', ring: '#94A3B8' }
                  const allTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)
                  const tIdx = allTiers.findIndex(t => t.name === tier?.name)
                  const nextT = allTiers[tIdx + 1]
                  const prevMin = tier?.min_points ?? 0
                  const pct = nextT
                    ? Math.min(100, Math.round(((balance - prevMin) / (nextT.min_points - prevMin)) * 100))
                    : 100
                  return (
                    <tr key={c.id} onClick={() => onSelectClient(c)}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-[12px] font-bold shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
                            {initials(`${c.first_name} ${c.last_name}`)}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                            {c.phone && <p className="text-[11px] text-slate-400">{c.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {tier ? <TierPill name={tier.name} /> : <span className="text-[12px] text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[15px] font-bold text-slate-800">{balance.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400">points</p>
                      </td>
                      <td className="px-5 py-4 min-w-[180px]">
                        {nextT ? (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-slate-500 font-medium">{pct}%</span>
                              <span className="text-[11px] text-slate-400">{nextT.name} at {nextT.min_points.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.from}, ${cfg.to})` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0D9488]">
                            <BadgeCheck size={13} /> Max tier
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-[#0D9488] group-hover:translate-x-0.5 transition-all" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Rewards Tab ───────────────────────────────────────────────────────────────
function RewardsTab() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: () => api.get('/loyalty/rewards').then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/loyalty/rewards/${id}`),
    onSuccess: () => qc.invalidateQueries(['loyalty-rewards']),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/loyalty/rewards/${id}`, body),
    onSuccess: () => qc.invalidateQueries(['loyalty-rewards']),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">Rewards Catalog</h2>
          <p className="text-[13px] text-slate-400 mt-0.5">Define rewards clients can earn with points, tiers, or referrals</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 shadow-sm active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
          <Plus size={15} /> Add Reward
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={6} /></div>
      ) : rewards.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
            <Tag size={28} className="text-[#0D9488]" />
          </div>
          <p className="text-[16px] font-bold text-slate-700 mb-1">No rewards yet</p>
          <p className="text-[13px] text-slate-400 mb-5">Create rewards clients can unlock with points or by reaching a tier</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
            <Plus size={15} /> Create your first reward
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rewards.map(rw => {
            const meta = REWARD_TYPE_META[rw.reward_type] ?? REWARD_TYPE_META.amount_off
            const TypeIcon = meta.icon
            const valueStr = rw.reward_type === 'percent_off' ? `${rw.value}%` : `$${rw.value}`
            return (
              <div key={rw.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.09)] transition-all ${!rw.is_active ? 'opacity-55 grayscale-[0.4]' : ''}`}>
                {/* Colored top strip + icon */}
                <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${meta.from}, ${meta.to})` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>
                        <TypeIcon size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800 leading-tight">{rw.name}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${meta.from}18`, color: meta.from }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => toggleMut.mutate({ id: rw.id, ...rw, is_active: !rw.is_active })}
                      className="mt-0.5 shrink-0">
                      {rw.is_active
                        ? <ToggleRight size={22} style={{ color: '#0D9488' }} />
                        : <ToggleLeft size={22} className="text-slate-300" />}
                    </button>
                  </div>

                  {/* Value + trigger */}
                  <div className="flex items-center gap-3 py-3 px-4 rounded-xl mb-4"
                    style={{ background: `${meta.from}0d` }}>
                    <p className="text-[22px] font-black" style={{ color: meta.from }}>{valueStr}</p>
                    <div className="h-5 w-px bg-slate-200" />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">{TRIGGER_TYPE_LABELS[rw.trigger_type]}</p>
                      {rw.trigger_type === 'points' && (
                        <p className="text-[12px] font-bold text-slate-700">{rw.trigger_value.toLocaleString()} pts required</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(rw); setShowForm(true) }}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => deleteMut.mutate(rw.id)}
                      className="w-9 h-9 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RewardFormSlideOver initial={editing} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function RewardFormSlideOver({ initial, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    reward_type: initial?.reward_type ?? 'amount_off',
    value: initial?.value ?? '',
    trigger_type: initial?.trigger_type ?? 'points',
    trigger_value: initial?.trigger_value ?? '',
  })
  const createMut = useMutation({
    mutationFn: body => api.post('/loyalty/rewards', body),
    onSuccess: () => { qc.invalidateQueries(['loyalty-rewards']); onClose() },
  })
  const updateMut = useMutation({
    mutationFn: body => api.put(`/loyalty/rewards/${initial.id}`, body),
    onSuccess: () => { qc.invalidateQueries(['loyalty-rewards']); onClose() },
  })
  function handleSubmit(e) {
    e.preventDefault()
    const body = { ...form, value: parseFloat(form.value) || 0, trigger_value: parseInt(form.trigger_value) || 0 }
    if (initial) updateMut.mutate(body)
    else createMut.mutate(body)
  }
  const isPending = createMut.isPending || updateMut.isPending
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <h2 className="text-[17px] font-bold text-slate-800">{initial ? 'Edit Reward' : 'New Reward'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Reward Name">
            <input required className={inp} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. $10 off your next visit" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reward Type">
              <select className={inp} value={form.reward_type} onChange={e => setForm(f => ({ ...f, reward_type: e.target.value }))}>
                <option value="amount_off">$ Amount off</option>
                <option value="percent_off">% Percentage off</option>
                <option value="free_service">Free service</option>
                <option value="free_product">Free product</option>
              </select>
            </Field>
            <Field label={form.reward_type === 'percent_off' ? 'Percentage (%)' : 'Value ($)'}>
              <input required type="number" min="0" step="0.01" className={inp} value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trigger">
              <select className={inp} value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}>
                <option value="points">Points threshold</option>
                <option value="tier">Tier achievement</option>
                <option value="referral">Referral</option>
                <option value="manual">Manual only</option>
              </select>
            </Field>
            {form.trigger_type === 'points' && (
              <Field label="Points Required">
                <input required type="number" min="1" className={inp} value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))} placeholder="e.g. 500" />
              </Field>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
              {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Create Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Referrals Tab ─────────────────────────────────────────────────────────────
function ReferralsTab({ clients }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['loyalty-referrals'],
    queryFn: () => api.get('/loyalty/referrals').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: body => api.post('/loyalty/referrals', body),
    onSuccess: () => { qc.invalidateQueries(['loyalty-referrals']); setShowForm(false) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">Client Referrals</h2>
          <p className="text-[13px] text-slate-400 mt-0.5">Track who referred new clients and auto-grant referral rewards</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
          <UserPlus size={15} /> Add Referral
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={6} /></div>
      ) : referrals.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} className="text-[#0D9488]" />
          </div>
          <p className="text-[16px] font-bold text-slate-700 mb-1">No referrals yet</p>
          <p className="text-[13px] text-slate-400 mb-5">Reward clients who bring their friends to your salon</p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
            <UserPlus size={15} /> Record first referral
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {['Referred by', 'New client', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map(ref => (
                <tr key={ref.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-semibold text-slate-800">{ref.referrer_name}</p>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-slate-600">{ref.referred_name}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      ref.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {ref.status === 'completed' ? <Check size={10} /> : <Clock size={10} />}
                      {ref.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-slate-400">{formatDate(ref.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ReferralFormModal clients={clients}
          onSubmit={body => createMut.mutate(body)}
          onClose={() => setShowForm(false)}
          isPending={createMut.isPending} />
      )}
    </div>
  )
}

function ReferralFormModal({ clients, onSubmit, onClose, isPending }) {
  const [form, setForm] = useState({ referrer_client_id: '', referred_client_id: '' })
  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ referrer_client_id: +form.referrer_client_id, referred_client_id: +form.referred_client_id })
  }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <h2 className="text-[17px] font-bold text-slate-800">Add Referral</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Referring Client">
            <select required className={inp} value={form.referrer_client_id}
              onChange={e => setForm(f => ({ ...f, referrer_client_id: e.target.value }))}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </Field>
          <Field label="New (Referred) Client">
            <select required className={inp} value={form.referred_client_id}
              onChange={e => setForm(f => ({ ...f, referred_client_id: e.target.value }))}>
              <option value="">Select client…</option>
              {clients.filter(c => c.id !== +form.referrer_client_id).map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
              {isPending ? 'Saving…' : 'Add Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: () => api.get('/loyalty/settings').then(r => r.data),
  })

  const [form, setForm] = useState({
    earn_per_dollar: 1.0,
    earn_per_visit: 0, earn_per_visit_mode: 'every',
    earn_per_review: 0,
    earn_per_booking: 0, earn_per_booking_mode: 'every',
    min_spend_threshold: 0, points_expiry_months: 12,
    eligible_all_services: true, terms: '',
  })

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings])

  const saveMut = useMutation({
    mutationFn: body => api.put('/loyalty/settings', body),
    onSuccess: () => {
      qc.invalidateQueries(['loyalty-settings'])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size={6} /></div>
  }

  // Live simulator
  const simSpend = 100
  const simPts = Math.floor(simSpend * (form.earn_per_dollar || 0))
    + (form.earn_per_visit_mode === 'every' ? (form.earn_per_visit || 0) : 0)
  const simBookPts = form.earn_per_booking_mode === 'every' ? (form.earn_per_booking || 0) : 0

  const earnActions = [
    { key: 'earn_per_visit',   modeKey: 'earn_per_visit_mode',   icon: '✅', label: 'Completing a visit',    modeEvery: 'Every visit',     modeFirst: 'First visit only' },
    { key: 'earn_per_booking', modeKey: 'earn_per_booking_mode', icon: '📅', label: 'Booking online',        modeEvery: 'Every booking',   modeFirst: 'First booking only' },
    { key: 'earn_per_review',  modeKey: null,                    icon: '⭐', label: 'Leaving a review',      modeEvery: null,              modeFirst: null },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

      {/* Left: Config */}
      <form onSubmit={e => { e.preventDefault(); saveMut.mutate(form) }} className="space-y-5">

        {/* ── Section: How clients earn ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4 bg-gradient-to-r from-[#0D9488]/5 to-transparent border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800">How clients earn points</p>
              <p className="text-[12px] text-slate-400">Configure earn rates for each action</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Per-dollar */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center shrink-0">
                <CircleDollarSign size={18} className="text-[#0D9488]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-slate-800">Points per $1 spent</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Every time a client pays, they earn this many points per dollar.
                  {form.earn_per_dollar > 0 && (
                    <span className="text-[#0D9488] font-semibold"> A $50 visit earns {Math.floor(50 * form.earn_per_dollar)} pts.</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-50 rounded-xl overflow-hidden shadow-sm">
                  <button type="button" onClick={() => setForm(f => ({ ...f, earn_per_dollar: Math.max(0, +(f.earn_per_dollar - 0.5).toFixed(1)) }))}
                    className="w-9 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-[18px] font-light">−</button>
                  <input type="number" min="0" step="0.5"
                    className="w-14 h-10 text-center text-[14px] font-bold text-slate-800 bg-transparent outline-none"
                    value={form.earn_per_dollar}
                    onChange={e => setForm(f => ({ ...f, earn_per_dollar: parseFloat(e.target.value) || 0 }))} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, earn_per_dollar: +(f.earn_per_dollar + 0.5).toFixed(1) }))}
                    className="w-9 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors text-[18px] font-light">+</button>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">pts / $1</span>
              </div>
            </div>

            <div className="h-px bg-slate-50" />

            {/* Bonus actions */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                Bonus points for actions
                <span className="font-normal normal-case tracking-normal text-slate-400 text-[11px]">— set 0 to disable</span>
              </p>
              <div className="space-y-3">
                {earnActions.map(({ key, modeKey, icon, label, modeEvery, modeFirst }) => (
                  <div key={key} className="rounded-xl overflow-hidden border border-slate-100">
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50/60">
                      <span className="text-[17px] shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700">{label}</p>
                        {modeKey && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {form[modeKey] === 'first_only' ? 'One-time — first occurrence only' : 'Recurring — every time'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center bg-white rounded-lg overflow-hidden shadow-sm border border-slate-100">
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, [key]: Math.max(0, (f[key] || 0) - 5) }))}
                            className="w-7 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors text-[14px]">−</button>
                          <input type="number" min="0"
                            className="w-12 h-8 text-center text-[13px] font-bold text-slate-800 bg-transparent outline-none"
                            value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))} />
                          <button type="button"
                            onClick={() => setForm(f => ({ ...f, [key]: (f[key] || 0) + 5 }))}
                            className="w-7 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors text-[14px]">+</button>
                        </div>
                        <span className="text-[11px] text-slate-400">pts</span>
                      </div>
                    </div>
                    {modeKey && form[key] > 0 && (
                      <div className="flex gap-0 border-t border-slate-100">
                        {[
                          { value: 'every',      label: modeEvery },
                          { value: 'first_only', label: modeFirst },
                        ].map(opt => (
                          <button type="button" key={opt.value}
                            onClick={() => setForm(f => ({ ...f, [modeKey]: opt.value }))}
                            className={`flex-1 py-2.5 text-[12px] font-semibold transition-all ${
                              form[modeKey] === opt.value
                                ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]'
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-50" />

            {/* Min spend */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-slate-800">Minimum bill to earn points</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Set to $0 to always award points regardless of bill size.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] text-slate-400 font-semibold">$</span>
                <div className="flex items-center bg-slate-50 rounded-xl overflow-hidden shadow-sm">
                  <button type="button" onClick={() => setForm(f => ({ ...f, min_spend_threshold: Math.max(0, (f.min_spend_threshold || 0) - 5) }))}
                    className="w-9 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-[18px] font-light">−</button>
                  <input type="number" min="0" step="1"
                    className="w-14 h-10 text-center text-[14px] font-bold text-slate-800 bg-transparent outline-none"
                    value={form.min_spend_threshold}
                    onChange={e => setForm(f => ({ ...f, min_spend_threshold: parseFloat(e.target.value) || 0 }))} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, min_spend_threshold: (f.min_spend_threshold || 0) + 5 }))}
                    className="w-9 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-[18px] font-light">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Points expiry ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-500/5 to-transparent border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800">Points expiry</p>
              <p className="text-[12px] text-slate-400">How long before unused points expire</p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {[
              { value: 0,  label: 'Never expire',   icon: '♾️', desc: 'Points last forever' },
              { value: 12, label: 'After 12 months', icon: '📅', desc: 'Annual re-engagement' },
              { value: 24, label: 'After 24 months', icon: '⏳', desc: 'Gentle 2-year nudge' },
            ].map(opt => (
              <label key={opt.value}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all text-center ${
                  form.points_expiry_months === opt.value
                    ? 'bg-[#F0FDFA] shadow-[0_0_0_2px_#0D9488]'
                    : 'bg-slate-50 hover:bg-slate-100/70'
                }`}>
                <input type="radio" name="expiry" className="sr-only"
                  checked={form.points_expiry_months === opt.value}
                  onChange={() => setForm(f => ({ ...f, points_expiry_months: opt.value }))} />
                <span className="text-[22px]">{opt.icon}</span>
                <p className={`text-[12px] font-bold leading-tight ${form.points_expiry_months === opt.value ? 'text-[#0D9488]' : 'text-slate-700'}`}>{opt.label}</p>
                <p className="text-[10px] text-slate-400">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* ── Section: Terms ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-500/5 to-transparent border-b border-slate-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800">Program Terms <span className="font-normal text-[12px] text-slate-400">— optional</span></p>
              <p className="text-[12px] text-slate-400">Shown to clients in their loyalty wallet</p>
            </div>
          </div>
          <div className="p-6">
            <textarea rows={4}
              className="w-full px-4 py-3 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white resize-none text-slate-700 leading-relaxed border border-transparent focus:border-[#0D9488]/20"
              value={form.terms || ''}
              onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
              placeholder="e.g. Points are earned on services only. Cannot be exchanged for cash." />
          </div>
        </div>

        {/* Save */}
        <button type="submit" disabled={saveMut.isPending}
          className={`w-full py-3.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 active:scale-[0.99] ${
            saved ? 'bg-emerald-500 text-white' : 'text-white'
          }`}
          style={saved ? {} : { background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
          {saved ? <><Check size={16} /> Saved!</> : saveMut.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* Right: Live Simulator */}
      <div className="space-y-4">
        <div className="sticky top-6">
          {/* Points simulator card */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.04)]">
            <div className="px-5 py-4 border-b border-slate-50">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Live Preview</p>
              <p className="text-[13px] text-slate-700 mt-0.5">A <strong>$100</strong> visit earns…</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Spending points */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDollarSign size={14} className="text-[#0D9488]" />
                  <span className="text-[12px] text-slate-600">$100 × {form.earn_per_dollar} rate</span>
                </div>
                <span className="text-[14px] font-bold text-slate-800">+{Math.floor(100 * (form.earn_per_dollar || 0))}</span>
              </div>
              {form.earn_per_visit > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">✅</span>
                    <span className="text-[12px] text-slate-600">
                      Visit bonus{form.earn_per_visit_mode === 'first_only' ? ' (first visit)' : ''}
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-slate-800">
                    {form.earn_per_visit_mode === 'first_only' ? '(once)' : `+${form.earn_per_visit}`}
                  </span>
                </div>
              )}
              {form.earn_per_booking > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">📅</span>
                    <span className="text-[12px] text-slate-600">
                      Booking bonus{form.earn_per_booking_mode === 'first_only' ? ' (first booking)' : ''}
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-slate-800">
                    {form.earn_per_booking_mode === 'first_only' ? '(once)' : `+${form.earn_per_booking}`}
                  </span>
                </div>
              )}
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between bg-[#F0FDFA] rounded-xl px-4 py-3">
                <span className="text-[13px] font-bold text-slate-600">Total this visit</span>
                <span className="text-[22px] font-black text-[#0D9488]">{simPts + simBookPts} pts</span>
              </div>
              {form.min_spend_threshold > 0 && (
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠️ Bills under ${form.min_spend_threshold} earn no points
                </p>
              )}
              {form.points_expiry_months > 0 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Points expire after {form.points_expiry_months} months of inactivity
                </p>
              )}
            </div>
          </div>

          {/* How it works explainer */}
          <div className="mt-4 rounded-2xl p-5 bg-gradient-to-br from-[#0D9488]/8 to-indigo-50/60">
            <p className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Heart size={12} className="text-[#0D9488]" />
              Why loyalty programs work
            </p>
            <ul className="space-y-2">
              {[
                'Loyalty members visit 35% more often',
                'Points create emotional attachment',
                'Rewards drive rebooking at checkout',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-[12px] text-slate-600">
                  <span className="w-4 h-4 rounded-full bg-[#0D9488]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={9} className="text-[#0D9488]" />
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Client Loyalty Modal ──────────────────────────────────────────────────────
function ClientLoyaltyModal({ client: c, tiers, onClose }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState(null)
  const [form, setForm] = useState({ points: '', note: '' })
  const balance = c.loyalty_points ?? c.loyalty_balance ?? 0

  const sortedTiers = [...tiers].sort((a, b) => a.min_points - b.min_points)
  const currentTierIdx = sortedTiers.reduce((idx, t, i) => (balance >= t.min_points ? i : idx), -1)
  const currentTier = sortedTiers[currentTierIdx]
  const nextTier = sortedTiers[currentTierIdx + 1]
  const progressPct = nextTier
    ? Math.min(100, Math.round(((balance - (currentTier?.min_points ?? 0)) / (nextTier.min_points - (currentTier?.min_points ?? 0))) * 100))
    : 100

  const tierCfg = TIER_CONFIG[currentTier?.name] ?? { from: '#0D9488', to: '#6366F1', light: '#F0FDFA', text: '#0F766E' }

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['loyalty-history', c.id],
    queryFn: () => api.get(`/clients/${c.id}/loyalty/history`).then(r => r.data),
  })
  const { data: clientRewards = [] } = useQuery({
    queryKey: ['client-rewards', c.id],
    queryFn: () => api.get(`/clients/${c.id}/rewards`).then(r => r.data),
  })
  const { data: rewardsCatalog = [] } = useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: () => api.get('/loyalty/rewards').then(r => r.data),
  })

  const earnMutation = useMutation({
    mutationFn: body => api.post('/loyalty/earn', body),
    onSuccess: () => {
      qc.invalidateQueries(['clients'])
      qc.invalidateQueries(['loyalty-history', c.id])
      qc.invalidateQueries(['client-rewards', c.id])
      setMode(null); setForm({ points: '', note: '' })
    },
  })
  const redeemMutation = useMutation({
    mutationFn: body => api.post('/loyalty/redeem', body),
    onSuccess: () => {
      qc.invalidateQueries(['clients'])
      qc.invalidateQueries(['loyalty-history', c.id])
      setMode(null); setForm({ points: '', note: '' })
    },
  })
  const grantRewardMut = useMutation({
    mutationFn: body => api.post(`/clients/${c.id}/rewards`, body),
    onSuccess: () => qc.invalidateQueries(['client-rewards', c.id]),
  })

  const availableRewards = clientRewards.filter(r => r.status === 'available')
  const usedRewards = clientRewards.filter(r => r.status !== 'available')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Gradient header */}
        <div className="relative overflow-hidden px-6 py-5 shrink-0"
          style={{ background: `linear-gradient(135deg, ${tierCfg.from}, ${tierCfg.to})` }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/8" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                {initials(`${c.first_name} ${c.last_name}`)}
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-white">{c.first_name} {c.last_name}</h2>
                <p className="text-white/70 text-[12px]">{currentTier?.name ?? 'No tier'} · {balance.toLocaleString()} points</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors">
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Tier progress bar */}
          <div className="relative z-10 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/70 font-medium">{currentTier?.name ?? 'Start'}</span>
              {nextTier
                ? <span className="text-[11px] text-white/70">{(nextTier.min_points - balance).toLocaleString()} pts to {nextTier.name}</span>
                : <span className="text-[11px] text-white font-bold">Highest tier!</span>
              }
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Action buttons */}
          {!mode && (
            <div className="flex gap-3 p-4 border-b border-slate-50">
              <button onClick={() => { setMode('earn'); setForm({ points: '', note: '' }) }}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
                <Zap size={14} /> Award Points
              </button>
              <button onClick={() => { setMode('redeem'); setForm({ points: '', note: '' }) }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
                <Gift size={14} /> Redeem Points
              </button>
            </div>
          )}

          {mode === 'earn' && (
            <form onSubmit={e => { e.preventDefault(); earnMutation.mutate({ client_id: c.id, points: +form.points, note: form.note }) }}
              className="p-4 border-b border-slate-50 bg-[#F0FDFA]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-slate-700">Award Points</p>
                <button type="button" onClick={() => setMode(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Points">
                  <input required type="number" min="1" value={form.points}
                    onChange={e => setForm(f => ({ ...f, points: e.target.value }))} className={inp} placeholder="e.g. 50" />
                </Field>
                <Field label="Note (optional)">
                  <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inp} placeholder="Birthday bonus" />
                </Field>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode(null)} className="flex-1 py-2 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-white">Cancel</button>
                <button type="submit" disabled={earnMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
                  {earnMutation.isPending ? 'Saving…' : 'Award Points'}
                </button>
              </div>
            </form>
          )}

          {mode === 'redeem' && (
            <form onSubmit={e => { e.preventDefault(); redeemMutation.mutate({ client_id: c.id, points: +form.points }) }}
              className="p-4 border-b border-slate-50 bg-amber-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-slate-700">Redeem Points</p>
                <button type="button" onClick={() => setMode(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
              <div className="mb-3">
                <Field label={`Points to redeem (max ${balance})`}>
                  <input required type="number" min="1" max={balance} value={form.points}
                    onChange={e => setForm(f => ({ ...f, points: e.target.value }))} className={inp} placeholder={`Max ${balance}`} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode(null)} className="flex-1 py-2 rounded-xl border border-amber-200 text-[12px] font-semibold text-slate-600 hover:bg-white">Cancel</button>
                <button type="submit" disabled={redeemMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-bold hover:bg-amber-600 disabled:opacity-60">
                  {redeemMutation.isPending ? 'Saving…' : 'Redeem Points'}
                </button>
              </div>
            </form>
          )}

          {/* Rewards wallet */}
          <div className="p-4 border-b border-slate-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Rewards Wallet</p>
              {rewardsCatalog.length > 0 && (
                <div className="relative group">
                  <button className="text-[12px] text-[#0D9488] font-bold hover:underline flex items-center gap-1">
                    <Plus size={12} /> Grant reward
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-100 shadow-xl z-10 hidden group-hover:block overflow-hidden">
                    {rewardsCatalog.map(rw => (
                      <button key={rw.id} onClick={() => grantRewardMut.mutate({ reward_id: rw.id })}
                        className="w-full text-left px-3 py-2.5 text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Gift size={12} className="text-[#0D9488]" /> {rw.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {availableRewards.length === 0 ? (
              <p className="text-[12px] text-slate-400 py-1">No rewards available</p>
            ) : (
              <div className="space-y-2">
                {availableRewards.map(rw => {
                  const meta = REWARD_TYPE_META[rw.reward_type] ?? REWARD_TYPE_META.amount_off
                  const TypeIcon = meta.icon
                  return (
                    <div key={rw.id} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>
                        <TypeIcon size={13} className="text-white" />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-700 flex-1">{rw.reward_name}</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Available</span>
                    </div>
                  )
                })}
                {usedRewards.slice(0, 2).map(rw => (
                  <div key={rw.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 opacity-50">
                    <Check size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] text-slate-500 flex-1 line-through">{rw.reward_name}</span>
                    <span className="text-[10px] text-slate-400">Used</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Transaction History</p>
            {loadingHistory ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Star size={22} className="mx-auto mb-2 opacity-30" />
                <p className="text-[13px]">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {history.map((tx, i) => (
                  <div key={tx.id ?? i}
                    className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-[13px] font-medium text-slate-700">{tx.note || tx.type || 'Transaction'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                    </div>
                    <span className={`text-[14px] font-bold ${tx.points > 0 ? 'text-[#0D9488]' : 'text-red-500'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
