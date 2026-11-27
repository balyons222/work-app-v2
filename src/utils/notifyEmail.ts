// Branded email template shared by /api/notify and /api/messages/bulk (server only).

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fxdevents.com').replace(/\/$/, '')

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export type Notice = {
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

export function emailHtml(n: Notice) {
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
