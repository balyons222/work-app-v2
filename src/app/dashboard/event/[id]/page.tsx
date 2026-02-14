'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import InviteTalentModal from '@/src/components/InviteTalentModal' 
import ChatWindow from '@/src/components/ChatWindow' 

// 🛠️ SHARED ROLES
const ROLE_CATEGORIES = {
  "Operations": ["General Event Support", "Site Lead", "Site Manager", "Finish Line Lead", "Start Line Lead", "Course Lead", "Vendor Manager", "Project Manager", "Equipment Operator", "Forklift Operator", "Truck Driver (nonCDL)", "Truck Driver (CDL)", "Electrician/Power", "Volunteer Coordinator", "Expo Lead", "Expo Support", "Warehouse Coordinator"],
  "Technology": ["Timer (Mylaps)", "Timer (Chronotrack)", "Timer (Race Result)", "Registration Support (Run Signup)", "Registration Support (Race Roster)", "Registration Support (Haku)", "Sound/Audio"],
  "Marketing/PR/Communications": ["Race Announcer", "Public Relations", "Communications Lead", "Marketing Support", "Content Creator", "Social Media Influencer Coordinator", "Social Media Influencer", "Photographer - Content", "Photographer - Individual Runner", "Community Outreach"]
}

export default function EventManagerPage() {
  const [event, setEvent] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // EVENT DETAILS STATE
  const [isEditingEvent, setIsEditingEvent] = useState(false)
  const [eventFormData, setEventFormData] = useState({
    title: '', location: '', event_date: '', budget: '', 
    description: '', website: '', poc_name: '', poc_phone: '', visibility: 'public'
  })
  
  // MODAL STATES
  const [inviteModalData, setInviteModalData] = useState<{ open: boolean, jobId?: string, jobTitle?: string }>({ open: false })
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)

  // JOB FORM STATE
  const [selectedRole, setSelectedRole] = useState('')
  const [rate, setRate] = useState('')
  const [rateType, setRateType] = useState('flat')
  const [estimatedHours, setEstimatedHours] = useState('') 
  const [jobDescription, setJobDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // REVIEW STATE
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<any>(null) 
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  // ✅ CHAT STATE
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null)

  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string

  useEffect(() => {
    loadEventData()
  }, [eventId])

  async function loadEventData() {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError) {
      toast.error('Event not found')
      router.push('/dashboard')
      return
    }
    setEvent(eventData)
    
    setEventFormData({
      title: eventData.title || '',
      location: eventData.location || '',
      event_date: eventData.event_date || '',
      budget: eventData.budget || '',
      description: eventData.description || '',
      website: eventData.website || '',
      poc_name: eventData.poc_name || '',
      poc_phone: eventData.poc_phone || '',
      visibility: eventData.visibility || 'public'
    })

    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id, status, applicant_id, payment_status, payment_method,
          profiles ( full_name, avatar_url, role )
        ),
        reviews (id, reviewee_id, rating) 
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setJobs(jobsData || [])
    setLoading(false)
  }

  // ✅ CHAT HANDLER
