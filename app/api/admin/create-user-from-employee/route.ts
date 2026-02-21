export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

export async function POST(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { employee_code, employee_name, email, password, role, department, designation, standalone_attendance, avatar_url, force_password_reset } = await request.json()

    // Validate required fields
    if (!employee_code || !employee_name || !email || !password || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_code, employee_name, email, password, role' 
      }, { status: 400 })
    }

    const { data: selectedRole, error: roleLookupError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', role)
      .single()

    if (roleLookupError || !selectedRole) {
      return NextResponse.json({
        error: `Invalid role selected: ${role}`
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

    // Check if employee already has a profile (check by employee_code AND email)
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, email, employee_code')
      .or(`employee_code.eq.${employee_code},email.eq.${email}`)

    if (existingProfiles && existingProfiles.length > 0) {
      // Check each existing profile
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
      
      for (const profile of existingProfiles) {
        const hasAuthUser = existingAuthUsers.users.some(u => u.id === profile.id)
        
        if (hasAuthUser) {
          return NextResponse.json({ 
            error: `A user account already exists for ${profile.employee_code === employee_code ? 'this employee' : 'this email'} (${profile.email})` 
          }, { status: 400 })
        }
        
        // Profile exists but no auth user - delete the orphaned profile
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)
        
        if (deleteError) {
          return NextResponse.json({ 
            error: `Failed to clean up orphaned profile: ${deleteError.message}` 
          }, { status: 500 })
        }
      }
    }

    
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
        employee_code,
        avatar_url,
        force_password_reset: force_password_reset || false
      }
    })

    if (authError || !authUser.user) {
      return NextResponse.json({ 
        error: `Failed to create auth user: ${authError?.message || 'Unknown error'}`,
        details: authError
      }, { status: 500 })
    }

    
    // Check if profile already exists (Supabase trigger might have created it)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.user.id)
      .single()

    if (existingProfile) {
      // Profile exists (created by trigger), update it
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          email: email,
          full_name: employee_name,
          employee_code,
          department: department || 'Default',
          designation: designation || 'Employee',
          role: selectedRole.name,
          role_badge: selectedRole.name,
          standalone_attendance: standalone_attendance || 'NO',
          avatar_url: avatar_url || null
        })
        .eq('id', authUser.user.id)
        .select()

      if (updateError) {
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return NextResponse.json({ 
          error: `Failed to update user profile: ${updateError.message}` 
        }, { status: 500 })
      }
    } else {
      // Profile doesn't exist, create it
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: email,
          full_name: employee_name,
          employee_code,
          department: department || 'Default',
          designation: designation || 'Employee',
          role: selectedRole.name,
          role_badge: selectedRole.name,
          standalone_attendance: standalone_attendance || 'NO',
          avatar_url: avatar_url || null
        })
        .select()

      if (profileError) {
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return NextResponse.json({ 
          error: `Failed to create user profile: ${profileError.message}` 
        }, { status: 500 })
      }
    }

    const { error: clearUserRolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', authUser.user.id)

    if (clearUserRolesError) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({
        error: `Failed to clear existing user roles: ${clearUserRolesError.message}`
      }, { status: 500 })
    }

    const { error: assignRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role_id: selectedRole.id
      })

    if (assignRoleError) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({
        error: `Failed to assign role: ${assignRoleError.message}`
      }, { status: 500 })
    }

    
    // ✅ Log user creation activity
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: authUser.user.id,
        action: 'user_created',
        meta_json: {
          created_user: {
            email: email,
            full_name: employee_name,
            employee_code: employee_code,
            role: selectedRole.name,
            role_id: selectedRole.id
          },
          created_by: user.email,
          created_at: new Date().toISOString(),
          creation_method: 'employee_selection'
        }
      })

    return NextResponse.json({
      success: true,
      message: `User account created for ${employee_name}`,
      user: {
        id: authUser.user.id,
        email,
        full_name: employee_name,
        employee_code,
        role: selectedRole.name
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
