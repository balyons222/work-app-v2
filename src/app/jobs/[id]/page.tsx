'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendNotification } from '@/src/utils/notifications'
import TermsModal from '@/src/components/TermsModal'

export default function JobDetailsPage() {
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [appStatus, setAppStatus] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  
  // ✅ TERMS STATE (Declared correctly at the top)
  const [showTerms, setShowTerms] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)

  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  async function loadJobDetails() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // 1. Fetch Job Data
    const { data: jobData, error } = await supabase
      .from('jobs')
      .select(`*, events (title, location, event_date, website, description)`)
      .eq('id', jobId)
      .single()

    if (error) {
      toast.error('Job not found')
      router.push('/jobs')
      return
    }
    setJob(jobData)

    if (user) {
      // ✅ 2. FETCH USER PROFILE (Role + Terms Status) - SINGLE CALL
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, accepted_tos_at')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserRole(profile.role)
        if (profile.accepted_tos_at) setHasAcceptedTerms(true)
      }

      // 3. Fetch Application Status
      const { data: appData } = await supabase
        .from('applications')
        .select('status') 
        .eq('job_id', jobId)
        .eq('applicant_id', user.id)
        .single()
      
      if (appData) setAppStatus(appData.status)
    }
    setLoading(false)
  }

  const handleApply = async () => {
    if (!currentUser) {
      toast.error('Please log in to apply')
      router.push('/login')
      return
    }

    // ✅ 1. CHECK TERMS ACCEPTANCE FIRST
    if (!hasAcceptedTerms) {
      setShowTerms(true)
      return
    }

    // ✅ 2. CHECK ROLE (Contractor OR Worker)
    if (userRole !== 'contractor' && userRole !== 'worker') {
      toast.error('Only Contractors/Workers can apply for jobs.')
      return
    }

    // ✅ 3. CHECK JOB AGREEMENT (Checkbox)
    if (!agreed) {
      toast.error('You must agree to the job terms to apply.')
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
      setAppStatus('pending')

      if (job?.organizer_id) {
        await sendNotification({
          userId: job.organizer_id,
          title: "New Applicant 📝",
          message: `Someone just applied for "${job.title}". Review their profile now.`,
          link: `/dashboard/event/${job.event_id}`, 
          type: "info"
        })
      }
    }
  }

  const getButtonUI = () => {
    if (userRole === 'organizer') return { text: 'Organizers Cannot Apply', disabled: true, classes: 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' }
    if (appStatus === 'approved') return { text: '🎉 You are Hired!', disabled: true, classes: 'bg-green-600 text-white cursor-default' }
    if (appStatus === 'rejected') return { text: '✕ Application Declined', disabled: true, classes: 'bg-slate-200 text-slate-500 cursor-not-allowed' }
    if (appStatus === 'pending') return { text: '✓ Application Submitted', disabled: true, classes: 'bg-slate-200 text-slate-500 cursor-not-allowed' }
    
    return { text: 'Apply for this Position', disabled: false, classes: 'bg-primary text-white hover:bg-slate-800 shadow-lg hover:shadow-xl' }
  }

  const btnUI = getButtonUI()

  if (loading) return <div className="p-20 text-center">Loading Details...</div>
  if (!job) return <div className="p-20 text-center">Job not found.</div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 relative">
      <div className="max-w-3xl mx-auto">
        <Link href="/jobs" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary mb-8 transition-colors">← Back to Job Board</Link>

        <div className={`bg-white rounded-3xl shadow-sm border ${appStatus === 'approved' ? 'border-green-500 ring-2 ring-green-500' : 'border-slate-200'} overflow-hidden`}>
          
          <div className="p-8 md:p-12 border-b border-slate-100 relative">
             {appStatus === 'approved' && (
               <div className="absolute top-0 left-0 w-full bg-green-600 text-white text-center text-xs font-bold uppercase py-1 tracking-widest">
                 Official Crew Member
               </div>
             )}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 mt-4">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-secondary text-xs font-bold uppercase tracking-widest rounded-md mb-3">{job.title}</span>
                <h1 className="text-3xl font-black text-primary mb-2">{job.events?.title}</h1>
                <p className="text-lg text-slate-500 font-medium">📍 {job.events?.location}</p>
              </div>
              <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rate</p>
                <p className="text-3xl font-black text-green-600">${job.rate}</p>
              </div>
            </div>

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
                 <a href={job.events.website} target="_blank" className="bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-secondary font-bold">🔗 Event Website</a>
               )}
            </div>
          </div>

          <div className="p-8 md:p-12 bg-slate-50/30">
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Job Description</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{job.description || "No specific job details provided."}</p>
              </section>

              <div className="pt-8 border-t border-slate-200 mt-8">
                
                {/* Checkbox Logic: Show for Contractor OR Worker */}
                {!appStatus && (userRole === 'contractor' || userRole === 'worker') && (
                  <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="mt-1 h-5 w-5 text-secondary rounded focus:ring-secondary cursor-pointer"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <span className="text-sm text-slate-600">
                        I agree to fulfill the duties listed in the description for the rate of <span className="font-bold text-slate-900">${job.rate}</span>. I understand this is a binding agreement.
                      </span>
                    </label>
                  </div>
                )}

                <button 
                  onClick={handleApply}
                  disabled={btnUI.disabled}
                  className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${btnUI.classes}`}
                >
                  {btnUI.text}
                </button>
                {appStatus === 'pending' && <p className="text-center text-sm text-slate-400 mt-3">Your application is being reviewed.</p>}
                {appStatus === 'approved' && <p className="text-center text-sm text-green-600 font-bold mt-3">Please check your email or wait for further instructions from the Organizer.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ TERMS MODAL (Outside the main container logic) */}
      {showTerms && currentUser && (
        <TermsModal 
          userId={currentUser.id} 
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setHasAcceptedTerms(true)
            setShowTerms(false)
            toast.success("Terms accepted! You can now apply.")
          }}
        />
      )}
    </div>
  )
}
