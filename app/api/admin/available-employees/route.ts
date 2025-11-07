export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Get all employees from employee_master
    const { data: employees, error: employeesError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation')


    if (employeesError) {
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    // Return all employees - employee_code linking can be added in future if needed
    const availableEmployees = employees || []

    return NextResponse.json({
      success: true,
      employees: availableEmployees,
      total: availableEmployees.length
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
