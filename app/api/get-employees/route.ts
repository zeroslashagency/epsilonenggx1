export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    
    // Fetch all employees from employee_master table
    const { data: employees, error } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation, status')
      .order('employee_name', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch employees: ${error.message}`)
    }
    
    
    return NextResponse.json({
      success: true,
      employees: employees || [],
      count: employees?.length || 0
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
