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
    const { employee_code, employee_name, email, password, role, department, designation, actorId } = await request.json()

    // Validate required fields
    if (!employee_code || !employee_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_code, employee_name, email, password, role' 
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

    // Check if employee already has an account
    const { data: existingEmployeeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_code', employee_code)
      .single()

    if (existingEmployeeProfile) {
      return NextResponse.json({ 
        error: 'This employee already has a user account' 
      }, { status: 400 })
    }

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: employee_name,
        employee_code,
        department,
        designation
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ 
        error: `Failed to create user account: ${authError.message}` 
      }, { status: 500 })
    }

    // Create profile with employee link
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        full_name: employee_name,
        employee_code,
        department: department || 'Default',
        designation: designation || 'Employee',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 })
    }

    // Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleError || !roleData) {
      console.error('Role lookup error:', roleError)
      return NextResponse.json({ 
        error: `Invalid role: ${role}` 
      }, { status: 400 })
    }

    // Assign role to user
    const { error: roleAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role_id: roleData.id,
        created_at: new Date().toISOString()
      })

    if (roleAssignError) {
      console.error('Role assignment error:', roleAssignError)
      return NextResponse.json({ 
        error: `Failed to assign role: ${roleAssignError.message}` 
      }, { status: 500 })
    }

    // Log the user creation activity
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: authUser.user.id,
        action: 'user_created_from_employee',
        meta_json: {
          employee_code,
          employee_name,
          role,
          created_by: actorId || 'system'
        },
        ip: '127.0.0.1' // TODO: Get real IP from request
      })

    return NextResponse.json({
      success: true,
      message: `User account created successfully for ${employee_name}`,
      user: {
        id: authUser.user.id,
        email,
        full_name: employee_name,
        employee_code,
        role
      }
    })

  } catch (error: any) {
    console.error('Create user from employee error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
