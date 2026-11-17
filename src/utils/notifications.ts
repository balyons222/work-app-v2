// Tell the server something happened; it verifies it and creates the in-app notification + email.
// The browser never chooses the recipient or the text (see src/app/api/notify/route.ts).
export type NotifyEvent =
  | { kind: 'new_applicant'; jobId: string }
  | { kind: 'review'; jobId: string; revieweeId: string }
  | { kind: 'invite'; eventId: string; inviteeId: string; jobId?: string | null }
  | { kind: 'invite_declined'; inviteId: string }

export async function notify(event: NotifyEvent): Promise<boolean> {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!res.ok) console.error('Notification failed:', res.status)
    return res.ok
  } catch (err) {
    console.error('Notification failed:', err)
    return false
  }
}
