import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getSessionFromRequest } from '@/lib/session';
import { validateCSRFFromRequest } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const { ship_data } = await request.json();

    // Use authenticated user's ID, not client-provided ID
    const user_id = session.userId;

    if (!ship_data) {
      return NextResponse.json(
        { error: 'Missing required field: ship_data' },
        { status: 400 }
      );
    }

    // Validate ship data structure
    if (!ship_data.name || typeof ship_data.name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid ship data: name is required' },
        { status: 400 }
      );
    }

    if (ship_data.name.length < 3 || ship_data.name.length > 50) {
      return NextResponse.json(
        { error: 'Ship name must be between 3 and 50 characters' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role key
    const supabase = createServerClient();

    // Check if ship with same name already exists for this user
    // @ts-ignore - ship_designs table will be created in Supabase
    const { data: existingShip } = await supabase
      .from('ship_designs')
      .select('id')
      .eq('user_id', user_id)
      .eq('ship_name', ship_data.name)
      .single();

    if (existingShip) {
      // Update existing ship
      // @ts-ignore - ship_designs table will be created in Supabase
      const { data, error } = await supabase
        .from('ship_designs')
        // @ts-ignore
        .update({
          ship_data: ship_data,
          updated_at: new Date().toISOString(),
        })
        // @ts-ignore
        .eq('id', existingShip.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Ship updated successfully',
        data,
      });
    } else {
      // Create new ship
      // @ts-ignore - ship_designs table will be created in Supabase
      const { data, error } = await supabase
        .from('ship_designs')
        // @ts-ignore
        .insert({
          user_id,
          ship_name: ship_data.name,
          ship_data: ship_data,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Ship saved successfully',
        data,
      });
    }
  } catch (error: any) {
    console.error('Error saving ship:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save ship' },
      { status: 500 }
    );
  }
}
