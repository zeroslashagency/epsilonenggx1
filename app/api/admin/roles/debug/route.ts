export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

/**
 * DEBUG ENDPOINT: Get raw role data from Supabase
 * Shows exactly what's stored in the database
 * NO AUTH REQUIRED - For debugging only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    
    // Get all roles with their raw data
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (error) throw error

    // Format for easy reading
    const formattedRoles = roles?.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      is_manufacturing_role: role.is_manufacturing_role,
      permissions_json: role.permissions_json,
      permissions_json_string: JSON.stringify(role.permissions_json, null, 2),
      created_at: role.created_at,
      updated_at: role.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: formattedRoles,
      message: 'Raw role data from Supabase'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch roles'
    }, { status: 500 })
  }
}
