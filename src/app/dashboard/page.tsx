'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import TermsModal from '@/src/components/TermsModal'

function DashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview') 
  
  // Contractor State
  const [myApps, setMyApps] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  // Terms of Service State
  const [showTerms, setShowTerms] = useState(false)

  // Event Form State (Organizer)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [pocName, setPocName] = useState('')
  const [pocPhone, setPocPhone] = useState('')
  // ✅ 1. NEW VISIBILITY STATE
  const [visibility, setVisibility] = useState('public')

  // Review State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<any>(null) 
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

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

      // 2. ORGANIZER DATA FETCH
      // ✅ FIX: Added toLowerCase() to prevent case-sensitivity bugs
      if (profileData?.role?.toLowerCase() === 'organizer') {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*, jobs(id, rate)') 
          .eq('organizer_id', user.id)
          .order('event_date', { ascending: true })

        if (eventsError) console.error("Event Fetch Error:", eventsError)
        
        // Calculate Committed Spend
        const eventsWithBudget = eventsData?.map(event => {
          const committed = event.jobs?.reduce((sum: number, job: any) => sum + (job.rate || 0), 0) || 0
          return {
            ...event,
            committed_spend: committed,
            remaining_budget: (event.budget || 0) - committed
          }
        })

        setEvents(eventsWithBudget || [])
      }

      // 3. CONTRACTOR DATA FETCH
      if (profileData?.role?.toLowerCase() === 'contractor') {
        const { data: appsData } = await supabase
          .from('applications')
          .select(`
            *,
            jobs (
              id, title, rate, start_date, end_date, organizer_id,
              events ( title, location, event_date, poc_name, poc_phone ),
              reviews ( reviewer_id ) 
            )
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false })

        setMyApps(appsData || [])
      }

    } catch (err: any) {
      console.error('Dashboard Load Error:', err.message)
      if (err.message?.includes('JSON object requested, but 0 rows were returned')) {
        router.push('/setup-profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEventClick = () => {
    if (!profile?.accepted_tos_at) {
      setShowTerms(true)
      return
    }
    setIsCreating(!isCreating)
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
      website, 
      description, 
      organizer_id: user.id,
      poc_name: pocName,
      poc_phone: pocPhone,
      visibility: visibility // ✅ 2. INSERT VISIBILITY
    })

    if (error) toast.error('Failed to create event')
    else {
      toast.success('Event created!')
      setIsCreating(false)
      // Reset Form
      setTitle(''); setLocation(''); setDate(''); setBudget(''); setWebsite(''); setDescription(''); setPocName(''); setPocPhone(''); setVisibility('public');
      loadDashboardData()
    }
  }

  // REVIEW SUBMISSION LOGIC
  const openReviewModal = (job: any) => {
    setReviewTarget({
      jobId: job.id,
      organizerId: job.organizer_id,
      eventName: job.events?.title
    })
    setRating(5)
    setComment('')
    setReviewModalOpen(true)
  }

  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewee_id: reviewTarget.organizerId, 
      job_id: reviewTarget.jobId,
      rating: rating,
      comment: comment
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Review Submitted!')
      
      await sendNotification({
        userId: reviewTarget.organizerId,
        title: "New Review! ⭐",
        message: `A worker left you a ${rating}-star review for ${reviewTarget.eventName}.`,
        link: `/dashboard`, 
        type: "success"
      })

      setReviewModalOpen(false)
      loadDashboardData()
    }
  }

  // --- CONTRACTOR HELPER: Sort Applications ---
  const bookedJobs = myApps.filter(a => a.status === 'approved' && a.payment_status !== 'paid')
  const pendingJobs = myApps.filter(a => a.status === 'pending')
  const pastJobs = myApps.filter(a => a.payment_status === 'paid')
  const totalEarnings = pastJobs.reduce((sum, app) => sum + (app.jobs?.rate || 0), 0)


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* SHARED HEADER */}
        {/* TABS NAVIGATION */}
        <div className="flex gap-6 border-b border-slate-200 mb-8">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`pb-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Reports & Analytics
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
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

        {/* ========================================================= */}
        {/* CONTRACTOR DASHBOARD VIEW */}
        {/* ========================================================= */}
        {profile?.role?.toLowerCase() === 'contractor' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'reports' ? (
              // --- REPORT VIEW ---
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 mb-6">Financial Report 2026</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Gross Earnings</p>
                    <p className="text-3xl font-black text-green-600">${totalEarnings.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Jobs Completed</p>
                    <p className="text-3xl font-black text-slate-900">{pastJobs.length}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Avg. Rate / Job</p>
                    <p className="text-3xl font-black text-slate-900">
                      ${pastJobs.length > 0 ? (totalEarnings / pastJobs.length).toFixed(0) : 0}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-3">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <h4 className="font-bold text-yellow-800 text-sm">Tax Filing Status</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      {totalEarnings >= 2000 
                        ? "You have earned over $2000. You will receive a 1099-NEC form at year-end." 
                        : `You are $${2000 - totalEarnings} away from the IRS reporting threshold.`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // --- OVERVIEW VIEW (Schedule + Pending + History) ---
              <div className="space-y-10">
                {/* 1. UPCOMING SCHEDULE */}
                <section>
                  <h2 className="text-xl font-black text-primary mb-4 flex items-center gap-2">
                    📅 Upcoming Schedule <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{bookedJobs.length}</span>
                  </h2>
                  {bookedJobs.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                      <p className="text-slate-400 mb-4">No confirmed gigs yet.</p>
                      <Link href="/jobs" className="inline-block bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800">Find Work</Link>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {bookedJobs.map(app => (
                        <div key={app.id} className="bg-white p-6 rounded-2xl border border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Confirmed</span>
                            <span className="font-black text-lg text-slate-900">${app.jobs?.rate}</span>
                          </div>
                          <h3 className="font-bold text-xl text-primary">{app.jobs?.events?.title}</h3>
                          <p className="text-slate-500 text-sm font-bold mb-4">{app.jobs?.title}</p>
                          
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>📍 {app.jobs?.events?.location}</p>
                            <p>🗓️ {app.jobs?.start_date} → {app.jobs?.end_date}</p>
                          </div>

                          {app.jobs?.events?.poc_name && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">On-Site Contact</p>
                              <p className="text-sm font-bold text-primary">{app.jobs.events.poc_name}</p>
                              <a href={`tel:${app.jobs.events.poc_phone}`} className="text-sm font-medium text-secondary hover:underline">
                                📞 {app.jobs.events.poc_phone}
                              </a>
                            </div>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <Link href={`/jobs/${app.jobs?.id}`} className="block text-center text-secondary font-bold text-sm hover:underline">
                              View Job Details & Contact
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 2. PENDING APPLICATIONS */}
                <section>
                  <h2 className="text-xl font-black text-primary mb-4 flex items-center gap-2">
                    ⏳ Pending Applications <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{pendingJobs.length}</span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pendingJobs.map(app => (
                      <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">Under Review</span>
                          <span className="font-bold text-slate-700">${app.jobs?.rate}</span>
                        </div>
                        <h4 className="font-bold text-slate-900">{app.jobs?.title}</h4>
                        <p className="text-xs text-slate-500 mb-3">{app.jobs?.events?.title}</p>
                        <Link href={`/jobs/${app.jobs?.id}`} className="text-xs text-primary font-bold hover:underline">
                          View Status &rarr;
                        </Link>
                      </div>
                    ))}
                    {pendingJobs.length === 0 && (
                      <p className="text-slate-400 text-sm italic col-span-full">No pending applications.</p>
                    )}
                  </div>
                </section>

                {/* 3. WORK HISTORY & EARNINGS */}
                <section>
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="text-xl font-black text-primary">💰 Work History</h2>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Earned</p>
                      <p className="text-2xl font-black text-green-600">${totalEarnings.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {pastJobs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">No completed jobs yet.</div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                          <tr>
                            <th className="p-4">Event</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Paid</th>
                            <th className="p-4 text-right">Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pastJobs.map(app => {
                            const hasReviewed = app.jobs?.reviews?.some((r: any) => r.reviewer_id === profile?.id)

                            return (
                              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-900">{app.jobs?.events?.title}</td>
                                <td className="p-4 text-slate-600">{app.jobs?.title}</td>
                                <td className="p-4 text-slate-500">{new Date(app.jobs?.start_date).toLocaleDateString()}</td>
                                <td className="p-4 text-right font-bold text-green-600">
                                  ${app.jobs?.rate}
                                  <span className="block text-[10px] text-slate-400 font-normal uppercase">{app.payment_method}</span>
                                </td>
                                <td className="p-4 text-right">
                                  {hasReviewed ? (
                                    <span className="text-xs font-bold text-yellow-500 bg-yellow-50 px-2 py-1 rounded">⭐ Submitted</span>
                                  ) : (
                                    <button 
                                      onClick={() => openReviewModal(app.jobs)}
                                      className="text-xs font-bold text-secondary bg-teal-50 border border-teal-100 px-3 py-1 rounded-lg hover:bg-teal-100 transition-colors"
                                    >
                                      Rate Org
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ORGANIZER DASHBOARD VIEW */}
        {/* ========================================================= */}
        {profile?.role?.toLowerCase() === 'organizer' && (
          <>
            {activeTab === 'reports' ? (
              // --- REPORTS VIEW ---
              <div className="space-y-6">
                <h2 className="text-xl font-black text-slate-900">Event Budget Analysis</h2>
                {events.map(event => (
                  <div key={event.id} className="bg-white p-6 rounded-2xl border border-slate-200">
                    <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-lg">{event.title}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${event.remaining_budget < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {event.remaining_budget < 0 ? 'OVER BUDGET' : 'On Track'}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full ${event.remaining_budget < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                        style={{ width: `${Math.min((event.committed_spend / (event.budget || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Spent: ${event.committed_spend}</span>
                      <span>Budget: ${event.budget}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // --- OVERVIEW VIEW (Create Form + List) ---
              <div className="space-y-8">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Event Manager</h2>
                    <p className="text-gray-500">Manage your events and hiring budget.</p>
                  </div>
                  <button 
                    onClick={handleCreateEventClick}
                    className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors"
                  >
                    {isCreating ? 'Cancel' : '+ Add Event'}
                  </button>
                </div>

                {/* CREATE EVENT FORM */}
                {isCreating && (
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-bold mb-4">1. Create New Event Container</h2>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Event Name" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={title} onChange={e => setTitle(e.target.value)} required />
                      <input type="text" placeholder="Location (City, State)" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={location} onChange={e => setLocation(e.target.value)} required />
                      
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Event Date</label>
                        <input type="date" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={date} onChange={e => setDate(e.target.value)} required />
                      </div>
                      
                      {/* ✅ 3. VISIBILITY SELECTOR ADDED */}
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Visibility</label>
                        <select 
                          value={visibility} 
                          onChange={(e) => setVisibility(e.target.value)}
                          className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary bg-white font-bold text-slate-700"
                        >
                          <option value="public">🌍 Public (Visible to Everyone)</option>
                          <option value="private">🔒 Private (Invite Only)</option>
                        </select>
                      </div>

                      <div className="flex flex-col md:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Total Labor Budget</label>
                        <input type="number" placeholder="$ 0.00" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={budget} onChange={e => setBudget(e.target.value)} required />
                      </div>

                      <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">On-Site Point of Contact (Visible to Hired Crew Only)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Site Lead Name" className="p-3 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={pocName} onChange={e => setPocName(e.target.value)} />
                          <input type="tel" placeholder="Site Lead Phone" className="p-3 bg-white border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={pocPhone} onChange={e => setPocPhone(e.target.value)} />
                        </div>
                      </div>

                      <input type="url" placeholder="Event Website (Optional)" className="md:col-span-2 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary" value={website} onChange={e => setWebsite(e.target.value)} />
                      <textarea placeholder="Event Description / Notes..." className="md:col-span-2 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-secondary h-20" value={description} onChange={e => setDescription(e.target.value)} />
                      <button type="submit" className="md:col-span-2 bg-secondary text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition-colors shadow-md">Create Event & Start Staffing →</button>
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
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium mt-1">
                               <span>📍 {event.location}</span>
                               <span>📅 {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}</span>
                               {event.visibility === 'private' && (
                                 <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">🔒 Private</span>
                               )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-sm text-gray-500 font-medium">Budget</span>
                            <span className="text-xl font-bold text-green-700">${event.budget}</span>
                            <div className="mt-2 text-xs">
                              <span className="text-slate-400">Committed: </span>
                              <span className="font-bold text-slate-700">${event.committed_spend}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* REVIEW MODAL (CONTRACTOR SIDE) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-black text-primary mb-2">Rate Organizer</h3>
            <p className="text-slate-500 text-sm mb-6">How was working with {reviewTarget?.eventName || 'this event'}?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)} 
                  className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Was payment on time? Was the site safe? (Optional)"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-32 mb-6 outline-none focus:ring-2 focus:ring-secondary"
            />

            <div className="flex gap-4">
              <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
              <button onClick={submitReview} className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-teal-600 shadow-lg">Submit Review</button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS MODAL */}
      {showTerms && profile && (
        <TermsModal 
          userId={profile.id} 
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setProfile({ ...profile, accepted_tos_at: new Date().toISOString() })
            setShowTerms(false)
            toast.success("Terms accepted. You can now create events.")
            setIsCreating(true)
          }}
        />
      )}
    </div>
  )
}

export default function UniversalDashboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
