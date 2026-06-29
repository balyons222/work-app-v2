
'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import TermsModal from '@/src/components/TermsModal'
import ChatWindow from '@/src/components/ChatWindow'
import StripeConnectButton from '@/src/components/StripeConnectButton'

function DashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [myApps, setMyApps] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const isStripeConnected = !!profile?.stripe_account_id
  
  // Event Form State
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [budget, setBudget] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [pocName, setPocName] = useState('')
  const [pocPhone, setPocPhone] = useState('')
  const [visibility, setVisibility] = useState('public')

  // Review & Chat State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Global Notification Listener
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('dashboard_notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          if (payload.new.sender_id !== profile.id) {
            setUnreadCount(prev => prev + 1)
            toast('New message received! 💬', {
              duration: 4000,
              position: 'top-right',
              style: { background: '#333', color: '#fff', fontWeight: 'bold' },
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  async function loadDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      // --- ORGANIZER DATA FETCH ---
      if (profileData?.role?.toLowerCase() === 'organizer') {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, jobs(id, rate)')
          .eq('organizer_id', user.id)
          .order('event_date', { ascending: true })

        setEvents(eventsData?.map(event => ({
          ...event,
          committed_spend: event.jobs?.reduce((sum: number, job: any) => sum + (job.rate || 0), 0) || 0,
          remaining_budget: (event.budget || 0) - (event.jobs?.reduce((sum: number, job: any) => sum + (job.rate || 0), 0) || 0)
        })) || [])
      }

      // --- CONTRACTOR DATA FETCH ---
      const userRole = profileData?.role?.toLowerCase() || ''
      if (userRole.includes('contractor') || userRole.includes('worker')) {
        
        // 1. FETCH INVITES 
        const { data: invitesData } = await supabase
          .from('event_invitations')
          .select(`
            id, status, 
            event_id, job_id,
            events ( id, title, location, event_date, organizer_id, profiles:organizer_id (full_name) ),
            jobs ( id, title, rate, events ( title, location, event_date, profiles:organizer_id (full_name) ) )
          `)
          .eq('invitee_id', user.id)
        
        // Manual filter to avoid database status casing issues
        const activeInvites = (invitesData || []).filter(i => (i.status || '').toLowerCase() === 'pending')
        setInvites(activeInvites)
        
        // 2. FETCH APPLICATIONS (JOBS)
        const { data: appsData } = await supabase
          .from('applications')
          .select(`
            *,
            jobs (
              id, title, rate, start_date, end_date, organizer_id,
              events ( title, location, event_date, poc_name, poc_phone ),
              profiles:organizer_id (full_name),
              reviews ( reviewer_id ) 
            )
          `)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false })

        setMyApps(appsData || [])
      }
    } catch (err: any) {
      console.error('Dashboard Error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  // HANDLERS
  const handleOpenChat = async (jobId: string, applicationId: string, otherUserId: string, otherName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: existingChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).maybeSingle()
    if (existingChat) {
      setActiveChat({ id: existingChat.id, name: otherName }); setUnreadCount(0);
    } else {
      const { data: newChat, error } = await supabase.from('conversations').insert({ job_id: jobId, application_id: applicationId, organizer_id: otherUserId, worker_id: user.id }).select().single()
      if (error && error.code === '23505') {
           const { data: retryChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).single()
           if (retryChat) setActiveChat({ id: retryChat.id, name: otherName })
      } else if (!error) { setActiveChat({ id: newChat.id, name: otherName }); setUnreadCount(0); }
    }
  }

  const handleCreateEventClick = () => { if (!profile?.accepted_tos_at) { setShowTerms(true); return; } setIsCreating(!isCreating) }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { error } = await supabase.from('events').insert({ title, location, event_date: date, budget: parseFloat(budget), website, description, organizer_id: user.id, poc_name: pocName, poc_phone: pocPhone, visibility })
    if (error) toast.error('Failed to create event'); else { toast.success('Event created!'); setIsCreating(false); setTitle(''); setLocation(''); setDate(''); setBudget(''); loadDashboardData(); }
  }

  const handleDeleteEvent = async (eventId: string) => { if (!confirm("Are you sure?")) return; const { error } = await supabase.from('events').delete().eq('id', eventId); if (!error) { toast.success("Event deleted"); loadDashboardData(); } }

  const handleInviteResponse = async (inviteId: string, response: 'accepted' | 'declined', targetId: string) => {
    const { error } = await supabase.from('event_invitations').update({ status: response }).eq('id', inviteId)
    if (!error) { if (response === 'accepted') { toast.success("Invite Accepted!"); router.push(`/events/${targetId}`) } else { toast.success("Invite Declined"); setInvites(current => current.filter(i => i.id !== inviteId)) } } else { toast.error("Error updating invite") }
  }

  const openReviewModal = (job: any) => { setReviewTarget({ jobId: job.id, organizerId: job.organizer_id, eventName: job.events?.title }); setRating(5); setComment(''); setReviewModalOpen(true) }
  
  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: reviewTarget.organizerId, job_id: reviewTarget.jobId, rating, comment })
    if (!error) { toast.success('Review Submitted!'); await sendNotification({ userId: reviewTarget.organizerId, title: "New Review! ⭐", message: `A worker left you a review.`, link: `/dashboard`, type: "success" }); setReviewModalOpen(false); loadDashboardData() }
  }

  const handleDuplicateEvent = async (originalEventId: string) => {
    // 1. Ask the organizer for the date of the new event
    const newDateStr = window.prompt("Enter the date for the new event (YYYY-MM-DD):", "");
    if (!newDateStr) return; // They clicked cancel

    try {
      // 2. Fetch the original event AND all its jobs
      const { data: originalEvent, error: fetchErr } = await supabase
        .from('events')
        .select('*, jobs(*)')
        .eq('id', originalEventId)
        .single();

      if (fetchErr || !originalEvent) throw new Error("Could not fetch original event.");

      // 3. Strip out the old IDs and insert the new Event
      const { jobs, id, created_at, ...eventData } = originalEvent;
      
      const { data: newEvent, error: insertEventErr } = await supabase
        .from('events')
        .insert({
          ...eventData,
          title: `${eventData.title} (Copy)`,
          event_date: newDateStr
        })
        .select()
        .single();

      if (insertEventErr || !newEvent) throw new Error("Failed to duplicate the event.");

      // 4. Strip out the old job IDs and insert the new Jobs tied to the new Event
      if (jobs && jobs.length > 0) {
        const jobsToInsert = jobs.map((job: any) => {
          const { id, created_at, event_id, ...jobData } = job;
          return {
            ...jobData,
            event_id: newEvent.id, // Tie it to the copied event
            status: 'open'         // Make sure the new jobs are accepting applications
          };
        });

        const { error: jobsErr } = await supabase.from('jobs').insert(jobsToInsert);
        if (jobsErr) {
          toast.error("Event copied, but jobs failed to transfer.");
          loadDashboardData();
          return;
        }
      }

      toast.success("Event and staff requirements duplicated!");
      loadDashboardData(); // Refresh the dashboard to show the new event

    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    }
  }

  // Helper for safe status checks
  const normalize = (s: string) => s?.toLowerCase().trim() || ''
  const bookedJobs = myApps.filter(a => normalize(a.status) === 'approved' && normalize(a.payment_status) !== 'paid')
  const pendingJobs = myApps.filter(a => normalize(a.status) === 'pending')
  const pastJobs = myApps.filter(a => normalize(a.payment_status) === 'paid')
  const totalEarnings = pastJobs.reduce((sum, app) => sum + (app.jobs?.rate || 0), 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex gap-6 border-b border-slate-200 mb-8">
          <button onClick={() => { setActiveTab('overview'); setUnreadCount(0); }} className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>
            Overview {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">{unreadCount}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`pb-4 text-sm font-bold border-b-2 ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>Reports & Analytics</button>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
    <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-bold">Get Paid</h3>
            <p className="text-gray-500 text-sm">Connect your bank account to receive payments and tax forms.</p>
        </div>
        <StripeConnectButton isConnected={isStripeConnected} />
    </div>
</div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-primary rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold border border-slate-200">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" /> : profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 italic">Stay FxD, {profile?.full_name || 'Member'}</h1>
              <p className="text-sm text-gray-500 capitalize">{profile?.role} • {profile?.location || 'Location not set'}</p>
            </div>
          </div>
          <Link href="/setup-profile" className="w-full md:w-auto text-center px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-all">Edit Profile</Link>
        </div>

        {(profile?.role?.toLowerCase()?.includes('contractor') || profile?.role?.toLowerCase()?.includes('worker')) && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {activeTab === 'reports' ? (
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
                   </div>
                 </div>
             ) : (
                 <div className="space-y-10">
                    
                    {/* INVITES SECTION */}
                    <section>
                      <h2 className="text-xl font-black mb-4 flex items-center gap-2">🎟️ Job Invitations <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{invites.length}</span></h2>
                      {invites.length === 0 ? (
                        <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-slate-400">
                          No active invitations found.
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                           <div className="relative z-10 grid gap-4 md:grid-cols-2">
                              {invites.map(invite => {
                                const eventTitle = invite.events?.title || invite.jobs?.events?.title || 'Event'
                                const jobTitle = invite.jobs?.title || 'Crew Member'
                                const organizerName = invite.events?.profiles?.full_name || invite.jobs?.events?.profiles?.full_name || 'Organizer'
                                const eventLocation = invite.events?.location || invite.jobs?.events?.location || 'TBD'
                                const eventDate = invite.events?.event_date || invite.jobs?.events?.event_date
                                const targetId = invite.events?.id || invite.jobs?.events?.id 

                                return (
                                <div key={invite.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex justify-between items-center">
                                  <div>
                                    <h3 className="font-bold text-lg text-white">{eventTitle}</h3>
                                    {invite.jobs && <p className="text-indigo-200 text-sm mb-1">Role: <span className="font-bold text-white">{jobTitle}</span></p>}
                                    <p className="text-xs text-indigo-300 font-bold uppercase mb-1">Hosted by: {organizerName}</p>
                                    <p className="text-xs text-indigo-200">📍 {eventLocation} • 📅 {eventDate ? new Date(eventDate).toLocaleDateString() : 'Date TBD'}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleInviteResponse(invite.id, 'declined', targetId)} className="px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 rounded-lg">Decline</button>
                                    <button onClick={() => handleInviteResponse(invite.id, 'accepted', targetId)} className="px-4 py-2 text-xs font-bold bg-white text-indigo-900 rounded-lg">View & Apply</button>
                                  </div>
                                </div>
                                )
                              })}
                           </div>
                        </div>
                      )}
                    </section>

                    {/* UPCOMING SCHEDULE */}
                    <section>
                       <h2 className="text-xl font-black text-primary mb-4 flex items-center gap-2">📅 Upcoming Schedule <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{bookedJobs.length}</span></h2>
                       {bookedJobs.length === 0 ? (
                         <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center"><p className="text-slate-400 mb-4">No confirmed gigs yet.</p><Link href="/jobs" className="inline-block bg-black text-white px-6 py-2 rounded-xl font-bold">Find Work</Link></div>
                       ) : (
                         <div className="grid gap-4 md:grid-cols-2">
                           {bookedJobs.map(app => (
                             <div key={app.id} className="bg-white p-6 rounded-2xl border border-l-4 border-l-green-500 shadow-sm">
                               <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Confirmed</span>
                                <span className="font-black text-lg text-slate-900">${app.jobs?.rate}</span>
                               </div>
                               <h3 className="font-bold text-xl text-primary">{app.jobs?.events?.title}</h3>
                               <p className="text-slate-500 text-sm font-bold mb-4">{app.jobs?.title}</p>
                               <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <Link href={`/jobs/${app.jobs?.id}`} className="text-secondary font-bold text-sm hover:underline">View Details</Link>
                                <button onClick={() => handleOpenChat(app.jobs.id, app.id, app.jobs.organizer_id, app.jobs.events?.title)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">💬 Message Organizer</button>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </section>
                    
                    {/* PAST JOBS */}
                    <section>
                        <h2 className="text-xl font-black text-primary mb-4">✅ Job History</h2>
                        {pastJobs.length === 0 ? (
                            <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-slate-400">No completed jobs yet.</div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {pastJobs.map(app => (
                                    <div key={app.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold bg-green-200 text-green-800 px-2 py-1 rounded uppercase">Paid</span>
                                            <span className="font-bold text-slate-500">${app.jobs?.rate}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900">{app.jobs?.title}</h4>
                                        <p className="text-xs text-slate-500 mb-3">{app.jobs?.events?.title}</p>
                                        
                                        {app.jobs?.reviews && app.jobs.reviews.length > 0 ? (
                                             <div className="text-xs font-bold text-yellow-600">⭐ You rated this organizer</div>
                                        ) : (
                                            <button onClick={() => openReviewModal(app.jobs)} className="w-full py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100">⭐ Rate Organizer</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* PENDING APPLICATIONS */}
                    <section>
                       <h2 className="text-xl font-black text-primary mb-4 flex items-center gap-2">⏳ Pending Applications <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{pendingJobs.length}</span></h2>
                       {pendingJobs.length === 0 ? (
                           <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center"><p className="text-slate-400">No pending applications.</p></div>
                       ) : (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {pendingJobs.map(app => (
                            <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200">
                              <div className="flex justify-between mb-2">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">Under Review</span>
                                <span className="font-bold text-slate-700">${app.jobs?.rate}</span>
                              </div>
                              <h4 className="font-bold text-slate-900">{app.jobs?.title}</h4>
                              <p className="text-xs text-slate-500 mb-1">{app.jobs?.events?.title}</p>
                              <Link href={`/jobs/${app.jobs?.id}`} className="text-xs text-primary font-bold hover:underline">View Status &rarr;</Link>
                            </div>
                          ))}
                         </div>
                       )}
                    </section>
                 </div>
             )}
          </div>
        )}

        {/* ORGANIZER DASHBOARD */}
        {profile?.role?.toLowerCase() === 'organizer' && (
          <div className="space-y-8">
             {activeTab === 'reports' ? (
                <div className="space-y-6"><h2 className="text-xl font-black text-slate-900">Event Budget Analysis</h2>{events.map(event => (<div key={event.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{event.title}</h3><span className={`text-xs font-bold px-2 py-1 rounded ${event.remaining_budget < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{event.remaining_budget < 0 ? 'OVER BUDGET' : 'On Track'}</span></div><div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2"><div className={`h-full ${event.remaining_budget < 0 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((event.committed_spend / (event.budget || 1)) * 100, 100)}%` }}></div></div><div className="flex justify-between text-xs font-bold text-slate-500"><span>Spent: ${event.committed_spend}</span><span>Budget: ${event.budget}</span></div></div>))}</div>
             ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Event Manager</h2>
                      <p className="text-gray-500">Manage your events and hiring budget.</p>
                    </div>
                    <button onClick={handleCreateEventClick} className="bg-black text-white px-6 py-2 rounded-lg font-bold">{isCreating ? 'Cancel' : '+ Add Event'}</button>
                  </div>
                  
                  {isCreating && (<div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8"><h2 className="text-xl font-bold mb-4">1. Create New Event Container</h2><form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" placeholder="Event Name" className="p-3 border rounded-lg" value={title} onChange={e => setTitle(e.target.value)} required /><input type="text" placeholder="Location" className="p-3 border rounded-lg" value={location} onChange={e => setLocation(e.target.value)} required /><div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Event Date</label><input type="date" className="p-3 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} required /></div><div className="flex flex-col"><label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1">Visibility</label><select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="p-3 border rounded-lg bg-white font-bold"><option value="public">🌍 Public</option><option value="private">🔒 Private</option></select></div><input type="number" placeholder="Total Labor Budget" className="md:col-span-2 p-3 border rounded-lg" value={budget} onChange={e => setBudget(e.target.value)} required /><button type="submit" className="md:col-span-2 bg-secondary text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition-colors">Create Event & Start Staffing →</button></form></div>)}
                  
                  <div className="grid gap-6">
                    {events.map(event => (
                      <div key={event.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 group relative">
                        <div onClick={() => router.push(`/dashboard/event/${event.id}`)} className="cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{event.title} &rarr;</h3>
                              <p className="text-sm text-gray-500 mt-1">📍 {event.location} • 📅 {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-green-700">${event.budget}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* THE NEW DUPLICATE AND DELETE BUTTONS */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicateEvent(event.id); }} 
                            className="bg-slate-100 text-slate-600 hover:bg-secondary hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            📋 Duplicate
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} 
                            className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             )}
          </div>
        )}

      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"><h3 className="text-2xl font-black text-primary mb-2">Rate Organizer</h3><div className="flex justify-center gap-2 mb-6">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRating(star)} className={`text-4xl ${rating >= star ? 'text-yellow-400' : 'text-slate-200'}`}>★</button>))}</div><textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl h-32 mb-6" /><div className="flex gap-4"><button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button><button onClick={submitReview} className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg">Submit Review</button></div></div></div>
      )}
      {showTerms && profile && (<TermsModal userId={profile.id} onClose={() => setShowTerms(false)} onAccept={() => { setProfile({ ...profile, accepted_tos_at: new Date().toISOString() }); setShowTerms(false); setIsCreating(true); }} />)}
      {activeChat && (<ChatWindow conversationId={activeChat.id} currentUserId={profile?.id} otherUserName={activeChat.name} onClose={() => setActiveChat(null)} />)}
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
