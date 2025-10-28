export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

// Handle both DELETE and POST methods for backwards compatibility
async function handleDeleteUser(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const { userId, userEmail, userName, actorId } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('🗑️ Starting user deletion process for:', userId)

    const supabase = getSupabaseClient()

    // Try to delete from auth.users first using service role key
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Delete from auth.users
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (authDeleteError) {
        console.error('Auth user deletion error:', authDeleteError)
        // Continue with profile deletion even if auth deletion fails
      } else {
        console.log('✅ Auth user deleted successfully')
      }

    } catch (error) {
      console.error('Auth deletion error:', error)
      // Continue with profile deletion
    }

    // Delete from profiles table
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('Profile deletion error:', profileDeleteError)
      return NextResponse.json({ 
        error: `Failed to delete user profile: ${profileDeleteError.message}` 
      }, { status: 500 })
    }

    console.log('✅ User deleted successfully from database')
    
    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id, // ✅ FIXED: Get from authenticated user
        target_id: userId,
        action: 'user_deleted',
        meta_json: {
          deleted_user: {
            email: userEmail,
            full_name: userName
          },
          deleted_by: user.email,
          deleted_at: new Date().toISOString()
        }
      })
    
    return NextResponse.json({
      success: true,
      message: `User ${userName || userEmail} has been deleted`,
      data: {
        userId,
        userEmail,
        deletedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ User deletion error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Export both DELETE and POST methods
export async function DELETE(request: NextRequest) {
  return handleDeleteUser(request)
}

export async function POST(request: NextRequest) {
  return handleDeleteUser(request)
}
