import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  MapPin, Clock, Search,
  ArrowLeft, Heart, Share2, Phone,
  ChevronDown, X, Check,
  User, Activity, Wallet, MessageSquare, Star, Settings, LogOut, HelpCircle, Smartphone,
} from 'lucide-react'

function IgIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}
function FbIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z"/>
    </svg>
  )
}
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

const SOCIAL = [
  { label: 'Instagram', href: 'https://instagram.com/kriyanshbeautybar', icon: IgIcon, color: '#E1306C' },
  { label: 'Facebook',  href: 'https://facebook.com/kriyanshbeautybar',  icon: FbIcon, color: '#1877F2' },
  { label: 'TikTok',    href: 'https://tiktok.com/@kriyanshbeautybar',   icon: TikTokIcon, color: '#000000' },
  { label: 'Google',    href: 'https://g.page/kriyanshbeautybar',        icon: GoogleIcon, color: '#4285F4' },
]

const SALON = {
  name: 'Kriyansh Beauty Bar',
  address: '12007 Paramount Blvd, Downey, CA 90242',
  phone: '+1 (562) 555-0192',
  rating: 5.0,
  reviewCount: 212,
  cover: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
  hours: {
    Mon: 'Closed',
    Tue: '10:00 am – 7:00 pm',
    Wed: '10:00 am – 7:00 pm',
    Thu: '10:00 am – 7:00 pm',
    Fri: '10:00 am – 7:00 pm',
    Sat: '10:00 am – 7:00 pm',
    Sun: '11:00 am – 4:00 pm',
  },
}


const STAFF = [
  {
    id: 1,
    name: 'Priyankkaa',
    role: 'Lead Aesthetician',
    rating: 5.0,
    reviews: 212,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    specialties: ['Facials', 'Threading', 'Eyelashes'],
  },
  {
    id: 2,
    name: 'Sofia',
    role: 'Wax Specialist',
    rating: 4.9,
    reviews: 87,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
    specialties: ['Body Waxing', 'Face Waxing'],
  },
]

const REVIEWS = [
  { id:1, name:'Aisha R.',   rating:5, date:'2 days ago',   text:'Priyankkaa is absolutely amazing! My skin has never looked better. The deep cleansing facial left me glowing for weeks.', avatar:'A' },
  { id:2, name:'Melissa T.', rating:5, date:'1 week ago',   text:'Best brow threading I\'ve ever had. Super precise, barely any pain. Will definitely be coming back every 2 weeks!', avatar:'M' },
  { id:3, name:'Diana K.',   rating:5, date:'2 weeks ago',  text:'The lash set I got here is stunning. Everyone keeps asking me about them. The staff is so welcoming and warm.', avatar:'D' },
  { id:4, name:'Camila V.',  rating:5, date:'3 weeks ago',  text:'Brazilian wax was quick and professional. The atmosphere is so clean and relaxing. Definitely my new go-to spot!', avatar:'C' },
]

