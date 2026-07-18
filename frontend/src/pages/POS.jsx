import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ShoppingCart, User, UserPlus, Tag,
  Trash2, RefreshCw, PauseCircle, ChevronDown,
  ChevronUp, Plus, Minus, CreditCard, DollarSign,
  Smartphone, CheckCircle2, X, Lightbulb
} from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency, cn } from '@/lib/utils'

const TAX_RATE = 0.1025   // LA county 10.25%

// ── Live clock ────────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function POS() {
  const clock = useClock()

  // ── Data ─────────────────────────────────────────────────────────
  const { data: services   = [] } = useQuery({ queryKey:['services'],   queryFn: () => api.get('/services').then(r => r.data) })
  const { data: categories = [] } = useQuery({ queryKey:['categories'], queryFn: () => api.get('/categories').then(r => r.data) })
  const { data: clients    = [] } = useQuery({ queryKey:['clients'],    queryFn: () => api.get('/clients?q=').then(r => r.data) })

  // ── State ─────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [activeCat,    setActiveCat]    = useState('all')
  const [cart,         setCart]         = useState([])
  const [clientMode,   setClientMode]   = useState('walkin')   // 'walkin' | 'existing'
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountAmt,  setDiscountAmt]  = useState('')
  const [tipPct,       setTipPct]       = useState(null)        // 15|20|25|'custom'|null
  const [customTip,    setCustomTip]    = useState('')
  const [payMethod,    setPayMethod]    = useState('card')
  const [charging,     setCharging]     = useState(false)
  const [receipt,      setReceipt]      = useState(null)
  const [heldCarts,       setHeldCarts]       = useState([])   // [{ id, label, items, client, time }]
  const [showRecall,      setShowRecall]      = useState(false)
  const [upsellSuggestion, setUpsellSuggestion] = useState(null)
  const upsellTimerRef = useRef(null)

  // ── Client wallet (packages + membership) ─────────────────────────
  const [clientWallet,  setClientWallet]  = useState(null)   // { membership, packages }
  const [redeemModal,   setRedeemModal]   = useState(null)   // { clientPackageId, services, packageName }
  const [redeemedPkgIds, setRedeemedPkgIds] = useState([])   // track redeemed package ids for green badge
  const [walletToast,   setWalletToast]   = useState(null)

  // ── Filtered services ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return services.filter(s => {
      if (!s.is_active) return false
      const matchCat = activeCat === 'all' || s.category_id === activeCat
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [services, activeCat, search])

  // ── Client search results ─────────────────────────────────────────
  const clientResults = useMemo(() => {
    if (!clientSearch.trim()) return []
    const q = clientSearch.toLowerCase()
    return clients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [clients, clientSearch])

  // ── Wallet fetch when client selected ────────────────────────────
  useEffect(() => {
    if (!selectedClient) {
      setClientWallet(null)
      setRedeemedPkgIds([])
      return
    }
    Promise.all([
      api.get(`/clients/${selectedClient.id}/packages`).catch(() => ({ data: [] })),
      api.get(`/clients/${selectedClient.id}/membership`).catch(() => ({ data: null })),
    ]).then(([pkgRes, memRes]) => {
      setClientWallet({
        packages: (pkgRes.data ?? []).filter(p => p.status === 'active' && p.total_remaining > 0),
        membership: memRes.data ?? null,
      })
    })
  }, [selectedClient])

  // ── Upsell helpers ────────────────────────────────────────────────
  function dismissUpsell() {
    setUpsellSuggestion(null)
    if (upsellTimerRef.current) clearTimeout(upsellTimerRef.current)
  }

  async function fetchUpsells(svcId) {
    try {
      const res = await api.get(`/upsells/service/${svcId}`)
      const results = Array.isArray(res.data) ? res.data : (res.data?.results ?? [])
      if (results.length > 0) {
        if (upsellTimerRef.current) clearTimeout(upsellTimerRef.current)
        setUpsellSuggestion(results[0])
        upsellTimerRef.current = setTimeout(() => setUpsellSuggestion(null), 8000)
      }
    } catch {
      // silently ignore
    }
  }

  // ── Cart helpers ──────────────────────────────────────────────────
  function addToCart(svc) {
    setCart(c => {
      const ex = c.find(i => i.id === svc.id)
      if (ex) return c.map(i => i.id === svc.id ? { ...i, qty: i.qty + 1 } : i)
      return [...c, { ...svc, qty: 1 }]
    })
    fetchUpsells(svc.id)
  }
  function changeQty(id, delta) {
    setCart(c => c.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }
  function removeItem(id) { setCart(c => c.filter(i => i.id !== id)) }
  function clearCart()    { setCart([]); setTipPct(null); setCustomTip(''); setDiscountAmt('') }

  function holdCart() {
    if (!cart.length) return
    const n = heldCarts.length + 1
    const label = selectedClient
      ? `${selectedClient.first_name} ${selectedClient.last_name}`
      : `Hold #${n}`
    setHeldCarts(h => [...h, {
      id:     Date.now(),
      label,
      items:  [...cart],
      client: selectedClient,
      time:   new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
    }])
    clearCart()
    setSelectedClient(null)
    setClientSearch('')
  }
  function recallHeld(held) {
    setCart(held.items)
    setSelectedClient(held.client)
    setHeldCarts(h => h.filter(x => x.id !== held.id))
    setShowRecall(false)
  }
  function discardHeld(id) {
    setHeldCarts(h => h.filter(x => x.id !== id))
    if (heldCarts.length <= 1) setShowRecall(false)
  }

  // ── Totals ────────────────────────────────────────────────────────
  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discount  = Math.min(+discountAmt || 0, subtotal)
  const taxable   = subtotal - discount
  const taxAmount = taxable * TAX_RATE
  const tipAmount = tipPct === 'custom' ? (+customTip || 0) : (subtotal * (tipPct ?? 0) / 100)
  const grandTotal = taxable + taxAmount + tipAmount

  // ── Charge ────────────────────────────────────────────────────────
  const [chargeError, setChargeError]     = useState(null)
  const [loyaltyToast, setLoyaltyToast]   = useState(null)  // { name, points, balance }
  const [showRebook, setShowRebook]        = useState(false)
  const [rebookData, setRebookData]        = useState(null)  // { client, serviceName, staffId }

  async function handleCharge() {
    if (!cart.length) return
    setCharging(true)
    setChargeError(null)
    try {
      const res = await api.post('/transactions', {
        client_id: selectedClient?.id || null,
        items: cart.map(i => ({ service_id: i.id, name: i.name, price: i.price, qty: i.qty })),
        subtotal,
        discount,
        tax_amount: taxAmount,
        tip_amount: tipAmount,
        grand_total: grandTotal,
        payment_method: payMethod,
      })

      // Use real server-computed points when available, fall back to local estimate
      const serverPtsEarned  = res.data?.loyalty_points_earned ?? 0
      const serverNewBalance = res.data?.new_loyalty_balance   ?? 0
      const pointsEarned = serverPtsEarned > 0 ? serverPtsEarned : Math.floor(grandTotal)

      // Keep local cache in sync (used by receipt screen)
      const loyaltyRaw = JSON.parse(localStorage.getItem('ks_loyalty') || '{"balance":0,"tier":"Bronze","lifetimePoints":0}')
      const newBalance = serverNewBalance > 0 ? serverNewBalance : loyaltyRaw.balance + pointsEarned
      const newLifetime = loyaltyRaw.lifetimePoints + pointsEarned
      const newTier = newLifetime>=3000?'Platinum':newLifetime>=1500?'Gold':newLifetime>=500?'Silver':'Bronze'
      localStorage.setItem('ks_loyalty', JSON.stringify({balance:newBalance,tier:newTier,lifetimePoints:newLifetime}))

      const txId = res.data?.id ?? res.data?.transaction_id ?? (Math.floor(subtotal*100+taxAmount*10+(tipAmount|0)))
      const txRecord = {id:txId, items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})), subtotal, discount, taxAmount, tipAmount, grandTotal, payMethod, clientId:selectedClient?.id||null, clientName:selectedClient?selectedClient.first_name+' '+selectedClient.last_name:'Walk-in', status:'completed', pointsEarned}
      const existingTx = JSON.parse(localStorage.getItem('ks_transactions')||'[]')
      localStorage.setItem('ks_transactions', JSON.stringify([txRecord,...existingTx.slice(0,99)]))

      // Show loyalty toast if client earned real points from the server
      if (selectedClient && serverPtsEarned > 0) {
        setLoyaltyToast({
          name:    `${selectedClient.first_name} ${selectedClient.last_name}`,
          points:  serverPtsEarned,
          balance: serverNewBalance,
        })
      }

      const clientForReceipt = selectedClient
      const serviceNameForReceipt = cart[0]?.name || ''
      setReceipt({
        items: [...cart],
        subtotal,
        discount,
        taxAmount,
        tipAmount,
        grandTotal,
        payMethod,
        time: new Date().toLocaleTimeString(),
        client: selectedClient,
        transaction_id: txId,
        pointsEarned,
      })
      clearCart()
      setSelectedClient(null)
      setClientSearch('')
      // Trigger rebooking prompt after 1.5s if a named client checked out
      if (clientForReceipt) {
        setRebookData({ client: clientForReceipt, serviceName: serviceNameForReceipt })
        setTimeout(() => setShowRebook(true), 1500)
      }
    } catch (err) {
      setChargeError(err?.response?.data?.message || 'Payment failed. Please try again.')
    } finally {
      setCharging(false)
    }
  }

  if (receipt) return (
    <>
      <ReceiptScreen receipt={receipt} onDone={() => { setReceipt(null); setShowRebook(false); setRebookData(null) }} />
      {loyaltyToast && (
        <LoyaltyPointsToast
          toast={loyaltyToast}
          onDone={() => setLoyaltyToast(null)}
        />
      )}
      {showRebook && rebookData && (
        <RebookingPrompt
          client={rebookData.client}
          serviceName={rebookData.serviceName}
          onSkip={() => setShowRebook(false)}
        />
      )}
    </>
  )

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* ══ LEFT PANEL ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-white">

        {/* Search bar + POS title/clock/hold on the right */}
        <div className="px-5 pt-4 pb-3 shrink-0 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search service name or category…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-[#0D9488] focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[14px] font-bold text-slate-800 whitespace-nowrap">Salon POS</span>
            <span className="text-[12px] text-slate-400 font-mono whitespace-nowrap">{clock}</span>
            {heldCarts.length > 0 ? (
              <button
                onClick={() => setShowRecall(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap">
                <PauseCircle size={13} /> Recall Held
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {heldCarts.length}
                </span>
              </button>
            ) : (
              <button
                onClick={holdCart}
                disabled={!cart.length}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors whitespace-nowrap">
                <PauseCircle size={13} /> Hold
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap shrink-0">
          <Pill active={activeCat === 'all'} onClick={() => setActiveCat('all')}>All</Pill>
          {categories.map(cat => (
            <Pill key={cat.id} active={activeCat === cat.id} onClick={() => setActiveCat(cat.id)}>
              {cat.name}
            </Pill>
          ))}
        </div>

        {/* Service grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-300 gap-2">
              <ShoppingCart size={32} />
              <p className="text-[13px]">No services found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {filtered.map(svc => (
                <button key={svc.id} onClick={() => addToCart(svc)}
                  className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#0D9488] hover:bg-[#F0FDFA] active:scale-[0.97] transition-all group">
                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-[#0D9488] leading-tight mb-1">{svc.name}</p>
                  <p className="text-[11px] text-slate-400 mb-1.5">{svc.duration_min} min</p>
                  <p className="text-[14px] font-bold text-[#0D9488]">{formatCurrency(svc.price)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upsell banner */}
        {upsellSuggestion && (
          <div className="mx-5 mb-3 shrink-0 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
            <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-amber-800 leading-snug">
                Add {upsellSuggestion.upsell_service_name ?? upsellSuggestion.name} for {formatCurrency(upsellSuggestion.upsell_price ?? upsellSuggestion.price)}?
              </p>
              {upsellSuggestion.message && (
                <p className="text-[11px] text-amber-600 mt-0.5">{upsellSuggestion.message}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  addToCart({
                    id:           upsellSuggestion.upsell_service_id ?? upsellSuggestion.id,
                    name:         upsellSuggestion.upsell_service_name ?? upsellSuggestion.name,
                    price:        upsellSuggestion.upsell_price ?? upsellSuggestion.price,
                    duration_min: upsellSuggestion.duration_min ?? 0,
                  })
                  dismissUpsell()
                }}
                className="px-2.5 py-1.5 rounded-lg text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[11px] font-semibold  transition-colors whitespace-nowrap">
                + Add to Cart
              </button>
              <button onClick={dismissUpsell}
                className="px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-600 text-[11px] font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap">
                No thanks
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════ */}
      <div className="w-[400px] shrink-0 flex flex-col bg-white overflow-y-auto">

        {/* BILL TO toggle — no heading */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => { setClientMode('walkin'); setSelectedClient(null); setClientSearch('') }}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors',
                clientMode === 'walkin' ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : 'text-slate-500 hover:bg-slate-50')}>
              <User size={13} /> Walk-in
            </button>
            <button onClick={() => setClientMode('existing')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors',
                clientMode === 'existing' ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1]' : 'text-slate-500 hover:bg-slate-50')}>
              <UserPlus size={13} /> Client
            </button>
          </div>
        </div>

        {/* CUSTOMER — search + inline New Customer button */}
        <div className="px-5 py-3 border-b border-slate-100">
          {selectedClient ? (
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1]">
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  {selectedClient.first_name} {selectedClient.last_name}
                </p>
                <p className="text-[11px] text-slate-400">{selectedClient.phone}</p>
              </div>
              <button onClick={() => { setSelectedClient(null); setClientSearch('') }}
                className="text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientMode('existing') }}
                  placeholder="Search client name / phone…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                />
                {clientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                    {clientResults.map(c => (
                      <button key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(''); setClientMode('existing') }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#F0FDFA] transition-colors border-b border-slate-50 last:border-0">
                        <p className="text-[13px] font-semibold text-slate-800">{c.first_name} {c.last_name}</p>
                        <p className="text-[11px] text-slate-400">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* + New Customer icon button */}
              <button
                title="New Customer"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-[#0D9488] hover:text-[#0D9488] hover:bg-[#F0FDFA] transition-colors">
                <UserPlus size={15} />
              </button>
            </div>
          )}
        </div>

        {/* WALLET — shown when client selected and has active membership/packages */}
        {selectedClient && clientWallet && (clientWallet.membership || clientWallet.packages?.length > 0) && (
          <div className="mx-5 my-3 border-l-4 border-[#0D9488] bg-[#F0FDFA] rounded-r-xl p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0D9488]">Wallet</p>

            {/* Membership chip */}
            {clientWallet.membership && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                  💳 {clientWallet.membership.plan_name ?? 'Member'} — {clientWallet.membership.discount_pct ?? 0}% off
                </span>
                {clientWallet.membership.discount_pct > 0 && (
                  <button
                    onClick={() => {
                      const disc = (subtotal * clientWallet.membership.discount_pct) / 100
                      setDiscountAmt(String(disc.toFixed(2)))
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] font-semibold  transition-colors whitespace-nowrap">
                    Apply {clientWallet.membership.discount_pct}% off
                  </button>
                )}
              </div>
            )}

            {/* Active packages */}
            {clientWallet.packages?.map(cp => (
              <div key={cp.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700 truncate">{cp.package_name ?? cp.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {cp.services?.map(s => `${s.name} ×${(s.qty ?? 1) - (s.used ?? 0)}`).join(' · ')}
                  </p>
                </div>
                {redeemedPkgIds.includes(cp.id) ? (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-semibold whitespace-nowrap shrink-0">
                    ✓ Redeemed
                  </span>
                ) : (
                  <button
                    onClick={() => setRedeemModal({
                      clientPackageId: cp.id,
                      packageName: cp.package_name ?? cp.name,
                      clientName: `${selectedClient.first_name} ${selectedClient.last_name}`,
                      services: (cp.services ?? []).filter(s => (s.qty ?? 1) - (s.used ?? 0) > 0),
                    })}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#0D9488] text-[#0D9488] font-semibold hover:bg-white transition-colors whitespace-nowrap shrink-0">
                    Redeem
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Wallet toast */}
        {walletToast && <WalletToast message={walletToast} onDone={() => setWalletToast(null)} />}

        {/* CART ITEMS */}
        <div className="border-b border-slate-100">
          <div className="flex items-center justify-between px-5 py-2 bg-slate-50">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <ShoppingCart size={11} /> Items ({cart.length})
            </span>
            {cart.length > 0 && (
              <button onClick={clearCart}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={10} /> Clear
              </button>
            )}
          </div>
          {cart.length === 0 ? (
            <div className="flex items-center justify-center py-5 text-slate-300 gap-1.5">
              <ShoppingCart size={16} />
              <p className="text-[12px]">No items · tap a service to add</p>
            </div>
          ) : (
            <div>
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(item.id, -1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <Minus size={9} />
                    </button>
                    <span className="w-5 text-center text-[12px] font-semibold">{item.qty}</span>
                    <button onClick={() => changeQty(item.id, +1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <Plus size={9} />
                    </button>
                  </div>
                  <span className="text-[12px] font-bold text-slate-700 w-14 text-right shrink-0">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BILL DISCOUNT */}
        <div className="px-5 py-3 border-b border-slate-100">
          <button onClick={() => setDiscountOpen(o => !o)}
            className="w-full flex items-center justify-between text-[12px] font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            <span className="flex items-center gap-1.5"><Tag size={13} /> Bill Discount</span>
            {discountOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          {discountOpen && (
            <div className="mt-2.5 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-bold">$</span>
              <input type="number" min="0" step="0.01" value={discountAmt}
                onChange={e => setDiscountAmt(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-[#0D9488] focus:bg-white transition-all" />
            </div>
          )}
        </div>

        {/* TIP */}
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Tip</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[15, 20, 25].map(pct => (
              <button key={pct} onClick={() => setTipPct(t => t === pct ? null : pct)}
                className={cn('py-2 rounded-xl text-[12px] font-semibold border transition-all',
                  tipPct === pct ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]' : 'border-slate-200 text-slate-600 hover:border-[#0D9488]')}>
                {pct}%
              </button>
            ))}
            <button onClick={() => setTipPct(t => t === 'custom' ? null : 'custom')}
              className={cn('py-2 rounded-xl text-[12px] font-semibold border transition-all',
                tipPct === 'custom' ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]' : 'border-slate-200 text-slate-600 hover:border-[#0D9488]')}>
              Other
            </button>
          </div>
          {tipPct === 'custom' && (
            <div className="mt-2 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-bold">$</span>
              <input type="number" min="0" step="0.01" value={customTip}
                onChange={e => setCustomTip(e.target.value)} placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-[#0D9488] focus:bg-white transition-all" />
            </div>
          )}
        </div>

        {/* BILL SUMMARY */}
        <div className="px-5 py-4 border-b border-slate-100 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bill Summary</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Tax (10.25%)</span><span>{formatCurrency(taxAmount)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tip</span><span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-800 text-[14px]">Grand Total</span>
              <span className="font-bold text-[#0D9488] text-[18px]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id:'card', icon: CreditCard, label:'Card'  },
              { id:'cash', icon: DollarSign, label:'Cash'  },
              { id:'tap',  icon: Smartphone, label:'Tap'   },
            ].map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[12px] font-semibold transition-all',
                  payMethod === m.id ? 'bg-[#F0FDFA] border-[#0D9488] text-[#0D9488]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                )}>
                <m.icon size={15} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* CHARGE ERROR */}
        {chargeError && (
          <div className="px-5 pt-3">
            <div className="bg-red-50 border border-red-200 text-red-600 text-[12px] px-3.5 py-2.5 rounded-xl flex items-center justify-between">
              <span>{chargeError}</span>
              <button onClick={() => setChargeError(null)} className="text-red-400 hover:text-red-600 ml-2">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="px-5 py-4 space-y-2 shrink-0">
          <div className="flex gap-2">
            <button onClick={holdCart} disabled={!cart.length}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <PauseCircle size={13} /> Hold
            </button>
            <button onClick={() => setTipPct(null)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors" title="Reset tip">
              <RefreshCw size={13} />
            </button>
            <button onClick={clearCart} disabled={!cart.length}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-50 disabled:opacity-40 transition-colors" title="Clear cart">
              <Trash2 size={13} />
            </button>
          </div>
          <button
            onClick={handleCharge}
            disabled={!cart.length || charging}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: cart.length ? 'linear-gradient(135deg,#0D9488,#14B8A6)' : '#E2E8F0', color: cart.length ? 'white' : '#94A3B8', boxShadow: cart.length ? '0 4px 14px rgba(13,148,136,0.3)' : 'none' }}
          >
            {charging ? 'Processing…' : cart.length ? `Charge ${formatCurrency(grandTotal)}` : 'Cart Empty'}
          </button>
        </div>
      </div>

      {/* ══ REDEEM MODAL (wallet) ══════════════════════════════════ */}
      {redeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setRedeemModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[17px] font-bold text-slate-800">Redeem Service</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {redeemModal.packageName} · {redeemModal.clientName}
                </p>
              </div>
              <button onClick={() => setRedeemModal(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <POSRedeemForm
              redeemModal={redeemModal}
              onRedeemed={cpId => {
                setRedeemedPkgIds(ids => [...ids, cpId])
                setRedeemModal(null)
                setWalletToast('Service redeemed successfully')
                // Refresh wallet
                if (selectedClient) {
                  Promise.all([
                    api.get(`/clients/${selectedClient.id}/packages`).catch(() => ({ data: [] })),
                    api.get(`/clients/${selectedClient.id}/membership`).catch(() => ({ data: null })),
                  ]).then(([pkgRes, memRes]) => {
                    setClientWallet({
                      packages: (pkgRes.data ?? []).filter(p => p.status === 'active' && p.total_remaining > 0),
                      membership: memRes.data ?? null,
                    })
                  })
                }
              }}
              onClose={() => setRedeemModal(null)}
            />
          </div>
        </div>
      )}

      {/* ══ RECALL HELD MODAL ══════════════════════════════════════ */}
      {showRecall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowRecall(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-[16px] font-bold text-slate-800">Held Bills</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">{heldCarts.length} bill{heldCarts.length !== 1 ? 's' : ''} on hold — select one to recall</p>
              </div>
              <button onClick={() => setShowRecall(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
              {heldCarts.map((held, idx) => {
                const heldSubtotal = held.items.reduce((s, i) => s + i.price * i.qty, 0)
                return (
                  <div key={held.id}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-[#0D9488] hover:bg-[#F0FDFA] transition-all group cursor-pointer"
                    onClick={() => recallHeld(held)}>
                    {/* Badge */}
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 font-bold text-[13px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-slate-800">{held.label}</span>
                        <span className="text-[12px] text-slate-400">{held.time}</span>
                      </div>
                      <p className="text-[12px] text-slate-400 truncate">
                        {held.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
                      </p>
                      <p className="text-[13px] font-bold text-[#0D9488] mt-1">{formatCurrency(heldSubtotal)}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); recallHeld(held) }}
                        className="px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-[11px] font-semibold  transition-colors">
                        Recall
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); discardHeld(held.id) }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 text-[11px] font-semibold hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors">
                        Discard
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── POS Redeem Form (used inside modal) ──────────────────────────────────────
function POSRedeemForm({ redeemModal, onRedeemed, onClose }) {
  const { clientPackageId, services } = redeemModal
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.service_id ?? services[0]?.id ?? ''
  )
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

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
      onRedeemed(clientPackageId)
    } catch (err) {
      setError(err?.response?.data?.message || 'Redemption failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px]">
          {error}
        </div>
      )}
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
                name="pos_service"
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
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white resize-none"
          placeholder="Any notes…"
        />
      </div>
      <div className="flex gap-3">
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
  )
}

// ── Loyalty points toast (shown after checkout when client earns points) ──────
function LoyaltyPointsToast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white pointer-events-none animate-in slide-in-from-top-2 duration-300"
      style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[18px]">
        🎉
      </div>
      <div>
        <p className="text-[14px] font-bold leading-tight">
          {toast.name} earned {toast.points} points!
        </p>
        <p className="text-[12px] text-white/75 mt-0.5">
          New balance: {toast.balance.toLocaleString()} pts
        </p>
      </div>
    </div>
  )
}

// ── Wallet toast ──────────────────────────────────────────────────────────────
function WalletToast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl shadow-xl text-[13px] font-semibold pointer-events-none">
      <CheckCircle2 size={16} />
      {message}
    </div>
  )
}

// ── Rebooking Prompt ─────────────────────────────────────────────────────────
function RebookingPrompt({ client, serviceName, onSkip }) {
  const TIMEOUT_SEC = 15
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SEC)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); onSkip(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onSkip])

  const suggestedDate = new Date()
  suggestedDate.setDate(suggestedDate.getDate() + 35) // 5 weeks out
  const suggestedDateStr = suggestedDate.toISOString().split('T')[0]
  const suggestedDisplay = suggestedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const bookURL = `/appointments?rebook=1&client_id=${client.id}&service=${encodeURIComponent(serviceName)}&suggested_date=${suggestedDateStr}`

  const progressPct = (secondsLeft / TIMEOUT_SEC) * 100

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center pb-8 px-4 pointer-events-none">
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-400"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >
        {/* Gradient header */}
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
          <p className="text-white font-bold text-[16px] leading-tight">
            Rebook {client.first_name}?
          </p>
          {serviceName && (
            <p className="text-white/80 text-[12px] mt-0.5">Last service: {serviceName}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-slate-600 text-[13px] mb-1">
            Schedule the next appointment now and keep them coming back.
          </p>
          <p className="text-[11px] text-slate-400 mb-4">
            Suggested: <span className="font-semibold text-slate-600">{suggestedDisplay}</span> (5 weeks out)
          </p>

          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={() => { window.location.href = bookURL }}
              className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold transition-colors"
              style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}
            >
              Book Next Visit →
            </button>
          </div>

          {/* Countdown progress bar */}
          <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-1">
            Auto-dismisses in {secondsLeft}s
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Category pill ─────────────────────────────────────────────────────────────
function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all whitespace-nowrap',
        active ? 'text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] border-[#0D9488]' : 'bg-white border-slate-200 text-slate-600 hover:border-[#0D9488] hover:text-[#0D9488]'
      )}>
      {children}
    </button>
  )
}

// ── Receipt screen ─────────────────────────────────────────────────────────────
function ReceiptScreen({ receipt, onDone }) {
  const [refundState, setRefundState] = useState('idle')
  const [textPayState, setTextPayState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [textPayMsg, setTextPayMsg]   = useState('')

  async function handleTextToPay() {
    if (!receipt.transaction_id) return
    setTextPayState('sending')
    setTextPayMsg('')
    try {
      const res = await api.post(`/transactions/${receipt.transaction_id}/payment-link`, {})
      setTextPayState('sent')
      setTextPayMsg(`Payment link sent to ${res.data?.phone || 'client'}`)
    } catch (err) {
      setTextPayState('error')
      setTextPayMsg(err?.response?.data?.error || 'Failed to send payment link.')
    }
  }

  if (refundState === 'done') {
    return (
      <div className="max-w-sm mx-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={26} className="text-green-600" />
          </div>
          <h2 className="text-[20px] font-bold text-slate-800 mb-1">Refund Processed</h2>
          <p className="text-slate-400 text-[13px] mb-6">{formatCurrency(receipt.grandTotal)} · via {receipt.payMethod}</p>
          <button onClick={onDone} className="w-full py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            New Transaction
          </button>
        </div>
      </div>
    )
  }

  function handleRefund() {
    const allTx = JSON.parse(localStorage.getItem('ks_transactions') || '[]')
    const updated = allTx.map(tx => tx.id === receipt.transaction_id ? { ...tx, status: 'refunded' } : tx)
    localStorage.setItem('ks_transactions', JSON.stringify(updated))
    const loyaltyRaw = JSON.parse(localStorage.getItem('ks_loyalty') || '{"balance":0,"tier":"Bronze","lifetimePoints":0}')
    const deducted = Math.max(0, loyaltyRaw.balance - (receipt.pointsEarned || 0))
    localStorage.setItem('ks_loyalty', JSON.stringify({ ...loyaltyRaw, balance: deducted }))
    setRefundState('done')
  }

  const loyaltyData = (() => {
    try { return JSON.parse(localStorage.getItem('ks_loyalty') || '{"balance":0,"tier":"Bronze","lifetimePoints":0}') } catch { return { balance: 0, tier: 'Bronze', lifetimePoints: 0 } }
  })()

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-7 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} className="text-green-600" />
        </div>
        <h2 className="text-[20px] font-bold text-slate-800 mb-1">Payment Complete</h2>
        <p className="text-slate-400 text-[13px] capitalize">{receipt.time} · via {receipt.payMethod}</p>
        {receipt.transaction_id && (
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">Txn #{receipt.transaction_id}</p>
        )}
        <div className="mb-6" />
        {receipt.client && (
          <p className="text-[13px] font-semibold text-[#0D9488] mb-4">
            {receipt.client.first_name} {receipt.client.last_name}
          </p>
        )}
        <div className="text-left space-y-1.5 text-[13px] mb-5">
          {receipt.items.map((i, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="text-slate-600">{i.name} × {i.qty}</span>
              <span className="font-medium">{formatCurrency(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 space-y-1">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(receipt.discount)}</span></div>}
            <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(receipt.taxAmount)}</span></div>
            {receipt.tipAmount > 0 && <div className="flex justify-between text-slate-500"><span>Tip</span><span>{formatCurrency(receipt.tipAmount)}</span></div>}
            <div className="flex justify-between text-[15px] font-bold pt-1"><span>Total</span><span className="text-[#0D9488]">{formatCurrency(receipt.grandTotal)}</span></div>
          </div>
        </div>
        {receipt.client && (
          <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-3 mb-4">
            <p className="text-[11px] text-[#0D9488] font-semibold">Rebooking prompt will appear shortly…</p>
          </div>
        )}
        {receipt.pointsEarned > 0 && (
          <div className="rounded-xl p-4 mb-4 text-white text-left" style={{background:'linear-gradient(135deg,#0D9488,#14B8A6)'}}>
            <p className="text-[14px] font-bold mb-0.5">Earned {receipt.pointsEarned} loyalty points</p>
            <p className="text-[12px] opacity-90">Balance: {loyaltyData.balance} pts · {loyaltyData.tier} tier</p>
          </div>
        )}
        <button onClick={onDone} className="w-full py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors mb-2">
          New Transaction
        </button>
        {receipt.client && receipt.transaction_id && (
          <div className="mb-3">
            <button
              onClick={handleTextToPay}
              disabled={textPayState === 'sending' || textPayState === 'sent'}
              className="w-full py-2.5 rounded-xl border border-[#0D9488] text-[#0D9488] text-[13px] font-semibold hover:bg-[#F0FDFA] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone size={14} />
              {textPayState === 'sending' ? 'Sending…' : textPayState === 'sent' ? 'Link Sent!' : 'Text to Pay'}
            </button>
            {textPayMsg && (
              <p className={`text-[11px] mt-1.5 text-center ${textPayState === 'sent' ? 'text-[#0D9488]' : 'text-red-500'}`}>
                {textPayMsg}
              </p>
            )}
          </div>
        )}
        {refundState === 'idle' && (
          <button onClick={() => setRefundState('confirm')} className="text-red-400 text-[12px] hover:text-red-600 transition-colors">
            Process Refund
          </button>
        )}
        {refundState === 'confirm' && (
          <div className="mt-3 p-4 rounded-xl border border-red-200 bg-red-50 text-left">
            <p className="text-[13px] font-semibold text-red-700 mb-1">Refund {formatCurrency(receipt.grandTotal)} via {receipt.payMethod}?</p>
            <p className="text-[11px] text-red-500 mb-3">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setRefundState('idle')} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRefund} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 transition-colors">
                Process Refund
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
