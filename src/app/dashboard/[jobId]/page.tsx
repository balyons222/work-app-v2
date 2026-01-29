'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/src/components/StarRating'
import ReviewModal from '@/src/components/ReviewModal'
import { startChat } from '@/src/utils/startChat'

export default function JobDetailsPage() {
  const [job, setJob] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null)
  
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const jobId = params.jobId as string

  useEffect(() => {
    fetchJobDetails()
  }, [])

  async function fetchJobDetails() {
    // 1. Fetch Job Info
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*, events(*)')
      .eq('id', jobId)
      .single()

    if (jobError) {
      console.error('Error fetching job:', jobError)
      setLoading(false)
      return
    }
    setJob(jobData)

    // 2. Fetch Applicants
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('*, profiles(*)') 
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (appsError) console.error(appsError)
    else setApplications(appsData || [])

    setLoading(false)
  }

  async function updateStatus(applicationId: string, newStatus: string) {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId)

    if (!error) {
      setApplications((prev) => 
        prev.map(app => app.id === applicationId ? { ...app, status: newStatus } : app)
      )
    }
  }

  if (loading) return <div className="p-12 text-center">Loading job details...</div>
  if (!job) return <div className="p-12 text-center">Job not found</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header: Job Info */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-black mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-1">{job.title}</h1>
              {job.events && (
                <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mt-2 uppercase tracking-wide font-bold">
                  {job.events.title}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">${job.price}</p>
              <p className="text-gray-500 text-sm">{job.location}</p>
            </div>
          </div>
        </div>

        {/* Applicants List */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Applicants ({applications.length})
        </h2>

        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
              No applicants yet.
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Applicant Profile */}
                <div className="flex flex-col">
                  <p className="font-bold text-lg text-gray-900">
                    {app.profiles?.full_name || 'Unknown User'}
                  </p>
                  
                  {/* Star Rating */}
                  <div className="mb-1">
                    <StarRating userId={app.worker_id} /> 
                  </div>

                  <p className="text-xs text-gray-400 mb-2">
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </p>

                  {/* Skills / Bio preview could go here */}
                </div>

                {/* Actions: Status + Message + Review */}
                <div className="flex items-center gap-3">
                  
                  {/* Status Dropdown */}
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className={`text-sm font-bold py-1 px-3 rounded border cursor-pointer outline-none ${
                        app.status === 'hired' ? 'bg-green-50 text-green-700 border-green-200' :
                        app.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                        app.status === 'contacted' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="contacted">📞 Contacted</option>
                    <option value="hired">🎉 Hired</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>

                  {/* 👇 SINGLE MESSAGE BUTTON */}
                  <button
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) return
                      
                      startChat(supabase, router, {
                        jobId: job.id,
                        workerId: app.worker_id,
                        organizerId: user.id
                      })
                    }}
                    className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    💬 Message
                  </button>

                  {/* Review Button (Visible only if Hired) */}
                  {app.status === 'hired' && (
                     <button 
                       onClick={() => {
                           setReviewModalOpen(true)
                           setSelectedApplicant({ 
                               jobId: params.jobId, 
                               targetId: app.worker_id, 
                               targetName: app.profiles.full_name 
                           })
                       }}
                       className="text-xs text-yellow-600 font-bold border border-yellow-200 bg-yellow-50 px-3 py-1.5 rounded hover:bg-yellow-100"
                     >
                       ★ Review
                     </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Review Modal Component */}
        {selectedApplicant && (
          <ReviewModal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            jobId={selectedApplicant.jobId}
            targetId={selectedApplicant.targetId}
            targetName={selectedApplicant.targetName}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
  )
}