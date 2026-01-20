/**
 * Forgot Password API Route
 * Generates a secure password reset token and sends it via email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { sendPasswordResetEmail } from '@/lib/email';
import { RateLimiters } from '@/lib/ratelimit';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 requests per hour per IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    const rateLimitKey = `forgot-password:${clientIp}`;
    const rateLimitResult = RateLimiters.forgotPassword(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
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
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const existingUser = user.users.find(u => u.email === email.toLowerCase());

    if (!existingUser) {
      // Don't reveal if email doesn't exist - security best practice
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate secure reset token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Get user agent for security logging
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Invalidate any existing password reset tokens for this user
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', existingUser.id)
      .eq('token_type', 'password_reset')
      .is('used_at', null);

    // Store token in database
    const { error: tokenError } = await (supabase as any)
      .from('auth_tokens')
      .insert({
        user_id: existingUser.id,
        token,
        token_type: 'password_reset',
        email: email.toLowerCase(),
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
      });

    if (tokenError) {
      console.error('Error creating password reset token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create password reset token' },
        { status: 500 }
      );
    }

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, token);

    if (!emailSent) {
      console.error('Failed to send password reset email');
      // Still return success to user (don't reveal email sending failures)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
