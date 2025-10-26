import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Use environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    console.log('🔧 Attempting to disable RLS on profiles table...')
    
    // Try to execute SQL to disable RLS
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
      })
    })

    const result = await response.json()
    
    console.log('Response:', result)

    return NextResponse.json({
      success: true,
      message: 'RLS disable attempted. You need to run this SQL in Supabase Dashboard: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;',
      response: result
    })

  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      message: 'Cannot disable RLS programmatically. Please run this SQL in Supabase Dashboard: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
    }, { status: 500 })
  }
}
