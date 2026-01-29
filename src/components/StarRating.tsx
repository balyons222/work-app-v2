'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'

interface StarRatingProps {
  userId: string
  showCount?: boolean   // Option to hide the "(12)" count
  size?: 'sm' | 'lg'    // Option for big profile stars or small list stars
}

export default function StarRating({ userId, showCount = true, size = 'sm' }: StarRatingProps) {
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRating() {
      if (!userId) return

      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_id', userId)

      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + curr.rating, 0)
        setAverage(total / data.length)
        setCount(data.length)
      }
      setLoading(false)
    }

    fetchRating()
  }, [userId])

  if (loading) return <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>

  // If no reviews yet
  if (count === 0) return <span className="text-xs text-gray-400">No reviews yet</span>

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={size === 'lg' ? 'text-xl' : 'text-sm'}>
            {/* Logic: Show filled star if average is greater than this star index */}
            {average >= star ? '★' : average >= star - 0.5 ? '⭐️' : '☆'} 
          </span>
        ))}
      </div>
      {showCount && (
        <span className={`text-gray-500 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
          ({count})
        </span>
      )}
    </div>
  )
}