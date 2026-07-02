import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Check, Search, Copy, Sparkles } from 'lucide-react'

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

/* ── Gift Card Visual ──────────────────────────────────────── */
function GiftCardPreview({ amount, senderName, recipientName, message }) {
  return (
    <div className="relative rounded-3xl overflow-hidden w-full aspect-[1.7/1] select-none"
      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 60%, #4F46E5 100%)' }}>
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-6 w-44 h-44 rounded-full bg-white/5" />
      <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-white/10" />

      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        {/* Top */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/60 text-[11px] font-semibold tracking-widest uppercase">Gift Card</div>
            <div className="text-white font-black text-[17px] mt-0.5">Kriyansh Beauty Bar</div>
          </div>
          <Gift size={22} className="text-white/50 mt-0.5" />
        </div>

        {/* Amount */}
        <div className="text-white font-black text-[42px] leading-none">
          ${amount || '—'}
        </div>

        {/* Bottom */}
        <div>
          {message && <div className="text-white/60 text-[11px] italic mb-2 truncate">"{message}"</div>}
          <div className="flex items-center justify-between">
            <div className="text-white/70 text-[11px]">
              {senderName ? `From ${senderName}` : 'From —'}{recipientName ? ` · To ${recipientName}` : ''}
            </div>
            <Sparkles size={14} className="text-white/40" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Check Balance Tab ─────────────────────────────────────── */
function CheckBalance() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCheck() {
    if (!code.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/gift-cards/validate?code=${encodeURIComponent(code.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Not found'); return }
      setResult(data)
    } catch { setError('Network error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Enter gift card code</label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] font-mono tracking-widest focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />
          <button onClick={handleCheck} disabled={loading || !code.trim()}
            className="px-4 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
            <Search size={16} />
          </button>
        </div>
        {error && <p className="text-[12px] text-red-500 mt-1.5">{error}</p>}
      </div>

      {result && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check size={16} className="bg-emerald-100 rounded-full p-0.5" />
            <span className="text-[13px] font-bold">Valid gift card</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Original value', value: `$${result.initial_amount}` },
              { label: 'Used',           value: `$${result.redeemed_amount}` },
              { label: 'Balance',        value: `$${result.balance}` },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-[18px] font-black text-slate-900">{s.value}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {result.sender_name && (
            <div className="text-[12px] text-slate-400">From {result.sender_name}</div>
          )}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${Math.max(0, 100 - (result.redeemed_amount / result.initial_amount) * 100)}%`, background: 'linear-gradient(90deg, #6366F1, #7C3AED)' }} />
          </div>
          <p className="text-[11px] text-slate-400">Present this card at checkout to redeem your balance.</p>
        </div>
      )}
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────── */
export default function CustomerGiftCard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('send')   // 'send' | 'check'
  const [step, setStep] = useState(1)       // 1=amount, 2=details, 3=success

  // Form state
  const [amount, setAmount]           = useState(50)
  const [customAmt, setCustomAmt]     = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [senderName, setSenderName]   = useState('')
  const [message, setMessage]         = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [copied, setCopied]           = useState(false)

  const finalAmount = customAmt ? parseFloat(customAmt) || 0 : amount

  function handlePurchase() {
    const code = generateCode()
    setGeneratedCode(code)
    setStep(3)
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setStep(1); setAmount(50); setCustomAmt(''); setRecipientName('')
    setRecipientEmail(''); setSenderName(''); setMessage(''); setGeneratedCode('')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => step > 1 && step < 3 ? setStep(s => s - 1) : navigate(-1)}
            className="flex items-center justify-center text-slate-500 hover:text-slate-800">
            <ArrowLeft size={18} />
          </button>
          <span className="text-[15px] font-bold text-slate-800 flex-1">
            {tab === 'check' ? 'Check gift card balance' : step === 3 ? 'Gift card sent!' : 'Send a gift card'}
          </span>
          {step === 1 && (
            <button onClick={() => setTab(t => t === 'send' ? 'check' : 'send')}
              className="text-[12px] font-semibold text-indigo-600">
              {tab === 'send' ? 'Check balance' : 'Send a gift'}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Check balance tab ── */}
        {tab === 'check' && <CheckBalance />}

        {/* ── Send flow ── */}
        {tab === 'send' && (
          <>
            {/* Live preview */}
            <GiftCardPreview
              amount={finalAmount || '—'}
              senderName={senderName}
              recipientName={recipientName}
              message={message}
            />

            {/* Step 1 — Amount */}
            {step === 1 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="text-[15px] font-bold text-slate-900">Choose an amount</div>
                <div className="grid grid-cols-3 gap-2">
                  {AMOUNTS.map(a => (
                    <button key={a} onClick={() => { setAmount(a); setCustomAmt('') }}
                      className={`py-2.5 rounded-xl text-[14px] font-bold border-2 transition-all
                        ${amount === a && !customAmt ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                      ${a}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-400 mb-1.5">Or enter custom amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">$</span>
                    <input
                      type="number" min="10" max="1000"
                      value={customAmt}
                      onChange={e => { setCustomAmt(e.target.value); setAmount(0) }}
                      placeholder="e.g. 120"
                      className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!finalAmount || finalAmount < 10}
                  className="w-full py-3 rounded-xl text-white text-[14px] font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
                  Continue · ${finalAmount || '—'}
                </button>
              </div>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="text-[15px] font-bold text-slate-900">Gift card details</div>
                {[
                  { label: "Recipient's name *", val: recipientName, set: setRecipientName, ph: 'Jane Doe', type: 'text' },
                  { label: "Recipient's email *", val: recipientEmail, set: setRecipientEmail, ph: 'jane@email.com', type: 'email' },
                  { label: 'Your name', val: senderName, set: setSenderName, ph: 'Your name', type: 'text' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                  </div>
                ))}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Personal message (optional)</label>
                  <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Happy birthday! Treat yourself…"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] resize-none focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[13px] text-indigo-700 font-semibold">Total charge</span>
                  <span className="text-[18px] font-black text-indigo-700">${finalAmount}</span>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={!recipientName || !recipientEmail}
                  className="w-full py-3 rounded-xl text-white text-[14px] font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
                  Send gift card · ${finalAmount}
                </button>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Check size={26} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-[20px] font-black text-slate-900">Gift card sent!</div>
                  <div className="text-[13px] text-slate-400 mt-1">
                    A ${finalAmount} gift card has been sent to <strong>{recipientEmail}</strong>
                  </div>
                </div>

                {/* Code display */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Gift card code</div>
                  <div className="text-[20px] font-mono font-black text-slate-900 tracking-widest">{generatedCode}</div>
                  <button onClick={handleCopy}
                    className={`flex items-center gap-1.5 mx-auto text-[12px] font-semibold transition-colors ${copied ? 'text-emerald-600' : 'text-indigo-600 hover:text-indigo-700'}`}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy code'}
                  </button>
                </div>

                <div className="text-[12px] text-slate-400 bg-slate-50 rounded-xl p-3 text-left">
                  <strong className="text-slate-600">How to redeem:</strong> Share this code with {recipientName}. They can use it at checkout when booking a service at Kriyansh Beauty Bar — online or in-store.
                </div>

                <div className="flex gap-3">
                  <button onClick={reset}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50">
                    Send another
                  </button>
                  <button onClick={() => navigate('/home')}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
                    Back to home
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
