import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { RateLimiters, getEmailIdentifier } from '@/lib/ratelimit'

/**
 * POST /api/auth/magic-link - Send a magic link email for passwordless login
 *
 * Uses Supabase Admin API to generate the link, then sends via Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirectTo } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Rate limiting: 3 magic link attempts per hour per email+IP combination
    const identifier = getEmailIdentifier(email.toLowerCase(), request)
    const rateLimitResult = RateLimiters.signup(identifier)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many magic link requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          }
        }
      )
    }

    const supabase = createServerClient()

    // Get the base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000'

    // Build the redirect URL - where the user will land after clicking the magic link
    const finalRedirect = redirectTo || '/dashboard'
    const callbackURL = `${baseUrl}/api/auth/magic-link/callback?redirect=${encodeURIComponent(finalRedirect)}`

    // Check if user exists first
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

    let magicLinkUrl: string

    if (userExists) {
      // Generate magic link for existing user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: callbackURL,
        }
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.error('Magic link generation error:', linkError)
        return NextResponse.json(
          { error: linkError?.message || 'Failed to generate magic link' },
          { status: 400 }
        )
      }

      magicLinkUrl = linkData.properties.action_link
    } else {
      // Create new user first (without password - they'll use magic links)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm since we're sending them a magic link
        user_metadata: {
          username: email.split('@')[0],
        },
      })

      if (createError) {
        console.error('User creation error:', createError)
        return NextResponse.json(
          { error: createError.message || 'Failed to create account' },
          { status: 400 }
        )
      }

      // Now generate magic link for the new user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: callbackURL,
        }
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.error('Magic link generation error for new user:', linkError)
        return NextResponse.json(
          { error: linkError?.message || 'Failed to generate magic link' },
          { status: 400 }
        )
      }

      magicLinkUrl = linkData.properties.action_link
    }

    // Send the magic link email via Resend
    if (!process.env.RESEND_API_KEY) {
      // If Resend not configured, return the link for testing (remove in production)
      console.warn('RESEND_API_KEY not configured - magic link not sent via email')
      return NextResponse.json({
        success: true,
        message: 'Magic link generated (email service not configured)',
        // Only include link in development for testing
        ...(process.env.NODE_ENV === 'development' && { debugLink: magicLinkUrl })
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
    .button:hover { opacity: 0.9; }
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
      <h2 style="margin-top: 0;">🔮 Your Magic Link</h2>
      <p>Click the button below to sign in to your account. No password needed!</p>
      <a href="${magicLinkUrl}" class="button">Sign In to ETU 2175</a>
      <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour.</p>
      <div class="warning">
        ⚠️ If you didn't request this link, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>Explore the Universe 2175 - The Ultimate Space Adventure</p>
      <p style="font-size: 12px;">This email was sent to ${email}</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ETU 2175 <noreply@exploretheuniverse2175.com>',
        to: [email],
        subject: '🔮 Your Magic Link - Explore the Universe 2175',
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend email error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send magic link email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email inbox.'
    })
  } catch (error: any) {
    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
