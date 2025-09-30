import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNTI4NCwiZXhwIjoyMDcyMjAxMjg0fQ.0cGxdfGQhYldGHLndKqcYAtzwHjCYnAXSB1WAqRFZ9U'

export async function POST(request: NextRequest) {
  try {
    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { full_name, email, password, role, employee_code, department, designation, notes } = await request.json()

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: full_name, email, password, role' 
      }, { status: 400 })
    }

    console.log('🚀 Creating user with admin service role:', { email, full_name, role })

    // Step 1: Create the Auth user using service role
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: full_name,
        role: role
      }
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError)
      return NextResponse.json({ 
        error: `Failed to create auth user: ${authError.message}` 
      }, { status: 500 })
    }

    console.log('✅ Auth user created successfully:', authUser.user?.id)

    // Step 2: Get role ID for the role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single()

    if (roleError || !roleData) {
      console.error(`❌ Role '${role}' not found`)
      // Don't fail here, we'll assign a default role
    }

    // Step 3: Create/Update the profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user!.id,
        email: email,
        full_name: full_name,
        role: role,
        employee_code: employee_code || null,
        department: department || null,
        designation: designation || null,
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      return NextResponse.json({ 
        error: `Failed to create profile: ${profileError.message}` 
      }, { status: 500 })
    }

    console.log('✅ Profile created successfully')

    // Step 4: Assign role to user (if role exists)
    if (roleData) {
      const { error: roleAssignError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: authUser.user!.id,
          role_id: roleData.id
        })

      if (roleAssignError) {
        console.error('⚠️ Role assignment failed:', roleAssignError)
        // Don't fail the whole process for this
      } else {
        console.log('✅ Role assigned successfully')
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${full_name} created successfully and can now login`,
      user: {
        id: authUser.user!.id,
        email: email,
        full_name: full_name,
        role: role,
        employee_code: employee_code,
        department: department,
        designation: designation
      }
    })

  } catch (error: any) {
    console.error('❌ User creation error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
