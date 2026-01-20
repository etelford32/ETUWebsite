/**
 * Magic Sign-In Link API Route
 * Generates a secure magic link token and sends it via email for passwordless authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { sendMagicLinkEmail } from '@/lib/email';
import { RateLimiters } from '@/lib/ratelimit';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 requests per 15 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    const rateLimitKey = `magic-link:${clientIp}`;
    const rateLimitResult = RateLimiters.magicLink(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many magic link requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '900'
          }
        }
      );
    }

    // Parse request body
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase service client
    const supabase = createServerClient();

    // Check if user exists with this email
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      // Don't reveal if email exists - always return success
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a magic sign-in link has been sent.'
      });
    }

    const existingUser = user.users.find(u => u.email === email.toLowerCase());

    if (!existingUser) {
      // Don't reveal if email doesn't exist - security best practice
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a magic sign-in link has been sent.'
      });
    }

    // Generate secure magic link token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 15 minutes (shorter than password reset for security)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Get user agent for security logging
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Invalidate any existing magic link tokens for this user
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', existingUser.id)
      .eq('token_type', 'magic_link')
      .is('used_at', null);

    // Store token in database
    const { error: tokenError } = await (supabase as any)
      .from('auth_tokens')
      .insert({
        user_id: existingUser.id,
        token,
        token_type: 'magic_link',
        email: email.toLowerCase(),
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
      });

    if (tokenError) {
      console.error('Error creating magic link token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create magic sign-in link' },
        { status: 500 }
      );
    }

    // Send magic link email
    const emailSent = await sendMagicLinkEmail(email, token);

    if (!emailSent) {
      console.error('Failed to send magic link email');
      // Still return success to user (don't reveal email sending failures)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a magic sign-in link has been sent.'
    });

  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
