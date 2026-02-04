'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'

export default function StarRating({ userId, readOnly = true }: { userId: string, readOnly?: boolean }) {
  const [rating, setRating] = useState(0)
  const [count, setCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRating() {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('target_id', userId)

      if (data && data.length > 0) {
        // Calculate Average
        const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length
        setRating(avg)
        setCount(data.length)
      }
    }
    fetchRating()
  }, [userId])

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= Math.round(rating) ? (
              <StarIcon className="h-4 w-4" />
            ) : (
              <StarOutline className="h-4 w-4 text-slate-300" />
            )}
          </span>
        ))}
      </div>
      <span className="text-xs text-slate-400 font-bold ml-1">
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  )
}
