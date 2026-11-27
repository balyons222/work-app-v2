import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import { emailHtml, type Notice } from '@/src/utils/notifyEmail'
import { isOrganizerHub } from '@/src/config/subscriptions'
import {
  audienceStatuses, BULK_MESSAGE_AUDIENCES, BULK_MESSAGE_MAX_CHARS, BULK_MESSAGE_MAX_PER_HOUR,
  BULK_MESSAGE_MAX_RECIPIENTS, type BulkAudience,
} from '@/src/config/bulkMessages'

/**
 * Organizer Hub bulk messaging.
 *
 * The browser sends the event, an audience (hired / pending / ...), an optional role and the text.
 * The server checks the plan and event ownership, and picks the recipients itself from applications
 * to that event's roles, so an organizer can only reach people who applied to their own jobs.
 * Each recipient gets the message in their own one-to-one chat (replies stay private), plus an
 * in-app notice and an email.
 */

const resend = new Resend(process.env.RESEND_API_KEY)
const PREVIEW_CHARS = 500
const EMAIL_BATCH = 100 // Resend batch limit

class BulkError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

type Body = { eventId?: unknown; jobId?: unknown; audience?: unknown; content?: unknown }

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new BulkError('Unauthorized', 401)

    const body = (await req.json().catch(() => ({}))) as Body
    const eventId = typeof body.eventId === 'string' ? body.eventId : ''
    const jobId = typeof body.jobId === 'string' && body.jobId ? body.jobId : null
    const audience = body.audience as BulkAudience
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!eventId) throw new BulkError('Missing event')
    if (!BULK_MESSAGE_AUDIENCES.some(a => a.value === audience)) throw new BulkError('Choose who to send to')
    if (!content) throw new BulkError('Write a message first')
    if (content.length > BULK_MESSAGE_MAX_CHARS) throw new BulkError(`Messages can be up to ${BULK_MESSAGE_MAX_CHARS} characters`)

    const admin = createAdminClient()

    const { data: me } = await admin.from('profiles').select('plan_tier, full_name, company_name').eq('id', user.id).maybeSingle()
    if (!isOrganizerHub(me?.plan_tier)) throw new BulkError('Bulk messaging is part of Organizer Hub', 403)

    const { data: ev } = await admin.from('events').select('id, title, organizer_id').eq('id', eventId).maybeSingle()
    if (!ev || ev.organizer_id !== user.id) throw new BulkError('Event not found', 404)

    const { data: jobs } = await admin.from('jobs').select('id, title').eq('event_id', eventId)
    const targetJobs = (jobs || []).filter(j => !jobId || j.id === jobId)
    if (jobId && targetJobs.length === 0) throw new BulkError('Role not found', 404)
    if (targetJobs.length === 0) throw new BulkError('Nobody to message yet')
    const jobTitle = new Map(targetJobs.map(j => [j.id, j.title as string]))

    const { data: apps, error: appsError } = await admin
      .from('applications')
      .select('id, job_id, applicant_id, status, created_at')
      .in('job_id', targetJobs.map(j => j.id))
      .order('created_at', { ascending: true })
    if (appsError) throw new Error(appsError.message)

    // One message per person, even if they applied to several roles (first matching application wins)
    const statuses = audienceStatuses(audience)
    const byPerson = new Map<string, { id: string; job_id: string; applicant_id: string }>()
    for (const a of apps || []) {
      if (!a.applicant_id || a.applicant_id === user.id) continue
      if (!statuses.includes((a.status || '').toLowerCase())) continue
      if (!byPerson.has(a.applicant_id)) byPerson.set(a.applicant_id, a)
    }
    const targets = [...byPerson.values()]
    if (targets.length === 0) throw new BulkError('Nobody matches this audience and role')
    if (targets.length > BULK_MESSAGE_MAX_RECIPIENTS) {
      throw new BulkError(`You can message up to ${BULK_MESSAGE_MAX_RECIPIENTS} people at once. Pick a single role.`)
    }

    // Abuse guard: cap chat messages (and so emails) per organizer per hour
    const { count: lastHour } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    if ((lastHour ?? 0) + targets.length > BULK_MESSAGE_MAX_PER_HOUR) {
      throw new BulkError('You’ve sent a lot of messages in the last hour. Please try again later.', 429)
    }

    // Find or create each person's one-to-one chat for that application
    const appIds = targets.map(t => t.id)
    const convByApp = new Map<string, string>()
    const loadConversations = async () => {
      const { data } = await admin.from('conversations').select('id, application_id').in('application_id', appIds)
      for (const c of data || []) if (c.application_id) convByApp.set(c.application_id, c.id)
    }
    await loadConversations()
    const missing = targets.filter(t => !convByApp.has(t.id))
    if (missing.length > 0) {
      const rows = missing.map(t => ({
        job_id: t.job_id, application_id: t.id, organizer_id: user.id, worker_id: t.applicant_id,
      }))
      const { error } = await admin.from('conversations').insert(rows)
      if (error?.code === '23505') {
        // Someone opened one of these chats at the same moment: insert the rest one at a time
        for (const row of rows) await admin.from('conversations').insert(row)
      } else if (error) {
        throw new Error(error.message)
      }
      await loadConversations()
    }

    const sendable = targets.filter(t => convByApp.has(t.id))
    if (sendable.length === 0) throw new Error('Could not open conversations')

    const { error: msgError } = await admin.from('messages').insert(sendable.map(t => ({
      conversation_id: convByApp.get(t.id), sender_id: user.id, content, is_read: false,
    })))
    if (msgError) throw new Error(msgError.message)

    // In-app notices + emails (failures here never undo the messages)
    const name = me?.company_name || me?.full_name || 'Your organizer'
    const eventTitle = ev.title || 'your event'
    const flat = content.replace(/\s+/g, ' ')
    const preview = flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS - 1).trimEnd()}…` : flat
    const notices: Notice[] = sendable.map(t => ({
      userId: t.applicant_id,
      title: `New message from ${name} 💬`,
      message: `"${preview}"`,
      subject: `${name} sent a message about ${eventTitle}`,
      details: ([['Event', ev.title || ''], ['Role', jobTitle.get(t.job_id) || '']] as [string, string][]).filter(([, v]) => v),
      link: `/messages?id=${convByApp.get(t.id)}`,
      cta: 'Read & reply',
      type: 'info',
    }))

    const { error: noticeError } = await admin.from('notifications').insert(notices.map(n => ({
      user_id: n.userId, title: n.title, message: n.message, link: n.link, type: n.type, is_read: false,
    })))
    if (noticeError) console.error('[bulk-message] in-app insert failed:', noticeError.message)

    try {
      const emails: { to: string; notice: Notice }[] = []
      for (let i = 0; i < notices.length; i += 10) {
        const chunk = notices.slice(i, i + 10)
        const found = await Promise.all(chunk.map(n => admin.auth.admin.getUserById(n.userId)))
        found.forEach((r, k) => {
          const email = r.data?.user?.email
          if (email) emails.push({ to: email, notice: chunk[k] })
        })
      }
      for (let i = 0; i < emails.length; i += EMAIL_BATCH) {
        const { error } = await resend.batch.send(emails.slice(i, i + EMAIL_BATCH).map(e => ({
          from: 'FxD Events <hello@fxdevents.com>',
          to: e.to,
          subject: e.notice.subject || e.notice.title,
          html: emailHtml(e.notice),
        })))
        if (error) console.error('[bulk-message] email batch failed:', error.message)
      }
    } catch (emailErr: any) {
      console.error('[bulk-message] email failed:', emailErr?.message)
    }

    return NextResponse.json({ success: true, sent: sendable.length })
  } catch (err: any) {
    if (err instanceof BulkError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[bulk-message] error:', err?.message)
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 })
  }
}
