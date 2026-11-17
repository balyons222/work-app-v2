'use client'

// Legacy per-job page. Applicants are managed on the event page, where hiring goes through
// Stripe (status 'approved'). This page used to let organizers set status 'hired' by hand,
// skipping payment, so it now just forwards old links to the job's event.

import { useEffect } from 'react'
import { createClient } from '@/src/utils/supabase/client'
import { useParams, useRouter } from 'next/navigation'

export default function LegacyJobRedirect() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('event_id')
      .eq('id', jobId)
      .maybeSingle()
      .then(({ data }) => {
        router.replace(data?.event_id ? `/dashboard/event/${data.event_id}` : '/dashboard')
      })
  }, [jobId, router])

  return <div className="p-12 text-center text-slate-400">Redirecting...</div>
}
