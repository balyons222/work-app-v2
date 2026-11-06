'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import InviteTalentModal from '@/src/components/InviteTalentModal' 
import ChatWindow from '@/src/components/ChatWindow' 

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

  // CHAT STATE
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null)

  const supabase = createClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = params?.id as string

  useEffect(() => {
    loadEventData()
    
    // Check if returning from a successful Stripe Escrow payment
    if (searchParams.get('funded') === 'true') {
      toast.success('Payment received! Escrow funds are securely held.', { duration: 5000 })
    } else if (searchParams.get('funded') === 'cancelled') {
      toast.error('Escrow checkout was cancelled.')
    }
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

    // Added funding_status to the applications select query
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id, status, applicant_id, payment_status, payment_method, funding_status,
          profiles ( full_name, avatar_url, role )
        ),
        reviews (id, reviewee_id, rating) 
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setJobs(jobsData || [])
    setLoading(false)
  }

  const handleOpenChat = async (jobId: string, applicationId: string, workerId: string, workerName: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existingChat } = await supabase
      .from('conversations')
      .select('id')
      .eq('application_id', applicationId)
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

  const handleHireAndFund = async (appId: string) => {
    const toastId = toast.loading('Redirecting to Stripe checkout...')
    try {
      const res = await fetch('/api/stripe/fund-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start funding session')

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleEditClick = (job: any) => {
    setEditingJobId(job.id)
    setSelectedRole(job.title)
    setRate(job.rate.toString())
    setJobDescription(job.description || '')
    setStartDate(job.start_date || '')
    setEndDate(job.end_date || '')
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
      loadEventData() 
    } else {
      toast.error('Update failed')
    }
  }

  // Safety confirmation + Escrow Release
  const handleReleaseEscrow = async (appId: string) => {
    const confirmed = window.confirm(
      'Are you sure the contractor has completed this gig?\n\nThis will instantly transfer funds from escrow directly into their connected bank account.'
    )
    if (!confirmed) return

    const toastId = toast.loading('Releasing escrow funds via Stripe...')
    try {
      const res = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      toast.success('Funds successfully released to contractor!', { id: toastId })
      loadEventData()
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (!error) { toast.success('Job removed'); loadEventData(); }
  }

  const openReviewModal = (app: any, job: any) => {
    setReviewTarget({ appId: app.id, userId: app.applicant_id, name: app.profiles?.full_name, jobId: job.id })
    setRating(5); setComment(''); setReviewModalOpen(true)
  }

  const submitReview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: reviewTarget.userId, job_id: reviewTarget.jobId, rating, comment })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Review Submitted!')
      await sendNotification({ userId: reviewTarget.userId, title: "New Review! ⭐", message: `New review received!`, link: `/profile/${reviewTarget.userId}`, type: "success" })
      setReviewModalOpen(false); loadEventData()
    }
  }

  if (loading) return <div className="p-20 text-center font-bold text-slate-400">Loading Event...</div>

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
          <div className="bg-white p-8 rounded-2xl border mb-8 shadow-lg animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold mb-4">{editingJobId ? 'Edit Role' : 'Create New Role'}</h3>
            <form onSubmit={handleSaveJob} className="space-y-6">
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl" required>
                <option value="">Select a Role...</option>
                {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
                  <optgroup key={cat} label={cat}>{roles.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>
                ))}
              </select>
              
              <textarea 
                value={jobDescription} 
                onChange={(e) => setJobDescription(e.target.value)} 
                placeholder="Job Description & Requirements" 
                className="w-full p-3 bg-slate-50 border rounded-xl h-24" 
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-3 bg-slate-50 border rounded-xl" required />
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-3 bg-slate-50 border rounded-xl" required />
                </div>
              </div>

              <div className="flex gap-4 items-end">
                <div className="w-1/3">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1">Pay Type</label>
                    <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full p-3 border rounded-xl">
                      <option value="flat">Flat Rate</option>
                      <option value="hourly">Hourly</option>
                    </select>
                </div>
                <div className="w-1/3">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1">Rate ($)</label>
                    <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" className="w-full p-3 border rounded-xl" required />
                </div>
                {rateType === 'hourly' && (
                    <div className="w-1/3 animate-in fade-in">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1">Est. Hours</label>
                        <input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="8" className="w-full p-3 border rounded-xl" required />
                    </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={resetForm} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                  <button type="submit" className="bg-secondary text-white font-bold px-8 py-3 rounded-xl hover:bg-teal-600 transition-colors shadow-md">
                      {editingJobId ? 'Update Role' : 'Save Role'}
                  </button>
              </div>
            </form>
          </div>
        )}

        {/* APPLICANT CARDS */}
        <div className="space-y-6">
          {jobs.map(job => {
            const laborCost = job.rate_type === 'hourly' ? (job.rate * (job.estimated_hours || 0)) : job.rate
            const platformFee = laborCost * 0.10
            const totalToFund = laborCost + platformFee

            return (
                <div key={job.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-black text-primary">{job.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                          <span className="font-bold bg-white border px-2 py-0.5 rounded">
                            {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'TBD'} 
                            {job.end_date && job.end_date !== job.start_date ? ` - ${new Date(job.end_date).toLocaleDateString()}` : ''}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="font-bold text-green-600">
                            ${job.rate}/{job.rate_type === 'hourly' ? 'hr' : 'flat'}
                            {job.rate_type === 'hourly' && <span className="text-slate-400 font-normal text-xs ml-1">(Est. Total: ${laborCost})</span>}
                          </span>
                      </div>
                      {job.description && <p className="text-xs text-slate-500 mt-2 max-w-xl">{job.description}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleEditClick(job)} className="text-xs font-bold uppercase text-slate-400 hover:text-primary">✎ Edit</button>
                      <button onClick={() => setInviteModalData({ open: true, jobId: job.id, jobTitle: job.title })} className="text-xs font-bold uppercase text-slate-400 hover:text-secondary">✉️ Invite</button>
                      <button onClick={() => handleDeleteJob(job.id)} className="text-xs font-bold uppercase text-slate-400 hover:text-red-600">Delete</button>
                    </div>
                  </div>
                  
                  {/* Applications List */}
                  <div className="p-6 space-y-3 bg-white">
                    {job.applications?.length === 0 ? (
                        <p className="text-center text-sm text-slate-300 italic py-2">No applicants yet.</p>
                    ) : (
                        job.applications?.map((app: any) => (
                          <div key={app.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden shrink-0">
                                {app.profiles?.avatar_url && <img src={app.profiles.avatar_url} className="object-cover h-full w-full" />}
                              </div>
                              <div>
                                <Link href={`/profile/${app.applicant_id}`} className="font-bold hover:underline text-primary">{app.profiles?.full_name}</Link>
                                <p className={`text-xs uppercase font-bold ${
                                    app.status === 'approved' ? 'text-green-600' : 
                                    app.status === 'rejected' ? 'text-red-400' : 'text-slate-400'
                                }`}>{app.status}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button onClick={() => handleOpenChat(job.id, app.id, app.applicant_id, app.profiles?.full_name)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                                💬 Chat
                              </button>
                              
                              {/* 1. Pending: Offer Hire & Fund with Price Breakdown */}
                              {app.status === 'pending' && (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleAppStatus(app.id, 'rejected')} 
                                    className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    Decline
                                  </button>
                                  <button 
                                    onClick={() => handleHireAndFund(app.id)} 
                                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    title={`Labor: $${laborCost} + 10% Fee: $${platformFee}`}
                                  >
                                    Hire & Fund Escrow (${totalToFund.toFixed(2)})
                                  </button>
                                </div>
                              )}
                              
                              {/* 2. Approved & Escrow Funded: Show Locked Badge & Release Button */}
                              {app.status === 'approved' && app.funding_status === 'funded' && app.payment_status !== 'paid' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                    🔒 In Escrow
                                  </span>
                                  <button 
                                    onClick={() => handleReleaseEscrow(app.id)} 
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                  >
                                    Release Payout
                                  </button>
                                </div>
                              )}

                              {/* 3. Approved but Unfunded Edge Case */}
                              {app.status === 'approved' && app.funding_status !== 'funded' && app.payment_status !== 'paid' && (
                                <button 
                                  onClick={() => handleHireAndFund(app.id)} 
                                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                                >
                                  ⚠️ Fund Escrow (${totalToFund.toFixed(2)})
                                </button>
                              )}
                              
                              {/* 4. Complete & Paid */}
                              {app.payment_status === 'paid' && (
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg border border-slate-200">
                                    ✓ Paid
                                  </span>
                                  <button onClick={() => openReviewModal(app, job)} className="px-3 py-1.5 text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100">
                                    Rate
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
            )
          })}
        </div>
      </div>

      {/* MODALS */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-black mb-4">Review {reviewTarget?.name}</h3>
            <div className="flex gap-2 mb-4">
                {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setRating(star)} className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-slate-200'}`}>★</button>
                ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl h-32 mb-6" placeholder="Leave a comment..." />
            <div className="flex gap-3">
                <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400">Cancel</button>
                <button onClick={submitReview} className="flex-1 bg-secondary text-white font-bold py-3 rounded-xl">Submit</button>
            </div>
          </div>
        </div>
      )}

      {inviteModalData.open && (
        <InviteTalentModal eventId={eventId} jobId={inviteModalData.jobId} jobTitle={inviteModalData.jobTitle} onClose={() => setInviteModalData({ open: false })} />
      )}

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