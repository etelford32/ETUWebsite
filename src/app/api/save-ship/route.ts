import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getSessionFromRequest } from '@/lib/session';
import { validateCSRFFromRequest } from '@/lib/csrf';
import { PROFILE_SHIP_NAME, normalizeDesign } from '@/lib/shipDesigner';

// A pilot has one profile ship, as in the game's designer. It is stored in
// ship_designs under PROFILE_SHIP_NAME, in the game's own profile keys.

/** The signed-in pilot's saved design, or `design: null` if they have none. */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('ship_designs')
      .select('ship_data, updated_at')
      .eq('user_id', session.userId)
      .eq('ship_name', PROFILE_SHIP_NAME)
      .maybeSingle();
    if (error) throw error;

    const row = data as { ship_data: unknown; updated_at: string } | null;
    return NextResponse.json({
      design: row ? normalizeDesign(row.ship_data) : null,
      updated_at: row?.updated_at ?? null,
    });
  } catch (error: any) {
    console.error('Error loading ship:', error);
    return NextResponse.json({ error: 'Failed to load ship' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    if (!(await validateCSRFFromRequest(request))) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.ship_data !== 'object' || body.ship_data === null) {
      return NextResponse.json({ error: 'Missing required field: ship_data' }, { status: 400 });
    }

    // Only what the game's designer can express is stored: a skin and modes
    // the game knows. Anything else in the body is dropped.
    const design = normalizeDesign(body.ship_data);
    const user_id = session.userId;
    const supabase = createServerClient();

    const { data: existing, error: findError } = await supabase
      .from('ship_designs')
      .select('id')
      .eq('user_id', user_id)
      .eq('ship_name', PROFILE_SHIP_NAME)
      .maybeSingle();
    if (findError) throw findError;

    const existingId = (existing as { id: string } | null)?.id;
    const write = existingId
      ? (supabase.from('ship_designs') as any).update({ ship_data: design }).eq('id', existingId)
      : (supabase.from('ship_designs') as any).insert({
          user_id,
          ship_name: PROFILE_SHIP_NAME,
          ship_data: design,
        });
    const { error } = await write;
    if (error) throw error;

    return NextResponse.json({ success: true, design });
  } catch (error: any) {
    console.error('Error saving ship:', error);
    return NextResponse.json({ error: 'Failed to save ship' }, { status: 500 });
  }
}
