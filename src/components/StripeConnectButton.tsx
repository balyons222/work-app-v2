'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function StripeConnectButton({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    
    try {
      const endpoint = isConnected ? '/api/stripe/login' : '/api/stripe/connect'

      // NO BODY NEEDED: 
      // The server will securely read the user from the Supabase auth cookie
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      // FIX: Check if the response is actually OK before trying to parse JSON
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
        // FIX: Deliberately skipping setLoading(false) here so the button 
        // stays in the "Connecting..." state while the browser redirects.
      } else {
        toast.error(data.error || 'Failed to connect to Stripe')
        setLoading(false) // Reset on soft error
      }
    } catch (error) {
      toast.error('Network error connecting to Stripe')
      setLoading(false) // Reset on hard error
    }
  }

  if (isConnected) {
    return (
      <button 
        onClick={handleConnect}
        disabled={loading}
        className="bg-green-100 hover:bg-green-200 text-green-800 px-6 py-2 rounded-lg font-bold border border-green-300 transition-all disabled:opacity-50"
      >
        {loading ? 'Opening...' : 'View Stripe Dashboard'}
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