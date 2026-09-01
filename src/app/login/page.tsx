'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) toast.error(error.message)
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentGiven) return toast.error('You must agree to receive SMS codes to continue.')
    
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      })
      if (error) throw error
      
      toast.success('Verification code sent!')
      setShowOtpInput(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      })
      if (error) throw error
      
      toast.success('Verified successfully!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <h2 className="text-3xl font-black text-center text-primary mb-8">
          Welcome to FxD
        </h2>
        
        <button 
          type="button" 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 transition-colors shadow-sm mb-6"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or use phone</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>
        
        {!showOtpInput ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15550000000"
                className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>
            
            <div className="flex items-start gap-3 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <input 
                type="checkbox" 
                id="consent"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="consent" className="text-xs text-slate-500 leading-relaxed">
                I agree to receive SMS verification codes from FxD Event Staffing. Message and data rates may apply. Reply STOP to cancel. Mobile data will not be shared with third parties for marketing purposes. See our <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Enter 6-Digit Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary tracking-widest text-center text-lg font-bold"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
            <button
              type="button"
              onClick={() => setShowOtpInput(false)}
              className="w-full text-sm font-bold text-slate-500 hover:text-primary transition-colors mt-2"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}