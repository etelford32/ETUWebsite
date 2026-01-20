/**
 * Reset Password API Route
 * Verifies token and updates user password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { token, password } = await request.json();

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet requirements',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Create Supabase service client
    const supabase = createServerClient();

    // Look up token in database
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'password_reset')
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Update user password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark token as used
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token', token);

    // Invalidate any other password reset tokens for this user
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: now.toISOString() })
      .eq('user_id', tokenData.user_id)
      .eq('token_type', 'password_reset')
      .is('used_at', null)
      .neq('token', token);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}

/**
 * GET handler to verify token without consuming it
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Create Supabase service client
    const supabase = createServerClient();

    // Look up token
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('auth_tokens')
      .select('expires_at, used_at')
      .eq('token', token)
      .eq('token_type', 'password_reset')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 200 }
      );
    }

    // Check if already used
    if (tokenData.used_at) {
      return NextResponse.json(
        { valid: false, error: 'Token has already been used' },
        { status: 200 }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Token has expired' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      expiresAt: tokenData.expires_at
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
