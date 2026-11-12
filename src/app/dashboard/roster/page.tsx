import { createClient as createServerClient } from '@/src/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SortableRoster from './SortableRoster'

export default async function OrganizerRosterPage() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      id, status, payment_status, applicant_id,
      profiles:applicant_id ( id, full_name, email, avatar_url, phone ),
      jobs!inner ( id, rate, title, events ( title, event_date ) )
    `)
    .eq('jobs.organizer_id', user.id)
    .eq('status', 'approved')

  if (error) console.error('Error fetching roster:', error.message)

  const rosterMap = new Map<string, any>()

  // FIX 1: Explicitly type 'app' as 'any' to clear nested Supabase typescript errors
  applications?.forEach((app: any) => {
    const contractorId = app.applicant_id
    
    if (!rosterMap.has(contractorId)) {
      rosterMap.set(contractorId, {
        profile: Array.isArray(app.profiles) ? app.profiles[0] : app.profiles,
        totalEarned: 0, pendingPayments: 0, eventsWorked: 0, upcomingShifts: 0, jobHistory: []
      })
    }
    
    const contractor = rosterMap.get(contractorId)
    const rate = app.jobs?.rate || 0
    const isPaid = (app.payment_status || '').toLowerCase() === 'paid'
    const rawDate = app.jobs?.events?.event_date
    const eventDate = rawDate ? new Date(rawDate) : new Date()
    const isPastEvent = eventDate < new Date()

    if (isPaid) contractor.totalEarned += rate
    else contractor.pendingPayments += rate

    if (isPastEvent) contractor.eventsWorked += 1
    else contractor.upcomingShifts += 1

    contractor.jobHistory.push({
      eventName: app.jobs?.events?.title || 'Unknown Event',
      role: app.jobs?.title || 'Staff',
      date: eventDate,
      rate: rate,
      isPaid: isPaid,
      jobId: app.jobs?.id,
      appId: app.id
    })
  })

  // Convert map to array and sort history dates for the latest job logic
  const roster = Array.from(rosterMap.values()).map(contractor => {
    contractor.jobHistory.sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
    return contractor
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">My Roster</h1>
          <p className="text-gray-500">
            A complete financial and historical view of the contractors you have hired.
          </p>
        </div>

        {roster.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
            {/* FIX 2: Escaped the apostrophe so the Next.js build does not fail */}
            <p className="text-gray-500 font-medium mb-4">You haven&apos;t hired any contractors yet.</p>
            <Link href="/dashboard" className="bg-black text-white px-6 py-2 rounded-lg font-bold">
              Go to Event Manager
            </Link>
          </div>
        ) : (
          <SortableRoster initialRoster={roster} />
        )}
      </div>
    </div>
  )
}