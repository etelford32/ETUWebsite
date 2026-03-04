import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'
import { resolveEmailFromInput } from '@/lib/resolveEmail'
import { createResetToken } from '@/lib/resetTokenStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailOrUsername } = body

    if (!emailOrUsername) {
      return NextResponse.json(
        { error: 'Email or commander name is required' },
        { status: 400 }
      )
    }

    // Rate limit on raw input
    const identifier = getEmailIdentifier(emailOrUsername.toLowerCase(), request)
    const rateLimitResult = RateLimiters.signup(identifier)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfter?.toString() || '3600' } }
      )
    }

    const supabase = createServerClient()

    // Resolve username → email
    const email = await resolveEmailFromInput(emailOrUsername, supabase)

    // Always return success to prevent account enumeration
    if (!email) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent.',
      })
    }

    // Find the user's ID and username for the email
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(
      (u: { id: string; email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!authUser) {
      return NextResponse.json({ success: true, message: 'If an account exists, a password reset link has been sent.' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.id)
      .single()

    const username = (profile as any)?.username || email.split('@')[0]

    // Create a secure reset token
    const token = createResetToken(authUser.id, email)

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured — reset link:', resetUrl)
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a password reset link has been sent.',
        ...(process.env.NODE_ENV === 'development' && { debugLink: resetUrl }),
      })
    }

    const emailHtml = `
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
    <div class="header">
      <div class="logo">Explore the Universe 2175</div>
    </div>
    <div class="content">
      <h2 style="margin-top: 0;">🔐 Password Reset Request</h2>
      <p>Commander <strong>${username}</strong>, we received a request to reset your password.</p>
      <p>Click the button below to choose a new password:</p>
      <a href="${resetUrl}" class="button">Reset My Password</a>
      <p style="color: #64748b; font-size: 14px;">This link expires in <strong>1 hour</strong>.</p>
      <div class="warning">
        ⚠️ If you didn't request a password reset, you can safely ignore this email. Your password has not been changed.
      </div>
    </div>
    <div class="footer">
      <p>Explore the Universe 2175 — The Ultimate Space Adventure</p>
      <p style="font-size: 12px;">This email was sent to ${email}</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ETU 2175 <noreply@exploretheuniverse2175.com>',
        to: [email],
        subject: '🔐 Reset Your ETU 2175 Password',
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      console.error('Resend error on forgot-password:', await emailRes.text())
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
