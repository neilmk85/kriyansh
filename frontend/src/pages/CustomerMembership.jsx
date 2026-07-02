import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles, Zap, Crown, Star, ChevronDown, ChevronUp } from 'lucide-react'

const PLANS = [
  {
    id: 'glow',
    name: 'Glow',
    tagline: 'Perfect for beginners',
    icon: Sparkles,
    color: '#0D9488',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
    monthlyPrice: 49,
    annualPrice: 39,
    popular: false,
    perks: [
      '1 facial per month',
      '2 threading sessions/month',
      '10% off all additional services',
      'Birthday bonus treatment',
      'Online booking priority',
    ],
    notIncluded: [
      'Waxing sessions',
      'Lash services',
      'Exclusive member events',
    ],
  },
  {
    id: 'radiance',
    name: 'Radiance',
    tagline: 'Most popular choice',
    icon: Zap,
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    monthlyPrice: 99,
    annualPrice: 79,
    popular: true,
    perks: [
      '2 facials per month',
      'Unlimited threading',
      '2 waxing sessions/month',
      '20% off all additional services',
      'Birthday bonus treatment',
      'Skip-the-queue booking',
      'Free skin consultation',
    ],
    notIncluded: [
      'Lash services',
      'Exclusive member events',
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    tagline: 'The full experience',
    icon: Crown,
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    monthlyPrice: 179,
    annualPrice: 149,
    popular: false,
    perks: [
      'Unlimited facials',
      'Unlimited threading',
      'Unlimited waxing',
      '1 lash service/month',
      '30% off all additional services',
      'Priority same-day booking',
      'Exclusive member events',
      'Dedicated beauty concierge',
      'Free product samples monthly',
    ],
    notIncluded: [],
  },
]

const FAQS = [
  {
    q: 'Can I pause or cancel my membership?',
    a: 'Yes — you can pause for up to 2 months per year or cancel anytime with 30 days notice. No cancellation fees.',
  },
  {
    q: 'Do unused sessions roll over?',
    a: 'Sessions roll over for up to 60 days. After that, they expire to keep things fair for everyone.',
  },
  {
    q: 'Can I share my membership?',
    a: 'Memberships are personal and non-transferable, but you can gift a separate membership to a friend.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major credit/debit cards. Annual memberships save you up to 20% compared to monthly.',
  },
]

function PlanCard({ plan, billing, selected, onSelect }) {
  const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice
  const Icon = plan.icon

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`relative rounded-3xl border-2 cursor-pointer transition-all duration-200 overflow-hidden
        ${selected === plan.id ? 'border-transparent shadow-2xl scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'}`}
      style={selected === plan.id ? { background: '#fff', borderColor: plan.color, boxShadow: `0 20px 60px ${plan.color}30` } : {}}>

      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px">
          <div className="text-[10px] font-black text-white uppercase tracking-widest px-4 py-1 rounded-b-xl"
            style={{ background: plan.gradient }}>
            Most Popular
          </div>
        </div>
      )}

      {/* Card header */}
      <div className="pt-8 pb-5 px-6" style={selected === plan.id ? { background: plan.gradient } : {}}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${selected === plan.id ? 'bg-white/20' : 'bg-slate-100'}`}>
          <Icon size={18} className={selected === plan.id ? 'text-white' : ''} style={selected !== plan.id ? { color: plan.color } : {}} />
        </div>
        <div className={`text-[22px] font-black ${selected === plan.id ? 'text-white' : 'text-slate-900'}`}>{plan.name}</div>
        <div className={`text-[12px] mt-0.5 ${selected === plan.id ? 'text-white/70' : 'text-slate-400'}`}>{plan.tagline}</div>
        <div className={`mt-4 flex items-end gap-1 ${selected === plan.id ? 'text-white' : 'text-slate-900'}`}>
          <span className="text-[38px] font-black leading-none">${price}</span>
          <span className={`text-[13px] pb-1.5 ${selected === plan.id ? 'text-white/70' : 'text-slate-400'}`}>/month</span>
        </div>
        {billing === 'annual' && (
          <div className={`text-[11px] font-semibold mt-1 ${selected === plan.id ? 'text-white/80' : 'text-emerald-600'}`}>
            Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/year
          </div>
        )}
      </div>

      {/* Perks */}
      <div className="px-6 py-5 space-y-2.5">
        {plan.perks.map(p => (
          <div key={p} className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: plan.gradient }}>
              <Check size={9} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-[13px] text-slate-700">{p}</span>
          </div>
        ))}
        {plan.notIncluded.map(p => (
          <div key={p} className="flex items-start gap-2.5 opacity-40">
            <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 mt-0.5" />
            <span className="text-[13px] text-slate-500 line-through">{p}</span>
          </div>
        ))}
      </div>

      {/* Select indicator */}
      <div className="px-6 pb-5">
        <div className={`h-10 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all border-2
          ${selected === plan.id
            ? 'text-white border-transparent'
            : 'border-slate-200 text-slate-500'}`}
          style={selected === plan.id ? { background: plan.gradient } : {}}>
          {selected === plan.id ? 'Selected' : 'Select plan'}
        </div>
      </div>
    </div>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="text-[14px] font-semibold text-slate-800 pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-[13px] text-slate-500 leading-relaxed border-t border-slate-50 pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

export default function CustomerMembership() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState('monthly')
  const [selected, setSelected] = useState('radiance')

  const selectedPlan = PLANS.find(p => p.id === selected)
  const price = billing === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* ── Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2f1 0%, #ede9fe 50%, #ddd6fe 100%)' }}>
        {/* Glowing orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)' }} />
          <div className="absolute -bottom-10 -right-10 w-96 h-96 rounded-full opacity-35" style={{ background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #a5b4fc 0%, transparent 70%)' }} />
        </div>

        {/* Nav inside hero */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center justify-center hover:opacity-70 transition-opacity">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-slate-600">Kriyansh Beauty Bar</div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-4 pb-8 text-center">
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@1,900&display=swap');`}</style>
          <h1 className="text-[38px] md:text-[48px] leading-[1.15] mb-3 tracking-tight text-slate-900 whitespace-nowrap"
              style={{ fontFamily: "'Roboto', sans-serif", fontStyle: 'italic', fontWeight: 900 }}>
            Your beauty,{' '}
            <span style={{ background: 'linear-gradient(90deg, #0D9488 0%, #6366F1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'inline-block' }}>
              on a plan.
            </span>
          </h1>

          <p className="text-[15px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
            Unlimited beauty treatments at a flat monthly rate. Cancel or pause anytime.
          </p>

          {/* Floating stat chips */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: '212 members', sub: 'and growing' },
              { label: 'Save up to $600', sub: 'per year on VIP' },
              { label: 'No commitment', sub: 'cancel anytime' },
            ].map(chip => (
              <div key={chip.label} className="text-center rounded-2xl px-5 py-3"
                style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
                <div className="text-[14px] font-black text-slate-800">{chip.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{chip.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave bottom */}
        <div className="relative z-10">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '40px' }}>
            <path d="M0 40 L0 20 Q360 0 720 20 Q1080 40 1440 20 L1440 40 Z" fill="#F8F9FA" />
          </svg>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8 pb-32">

        {/* ── Billing toggle ───────────────────────────── */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white border border-slate-200 shadow-sm rounded-2xl p-1">
            <button onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all ${billing === 'monthly' ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              style={billing === 'monthly' ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
              Monthly
            </button>
            <button onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${billing === 'annual' ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              style={billing === 'annual' ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
              Annual
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${billing === 'annual' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PLANS.map(plan => (
            <PlanCard key={plan.id} plan={plan} billing={billing} selected={selected} onSelect={setSelected} />
          ))}
        </div>

        {/* ── What's included callout ──────────────────── */}
        <div className="rounded-3xl p-6 mb-10 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 60%, #7C3AED 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
          <div className="relative z-10">
            <div className="text-[11px] font-black uppercase tracking-widest text-white/60 mb-2">All plans include</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'No joining fee', icon: '✓' },
                { label: 'Pause anytime', icon: '⏸' },
                { label: 'Cancel anytime', icon: '↩' },
                { label: 'Loyalty points', icon: '⭐' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 bg-white/10 rounded-2xl px-3 py-2.5">
                  <span className="text-[16px]">{item.icon}</span>
                  <span className="text-[12px] font-semibold text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-[18px] font-black text-slate-900 mb-4">Frequently asked</h2>
          <div className="space-y-2">
            {FAQS.map(faq => <FAQ key={faq.q} {...faq} />)}
          </div>
        </div>
      </div>

      {/* ── Sticky CTA ───────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-slate-800">
              {selectedPlan.name} plan · ${price}/mo
            </div>
            <div className="text-[11px] text-slate-400">
              {billing === 'annual' ? `Billed $${price * 12}/year` : 'Billed monthly · cancel anytime'}
            </div>
          </div>
          <button
            className="shrink-0 px-7 py-3.5 rounded-2xl text-white text-[14px] font-black shadow-lg hover:opacity-90 transition-all active:scale-95"
            style={{ background: selectedPlan.gradient }}>
            Subscribe · ${price}/mo
          </button>
        </div>
      </div>
    </div>
  )
}
