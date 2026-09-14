import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Users, Infinity, Repeat, CreditCard, AlertTriangle, RotateCcw,
  Clock, ChevronRight, CalendarDays, TrendingUp,
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const CYCLE_LABEL = { monthly: '/mo', weekly: '/wk', fortnightly: '/2wk', quarterly: '/qtr', annual: '/yr' }

function darken(hex, amt = 40) {
  const n = parseInt((hex || '#0D9488').replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amt)
  const g = Math.max(0, ((n >> 8) & 0xff) - amt)
  const b = Math.max(0, (n & 0xff) - amt)
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function expiryBadge(daysLeft) {
  if (daysLeft < 0) return null
  if (daysLeft === 0) return { label: 'Expires today', cls: 'bg-red-100 text-red-600' }
  if (daysLeft <= 7)  return { label: `${daysLeft}d left`, cls: 'bg-red-100 text-red-600' }
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, cls: 'bg-amber-100 text-amber-700' }
  return { label: `${daysLeft}d left`, cls: 'bg-green-100 text-green-700' }
}

export default function Memberships() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [mainTab,  setMainTab]  = useState('plans') // plans | members
  const [planTab,  setPlanTab]  = useState('all')
  const [deleteId, setDeleteId] = useState(null)
  const [renewingId, setRenewingId] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => api.get('/membership-plans').then(r => r.data),
  })

  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['memberships-active'],
    queryFn: () => api.get('/memberships/active').then(r => r.data),
    enabled: mainTab === 'members',
  })
  const members = membersData?.memberships ?? []
  const mrr     = membersData?.mrr ?? {}

  const toggleMut = useMutation({
    mutationFn: id => api.patch(`/membership-plans/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries(['membership-plans']),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/membership-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries(['membership-plans']); setDeleteId(null) },
  })

  async function handleRenew(clientId) {
    setRenewingId(clientId)
    try {
      await api.post(`/clients/${clientId}/membership/renew`)
      refetchMembers()
    } finally {
      setRenewingId(null)
    }
  }

  async function handleCancel(clientId) {
    setCancelingId(null)
    await api.patch(`/clients/${clientId}/membership`, { status: 'cancelled' })
    refetchMembers()
  }

  const filtered = plans.filter(p =>
    planTab === 'all' ? true : planTab === 'active' ? p.is_active : !p.is_active
  )
  const activeCount   = plans.filter(p =>  p.is_active).length
  const inactiveCount = plans.filter(p => !p.is_active).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-800">Memberships</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Plans, active subscriptions and renewal tracking</p>
        </div>
        {mainTab === 'plans' && (
          <button onClick={() => navigate('/admin/memberships/add')}
            className="flex items-center gap-2 px-4 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold transition-colors">
            <Plus size={15} /> New Plan
          </button>
        )}
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'plans',   label: 'Plans' },
          { key: 'members', label: `Members${mrr.active_count > 0 ? ` (${mrr.active_count})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className={`px-5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
              mainTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLANS TAB ─────────────────────────────────────────────────────── */}
      {mainTab === 'plans' && (
        <>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {[
              { key: 'all',      label: `All (${plans.length})`          },
              { key: 'active',   label: `Active (${activeCount})`        },
              { key: 'inactive', label: `Off (${inactiveCount})` },
            ].map(t => (
              <button key={t.key} onClick={() => setPlanTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  planTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
              <BadgeCheck size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{planTab === 'inactive' ? 'No inactive plans' : 'No plans yet'}</p>
              {planTab !== 'inactive' && (
                <button onClick={() => navigate('/admin/memberships/add')}
                  className="mt-4 px-4 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[13px] font-semibold">
                  + Create First Plan
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(plan => {
                const color      = plan.color || '#0D9488'
                const colorDark  = darken(color, 35)
                const cycleKey   = plan.payment_frequency || plan.billing_cycle || 'monthly'
                const cycleSuffix = plan.payment_type === 'one_time' ? 'one-time' : (CYCLE_LABEL[cycleKey] ?? '/mo')
                return (
                  <div key={plan.id}
                    className={`rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all ${!plan.is_active ? 'opacity-55 grayscale' : ''}`}>
                    <div className="px-5 pt-5 pb-6 relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)` }}>
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 bg-white" />
                      <div className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full opacity-10 bg-white" />
                      {!plan.is_active && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/20 text-white/80 uppercase tracking-wide">Inactive</span>
                      )}
                      <BadgeCheck size={26} className="text-white/80 mb-3 relative z-10" />
                      <h3 className="text-[17px] font-black text-white leading-tight relative z-10">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-[12px] text-white/70 mt-1 line-clamp-2 relative z-10">{plan.description}</p>
                      )}
                      <div className="mt-4 relative z-10 flex items-end justify-between">
                        <div>
                          <span className="text-[28px] font-black text-white leading-none">${parseFloat(plan.price).toFixed(2)}</span>
                          <span className="text-[13px] text-white/70 ml-1">{cycleSuffix}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-xl">
                          <Users size={12} className="text-white/80" />
                          <span className="text-[13px] font-bold text-white leading-none">{plan.active_member_count ?? 0}</span>
                          <span className="text-[11px] text-white/70 leading-none">members</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white px-5 py-4 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize" style={{ backgroundColor: `${color}18`, color }}>
                          {plan.payment_type === 'one_time' ? 'One-time' : cycleKey}
                        </span>
                        {plan.service_discount_pct > 0 && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{plan.service_discount_pct}% off</span>
                        )}
                        {plan.sessions_type === 'limited' && plan.sessions_count > 0 ? (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                            <Users size={10} /> {plan.sessions_count} sessions
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                            <Infinity size={10} /> Unlimited
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                        <button onClick={() => toggleMut.mutate(plan.id)} disabled={toggleMut.isPending}
                          title={plan.is_active ? 'Deactivate' : 'Activate'}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                          {plan.is_active ? <ToggleRight size={22} style={{ color }} /> : <ToggleLeft size={22} />}
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/admin/memberships/${plan.id}/edit`)} title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleteId(plan.id)} title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── MEMBERS TAB ───────────────────────────────────────────────────── */}
      {mainTab === 'members' && (
        <>
          {/* MRR summary bar */}
          {mrr.active_count > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <MRRCard label="Monthly Revenue" value={formatCurrency(mrr.monthly_mrr ?? 0)} icon={TrendingUp} color="#0D9488" />
              <MRRCard label="Active Members"  value={mrr.active_count ?? 0}                icon={Users}      color="#6366F1" />
              <MRRCard label="Paused"          value={mrr.paused_count ?? 0}               icon={Clock}      color="#F59E0B" />
            </div>
          )}

          {membersLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
              <Users size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No active members yet</p>
              <p className="text-[12px] text-slate-400 mt-1">Assign a membership to a client from their profile</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="space-y-3 lg:hidden">
                {members.map(m => {
                  const badge = expiryBadge(m.days_left)
                  const urgent = m.days_left >= 0 && m.days_left <= 7
                  return (
                    <div key={m.id} className={`bg-white rounded-2xl border p-4 ${urgent ? 'border-red-200' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-bold text-slate-800">{m.client_name}</p>
                          <p className="text-[12px] text-slate-400">{m.client_phone}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-slate-700">{m.plan_name}</p>
                          <p className="text-[12px] text-slate-400">{formatCurrency(m.price)}{CYCLE_LABEL[m.billing_cycle] ?? '/mo'}</p>
                        </div>
                        {badge && (
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${badge.cls}`}>
                            <CalendarDays size={10} /> {badge.label}
                          </span>
                        )}
                      </div>
                      {m.visit_count > 0 && (
                        <p className="text-[11px] text-slate-400 mt-1">{m.visit_count} discounted visit{m.visit_count !== 1 ? 's' : ''} since joining</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleRenew(m.client_id)} disabled={renewingId === m.client_id}
                          className="flex-1 py-2 rounded-xl border border-[#0D9488] text-[#0D9488] text-[12px] font-semibold hover:bg-[#F0FDFA] disabled:opacity-60 transition-colors flex items-center justify-center gap-1">
                          <RotateCcw size={12} /> {renewingId === m.client_id ? 'Renewing…' : 'Renew'}
                        </button>
                        <button onClick={() => setCancelingId(m.client_id)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 text-[12px] font-semibold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Client', 'Plan', 'Price', 'Status', 'Visits', 'Expires', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {members.map(m => {
                      const badge = expiryBadge(m.days_left)
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-[13px] font-semibold text-slate-800">{m.client_name}</p>
                            <p className="text-[11px] text-slate-400">{m.client_phone}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-700 font-medium">{m.plan_name}</td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-600">{formatCurrency(m.price)}{CYCLE_LABEL[m.billing_cycle] ?? '/mo'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-500">{m.visit_count ?? 0}</td>
                          <td className="px-5 py-3.5">
                            {badge ? (
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${badge.cls}`}>
                                <CalendarDays size={10} /> {badge.label}
                              </span>
                            ) : (
                              <span className="text-[12px] text-slate-400">{m.next_billing_date || '—'}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleRenew(m.client_id)} disabled={renewingId === m.client_id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#0D9488] text-[#0D9488] text-[11px] font-semibold hover:bg-[#F0FDFA] disabled:opacity-60 transition-colors">
                                <RotateCcw size={11} /> {renewingId === m.client_id ? '…' : 'Renew'}
                              </button>
                              <button onClick={() => setCancelingId(m.client_id)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-[11px] font-semibold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Delete plan confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Delete Plan?</h3>
            <p className="text-[13px] text-slate-500 mb-5">This plan will be permanently removed. Existing client subscriptions are not affected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-[13px] font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel membership confirm */}
      {cancelingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Cancel Membership?</h3>
            <p className="text-[13px] text-slate-500 mb-5">The client will lose their member benefits immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelingId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Keep
              </button>
              <button onClick={() => handleCancel(cancelingId)}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-[13px] font-semibold hover:bg-amber-600 transition-colors">
                Cancel Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MRRCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[18px] font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
