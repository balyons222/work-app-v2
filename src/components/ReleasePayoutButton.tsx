'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ReleasePayoutButton({ applicationId }: { applicationId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRelease = async () => {
    if (!confirm('Release funds to the contractor? This cannot be undone.')) return
    
    setIsLoading(true)
    const toastId = toast.loading('Releasing funds...')
    
    try {
      const res = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      })
      
      const data = await res.json()
      
      if (data.success) {
        toast.success('Funds released successfully!', { id: toastId })
        window.location.reload() // Refresh to show updated paid status
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to release funds', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleRelease}
      disabled={isLoading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {isLoading ? 'Processing...' : 'Release Payout'}
    </button>
  )
}