export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

type MappingHealthRow = {
  user_id: string
  email: string | null
  full_name: string | null
  profile_role: string
  role_badge: string | null
  expected_role_id: string | null
  expected_role_name: string | null
  assigned_role_names: string[]
  status: 'ok' | 'profile_role_unmapped' | 'missing_user_role' | 'mismatch'
}

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'roles.manage')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('v_rbac_role_mapping_health')
      .select('*')
      .limit(5000)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Unable to read role mapping health view: ${error.message}`,
        },
        { status: 500 }
      )
    }

    const rows = (data || []) as MappingHealthRow[]
    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1
        acc.by_status[row.status] = (acc.by_status[row.status] || 0) + 1
        if (row.status !== 'ok') acc.issues += 1
        return acc
      },
      {
        total: 0,
        issues: 0,
        by_status: {
          ok: 0,
          profile_role_unmapped: 0,
          missing_user_role: 0,
          mismatch: 0,
        } as Record<string, number>,
      }
    )

    const issues = rows.filter(row => row.status !== 'ok')

    return NextResponse.json({
      success: true,
      data: {
        summary,
        issues: issues.slice(0, 500),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to build RBAC role mapping report',
      },
      { status: 500 }
    )
  }
}
