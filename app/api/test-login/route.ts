import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('[TEST-LOGIN] Attempting login:', { email, passwordLength: password?.length })

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('[TEST-LOGIN] Result:', { 
      success: !error, 
      error: error?.message,
      userId: data?.user?.id,
      userEmail: data?.user?.email
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at
      },
      session: {
        access_token: data.session?.access_token ? 'Present' : 'Missing',
        expires_at: data.session?.expires_at
      }
    })

  } catch (error: any) {
    console.error('[TEST-LOGIN] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Login test endpoint',
    testCredentials: {
      email: 'main@gmail.com',
      password: '12345678'
    },
    instructions: 'POST to this endpoint with email and password to test login'
  })
}
