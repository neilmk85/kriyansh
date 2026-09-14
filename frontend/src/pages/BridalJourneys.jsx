import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, Calendar, User, ChevronRight, CheckCircle2, Clock, XCircle, X } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  pending:   { label: 'Upcoming',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  booked:    { label: 'Booked',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  completed: { label: 'Done',      cls: 'bg-green-50 text-green-700 border-green-200' },
  skipped:   { label: 'Skipped',   cls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

const JOURNEY_STATUS_STYLE = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function daysLeftLabel(days) {
  if (days < 0)  return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today!'
  if (days === 1) return 'Tomorrow!'
  return `${days} days`
}

function daysLeftColor(days) {
  if (days < 0)   return 'text-gray-400'
  if (days <= 7)  return 'text-red-600 font-bold'
  if (days <= 30) return 'text-amber-600 font-semibold'
  return 'text-gray-600'
}

// ── Milestone timeline ────────────────────────────────────────────────────────

function MilestoneTimeline({ milestones, journeyID, onUpdated }) {
  const qc = useQueryClient()

  const update = useMutation({
    mutationFn: ({ mid, status }) =>
      api.patch(`/api/v1/bridal/${journeyID}/milestones/${mid}`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bridal', journeyID] })
      qc.invalidateQueries({ queryKey: ['bridal-list'] })
      onUpdated?.()
    },
  })

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-pink-100" />

      <div className="space-y-4">
        {milestones.map((m, i) => {
          const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.pending
          const isLast = i === milestones.length - 1
          return (
            <div key={m.id} className="relative">
              {/* Timeline dot */}
              <div className={cn(
                'absolute -left-8 top-3 w-3 h-3 rounded-full border-2',
                m.status === 'completed' ? 'bg-green-500 border-green-500' :
                m.status === 'skipped'   ? 'bg-gray-300 border-gray-300' :
                m.status === 'booked'    ? 'bg-indigo-500 border-indigo-500' :
                'bg-white border-pink-300'
              )} />

              <div className={cn(
                'rounded-xl border p-4 transition-colors',
                m.status === 'completed' ? 'bg-green-50 border-green-200' :
                m.status === 'skipped'   ? 'bg-gray-50 border-gray-200 opacity-60' :
                'bg-white border-gray-200 hover:border-pink-200'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-[14px] font-semibold', m.status === 'skipped' ? 'text-gray-400 line-through' : 'text-gray-900')}>
                        {m.label}
                      </p>
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border', st.cls)}>
                        {st.label}
                      </span>
                      {m.reminder_sent && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-200">
                          Reminded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[12px] text-gray-400">
                        <Calendar size={11} className="inline mr-1" />
                        {m.scheduled_date}
                      </p>
                      <p className="text-[12px] text-pink-500 font-medium">
                        {m.days_before} days before wedding
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {m.status !== 'skipped' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.status !== 'completed' && (
                        <button
                          onClick={() => update.mutate({ mid: m.id, status: 'completed' })}
                          disabled={update.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 text-white text-[11px] font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 size={12} /> Done
                        </button>
                      )}
                      {m.status === 'pending' && (
                        <button
                          onClick={() => update.mutate({ mid: m.id, status: 'booked' })}
                          disabled={update.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-[11px] font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                        >
                          <Clock size={12} /> Book
                        </button>
                      )}
                      {m.status !== 'completed' && (
                        <button
                          onClick={() => update.mutate({ mid: m.id, status: 'skipped' })}
                          disabled={update.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 text-[11px] font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          <XCircle size={12} /> Skip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Journey detail panel ──────────────────────────────────────────────────────

function JourneyDetail({ journeyId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bridal', journeyId],
    queryFn: () => api.get(`/api/v1/bridal/${journeyId}`).then(r => r.data),
    enabled: !!journeyId,
  })
  const qc = useQueryClient()

  const cancel = useMutation({
    mutationFn: () => api.patch(`/api/v1/bridal/${journeyId}/cancel`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bridal-list'] })
      qc.invalidateQueries({ queryKey: ['bridal', journeyId] })
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!data) return null

  const completed = (data.milestones ?? []).filter(m => m.status === 'completed').length
  const total = (data.milestones ?? []).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart size={16} fill="white" />
              <p className="text-[13px] font-medium opacity-90">Bridal Journey</p>
            </div>
            <h2 className="text-xl font-bold">{data.client_name}</h2>
            <p className="text-[13px] opacity-80 mt-0.5">Wedding: {data.wedding_date}</p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-bold', data.days_left <= 7 ? 'text-yellow-300' : 'text-white')}>
              {daysLeftLabel(data.days_left)}
            </p>
            <p className="text-[11px] opacity-70">until the big day</p>
            <button onClick={onClose} className="mt-2 p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1 opacity-80">
            <span>{completed}/{total} milestones completed</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {data.notes && (
          <div className="rounded-lg bg-pink-50 border border-pink-100 px-4 py-3 text-[13px] text-gray-600 italic">
            "{data.notes}"
          </div>
        )}

        <MilestoneTimeline
          milestones={data.milestones ?? []}
          journeyID={journeyId}
        />

        {data.status === 'active' && (
          <button
            onClick={() => { if (confirm('Cancel this bridal journey?')) cancel.mutate() }}
            disabled={cancel.isPending}
            className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Cancel Journey
          </button>
        )}
      </div>
    </div>
  )
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose }) {
  const qc = useQueryClient()
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [weddingDate, setWeddingDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: clients } = useQuery({
    queryKey: ['clients-search', clientSearch],
    queryFn: () => api.get(`/api/v1/clients?q=${encodeURIComponent(clientSearch)}`).then(r => r.data),
    enabled: clientSearch.length >= 2,
  })

  const create = useMutation({
    mutationFn: () => api.post('/api/v1/bridal', {
      client_id: selectedClient.id,
      wedding_date: weddingDate,
      notes,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bridal-list'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-pink-500" fill="#ec4899" />
            <h2 className="text-[16px] font-bold text-gray-900">New Bridal Journey</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Client search */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Bride / Client</label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5">
                <div>
                  <p className="text-[14px] font-semibold text-gray-800">{selectedClient.first_name} {selectedClient.last_name}</p>
                  <p className="text-[11px] text-gray-400">{selectedClient.phone}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search client name…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-50"
                />
                {clients?.length > 0 && clientSearch.length >= 2 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {clients.slice(0, 6).map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch('') }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50 text-left transition-colors">
                        <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-[11px] font-bold text-pink-600 shrink-0">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-800">{c.first_name} {c.last_name}</p>
                          <p className="text-[11px] text-gray-400">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wedding date */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Wedding Date</label>
            <input
              type="date"
              value={weddingDate}
              onChange={e => setWeddingDate(e.target.value)}
              min={new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-50"
            />
          </div>

          {/* Milestone preview */}
          {weddingDate && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Milestone Schedule</p>
              <div className="space-y-1.5">
                {[
                  [90, 'Skin Preparation'],
                  [60, 'Hair Treatment'],
                  [30, 'Facial'],
                  [7,  'Final Grooming'],
                  [1,  'Touch-up'],
                ].map(([days, label]) => {
                  const d = new Date(weddingDate)
                  d.setDate(d.getDate() - days)
                  const past = d < new Date()
                  return (
                    <div key={days} className={cn('flex items-center justify-between text-[12px]', past ? 'opacity-40' : '')}>
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-400 tabular-nums">
                        {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {past && ' (past)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Hair colour preference, skin concerns…"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-50 resize-none"
            />
          </div>

          {create.isError && (
            <p className="text-[12px] text-red-500">{create.error?.response?.data?.error ?? 'Something went wrong'}</p>
          )}

          <button
            onClick={() => create.mutate()}
            disabled={!selectedClient || !weddingDate || create.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {create.isPending ? 'Creating…' : '💍 Create Bridal Journey'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Journey card ──────────────────────────────────────────────────────────────

function JourneyCard({ journey, selected, onClick }) {
  const completed = 0 // list view doesn't have milestones — shown in detail
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        selected
          ? 'border-pink-400 bg-pink-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-50/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-gray-900 truncate">{journey.client_name}</p>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', JOURNEY_STATUS_STYLE[journey.status])}>
              {journey.status}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[12px] text-gray-400">
            <Heart size={10} className="text-pink-300" fill="#fce7f3" />
            <span>{journey.wedding_date}</span>
          </div>
          {journey.client_phone && (
            <p className="text-[11px] text-gray-400 mt-0.5">{journey.client_phone}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-[13px] font-bold tabular-nums', daysLeftColor(journey.days_left))}>
            {daysLeftLabel(journey.days_left)}
          </p>
          <ChevronRight size={14} className="text-gray-300 mt-1 ml-auto" />
        </div>
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BridalJourneys() {
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('active')

  const { data, isLoading } = useQuery({
    queryKey: ['bridal-list'],
    queryFn: () => api.get('/api/v1/bridal').then(r => r.data),
  })

  const filtered = (data ?? []).filter(j =>
    filter === 'all' ? true : j.status === filter
  )

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900">Bridal Journeys</h1>
          </div>
          <p className="text-[13px] text-gray-500 ml-11">Manage wedding prep timelines and milestone reminders</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-semibold text-[13px] hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> New Journey
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {['active', 'completed', 'cancelled', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-colors',
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Journey list */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <Heart size={28} className="mx-auto text-pink-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-400">No {filter} journeys</p>
              {filter === 'active' && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 text-[12px] text-pink-500 font-semibold hover:text-pink-700">
                  + Create the first one
                </button>
              )}
            </div>
          ) : (
            filtered.map(j => (
              <JourneyCard
                key={j.id}
                journey={j}
                selected={selected === j.id}
                onClick={() => setSelected(selected === j.id ? null : j.id)}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <JourneyDetail journeyId={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 h-64 flex flex-col items-center justify-center text-center p-6">
              <Heart size={32} className="text-pink-200 mb-3" />
              <p className="text-[14px] font-medium text-gray-400">Select a journey to see the milestone timeline</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
