import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require manage_users permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseClient()
    
    console.log('📊 Fetching employees from employee_master table...')
    
    // Fetch all employees from employee_master table
    const { data: employees, error } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation, status')
      .order('employee_name', { ascending: true })
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to fetch employees: ${error.message}`)
    }
    
    console.log(`✅ Found ${employees?.length || 0} employees in database`)
    
    return NextResponse.json({
      success: true,
      employees: employees || [],
      count: employees?.length || 0
    })
    
  } catch (error) {
    console.error('Get employees error:', error)
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
