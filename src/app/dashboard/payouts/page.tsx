'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

export default function PayoutsPage() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [payoutsEnabled, setPayoutsEnabled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('profiles')
          .select('payouts_enabled')
          .eq('id', user.id)
          .single()
        
        if (data) setPayoutsEnabled(data.payouts_enabled ?? false)
      }
    }
    loadProfile()
  }, [])

  const handleConnectStripe = async () => {
    if (!user) return
    setLoading(true)
    const toastId = toast.loading('Redirecting to Stripe...')
    
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to connect Stripe')
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-primary mb-8">Payouts Dashboard</h1>
        
        {payoutsEnabled ? (
          <div className="bg-white p-8 rounded-2xl border-2 border-green-500 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl font-bold">✓</div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bank Account Connected</h2>
              <p className="text-slate-500 font-medium">You are fully set up to receive direct deposits for your completed gigs.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Connect Your Bank</h2>
            <p className="text-slate-500 mb-6 font-medium">Set up your Stripe Connect profile to verify your identity and link a bank account for direct deposits.</p>
            <button 
              onClick={handleConnectStripe} 
              disabled={loading} 
              className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Set Up Payouts via Stripe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}