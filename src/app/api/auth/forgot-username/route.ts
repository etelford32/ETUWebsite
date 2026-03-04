import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Rate limit
    const identifier = getEmailIdentifier(normalizedEmail, request)
    const rateLimitResult = RateLimiters.signup(identifier)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = createServerClient()

    // Find auth user by email
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users?.find((u: { id: string; email?: string }) => u.email?.toLowerCase() === normalizedEmail)

    // Always return success — don't reveal whether account exists
    if (!authUser) {
      return NextResponse.json({
        success: true,
        message: 'If an account is registered with that email, your commander name has been sent.',
      })
    }

    // Get username from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.id)
      .single()

    const username = (profile as any)?.username

    if (!username || !process.env.RESEND_API_KEY) {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured — commander name is:', username)
      }
      return NextResponse.json({
        success: true,
        message: 'If an account is registered with that email, your commander name has been sent.',
      })
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000'

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
    .name-box { background: #1e293b; color: #a5f3fc; font-family: monospace; font-size: 28px; font-weight: bold; padding: 20px 40px; border-radius: 8px; display: inline-block; margin: 20px 0; letter-spacing: 2px; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Explore the Universe 2175</div>
    </div>
    <div class="content">
      <h2 style="margin-top: 0;">🚀 Your Commander Name</h2>
      <p>Here is the commander name registered to this email address:</p>
      <div class="name-box">${username}</div>
      <p style="color: #64748b;">Use this name — or your email address — to sign in.</p>
      <a href="${baseUrl}/login" class="button">Sign In to ETU 2175</a>
    </div>
    <div class="footer">
      <p>Explore the Universe 2175 — The Ultimate Space Adventure</p>
      <p style="font-size: 12px;">This email was sent to ${normalizedEmail}</p>
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
        to: [normalizedEmail],
        subject: '🚀 Your ETU 2175 Commander Name',
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      console.error('Resend error on forgot-username:', await emailRes.text())
    }

    return NextResponse.json({
      success: true,
      message: 'If an account is registered with that email, your commander name has been sent.',
    })
  } catch (error: any) {
    console.error('Forgot username error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
