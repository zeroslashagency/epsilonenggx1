import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('🧪 Testing audit log insertion...')

    const testLog = {
      actor_id: null,
      target_id: 'f3b039d1-db0e-46ec-821d-507b22bc60ae', // Use proper UUID
      action: 'user_deletion',
      meta_json: {
        deleted_user: {
          id: 'f3b039d1-db0e-46ec-821d-507b22bc60ae',
          email: 'test@example.com',
          full_name: 'Test Deleted User'
        },
        description: 'Test deletion log entry - user account permanently deleted'
      },
      ip: '192.168.1.100'
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testLog)
      .select()

    if (error) {
      console.error('❌ Failed to insert test log:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    console.log('✅ Successfully inserted test deletion log')
    return NextResponse.json({
      success: true,
      message: 'Test deletion log inserted successfully',
      insertedLog: data
    })

  } catch (error: any) {
    console.error('❌ Test insert error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
