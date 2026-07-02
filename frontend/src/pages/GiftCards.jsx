import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Gift, Plus, Search, Copy, Check, Send, Printer,
  DollarSign, TrendingUp, CreditCard, Clock
} from 'lucide-react'
import api from '@/lib/api'

const AMOUNTS = [25, 50, 75, 100, 150, 200]

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function GiftCards() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [copied, setCopied]     = useState(null)

  // Issue form state
  const [form, setForm] = useState({
    amount: 50,
    custom_amount: '',
    recipient_name: '',
    recipient_email: '',
    sender_name: '',
    message: '',
    code: generateCode(),
  })

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: () => api.get('/gift-cards').then(r => r.data).catch(() => []),
  })

  const issueMut = useMutation({
    mutationFn: (payload) => api.post('/gift-cards', payload),
    onSuccess: () => {
      qc.invalidateQueries(['gift-cards'])
      setShowIssue(false)
      setForm({ ...form, code: generateCode(), recipient_name: '', recipient_email: '', sender_name: '', message: '' })
    },
  })

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const amount = form.custom_amount ? parseFloat(form.custom_amount) || 0 : form.amount
  const filtered = cards.filter(c =>
    !search ||
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient_name?.toLowerCase().includes(search.toLowerCase())
  )

  // Summary stats (mock if no real data yet)
  const totalIssued   = cards.length
  const totalValue    = cards.reduce((s, c) => s + (c.initial_amount || 0), 0)
  const totalRedeemed = cards.reduce((s, c) => s + (c.redeemed_amount || 0), 0)
  const outstanding   = totalValue - totalRedeemed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gift Cards</h1>
          <p className="text-sm text-slate-500 mt-0.5">Issue, track and redeem gift cards</p>
        </div>
        <button
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-sm font-semibold  transition-colors"
        >
          <Plus size={16} />
          Issue Gift Card
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Issued',   value: totalIssued,                  icon: Gift,       color: 'text-teal-600',   bg: 'bg-teal-50'   },
          { label: 'Total Value',    value: `$${totalValue.toFixed(2)}`,  icon: DollarSign, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Redeemed',       value: `$${totalRedeemed.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Outstanding',    value: `$${outstanding.toFixed(2)}`, icon: CreditCard, color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code or recipient…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-7 h-7 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Gift size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No gift cards issued yet</p>
            <p className="text-slate-300 text-xs mt-1">Issue your first gift card to get started</p>
            <button
              onClick={() => setShowIssue(true)}
              className="mt-4 px-4 py-2 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-sm font-semibold  transition-colors"
            >
              + Issue Gift Card
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Code', 'Recipient', 'Amount', 'Balance', 'Status', 'Issued', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(card => {
                const balance = (card.initial_amount || 0) - (card.redeemed_amount || 0)
                const pct = card.initial_amount ? (balance / card.initial_amount) * 100 : 0
                return (
                  <tr key={card.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-700 tracking-wider">
                          {card.code}
                        </span>
                        <button
                          onClick={() => copyCode(card.code)}
                          className="text-slate-400 hover:text-[#0D9488] transition-colors"
                          title="Copy code"
                        >
                          {copied === card.code ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{card.recipient_name || '—'}</p>
                      {card.recipient_email && <p className="text-xs text-slate-400">{card.recipient_email}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">${(card.initial_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">${balance.toFixed(2)}</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0D9488] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        card.status === 'active'   ? 'bg-green-50 text-green-700' :
                        card.status === 'redeemed' ? 'bg-slate-100 text-slate-500' :
                        card.status === 'expired'  ? 'bg-red-50 text-red-500' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {card.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {card.issued_at ? new Date(card.issued_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-[#0D9488] font-semibold hover:underline">Redeem</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Issue Modal */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-[#0D9488]" />
                <h2 className="text-[15px] font-bold text-slate-800">Issue Gift Card</h2>
              </div>
              <button onClick={() => setShowIssue(false)} className="text-slate-400 hover:text-slate-600 text-xl font-light">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Amount selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Amount</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => setForm(f => ({ ...f, amount: a, custom_amount: '' }))}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.amount === a && !form.custom_amount
                          ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0D9488]'
                          : 'border-slate-200 text-slate-600 hover:border-[#0D9488]'
                      }`}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom amount…"
                  value={form.custom_amount}
                  onChange={e => setForm(f => ({ ...f, custom_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gift Card Code</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                  />
                  <button
                    onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-[#0D9488] hover:border-[#0D9488] text-xs font-semibold transition-all"
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recipient Name</label>
                  <input
                    placeholder="Jane Doe"
                    value={form.recipient_name}
                    onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={form.recipient_email}
                    onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From (Sender Name)</label>
                <input
                  placeholder="John Doe"
                  value={form.sender_name}
                  onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Personal Message (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Enjoy your pampering session!"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all"
                />
              </div>

              {/* Preview card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0f766e] text-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Kriyansh Salon · Gift Card</p>
                  <p className="text-3xl font-black mt-1">${amount.toFixed(2)}</p>
                  {form.recipient_name && <p className="text-xs opacity-80 mt-1">For {form.recipient_name}</p>}
                </div>
                <div className="text-right">
                  <Gift size={32} className="opacity-40 ml-auto mb-2" />
                  <p className="font-mono text-xs tracking-widest opacity-80">{form.code}</p>
                </div>
              </div>

              {issueMut.isError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">Failed to issue gift card. Please try again.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setShowIssue(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => issueMut.mutate({ ...form, amount })}
                disabled={issueMut.isPending || !form.code || amount <= 0}
                className="flex-1 py-2.5 text-white bg-gradient-to-r from-[#0D9488] to-[#6366F1] rounded-xl text-sm font-semibold  disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {issueMut.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Gift size={15} />
                    Issue ${amount.toFixed(2)} Gift Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
