'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import Link from 'next/link'

function EventDirectoryContent() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCity, setFilterCity] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadEvents() {
      // Fetch upcoming events + count of OPEN jobs
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          jobs (count)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
        .order('event_date', { ascending: true })

      if (!error) setEvents(data || [])
      setLoading(false)
    }
    loadEvents()
  }, [])

  // Filter Logic
  const filteredEvents = events.filter(ev => 
    !filterCity || ev.location.toLowerCase().includes(filterCity.toLowerCase())
  )

  if (loading) return <div className="p-20 text-center">Loading Events...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Upcoming Events</h1>
            <p className="text-slate-500">Browse major events hiring crew right now.</p>
          </div>
          
          <input 
            type="text" 
            placeholder="Filter by City..." 
            className="p-3 w-full md:w-60 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
          />
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            // Count open jobs (Supabase returns count as an array of objects usually, but we simplify here)
            const jobCount = event.jobs?.[0]?.count || 0 
            // Note: If exact count logic varies, we can refine, but 'count' usually works with .select('*, jobs(count)')

            return (
              <Link 
                href={`/events/${event.id}`} 
                key={event.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="h-32 bg-slate-800 flex items-center justify-center relative">
                   {/* Placeholder for Event Cover Image if you add one later */}
                   <h3 className="text-2xl font-black text-white px-6 text-center z-10">{event.title}</h3>
                   <div className="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-slate-700">📍 {event.location}</p>
                      <p className="text-sm text-slate-500">📅 {new Date(event.event_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm line-clamp-2 mb-6 h-10">
                    {event.description || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Hiring Status
                    </span>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      View Open Roles →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        
        {filteredEvents.length === 0 && (
           <div className="text-center py-20 text-slate-400">No upcoming events found.</div>
        )}

      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventDirectoryContent />
    </Suspense>
  )
}
