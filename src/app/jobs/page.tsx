'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

function JobBoardContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoadJobs()
  }, [])

  async function checkUserAndLoadJobs() {
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUser(user)

    // 2. Fetch Open Jobs (and link to Event details)
    const { data: jobsData, error } = await supabase
      .from('jobs')
      .select(`
        *,
        events ( title, location, event_date )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (error) console.error('Error loading jobs:', error)
    else setJobs(jobsData || [])

    // 3. Fetch My Existing Applications (so we can disable the button if already applied)
    const { data: appsData } = await supabase
      .from('applications')
      .select('job_id')
      .eq('applicant_id', user.id)

    if (appsData) {
      const appliedJobIds = new Set(appsData.map(app => app.job_id))
      setMyApplications(appliedJobIds)
    }

    setLoading(false)
  }

  const handleApply = async (jobId: string) => {
    if (!currentUser) return

    const toastId = toast.loading('Sending application...')

    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      applicant_id: currentUser.id,
      status: 'pending'
    })

    if (error) {
      toast.error('Failed to apply', { id: toastId })
    } else {
      toast.success('Applied successfully!', { id: toastId })
      // Update local state to show "Applied" immediately
      setMyApplications(prev => new Set(prev).add(jobId))
    }
  }

  // Filter Logic
  const filteredJobs = jobs.filter(job => 
    !filterRole || job.title.toLowerCase().includes(filterRole.toLowerCase())
  )

  if (loading) return <div className="p-20 text-center">Loading Opportunities...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Find Gigs</h1>
            <p className="text-slate-500">Browse open positions and join the crew.</p>
          </div>
          
          {/* Search/Filter */}
          <input 
            type="text" 
            placeholder="Filter by Role (e.g. Audio, Video)..." 
            className="p-3 w-full md:w-80 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          />
        </div>

        {/* Job Grid */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No jobs found matching your search.</p>
            </div>
          ) : (
            filteredJobs.map(job => {
              const isApplied = myApplications.has(job.id)
              
              return (
                <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    {/* Job Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-md">
                          {job.title}
                        </span>
                        <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                          ${job.rate}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-primary mb-1">
                        {job.events?.title || 'Untitled Event'}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-3">
                        <span>📍 {job.events?.location || 'Location TBD'}</span>
                        <span>📅 {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'Date TBD'}</span>
                      </div>

                      <p className="text-slate-600 leading-relaxed text-sm">
                        {job.description || "No specific details provided."}
                      </p>
                    </div>

                    {/* Apply Action */}
                    <div className="flex items-center">
                      <button 
                        onClick={() => handleApply(job.id)}
                        disabled={isApplied}
                        className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-md ${
                          isApplied 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-primary text-white hover:bg-slate-800'
                        }`}
                      >
                        {isApplied ? '✓ Applied' : 'Apply Now'}
                      </button>
                    </div>

                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}

export default function JobBoardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <JobBoardContent />
    </Suspense>
  )
}
