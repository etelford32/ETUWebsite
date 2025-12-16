import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { user_id, ship_data } = await request.json();

    if (!user_id || !ship_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

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
