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
        // Map role names to profiles table format - KEEP MONITOR AS MONITOR
        const roleMapping: { [key: string]: string } = {
          'operator': 'Operator',
          'admin': 'Admin', 
          'super_admin': 'Admin',
          'monitor': 'Operator', // Monitor users get Operator profile but keep monitor role in user_roles
          'test': 'Test User'
        }
        
        const profileRole = roleMapping[req.role.toLowerCase()] || 'Operator'
        
        // Generate a proper UUID for the user
        const userId = crypto.randomUUID()
        
        // Auto-assign employee code from attendance data if not provided
        let finalEmployeeCode = req.employee_code
        if (!finalEmployeeCode && req.full_name) {
          const { data: attendanceMatch } = await supabase
            .from('employee_attendance_logs')
            .select('employee_code')
            .ilike('employee_name', req.full_name)
            .not('employee_name', 'is', null)
            .neq('employee_name', 'Unknown')
            .limit(1)
            .single()
          
          if (attendanceMatch?.employee_code) {
            finalEmployeeCode = attendanceMatch.employee_code
            console.log(`Auto-assigned employee code ${finalEmployeeCode} to ${req.full_name}`)
          }
        }
        
        // Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', req.email)
          .single()

        if (existingUser) {
          console.log(`User with email ${req.email} already exists, skipping...`)
          
          // Mark request as completed but note the duplicate
          await supabase
            .from('user_creation_requests')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              processed_by: 'auto-processor',
              processing_notes: `User with email ${req.email} already exists`
            })
            .eq('id', req.id)

          processedUsers.push({
            request_id: req.id,
            user_id: 'existing',
            full_name: req.full_name,
            email: req.email,
            role: req.role,
            status: 'already_exists'
          })
          continue
        }

        // Create user record in profiles table
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: req.email,
            full_name: req.full_name,
            role: profileRole,
            role_badge: req.role, // Store the actual selected role (monitor, operator, etc.)
            employee_code: finalEmployeeCode,
            department: req.department,
            designation: req.designation,
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

        // Skip user_roles insertion to avoid foreign key constraint issues
        // The role is stored in role_badge field in profiles table

        // Mark request as completed
        const { error: updateError } = await supabase
          .from('user_creation_requests')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processed_by: 'auto-processor',
            processing_notes: `User profile created successfully with ID: ${userId}`
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
          role: req.role,
          status: 'created'
        })

      } catch (error) {
        console.error(`Error processing request ${req.id}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing ${req.full_name}: ${errorMessage}`)
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
