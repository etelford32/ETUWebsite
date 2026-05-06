/**
 * Send a user invitation email via Resend.
 * Returns true if sent (or skipped because Resend isn't configured in dev).
 */
export async function sendInviteEmail(opts: {
  email: string
  inviteUrl: string
  inviterName?: string
  message?: string
  role: string
}): Promise<{ sent: boolean; debugUrl?: string; error?: string }> {
  const { email, inviteUrl, inviterName, message, role } = opts

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — invite link not emailed')
    return {
      sent: false,
      debugUrl: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    }
  }

  const safeMessage = message
    ? `<div style="background:#f1f5f9;border-left:3px solid #6366f1;padding:12px 16px;margin:20px 0;border-radius:6px;color:#334155;font-style:italic;">${escapeHtml(
        message
      )}</div>`
    : ''

  const inviterLine = inviterName
    ? `<p>${escapeHtml(inviterName)} has invited you`
    : `<p>You've been invited`

  const html = `
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
    .role { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ede9fe; color: #6d28d9; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Explore the Universe 2175</div>
    </div>
    <div class="content">
      <h2 style="margin-top: 0;">🚀 You're invited to join ETU 2175</h2>
      ${inviterLine} to join the crew as a <span class="role">${escapeHtml(role)}</span>.</p>
      ${safeMessage}
      <p>Click below to set up your account. This invitation expires in 7 days.</p>
      <a href="${inviteUrl}" class="button">Accept Invitation</a>
      <p style="color:#64748b;font-size:13px;word-break:break-all;">Or copy this link: <br>${inviteUrl}</p>
    </div>
    <div class="footer">
      <p>Explore the Universe 2175</p>
      <p style="font-size: 12px;">This invitation was sent to ${escapeHtml(email)}.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ETU 2175 <noreply@exploretheuniverse2175.com>',
      to: [email],
      subject: '🚀 You are invited to Explore the Universe 2175',
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Resend invite email error:', text)
    return { sent: false, error: 'Failed to send invitation email' }
  }

  return { sent: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
