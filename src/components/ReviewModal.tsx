'use client'

import { useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import toast from 'react-hot-toast'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  targetId: string // The ID of the person you are reviewing
  targetName: string // Their name (for the UI)
  onSuccess: () => void
}

export default function ReviewModal({ isOpen, onClose, jobId, targetId, targetName, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('reviews').insert({
      job_id: jobId,
      reviewer_id: user.id,
      target_id: targetId,
      rating,
      comment
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Review submitted!')
      onSuccess()
      onClose()
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold mb-2">Review {targetName}</h2>
        <p className="text-gray-500 text-sm mb-6">How was your experience working with them?</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Star Rating Selector */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-black outline-none"
            rows={3}
            placeholder="Share some details..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-500 hover:bg-gray-50 rounded-lg">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-1 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}