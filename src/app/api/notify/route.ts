import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'

/**
 * Notifications (in-app + email) for things that just happened.
 *
 * The browser only says WHAT happened and with which IDs. The server checks that the signed-in user
 * really did it, picks the recipient, and writes the title/message/link itself. The browser never
 * supplies recipients or text, so this can't be used to send arbitrary email from our domain.
 */
type NotifyEvent =
  | { kind: 'new_applicant'; jobId: string }
  | { kind: 'review'; jobId: string; revieweeId: string }
  | { kind: 'invite'; eventId: string; inviteeId: string; jobId?: string | null }
  | { kind: 'invite_declined'; inviteId: string }

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com').replace(/\/$/, '')
const DEDUPE_WINDOW_MS = 10 * 60 * 1000

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

class NotifyError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

type Notice = {
  userId: string
  title: string                    // in-app title
  message: string                  // in-app text (also the email's lead paragraph)
  link: string
  type: 'info' | 'success'
  subject?: string                 // email subject (defaults to title)
  details?: [string, string][]     // email detail rows, e.g. ['Pay', '$25/hr']
  cta?: string                     // email button label
}

const BRAND_NAVY = '#0B2A4A'
const BRAND_TEAL = '#00C4B4'

// Dates are stored as YYYY-MM-DD; format in UTC so the day never shifts
function formatDate(d: string | null | undefined, style: 'long' | 'short' = 'long') {
  if (!d) return null
  const date = new Date(`${d.slice(0, 10)}T00:00:00Z`)
  if (isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', style === 'long'
    ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatTime(t: string | null | undefined) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return null
  const hour = ((h + 11) % 12) + 1
  return `${hour}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function formatPay(rate: number | null | undefined, rateType: string | null | undefined, hours: number | null | undefined) {
  if (rate == null) return null
  const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, '')}`
  if (rateType === 'hourly') {
    return hours ? `${money(rate)}/hr (about ${hours} hrs, est. ${money(rate * hours)})` : `${money(rate)}/hr`
  }
  return `${money(rate)} flat`
}

function emailHtml(n: Notice) {
  const rows = (n.details || [])
    .map(([k, v]) => `
      <tr>
        <td style="padding: 6px 12px 6px 0; color: #64748b; font-size: 14px; white-space: nowrap; vertical-align: top;">${escapeHtml(k)}</td>
        <td style="padding: 6px 0; color: ${BRAND_NAVY}; font-size: 14px; font-weight: bold;">${escapeHtml(v)}</td>
      </tr>`)
    .join('')
  return `
    <div style="background: #f8fafc; padding: 24px 12px; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="padding: 20px 28px; border-bottom: 3px solid ${BRAND_TEAL};">
          <img src="${SITE_URL}/fxd-v2.png" alt="FxD Events" width="110" style="display: block; height: auto;" />
        </div>
        <div style="padding: 28px;">
          <h2 style="margin: 0 0 12px; color: ${BRAND_NAVY}; font-size: 22px;">${escapeHtml(n.title)}</h2>
          <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5; color: #334155;">${escapeHtml(n.message)}</p>
          ${rows ? `<table role="presentation" style="border-collapse: collapse; margin: 0 0 24px;">${rows}</table>` : ''}
          <a href="${SITE_URL}${n.link}"
             style="display: inline-block; background: ${BRAND_TEAL}; color: ${BRAND_NAVY}; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
            ${escapeHtml(n.cta || 'Open FxD Events')}
          </a>
        </div>
        <div style="padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
          You're receiving this email because of activity on your FxD Events account.
          <a href="${SITE_URL}/dashboard" style="color: #64748b;">Go to your dashboard</a>
        </div>
      </div>
    </div>
  `
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new NotifyError('Unauthorized', 401)

    const event = (await req.json()) as NotifyEvent
    const admin = createAdminClient()
    const notice = await buildNotice(admin, user.id, event)

    // Replay guard: the same notice to the same person within the window is sent once
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
    const { data: recent } = await admin
      .from('notifications')
      .select('id')
      .eq('user_id', notice.userId)
      .eq('title', notice.title)
      .eq('message', notice.message)
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length > 0) return NextResponse.json({ success: true, deduped: true })

    const { error: dbError } = await admin.from('notifications').insert({
      user_id: notice.userId,
      title: notice.title,
      message: notice.message,
      link: notice.link,
      type: notice.type,
      is_read: false,
    })
    if (dbError) console.error('[notify] in-app insert failed:', dbError.message)

    // Email (failure never fails the request)
    try {
      const { data: target } = await admin.auth.admin.getUserById(notice.userId)
      const email = target?.user?.email
      if (email) {
        await resend.emails.send({
          from: 'FxD Events <hello@fxdevents.com>',
          to: email,
          subject: notice.subject || notice.title,
          html: emailHtml(notice),
        })
      }
    } catch (emailErr: any) {
      console.error('[notify] email failed:', emailErr?.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof NotifyError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[notify] error:', err?.message)
    return NextResponse.json({ error: 'Could not send notification' }, { status: 500 })
  }
}

async function buildNotice(admin: ReturnType<typeof createAdminClient>, actorId: string, event: NotifyEvent): Promise<Notice> {
  switch (event?.kind) {
    case 'new_applicant': {
      // Actor must actually have applied to this job
      const { data: app } = await admin
        .from('applications')
        .select('id, jobs ( title, organizer_id, event_id, events ( title ) )')
        .eq('job_id', event.jobId)
        .eq('applicant_id', actorId)
        .limit(1)
        .maybeSingle()
      const job: any = Array.isArray(app?.jobs) ? app?.jobs[0] : app?.jobs
      if (!app || !job?.organizer_id) throw new NotifyError('Application not found', 404)
      const eventRow: any = Array.isArray(job.events) ? job.events[0] : job.events

      const { data: applicant } = await admin.from('profiles').select('full_name').eq('id', actorId).maybeSingle()
      const who = applicant?.full_name || 'Someone'
      const where = eventRow?.title ? ` at ${eventRow.title}` : ''
      const link = job.event_id ? `/dashboard/event/${job.event_id}` : '/dashboard'

      // Applying is what accepts an invitation: to this job, or to the whole event
      let wasInvited = false
      if (job.event_id) {
        const { data: accepted } = await admin
          .from('event_invitations')
          .update({ status: 'accepted' })
          .eq('invitee_id', actorId)
          .eq('event_id', job.event_id)
          .eq('status', 'pending')
          .or(`job_id.eq.${event.jobId},job_id.is.null`)
          .select('id')
        wasInvited = (accepted?.length ?? 0) > 0
      }

      if (wasInvited) {
        return {
          userId: job.organizer_id,
          title: 'Invitation Accepted ✅',
          message: `${who} accepted your invitation and applied for "${job.title}"${where}.`,
          subject: `${who} accepted your invitation: ${job.title}${where}`,
          link,
          cta: 'Review applicant',
          type: 'success',
        }
      }
      return {
        userId: job.organizer_id,
        title: 'New Applicant 📝',
        message: `${who} applied for "${job.title}"${where}. Review their profile now.`,
        subject: `New applicant for ${job.title}${where}`,
        link,
        cta: 'Review applicant',
        type: 'info',
      }
    }

    case 'review': {
      // Actor must have written a review of this person for this job
      const { data: review } = await admin
        .from('reviews')
        .select('id')
        .eq('reviewer_id', actorId)
        .eq('reviewee_id', event.revieweeId)
        .eq('job_id', event.jobId)
        .limit(1)
        .maybeSingle()
      if (!review) throw new NotifyError('Review not found', 404)

      const { data: reviewee } = await admin.from('profiles').select('role').eq('id', event.revieweeId).maybeSingle()
      const isOrganizer = reviewee?.role?.toLowerCase() === 'organizer'
      return {
        userId: event.revieweeId,
        title: 'New Review! ⭐',
        message: 'You received a new review.',
        link: isOrganizer ? '/dashboard' : `/profile/${event.revieweeId}`,
        type: 'success',
      }
    }

    case 'invite': {
      // Actor must own the event, and the invitation must exist
      const { data: ev } = await admin.from('events').select('id, title, organizer_id, event_date, location').eq('id', event.eventId).maybeSingle()
      if (!ev || ev.organizer_id !== actorId) throw new NotifyError('Forbidden', 403)

      let invite = admin.from('event_invitations').select('id').eq('event_id', event.eventId).eq('invitee_id', event.inviteeId)
      invite = event.jobId ? invite.eq('job_id', event.jobId) : invite
      const { data: inv } = await invite.limit(1).maybeSingle()
      if (!inv) throw new NotifyError('Invitation not found', 404)

      const { data: org } = await admin.from('profiles').select('full_name, company_name').eq('id', ev.organizer_id).maybeSingle()
      const host = org?.company_name || org?.full_name || 'An organizer'

      let job: { title: string; rate: number | null; rate_type: string | null; estimated_hours: number | null;
                 start_date: string | null; start_time: string | null; end_time: string | null; location: string | null } | null = null
      if (event.jobId) {
        const { data } = await admin
          .from('jobs')
          .select('title, rate, rate_type, estimated_hours, start_date, start_time, end_time, location')
          .eq('id', event.jobId).eq('event_id', event.eventId).maybeSingle()
        job = data
      }

      const dateRaw = job?.start_date || ev.event_date
      const date = formatDate(dateRaw)
      const shortDate = formatDate(dateRaw, 'short')
      const start = formatTime(job?.start_time), end = formatTime(job?.end_time)
      const time = start ? (end ? `${start} – ${end}` : start) : null
      const location = job?.location || ev.location || null
      const pay = job ? formatPay(job.rate, job.rate_type, job.estimated_hours) : null

      const details: [string, string][] = []
      if (job) details.push(['Role', job.title])
      details.push(['Event', ev.title])
      details.push(['Hosted by', host])
      if (date) details.push(['Date', time ? `${date}, ${time}` : date])
      if (location) details.push(['Location', location])
      if (pay) details.push(['Pay', pay])

      const on = date ? ` on ${date}` : ''
      return {
        userId: event.inviteeId,
        title: "You're Invited! 🎟️",
        message: job
          ? `${host} invited you to work as ${job.title} at ${ev.title}${on}. Apply to let them know you're interested.`
          : `${host} invited you to work at ${ev.title}${on}. Pick a role and apply to let them know you're interested.`,
        subject: job
          ? `${host} invited you to work ${job.title} at ${ev.title}${shortDate ? ` (${shortDate})` : ''}`
          : `${host} invited you to work at ${ev.title}${shortDate ? ` (${shortDate})` : ''}`,
        details,
        link: event.jobId ? `/jobs/${event.jobId}` : `/events/${event.eventId}`,
        cta: event.jobId ? 'View job & apply' : 'View event & apply',
        type: 'info',
      }
    }

    case 'invite_declined': {
      // Actor must be the invitee, and must actually have declined
      const { data: inv } = await admin
        .from('event_invitations')
        .select('id, status, invitee_id, event_id, job_id')
        .eq('id', event.inviteId)
        .maybeSingle()
      if (!inv || inv.invitee_id !== actorId || inv.status !== 'declined' || !inv.event_id) {
        throw new NotifyError('Invitation not found', 404)
      }
      const { data: ev } = await admin.from('events').select('title, organizer_id').eq('id', inv.event_id).maybeSingle()
      if (!ev?.organizer_id) throw new NotifyError('Invitation not found', 404)

      let jobTitle: string | null = null
      if (inv.job_id) {
        const { data: job } = await admin.from('jobs').select('title').eq('id', inv.job_id).maybeSingle()
        jobTitle = job?.title ?? null
      }
      const { data: who } = await admin.from('profiles').select('full_name').eq('id', actorId).maybeSingle()
      const name = who?.full_name || 'A contractor'
      const what = jobTitle ? `"${jobTitle}" at ${ev.title}` : ev.title
      return {
        userId: ev.organizer_id,
        title: 'Invitation Declined',
        message: `${name} declined your invitation to ${what}. You can invite someone else from your event page.`,
        subject: `${name} declined your invitation to ${what}`,
        link: `/dashboard/event/${inv.event_id}`,
        cta: 'Find other talent',
        type: 'info',
      }
    }

    default:
      throw new NotifyError('Unknown notification type')
  }
}
