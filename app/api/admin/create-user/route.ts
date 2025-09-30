import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYyNTI4NCwiZXhwIjoyMDcyMjAxMjg0fQ.0cGxdfGQhYldGHLndKqcYAtzwHjCYnAXSB1WAqRFZ9U'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: Request) {
  try {
    const { email, password, roleId, customPermissions } = await request.json()

    if (!email || !password || !roleId) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Assign role to user
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role_id: roleId
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
      // Try to clean up the created user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    // If custom permissions are provided, add them
    if (customPermissions && customPermissions.length > 0) {
      const permissionInserts = customPermissions.map((permissionId: string) => ({
        user_id: authUser.user.id,
        permission_id: permissionId,
        effect: 'grant'
      }))

      const { error: permError } = await supabase
        .from('user_permissions')
        .insert(permissionInserts)

      if (permError) {
        console.error('Error adding custom permissions:', permError)
        // Note: We don't fail the entire operation for permission errors
      }
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        action: 'create_user',
        meta_json: {
          created_user_email: email,
          role_id: roleId,
          custom_permissions: customPermissions || []
        }
      })

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
