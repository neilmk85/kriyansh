import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, Infinity, Repeat, CreditCard } from 'lucide-react'
import api from '@/lib/api'

const CYCLE_LABEL = { monthly: '/mo', weekly: '/wk', fortnightly: '/2wk', quarterly: '/qtr', annual: '/yr' }

// Darken a hex colour for the gradient end
function darken(hex, amt = 40) {
  const n = parseInt((hex || '#0D9488').replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amt)
  const g = Math.max(0, ((n >> 8) & 0xff) - amt)
  const b = Math.max(0, (n & 0xff) - amt)
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

export default function Memberships() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('all')
  const [deleteId, setDeleteId] = useState(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => api.get('/membership-plans').then(r => r.data),
  })

  const toggleMut = useMutation({
    mutationFn: id => api.patch(`/membership-plans/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries(['membership-plans']),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/membership-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries(['membership-plans']); setDeleteId(null) },
  })

  const filtered = plans.filter(p =>
    tab === 'all'      ? true :
    tab === 'active'   ? p.is_active :
    !p.is_active
  )

  const activeCount   = plans.filter(p =>  p.is_active).length
  const inactiveCount = plans.filter(p => !p.is_active).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Membership Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage recurring membership plans</p>
        </div>
        <button
          onClick={() => navigate('/memberships/add')}
          className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-sm font-semibold  transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Plan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'all',      label: `All (${plans.length})`          },
          { key: 'active',   label: `Active (${activeCount})`        },
          { key: 'inactive', label: `Deactivated (${inactiveCount})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
          <BadgeCheck size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {tab === 'inactive' ? 'No deactivated plans' : 'No plans yet'}
          </p>
          {tab !== 'inactive' && (
            <button
              onClick={() => navigate('/memberships/add')}
              className="mt-4 px-4 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-sm font-semibold  transition-colors"
            >
              + Create First Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(plan => {
            const color      = plan.color || '#0D9488'
            const colorDark  = darken(color, 35)
            const cycleKey   = plan.payment_frequency || plan.billing_cycle || 'monthly'
            const cycleSuffix = plan.payment_type === 'one_time'
              ? 'one-time'
              : (CYCLE_LABEL[cycleKey] ?? '/mo')

            return (
              <div
                key={plan.id}
                className={`rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 ${
                  !plan.is_active ? 'opacity-55 grayscale' : ''
                }`}
              >
                {/* Gradient header */}
                <div
                  className="px-5 pt-5 pb-6 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, ${colorDark} 100%)`,
                  }}
                >
                  {/* Decorative circles */}
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 bg-white" />
                  <div className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full opacity-10 bg-white" />

                  {/* Status badge */}
                  {!plan.is_active && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/20 text-white/80 uppercase tracking-wide">
                      Inactive
                    </span>
                  )}

                  <BadgeCheck size={28} className="text-white/80 mb-3 relative z-10" />
                  <h3 className="text-[17px] font-black text-white leading-tight relative z-10">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-[12px] text-white/70 mt-1 line-clamp-2 relative z-10">{plan.description}</p>
                  )}

                  {/* Price */}
                  <div className="mt-4 relative z-10 flex items-end justify-between">
                    <div>
                      <span className="text-[28px] font-black text-white leading-none">
                        ${parseFloat(plan.price).toFixed(2)}
                      </span>
                      <span className="text-[13px] text-white/70 ml-1">{cycleSuffix}</span>
                    </div>
                    {/* Member count badge */}
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-1.5 rounded-xl">
                      <Users size={13} className="text-white/80" />
                      <span className="text-[13px] font-bold text-white leading-none">
                        {plan.active_member_count ?? 0}
                      </span>
                      <span className="text-[11px] text-white/70 leading-none">
                        {plan.active_member_count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* White body */}
                <div className="bg-white px-5 py-4 space-y-3">
                  {/* Pills row */}
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className="text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {plan.payment_type === 'one_time' ? 'One-time' : cycleKey}
                    </span>
                    {plan.service_discount_pct > 0 && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {plan.service_discount_pct}% off
                      </span>
                    )}
                    {plan.sessions_type === 'limited' && plan.sessions_count > 0 ? (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                        <Users size={10} />
                        {plan.sessions_count} sessions
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                        <Infinity size={10} />
                        Unlimited
                      </span>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <button
                      onClick={() => toggleMut.mutate(plan.id)}
                      disabled={toggleMut.isPending}
                      title={plan.is_active ? 'Deactivate' : 'Activate'}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    >
                      {plan.is_active
                        ? <ToggleRight size={22} style={{ color }} />
                        : <ToggleLeft  size={22} />
                      }
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/memberships/${plan.id}/edit`)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(plan.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
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

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 mb-1">Delete Plan?</h3>
            <p className="text-[13px] text-slate-500 mb-5">
              This plan will be permanently removed. Existing client subscriptions are not affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteId)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