const handleOpenChat = async (jobId: string, applicationId: string, workerId: string, workerName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existingChat } = await supabase
      .from('conversations')
      .select('id')
      .eq('application_id', applicationId) // ✅ Match by unique Application ID
      .maybeSingle()

    if (existingChat) {
      setActiveChat({ id: existingChat.id, name: workerName })
    } else {
      const { data: newChat, error } = await supabase
        .from('conversations')
        .insert({
          job_id: jobId,
          application_id: applicationId,
          organizer_id: user.id,
          worker_id: workerId
        })
        .select()
        .single()

      if (error) {
         if (error.code === '23505') { 
           const { data: retryChat } = await supabase.from('conversations').select('id').eq('application_id', applicationId).single()
           if (retryChat) setActiveChat({ id: retryChat.id, name: workerName })
         } else {
           toast.error('Failed to start chat')
         }
      } else {
        setActiveChat({ id: newChat.id, name: workerName })
      }
    }
  }
  // --- EVENT EDITING ---
  const handleEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEventFormData({ ...eventFormData, [e.target.name]: e.target.value })
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('events')
      .update({
        title: eventFormData.title,
        location: eventFormData.location,
        event_date: eventFormData.event_date,
        budget: parseFloat(eventFormData.budget),
        description: eventFormData.description,
        website: eventFormData.website,
        poc_name: eventFormData.poc_name,
        poc_phone: eventFormData.poc_phone,
        visibility: eventFormData.visibility
      })
      .eq('id', eventId)

    if (error) {
      toast.error("Failed to update event")
    } else {
      toast.success("Event updated!")
      setIsEditingEvent(false)
      loadEventData()
    }
  }

  // --- JOB MANAGEMENT ---
  const handleEditClick = (job: any) => {
    setEditingJobId(job.id)
    setSelectedRole(job.title)
    setRate(job.rate.toString())
    setJobDescription(job.description || '')
    setStartDate(job.start_date)
    setEndDate(job.end_date)
    setRateType(job.rate_type || 'flat')
    setEstimatedHours(job.estimated_hours ? job.estimated_hours.toString() : '')
    setShowJobForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingJobId(null); setSelectedRole(''); setRate(''); setJobDescription('');
    setStartDate(''); setEndDate(''); setRateType('flat'); setEstimatedHours('');
    setShowJobForm(false)
  }

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return toast.error('Please select a role')
    const { data: { user } } = await supabase.auth.getUser()
    const jobData = {
      event_id: eventId,
      organizer_id: user?.id,
      title: selectedRole,
      rate: parseFloat(rate),
      description: jobDescription,
      start_date: startDate,
      end_date: endDate,
      status: 'open',
      rate_type: rateType,
      estimated_hours: rateType === 'hourly' ? parseFloat(estimatedHours) : 0
    }
    let error;
    if (editingJobId) {
      const { error: updateError } = await supabase.from('jobs').update(jobData).eq('id', editingJobId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('jobs').insert(jobData)
      error = insertError
    }
    if (error) toast.error(error.message)
    else {
      toast.success(editingJobId ? 'Job Updated!' : 'Job Added!')
      resetForm()
      loadEventData() 
    }
  }

  const handleAppStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId)
    if (!error) {
      toast.success(`Applicant ${newStatus}`)
      if (newStatus === 'approved') {
        const { data: rawData } = await supabase.from('applications').select('applicant_id, jobs(title, events(title))').eq('id', appId).single()
        if (rawData) {
          const appData = rawData as any
          await sendNotification({
            userId: appData.applicant_id,
            title: "You're Hired! 🎉",
            message: `You have been booked for ${appData.jobs?.title} at ${appData.jobs?.events?.title}.`,
            link: "/dashboard",
            type: "success"
          })
        }
      }
      loadEventData() 
    } else toast.error('Update failed')
  }

  const handleMarkPaid = async (appId: string) => {
    const method = prompt('How did you pay them? (e.g. Venmo, Check #123, Cash)')
    if (!method) return
    const { error } = await supabase.from('applications').update({ payment_status: 'paid', payment_method: method }).eq('id', appId)
    if (!error) { toast.success('Marked as Paid'); loadEventData(); }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (!error) { toast.success('Job removed'); loadEventData(); }
  }

  // --- REVIEWS ---
  const openReviewModal = (app: any, job: any) => {
    setReviewTarget({ appId: app.id, userId: app.applicant_id, name: app.profiles?.full_name, jobId: job.id })
    setRating(5); setComment(''); setReviewModalOpen(true)
  }

  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: reviewTarget.userId, job_id: reviewTarget.jobId, rating, comment })
    if (error) toast.error(error.message)
    else {
      toast.success('Review Submitted!')
      await sendNotification({ userId: reviewTarget.userId, title: "New Review! ⭐", message: `New review received!`, link: `/profile/${reviewTarget.userId}`, type: "success" })
      setReviewModalOpen(false); loadEventData()
    }
  }

  if (loading) return <div className="p-20 text-center">Loading Event...</div>

  const totalBudget = event?.budget || 0
  const allocatedBudget = jobs.reduce((sum, job) => sum + (job.rate_type === 'hourly' ? (job.rate * (job.estimated_hours || 0)) : job.rate), 0)
  const remainingBudget = totalBudget - allocatedBudget
  const percentUsed = Math.min((allocatedBudget / (totalBudget || 1)) * 100, 100)

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* EVENT SUMMARY */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8">
          {!isEditingEvent ? (
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-full">Event Container</span>
                  <button onClick={() => setIsEditingEvent(true)} className="text-slate-400 hover:text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1">✎ Edit Details</button>
                </div>
                <h1 className="text-4xl font-black text-primary mb-2">{event.title}</h1>
                <p className="text-lg text-slate-600 mb-4">{event.description}</p>
                <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500 items-center">
                  <span>📍 {event.location}</span>
                  <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
                  {event.visibility === 'private' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs uppercase tracking-wider">🔒 Private Event</span>}
                </div>
              </div>
              <div className="w-full md:w-80 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Labor Budget</p>
                     <p className="text-3xl font-black text-slate-900">${totalBudget.toLocaleString()}</p>
                   </div>
                   <button onClick={() => setInviteModalData({ open: true })} className="bg-black text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2 shadow-md">✉️ Invite</button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500"><span>Allocated</span><span>${allocatedBudget.toLocaleString()}</span></div>
                  <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                    <div className={`h-full transition-all duration-500 ${remainingBudget < 0 ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${percentUsed}%` }} />
                  </div>
                  <div className={`flex justify-between text-xs font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}><span>Remaining</span><span>${remainingBudget.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateEvent} className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <h2 className="text-xl font-black text-slate-900">Edit Event</h2>
                <button type="button" onClick={() => setIsEditingEvent(false)} className="text-sm font-bold text-slate-400">Cancel</button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <input name="title" value={eventFormData.title} onChange={handleEventChange} placeholder="Title" className="p-2 border rounded-lg font-bold" />
                <input name="location" value={eventFormData.location} onChange={handleEventChange} placeholder="Location" className="p-2 border rounded-lg" />
                <input type="date" name="event_date" value={eventFormData.event_date} onChange={handleEventChange} className="p-2 border rounded-lg" />
                <input type="number" name="budget" value={eventFormData.budget} onChange={handleEventChange} placeholder="Budget" className="p-2 border rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-xl">Save Changes</button>
            </form>
          )}
        </div>

        {/* STAFFING SECTION */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-primary">Staffing & Applicants</h2>
          <button onClick={() => showJobForm ? resetForm() : setShowJobForm(true)} className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg">
            {showJobForm ? 'Cancel' : '+ Add Role'}
          </button>
        </div>

        {showJobForm && (
          <div className="bg-white p-8 rounded-2xl border mb-8">
            <form onSubmit={handleSaveJob} className="space-y-6">
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl" required>
                <option value="">Select a Role...</option>
                {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
                  <optgroup key={cat} label={cat}>{roles.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>
                ))}
              </select>
              <div className="flex gap-4">
                <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-1/2 p-3 border rounded-xl">
                  <option value="flat">Flat Rate</option>
                  <option value="hourly">Hourly</option>
                </select>
                <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate" className="w-1/2 p-3 border rounded-xl" required />
              </div>
              <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl">Save Role</button>
            </form>
          </div>
        )}

        {/* APPLICANT CARDS */}
        <div className="space-y-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-2xl border shadow-sm">
              <div className="p-6 bg-slate-50/50 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-primary">{job.title}</h3>
                  <p className="text-sm font-bold text-slate-500">${job.rate} {job.rate_type}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setInviteModalData({ open: true, jobId: job.id, jobTitle: job.title })} className="text-xs font-bold uppercase text-slate-400 hover:text-secondary">✉️ Invite</button>
                  <button onClick={() => handleDeleteJob(job.id)} className="text-xs font-bold uppercase text-slate-400 hover:text-red-600">Delete</button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {job.applications?.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden">
                        {app.profiles?.avatar_url && <img src={app.profiles.avatar_url} className="object-cover h-full w-full" />}
                      </div>
                      <div>
                        <Link href={`/profile/${app.applicant_id}`} className="font-bold hover:underline">{app.profiles?.full_name}</Link>
                        <p className="text-xs text-slate-400 uppercase font-bold">{app.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenChat(job.id, app.id, app.applicant_id, app.profiles?.full_name)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">💬 Chat</button>
                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => handleAppStatus(app.id, 'rejected')} className="px-3 py-1 text-xs font-bold text-red-500 bg-red-50 rounded-lg">Decline</button>
                          <button onClick={() => handleAppStatus(app.id, 'approved')} className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-lg">Hire</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-black mb-4">Review {reviewTarget?.name}</h3>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl h-32 mb-6" />
            <button onClick={submitReview} className="w-full bg-secondary text-white font-bold py-3 rounded-xl">Submit</button>
          </div>
        </div>
      )}

      {inviteModalData.open && (
        <InviteTalentModal eventId={eventId} jobId={inviteModalData.jobId} jobTitle={inviteModalData.jobTitle} onClose={() => setInviteModalData({ open: false })} />
      )}

      {/* ✅ 5. CORRECTED CHAT WINDOW LOGIC */}
      {activeChat && event && (
        <ChatWindow 
          conversationId={activeChat.id}
          currentUserId={event.organizer_id} 
          otherUserName={activeChat.name}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  )
}
