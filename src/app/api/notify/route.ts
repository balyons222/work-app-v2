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

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com').replace(/\/$/, '')
const DEDUPE_WINDOW_MS = 10 * 60 * 1000

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

class NotifyError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

type Notice = { userId: string; title: string; message: string; link: string; type: 'info' | 'success' }

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
          subject: notice.title,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
              <h2 style="color: #0f172a;">${escapeHtml(notice.title)}</h2>
              <p style="font-size: 16px; color: #555;">${escapeHtml(notice.message)}</p>
              <br/>
              <a href="${SITE_URL}${notice.link}"
                 style="background-color: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                 Open FxD Events
              </a>
              <p style="margin-top: 30px; font-size: 12px; color: #999;">You received this notification from FxD Events.</p>
            </div>
          `,
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
      return {
        userId: job.organizer_id,
        title: 'New Applicant 📝',
        message: `${who} applied for "${job.title}"${where}. Review their profile now.`,
        link: job.event_id ? `/dashboard/event/${job.event_id}` : '/dashboard',
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
      const { data: ev } = await admin.from('events').select('id, title, organizer_id').eq('id', event.eventId).maybeSingle()
      if (!ev || ev.organizer_id !== actorId) throw new NotifyError('Forbidden', 403)

      let invite = admin.from('event_invitations').select('id').eq('event_id', event.eventId).eq('invitee_id', event.inviteeId)
      invite = event.jobId ? invite.eq('job_id', event.jobId) : invite
      const { data: inv } = await invite.limit(1).maybeSingle()
      if (!inv) throw new NotifyError('Invitation not found', 404)

      let jobTitle: string | null = null
      if (event.jobId) {
        const { data: job } = await admin.from('jobs').select('title').eq('id', event.jobId).eq('event_id', event.eventId).maybeSingle()
        jobTitle = job?.title ?? null
      }
      return {
        userId: event.inviteeId,
        title: "You're Invited! 🎟️",
        message: jobTitle
          ? `You've been invited to apply for the "${jobTitle}" role at ${ev.title}.`
          : `You've been invited to ${ev.title}.`,
        link: '/dashboard',
        type: 'info',
      }
    }

    default:
      throw new NotifyError('Unknown notification type')
  }
}
