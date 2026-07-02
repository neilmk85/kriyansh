import { useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api'

export default function CheckIn() {
  const { appointmentId } = useParams()
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'

  async function handleCheckIn() {
    setStatus('loading')
    try {
      await api.post('/checkin', { appointment_id: parseInt(appointmentId) })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0FDFA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 text-center">
        <h1 className="text-[20px] font-black tracking-tight text-[#0D9488]">
          KRIYANSH <span className="text-slate-800">SALON</span>
        </h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {status === 'idle' && (
          <>
            <div className="w-24 h-24 rounded-3xl bg-[#F0FDFA] border-2 border-[#CCFBF1] flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-[28px] font-black text-slate-800 mb-2">Welcome to</h2>
            <h2 className="text-[28px] font-black text-[#0D9488] mb-4">Kriyansh Salon</h2>
            <p className="text-[16px] text-slate-400 mb-10">Tap below to check in for your appointment</p>
            <button
              onClick={handleCheckIn}
              className="w-full max-w-sm py-5 rounded-2xl bg-[#0D9488] text-white text-[18px] font-black hover:bg-[#0f766e] active:scale-[0.97] transition-all shadow-xl shadow-teal-200"
            >
              Check In Now
            </button>
            {appointmentId && (
              <p className="text-[12px] text-slate-400 mt-4">Appointment #{appointmentId}</p>
            )}
          </>
        )}

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-[16px] text-slate-500">Checking you in…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">✓</span>
            </div>
            <h2 className="text-[26px] font-black text-green-700 mb-3">You're Checked In!</h2>
            <p className="text-[16px] text-slate-500 max-w-xs leading-relaxed">
              Have a seat — your stylist will be with you shortly.
            </p>
            <div className="mt-8 bg-[#F0FDFA] border border-[#CCFBF1] rounded-2xl px-6 py-4">
              <p className="text-[13px] text-slate-500">We're looking forward to seeing you today!</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🙏</span>
            </div>
            <h2 className="text-[22px] font-bold text-slate-700 mb-3">Check-in Not Available</h2>
            <p className="text-[15px] text-slate-400 max-w-xs leading-relaxed">
              Please see the receptionist and we'll get you set up right away.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-8 px-6 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-[11px] text-slate-300">Powered by Salon OS</p>
      </div>
    </div>
  )
}
