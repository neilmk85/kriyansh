import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Globe, Copy, Check, ExternalLink, QrCode,
  Share2, Camera, Search, ChevronDown, ChevronRight,
  Sparkles, BarChart2, Info,
} from 'lucide-react'
import api from '@/lib/api'

// ── QR Code generator (pure SVG, no library needed) ──────────────────────────
// Minimal QR using a data URI approach — we link to a free QR API
function QRCode({ url, size = 160 }) {
  const encoded = encodeURIComponent(url)
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=2&color=0D9488&bgcolor=ffffff`}
      alt="QR code"
      width={size}
      height={size}
      className="rounded-lg border border-gray-200"
    />
  )
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${copied
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Collapsible setup guide ───────────────────────────────────────────────────
function SetupGuide({ title, icon: Icon, color, steps, bookingUrl, cta }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Step-by-step setup guide</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 space-y-4">
          {/* Booking URL for this platform */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">Your booking link for {title}:</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs text-teal-700 dark:text-teal-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 flex-1 min-w-0 truncate">
                {bookingUrl}
              </code>
              <CopyBtn text={bookingUrl} />
            </div>
          </div>

          {/* Steps */}
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5" dangerouslySetInnerHTML={{ __html: step }} />
              </li>
            ))}
          </ol>

          {cta && (
            <a
              href={cta.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              <ExternalLink size={14} />
              {cta.label}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Source badge ──────────────────────────────────────────────────────────────
const SOURCE_COLORS = {
  facebook:      'bg-blue-100 text-blue-700',
  instagram:     'bg-pink-100 text-pink-700',
  google_reserve:'bg-yellow-100 text-yellow-700',
  online:        'bg-teal-100 text-teal-700',
  phone:         'bg-purple-100 text-purple-700',
  walk_in:       'bg-gray-100 text-gray-600',
  reception:     'bg-gray-100 text-gray-600',
}
const SOURCE_LABELS = {
  facebook: 'Facebook', instagram: 'Instagram', google_reserve: 'Google',
  online: 'Online', phone: 'Phone', walk_in: 'Walk-in', reception: 'Reception',
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OnlinePresence() {
  const [baseUrl, setBaseUrl] = useState('')

  // Detect the base URL from the browser (works in dev and production)
  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const bookingBase = `${baseUrl}/book`
  const urls = {
    google:    `${bookingBase}?source=google_reserve`,
    facebook:  `${bookingBase}?source=facebook`,
    instagram: `${bookingBase}?source=instagram`,
    generic:   bookingBase,
  }

  // Embed widget snippet
  const embedSnippet = `<a href="${bookingBase}" target="_blank" rel="noreferrer"
  style="display:inline-block;background:#0D9488;color:#fff;padding:12px 24px;
         border-radius:8px;font-family:sans-serif;font-size:15px;
         font-weight:600;text-decoration:none;">
  Book Online
</a>`

  // Booking source stats
  const { data: salesData } = useQuery({
    queryKey: ['booking-source-stats'],
    queryFn: () => api.get('/reports/sales/list?limit=200').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const sourceCounts = (salesData || []).reduce((acc, row) => {
    // Appointments list doesn't have source in sales/list — use appointments endpoint
    return acc
  }, {})

  const { data: apptStats } = useQuery({
    queryKey: ['appt-source-stats'],
    queryFn: () => api.get('/appointments/full?limit=200').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const sourceBreakdown = (apptStats || []).reduce((acc, a) => {
    const src = a.source || 'online'
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})
  const totalAppts = Object.values(sourceBreakdown).reduce((s, v) => s + v, 0)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe size={22} className="text-teal-500" />
          Online Presence
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your booking page to Google, Facebook, and Instagram so clients can book from anywhere.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-800 dark:text-teal-300">
          <strong>How this works:</strong> Each platform lets you add a "Book Now" button that links directly to your booking page.
          Clients tap it, land on your branded booking flow, and you get the appointment — no marketplace fees, no third-party middleman.
          Bookings are automatically tagged by source so you can see what's working.
        </div>
      </div>

      {/* Universal booking link */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Your Booking Page</h2>
          <a
            href={bookingBase}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <ExternalLink size={14} />
            Preview
          </a>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <p className="text-sm font-mono text-teal-700 dark:text-teal-400 truncate">{bookingBase}</p>
          </div>
          <CopyBtn text={bookingBase} label="Copy link" />
        </div>

        {/* QR Code */}
        <div className="flex items-start gap-5 pt-1">
          <QRCode url={bookingBase} size={120} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">QR Code</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Print this on your counter, receipts, or window sticker.<br />
              Clients scan it to book instantly — no searching required.
            </p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(bookingBase)}&margin=2&color=0D9488`}
              download="kriyansh-booking-qr.png"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <QrCode size={14} />
              Download QR (400×400)
            </a>
          </div>
        </div>
      </div>

      {/* Platform setup guides */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Platform Setup Guides</h2>

        <SetupGuide
          title="Google Business Profile"
          icon={Search}
          color="bg-yellow-500"
          bookingUrl={urls.google}
          cta={{ url: 'https://business.google.com', label: 'Open Google Business Profile' }}
          steps={[
            'Go to <strong>business.google.com</strong> and sign in with the Google account that manages your salon.',
            'Find your business listing and click <strong>Edit profile</strong>.',
            'Scroll to the <strong>"Contact"</strong> section and look for <strong>"Booking link"</strong> or <strong>"Appointment links"</strong>.',
            `Paste your booking link: <code class="bg-gray-100 px-1 rounded text-xs">${urls.google}</code>`,
            'Save changes. Google typically shows the button within 24–48 hours on Search and Maps.',
            'Optional: In your Google Business Profile menu, go to <strong>Bookings</strong> → confirm or set up booking settings.',
          ]}
        />

        <SetupGuide
          title="Facebook Page"
          icon={Share2}
          color="bg-blue-600"
          bookingUrl={urls.facebook}
          cta={{ url: 'https://www.facebook.com/pages/', label: 'Go to Facebook Pages' }}
          steps={[
            'Go to your <strong>Facebook Business Page</strong> (not your personal profile).',
            'Click the <strong>"+ Add a button"</strong> button below your cover photo, or click the existing button and select <strong>"Edit button"</strong>.',
            'Choose <strong>"Book with you"</strong> → select <strong>"Book Now"</strong>.',
            `Paste your booking link: <code class="bg-gray-100 px-1 rounded text-xs">${urls.facebook}</code>`,
            'Click <strong>Save</strong>. The "Book Now" button appears on your page immediately.',
            'Test it by clicking the button while logged out of Facebook — you should land on your booking page.',
          ]}
        />

        <SetupGuide
          title="Instagram Profile"
          icon={Camera}
          color="bg-gradient-to-br from-pink-500 to-purple-600"
          bookingUrl={urls.instagram}
          cta={{ url: 'https://www.instagram.com/accounts/edit/', label: 'Edit Instagram Profile' }}
          steps={[
            'Your Instagram must be a <strong>Professional (Business) account</strong>. Go to Settings → Account → Switch to Professional Account if needed.',
            'Open your profile and tap <strong>Edit profile</strong>.',
            'Tap <strong>"Action buttons"</strong> (or "Contact options" on some versions).',
            'Select <strong>"Book Now"</strong> from the list of action buttons.',
            `In the URL field, paste: <code class="bg-gray-100 px-1 rounded text-xs">${urls.instagram}</code>`,
            'Tap <strong>Done</strong>. The button appears on your profile instantly.',
            '<strong>Pro tip:</strong> Also add the booking link to your bio ("Link in bio") for maximum visibility.',
          ]}
        />
      </div>

      {/* Website embed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles size={16} className="text-teal-500" />
          Embed on Your Website
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Paste this snippet anywhere on your website to add a "Book Online" button.
        </p>
        <div className="relative">
          <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {embedSnippet}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyBtn text={embedSnippet} label="Copy code" />
          </div>
        </div>
        <p className="text-xs text-gray-400">Preview:</p>
        <a
          href={bookingBase}
          target="_blank"
          rel="noreferrer"
          className="inline-block"
          style={{display:'inline-block',background:'#0D9488',color:'#fff',padding:'12px 24px',borderRadius:'8px',fontFamily:'sans-serif',fontSize:'15px',fontWeight:600,textDecoration:'none'}}
        >
          Book Online
        </a>
      </div>

      {/* Booking source breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart2 size={16} className="text-teal-500" />
          Bookings by Source
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Based on your last 200 appointments.</p>

        {totalAppts === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No appointment data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(sourceBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => {
                const pct = Math.round((count / totalAppts) * 100)
                return (
                  <div key={src}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[src] || 'bg-gray-100 text-gray-600'}`}>
                        {SOURCE_LABELS[src] || src}
                      </span>
                      <span className="text-xs text-gray-500">{count} appointments ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Tips to get more bookings</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {[
            'Post your QR code in Instagram Stories with a "Tap to book" sticker linking to your booking page.',
            'Pin a post on your Facebook page with your booking link — pin it so it always shows at the top.',
            'Add the Google "Book Now" link to your Google Maps listing — it shows up in local search results.',
            'Put the QR code on your business card, salon window, and at the reception desk.',
            'Ask satisfied clients to book their next appointment before leaving — link is on the confirmation screen.',
          ].map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-teal-500 font-bold mt-0.5">→</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
