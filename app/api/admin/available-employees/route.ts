import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get all employees from employee_master
    const { data: employees, error: employeesError } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name, department, designation')

    console.log('Employees query result:', { employees: employees?.length || 0, error: employeesError })

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    // For now, return all employees since we don't have employee_code linking yet
    // TODO: Add employee_code column to profiles table for proper filtering
    const availableEmployees = employees || []

    return NextResponse.json({
      success: true,
      employees: availableEmployees,
      total: availableEmployees.length
    })

  } catch (error: any) {
    console.error('Available employees API error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
