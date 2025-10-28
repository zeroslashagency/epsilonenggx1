export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole, requirePermission } from '@/app/lib/middleware/auth.middleware'
import { validateRequestBody } from '@/app/lib/middleware/validation.middleware'
import { updateUserProfileSchema } from '@/app/lib/validation/schemas'

export async function PATCH(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require users.edit permission
  const authResult = await requirePermission(request, 'users.edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Validate request body
    const validation = await validateRequestBody(request, updateUserProfileSchema)
    if (!validation.success) return validation.response
    
    const { userId, field, value } = validation.data

    if (!userId || !field) {
      return NextResponse.json({
        error: 'User ID and field are required'
      }, { status: 400 })
    }

    // Allowed fields for update
    const allowedFields = ['phone', 'employee_code', 'department', 'designation']
    
    if (!allowedFields.includes(field)) {
      return NextResponse.json({
        error: 'Invalid field for update'
      }, { status: 400 })
    }

    // Update the user profile
    const updateData = {
      [field]: value || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({
        error: 'Failed to update user profile'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${field} successfully`,
      user: data
    })

  } catch (error: any) {
    console.error('Update user profile error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
