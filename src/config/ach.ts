// Bank (ACH) payments for hires. ACH disputes on personal accounts can arrive up to 60 days later and
// usually can't be contested, so ACH is limited to:
//   1. organizers an admin has switched on (profiles.ach_enabled),
//   2. a linked BUSINESS bank account (profiles.ach_bank_status = 'verified'),
//   3. a cap per hire, and
//   4. organizers who have completed at least one paid job (by card) first.

export const ACH_MAX_CENTS = 1_000_000 // $10,000 per hire (labor + platform fee)

export const ACH_REQUIRE_PRIOR_PAID_JOB = true

export type AchBankStatus = 'verified' | 'needs_review' | 'rejected'

export const ACH_TERMS_VERSION = '2026-11-17'

// Owner names from the bank vs. the organizer's company name. Loose on purpose (case, punctuation,
// LLC/Inc suffixes); anything that doesn't match goes to manual review rather than being rejected.
const SUFFIXES = /\b(llc|l\.l\.c|inc|incorporated|corp|corporation|co|company|ltd|limited|pllc|lp|llp)\b/g
export function normalizeBusinessName(name: string): string {
  return name.toLowerCase().replace(/[.,'&]/g, ' ').replace(SUFFIXES, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}
export function ownerMatchesCompany(ownerNames: string[], companyName: string | null | undefined): boolean {
  const company = normalizeBusinessName(companyName || '')
  if (!company) return false
  return ownerNames.some(n => {
    const owner = normalizeBusinessName(n)
    return !!owner && (owner.includes(company) || company.includes(owner))
  })
}
