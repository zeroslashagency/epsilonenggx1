import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create the advanced_settings table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS advanced_settings (
          id SERIAL PRIMARY KEY,
          user_email TEXT NOT NULL,
          user_id UUID,
          global_start_datetime TEXT,
          global_setup_window TEXT,
          shift_1 TEXT,
          shift_2 TEXT,
          production_shift_1 TEXT,
          production_shift_2 TEXT,
          production_shift_3 TEXT,
          holidays JSONB DEFAULT '[]'::jsonb,
          breakdowns JSONB DEFAULT '[]'::jsonb,
          locked_at TIMESTAMPTZ,
          role TEXT DEFAULT 'operator',
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_advanced_settings_user_email ON advanced_settings(user_email);
        CREATE INDEX IF NOT EXISTS idx_advanced_settings_active ON advanced_settings(is_active);

        -- Enable Row Level Security
        ALTER TABLE advanced_settings ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY IF NOT EXISTS "Users can view their own settings" ON advanced_settings
          FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

        CREATE POLICY IF NOT EXISTS "Users can insert their own settings" ON advanced_settings
          FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

        CREATE POLICY IF NOT EXISTS "Users can update their own settings" ON advanced_settings
          FOR UPDATE USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
      `
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create table', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Advanced settings table created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}







