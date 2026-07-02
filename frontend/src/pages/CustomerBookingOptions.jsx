import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, User, CreditCard, Gift } from 'lucide-react'

const OPTIONS = [
  {
    id: 'appointment',
    label: 'Book an appointment',
    sub: 'Schedule services for yourself',
    icon: User,
    route: '/home',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
    primary: true,
  },
  {
    id: 'membership',
    label: 'Buy membership',
    sub: 'Subscribe and save on every visit',
    icon: CreditCard,
    route: '/membership',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)',
    primary: false,
  },
  {
    id: 'gift',
    label: 'Send a gift',
    sub: 'Treat yourself or a friend to future visits',
    icon: Gift,
    route: '/gift',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    primary: false,
  },
]

export default function CustomerBookingOptions() {
  const navigate = useNavigate()

  function handleSelect(opt) {
    if (opt.route) navigate(opt.route)
  }

  const Card = ({ opt }) => (
    <button key={opt.id} onClick={() => handleSelect(opt)}
      className="w-full flex items-center justify-between bg-white rounded-2xl px-5 py-5 border border-slate-100 transition-all text-left active:scale-[0.99]"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 36px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)'}>
      <div>
        <div className="text-[17px] font-bold text-slate-900">{opt.label}</div>
        <div className="text-[13px] text-slate-500 mt-0.5">{opt.sub}</div>
      </div>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ml-4"
        style={{ background: opt.gradient }}>
        <opt.icon size={19} className="text-white" />
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <button onClick={() => navigate('/home')}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <X size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6 max-w-xl mx-auto w-full">
        <h1 className="text-[32px] font-black text-slate-900 mb-8 leading-tight">
          Select an option
        </h1>

        {/* Primary */}
        <div className="mb-3">
          {OPTIONS.filter(o => o.primary).map(opt => <Card key={opt.id} opt={opt} />)}
        </div>

        {/* More */}
        <div className="mt-7">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">More</p>
          <div className="space-y-3">
            {OPTIONS.filter(o => !o.primary).map(opt => <Card key={opt.id} opt={opt} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
