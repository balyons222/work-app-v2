'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EmployerDashboard() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false) // Toggle for "Add Event" modal
  
  // New Event Form State
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchMyEvents()
  }, [])

  async function fetchMyEvents() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Fetch Events and count how many jobs are inside each
    const { data, error } = await supabase
      .from('events')
      .select('*, jobs(count)')
      .eq('organizer_id', user.id)
      .order('event_date', { ascending: true })

    if (error) console.error(error)
    else setEvents(data || [])
    
    setLoading(false)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('events').insert({
      title,
      location,
      event_date: date,
      budget: parseFloat(budget),
      organizer_id: user.id
    })

    if (error) {
      toast.error('Failed to create event')
    } else {
      toast.success('Event created!')
      setIsCreating(false)
      setTitle(''); setLocation(''); setDate(''); setBudget('')
      fetchMyEvents()
    }
  }

  if (loading) return <div className="p-12 text-center">Loading Events...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Manager</h1>
                <p className="text-gray-500">Manage your events and hiring budget.</p>
            </div>
            <button 
                onClick={() => setIsCreating(!isCreating)}
                className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors"
            >
                {isCreating ? 'Cancel' : '+ Add Event'}
            </button>
        </div>

        {/* CREATE EVENT FORM (Collapsible) */}
        {isCreating && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 animate-fade-in-down">
                <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Event Name (e.g. Summer Festival)" className="p-3 border rounded-lg" value={title} onChange={e => setTitle(e.target.value)} required />
                    <input type="text" placeholder="Location" className="p-3 border rounded-lg" value={location} onChange={e => setLocation(e.target.value)} required />
                    <input type="date" className="p-3 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} required />
                    <input type="number" placeholder="Total Budget ($)" className="p-3 border rounded-lg" value={budget} onChange={e => setBudget(e.target.value)} required />
                    <button type="submit" className="md:col-span-2 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                        Create Event
                    </button>
                </form>
            </div>
        )}

        {/* EVENTS LIST */}
        <div className="grid gap-6">
            {events.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed text-gray-400">
                    No events found. Create one to get started!
                </div>
            ) : (
                events.map(event => (
                    <div 
                        key={event.id}
                        onClick={() => router.push(`/dashboard/event/${event.id}`)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md cursor-pointer transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {event.title} &rarr;
                                </h3>
                                <p className="text-gray-500">📍 {event.location} • 📅 {new Date(event.event_date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm text-gray-500 font-medium">Budget</span>
                                <span className="text-xl font-bold text-green-700">${event.budget}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-4 text-sm text-gray-600">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                📋 {event.jobs?.[0]?.count || 0} Roles Open
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  )
}
