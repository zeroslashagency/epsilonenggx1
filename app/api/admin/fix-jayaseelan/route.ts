import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Try to sign up the user using the regular signup flow
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'Jayaseelan@gmail.com',
      password: '12345678',
      options: {
        data: {
          full_name: 'Jayaseelan'
        }
      }
    })

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError)
      return NextResponse.json({ 
        error: `Signup failed: ${signUpError.message}`,
        details: signUpError
      }, { status: 500 })
    }

    console.log('✅ Signup successful:', signUpData)

    // Now update the profile
    if (signUpData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
          email: 'Jayaseelan@gmail.com',
          full_name: 'Jayaseelan',
          role: 'operator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (profileError) {
        console.error('❌ Profile update failed:', profileError)
      } else {
        console.log('✅ Profile updated successfully')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Jayaseelan user fixed successfully',
      user: signUpData.user
    })

  } catch (error: any) {
    console.error('❌ Fix user error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
