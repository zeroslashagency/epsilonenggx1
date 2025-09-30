import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('🔍 Testing audit_logs table access...')

    // Try to read from audit_logs table
    const { data: logs, error: readError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(5)

    if (readError) {
      console.log('❌ Cannot read audit_logs:', readError.message)
      
      // Try to insert a test log to see if table exists
      const testLog = {
        user_id: 'system',
        action: 'test_log',
        target_user_id: null,
        details: { message: 'Test log entry' },
        timestamp: new Date().toISOString()
      }

      const { data: insertData, error: insertError } = await supabase
        .from('audit_logs')
        .insert(testLog)
        .select()

      if (insertError) {
        console.log('❌ Cannot insert into audit_logs:', insertError.message)
        return NextResponse.json({
          success: false,
          error: 'audit_logs table does not exist or is not accessible',
          readError: readError.message,
          insertError: insertError.message,
          suggestion: 'Need to create audit_logs table in Supabase'
        })
      } else {
        console.log('✅ Successfully inserted test log')
        return NextResponse.json({
          success: true,
          message: 'audit_logs table exists and is writable',
          testInsert: insertData
        })
      }
    } else {
      console.log(`✅ Found ${logs?.length || 0} existing audit logs`)
      return NextResponse.json({
        success: true,
        message: 'audit_logs table exists and is readable',
        existingLogs: logs?.length || 0,
        sampleLogs: logs?.slice(0, 3) || []
      })
    }

  } catch (error: any) {
    console.error('❌ Test audit logs error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
