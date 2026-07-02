import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box, Plus, Pencil, Trash2, Search, X, ChevronDown,
  Package, Users, AlertCircle, CheckCircle2
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const STATUS_COLORS = {
  active:    'bg-green-100 text-green-700',
  exhausted: 'bg-slate-100 text-slate-500',
  expired:   'bg-red-100 text-red-600',
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl shadow-xl text-[13px] font-semibold">
      <CheckCircle2 size={16} />
      {message}
    </div>
  )
}

export default function Packages() {
  const qc = useQueryClient()
  const [selectedPkg, setSelectedPkg]   = useState(null)
  const [showModal,   setShowModal]     = useState(false)
  const [editPkg,     setEditPkg]       = useState(null)
  const [activeTab,   setActiveTab]     = useState('sell')   // 'sell' | 'active'
  const [toast,       setToast]         = useState(null)
  const [redeemModal, setRedeemModal]   = useState(null)

  // Sell Package state
  const [sellClientSearch, setSellClientSearch] = useState('')
  const [sellClient,       setSellClient]       = useState(null)
  const [sellPkgId,        setSellPkgId]        = useState('')
  const [selling,          setSelling]          = useState(false)
  const [sellSuccess,      setSellSuccess]      = useState(false)

  // Active Packages tab state
  const [activeSearch,     setActiveSearch]     = useState('')
  const [activeClient,     setActiveClient]     = useState(null)

  // Fetch packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn:  () => api.get('/packages').then(r => r.data),
  })

  // Fetch services (for modal)
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn:  () => api.get('/services').then(r => r.data),
  })

  // Fetch all clients (for search)
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => api.get('/clients?q=').then(r => r.data),
  })

  // Fetch client packages (active tab)
  const { data: clientPackages = [], refetch: refetchClientPkgs } = useQuery({
    queryKey: ['client-packages', activeClient?.id],
    queryFn:  () => api.get(`/clients/${activeClient.id}/packages`).then(r => r.data),
    enabled:  !!activeClient,
  })

  const deletePackage = useMutation({
    mutationFn: id => api.delete(`/packages/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries(['packages'])
      if (selectedPkg?.id === editPkg?.id) setSelectedPkg(null)
    },
  })

  // Sell package
  const selectedPackageObj = packages.find(p => p.id === +sellPkgId)

  async function handleSell(e) {
    e.preventDefault()
    if (!sellClient || !sellPkgId) return
    setSelling(true)
    try {
      await api.post(`/packages/${sellPkgId}/sell`, { client_id: sellClient.id })
      setSellSuccess(true)
      qc.invalidateQueries(['packages'])
      qc.invalidateQueries(['client-packages', sellClient.id])
      setToast(`Package sold to ${sellClient.first_name} ${sellClient.last_name}`)
      setSellClient(null)
      setSellClientSearch('')
      setSellPkgId('')
      setTimeout(() => setSellSuccess(false), 3000)
    } finally {
      setSelling(false)
    }
  }

  // Client search helpers
  const sellClientResults = useMemo(() => {
    if (!sellClientSearch.trim()) return []
    const q = sellClientSearch.toLowerCase()
    return allClients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    ).slice(0, 6)
  }, [allClients, sellClientSearch])

  const activeClientResults = useMemo(() => {
    if (!activeSearch.trim()) return []
    const q = activeSearch.toLowerCase()
    return allClients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    ).slice(0, 6)
  }, [allClients, activeSearch])

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══ LEFT PANEL ══════════════════════════════════════════════ */}
      <div className="w-[40%] shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-[18px] font-bold text-slate-800">Packages</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">{packages.length} bundle{packages.length !== 1 ? 's' : ''} available</p>
          </div>
          <button
            onClick={() => { setEditPkg(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-[12px] font-semibold  transition-colors">
            <Plus size={13} /> New Package
          </button>
        </div>

        {/* Package list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Box size={40} className="text-slate-200 mb-3" />
              <p className="text-[14px] font-semibold text-slate-500">No packages yet</p>
              <p className="text-[12px] text-slate-400 mt-1">Create your first bundle</p>
            </div>
          ) : (
            packages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPkg?.id === pkg.id}
                onClick={() => setSelectedPkg(pkg)}
                onEdit={() => { setEditPkg(pkg); setShowModal(true) }}
                onDelete={() => deletePackage.mutate(pkg.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        {/* Header + tabs */}
        <div className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-slate-800">Client Packages</h2>
          </div>
          <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 w-fit">
            {[['sell', 'Sell Package'], ['active', 'Active Packages']].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                  activeTab === tab ? 'bg-white text-[#0D9488] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'sell' ? (
            <SellPackageTab
              packages={packages}
              sellClient={sellClient}
              setSellClient={setSellClient}
              sellClientSearch={sellClientSearch}
              setSellClientSearch={setSellClientSearch}
              sellClientResults={sellClientResults}
              sellPkgId={sellPkgId}
              setSellPkgId={setSellPkgId}
              selectedPackageObj={selectedPackageObj}
              handleSell={handleSell}
              selling={selling}
              sellSuccess={sellSuccess}
            />
          ) : (
            <ActivePackagesTab
              activeSearch={activeSearch}
              setActiveSearch={setActiveSearch}
              activeClient={activeClient}
              setActiveClient={setActiveClient}
              activeClientResults={activeClientResults}
              clientPackages={clientPackages}
              services={services}
              onRedeem={pkg => setRedeemModal(pkg)}
              onRefresh={refetchClientPkgs}
            />
          )}
        </div>
      </div>

      {showModal && (
        <PackageModal
          pkg={editPkg}
          services={services}
          onClose={() => { setShowModal(false); setEditPkg(null) }}
          onSaved={() => { qc.invalidateQueries(['packages']); setShowModal(false); setEditPkg(null) }}
        />
      )}

      {redeemModal && (
        <RedeemModal
          data={redeemModal}
          onClose={() => setRedeemModal(null)}
          onRedeemed={() => {
            setRedeemModal(null)
            refetchClientPkgs()
            setToast('Service redeemed successfully')
          }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Package Card ──────────────────────────────────────────────────────────────
function PackageCard({ pkg, selected, onClick, onEdit, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm',
        selected ? 'border-[#0D9488] shadow-sm ring-1 ring-[#CCFBF1]' : 'border-slate-200'
      )}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[14px] font-bold text-slate-800">{pkg.name}</p>
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0D9488] hover:bg-[#F0FDFA] transition-colors">
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {pkg.description && (
        <p className="text-[12px] text-slate-400 mb-2.5">{pkg.description}</p>
      )}

      {/* Service pills */}
      {pkg.services?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pkg.services.map((svc, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1] font-medium">
              {svc.name} ×{svc.qty}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[20px] font-bold text-[#0D9488]">{formatCurrency(pkg.price)}</span>
          <span className="text-[11px] text-slate-400 ml-2">Valid {pkg.validity_days} days</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Users size={11} />
          {pkg.active_clients ?? 0} clients active
        </div>
      </div>
    </div>
  )
}

// ── Sell Package Tab ──────────────────────────────────────────────────────────
function SellPackageTab({
  packages, sellClient, setSellClient, sellClientSearch, setSellClientSearch,
  sellClientResults, sellPkgId, setSellPkgId, selectedPackageObj,
  handleSell, selling, sellSuccess,
}) {
  const totalValue = selectedPackageObj?.services?.reduce(
    (sum, svc) => sum + (svc.price ?? 0) * (svc.qty ?? 1), 0
  ) ?? 0
  const savings = totalValue - (selectedPackageObj?.price ?? 0)

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-[15px] font-bold text-slate-800">Sell a Package to Client</h3>

        {sellSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-[13px] font-semibold">
            <CheckCircle2 size={15} />
            Package sold successfully!
          </div>
        )}

        <form onSubmit={handleSell} className="space-y-4">
          <Field label="Search Client">
            {sellClient ? (
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1]">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{sellClient.first_name} {sellClient.last_name}</p>
                  <p className="text-[11px] text-slate-400">{sellClient.phone}</p>
                </div>
                <button type="button" onClick={() => { setSellClient(null); setSellClientSearch('') }}
                  className="text-slate-400 hover:text-red-400 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={sellClientSearch}
                  onChange={e => setSellClientSearch(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-[#0D9488] focus:bg-white transition-all" />
                {sellClientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                    {sellClientResults.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setSellClient(c); setSellClientSearch('') }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#F0FDFA] transition-colors border-b border-slate-50 last:border-0">
                        <p className="text-[13px] font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                        <p className="text-[11px] text-slate-400">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field label="Select Package">
            <select
              required
              value={sellPkgId}
              onChange={e => setSellPkgId(e.target.value)}
              className={inp}>
              <option value="">Choose a package…</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
              ))}
            </select>
          </Field>

          {selectedPackageObj && (
            <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-3.5 space-y-2">
              <p className="text-[12px] font-bold text-[#0D9488]">{selectedPackageObj.name}</p>
              {selectedPackageObj.description && (
                <p className="text-[11px] text-slate-500">{selectedPackageObj.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {selectedPackageObj.services?.map((svc, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#CCFBF1] text-[#0D9488] font-medium">
                    {svc.name} ×{svc.qty}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-bold text-slate-800">{formatCurrency(selectedPackageObj.price)}</span>
                {savings > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                    Saves {formatCurrency(savings)}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">Valid {selectedPackageObj.validity_days} days</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={selling || !sellClient || !sellPkgId}
            className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-bold  disabled:opacity-50 transition-colors">
            {selling ? 'Processing…' : 'Sell Now'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Active Packages Tab ───────────────────────────────────────────────────────
function ActivePackagesTab({
  activeSearch, setActiveSearch, activeClient, setActiveClient,
  activeClientResults, clientPackages, services, onRedeem, onRefresh,
}) {
  const [historyPkg, setHistoryPkg] = useState(null)

  return (
    <div className="space-y-4">
      {/* Client search */}
      {activeClient ? (
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1]">
          <div>
            <p className="text-[13px] font-semibold text-slate-800">{activeClient.first_name} {activeClient.last_name}</p>
            <p className="text-[11px] text-slate-400">{activeClient.phone}</p>
          </div>
          <button onClick={() => { setActiveClient(null); setActiveSearch('') }}
            className="text-slate-400 hover:text-red-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={activeSearch}
            onChange={e => setActiveSearch(e.target.value)}
            placeholder="Search client to view their packages…"
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all shadow-sm" />
          {activeClientResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
              {activeClientResults.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { setActiveClient(c); setActiveSearch('') }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#F0FDFA] transition-colors border-b border-slate-50 last:border-0">
                  <p className="text-[13px] font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                  <p className="text-[11px] text-slate-400">{c.phone}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!activeClient && (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Users size={36} className="text-slate-200 mb-2" />
          <p className="text-[13px] text-slate-400">Search for a client to see their packages</p>
        </div>
      )}

      {activeClient && clientPackages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center bg-white rounded-2xl border border-slate-200">
          <Package size={32} className="text-slate-200 mb-2" />
          <p className="text-[13px] text-slate-500 font-medium">No packages found</p>
          <p className="text-[12px] text-slate-400 mt-0.5">This client has no active packages</p>
        </div>
      )}

      {activeClient && clientPackages.map(cp => {
        const daysLeft = cp.expires_at
          ? Math.ceil((new Date(cp.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
          : null
        const expiringSoon = daysLeft !== null && daysLeft < 30

        return (
          <div key={cp.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] font-bold text-slate-800">{cp.package_name ?? cp.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide',
                    STATUS_COLORS[cp.status] ?? 'bg-slate-100 text-slate-500'
                  )}>
                    {cp.status}
                  </span>
                  {expiringSoon && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold flex items-center gap-1">
                      <AlertCircle size={9} /> {daysLeft}d left
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <p>Purchased {formatDate(cp.purchased_at ?? cp.created_at)}</p>
                {cp.expires_at && (
                  <p className={cn('mt-0.5', expiringSoon ? 'text-red-500 font-semibold' : '')}>
                    Expires {formatDate(cp.expires_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Service progress bars */}
            {cp.services?.length > 0 && (
              <div className="space-y-2">
                {cp.services.map((svc, i) => {
                  const total = svc.qty ?? 1
                  const used  = svc.used ?? 0
                  const remaining = total - used
                  const pct = remaining / total
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">{svc.name}</span>
                        <span className={cn('font-semibold', remaining === 0 ? 'text-slate-400' : 'text-[#0D9488]')}>
                          {remaining}/{total} remaining
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D9488] rounded-full transition-all"
                          style={{ width: `${Math.max(0, pct * 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {cp.status === 'active' && (cp.services?.some(s => (s.qty - (s.used ?? 0)) > 0)) && (
                <button
                  onClick={() => onRedeem({
                    clientPackageId: cp.id,
                    packageName: cp.package_name ?? cp.name,
                    clientName: `${activeClient.first_name} ${activeClient.last_name}`,
                    services: cp.services?.filter(s => (s.qty - (s.used ?? 0)) > 0) ?? [],
                  })}
                  className="px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[11px] font-semibold  transition-colors">
                  Redeem
                </button>
              )}
              <button
                onClick={() => setHistoryPkg(historyPkg?.id === cp.id ? null : cp)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[11px] font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1">
                View History
                <ChevronDown size={11} className={cn('transition-transform', historyPkg?.id === cp.id ? 'rotate-180' : '')} />
              </button>
            </div>

            {/* History */}
            {historyPkg?.id === cp.id && cp.redemptions?.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Redemption History</p>
                {cp.redemptions.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">{r.service_name}</span>
                    <span className="text-slate-400">{formatDate(r.redeemed_at)}</span>
                  </div>
                ))}
              </div>
            )}
            {historyPkg?.id === cp.id && (!cp.redemptions || cp.redemptions.length === 0) && (
              <div className="border-t border-slate-100 pt-3 text-center text-[12px] text-slate-400">
                No redemptions yet
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Package Modal (Create / Edit) ─────────────────────────────────────────────
function PackageModal({ pkg, services, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          pkg?.name          ?? '',
    description:   pkg?.description   ?? '',
    price:         pkg?.price         ?? '',
    validity_days: pkg?.validity_days ?? 90,
  })
  const [rows, setRows] = useState(
    pkg?.services?.length
      ? pkg.services.map(s => ({ service_id: String(s.service_id ?? s.id), qty: s.qty ?? 1 }))
      : [{ service_id: '', qty: 1 }]
  )
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const VALIDITY_PRESETS = [30, 90, 180, 365]

  const totalValue = rows.reduce((sum, row) => {
    const svc = services.find(s => s.id === +row.service_id)
    return sum + (svc ? svc.price * row.qty : 0)
  }, 0)
  const savings = totalValue - (+form.price || 0)

  function addRow() {
    setRows(r => [...r, { service_id: '', qty: 1 }])
  }
  function removeRow(i) {
    setRows(r => r.filter((_, idx) => idx !== i))
  }
  function updateRow(i, field, value) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price:         +form.price,
        validity_days: +form.validity_days,
        services:      rows.filter(r => r.service_id).map(r => ({ service_id: +r.service_id, qty: +r.qty })),
      }
      if (pkg?.id) {
        await api.put(`/packages/${pkg.id}`, payload)
      } else {
        await api.post('/packages', payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-bold text-slate-800">
            {pkg ? 'Edit Package' : 'New Package'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Package Name *">
            <input required value={form.name} onChange={set('name')} className={inp} placeholder="e.g. Glow Bundle" />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} rows={2} className={inp + ' resize-none'} placeholder="What's included…" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <input type="number" step="0.01" min="0" required value={form.price} onChange={set('price')} className={inp} placeholder="199.00" />
            </Field>
            <Field label="Validity (days)">
              <input type="number" min="1" required value={form.validity_days} onChange={set('validity_days')} className={inp} />
            </Field>
          </div>

          {/* Validity presets */}
          <div className="flex gap-2">
            {VALIDITY_PRESETS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setForm(f => ({ ...f, validity_days: d }))}
                className={cn(
                  'px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                  +form.validity_days === d
                    ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]'
                    : 'border-slate-200 text-slate-500 hover:border-[#0D9488] hover:text-[#0D9488]'
                )}>
                {d}d
              </button>
            ))}
          </div>

          {/* Services */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Services Included</label>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.service_id}
                    onChange={e => updateRow(i, 'service_id', e.target.value)}
                    className={inp + ' flex-1'}>
                    <option value="">Select service…</option>
                    {services.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price)}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={e => updateRow(i, 'qty', +e.target.value)}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-[13px] text-center outline-none focus:border-[#0D9488] bg-slate-50 focus:bg-white transition-all"
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-[12px] text-[#0D9488] font-semibold hover:underline flex items-center gap-1">
              <Plus size={12} /> Add Service
            </button>
          </div>

          {/* Value summary */}
          {totalValue > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
              <div className="text-[12px] text-slate-500">
                Total Value: <span className="font-bold text-slate-700">{formatCurrency(totalValue)}</span>
              </div>
              {savings > 0 ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                  Client saves {formatCurrency(savings)}
                </span>
              ) : savings < 0 ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                  Package above value
                </span>
              ) : null}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60">
              {saving ? 'Saving…' : pkg ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Redeem Modal ──────────────────────────────────────────────────────────────
function RedeemModal({ data, onClose, onRedeemed }) {
  const { clientPackageId, packageName, clientName, services } = data
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.service_id ?? services[0]?.id ?? '')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleRedeem(e) {
    e.preventDefault()
    if (!selectedServiceId) return
    setSaving(true)
    setError(null)
    try {
      await api.post('/packages/redeem', {
        client_package_id: clientPackageId,
        service_id:        +selectedServiceId,
        notes:             notes || undefined,
      })
      onRedeemed()
    } catch (err) {
      setError(err?.response?.data?.message || 'Redemption failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">Redeem Service</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{packageName} · {clientName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] flex items-center gap-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-4">
          <Field label="Select Service to Redeem">
            <div className="space-y-2">
              {services.map((svc, i) => {
                const svcId = svc.service_id ?? svc.id
                const remaining = (svc.qty ?? 1) - (svc.used ?? 0)
                return (
                  <label key={i}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                      String(selectedServiceId) === String(svcId)
                        ? 'border-[#0D9488] bg-[#F0FDFA]'
                        : 'border-slate-200 hover:border-slate-300'
                    )}>
                    <input
                      type="radio"
                      name="service"
                      value={svcId}
                      checked={String(selectedServiceId) === String(svcId)}
                      onChange={() => setSelectedServiceId(svcId)}
                      className="accent-[#0D9488]"
                    />
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-slate-800">{svc.name}</p>
                      <p className="text-[11px] text-slate-400">{remaining} remaining</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={inp + ' resize-none'}
              placeholder="Any notes about this redemption…" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !selectedServiceId}
              className="flex-1 py-2.5 rounded-xl text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[13px] font-semibold  disabled:opacity-60">
              {saving ? 'Redeeming…' : 'Redeem Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
