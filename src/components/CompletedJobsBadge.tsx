// Jobs a contractor has completed (paid) through FxD Events.
// Source: profiles.completed_jobs, kept in sync by a trigger (supabase/sql/2026-11-26_completed-jobs.sql).
// Zero shows "New to FxD" rather than "0 jobs", so new contractors aren't penalized.

type Props = {
  count: number | null | undefined
  size?: 'sm' | 'md'
}

export default function CompletedJobsBadge({ count, size = 'sm' }: Props) {
  const n = count ?? 0
  const text = size === 'sm' ? 'text-[11px]' : 'text-sm'

  if (n <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 ${text} font-bold text-slate-400`}>
        New to FxD
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 ${text} font-bold text-slate-700`}>
      <svg className="h-3.5 w-3.5 text-secondary shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
      </svg>
      {n} {n === 1 ? 'job' : 'jobs'} completed
    </span>
  )
}
