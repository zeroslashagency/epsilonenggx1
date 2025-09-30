import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[TEST] Environment variables check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlValue: supabaseUrl,
      keyPrefix: supabaseServiceKey?.slice(0, 20) + '...'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      })
    }

    // Test basic connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test admin access by trying to list users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    })

    if (listError) {
      console.error('[TEST] Admin list users error:', listError)
      return NextResponse.json({
        success: false,
        error: 'Admin API access failed',
        details: listError
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase admin connection successful',
      userCount: users?.users?.length || 0,
      serviceKeyValid: true
    })

  } catch (error: any) {
    console.error('[TEST] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message
    })
  }
}