function Stars({ count = 5, filled = 5, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i < Math.round(filled) ? '#FBBF24' : '#E5E7EB'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

export default function CustomerHome() {
  const navigate = useNavigate()
  const customer = JSON.parse(localStorage.getItem('salonos_customer') || '{}')
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Guest'
  const customerInitial = (customer.first_name || 'G')[0].toUpperCase()
  const customerPhone = customer.phone || ''
  const [activeTab, setActiveTab] = useState('services')
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [hoursOpen, setHoursOpen] = useState(false)
  const [savedHeart, setSavedHeart] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef(null)

  const { data: allServices = [] } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => axios.get('/api/public/services').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Derive category list from the live services
  const categoryNames = ['All', ...Array.from(new Set(allServices.map(s => s.category_name))).filter(Boolean)]

  useEffect(() => {
    function handleClick(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })

  const filteredServices = allServices.filter(s => {
    const matchCat = activeCategory === 'All' || s.category_name === activeCategory
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  function addToCart(service) {
    setCart(c => c.find(x => x.id === service.id) ? c : [...c, service])
  }

  function removeFromCart(id) {
    setCart(c => c.filter(x => x.id !== id))
  }

  const cartTotal = cart.reduce((sum, s) => sum + s.price, 0)
  const cartDuration = cart.reduce((sum, s) => sum + s.duration_min, 0)

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">

      {/* ── Sticky top nav ─────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/welcome')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-[13px]">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-[15px] font-bold text-slate-800">Kriyansh Beauty Bar</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSavedHeart(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <Heart size={18} className={savedHeart ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
              <Share2 size={16} className="text-slate-400" />
            </button>

            {/* Avatar + dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(v => !v)}
                className="flex items-center gap-1.5 ml-1 pl-1 pr-2 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-black"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
                  {customerInitial}
                </div>
                <ChevronDown size={13} className={`text-slate-500 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-[13px] font-bold text-slate-900">{customerName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{customerPhone}</div>
                  </div>

                  {/* Menu items */}
                  {[
                    { icon: User,          label: 'Profile',    tab: 'profile' },
                    { icon: Activity,      label: 'Activity',   tab: 'activity' },
                    { icon: Wallet,        label: 'Wallet',     tab: 'wallet' },
                    { icon: MessageSquare, label: 'Messages',   tab: 'messages' },
                    { icon: Star,          label: 'Favourites', tab: 'favourites' },
                    { icon: Settings,      label: 'Settings',   tab: 'settings' },
                  ].map(item => (
                    <button key={item.label}
                      onClick={() => { setAvatarOpen(false); navigate(`/account?tab=${item.tab}`) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                      <item.icon size={15} className="text-slate-400" />
                      {item.label}
                    </button>
                  ))}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                      <Smartphone size={15} className="text-slate-400" /> Download the app
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors text-left">
                      <HelpCircle size={15} className="text-slate-400" /> Help & support
                    </button>
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-1 pb-1">
                    <button
                      onClick={() => navigate('/auth')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left">
                      <LogOut size={15} className="text-red-400" /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero cover ─────────────────────────────────── */}
      <div className="relative h-52 md:h-72 overflow-hidden">
        <img src={SALON.cover} alt="Kriyansh Beauty Bar" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* ── Salon info card ────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 -mt-10 relative z-10 p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black text-slate-900 leading-tight">{SALON.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Stars filled={SALON.rating} size={14} />
                  <span className="text-[13px] font-bold text-slate-800">{SALON.rating.toFixed(1)}</span>
                  <span className="text-[13px] text-slate-400">({SALON.reviewCount} reviews)</span>
                </div>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
              </div>
              <div className="flex items-start gap-1.5 mt-2">
                <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="text-[13px] text-slate-500">{SALON.address}</span>
              </div>
              {/* Social links */}
              <div className="flex items-center gap-2 mt-3">
                {SOCIAL.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    title={s.label}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors"
                    style={{ color: s.color }}
                  >
                    <s.icon size={16} />
                  </a>
                ))}
              </div>

              {/* Hours toggle */}
              <button onClick={() => setHoursOpen(v => !v)}
                className="flex items-center gap-1.5 mt-2.5 group">
                <Clock size={13} className="text-slate-400" />
                <span className="text-[13px] text-slate-500 group-hover:text-slate-700 transition-colors">
                  {SALON.hours[today] === 'Closed'
                    ? <span className="text-red-500 font-medium">Closed today</span>
                    : <><span className="text-emerald-600 font-medium">Open</span> · {SALON.hours[today]}</>}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${hoursOpen ? 'rotate-180' : ''}`} />
              </button>
              {hoursOpen && (
                <div className="mt-2 ml-5 bg-slate-50 rounded-xl px-3 py-2 space-y-1">
                  {Object.entries(SALON.hours).map(([day, hrs]) => (
                    <div key={day} className={`grid grid-cols-[56px_1fr] items-center text-[12px] ${day === today ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                      <span className={day === today ? 'text-[#0D9488]' : ''}>{day}</span>
                      <span className={hrs === 'Closed' ? 'text-red-400' : ''}>{hrs}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Book CTA */}
            <button onClick={() => navigate('/book-options')}
              className="shrink-0 px-5 py-2.5 rounded-xl text-white text-[14px] font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
              Book now
            </button>
          </div>
        </div>

        {/* ── Tab navigation ─────────────────────────────── */}
        <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-200 shadow-md p-1.5 mb-5 overflow-x-auto scrollbar-hide">
          {['services', 'team', 'reviews', 'about'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-fit px-4 py-2.5 rounded-xl text-[13px] font-bold capitalize transition-all ${activeTab === tab ? 'text-white shadow-lg' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
              style={activeTab === tab ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' } : {}}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Services tab ───────────────────────────────── */}
        {activeTab === 'services' && (
          <div className="space-y-4 pb-32">
            {/* Search bar */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-teal-100 transition-all"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categoryNames.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${activeCategory === cat ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={activeCategory === cat ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Service cards grouped by category */}
            {(activeCategory === 'All' ? categoryNames.slice(1) : [activeCategory]).map(cat => {
              const services = filteredServices.filter(s => s.category_name === cat)
              if (!services.length) return null
              const durationLabel = min => min >= 60
                ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ''}`
                : `${min} min`
              return (
                <div key={cat}>
                  <h3 className="text-[15px] font-black text-slate-800 mb-2 px-1">{cat}</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden divide-y divide-slate-50">
                    {services.map(svc => {
                      const inCart = cart.find(x => x.id === svc.id)
                      const priceLabel = svc.price_type === 'from' ? `from $${svc.price}` : `$${svc.price}`
                      return (
                        <div key={svc.id}
                          onClick={() => setSelectedService(svc)}
                          className="flex items-center justify-between px-4 py-5 hover:bg-slate-50/60 transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-semibold text-slate-800">{svc.name}</span>
                              {svc.gender === 'female' && (
                                <span className="text-[10px] font-semibold text-pink-400">♀ female</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                <Clock size={10} className="text-slate-400" />
                                ~{durationLabel(svc.duration_min)}
                              </span>
                              {svc.price > 0 && (
                                <span className="text-[13px] font-bold text-slate-700">{priceLabel}</span>
                              )}
                              {svc.price === 0 && <span className="text-[13px] font-bold text-emerald-600">Free</span>}
                            </div>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); inCart ? removeFromCart(svc.id) : addToCart(svc) }}
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-90 border-2 ${inCart ? 'border-[#0D9488] text-[#0D9488] bg-teal-50' : 'border-slate-200 text-slate-400 hover:border-[#6366F1] hover:text-[#6366F1]'}`}>
                            {inCart ? <Check size={15} /> : '+'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Team tab ───────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
            {STAFF.map(member => (
              <div key={member.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-4 mb-3">
                  <img src={member.avatar} alt={member.name}
                    className="w-14 h-14 rounded-2xl object-cover" />
                  <div>
                    <div className="text-[15px] font-bold text-slate-800">{member.name}</div>
                    <div className="text-[12px] text-slate-500">{member.role}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Stars filled={member.rating} size={12} />
                      <span className="text-[12px] font-semibold text-slate-700">{member.rating.toFixed(1)}</span>
                      <span className="text-[12px] text-slate-400">({member.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {member.specialties.map(s => (
                    <span key={s} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/book', { state: { staffId: member.id } })}
                  className="mt-4 w-full py-2.5 rounded-xl text-[13px] font-bold border-2 border-[#0D9488] text-[#0D9488] hover:bg-teal-50 transition-colors">
                  Book with {member.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Reviews tab ────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="space-y-3 pb-10">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-5">
              <div className="text-center">
                <div className="text-[42px] font-black text-slate-900 leading-none">{SALON.rating.toFixed(1)}</div>
                <Stars filled={SALON.rating} size={16} />
                <div className="text-[12px] text-slate-400 mt-1">{SALON.reviewCount} reviews</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5,4,3,2,1].map(n => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-2">{n}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400"
                        style={{ width: n === 5 ? '96%' : n === 4 ? '3%' : '1%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {REVIEWS.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
                      style={{ background: 'linear-gradient(135deg, #0D9488, #6366F1)' }}>
                      {r.avatar}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-800">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.date}</div>
                    </div>
                  </div>
                  <Stars filled={r.rating} size={12} />
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── About tab ──────────────────────────────────── */}
        {activeTab === 'about' && (
          <div className="space-y-4 pb-10">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="text-[15px] font-bold text-slate-800 mb-2">About us</h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Kriyansh Beauty Bar is where relaxation meets rejuvenation. Located in the heart of Downey, CA,
                we offer a full range of beauty services — from precision threading and waxing to advanced
                facials and lash extensions. Our team of licensed aestheticians is dedicated to making you
                look and feel your absolute best.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-slate-50">
                <h3 className="text-[15px] font-bold text-slate-800">Hours</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {Object.entries(SALON.hours).map(([day, hrs]) => {
                  const isToday = day === today
                  return (
                    <div key={day} className={`grid grid-cols-[72px_1fr] items-center px-5 py-2.5 text-[13px] ${isToday ? 'bg-teal-50/60' : ''}`}>
                      <span className={isToday ? 'font-bold text-[#0D9488]' : 'text-slate-500'}>
                        {isToday ? `${day} ·` : day}
                      </span>
                      <span className={hrs === 'Closed' ? 'text-red-400 font-medium' : isToday ? 'font-semibold text-slate-800' : 'text-slate-600'}>
                        {hrs}{isToday && <span className="ml-2 text-[11px] font-semibold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Today</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-slate-800">Contact & Social</h3>
              <a href={`tel:${SALON.phone}`} className="flex items-center gap-3 text-[13px] text-slate-600 hover:text-[#0D9488] transition-colors">
                <Phone size={15} className="text-slate-400" /> {SALON.phone}
              </a>
              <div className="flex items-center gap-3 text-[13px] text-slate-600">
                <MapPin size={15} className="text-slate-400" /> {SALON.address}
              </div>
              <div className="pt-1 flex items-center gap-2.5 flex-wrap">
                {SOCIAL.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-[12px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    style={{ color: s.color }}
                  >
                    <s.icon size={14} />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cart / Book bar (sticky bottom) ────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="text-white">
                  <div className="text-[15px] font-bold">
                    {cart.length} service{cart.length > 1 ? 's' : ''} · {cartDuration} min
                  </div>
                  <div className="text-[13px] text-white/75">Total from ${cartTotal}</div>
                </div>
                <button onClick={() => navigate('/book', { state: { cart } })}
                  className="bg-white text-[#0D9488] text-[14px] font-black px-6 py-2.5 rounded-xl hover:opacity-90 transition-all active:scale-95">
                  Book →
                </button>
              </div>
              {/* Cart items preview */}
              <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {cart.map(svc => (
                  <div key={svc.id} className="shrink-0 flex items-center gap-2 bg-white/15 rounded-full pl-3 pr-2 py-1">
                    <span className="text-[12px] text-white font-medium">{svc.name}</span>
                    <button onClick={() => removeFromCart(svc.id)}
                      className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40 transition-colors">
                      <X size={9} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Service detail modal ───────────────────────── */}
      {selectedService && (() => {
        const svc = selectedService
        const inCart = cart.find(x => x.id === svc.id)
        return (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
            onClick={() => setSelectedService(null)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Sheet */}
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
              style={{ fontFamily: "'Roboto', sans-serif" }}
              onClick={e => e.stopPropagation()}>

              {/* Close */}
              <button onClick={() => setSelectedService(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center z-10">
                <X size={17} className="text-slate-600" />
              </button>

              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Content */}
              <div className="px-8 pt-6 pb-8 space-y-5">
                {/* Header */}
                <div>
                  <h2 className="text-[30px] font-black text-slate-900 leading-tight pr-10">{svc.name}</h2>
                  {svc.category_name && (
                    <span className="inline-block mt-2 text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full">{svc.category_name}</span>
                  )}
                </div>

                {/* Gender indicator */}
                {svc.gender === 'female' && (
                  <div className="flex items-center gap-1.5 text-[14px] text-slate-500">
                    <span className="text-[16px]">♀</span> Female only
                  </div>
                )}

                {/* Description */}
                {svc.description && (
                  <p className="text-[15px] text-slate-500 leading-relaxed">{svc.description}</p>
                )}

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Footer: price + action */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[24px] font-black text-slate-900">
                      {svc.price === 0 ? 'Free' : svc.price_type === 'from' ? `from $${svc.price}` : `$${svc.price}`}
                    </div>
                    <div className="text-[14px] text-slate-400 mt-0.5">{svc.duration_min} mins</div>
                  </div>
                  <button
                    onClick={() => {
                      inCart ? removeFromCart(svc.id) : addToCart(svc)
                      setSelectedService(null)
                    }}
                    className={`px-8 py-3 rounded-2xl text-[15px] font-black transition-all active:scale-95
                      ${inCart
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'text-white hover:opacity-90'}`}
                    style={!inCart ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}>
                    {inCart ? 'Remove' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
