'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function JobDetailsPage() {
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasApplied, setHasApplied] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  async function loadJobDetails() {
    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // 2. Fetch Job with Event Details
    const { data: jobData, error } = await supabase
      .from('jobs')
      .select(`
        *,
        events (
          title,
          location,
          event_date,
          website,
          description
        )
      `)
      .eq('id', jobId)
      .single()

    if (error) {
      toast.error('Job not found')
      router.push('/jobs')
      return
    }
    setJob(jobData)

    // 3. Check if already applied
    if (user) {
      const { data: appData } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('applicant_id', user.id)
        .single()
      
      if (appData) setHasApplied(true)
    }

    setLoading(false)
  }

  const handleApply = async () => {
    if (!currentUser) {
      toast.error('Please log in to apply')
      router.push('/login')
      return
    }

    const toastId = toast.loading('Sending application...')

    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      applicant_id: currentUser.id,
      status: 'pending'
    })

    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success('Application Sent!', { id: toastId })
      setHasApplied(true)
    }
  }

  if (loading) return <div className="p-20 text-center">Loading Details...</div>
  if (!job) return <div className="p-20 text-center">Job not found.</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation */}
        <Link href="/jobs" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">
          ← Back to Job Board
        </Link>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Section */}
          <div className="p-8 md:p-12 border-b border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-md mb-3">
                  {job.title}
                </span>
                <h1 className="text-3xl font-black text-primary mb-2">
                  {job.events?.title}
                </h1>
                <p className="text-lg text-slate-500 font-medium">
                  📍 {job.events?.location}
                </p>
              </div>
              
              <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rate</p>
                <p className="text-3xl font-black text-green-600">${job.rate}</p>
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-400 font-bold text-xs uppercase">Start Date</p>
                <p className="font-bold text-slate-700">{job.start_date ? new Date(job.start_date).toLocaleDateString() : 'TBD'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-400 font-bold text-xs uppercase">End Date</p>
                <p className="font-bold text-slate-700">{job.end_date ? new Date(job.end_date).toLocaleDateString() : 'TBD'}</p>
              </div>
               {job.events?.website && (
                 <a href={job.events.website} target="_blank" className="bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-secondary font-bold">
                   🔗 Event Website
                 </a>
               )}
            </div>
          </div>

          {/* Details Body */}
          <div className="p-8 md:p-12 bg-slate-50/30">
            <div className="space-y-8">
              
              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Job Description</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {job.description || "No specific job details provided by the organizer."}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">About the Event</h3>
                <p className="text-slate-600 leading-relaxed italic">
                  {job.events?.description || "No event description available."}
                </p>
              </section>

              {/* Action Area */}
              <div className="pt-8 border-t border-slate-200 mt-8">
                <button 
                  onClick={handleApply}
                  disabled={hasApplied}
                  className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg ${
                    hasApplied 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {hasApplied ? '✓ Application Submitted' : 'Apply for this Position'}
                </button>
                {hasApplied && (
                  <p className="text-center text-sm text-slate-400 mt-3">
                    You have applied. The organizer will review your profile shortly.
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
