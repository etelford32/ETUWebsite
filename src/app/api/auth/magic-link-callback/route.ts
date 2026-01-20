/**
 * Magic Link Callback API Route
 * Processes magic link tokens and logs users in
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { setSessionOnResponse } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      // Redirect to login with error
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      );
    }

    // Create Supabase service client
    const supabase = createServerClient();

    // Look up token in database
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'magic_link')
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', request.url)
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now > expiresAt) {
      return NextResponse.redirect(
        new URL('/login?error=expired_token', request.url)
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      tokenData.user_id
    );

    if (userError || !userData.user) {
      console.error('Error getting user:', userError);
      return NextResponse.redirect(
        new URL('/login?error=user_not_found', request.url)
      );
    }

    // Mark token as used
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token', token);

    // Invalidate any other magic link tokens for this user
    await (supabase as any)
      .from('auth_tokens')
      .update({ used_at: now.toISOString() })
      .eq('user_id', tokenData.user_id)
      .eq('token_type', 'magic_link')
      .is('used_at', null)
      .neq('token', token);

    // Create session for the user and redirect to dashboard
    const redirectUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie
    setSessionOnResponse(
      response,
      userData.user.id,
      userData.user.email!
    );

    return response;

  } catch (error) {
    console.error('Magic link callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=server_error', request.url)
    );
  }
}
