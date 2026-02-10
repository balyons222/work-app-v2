'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function PublicEventPage() {
  const [event, setEvent] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const params = useParams()
  const eventId = params?.id as string

  useEffect(() => {
    async function loadData() {
      // 1. Get Event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      setEvent(eventData)

      // 2. Get Open Jobs for this Event
      if (eventData) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'open')
        setJobs(jobsData || [])
      }
      setLoading(false)
    }
    loadData()
  }, [eventId])

  if (loading) return <div className="p-20 text-center">Loading...</div>
  if (!event) return <div className="p-20 text-center">Event not found</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        <Link href="/events" className="text-slate-400 font-bold text-sm hover:text-primary mb-8 inline-block">
          ← Back to Events
        </Link>

        {/* Event Hero */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="bg-primary p-12 text-center md:text-left">
            <h1 className="text-4xl font-black text-white mb-2">{event.title}</h1>
            <p className="text-white/80 text-lg font-medium">
              📍 {event.location} • 📅 {new Date(event.event_date).toLocaleDateString()}
            </p>
          </div>
          <div className="p-8 md:p-12">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">About this Event</h3>
            <p className="text-slate-700 leading-relaxed text-lg">
              {event.description || "No description provided."}
            </p>
            {event.website && (
              <a href={event.website} target="_blank" className="inline-block mt-4 text-secondary font-bold hover:underline">
                🔗 Visit Official Website
              </a>
            )}
          </div>
        </div>

        {/* Available Roles */}
        <h2 className="text-2xl font-black text-primary mb-6">Open Positions</h2>
        <div className="grid gap-4">
          {jobs.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
              No open positions listed for this event currently.
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-primary">{job.title}</h3>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span>${job.rate} total pay</span>
                    <span>•</span>
                    <span>{job.start_date ? new Date(job.start_date).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
                <Link 
                  href={`/jobs/${job.id}`}
                  className="px-6 py-2 bg-secondary text-white font-bold rounded-lg hover:bg-teal-700 transition-colors"
                >
                  View & Apply
                </Link>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}