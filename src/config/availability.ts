// General availability a contractor can advertise. Stored in profiles.typical_availability
// as a comma-separated string, e.g. "Weekdays, Weekends".
export const AVAILABILITY_OPTIONS = [
  { value: 'Weekdays', hint: 'Mon–Fri daytime' },
  { value: 'Weekends', hint: 'Sat & Sun' },
  { value: 'Evenings', hint: 'After 5pm' },
  { value: 'Overnight', hint: 'Load-in / load-out shifts' },
  { value: 'Short notice', hint: 'Can take same-week gigs' },
] as const

export function parseAvailability(stored: string | null | undefined): string[] {
  if (!stored) return []
  const known = new Set<string>(AVAILABILITY_OPTIONS.map(o => o.value))
  return stored.split(',').map(s => s.trim()).filter(s => known.has(s))
}

export function formatAvailability(selected: string[]): string | null {
  // Keep the canonical order regardless of click order
  const ordered = AVAILABILITY_OPTIONS.map(o => o.value).filter(v => selected.includes(v))
  return ordered.length ? ordered.join(', ') : null
}
