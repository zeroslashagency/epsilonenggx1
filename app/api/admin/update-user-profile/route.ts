import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { userId, field, value } = await request.json()

    if (!userId || !field) {
      return NextResponse.json({
        error: 'User ID and field are required'
      }, { status: 400 })
    }

    // Allowed fields for update
    const allowedFields = ['phone', 'employee_code', 'department', 'designation']
    
    if (!allowedFields.includes(field)) {
      return NextResponse.json({
        error: 'Invalid field for update'
      }, { status: 400 })
    }

    // Update the user profile
    const updateData = {
      [field]: value || null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return NextResponse.json({
        error: 'Failed to update user profile'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${field} successfully`,
      user: data
    })

  } catch (error: any) {
    console.error('Update user profile error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
