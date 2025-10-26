import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { employee_code, employee_name, email, password, role, department, designation, actorId } = await request.json()

    // Validate required fields
    if (!employee_code || !employee_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_code, employee_name, email, password, role' 
      }, { status: 400 })
    }

    // Check if email already exists in auth.users
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
    const emailExists = existingAuthUser.users.some(u => u.email === email)

    if (emailExists) {
      return NextResponse.json({ 
        error: 'A user with this email already exists' 
      }, { status: 400 })
    }

    // Check if employee already has a profile
    const { data: existingEmployeeProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('employee_code', employee_code)
      .single()

    // Check if profile has an auth user
    if (existingEmployeeProfile) {
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
      const hasAuthUser = existingAuthUsers.users.some(u => u.id === existingEmployeeProfile.id)
      
      if (hasAuthUser) {
        return NextResponse.json({ 
          error: 'This employee already has a complete user account' 
        }, { status: 400 })
      }
      
      // Profile exists but no auth user - delete the orphaned profile first
      console.log('⚠️ Found orphaned profile, deleting it first...')
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', existingEmployeeProfile.id)
      
      if (deleteError) {
        console.error('Failed to delete orphaned profile:', deleteError)
        return NextResponse.json({ 
          error: `Failed to clean up orphaned profile: ${deleteError.message}` 
        }, { status: 500 })
      }
      console.log('✅ Orphaned profile deleted')
    }

    console.log('🔑 Creating auth user in Supabase Auth')
    console.log('📧 Email:', email)
    console.log('👤 Name:', employee_name)
    console.log('🔑 Password length:', password?.length)
    
    // Validate password
    if (!password || password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 })
    }
    
    // Create user in Supabase Auth (this creates the real authenticated user)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: employee_name,
        role,
        employee_code
      }
    })

    if (authError || !authUser.user) {
      console.error('❌ Auth user creation error:', authError)
      console.error('Error details:', JSON.stringify(authError, null, 2))
      return NextResponse.json({ 
        error: `Failed to create auth user: ${authError?.message || 'Unknown error'}`,
        details: authError
      }, { status: 500 })
    }

    console.log('✅ Auth user created:', authUser.user.id)
    
    // Create profile explicitly (no waiting for trigger)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: employee_name,
        employee_code,
        department: department || 'Default',
        designation: designation || 'Employee',
        role: role || 'Operator',
        standalone_attendance: 'NO'
      })
      .select()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 500 })
    }

    console.log('✅ User profile updated successfully:', profileData)
    
    return NextResponse.json({
      success: true,
      message: `User account created for ${employee_name}`,
      user: {
        id: authUser.user.id,
        email,
        full_name: employee_name,
        employee_code,
        role: role || 'Operator'
      }
    })

  } catch (error: any) {
    console.error('User creation error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
