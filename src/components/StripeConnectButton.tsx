'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function StripeConnectButton({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await response.json()

      if (data.url) {
        // Redirect the user to Stripe
        window.location.href = data.url
      } else {
        toast.error('Failed to start onboarding.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
        <button disabled className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-default">
            ✅ Payouts Active
        </button>
    )
  }

  return (
    <button 
      onClick={handleConnect} 
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2"
    >
      {loading ? 'Processing...' : '🏦 Setup Payouts & W-9'}
    </button>
  )
}