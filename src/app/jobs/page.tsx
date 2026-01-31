import { createClient } from '../../utils/supabase/server'
import Link from 'next/link'

export default async function JobBoard() {
  const supabase = await createClient()
  
  // Fetch jobs and join with profiles to get the company/organizer name
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      *,
      profiles:user_id (full_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Event Opportunities</h1>
            <p className="text-slate-500 mt-2">Find your next gig in the event industry.</p>
          </div>
          <Link 
            href="/jobs/new" 
            className="bg-secondary hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-sm"
          >
            Post a Job
          </Link>
        </div>

        <div className="grid gap-4">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-primary group-hover:text-secondary transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">📍 {job.location}</span>
                      <span className="flex items-center gap-1">💰 {job.budget}</span>
                      <span className="flex items-center gap-1">👤 {job.profiles?.full_name}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/jobs/${job.id}`}
                    className="text-primary font-bold hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-400">No jobs posted yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}