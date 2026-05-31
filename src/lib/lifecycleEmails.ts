/**
 * Outbound lifecycle emails, sent via Resend (same provider/sender used for
 * auth + invite emails). Each function returns true when an email was actually
 * dispatched, false when skipped (e.g. Resend not configured). Hard send
 * failures throw so the queue can retry.
 */

const FROM = 'ETU 2175 <noreply@exploretheuniverse2175.com>'

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'https://exploretheuniverse2175.com'
  )
}

function shell(title: string, bodyHtml: string, footerNote?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">Explore the Universe 2175</div></div>
    <div class="content">
      <h2 style="margin-top:0;">${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>Explore the Universe 2175 — The Ultimate Space Adventure</p>
      ${footerNote ? `<p style="font-size:12px;">${footerNote}</p>` : ''}
    </div>
  </div>
</body>
</html>`.trim()
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not configured — "${subject}" not sent to ${to}`)
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })

  if (!res.ok) {
    // Throw so the queue retries.
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`)
  }
  return true
}

function greeting(displayName?: string): string {
  return displayName ? `Commander ${escapeHtml(displayName)}` : 'Commander'
}

export async function sendWelcomeEmail(email: string, displayName?: string): Promise<boolean> {
  const html = shell(
    '🚀 Welcome aboard, Commander',
    `<p>${greeting(displayName)}, your account is live. The galaxy of <strong>Explore the Universe 2175</strong> awaits.</p>
     <p>Jump into your dashboard to set up your commander profile and track your standing on the global leaderboard.</p>
     <a href="${siteUrl()}/dashboard" class="button">Open My Dashboard</a>`,
    `This email was sent to ${escapeHtml(email)}.`
  )
  return send(email, '🚀 Welcome to Explore the Universe 2175', html)
}

export async function sendVerifyNudgeEmail(email: string, displayName?: string): Promise<boolean> {
  const html = shell(
    '✅ Confirm your email',
    `<p>${greeting(displayName)}, your account is almost ready — we just need to confirm your email address.</p>
     <a href="${siteUrl()}/login" class="button">Confirm &amp; Sign In</a>
     <div class="warning">If you didn't create this account, you can safely ignore this email.</div>`,
    `This email was sent to ${escapeHtml(email)}.`
  )
  return send(email, '✅ Confirm your ETU 2175 email', html)
}

export async function sendDormantEmail(
  email: string,
  displayName?: string,
  churned = false
): Promise<boolean> {
  const title = churned ? '🛰️ The galaxy misses you' : '👋 Ready for your next mission?'
  const lead = churned
    ? `It's been a while, ${greeting(displayName)}. Whole new sectors have opened up since your last flight.`
    : `${greeting(displayName)}, your ship is fueled and waiting. Pick up right where you left off.`
  const html = shell(
    title,
    `<p>${lead}</p>
     <a href="${siteUrl()}/dashboard" class="button">Resume Your Journey</a>`,
    `This email was sent to ${escapeHtml(email)}.`
  )
  return send(email, churned ? '🛰️ Your universe is waiting' : '👋 Your next mission awaits', html)
}

export async function sendNewDeviceAlertEmail(
  email: string,
  displayName: string | undefined,
  details: { ip?: string | null; userAgent?: string | null; at: string }
): Promise<boolean> {
  const html = shell(
    '🔐 New sign-in to your account',
    `<p>${greeting(displayName)}, we noticed a sign-in from a device or location we haven't seen before.</p>
     <p style="text-align:left;font-size:14px;color:#334155;">
       <strong>When:</strong> ${escapeHtml(details.at)}<br/>
       <strong>IP:</strong> ${escapeHtml(details.ip || 'unknown')}<br/>
       <strong>Device:</strong> ${escapeHtml((details.userAgent || 'unknown').slice(0, 160))}
     </p>
     <div class="warning">If this was you, no action is needed. If not, reset your password immediately.</div>
     <a href="${siteUrl()}/forgot-password" class="button">Secure My Account</a>`,
    `This email was sent to ${escapeHtml(email)}.`
  )
  return send(email, '🔐 New sign-in to your ETU 2175 account', html)
}

export async function sendAdminDigestEmail(
  to: string,
  data: {
    stateCounts: Array<{ lifecycle_state: string; count: number }>
    newSignups: number
    failedLogins: number
  }
): Promise<boolean> {
  const rows = data.stateCounts
    .sort((a, b) => b.count - a.count)
    .map(
      (c) =>
        `<tr><td style="padding:4px 12px;text-align:left;">${escapeHtml(c.lifecycle_state)}</td>
         <td style="padding:4px 12px;text-align:right;"><strong>${c.count}</strong></td></tr>`
    )
    .join('')
  const html = shell(
    '📊 Daily user lifecycle digest',
    `<p style="text-align:left;"><strong>Last 24h:</strong> ${data.newSignups} new sign-ups · ${data.failedLogins} failed logins</p>
     <table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows}</table>
     <a href="${siteUrl()}/admin/analytics" class="button">Open Analytics</a>`
  )
  return send(to, '📊 ETU 2175 — Daily user lifecycle digest', html)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
