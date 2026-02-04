'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

// 🛠️ SHARED ROLES (Matches Profile Setup)
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
  const [description, setDescription] = useState('')

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

    // 2. Fetch Jobs for this Event
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
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
      title: selectedRole, // Using the standard role as the title
      rate: parseFloat(rate),
      description: description,
      status: 'open'
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Job Added!')
      setIsAddingJob(false)
      setSelectedRole('')
      setRate('')
      setDescription('')
      loadEventData() // Refresh list
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this position?')) return
    
    const { error } = await supabase.from('jobs').delete().eq('id', jobId)
    if (!error) {
      toast.success('Job removed')
      loadEventData()
    }
  }

  if (loading) return <div className="p-20 text-center">Loading Event...</div>

  // Calculate Budget Stats
  const totalBudget = event?.budget || 0
  const allocatedBudget = jobs.reduce((sum, job) => sum + (job.rate || 0), 0)
  const remainingBudget = totalBudget - allocatedBudget

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Navigation */}
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* Event Header Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-primary mb-2">{event.title}</h1>
              <p className="text-lg text-slate-500 font-medium">
                📍 {event.location} • 📅 {new Date(event.event_date).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Budget</p>
              <p className="text-3xl font-black text-green-600">${totalBudget.toLocaleString()}</p>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="mt-8">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-slate-500">Allocated: ${allocatedBudget.toLocaleString()}</span>
              <span className={`${remainingBudget < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                Remaining: ${remainingBudget.toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${remainingBudget < 0 ? 'bg-red-500' : 'bg-secondary'}`} 
                style={{ width: `${Math.min((allocatedBudget / totalBudget) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Job Management Section */}
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-black text-primary">Open Positions</h2>
          <button 
            onClick={() => setIsAddingJob(!isAddingJob)}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            {isAddingJob ? 'Cancel' : '+ Add Job Position'}
          </button>
        </div>

        {/* ADD JOB FORM */}
        {isAddingJob && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold mb-4">Post a New Position</h3>
            <form onSubmit={handleAddJob} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role Needed</label>
                  <select 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary"
                    required
                  >
                    <option value="">Select a Role...</option>
                    {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                      <optgroup key={category} label={category}>
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Rate Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pay Rate ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Job Details / Requirements</label>
                <textarea 
                  placeholder="Describe specific requirements, hours, or equipment needed..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
              </div>

              <button type="submit" className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:bg-teal-600 transition-colors">
                Post Job
              </button>
            </form>
          </div>
        )}

        {/* JOBS LIST */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No positions added yet.</p>
              <p className="text-sm text-slate-300">Add jobs to start staffing this event.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-primary">{job.title}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                      {job.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">{job.description}</p>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <span className="font-bold text-lg text-secondary">${job.rate}</span>
                  <button 
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-400 hover:text-red-600 font-bold text-sm px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
