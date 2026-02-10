'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'

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
  
  // ✅ FORM STATE
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)

  const [selectedRole, setSelectedRole] = useState('')
  const [rate, setRate] = useState('')
  const [rateType, setRateType] = useState('flat')
  const [estimatedHours, setEstimatedHours] = useState('') 

  const [jobDescription, setJobDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ✅ REVIEW STATE
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<any>(null) 
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

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

    // ✅ UPDATED QUERY: Fetch 'reviews' so we can check if they exist
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

  // ✅ PREPARE FORM FOR EDITING
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
    setEditingJobId(null)
    setSelectedRole('')
    setRate('')
    setJobDescription('')
    setStartDate('')
    setEndDate('')
    setRateType('flat')
    setEstimatedHours('')
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

    if (error) {
      toast.error(error.message)
    } else {
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
        const { data: rawData } = await supabase
          .from('applications')
          .select('applicant_id, jobs(title, events(title))')
          .eq('id', appId)
          .single()

        const appData = rawData as any

        if (appData) {
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
    } else {
      toast.error('Update failed')
    }
  }

  const handleMarkPaid = async (appId: string) => {
    const method = prompt('How did you pay them? (e.g. Venmo, Check #123, Cash)')
    if (!method) return
    const { error } = await supabase.from('applications').update({ payment_status: 'paid', payment_method: method }).eq('id', appId)
    if (!error) {
      toast.success('Marked as Paid')
      loadEventData()
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure? This will delete the job and all applications.')) return
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (!error) {
      toast.success('Job removed')
      loadEventData()
    }
  }

  // ✅ REVIEW LOGIC HANDLERS
  const openReviewModal = (app: any, job: any) => {
    setReviewTarget({
      appId: app.id,
      userId: app.applicant_id,
      name: app.profiles?.full_name,
      jobId: job.id
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
      reviewee_id: reviewTarget.userId,
      job_id: reviewTarget.jobId,
      rating: rating,
      comment: comment
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Review Submitted!')
      
      await sendNotification({
        userId: reviewTarget.userId,
        title: "New Review! ⭐",
        message: `You received a ${rating}-star review from your last event. Check your profile!`,
        link: `/profile/${reviewTarget.userId}`,
        type: "success"
      })

      setReviewModalOpen(false)
      loadEventData()
    }
  }

  if (loading) return <div className="p-20 text-center">Loading Event...</div>

  // SMART BUDGET CALCULATION
  const totalBudget = event?.budget || 0
  const allocatedBudget = jobs.reduce((sum, job) => {
    const jobCost = job.rate_type === 'hourly' ? (job.rate * (job.estimated_hours || 0)) : job.rate
    return sum + (jobCost || 0)
  }, 0)
  
  const remainingBudget = totalBudget - allocatedBudget
  const percentUsed = Math.min((allocatedBudget / totalBudget) * 100, 100)

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* 1. EVENT SUMMARY */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-full mb-3">Event Container</span>
              <h1 className="text-4xl font-black text-primary mb-2">{event.title}</h1>
              <p className="text-lg text-slate-600 mb-4">{event.description}</p>
              <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-500">
                <span>📍 {event.location}</span>
                <span>📅 {new Date(event.event_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="w-full md:w-80 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Labor Budget</p>
              <p className="text-3xl font-black text-slate-900 mb-4">${totalBudget.toLocaleString()}</p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500"><span>Allocated (Est.)</span><span>${allocatedBudget.toLocaleString()}</span></div>
                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full transition-all duration-500 ${remainingBudget < 0 ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${percentUsed}%` }} />
                </div>
                <div className={`flex justify-between text-xs font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}><span>Remaining</span><span>${remainingBudget.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. JOB MANAGER HEADER */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-primary">Staffing & Applicants</h2>
          <button 
            onClick={() => showJobForm ? resetForm() : setShowJobForm(true)} 
            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            {showJobForm ? 'Cancel' : '+ Add Role'}
          </button>
        </div>

        {/* ADD/EDIT JOB FORM */}
        {showJobForm && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold mb-6">
              {editingJobId ? 'Edit Job Role' : 'Create Job Role'}
            </h3>
            <form onSubmit={handleSaveJob} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role Needed</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary" required>
                    <option value="">Select a Role...</option>
                    {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                      <optgroup key={category} label={category}>{roles.map(role => <option key={role} value={role}>{role}</option>)}</optgroup>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-4">
                   <div className="w-1/2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pay Type</label>
                      <select 
                        value={rateType} 
                        onChange={(e) => setRateType(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold"
                      >
                        <option value="flat">Flat Rate ($)</option>
                        <option value="hourly">Hourly ($/hr)</option>
                      </select>
                   </div>
                   <div className="w-1/2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rate</label>
                      <input type="number" placeholder={rateType === 'hourly' ? "25" : "500"} value={rate} onChange={(e) => setRate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary" required />
                   </div>
                </div>

                {rateType === 'hourly' && (
                  <div className="md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center gap-4">
                    <div className="flex-1">
                       <label className="block text-xs font-bold text-yellow-600 uppercase tracking-widest mb-1">Estimated Hours</label>
                       <p className="text-xs text-yellow-600/80">Used for budget calculation only.</p>
                    </div>
                    <input 
                      type="number" 
                      placeholder="e.g. 10" 
                      value={estimatedHours} 
                      onChange={(e) => setEstimatedHours(e.target.value)} 
                      className="w-32 p-3 bg-white border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold" 
                      required 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary" required />
                </div>
              </div>
              <textarea placeholder="Specific requirements..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:ring-2 focus:ring-secondary" />
              
              <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-lg">
                {editingJobId ? 'Save Changes' : 'Add Role to Budget'}
              </button>
            </form>
          </div>
        )}

        {/* 3. LIST OF JOBS + APPLICANTS */}
        <div className="space-y-6">
          {jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">No roles added yet.</div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-primary">{job.title}</h3>
                    <div className="flex gap-4 text-sm text-slate-500 font-bold mt-1 items-center">
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                        ${job.rate} {job.rate_type === 'hourly' ? '/ hr' : 'flat'}
                      </span>
                      {job.rate_type === 'hourly' && (
                        <span className="text-xs text-slate-400">
                          (Est. {job.estimated_hours} hrs)
                        </span>
                      )}
                      <span>{job.start_date} → {job.end_date}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleEditClick(job)} className="text-slate-400 hover:text-secondary font-bold text-xs uppercase tracking-wider flex items-center gap-1">✏️ Edit</button>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <button onClick={() => handleDeleteJob(job.id)} className="text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-wider">Delete</button>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Applicants ({job.applications?.length || 0})
                  </h4>
                  
                  {(!job.applications || job.applications.length === 0) ? (
                    <p className="text-slate-400 text-sm italic">Waiting for applicants...</p>
                  ) : (
                    <div className="space-y-3">
                      {job.applications.map((app: any) => {
                        // ✅ CHECK IF THIS USER HAS A REVIEW
                        const hasReview = job.reviews?.some((r: any) => r.reviewee_id === app.applicant_id)

                        return (
                          <div key={app.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-secondary transition-colors">
                            <div className="flex items-center gap-3">
                              <Link href={`/profile/${app.applicant_id}`} className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden block">
                                {app.profiles?.avatar_url ? (
                                  <img src={app.profiles.avatar_url} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center font-bold text-slate-400">
                                    {app.profiles?.full_name?.charAt(0)}
                                  </div>
                                )}
                              </Link>
                              <div>
                                <Link href={`/profile/${app.applicant_id}`} className="font-bold text-primary hover:underline">
                                  {app.profiles?.full_name || 'Unknown User'}
                                </Link>
                                <p className="text-xs text-slate-400 uppercase font-bold">{app.status}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {app.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button onClick={() => handleAppStatus(app.id, 'rejected')} className="px-3 py-1 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100">Decline</button>
                                  <button onClick={() => handleAppStatus(app.id, 'approved')} className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-sm">Hire</button>
                                </div>
                              )}
                              {app.status === 'approved' && (
                                app.payment_status === 'paid' ? (
                                  <div className="flex items-center gap-4">
                                    <div><span className="text-green-600 font-bold text-sm block">✓ Paid</span><span className="text-xs text-slate-400 font-medium">{app.payment_method}</span></div>
                                    
                                    {/* ✅ REVIEW BUTTON / BADGE */}
                                    {hasReview ? (
                                      <span className="text-xs font-bold text-yellow-500 bg-yellow-50 px-2 py-1 rounded">⭐ Reviewed</span>
                                    ) : (
                                      <button onClick={() => openReviewModal(app, job)} className="px-3 py-1 text-xs font-bold text-secondary bg-teal-50 border border-teal-100 rounded-lg hover:bg-teal-100">Leave Review</button>
                                    )}
                                  </div>
                                ) : (
                                  <button onClick={() => handleMarkPaid(app.id)} className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-700 shadow-sm">Mark Paid</button>
                                )
                              )}
                              {app.status === 'rejected' && <span className="text-red-400 font-bold text-sm">✕ Declined</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* ✅ REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-black text-primary mb-2">Review {reviewTarget?.name}</h3>
            <p className="text-slate-500 text-sm mb-6">How was their performance on this job?</p>
            
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
              placeholder="Write a brief comment (optional)..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-32 mb-6 outline-none focus:ring-2 focus:ring-secondary"
            />

            <div className="flex gap-4">
              <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
              <button onClick={submitReview} className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-teal-600 shadow-lg">Submit Review</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}