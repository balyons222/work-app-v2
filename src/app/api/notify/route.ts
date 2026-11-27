import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { emailHtml, type Notice } from '@/src/utils/notifyEmail'

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
  | { kind: 'message'; messageId: string }

const resend = new Resend(process.env.RESEND_API_KEY)
const DEDUPE_WINDOW_MS = 10 * 60 * 1000
// Chat: one notice per burst. A follow-up message only notifies again once the recipient has read the
// earlier ones, or after this long.
const MESSAGE_RENOTIFY_MS = 60 * 60 * 1000
// Only messages sent just now can trigger a notice (stops replaying old message IDs)
const MESSAGE_MAX_AGE_MS = 5 * 60 * 1000
const PREVIEW_CHARS = 140

class NotifyError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

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

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new NotifyError('Unauthorized', 401)

    const event = (await req.json()) as NotifyEvent
    const admin = createAdminClient()
    const notice = await buildNotice(admin, user.id, event)
    if (!notice) return NextResponse.json({ success: true, skipped: true })

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

async function buildNotice(admin: ReturnType<typeof createAdminClient>, actorId: string, event: NotifyEvent): Promise<Notice | null> {
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

    case 'message': {
      // Actor must have sent this message, just now, in a conversation they belong to
      const { data: msg } = await admin
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, is_read')
        .eq('id', event.messageId)
        .maybeSingle()
      if (!msg || msg.sender_id !== actorId || !msg.conversation_id) throw new NotifyError('Message not found', 404)
      if (Date.now() - new Date(msg.created_at).getTime() > MESSAGE_MAX_AGE_MS) return null
      if (msg.is_read) return null   // already seen in an open chat window

      const { data: conv } = await admin
        .from('conversations')
        .select('id, organizer_id, worker_id, job_id')
        .eq('id', msg.conversation_id)
        .maybeSingle()
      if (!conv || (conv.organizer_id !== actorId && conv.worker_id !== actorId)) throw new NotifyError('Message not found', 404)
      const recipientId = conv.organizer_id === actorId ? conv.worker_id : conv.organizer_id
      if (!recipientId) return null
      const link = `/messages?id=${conv.id}`

      // Burst control: if earlier messages from this sender are still unread and we notified recently, stay quiet
      const { count: earlierUnread } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('sender_id', actorId)
        .eq('is_read', false)
        .neq('id', msg.id)
        .lte('created_at', msg.created_at)
      if (earlierUnread) {
        const { data: recent } = await admin
          .from('notifications')
          .select('id')
          .eq('user_id', recipientId)
          .eq('link', link)
          .gte('created_at', new Date(Date.now() - MESSAGE_RENOTIFY_MS).toISOString())
          .limit(1)
        if (recent && recent.length > 0) return null
      }

      const { data: who } = await admin.from('profiles').select('full_name, company_name').eq('id', actorId).maybeSingle()
      const name = (conv.organizer_id === actorId ? who?.company_name || who?.full_name : who?.full_name) || 'Someone'

      let jobTitle: string | null = null
      if (conv.job_id) {
        const { data: job } = await admin.from('jobs').select('title').eq('id', conv.job_id).maybeSingle()
        jobTitle = job?.title ?? null
      }

      const text = (msg.content || '').replace(/\s+/g, ' ').trim()
      const preview = text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS - 1).trimEnd()}…` : text
      const details: [string, string][] = []
      if (jobTitle) details.push(['About', jobTitle])

      return {
        userId: recipientId,
        title: `New message from ${name} 💬`,
        message: preview ? `"${preview}"` : `${name} sent you a message.`,
        subject: `${name} sent you a message${jobTitle ? ` about ${jobTitle}` : ''}`,
        details,
        link,
        cta: 'Read & reply',
        type: 'info',
      }
    }

    default:
      throw new NotifyError('Unknown notification type')
  }
}
