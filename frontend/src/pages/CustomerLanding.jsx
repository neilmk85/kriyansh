import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Search, ChevronRight, Star, MapPin, Clock, Check,
  ArrowRight, Sparkles, ChevronDown, Menu, X,
  Scissors, Droplets, Wind, Hand, Flower2, Eye, Smile,
  Zap, Leaf, Gem, Palette, Sun, Heart,
} from 'lucide-react'

const SocialIcons = {
  Instagram: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  Twitter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  Facebook: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  Youtube: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
}

const NAV_LINKS = ['Services', 'Memberships', 'Packages', 'About', 'Blog']

// Icon + gradient + Unsplash image mapping per category
const CATEGORY_STYLE = {
  'Facial Spa':        { icon: Flower2,  bg: 'from-emerald-400 to-teal-600',   img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80' },
  'Lashes':            { icon: Eye,      bg: 'from-violet-400 to-purple-600',  img: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&auto=format&fit=crop&q=80' },
  'Threading':         { icon: Scissors, bg: 'from-rose-400 to-pink-600',      img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80' },
  'Waxing':            { icon: Smile,    bg: 'from-teal-400 to-cyan-600',      img: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=600&auto=format&fit=crop&q=80' },
  'Jacials':           { icon: Sparkles, bg: 'from-fuchsia-400 to-pink-600',   img: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&auto=format&fit=crop&q=80' },
  'Body Treatments':   { icon: Hand,     bg: 'from-blue-400 to-indigo-600',    img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&auto=format&fit=crop&q=80' },
  'Permanent Makeup':  { icon: Palette,  bg: 'from-indigo-400 to-violet-600',  img: 'https://images.unsplash.com/photo-1571290274554-6a2eaa771e5f?w=600&auto=format&fit=crop&q=80' },
  'Specials':          { icon: Gem,      bg: 'from-sky-400 to-blue-600',       img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80' },
  'Hair':              { icon: Wind,     bg: 'from-rose-400 to-pink-600',      img: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&auto=format&fit=crop&q=80' },
}
const DEFAULT_CATEGORY_STYLE = { icon: Sparkles, bg: 'from-slate-400 to-slate-600', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80' }

const STATS = [
  { value: '12,000+', label: 'Happy clients' },
  { value: '4.9★',    label: 'Average rating' },
  { value: '8 years', label: 'In Downey, CA' },
  { value: '100%',    label: 'Satisfaction guarantee' },
]

// Category accent colors for service cards (matches CATEGORY_STYLE gradients)
const CATEGORY_ACCENT = {
  'Facial Spa':        '#10B981',
  'Lashes':            '#8B5CF6',
  'Threading':         '#F43F5E',
  'Waxing':            '#0D9488',
  'Jacials':           '#D946EF',
  'Body Treatments':   '#6366F1',
  'Permanent Makeup':  '#7C3AED',
  'Specials':          '#0EA5E9',
  'Hair':              '#F43F5E',
}
const CATEGORY_BG = {
  'Facial Spa':        'from-emerald-50 to-teal-100',
  'Lashes':            'from-violet-50 to-purple-100',
  'Threading':         'from-rose-50 to-pink-100',
  'Waxing':            'from-teal-50 to-cyan-100',
  'Jacials':           'from-fuchsia-50 to-pink-100',
  'Body Treatments':   'from-blue-50 to-indigo-100',
  'Permanent Makeup':  'from-indigo-50 to-violet-100',
  'Specials':          'from-sky-50 to-blue-100',
  'Hair':              'from-rose-50 to-pink-100',
}

const MEMBERSHIPS = [
  {
    name: 'Essential',
    price: 49,
    cycle: 'per month',
    color: 'from-slate-600 to-slate-800',
    ring: '#64748B',
    perks: ['5% off all services', 'Priority booking', 'Birthday treat', 'Monthly newsletter'],
  },
  {
    name: 'Premium',
    price: 89,
    cycle: 'per month',
    color: 'from-[#0D9488] to-[#0F766E]',
    ring: '#0D9488',
    popular: true,
    perks: ['10% off all services', 'Skip the queue', 'Free blowdry/month', 'Exclusive members events', 'Dedicated stylist'],
  },
  {
    name: 'VIP Annual',
    price: 799,
    cycle: 'per year',
    color: 'from-[#7C3AED] to-[#6D28D9]',
    ring: '#7C3AED',
    perks: ['15% off all services', 'Free service every month', 'Guest passes (×4)', 'VIP-only new treatments', 'Personal beauty consultant'],
  },
]

const PACKAGES = [
  {
    name: 'Colour Care Bundle',
    desc: '3 Full Colour sessions',
    original: 450,
    price: 380,
    savings: 70,
    validity: '6 months',
    color: 'from-sky-400 to-cyan-500',
    services: ['Full Balayage', 'Toner', 'Blowdry'],
  },
  {
    name: 'Haircut Series',
    desc: '5 haircuts for the price of 4',
    original: 225,
    price: 180,
    savings: 45,
    validity: '12 months',
    color: 'from-rose-400 to-pink-500',
    services: ['Signature Cut ×5', 'Complimentary styling tips'],
  },
  {
    name: 'Treatment Package',
    desc: '4 deep conditioning treatments',
    original: 220,
    price: 180,
    savings: 40,
    validity: '4 months',
    color: 'from-emerald-400 to-teal-500',
    services: ['Olaplex Treatment ×4', 'Scalp massage', 'Take-home sample'],
  },
]

const REVIEWS = [
  { name: 'Sarah M.',   avatar: 'SM', color: '#F43F5E', rating: 5, text: 'Absolutely the best salon in Downey. My balayage looks incredible and the team treated me like royalty. Highly recommend!', service: 'Full Balayage' },
  { name: 'James K.',   avatar: 'JK', color: '#0EA5E9', rating: 5, text: 'Been coming here for 3 years. The Premium membership is worth every penny. They remember all my preferences and the results are always perfect.', service: 'Premium Member' },
  { name: 'Priya L.',   avatar: 'PL', color: '#8B5CF6', rating: 5, text: 'The Luxury Facial changed my skin completely. Super relaxing environment, knowledgeable staff, and my skin has never felt better.', service: 'Luxury Facial' },
  { name: 'Emma R.',    avatar: 'ER', color: '#10B981', rating: 5, text: 'Walked in looking for a quick trim, walked out with the best haircut of my life. The stylist totally got my vision. Will be back next month!', service: 'Signature Haircut' },
]

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    const isFloat = target % 1 !== 0
    const num = parseFloat(target)
    let startTime = null
    function step(timestamp) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(isFloat ? (progress * num).toFixed(1) : Math.floor(progress * num))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

export default function CustomerLanding() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => axios.get('/api/public/categories').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const { data: allServices = [] } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => axios.get('/api/public/services').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Pick one featured service per category, up to 6 total
  const featuredServices = (() => {
    const seen = new Set()
    const result = []
    for (const svc of allServices) {
      if (!seen.has(svc.category_name) && result.length < 6) {
        seen.add(svc.category_name)
        result.push(svc)
      }
    }
    return result
  })()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-16 h-16 border-b border-white/20 shadow-sm" style={{ background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 18%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0.4) 100%)', backdropFilter: 'blur(16px)' }}>
        <a href="/">
          <img src="/logo.png" alt="Kriyansh Beauty Bar" className="h-14 w-auto object-contain" />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
              {l}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/auth')}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
            Log in
          </button>
          <button onClick={() => navigate('/auth?mode=signup')}
            className="px-5 py-2 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
            Book now
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 flex flex-col px-6 gap-4">
          {NAV_LINKS.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[18px] font-semibold text-slate-800 border-b border-slate-100">
              {l}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => navigate('/auth')}
              className="py-3 rounded-2xl border-2 border-slate-300 text-[15px] font-bold text-slate-700">
              Log in
            </button>
            <button onClick={() => navigate('/auth?mode=signup')}
              className="py-3 rounded-2xl bg-slate-900 text-white text-[15px] font-bold">
              Book now
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
        {/* Gradient background */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #134E4A 0%, #0D9488 30%, #4F46E5 70%, #7C3AED 100%)' }} />

        {/* Mesh / noise overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 80%, #F0FDFA44 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, #E0E7FF44 0%, transparent 60%)' }} />

        {/* Floating blobs */}
        <div className="absolute top-32 left-[10%] w-72 h-72 rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-[8%] w-96 h-96 rounded-full bg-violet-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-teal-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[13px] font-semibold text-white/90">Now accepting new clients · Downey, California</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.08] mb-6 tracking-tight">
            Downey'<br />
            <span className="relative inline-block">
              finest salon
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <span className="block text-4xl md:text-6xl text-white/70 mt-2">experience.</span>
          </h1>

          <p className="text-[18px] md:text-[20px] text-white/80 max-w-2xl leading-relaxed mb-10">
            From precision cuts to full transformations — book your next appointment with the most trusted beauty team in Los Angeles.
          </p>

          {/* Search bar */}
          <div className="flex w-full max-w-2xl gap-3 bg-white rounded-2xl shadow-2xl p-2">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search services, treatments…"
                className="flex-1 text-[15px] outline-none text-slate-800 placeholder:text-slate-400 bg-transparent" />
            </div>
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-[14px] font-bold transition-all hover:opacity-90 active:scale-[0.97] shrink-0"
              style={{ background: 'linear-gradient(135deg, #0D9488, #7C3AED)' }}>
              <Search size={16} /> Find
            </button>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['Haircut', 'Balayage', 'Facial', 'Massage', 'Nails'].map(s => (
              <button key={s}
                className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 text-[13px] font-medium hover:bg-white/25 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <span className="text-white/50 text-[12px] font-medium">Scroll to explore</span>
          <ChevronDown size={18} className="text-white/50 animate-bounce" />
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 inset-x-0 h-24">
          <svg viewBox="0 0 1440 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M0 64 Q360 0 720 64 Q1080 128 1440 64 L1440 96 L0 96 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl md:text-4xl font-black text-slate-900 mb-1">{value}</p>
              <p className="text-[14px] text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[13px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">What we offer</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
              Every service you<br /><span className="text-[#0D9488]">could dream of</span>
            </h2>
            <p className="text-[16px] text-slate-500 max-w-md mx-auto">
              Browse our full menu of treatments — all performed by expert stylists in our award-winning salon.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map(cat => {
              const style = CATEGORY_STYLE[cat.name] || DEFAULT_CATEGORY_STYLE
              return (
                <button key={cat.id}
                  onClick={() => navigate('/auth')}
                  className="group relative h-36 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <img
                    src={style.img}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors duration-300" />
                  <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1 px-3">
                    <p className="text-[15px] font-bold text-white leading-tight text-center">{cat.name}</p>
                    <p className="text-[11px] text-white/75">{cat.service_count} {cat.service_count === 1 ? 'service' : 'services'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURED SERVICES ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
            <div>
              <p className="text-[13px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Most loved</p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900">Top services</h2>
            </div>
            <a href="#" className="flex items-center gap-2 text-[14px] font-bold text-[#0D9488] hover:gap-3 transition-all">
              View all services <ArrowRight size={16} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.map(svc => {
              const accent = CATEGORY_ACCENT[svc.category_name] || '#0D9488'
              const bg = CATEGORY_BG[svc.category_name] || 'from-slate-50 to-slate-100'
              const style = CATEGORY_STYLE[svc.category_name] || DEFAULT_CATEGORY_STYLE
              const Icon = style.icon
              const durationLabel = svc.duration_min >= 60
                ? `${Math.floor(svc.duration_min / 60)}h${svc.duration_min % 60 ? ` ${svc.duration_min % 60}min` : ''}`
                : `${svc.duration_min} min`
              const priceLabel = svc.price_type === 'from' ? `From $${svc.price}` : `$${svc.price}`
              return (
                <div key={svc.id}
                  className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <div className="h-44 relative overflow-hidden">
                    <img
                      src={style.img}
                      alt={svc.category_name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute top-3 right-3 text-[12px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      {svc.category_name}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-[15px] font-bold text-slate-900">{svc.name}</h3>
                      <span className="text-[16px] font-black text-slate-900 ml-2 shrink-0">{priceLabel}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {durationLabel}
                      </span>
                      {svc.description && (
                        <span className="truncate">{svc.description}</span>
                      )}
                    </div>

                    <button
                      onClick={() => navigate('/auth')}
                      className="mt-4 w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.97]"
                      style={{ background: `linear-gradient(135deg, ${accent}CC, ${accent})` }}>
                      Book now
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── MEMBERSHIPS ──────────────────────────────────────────────────────── */}
      <section id="memberships" className="py-24 px-6"
        style={{ background: 'linear-gradient(180deg, #F0FDFA 0%, #EEF2FF 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[13px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Save every visit</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Membership plans
            </h2>
            <p className="text-[16px] text-slate-500 max-w-lg mx-auto">
              Join thousands of members who save on every visit, skip the queue, and get exclusive perks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {MEMBERSHIPS.map(m => (
              <div key={m.name}
                className={`relative rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  m.popular ? 'border-transparent shadow-xl scale-[1.02]' : 'border-slate-200 bg-white'
                }`}>
                {m.popular && (
                  <div className="absolute top-0 inset-x-0 py-1.5 text-center text-[12px] font-black text-white uppercase tracking-widest"
                    style={{ background: `linear-gradient(90deg, ${m.ring}, #7C3AED)` }}>
                    Most popular
                  </div>
                )}

                {/* Card top gradient strip */}
                <div className={`h-2 bg-gradient-to-r ${m.color}`} style={{ marginTop: m.popular ? 28 : 0 }} />

                <div className="p-7 bg-white">
                  <h3 className="text-[19px] font-black text-slate-900 mb-1">{m.name}</h3>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-slate-900">${m.price}</span>
                    <span className="text-[14px] text-slate-500 mb-1.5">{m.cycle}</span>
                  </div>

                  <div className="space-y-3 mb-7">
                    {m.perks.map(perk => (
                      <div key={perk} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${m.ring}20` }}>
                          <Check size={11} style={{ color: m.ring }} strokeWidth={3} />
                        </div>
                        <span className="text-[14px] text-slate-700">{perk}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="w-full py-3 rounded-2xl text-[14px] font-black transition-all hover:opacity-90 active:scale-[0.97]"
                    style={m.popular
                      ? { background: `linear-gradient(135deg, ${m.ring}, #7C3AED)`, color: '#fff' }
                      : { background: '#F8FAFC', color: '#1E293B', border: '2px solid #E2E8F0' }}>
                    Get started
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PACKAGES ─────────────────────────────────────────────────────────── */}
      <section id="packages" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[13px] font-bold text-[#7C3AED] uppercase tracking-widest mb-3">Bundle & save</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Service packages</h2>
            <p className="text-[16px] text-slate-500 max-w-lg mx-auto">
              Pre-purchase session bundles and save up to 20% compared to individual bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => (
              <div key={pkg.name}
                className="group rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-white">
                {/* Gradient top */}
                <div className={`h-32 bg-gradient-to-br ${pkg.color} relative flex items-end p-6`}>
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[12px] font-bold">
                    Save ${pkg.savings}
                  </div>
                  <div>
                    <p className="text-white/80 text-[12px] font-semibold">{pkg.desc}</p>
                    <h3 className="text-white text-[19px] font-black">{pkg.name}</h3>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl font-black text-slate-900">${pkg.price}</span>
                    <span className="text-[14px] text-slate-400 line-through">${pkg.original}</span>
                    <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {Math.round((pkg.savings / pkg.original) * 100)}% off
                    </span>
                  </div>

                  <div className="space-y-2 mb-5">
                    {pkg.services.map(s => (
                      <div key={s} className="flex items-center gap-2 text-[13px] text-slate-600">
                        <Check size={13} className="text-emerald-500 shrink-0" strokeWidth={3} /> {s}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-[13px] text-slate-400">
                      <Clock size={13} className="shrink-0" /> Valid for {pkg.validity}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/auth?mode=signup')}
                    className="w-full py-3 rounded-2xl text-[14px] font-black text-white transition-all hover:opacity-90 active:scale-[0.97] bg-gradient-to-r"
                    style={{ backgroundImage: `linear-gradient(to right, ${pkg.color.includes('sky') ? '#0EA5E9,#06B6D4' : pkg.color.includes('rose') ? '#F43F5E,#EC4899' : '#10B981,#0D9488'})` }}>
                    Buy package
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[13px] font-bold text-[#0D9488] uppercase tracking-widest mb-3">Client love</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              12,000+ happy clients
            </h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={22} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-[14px] text-slate-400">4.9 average across 12,000+ reviews</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {REVIEWS.map(r => (
              <div key={r.name}
                className="bg-white rounded-3xl p-7 border border-slate-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-[15px] text-slate-700 leading-relaxed mb-6">"{r.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-black shrink-0"
                      style={{ background: r.color }}>
                      {r.avatar}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-900">{r.name}</p>
                      <p className="text-[12px] text-slate-400">{r.service}</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <MapPin size={11} /> Downey
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 40%, #7C3AED 100%)' }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, #fff 0%, transparent 50%)' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 mb-8">
            <Sparkles size={14} className="text-yellow-300" />
            <span className="text-[13px] font-semibold text-white">Join 12,000+ happy clients</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Your best look<br />is one tap away.
          </h2>
          <p className="text-[18px] text-white/75 mb-10 max-w-xl mx-auto">
            Book your first appointment today and experience why we're Downey' most-loved salon.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/auth?mode=signup')}
              className="px-8 py-4 rounded-2xl bg-white text-slate-900 text-[16px] font-black hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.97] shadow-xl">
              Book your first visit →
            </button>
            <button onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-2xl bg-white/10 border-2 border-white/30 text-white text-[16px] font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
              Sign in to account
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <img src="/logo.png" alt="Kriyansh Beauty Bar" className="h-12 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-[14px] leading-relaxed mb-5">
                Downey' premier salon since 2016. Luxury beauty experiences for every client.
              </p>
              <div className="flex gap-3">
                {Object.values(SocialIcons).map((Icon, i) => (
                  <button key={i}
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0D9488] text-slate-400 hover:text-white transition-all">
                    <Icon />
                  </button>
                ))}
              </div>
            </div>

            {[
              { title: 'Services', links: ['Hair', 'Colour', 'Nails', 'Massage', 'Facial', 'Waxing'] },
              { title: 'Company', links: ['About us', 'Careers', 'Press', 'Blog', 'Gift cards'] },
              { title: 'Support', links: ['Contact', 'FAQs', 'Booking policy', 'Privacy', 'Terms'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-[13px] font-bold text-white uppercase tracking-widest mb-4">{title}</p>
                <div className="space-y-2.5">
                  {links.map(l => (
                    <a key={l} href="#"
                      className="block text-[14px] hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between gap-4">
            <p className="text-[13px]">© 2026 Kriyansh Salon · Downey, CA. All rights reserved.</p>
            <div className="flex items-center gap-2 text-[13px]">
              <MapPin size={13} /> 12007 Paramount Blvd #5, Downey, CA 90242
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
