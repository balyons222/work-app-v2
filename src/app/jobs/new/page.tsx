'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewJobPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // 1. Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Stop page from refreshing
    setLoading(true)

    // A. Get the current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to post a job!")
      router.push('/auth')
      return
    }

    // B. Insert the data into Supabase
    const { error } = await supabase
      .from('jobs')
      .insert({
        title,
        description,
        price: parseInt(price), // Convert text "100" to number 100
        location,
        organizer_id: user.id
      })

    if (error) {
      alert('Error posting job: ' + error.message)
    } else {
      alert('Success! Job posted.')
      router.push('/dashboard') // Send them back to dashboard
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Post a New Job</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
              placeholder="e.g. Wedding Photographer Needed"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
              placeholder="Describe the tasks..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget ($)</label>
              <input
                required
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                placeholder="200"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                required
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                placeholder="New York, NY"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full mt-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  )
}