export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()

    console.log('🔧 Attempting to fix RLS policies...')

    // SQL to fix RLS policies
    const fixPoliciesSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON profiles;
      DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON profiles;
      DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON profiles;

      -- Create permissive DELETE policy
      CREATE POLICY "Allow authenticated users to delete profiles"
      ON profiles FOR DELETE
      TO authenticated
      USING (true);

      -- Create permissive UPDATE policy
      CREATE POLICY "Allow authenticated users to update profiles"
      ON profiles FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

      -- Create permissive INSERT policy
      CREATE POLICY "Allow authenticated users to insert profiles"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (true);

      -- Ensure RLS is enabled
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon;
    `

    const { data, error } = await supabase.rpc('exec_sql', { sql: fixPoliciesSQL })

    if (error) {
      console.error('❌ Failed to fix RLS policies:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Failed to fix RLS policies. You may need to run the SQL manually in Supabase SQL Editor.'
      }, { status: 500 })
    }

    console.log('✅ RLS policies fixed successfully')

    return NextResponse.json({
      success: true,
      message: 'RLS policies have been updated successfully. User delete/update operations should now work.',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error fixing RLS policies:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      message: 'Failed to fix RLS policies. Please run the SQL script manually in Supabase SQL Editor.'
    }, { status: 500 })
  }
}
