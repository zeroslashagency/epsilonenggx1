export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

/**
 * POST /api/admin/update-user-contact
 * Update user contact information (phone, employee_code, department, designation)
 */
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { userId, phone, employee_code, department, designation } = body
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    // Update user contact information in auth.users metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          phone,
          employee_code,
          department,
          designation
        }
      }
    )
    
    if (updateError) {
      console.error('Error updating user contact:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 })
    }
    
    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        target_id: userId,
        action: 'user_contact_updated',
        meta_json: {
          phone,
          employee_code,
          department,
          designation,
          updated_by: user.email
        },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      })
    
    return NextResponse.json({
      success: true,
      message: 'Contact information updated successfully',
      data: updatedUser
    })
    
  } catch (error) {
    console.error('Error in update-user-contact:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update contact information'
    }, { status: 500 })
  }
}
