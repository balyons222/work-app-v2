'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'

export default function FindWork() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs(term: string = '') {
    setLoading(true)
    
    // 👇 UPGRADE: We now fetch the related 'events' data (title)
    let query = supabase
      .from('jobs')
      .select('*, events(title, event_date)') 
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (term) {
      query = query.ilike('title', `%${term}%`)
    }

    const { data, error } = await query

    if (error) console.error('Error fetching jobs:', error)
    else setJobs(data || [])
    
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchJobs(searchQuery)
  }

  // Helper to format nice times (e.g. "2:00 PM")
  const formatTime = (dateString: string) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Open Shifts</h1>
            <p className="text-gray-500 mt-1">Find gigs at upcoming events near you.</p>
          </div>

          <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none w-full md:w-64"
            />
            <button className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800">
              Search
            </button>
          </form>
        </div>

        {/* Job List */}
        {loading ? (
          <div className="text-center py-12">Loading open shifts...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No shifts found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  
                  <div className="flex-grow">
                    {/* Event Badge */}
                    {job.events && (
                      <div className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded mb-2 uppercase tracking-wide">
                        🎉 {job.events.title}
                      </div>
                    )}

                    <h3 className="font-bold text-xl text-gray-900 mb-1">{job.title}</h3>
                    <p className="text-gray-500 text-sm mb-4">{job.description}</p>
                    
                    {/* Shift Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-8 text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase font-bold">Pay</span>
                        <span className="font-bold text-green-700 text-lg">${job.price}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase font-bold">Location</span>
                        <span>📍 {job.location}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-xs text-gray-400 uppercase font-bold">Shift Time</span>
                        <span className="font-medium text-black">
                           📅 {new Date(job.start_time || job.created_at).toLocaleDateString()} <br/>
                           ⏰ {formatTime(job.start_time)} - {formatTime(job.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Apply Button */}
                  <button 
onClick={async () => {
    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) {
        window.location.href = '/login'
        return
    }

    // 2. Insert Application to Database
    const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        worker_id: user.id
    })

    if(error) {
        alert('You already applied!')
        return
    }

    // 3. 👇 NEW: Send Email Notification
    // We don't await this because we don't want to make the user wait for the email to send
    fetch('/api/notify', {
        method: 'POST',
        body: JSON.stringify({
            jobId: job.id,
            applicantName: user.email // Or fetch full_name if you have it available here
        })
    })

    alert('Application Sent! Organizers have been notified.')
}}>
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}