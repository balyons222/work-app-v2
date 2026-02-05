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
  // NEW: Date Fields
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
    
    // Insert with NEW fields and Explicit Organizer ID
    const { error } = await supabase.from('jobs').insert({
      event_id: eventId,
      organizer_id: user?.id, // CRITICAL FOR RLS
      title: selectedRole,
      rate: parseFloat(rate),
      description: jobDescription,
      start_date: startDate,
      end_date: endDate,
      status: 'open'
    })

    if (error) {
      console.error(error)
      toast.error(error.message)
    } else {
      toast.success('Job Added!')
      setIsAddingJob(false)
      // Reset Form
      setSelectedRole('')
      setRate('')
      setJobDescription('')
      setStartDate('')
      setEndDate('')
      loadEventData() 
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

  // --- FINANCIAL CALCULATIONS ---
  const totalBudget = event?.budget || 0
  const allocatedBudget = jobs.reduce((sum, job) => sum + (job.rate || 0), 0)
  const remainingBudget = totalBudget - allocatedBudget
  const percentUsed = Math.min((allocatedBudget / totalBudget) * 100, 100)

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation */}
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        {/* 1. EVENT SUMMARY CARD */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mb-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-full mb-3">Event Container</span>
              <h1 className="text-4xl font-black text-primary mb-2">{event.title}</h1>
              <p className="text-lg text-slate-600 mb-4">{event.description}</p>
              
              <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-500">
                <span className="flex items-center gap-2">📍 {event.location}</span>
                <span className="flex items-center gap-2">📅 {new Date(event.event_date).toLocaleDateString()}</span>
                {event.website && (
                  <a href={event.website} target="_blank" className="flex items-center gap-2 text-secondary hover:underline">🔗 Website</a>
                )}
              </div>
            </div>

            {/* FINANCIAL VISUALIZATION */}
            <div className="w-full md:w-80 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Labor Budget</p>
              <p className="text-3xl font-black text-slate-900 mb-4">${totalBudget.toLocaleString()}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Allocated</span>
                  <span>${allocatedBudget.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full transition-all duration-500 ${remainingBudget < 0 ? 'bg-red-500' : 'bg-secondary'}`} 
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className={`flex justify-between text-xs font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <span>Remaining</span>
                  <span>${remainingBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. JOB CREATION SECTION */}
        <div className="flex justify-between items-end mb-6">
          <div>
             <h2 className="text-2xl font-black text-primary">Staffing Roles</h2>
             <p className="text-slate-500 text-sm">Add roles to this event to verify budget.</p>
          </div>
          <button 
            onClick={() => setIsAddingJob(!isAddingJob)}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
          >
            {isAddingJob ? 'Cancel' : '+ Add Role'}
          </button>
        </div>

        {/* ADD JOB FORM */}
        {isAddingJob && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary rounded-t-2xl" />
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">2</span> 
              Create Job Role
            </h3>
            <form onSubmit={handleAddJob} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Pay for Role ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold text-primary"
                    required
                  />
                </div>

                {/* Date Inputs */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Specific Requirements</label>
                <textarea 
                  placeholder="Describe hours, equipment needed, or specific duties..." 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <button type="submit" className="w-full bg-secondary text-white font-bold py-4 rounded-xl hover:bg-teal-600 transition-colors shadow-lg">
                Add Role to Budget
              </button>
            </form>
          </div>
        )}

        {/* 3. LIST OF JOBS */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No roles added yet.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-primary">{job.title}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wide">
                      {job.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wide">
                     {job.start_date} → {job.end_date}
                  </p>
                  <p className="text-slate-600 text-sm">{job.description}</p>
                </div>
                
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <span className="font-bold text-xl text-secondary">${job.rate}</span>
                  <button 
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-400 hover:text-red-600 font-bold text-xs bg-red-50 px-3 py-2 rounded-lg transition-colors"
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
