export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/features/auth/auth.middleware'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()

    // Get all employees from employee_master
    const { data: employees, error: employeesError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation, status')
      .order('employee_name', { ascending: true })

    if (employeesError) {
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('employee_code, email')
      .not('employee_code', 'is', null)

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: logs } = await supabase
      .from('employee_raw_logs')
      .select('employee_code, log_date')
      .gte('log_date', ninetyDaysAgo.toISOString())
      .order('log_date', { ascending: false })

    const emailMap = new Map(profiles?.map(profile => [profile.employee_code, profile.email]) || [])
    const lastActiveMap = new Map<string, string>()

    logs?.forEach(log => {
      if (!lastActiveMap.has(log.employee_code)) {
        lastActiveMap.set(log.employee_code, log.log_date)
      }
    })

    const availableEmployees = (employees || []).map(employee => ({
      ...employee,
      email: emailMap.get(employee.employee_code) || null,
      lastActive: lastActiveMap.get(employee.employee_code) || null,
    }))

    return NextResponse.json({
      success: true,
      employees: availableEmployees,
      total: availableEmployees.length,
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
