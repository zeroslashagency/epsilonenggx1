export const dynamic = 'force-dynamic'

/**
 * Role Detail API Route
 * Handles operations for individual roles
 * 
 * @route /api/admin/roles/[id]
 * @security Requires Admin or Super Admin role
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

/**
 * GET /api/admin/roles/[id]
 * Retrieve a single role by ID
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing role ID
 * @returns JSON response with role data
 * @security Requires Admin or Super Admin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id
    
    
    // Get role from database
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError) {
      throw roleError
    }

    if (!role) {
      return NextResponse.json({
        success: false,
        error: 'Role not found'
      }, { status: 404 })
    }


    return NextResponse.json({
      success: true,
      data: role
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch role'
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/roles/[id]
 * Update a single role by ID
 * 
 * @param request - Next.js request object with updated role data
 * @param params - Route parameters containing role ID
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication (only Super Admin can update roles)
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id
    const body = await request.json()
    
    const { name, description, is_manufacturing_role, permissions } = body


    // Prepare update data - only include fields that exist in the table
    const updateData: any = {
      name,
      description,
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist in the request
    if (is_manufacturing_role !== undefined) {
      updateData.is_manufacturing_role = is_manufacturing_role
    }
    
    if (permissions) {
      updateData.permissions_json = permissions
    }


    // Update the role
    const { error: updateError } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', roleId)

    if (updateError) {
      throw updateError
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'role_updated',
        meta_json: {
          role_id: roleId,
          role_name: name,
          updated_fields: {
            name,
            description,
            is_manufacturing_role,
            permissions
          },
          updated_by: user.email
        }
      })


    return NextResponse.json({
      success: true,
      message: `Role "${name}" updated successfully`
    })

  } catch (error: any) {
    
    // Return detailed error information
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to update role',
      details: error?.details || error?.hint || null,
      code: error?.code || null
    }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete a role by ID
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing role ID
 * @returns JSON response with success message
 * @security Requires Super Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication (only Super Admin can delete roles)
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id
    

    // Delete the role
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) {
      throw deleteError
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id, // ✅ FIXED: Get from authenticated user
        action: 'role_deleted',
        meta_json: {
          role_id: roleId,
          deleted_by: user.email,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })


    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role'
    }, { status: 500 })
  }
}
