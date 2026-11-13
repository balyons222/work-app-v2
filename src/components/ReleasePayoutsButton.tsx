'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface ReleasePayoutButtonProps {
  applicationId: string
  contractorName: string
  rate: number
  isPaid: boolean
}

export default function ReleasePayoutButton({ applicationId, contractorName, rate, isPaid }: ReleasePayoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  if (isPaid) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
        ✓ Paid
      </span>
    )
  }

  const handlePayout = async () => {
    if (!confirm(`Release $${rate} to ${contractorName}? This action cannot be undone.`)) {
      return
    }

    setIsProcessing(true)
    const toastId = toast.loading(`Transferring funds to ${contractorName}...`)

    try {
      const res = await fetch('/api/stripe/release-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to release payout')
      }

      toast.success('Funds released successfully!', { id: toastId })
      router.refresh() // Refreshes the page to show the "✓ Paid" status
      
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      onClick={handlePayout}
      disabled={isProcessing}
      className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
    >
      {isProcessing ? 'Processing...' : `Release $${rate}`}
    </button>
  )
}