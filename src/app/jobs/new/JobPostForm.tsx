'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../utils/supabase/client'

export default function JobPostForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    const jobData = {
      title: formData.get('title'),
      description: formData.get('description'),
      location: formData.get('location'),
      budget: formData.get('budget'),
      user_id: user?.id,
    }

    const { error } = await supabase
      .from('jobs')
      .insert([jobData])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/jobs')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Post an Event Job</h1>
        <p className="text-slate-500 mb-8">Find the best talent for your event.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Job Title</label>
            <input name="title" required className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary mb-2">Location</label>
              <input name="location" required className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary mb-2">Budget</label>
              <input name="budget" className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Description</label>
            <textarea name="description" rows={5} required className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all">
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  )
}