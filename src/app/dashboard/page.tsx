'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import TermsModal from '@/src/components/TermsModal'
import ChatWindow from '@/src/components/ChatWindow'

function DashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [myApps, setMyApps] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  
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
      if (profileData?.role?.toLowerCase() === 'contractor') {
        
        // ✅ FIXED QUERY: Fetch Event details THROUGH the Job relation
        const { data: invitesData } = await supabase
          .from('event_invitations')
          .select(`
            id, status, 
            jobs (
                id,
                title,
                events (
                    id, title, location, event_date, organizer_id,
                    profiles:organizer_id (full_name)
                )
            )
          `)
          .eq('invitee_id', user.id)
          .eq('status', 'pending')
        
        setInvites(invitesData || [])
        
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

  const handleOpenChat = async (jobId: string, applicationId: string, otherUserId: string, otherName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existingChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).maybeSingle()

    if (existingChat) {
      setActiveChat({ id: existingChat.id, name: otherName });
      setUnreadCount(0);
    } else {
      const { data: newChat, error } = await supabase.from('conversations').insert({
          job_id: jobId,
          application_id: applicationId,
          organizer_id: otherUserId,
          worker_id: user.id
        }).select().single()

      if (error && error.code === '23505') {
           const { data: retryChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).single()
           if (retryChat) setActiveChat({ id: retryChat.id, name: otherName })
      } else if (!error) {
        setActiveChat({ id: newChat.id, name: otherName })
        setUnreadCount(0);
      }
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
      visibility: visibility 
    })

    if (error) toast.error('Failed to create event')
    else {
      toast.success('Event created!')
      setIsCreating(false)
      setTitle(''); setLocation(''); setDate(''); setBudget(''); setWebsite(''); setDescription(''); setPocName(''); setPocPhone(''); setVisibility('public');
      loadDashboardData()
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure?")) return
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (!error) {
      toast.success("Event deleted")
      loadDashboardData() 
    }
  }

  const handleInviteResponse = async (inviteId: string, response: 'accepted' | 'declined', eventId: string) => {
    // 1. Update the invitation status
    const { error } = await supabase.from('event_invitations').update({ status: response }).eq('id', inviteId)
    
    if (!error) {
      if (response === 'accepted') {
        toast.success("Invite Accepted!")
        // 2. Redirect to the Event page (or Job page if preferred)
        router.push(`/events/${eventId}`) 
      } else {
        toast.success("Invite Declined")
        setInvites(current => current.filter(i => i.id !== inviteId))
      }
    } else {
        toast.error("Error updating invite")
    }
  }

  const openReviewModal = (job: any) => {
    setReviewTarget({ jobId: job.id, organizerId: job.organizer_id, eventName: job.events?.title })
    setRating(5); setComment(''); setReviewModalOpen(true)
  }

  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: reviewTarget.organizerId, job_id: reviewTarget.jobId, rating, comment })
    if (!error) {
      toast.success('Review Submitted!')
      await sendNotification({ userId: reviewTarget.organizerId, title: "New Review! ⭐", message: `A worker left you a review.`, link: `/dashboard`, type: "success" })
      setReviewModalOpen(false); loadDashboardData()
    }
  }

  const bookedJobs = myApps.filter(a => a.status === 'approved' && a.payment_status !== 'paid')
  const pendingJobs = myApps.filter(a => a.status === 'pending')
  const pastJobs = myApps.filter(a => a.payment_status === 'paid')
  const totalEarnings = pastJobs.reduce((sum, app) => sum + (app.jobs?.rate || 0), 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* TABS NAVIGATION */}
        <div className="flex gap-6 border-b border-slate-200 mb-8">
          <button 
            onClick={() => { setActiveTab('overview'); setUnreadCount(0); }}
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 ${
              activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-400'
            }`}
          >
            Overview
            {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">{unreadCount}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`pb-4 text-sm font-bold border-b-2 ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>Reports & Analytics</button>
        </div>

        {/* PROFILE HEADER */}
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

        {/* CONTRACTOR DASHBOARD */}
        {profile?.role?.toLowerCase() === 'contractor' && (
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
                     <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase">Avg. Rate / Job</p>
                        <p className="text-3xl font-black text-slate-900">${pastJobs.length > 0 ? (totalEarnings / pastJobs.length).toFixed(0) : 0}</p>
                     </div>
                   </div>
                 </div>
             ) : (
                 <div className="space-y-10">
                    
                    {/* ✅ INVITES SECTION (Fixed Logic) */}
                    {invites.length > 0 && (
                      <section>
                        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                           <div className="relative z-10">
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">🎟️ You're Invited! <span className="bg-white/20 text-xs px-2 py-1 rounded-full">{invites.length}</span></h2>
                             <div className="grid gap-4 md:grid-cols-2">
                              {invites.map(invite => {
                                // Fallback logic: Ensure we can read data even if structure varies
                                const eventTitle = invite.jobs?.events?.title || invite.jobs?.title || 'Event Invitation'
                                const organizerName = invite.jobs?.events?.profiles?.full_name || 'FXD Organizer'
                                const eventLocation = invite.jobs?.events?.location || 'TBD'
                                const eventDate = invite.jobs?.events?.event_date 
                                const eventId = invite.jobs?.events?.id

                                return (
                                <div key={invite.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex justify-between items-center">
                                  <div>
                                    <h3 className="font-bold text-lg text-white">{eventTitle}</h3>
                                    <p className="text-xs text-indigo-200 font-bold uppercase mb-1">Hosted by: {organizerName}</p>
                                    <p className="text-sm text-indigo-200">📍 {eventLocation} • 📅 {eventDate ? new Date(eventDate).toLocaleDateString() : 'Date TBD'}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleInviteResponse(invite.id, 'declined', eventId)} className="px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 rounded-lg">Decline</button>
                                    <button onClick={() => handleInviteResponse(invite.id, 'accepted', eventId)} className="px-4 py-2 text-xs font-bold bg-white text-indigo-900 rounded-lg">View & Apply</button>
                                  </div>
                                </div>
                                )
                              })}
                             </div>
                           </div>
                        </div>
                      </section>
                    )}

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
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Org: {app.jobs?.profiles?.full_name || 'FXD Organizer'}</p>
                               <p className="text-slate-500 text-sm font-bold mb-4">{app.jobs?.title}</p>
                               <div className="space-y-1 text-sm text-slate-600">
                                <p>📍 {app.jobs?.events?.location}</p>
                                <p>🗓️ {app.jobs?.start_date} → {app.jobs?.end_date}</p>
                               </div>
                               <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <Link href={`/jobs/${app.jobs?.id}`} className="text-secondary font-bold text-sm hover:underline">View Details</Link>
                                <button onClick={() => handleOpenChat(app.jobs.id, app.id, app.jobs.organizer_id, app.jobs.events?.title)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">💬 Message Organizer</button>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </section>

                    <section>
                       <h2 className="text-xl font-black text-primary mb-4 flex items-center gap-2">⏳ Pending Applications <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{pendingJobs.length}</span></h2>
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingJobs.map(app => (
                          <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200">
                            <div className="flex justify-between mb-2">
                              <span className="text-[10px] font-
