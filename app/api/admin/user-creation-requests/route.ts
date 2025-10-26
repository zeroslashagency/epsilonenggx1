import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { full_name, email, password, role, employee_code, department, designation, notes, actorId } = await request.json()

    // Validate required fields
    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: full_name, email, password, role' 
      }, { status: 400 })
    }

    console.log('🚀 Creating user directly:', { email, full_name, role })

    // DIRECT USER CREATION - Create the Auth user immediately
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: full_name,
          role: role
        }
      }
    })

    if (signUpError) {
      console.error('❌ User signup failed:', signUpError)
      return NextResponse.json({ 
        error: `Failed to create user: ${signUpError.message}` 
      }, { status: 500 })
    }

    console.log('✅ Auth user created:', signUpData.user?.id)

    // Create/Update the profile
    if (signUpData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: signUpData.user.id,
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

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError)
        // Don't fail the whole process for this
      } else {
        console.log('✅ Profile created successfully')
      }

      // Get role ID and assign role
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', role)
        .single()

      if (roleData && !roleError) {
        const { error: roleAssignError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: signUpData.user.id,
            role_id: roleData.id
          })

        if (roleAssignError) {
          console.error('⚠️ Role assignment failed:', roleAssignError)
        } else {
          console.log('✅ Role assigned successfully')
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${full_name} created successfully and can now login immediately!`,
      user: {
        id: signUpData.user?.id,
        email: email,
        full_name: full_name,
        role: role
      }
    })

  } catch (error: any) {
    console.error('User creation request error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all pending user creation requests
    const { data: requests, error } = await supabase
      .from('user_creation_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user creation requests:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch user creation requests' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      requests: requests || []
    })

  } catch (error: any) {
    console.error('Fetch user creation requests error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
