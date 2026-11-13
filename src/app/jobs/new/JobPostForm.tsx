'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/utils/supabase/client'
import { ROLE_CATEGORIES } from '@/src/config/roles'

export default function JobPostForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    // NEW: Strict null check to satisfy TypeScript
    if (!user) {
      alert("You must be logged in to post a job.")
      setLoading(false)
      return
    }

    // NEW: Added explicit 'as string' to satisfy TypeScript's strict mode
    const jobData = {
      job_role: formData.get('role') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      budget: parseFloat(formData.get('budget') as string) || 0, 
      organizer_id: user.id, 
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Post an Event Job</h1>
        <p className="text-slate-500 mb-8">Find the best talent for your event.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Job Role</label>
            <select 
              name="role"
              required
              defaultValue=""
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="" disabled>Select a standardized role...</option>
              {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                <optgroup key={category} label={category} className="font-bold text-slate-400 uppercase">
                  {roles.map(role => (
                    <option key={role} value={role} className="font-medium text-slate-900 normal-case">
                      {role}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Internal Job Title (Optional)</label>
            <input 
              name="title" 
              placeholder="e.g., VIP Bartender for Main Stage" 
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
              <input 
                name="location" 
                required 
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Budget / Rate ($)</label>
              <input 
                name="budget" 
                type="number" 
                required 
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea 
              name="description" 
              rows={5} 
              required 
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-4 rounded-xl transition-all">
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  )
}