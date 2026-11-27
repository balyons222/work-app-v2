// Organizer Hub bulk messaging: who can be messaged, and limits. Shared by the modal and the API route.

export type BulkAudience = 'hired' | 'applicants' | 'pending' | 'not_selected'

export const BULK_MESSAGE_AUDIENCES: { value: BulkAudience; label: string }[] = [
  { value: 'hired', label: 'Everyone hired' },
  { value: 'applicants', label: 'Everyone (hired + still pending)' },
  { value: 'pending', label: 'Applicants not yet decided' },
  { value: 'not_selected', label: 'Applicants not selected' },
]

// Application statuses each audience covers
export function audienceStatuses(audience: BulkAudience): string[] {
  switch (audience) {
    case 'hired': return ['approved']
    case 'applicants': return ['approved', 'pending']
    case 'pending': return ['pending']
    case 'not_selected': return ['rejected']
  }
}

export const BULK_MESSAGE_MAX_CHARS = 2000
export const BULK_MESSAGE_MAX_RECIPIENTS = 200
// Abuse guard: most chat messages one organizer can send in a rolling hour (bulk + one-to-one).
// Each bulk recipient also gets an email, so this also caps email volume.
export const BULK_MESSAGE_MAX_PER_HOUR = 1000
