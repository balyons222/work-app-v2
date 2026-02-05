'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

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
  const [isAddingJob, setIsAddingJob] = useState(false)

  // New Job Form State
  const [selectedRole, setSelectedRole] = useState('')
  const [rate, setRate] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string

  useEffect(() => {
    loadEventData()
  }, [eventId])

  async function loadEventData() {
    // 1. Fetch Event Details
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

    // 2. Fetch Jobs AND Applications (with Applicant Profiles)
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        applications (
          id,
          status,
          applicant_id,
          profiles ( full_name, avatar_url, role )
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setJobs(jobsData || [])
    setLoading(false)
  }

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return toast.error('Please select a role')

    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('jobs').insert({
      event_id: eventId,
      organizer_id: user?.id,
      title: selectedRole,
      rate: parseFloat(rate),
      description: jobDescription,
      start_date: startDate,
      end_date: endDate,
      status: 'open'
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Job Added!')
      setIsAddingJob(false)
      setSelectedRole(''); setRate(''); setJobDescription(''); setStartDate(''); setEndDate('')
      loadEventData() 
    }
  }

  const handleAppStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId)

    if (error) toast.error('Update failed')
    else {
      toast.success(`Applicant ${newStatus}`)
      loadEventData() // Refresh UI
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

  if (loading) return <div className="p-20 text-center">Loading Event...</div>

  // Calculations
  const totalBudget = event?.budget || 0
  const allocatedBudget = jobs.reduce((sum, job) => sum + (job.rate || 0), 0)
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
                <div className="flex justify-between text-xs font-bold text-slate-500"><span>Allocated</span><span>${allocatedBudget.toLocaleString()}</span></div>
                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full transition-all duration-500 ${remainingBudget < 0 ? 'bg-red-500' : 'bg-secondary'}`} style={{ width: `${percentUsed}%` }} />
                </div>
                <div className={`flex justify-between text-xs font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}><span>Remaining</span><span>${remainingBudget.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. JOB MANAGER */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-primary">Staffing & Applicants</h2>
          <button onClick={() => setIsAddingJob(!isAddingJob)} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
            {isAddingJob ? 'Cancel' : '+ Add Role'}
          </button>
        </div>

        {/* ADD JOB FORM */}
        {isAddingJob && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold mb-6">Create Job Role</h3>
            <form onSubmit={handleAddJob} className="space-y-6">
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
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pay Rate ($)</label>
                  <input type="number" placeholder="e.g. 500" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary" required />
                </div>
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
              <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-lg">Add Role to Budget</button>
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
                
                {/* Job Header */}
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-primary">{job.title}</h3>
                    <div className="flex gap-4 text-sm text-slate-500 font-bold mt-1">
                      <span className="text-green-600">${job.rate}</span>
                      <span>{job.start_date} → {job.end_date}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteJob(job.id)} className="text-red-400 hover:text-red-600 font-bold text-xs">Delete Position</button>
                </div>

                {/* Applicants List */}
                <div className="p-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Applicants ({job.applications?.length || 0})
                  </h4>
                  
                  {(!job.applications || job.applications.length === 0) ? (
                    <p className="text-slate-400 text-sm italic">Waiting for applicants...</p>
                  ) : (
                    <div className="space-y-3">
                      {job.applications.map((app: any) => (
                        <div key={app.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-secondary transition-colors">
                          
                          {/* Applicant Info */}
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

                          {/* Action Buttons */}
                          {app.status === 'pending' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAppStatus(app.id, 'rejected')}
                                className="px-3 py-1 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                              >
                                Decline
                              </button>
                              <button 
                                onClick={() => handleAppStatus(app.id, 'approved')}
                                className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 shadow-sm"
                              >
                                Hire
                              </button>
                            </div>
                          )}
                          {app.status === 'approved' && <span className="text-green-600 font-bold text-sm">✓ Hired</span>}
                          {app.status === 'rejected' && <span className="text-red-400 font-bold text-sm">✕ Declined</span>}

                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
