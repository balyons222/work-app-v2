'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

function DashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // New Event Form State
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Fetch Role-Specific Data
      if (profileData?.role === 'organizer') {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, jobs(count)')
          .eq('organizer_id', user.id)
          .order('event_date', { ascending: true })
        
        setEvents(eventsData || [])
      }
    } catch (err: any) {
      console.error('Dashboard Load Error:', err.message)
      // Redirect to setup if profile is missing
      if (err.message?.includes('JSON object requested, but 0 rows were returned')) {
        router.push('/setup-profile')
      }
    } finally {
      setLoading(false)
    }
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
      loadDashboardData()
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* SHARED HEADER: PROFILE OVERVIEW */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Section */}
            <div className="h-16 w-16 bg-primary rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold border border-slate-200">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 italic">Stay FxD, {profile?.full_name || 'Member'}</h1>
              <p className="text-sm text-gray-500 capitalize">{profile?.role} • {profile?.location || 'Location not set'}</p>
            </div>
          </div>
          <Link href="/setup-profile" className="w-full md:w-auto text-center px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all">
            Edit Profile
          </Link>
        </div>

        {/* CONDITION 1: CONTRACTOR VIEW */}
        {profile?.role === 'contractor' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Professional Bio</h2>
                <p className="text-gray-600 leading-relaxed">
                  {profile?.bio || "No bio added yet. Tell organizers about your experience."}
                </p>
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile?.skills ? profile.skills.split(',').map((s: string) => (
                      <span key={s} className="bg-teal-50 text-secondary px-3 py-1 rounded-md text-sm font-medium border border-teal-100">
                        {s.trim()}
                      </span>
                    )) : <span className="text-gray-400 italic text-sm">No skills listed</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <Link href="/jobs" className="block p-10 bg-black text-white rounded-3xl text-center hover:bg-gray-800 transition-all shadow-xl shadow-slate-200">
                <span className="text-xl font-bold block mb-1">Find Work &rarr;</span>
                <p className="text-gray-400 text-sm">Browse latest gigs</p>
              </Link>
            </div>
          </div>
        )}

        {/* CONDITION 2: ORGANIZER VIEW */}
        {profile?.role === 'organizer' && (
          <>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Event Manager</h2>
                <p className="text-gray-500">Manage your events and hiring budget.</p>
              </div>
              <button 
                onClick={() => setIsCreating(!isCreating)}
                className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors"
              >
                {isCreating ? 'Cancel' : '+ Add Event'}
              </button>
            </div>

            {isCreating && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-bold mb-4">Create New Event</h2>
                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Event Name" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={title} onChange={e => setTitle(e.target.value)} required />
                  <input type="text" placeholder="Location" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={location} onChange={e => setLocation(e.target.value)} required />
                  <input type="date" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={date} onChange={e => setDate(e.target.value)} required />
                  <input type="number" placeholder="Total Budget ($)" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={budget} onChange={e => setBudget(e.target.value)} required />
                  <button type="submit" className="md:col-span-2 bg-secondary text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition-colors">
                    Create Event
                  </button>
                </form>
              </div>
            )}

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
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {event.title} &rarr;
                        </h3>
                        <p className="text-gray-500">📍 {event.location} • 📅 {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}</p>
                      </div>
                      <div className="text-right">
                        <span className="block text-sm text-gray-500 font-medium">Budget</span>
                        <span className="text-xl font-bold text-green-700">${event.budget}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Wrap in Suspense to prevent the "Client-side Exception" crash
export default function UniversalDashboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
