import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/services/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    // Get all unique employee codes and names from attendance data
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('employee_attendance_logs')
      .select('employee_code, employee_name')
      .not('employee_name', 'is', null)
      .neq('employee_name', 'Unknown')
      .neq('employee_name', '')

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError)
      return NextResponse.json({ 
        error: 'Failed to fetch attendance data' 
      }, { status: 500 })
    }

    // Create a map of employee names to codes
    const employeeMap = new Map()
    attendanceData?.forEach(record => {
      if (record.employee_name && record.employee_code) {
        const name = record.employee_name.toLowerCase().trim()
        if (!employeeMap.has(name)) {
          employeeMap.set(name, record.employee_code)
        }
      }
    })

    // Get all users from profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, employee_code')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ 
        error: 'Failed to fetch users' 
      }, { status: 500 })
    }

    const updates = []
    const matched = []
    const notMatched = []

    // Match users with employee codes
    for (const user of users || []) {
      if (user.full_name) {
        const userName = user.full_name.toLowerCase().trim()
        const employeeCode = employeeMap.get(userName)
        
        if (employeeCode && employeeCode !== user.employee_code) {
          // Update user with employee code
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ employee_code: employeeCode })
            .eq('id', user.id)

          if (updateError) {
            console.error(`Error updating user ${user.full_name}:`, updateError)
          } else {
            updates.push({
              user_id: user.id,
              full_name: user.full_name,
              employee_code: employeeCode,
              previous_code: user.employee_code
            })
            matched.push(user.full_name)
          }
        } else if (!employeeCode) {
          notMatched.push(user.full_name)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced employee codes for ${updates.length} users`,
      updates,
      matched_users: matched,
      not_matched_users: notMatched,
      total_attendance_records: attendanceData?.length || 0,
      unique_employees: employeeMap.size
    })

  } catch (error: any) {
    console.error('Sync employee codes error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
