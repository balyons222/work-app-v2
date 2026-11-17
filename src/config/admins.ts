// Platform admins (admin page + admin API routes). One list so the page and routes can't drift apart.
export const ADMIN_EMAILS = ['brian@fxdevents.com', 'brian@l27consulting.com']

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
