'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReviewModal from '@/src/components/ReviewModal'
import StarRating from '@/src/components/StarRating'
import { startChat } from '@/src/utils/startChat'

export default function MyApplications() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchMyApplications()
  }, [])

  async function fetchMyApplications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('applications')
      .select('*, jobs(*, events(title))')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setApplications(data || [])
    
    setLoading(false)
  }

  if (loading) return <div className="p-12 text-center">Loading applications...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-gray-500 mb-8">Track the status of your job applications.</p>

        {applications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">You haven't applied to any jobs yet.</p>
            <Link href="/jobs" className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800">
              Find Work
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* Left Side: Job Info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     {app.jobs?.events?.title && (
                        <span className="text-xs font-bold text-primary bg-slate-50 px-2 py-0.5 rounded uppercase tracking-wide">
                          {app.jobs.events.title}
                        </span>
                     )}
                     <span className="text-xs text-gray-400">
                        Applied: {new Date(app.created_at).toLocaleDateString()}
                     </span>
                  </div>
                  
                  <h3 className="font-bold text-xl text-gray-900">{app.jobs?.title || 'Unknown Job'}</h3>
                  
                  {/* Rating + Location */}
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <StarRating userId={app.jobs?.employer_id} />
                    <span>• {app.jobs?.location}</span>
                    <span className="text-green-700 font-bold">• ${app.jobs?.price}</span>
                  </div>

                  {/* 👇 SINGLE MESSAGE BUTTON (Correctly Placed) */}
                  <button
                    onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) return
                        startChat(supabase, router, {
                            jobId: app.job_id,
                            workerId: user.id,
                            organizerId: app.jobs.employer_id
                        })
                    }}
                    className="mt-3 text-sm font-bold text-primary hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    💬 Message Organizer
                  </button>
                </div>

                {/* Right Side: Status & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border ${
                    app.status === 'hired' ? 'bg-green-100 text-green-700 border-green-200' :
                    app.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                    app.status === 'contacted' ? 'bg-slate-50 text-primary border-blue-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    {app.status === 'hired' ? '🎉 Hired' : 
                     app.status === 'rejected' ? '❌ Rejected' : 
                     app.status === 'contacted' ? '📞 Contacted' : 
                     '⏳ Pending'}
                  </span>

                  {/* Review Button (Only if Hired) */}
                  {app.status === 'hired' && (
                    <button
                        onClick={() => {
                        setSelectedJob({
                            jobId: app.job_id,
                            targetId: app.jobs.employer_id, 
                            targetName: app.jobs.events?.title || "the Organizer"
                        })
                        setReviewModalOpen(true)
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-black underline"
                    >
                        ★ Write Review
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Review Modal Component */}
        {selectedJob && (
          <ReviewModal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            jobId={selectedJob.jobId}
            targetId={selectedJob.targetId}
            targetName={selectedJob.targetName}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
  )
}