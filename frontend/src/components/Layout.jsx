import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors,
  UserCog, Receipt, Menu, X, LogOut, ChevronRight, Settings2,
  Gift, Package, BadgeCheck, Megaphone, BarChart2, Zap,
  MessageCircle, Send, Layers, ChevronDown, ShoppingBag, PieChart, FileText, Clock,
  ShoppingCart
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn, initials } from '@/lib/utils'
import api from '@/lib/api'

// Nav items — groups use a `children` array instead of `to`
const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/appointments', icon: Calendar,        label: 'Appointments' },
  // ── Clients ─────────────────────────────────────────────────────────────
  {
    group: 'Clients',
    icon: Users,
    children: [
      { to: '/clients',          icon: Users,    label: 'Clients list'    },
      { to: '/clients/segments', icon: PieChart, label: 'Client segments' },
      { to: '/loyalty',          icon: Gift,     label: 'Client loyalty'  },
    ],
  },
  // ── Team ─────────────────────────────────────────────────────────────────
  {
    group: 'Team',
    icon: UserCog,
    children: [
      { to: '/staff',            icon: Users,    label: 'Team members'     },
      { to: '/staff/shifts',     icon: Calendar, label: 'Scheduled shifts' },
      { to: '/staff/timesheets', icon: Clock,    label: 'Timesheets'       },
      { to: '/staff/payrun',     icon: Receipt,  label: 'Pay runs'         },
    ],
  },
  // ── Catalogue ────────────────────────────────────────────────────────────
  {
    group: 'Catalogue',
    icon: ShoppingBag,
    children: [
      { to: '/services',    icon: Scissors,   label: 'Services'    },
      { to: '/memberships', icon: BadgeCheck, label: 'Memberships' },
      { to: '/packages',    icon: Layers,     label: 'Packages'    },
      { to: '/gift-cards',  icon: Gift,       label: 'Gift Cards'  },
      { to: '/products',    icon: Package,    label: 'Products'    },
    ],
  },
  // ── Sales & Marketing ────────────────────────────────────────────────────
  {
    group: 'Sales & Marketing',
    icon: Megaphone,
    children: [
      { to: '/marketing', icon: Megaphone, label: 'Marketing' },
    ],
  },
  // ── Operations ───────────────────────────────────────────────────────────
  {
    group: 'Operations',
    icon: BarChart2,
    children: [
      { to: '/inventory',         icon: Package,       label: 'Inventory'   },
      { to: '/purchases',         icon: ShoppingCart,  label: 'Purchases'   },
      { to: '/staff-performance', icon: BarChart2,     label: 'Performance' },
      { to: '/optimizer',         icon: Zap,           label: 'Optimizer'   },
      { to: '/forms',             icon: FileText,      label: 'Intake Forms' },
      { to: '/reports',           icon: PieChart,      label: 'Reports'     },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  { to: '/pos',      icon: Receipt,  label: 'POS / Billing' },
  { to: '/settings', icon: Settings2, label: 'Settings'     },
]

const GROUP_PATHS = {
  'Team':              ['/staff', '/staff/shifts', '/staff/timesheets', '/staff/payrun'],
  'Clients':           ['/clients', '/clients/segments', '/loyalty'],
  'Catalogue':         ['/services', '/memberships', '/packages', '/gift-cards', '/products'],
  'Sales & Marketing': ['/marketing'],
  'Operations':        ['/inventory', '/purchases', '/staff-performance', '/optimizer', '/forms', '/reports'],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen]  = useState(true)
  const navigate         = useNavigate()
  const location         = useLocation()
  const isPos            = location.pathname === '/pos'

  // Auto-open the group that contains the current path
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {}
    Object.entries(GROUP_PATHS).forEach(([group, paths]) => {
      initial[group] = paths.some(p => location.pathname.startsWith(p))
    })
    return initial
  })
  function toggleGroup(name) {
    setOpenGroups(g => ({ ...g, [name]: !g[name] }))
  }

  // AI Chat state
  const [chatOpen,    setChatOpen]    = useState(false)
  const [messages,    setMessages]    = useState([
    { role: 'assistant', text: 'Hi! I am your Salon AI assistant. Ask me about revenue, appointments, clients, or schedule gaps.' }
  ])
  const [chatInput,   setChatInput]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatOpen])

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setMessages(m => [...m, { role: 'user', text: msg }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await api.post('/ai/chat', { message: msg })
      setMessages(m => [...m, { role: 'assistant', text: res.data.response }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I could not process that. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChat()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-in-out shrink-0 overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.04)]',
          open ? 'w-60' : 'w-0 opacity-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <img
            src="/logo.png"
            alt="Kriyansh Beauty Bar"
            className="h-14 w-auto cursor-pointer select-none object-contain"
            onClick={() => navigate('/')}
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            // ── Grouped section ───────────────────────────────────────────
            if (item.group) {
              const { group, icon: GroupIcon, children } = item
              const isGroupOpen    = !!openGroups[group]
              const hasActiveChild = children.some(c =>
                c.to === '/' ? location.pathname === '/' : location.pathname.startsWith(c.to)
              )
              return (
                <div key={group}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all',
                      hasActiveChild
                        ? 'text-[#6366F1] bg-indigo-50/60'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    <GroupIcon size={16} />
                    <span className="flex-1 text-left">{group}</span>
                    <ChevronDown
                      size={14}
                      className={cn('transition-transform duration-200 text-slate-400', isGroupOpen && 'rotate-180')}
                    />
                  </button>

                  {/* Children */}
                  {isGroupOpen && (
                    <div className="ml-3 mt-0.5 pl-3 border-l-2 border-slate-100 space-y-0.5">
                      {children.map(({ to, icon: Icon, label, end: endProp }) => (
                        <NavLink
                          key={to}
                          to={to}
                          end={endProp ?? true}
                          className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                            isActive
                              ? 'bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-white shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                          )}
                        >
                          <Icon size={15} />
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            // ── Regular item ──────────────────────────────────────────────
            const { to, icon: Icon, label } = item
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-[#0D9488] to-[#6366F1] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer — user card */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
            <div className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' }}>
              {initials(`${user?.first_name} ${user?.last_name}`)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Sidebar reopen button — only visible when sidebar is closed */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="absolute top-4 left-4 z-50 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Open sidebar"
          >
            <Menu size={16} />
          </button>
        )}

        {/* Page content */}
        <main className={cn(
          'flex-1 min-h-0',
          isPos ? 'flex overflow-hidden' : 'overflow-y-auto p-6 bg-[#F8F9FA]'
        )}>
          <Outlet />
        </main>
      </div>

      {/* ── AI Chat Widget (hidden on POS) ────────────────────── */}
      {!isPos && (
        <>
          {/* Floating button */}
          <button
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
            onClick={() => setChatOpen(o => !o)}
            title="Salon AI Assistant"
          >
            <MessageCircle size={22} />
          </button>

          {/* Chat panel */}
          {chatOpen && (
            <div
              className="fixed bottom-20 right-6 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              style={{ height: '420px' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}>
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} />
                  <span className="text-[14px] font-bold">Salon AI</span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] px-3 py-2 text-[13px] leading-relaxed',
                        msg.role === 'user'
                          ? 'text-white rounded-2xl rounded-br-sm'
                          : 'bg-slate-100 text-slate-700 rounded-2xl rounded-bl-sm'
                      )}
                      style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' } : {}}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3 py-2 text-[13px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-slate-100 px-3 py-2 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask about revenue, clients…"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#CCFBF1] transition-all bg-slate-50 focus:bg-white"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0D9488 0%, #6366F1 100%)' }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
