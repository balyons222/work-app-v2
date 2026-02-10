'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

function JobBoardContent() {
  const [jobs, setJobs] = useState<any[]>([])
  // ✅ CHANGED: Store status string instead of just ID
  const [myAppStatus, setMyAppStatus] = useState<Record<string, string>>({}) 
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [filterRole, setFilterRole] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterState, setFilterState] = useState('')
  
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoadJobs()
  }, [])

  async function checkUserAndLoadJobs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUser(user)

    // 1. Fetch Open Jobs
    const { data: jobsData, error } = await supabase
      .from('jobs')
      .select(`*, events ( title, location, event_date )`)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (error) console.error('Error loading jobs:', error)
    else setJobs(jobsData || [])

    // 2. Fetch My Applications with STATUS
    const { data: appsData } = await supabase
      .from('applications')
      .select('job_id, status') // ✅ Fetching status
      .eq('applicant_id', user.id)

    if (appsData) {
      // Create a map: { 'job_id_1': 'pending', 'job_id_2': 'approved' }
      const statusMap: Record<string, string> = {}
      appsData.forEach(app => {
        statusMap[app.job_id] = app.status
      })
      setMyAppStatus(statusMap)
    }

    setLoading(false)
  }

  // Filter Logic
  const filteredJobs = jobs.filter(job => {
    const jobLocation = (job.events?.location || '').toLowerCase()
    const roleMatch = !filterRole || job.title.toLowerCase().includes(filterRole.toLowerCase())
    const cityMatch = !filterCity || jobLocation.includes(filterCity.toLowerCase())
    const stateMatch = !filterState || jobLocation.includes(filterState.toLowerCase())
    return roleMatch && cityMatch && stateMatch
  })

  // Helper to get button style based on status
  const getButtonConfig = (status?: string) => {
    switch (status) {
      case 'approved':
        return { text: '✓ HIRED!', classes: 'bg-green-600 text-white border-green-600 shadow-green-200' }
      case 'rejected':
        return { text: '✕ Not Selected', classes: 'bg-slate-100 text-slate-400 border-slate-200' }
      case 'pending':
        return { text: '✓ Applied', classes: 'bg-slate-100 text-slate-500 border-slate-200' }
      default:
        return { text: 'View & Apply', classes: 'bg-white text-primary border-primary hover:bg-primary hover:text-white' }
    }
  }

  if (loading) return <div className="p-20 text-center">Loading Opportunities...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black text-primary">Find Gigs</h1>
            <p className="text-slate-500">Browse open positions and join the crew.</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <input type="text" placeholder="Role..." className="p-3 w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary text-sm font-bold" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} />
            <input type="text" placeholder="City..." className="p-3 w-full sm:w-40 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary text-sm font-bold" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} />
             <input type="text" placeholder="State..." className="p-3 w-full sm:w-24 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary text-sm font-bold" value={filterState} onChange={(e) => setFilterState(e.target.value)} />
          </div>
        </div>

        {/* Job Grid */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No jobs found matching your filters.</p>
              <button onClick={() => { setFilterRole(''); setFilterCity(''); setFilterState('') }} className="mt-2 text-secondary font-bold text-sm hover:underline">Clear all filters</button>
            </div>
          ) : (
            filteredJobs.map(job => {
              const status = myAppStatus[job.id] // undefined, pending, approved, or rejected
              const btnConfig = getButtonConfig(status)
              
              return (
                <div key={job.id} className={`bg-white p-6 rounded-2xl border ${status === 'approved' ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all group`}>
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-md">{job.title}</span>
                        <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">${job.rate}</span>
                        {status === 'approved' && <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">You're Hired!</span>}
                      </div>
                      <h3 className="text-xl font-bold text-primary mb-1">{job.events?.title || 'Untitled Event'}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-3">
                        <span>📍 {job.events?.location || 'Location TBD'}</span>
                        <span>📅 {job.start_date ? new Date(job.start_date).toLocaleDateString() : 'Date TBD'}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-sm line-clamp-2">{job.description}</p>
                    </div>

                    <div className="flex items-center">
                      <Link 
                        href={`/jobs/${job.id}`}
                        className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm text-center block border-2 ${btnConfig.classes}`}
                      >
                        {btnConfig.text}
                      </Link>
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