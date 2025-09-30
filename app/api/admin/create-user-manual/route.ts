import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNTI4NCwiZXhwIjoyMDcyMjAxMjg0fQ.0cGxdfGQhYldGHLndKqcYAtzwHjCYnAXSB1WAqRFZ9U'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    const { full_name, email, password, role, employee_code, department, designation, notes, actorId } = await request.json()

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: full_name, email, password, role' 
      }, { status: 400 })
    }

    // Check if email already exists by checking profiles table
    const { data: existingEmailProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingEmailProfile) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 400 })
    }

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        employee_code: employee_code || null,
        department: department || null,
        designation: designation || null
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ 
        error: `Failed to create user account: ${authError.message}` 
      }, { status: 500 })
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: role // Store role in profile for now
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 })
    }

    // Get role ID and assign role
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleData) {
      // Assign role to user
      await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role_id: roleData.id,
          created_at: new Date().toISOString()
        })
    }

    // Log the user creation activity
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: authUser.user.id,
        action: 'user_created_manual',
        meta_json: {
          full_name,
          employee_code: employee_code || null,
          role,
          created_by: actorId || 'system'
        },
        ip: '127.0.0.1' // TODO: Get real IP from request
      })

    return NextResponse.json({
      success: true,
      message: `User account created successfully for ${full_name}`,
      user: {
        id: authUser.user.id,
        email,
        full_name,
        employee_code: employee_code || null,
        role
      }
    })

  } catch (error: any) {
    console.error('Create manual user error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
