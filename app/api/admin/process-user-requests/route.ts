import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get all pending user creation requests
    const { data: requests, error: fetchError } = await supabase
      .from('user_creation_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching requests:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch user creation requests' 
      }, { status: 500 })
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending requests to process',
        processed: 0
      })
    }

    const processedUsers = []
    const errors = []

    // Process each request
    for (const req of requests) {
      try {
        // Get role ID for the role
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', req.role)
          .single()

        if (roleError || !roleData) {
          console.error(`Role '${req.role}' not found for user ${req.full_name}`)
          errors.push(`Role '${req.role}' not found for user ${req.full_name}`)
          continue
        }

        // Map role names to profiles table format
        const roleMapping: { [key: string]: string } = {
          'operator': 'Operator',
          'admin': 'Admin', 
          'super_admin': 'Admin',
          'monitor': 'Operator',
          'test': 'Test User'
        }
        
        const profileRole = roleMapping[req.role.toLowerCase()] || 'Operator'
        
        // Generate a proper UUID for the user
        const userId = crypto.randomUUID()
        
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: req.email,
            full_name: req.full_name,
            role: profileRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (userError) {
          console.error('Error creating user:', userError)
          errors.push(`Failed to create user ${req.full_name}: ${userError.message}`)
          continue
        }

        // Assign role to user
        const { error: roleAssignError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: roleData.id
          })

        if (roleAssignError) {
          console.error('Error assigning role:', roleAssignError)
          errors.push(`Failed to assign role to ${req.full_name}: ${roleAssignError.message}`)
          continue
        }

        // Mark request as completed
        const { error: updateError } = await supabase
          .from('user_creation_requests')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: 'auto-processor',
            processing_notes: `User account created successfully with ID: ${userId}`
          })
          .eq('id', req.id)

        if (updateError) {
          console.error('Error updating request status:', updateError)
        }

        processedUsers.push({
          request_id: req.id,
          user_id: userId,
          full_name: req.full_name,
          email: req.email,
          role: req.role
        })

      } catch (error) {
        console.error(`Error processing request ${req.id}:`, error)
        errors.push(`Error processing ${req.full_name}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedUsers.length} user creation requests`,
      processed: processedUsers.length,
      users: processedUsers,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Process user requests error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get pending requests count
    const { data: pendingRequests, error } = await supabase
      .from('user_creation_requests')
      .select('id, full_name, email, role, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending requests:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch pending requests' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pending_count: pendingRequests?.length || 0,
      pending_requests: pendingRequests || []
    })

  } catch (error: any) {
    console.error('Get pending requests error:', error)
    return NextResponse.json({
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
