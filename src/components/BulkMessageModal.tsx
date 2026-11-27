'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BULK_MESSAGE_MAX_CHARS, BULK_MESSAGE_AUDIENCES, type BulkAudience, audienceStatuses } from '@/src/config/bulkMessages'

// Organizer Hub: send one message to many people on this event. Each person gets it in their own
// one-to-one chat with the organizer (replies stay private), plus an in-app notice and an email.
// The server (src/app/api/messages/bulk/route.ts) re-checks the plan, the event owner and the recipients.

type Props = {
  eventId: string
  eventTitle?: string
  jobs: any[]
  hasHub: boolean
  onClose: () => void
}

export default function BulkMessageModal({ eventId, eventTitle, jobs, hasHub, onClose }: Props) {
  const [audience, setAudience] = useState<BulkAudience>('hired')
  const [jobId, setJobId] = useState<string>('all')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  // Preview count: unique people matching the audience and role (the server computes the real list)
  const recipientCount = useMemo(() => {
    const statuses = audienceStatuses(audience)
    const people = new Set<string>()
    for (const job of jobs) {
      if (jobId !== 'all' && job.id !== jobId) continue
      for (const app of job.applications || []) {
        if (statuses.includes((app.status || '').toLowerCase())) people.add(app.applicant_id)
      }
    }
    return people.size
  }, [jobs, audience, jobId])

  const trimmed = content.trim()
  const canSend = hasHub && !sending && trimmed.length > 0 && recipientCount > 0

  const send = async () => {
    if (!canSend) return
    setSending(true)
    const toastId = toast.loading(`Sending to ${recipientCount} ${recipientCount === 1 ? 'person' : 'people'}...`)
    try {
      const res = await fetch('/api/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, jobId: jobId === 'all' ? null : jobId, audience, content: trimmed }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not send message')
      toast.success(`Message sent to ${body.sent} ${body.sent === 1 ? 'person' : 'people'}`, { id: toastId })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Could not send message', { id: toastId })
      setSending(false)
    }
  }

  const labelClass = 'block text-xs font-bold text-slate-400 uppercase mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-black text-primary mb-1">Message your team</h3>
        <p className="text-sm text-slate-500 mb-6">
          {eventTitle ? <>For <span className="font-bold">{eventTitle}</span>. </> : null}
          Each person gets it in their private chat with you, plus an email. Replies come back to you individually.
        </p>

        {!hasHub ? (
          <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-6">
            <p className="font-black text-primary mb-1">Bulk messaging is part of Organizer Hub</p>
            <p className="text-sm text-slate-500 mb-4">
              Send call times, schedule changes and reminders to everyone hired or applied in one step.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 font-bold text-slate-400 hover:text-slate-600">Close</button>
              <Link href="/pricing" className="bg-primary text-white font-bold px-5 py-2.5 rounded-lg hover:bg-slate-800">See Organizer Hub</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass} htmlFor="bulk-audience">Send to</label>
                <select id="bulk-audience" value={audience} onChange={e => setAudience(e.target.value as BulkAudience)}
                  className="w-full p-3 bg-slate-50 border rounded-xl">
                  {BULK_MESSAGE_AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="bulk-role">Role</label>
                <select id="bulk-role" value={jobId} onChange={e => setJobId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl">
                  <option value="all">All roles</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>

            <label className={labelClass} htmlFor="bulk-content">Message</label>
            <textarea
              id="bulk-content"
              value={content}
              onChange={e => setContent(e.target.value.slice(0, BULK_MESSAGE_MAX_CHARS))}
              className="w-full p-4 bg-slate-50 border rounded-xl h-36 mb-1"
              placeholder="e.g. Load-in moved to 6:30 AM. Park in Lot C and check in at the loading dock."
            />
            <p className="text-right text-[11px] text-slate-400 mb-4">{content.length}/{BULK_MESSAGE_MAX_CHARS}</p>

            <p className={`text-sm font-bold mb-6 ${recipientCount ? 'text-slate-700' : 'text-red-500'}`}>
              {recipientCount
                ? `${recipientCount} ${recipientCount === 1 ? 'person' : 'people'} will receive this.`
                : 'Nobody matches this audience and role.'}
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} disabled={sending} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600">Cancel</button>
              <button onClick={send} disabled={!canSend}
                className="flex-1 bg-secondary text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
