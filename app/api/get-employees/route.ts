export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/app/lib/services/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // 1. Fetch all employees from employee_master
    const { data: employees, error } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation, status')
      .order('employee_name', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch employees: ${error.message}`)
    }

    // 2. Fetch profiles to check for existing accounts (email)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('employee_code, email')
      .not('employee_code', 'is', null)

    // 3. Fetch recent logs (last 90 days) for activity status
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const { data: logs, error: logsError } = await supabase
      .from('employee_raw_logs')
      .select('employee_code, log_date')
      .gte('log_date', ninetyDaysAgo.toISOString())
      .order('log_date', { ascending: false })

    // Create maps for quick lookup
    const emailMap = new Map(profiles?.map(p => [p.employee_code, p.email]) || [])
    
    // Calculate last active date per employee from logs
    const lastActiveMap = new Map()
    if (logs) {
      logs.forEach(log => {
        if (!lastActiveMap.has(log.employee_code)) {
          lastActiveMap.set(log.employee_code, log.log_date)
        }
      })
    }

    // Merge data
    const enhancedEmployees = employees?.map(emp => ({
      ...emp,
      email: emailMap.get(emp.employee_code) || null,
      lastActive: lastActiveMap.get(emp.employee_code) || null
    })) || []
    
    return NextResponse.json({
      success: true,
      employees: enhancedEmployees,
      count: enhancedEmployees.length
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        employees: []
      },
      { status: 500 }
    )
  }
}
