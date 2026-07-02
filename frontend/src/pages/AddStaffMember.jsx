import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, ChevronDown, X, Search, MapPin, Check, ChevronUp } from 'lucide-react'
import api from '@/lib/api'

const SECTIONS = [
  { group: 'Personal',   items: ['Profile', 'Addresses', 'Emergency contacts'] },
  { group: 'Workspace',  items: ['Services', 'Locations', 'Settings'] },
  { group: 'Pay',        items: ['Wages and timesheets', 'Commissions', 'Pay runs'] },
]

const CALENDAR_COLORS = [
  '#06B6D4','#3B82F6','#6366F1','#8B5CF6','#A855F7','#D946EF','#EC4899','#F43F5E','#FB923C',
]

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Casual', 'Contract']

const PERMISSION_ROLES = [
  { value: 'low',    label: 'Low',    desc: 'Basic access to calendar and their own appointments only.' },
  { value: 'medium', label: 'Medium', desc: 'Partial access to calendar, sales, clients, catalogue, and payments and wallet.' },
  { value: 'high',   label: 'High',   desc: 'Full access to all features except billing and workspace settings.' },
  { value: 'owner',  label: 'Owner',  desc: 'Full access to all features including billing and workspace settings.' },
]

const RELATIONSHIPS = ['Partner','Spouse','Parent','Sibling','Child','Friend','Other']

