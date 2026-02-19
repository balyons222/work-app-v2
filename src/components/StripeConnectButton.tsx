'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/src/utils/supabase/client'

export default function StripeConnectButton({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleConnect = async () => {
    setLoading(true)
    try {
      // 1. Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('You must be logged in.')
        setLoading(false)
        return
      }

      // 2. Send the request to your fixed Stripe API
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }), // <-- This is the crucial fix!
      })

      const data = await response.json()

      // 3. Redirect the user to Stripe
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to connect to Stripe')
      }
    } catch (error) {
      toast.error('Network error connecting to Stripe')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <button disabled className="bg-green-100 text-green-800 px-6 py-2 rounded-lg font-bold border border-green-200 cursor-not-allowed opacity-75">
        ✓ Bank Connected
      </button>
    )
  }

  return (
    <button 
      onClick={handleConnect} 
      disabled={loading}
      className="bg-[#635BFF] hover:bg-[#4B45D6] text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
    >
      {loading ? 'Connecting...' : 'Setup Payouts & W-9'}
    </button>
  )
}