export default function AddStaffMember() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeSection, setActiveSection] = useState('Profile')

  // ── Form state ──────────────────────────────────────────
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    phone_country: '+1', additional_phone: '', additional_phone_country: '+1',
    country: '', birthday: '', birthday_year: '',
    calendar_color: CALENDAR_COLORS[0], specializations: '',
    start_date: new Date().toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' }),
    start_year: String(new Date().getFullYear()),
    end_date: '', end_year: '', employment_type: '', team_member_id: '', notes: '',
    allow_calendar_bookings: true, permission_role: 'medium',
  })
  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  // ── Addresses ────────────────────────────────────────────
  const [addresses, setAddresses] = useState([])
  const [addrModal, setAddrModal] = useState(false)
  const [addrForm, setAddrForm]   = useState({ name: '', address: '' })

  // ── Emergency contacts ───────────────────────────────────
  const [contacts, setContacts]   = useState([])
  const [ecModal, setEcModal]     = useState(false)
  const [ecForm, setEcForm]       = useState({ full_name: '', relationship: '', email: '', phone_country: '+1', phone: '' })

  // ── Services ─────────────────────────────────────────────
  const [svcSearch, setSvcSearch]       = useState('')
  const [selectedSvcs, setSelectedSvcs] = useState(new Set()) // 'all' or individual ids
  const [allSelected, setAllSelected]   = useState(true)

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(r => r.data),
  })

  const filteredSvcs = services.filter(s =>
    s.name.toLowerCase().includes(svcSearch.toLowerCase())
  )

  const grouped = filteredSvcs.reduce((acc, s) => {
    const cat = s.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  function toggleAllSvcs() {
    if (allSelected) { setAllSelected(false); setSelectedSvcs(new Set()) }
    else             { setAllSelected(true);  setSelectedSvcs(new Set()) }
  }
  function toggleSvc(id) {
    setAllSelected(false)
    setSelectedSvcs(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function isSvcChecked(id) { return allSelected || selectedSvcs.has(id) }

  // ── Save ─────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => api.post('/staff', {
      first_name: form.first_name, last_name: form.last_name,
      email: form.email,
      phone: form.phone ? `${form.phone_country} ${form.phone}` : '',
      specializations: form.specializations,
      color: form.calendar_color,
      bio: form.notes,
      role: form.permission_role,
      accepts_online: form.allow_calendar_bookings,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); navigate('/staff') },
  })

  const canSave = form.first_name.trim() && form.email.trim()

  // ── Shared input style ───────────────────────────────────
  const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 transition-all'

  return (
    <div className="-m-6 min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 shrink-0">
        <h1 className="text-[20px] font-bold text-slate-900">Add team member</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/staff')}
            className="px-5 py-2 rounded-full border border-slate-300 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Close
          </button>
          <button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}
            className="px-5 py-2 rounded-full text-white text-[13px] font-bold bg-slate-900 hover:bg-slate-700 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 border-r border-slate-100 py-6 px-4 overflow-y-auto">
          {SECTIONS.map(sec => (
            <div key={sec.group} className="mb-6">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">{sec.group}</p>
              {sec.items.map(item => (
                <button key={item} onClick={() => setActiveSection(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[14px] transition-colors mb-0.5 flex items-center justify-between ${
                    activeSection === item ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}>
                  <span>{item}</span>
                  {item === 'Services'  && <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{services.length}</span>}
                  {item === 'Locations' && <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">1</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto px-12 py-8 max-w-4xl">
          {mutation.isError && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl">
              Failed to add team member. Please check the details and try again.
            </div>
          )}

          {/* ── PROFILE ─────────────────────────────────────── */}
          {activeSection === 'Profile' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[22px] font-bold text-slate-900">Profile</h2>
                <p className="text-[14px] text-slate-400 mt-1">Manage your team member's personal profile</p>
              </div>

              {/* Avatar */}
              <div className="mb-8">
                <div className="relative w-24 h-24">
                  <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50">
                    <Camera size={13} className="text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">First name <span className="text-red-400">*</span></label>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Last name</label>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phone number</label>
                  <div className="flex gap-2">
                    <select value={form.phone_country} onChange={e => set('phone_country', e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1]">
                      {['+1','+44','+91','+61','+49'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} className={`flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 transition-all`} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Additional phone number</label>
                  <div className="flex gap-2">
                    <select value={form.additional_phone_country} onChange={e => set('additional_phone_country', e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1]">
                      {['+1','+44','+91','+61','+49'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={form.additional_phone} onChange={e => set('additional_phone', e.target.value)} className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Country</label>
                  <div className="relative">
                    <select value={form.country} onChange={e => set('country', e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1] text-slate-500">
                      <option value="">Select country</option>
                      {['United States','United Kingdom','India','Australia','Canada'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Birthday</label>
                  <input value={form.birthday} onChange={e => set('birthday', e.target.value)} placeholder="Day and month" className={inp + ' placeholder:text-slate-400'} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Year</label>
                  <input value={form.birthday_year} onChange={e => set('birthday_year', e.target.value)} placeholder="Year" className={inp + ' placeholder:text-slate-400'} />
                </div>
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-slate-700 mb-2.5">Calendar colour</label>
                <div className="flex items-center gap-2.5">
                  {CALENDAR_COLORS.map(c => (
                    <button key={c} onClick={() => set('calendar_color', c)}
                      className={`w-8 h-8 rounded-full transition-all ${form.calendar_color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <hr className="border-slate-100 my-8" />
              <div className="mb-2">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Job title</label>
                <input value={form.specializations} onChange={e => set('specializations', e.target.value)} className={inp} />
                <p className="text-[12px] text-slate-400 mt-1.5">Visible to clients online</p>
              </div>
              <hr className="border-slate-100 my-8" />
              <div className="mb-6">
                <h3 className="text-[18px] font-bold text-slate-900">Work details</h3>
                <p className="text-[13px] text-slate-400 mt-1">Manage your team member's start date, and employment details</p>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Start date</label>
                  <input value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Year</label>
                  <input value={form.start_year} onChange={e => set('start_year', e.target.value)} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">End date</label>
                  <input value={form.end_date} onChange={e => set('end_date', e.target.value)} placeholder="Day and month" className={inp + ' placeholder:text-slate-400'} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Year</label>
                  <input value={form.end_year} onChange={e => set('end_year', e.target.value)} placeholder="Year" className={inp + ' placeholder:text-slate-400'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Employment type</label>
                  <div className="relative">
                    <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1] text-slate-500">
                      <option value="">Select an option</option>
                      {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Team member ID</label>
                  <input value={form.team_member_id} onChange={e => set('team_member_id', e.target.value)} className={inp} />
                  <p className="text-[12px] text-slate-400 mt-1.5">An identifier used for external systems like payroll</p>
                </div>
              </div>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Notes</label>
                  <span className="text-[12px] text-slate-400">{form.notes.length}/1000</span>
                </div>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value.slice(0,1000))} rows={4}
                  placeholder="Add a private note only viewable in the team member list"
                  className={inp + ' resize-none placeholder:text-slate-400'} />
              </div>
            </div>
          )}

          {/* ── ADDRESSES ───────────────────────────────────── */}
          {activeSection === 'Addresses' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[22px] font-bold text-slate-900">Addresses</h2>
                <p className="text-[14px] text-slate-400 mt-1">Manage your team member's addresses</p>
              </div>
              {addresses.length > 0 && (
                <div className="space-y-3 mb-5">
                  {addresses.map((a, i) => (
                    <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{a.name}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">{a.address}</p>
                      </div>
                      <button onClick={() => setAddresses(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-3">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setAddrForm({ name:'', address:'' }); setAddrModal(true) }}
                className="px-5 py-2.5 rounded-full border-2 border-slate-900 text-[13px] font-bold text-slate-900 hover:bg-slate-50 transition-colors">
                + Add address
              </button>
            </div>
          )}

          {/* ── EMERGENCY CONTACTS ──────────────────────────── */}
          {activeSection === 'Emergency contacts' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[22px] font-bold text-slate-900">Emergency Contacts</h2>
                <p className="text-[14px] text-slate-400 mt-1">Manage your team members' emergency contacts.</p>
              </div>
              {contacts.length > 0 && (
                <div className="space-y-3 mb-5">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{c.full_name}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">{c.relationship} · {c.phone_country} {c.phone}</p>
                        {c.email && <p className="text-[12px] text-slate-400">{c.email}</p>}
                      </div>
                      <button onClick={() => setContacts(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-3">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setEcForm({ full_name:'', relationship:'', email:'', phone_country:'+1', phone:'' }); setEcModal(true) }}
                className="px-5 py-2.5 rounded-full border-2 border-slate-900 text-[13px] font-bold text-slate-900 hover:bg-slate-50 transition-colors">
                + Add emergency contact
              </button>
            </div>
          )}

          {/* ── SERVICES ────────────────────────────────────── */}
          {activeSection === 'Services' && (
            <div>
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-slate-900">Services</h2>
                <p className="text-[14px] text-slate-400 mt-1">Choose the services this team member provides</p>
              </div>
              <div className="relative mb-5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={svcSearch} onChange={e => setSvcSearch(e.target.value)}
                  placeholder="Search services"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 transition-all" />
              </div>
              {/* All services */}
              <div className="flex items-center gap-3 py-3.5 border-b border-slate-100">
                <Checkbox checked={allSelected} onChange={toggleAllSvcs} />
                <span className="text-[14px] font-bold text-slate-800">All services</span>
                <span className="text-[12px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{services.length}</span>
              </div>
              {/* Grouped services */}
              {Object.entries(grouped).map(([cat, svcs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 py-3.5 border-b border-slate-100">
                    <Checkbox checked={svcs.every(s => isSvcChecked(s.id))}
                      onChange={() => {
                        const allIn = svcs.every(s => isSvcChecked(s.id))
                        setAllSelected(false)
                        setSelectedSvcs(prev => {
                          const n = new Set(prev)
                          svcs.forEach(s => allIn ? n.delete(s.id) : n.add(s.id))
                          return n
                        })
                      }} />
                    <span className="text-[14px] font-bold text-slate-800">{cat}</span>
                    <span className="text-[12px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{svcs.length}</span>
                  </div>
                  {svcs.map(svc => (
                    <div key={svc.id} className="flex items-center justify-between py-3.5 pl-10 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSvcChecked(svc.id)} onChange={() => toggleSvc(svc.id)} />
                        <div>
                          <p className="text-[13px] font-medium text-slate-800">{svc.name}</p>
                          <p className="text-[12px] text-slate-400">{svc.duration} mins</p>
                        </div>
                      </div>
                      <span className="text-[13px] text-slate-600">US$ {svc.price}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── LOCATIONS ───────────────────────────────────── */}
          {activeSection === 'Locations' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[22px] font-bold text-slate-900">Works at</h2>
                <p className="text-[14px] text-slate-400 mt-1">Choose the locations where this team member works</p>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">Kriyansh Beauty Bar</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">12007 Paramount Blvd, Downey, CA 90242</p>
                  </div>
                </div>
                <span className="text-[12px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Primary</span>
              </div>
            </div>
          )}

          {/* ── SETTINGS ────────────────────────────────────── */}
          {activeSection === 'Settings' && (
            <div>
              <div className="mb-8">
                <h2 className="text-[22px] font-bold text-slate-900">Appointment settings</h2>
                <p className="text-[14px] text-slate-400 mt-1">Choose if this team member is bookable on the calendar</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 mb-8">
                <Checkbox checked={form.allow_calendar_bookings} onChange={() => set('allow_calendar_bookings', !form.allow_calendar_bookings)} />
                <div>
                  <p className="text-[14px] font-semibold text-slate-800">Allow calendar bookings</p>
                  <p className="text-[13px] text-slate-400 mt-0.5">Allow this team member to receive bookings on the calendar</p>
                </div>
              </div>
              <hr className="border-slate-100 mb-8" />
              <div className="mb-4">
                <h3 className="text-[18px] font-bold text-slate-900 mb-1">Permission role</h3>
                <p className="text-[13px] text-slate-400">Choose the access level this team member has to the workspace</p>
              </div>
              <PermissionRoleDropdown value={form.permission_role} onChange={v => set('permission_role', v)} />
            </div>
          )}

          {/* ── PAY STUBS ───────────────────────────────────── */}
          {['Wages and timesheets','Commissions','Pay runs'].includes(activeSection) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-[22px]">💰</span>
              </div>
              <p className="text-[16px] font-bold text-slate-700">{activeSection}</p>
              <p className="text-[13px] text-slate-400 mt-1 max-w-xs">
                Pay settings will be available once the team member is created.
              </p>
            </div>
          )}

          {/* ── MERCHANT ACCOUNT STUB ───────────────────────── */}
          {activeSection === 'Merchant account' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-[22px]">🏦</span>
              </div>
              <p className="text-[16px] font-bold text-slate-700">Merchant account</p>
              <p className="text-[13px] text-slate-400 mt-1 max-w-xs">
                Merchant account settings will be available once the team member is created.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Address Modal ─────────────────────────────── */}
      {addrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-bold text-slate-900">Add address</h3>
              <button onClick={() => setAddrModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Address name</label>
                <input value={addrForm.name} onChange={e => setAddrForm(f => ({...f, name: e.target.value}))} className={inp} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={addrForm.address} onChange={e => setAddrForm(f => ({...f, address: e.target.value}))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddrModal(false)}
                className="flex-1 py-3 rounded-full border border-slate-300 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { setAddresses(p => [...p, addrForm]); setAddrModal(false) }}
                className="flex-1 py-3 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Emergency Contact Modal ───────────────────── */}
      {ecModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-bold text-slate-900">Add Emergency Contact</h3>
              <button onClick={() => setEcModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Full name</label>
                <input value={ecForm.full_name} onChange={e => setEcForm(f => ({...f, full_name: e.target.value}))}
                  placeholder="e.g. John Hancock" className={inp + ' placeholder:text-slate-400'} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Relationship</label>
                <div className="relative">
                  <select value={ecForm.relationship} onChange={e => setEcForm(f => ({...f, relationship: e.target.value}))}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1] text-slate-500">
                    <option value="">Select an option</option>
                    {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email</label>
                <input type="email" value={ecForm.email} onChange={e => setEcForm(f => ({...f, email: e.target.value}))}
                  placeholder="example@domain.com" className={inp + ' placeholder:text-slate-400'} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <div className="flex gap-2">
                  <select value={ecForm.phone_country} onChange={e => setEcForm(f => ({...f, phone_country: e.target.value}))}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none bg-white focus:border-[#6366F1]">
                    {['+1','+44','+91','+61','+49'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input value={ecForm.phone} onChange={e => setEcForm(f => ({...f, phone: e.target.value}))}
                    placeholder="e.g. +1 234 567 8901" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEcModal(false)}
                className="flex-1 py-3 rounded-full border border-slate-300 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { setContacts(p => [...p, ecForm]); setEcModal(false) }}
                className="flex-1 py-3 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PermissionRoleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = PERMISSION_ROLES.find(r => r.value === value)

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-[14px] font-medium text-slate-800 bg-white transition-all ${open ? 'border-[#6366F1] ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
        <span>{selected?.label}</span>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1.5 z-20 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-y-auto max-h-72">
          {PERMISSION_ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => { onChange(r.value); setOpen(false) }}
              className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-slate-50 last:border-0 ${value === r.value ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
              {/* Radio indicator */}
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${value === r.value ? 'border-[#6366F1]' : 'border-slate-300'}`}>
                {value === r.value && <div className="w-2 h-2 rounded-full bg-[#6366F1]" />}
              </div>
              <div>
                <p className={`text-[14px] font-semibold ${value === r.value ? 'text-[#6366F1]' : 'text-slate-800'}`}>{r.label}</p>
                <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Checkbox({ checked, onChange }) {
  return (
    <button onClick={onChange}
      className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
        checked ? 'bg-[#6366F1] border-[#6366F1]' : 'bg-white border-slate-300 hover:border-slate-400'
      }`}>
      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
    </button>
  )
}
