#!/usr/bin/env node

/**
 * SmartOffice to Supabase Sync Script
 * 
 * This script runs on your office computer to sync attendance data
 * from SmartOffice to your Supabase cloud database.
 * 
 * Usage:
 * 1. Install Node.js on office computer
 * 2. Run: npm install @supabase/supabase-js
 * 3. Update the configuration below
 * 4. Run: node office-sync-script.js
 * 5. Set up automatic scheduling (Windows Task Scheduler or cron)
 */

const { createClient } = require('@supabase/supabase-js')

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

// Load environment variables from .env file if it exists
require('dotenv').config();

// Your Supabase credentials (get from Supabase dashboard or environment variables)
const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
}

// SmartOffice configuration (should work as-is)
const SMART_OFFICE_CONFIG = {
  baseUrl: 'http://localhost:84/api/v2/WebAPI',
  apiKey: '344612092518'
}

// Sync configuration
const SYNC_CONFIG = {
  // How many days back to sync (for initial sync, use 365 to get all historical data)
  daysBack: 1,  // Change to 365 for full historical sync
  
  // How often to run (in minutes)
  intervalMinutes: 0.5,  // 30 seconds (0.5 minutes)
  
  // Employee data sync frequency (in hours)
  employeeSyncIntervalHours: 24,  // Sync employee data once daily
  
  // Enable/disable logging
  verbose: true,
  
  // Fresh installation mode (clears all data and syncs everything)
  freshInstall: false  // Set to true for first-time setup
}

// ============================================================================
// EMPLOYEE NAME LOOKUP FUNCTION
// ============================================================================

async function getEmployeeNames(supabase, employeeCodes) {
  try {
    // First, try to get names from employee_master table
    const { data: masterData } = await supabase
      .from('employee_master')
      .select('employee_code, employee_name')
      .in('employee_code', employeeCodes)
    
    const nameMap = new Map()
    
    // Add names from employee_master
    if (masterData) {
      masterData.forEach(emp => {
        nameMap.set(emp.employee_code, emp.employee_name)
      })
    }
    
    // For any missing names, try to get them from SmartOffice
    const missingCodes = employeeCodes.filter(code => !nameMap.has(code))
    
    if (missingCodes.length > 0) {
      console.log(`🔍 Fetching missing employee names from SmartOffice: ${missingCodes.join(', ')}`)
      
      // Try to get employee names from SmartOffice GetEmployees API
      try {
        const smartOfficeUrl = `${SMART_OFFICE_CONFIG.baseUrl}/GetEmployees?APIKey=${SMART_OFFICE_CONFIG.apiKey}`
        
        const response = await fetch(smartOfficeUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        if (response.ok) {
          const employees = await response.json()
          
          if (Array.isArray(employees)) {
            employees.forEach(emp => {
              if (missingCodes.includes(emp.EmployeeCode || emp.Code)) {
                const employeeCode = String(emp.EmployeeCode || emp.Code)
                const employeeName = emp.EmployeeName || emp.Name || emp.FullName
                if (employeeName && employeeName !== 'Unknown') {
                  nameMap.set(employeeCode, employeeName)
                  console.log(`✅ Found name for ${employeeCode}: ${employeeName}`)
                }
              }
            })
          }
        } else {
          console.log(`⚠️ SmartOffice GetEmployees API not available (${response.status})`)
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch from SmartOffice GetEmployees: ${error.message}`)
      }
    }
    
    // Log any still missing names
    const stillMissing = employeeCodes.filter(code => !nameMap.has(code))
    if (stillMissing.length > 0 && SYNC_CONFIG.verbose) {
      console.log(`⚠️ Still missing names for employees: ${stillMissing.join(', ')}`)
    }
    
    return nameMap
  } catch (error) {
    console.warn('⚠️ Employee name lookup failed:', error.message)
    return new Map()
  }
}

// ============================================================================
// FRESH INSTALLATION FUNCTION
// ============================================================================

async function freshInstallation(supabase) {
  console.log('🔄 Starting fresh installation...')
  console.log('⚠️  This will clear all existing data!')
  
  try {
    // Clear all existing attendance data
    const { error: deleteError } = await supabase
      .from('employee_attendance_logs')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (deleteError) {
      throw new Error(`Failed to clear attendance data: ${deleteError.message}`)
    }
    
    console.log('✅ Cleared all existing attendance data')
    
    // Clear employee master data
    const { error: deleteEmpError } = await supabase
      .from('employee_master')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (deleteEmpError) {
      throw new Error(`Failed to clear employee data: ${deleteEmpError.message}`)
    }
    
    console.log('✅ Cleared all existing employee data')
    
    // Set up for full historical sync
    console.log('📅 Setting up for full historical sync (2020-2025)...')
    
    return { success: true, message: 'Fresh installation completed' }
    
  } catch (error) {
    console.error('❌ Fresh installation failed:', error.message)
    return { success: false, message: error.message }
  }
}

// ============================================================================
// EMPLOYEE SYNC TRACKING FUNCTIONS
// ============================================================================

async function getLastEmployeeSync(supabase) {
  try {
    const { data } = await supabase
      .from('sync_metadata')
      .select('last_employee_sync')
      .eq('key', 'employee_sync')
      .single()
    
    return data?.last_employee_sync
  } catch (error) {
    return null
  }
}

async function setLastEmployeeSync(supabase) {
  try {
    await supabase
      .from('sync_metadata')
      .upsert({
        key: 'employee_sync',
        last_employee_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
  } catch (error) {
    console.warn('⚠️ Failed to update employee sync timestamp:', error.message)
  }
}

// ============================================================================
// EMPLOYEE DATA SYNC FUNCTION (Daily)
// ============================================================================

async function syncEmployeeData(supabase) {
  try {
    console.log('👥 Syncing employee master data from SmartOffice...')
    
    // Try to fetch employee data from SmartOffice GetEmployees API
    try {
      const smartOfficeUrl = `${SMART_OFFICE_CONFIG.baseUrl}/GetEmployees?APIKey=${SMART_OFFICE_CONFIG.apiKey}`
      
      const response = await fetch(smartOfficeUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (response.ok) {
        const employees = await response.json()
        
        if (Array.isArray(employees) && employees.length > 0) {
          console.log(`📋 Found ${employees.length} employees in SmartOffice`)
          
          // Transform employee data for Supabase
          const employeeData = employees.map(emp => ({
            code: String(emp.EmployeeCode || emp.Code),
            name: emp.EmployeeName || emp.Name || emp.FullName || `Employee ${emp.EmployeeCode || emp.Code}`,
            dept: emp.Department || emp.Dept || 'Default',
            designation: emp.Designation || emp.Title || 'Employee',
            location: emp.Location || 'Default'
          }))
          
          // Show some examples of real names found
          const realNames = employeeData.filter(emp => !emp.name.startsWith('Employee '))
          if (realNames.length > 0) {
            console.log('👥 Real employee names found:')
            realNames.slice(0, 5).forEach(emp => {
              console.log(`   ${emp.code}: ${emp.name}`)
            })
            if (realNames.length > 5) {
              console.log(`   ... and ${realNames.length - 5} more`)
            }
          }
          
          // Use the real data from SmartOffice
          var finalEmployeeData = employeeData
        } else {
          throw new Error('Invalid employee data format from SmartOffice')
        }
      } else {
        throw new Error(`SmartOffice GetEmployees API error: ${response.status}`)
      }
    } catch (smartOfficeError) {
      console.log(`⚠️ SmartOffice GetEmployees API not available: ${smartOfficeError.message}`)
      console.log('📝 Falling back to static employee data...')
      
      // Fallback to static employee data (your existing data)
      var finalEmployeeData = [
        { code: '1', name: 'Nandhini', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '2', name: 'Rajesh', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '4', name: 'Vyshakh', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '5', name: 'Athul', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '6', name: 'Deepak', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '7', name: 'Mohammed Yasique', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '8', name: 'Employee 8', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '9', name: 'Employee 9', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '10', name: 'Employee 10', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '11', name: 'Employee 11', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '12', name: 'Employee 12', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '13', name: 'Antony', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '15', name: 'Employee 15', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '16', name: 'Employee 16', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '17', name: 'Employee 17', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '18', name: 'Employee 18', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '19', name: 'Employee 19', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '21', name: 'Employee 21', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '22', name: 'Employee 22', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '23', name: 'Employee 23', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '24', name: 'Employee 24', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '25', name: 'Employee 25', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '28', name: 'Employee 28', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '29', name: 'Employee 29', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '31', name: 'Employee 31', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '33', name: 'Employee 33', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '38', name: 'Employee 38', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '39', name: 'Employee 39', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '45', name: 'Employee 45', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '46', name: 'Employee 46', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '51', name: 'Employee 51', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '52', name: 'Employee 52', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '53', name: 'Employee 53', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: '55', name: 'Employee 55', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: 'EE 65', name: 'Employee EE65', dept: 'Default', designation: 'Employee', location: 'Default' },
        { code: 'EE 69', name: 'Employee EE69', dept: 'Default', designation: 'Employee', location: 'Default' }
      ]
    }
    
    // Insert/update employee data
    const { error: insertError } = await supabase
      .from('employee_master')
      .upsert(finalEmployeeData.map(emp => ({
        employee_code: emp.code,
        employee_name: emp.name,
        department: emp.dept,
        designation: emp.designation,
        location: emp.location,
        status: 'Active'
      })), { onConflict: 'employee_code' })
    
    if (insertError) {
      throw new Error(`Failed to sync employee data: ${insertError.message}`)
    }
    
    console.log(`✅ Synced ${finalEmployeeData.length} employee records`)
    return { success: true, message: `Synced ${finalEmployeeData.length} employees` }
    
  } catch (error) {
    console.error('❌ Employee sync failed:', error.message)
    return { success: false, message: error.message }
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncAttendanceLogs() {
  const startTime = new Date()
  
  try {
    if (SYNC_CONFIG.verbose) {
      console.log('🔄 Starting SmartOffice sync...')
      console.log(`📅 Sync time: ${startTime.toISOString()}`)
    }
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    
    // Fresh installation mode
    if (SYNC_CONFIG.freshInstall) {
      console.log('🆕 Fresh installation mode enabled')
      const freshResult = await freshInstallation(supabase)
      if (!freshResult.success) {
        throw new Error(`Fresh installation failed: ${freshResult.message}`)
      }
      
      // Set up for full historical sync
      SYNC_CONFIG.daysBack = 365 * 5 // 5 years of historical data
      console.log('📅 Switched to full historical sync mode (5 years)')
    }
    
    // Sync employee data (daily)
    const lastEmployeeSync = await getLastEmployeeSync(supabase)
    const shouldSyncEmployees = !lastEmployeeSync || 
      (new Date() - new Date(lastEmployeeSync)) > (SYNC_CONFIG.employeeSyncIntervalHours * 60 * 60 * 1000)
    
    if (shouldSyncEmployees) {
      console.log('👥 Daily employee sync due...')
      const empResult = await syncEmployeeData(supabase)
      if (empResult.success) {
        await setLastEmployeeSync(supabase)
        console.log('✅ Employee data synced successfully')
      } else {
        console.warn('⚠️ Employee sync failed:', empResult.message)
      }
    } else {
      console.log('👥 Employee sync not due yet')
    }
    
    // Calculate date range
    const toDate = new Date()
    const fromDate = new Date(Date.now() - SYNC_CONFIG.daysBack * 24 * 60 * 60 * 1000)
    
    const fromDateStr = fromDate.toISOString().split('T')[0]
    const toDateStr = toDate.toISOString().split('T')[0]
    
    // Fetch logs from SmartOffice
    const smartOfficeUrl = `${SMART_OFFICE_CONFIG.baseUrl}/GetDeviceLogs?APIKey=${SMART_OFFICE_CONFIG.apiKey}&FromDate=${fromDateStr}&ToDate=${toDateStr}`
    
    if (SYNC_CONFIG.verbose) {
      console.log('📡 Fetching from SmartOffice:', smartOfficeUrl)
    }
    
    const response = await fetch(smartOfficeUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`SmartOffice API error: ${response.status} ${response.statusText}`)
    }
    
    const logs = await response.json()
    
    if (SYNC_CONFIG.verbose) {
      console.log(`📊 Found ${logs.length} logs from SmartOffice`)
    }
    
    if (logs.length === 0) {
      console.log('✅ No new logs to sync')
      return { success: true, message: 'No new logs found', newLogs: 0 }
    }
    
    // Get unique employee codes for name lookup
    const employeeCodes = [...new Set(logs.map(log => String(log.EmployeeCode)))]
    
    // Get employee names from employee_master table
    const nameMap = await getEmployeeNames(supabase, employeeCodes)
    
    // Transform logs for Supabase with real employee names
    const transformedLogs = logs.map(log => {
      const employeeCode = String(log.EmployeeCode)
      const employeeName = nameMap.get(employeeCode) || log.EmployeeName || 'Unknown'
      
      return {
        employee_code: employeeCode,
        employee_name: employeeName,
        log_date: new Date(log.LogDate).toISOString(),
        punch_direction: log.PunchDirection.toLowerCase(),
        serial_number: log.SerialNumber,
        temperature: log.Temperature,
        temperature_state: log.TemperatureState || 'Unknown',
        device_location: 'Main Office',
        sync_timestamp: new Date().toISOString()
      }
    })
    
    // Enhanced duplicate prevention using database constraints
    // Use INSERT with ON CONFLICT to prevent duplicates at database level
    const newLogs = transformedLogs
          
          if (SYNC_CONFIG.verbose && newLogs.length !== transformedLogs.length) {
            console.log(`🔍 Filtered ${transformedLogs.length - newLogs.length} duplicate logs`)
          }
    
    if (newLogs.length > 0) {
      // Insert logs one by one to handle duplicates gracefully
      let insertedCount = 0
      let duplicateCount = 0
      
      for (const log of newLogs) {
        try {
          const { error: insertError } = await supabase
            .from('employee_attendance_logs')
            .insert(log)
          
          if (insertError) {
            // Check if it's a duplicate key error
            if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
              duplicateCount++
              if (SYNC_CONFIG.verbose) {
                console.log(`⚠️ Duplicate skipped: ${log.employee_code} ${log.punch_direction} at ${log.log_date}`)
              }
            } else {
              console.error(`❌ Insert error for ${log.employee_code}:`, insertError.message)
            }
          } else {
            insertedCount++
          }
        } catch (error) {
          console.error(`❌ Unexpected error inserting ${log.employee_code}:`, error.message)
        }
      }
      
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      console.log(`✅ Successfully synced ${insertedCount} new attendance logs`)
      if (duplicateCount > 0) {
        console.log(`ℹ️ Skipped ${duplicateCount} duplicate logs`)
      }
      console.log(`⏱️  Sync completed in ${duration}ms`)
      
      return { 
        success: true, 
        message: `Synced ${insertedCount} new logs, skipped ${duplicateCount} duplicates`, 
        newLogs: insertedCount,
        duplicates: duplicateCount,
        duration: duration
      }
    } else {
      console.log('✅ No new logs to insert')
      return { success: true, message: 'No new logs to insert', newLogs: 0 }
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error.message)
    return { success: false, message: error.message, newLogs: 0 }
  }
}

// ============================================================================
// AUTOMATIC SYNC LOOP (for continuous running)
// ============================================================================

async function startAutoSync() {
  console.log('🚀 Starting automatic sync service...')
  console.log(`⏰ Sync interval: ${SYNC_CONFIG.intervalMinutes} minutes`)
  console.log(`📅 Days back: ${SYNC_CONFIG.daysBack}`)
  console.log('Press Ctrl+C to stop')
  
  // Run initial sync
  await syncAttendanceLogs()
  
  // Set up interval for automatic sync
  const intervalMs = SYNC_CONFIG.intervalMinutes * 60 * 1000
  setInterval(async () => {
    await syncAttendanceLogs()
  }, intervalMs)
}

// ============================================================================
// COMMAND LINE INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
SmartOffice to Supabase Sync Script

Usage:
  node office-sync-script.js [options]

Options:
  --once              Run sync once and exit
  --auto              Run continuous sync (default)
  --fresh-install     Clear all data and do full historical sync
  --employees-only    Sync only employee data (daily)
  --help, -h          Show this help message

Configuration:
  Edit the SUPABASE_CONFIG and SYNC_CONFIG in this file before running.

Examples:
  node office-sync-script.js --once              # Run once
  node office-sync-script.js --auto              # Run continuously
  node office-sync-script.js --fresh-install     # Clear data and sync everything
  node office-sync-script.js --employees-only    # Sync only employee data
  node office-sync-script.js                     # Run continuously (default)
`)
    process.exit(0)
  }
  
  if (args.includes('--fresh-install')) {
    console.log('🆕 Running fresh installation...')
    SYNC_CONFIG.freshInstall = true
    const result = await syncAttendanceLogs()
    process.exit(result.success ? 0 : 1)
  }
  
  if (args.includes('--employees-only')) {
    console.log('👥 Syncing employee data only...')
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    const result = await syncEmployeeData(supabase)
    process.exit(result.success ? 0 : 1)
  }
  
  if (args.includes('--once')) {
    console.log('🔄 Running single sync...')
    const result = await syncAttendanceLogs()
    process.exit(result.success ? 0 : 1)
  } else {
    await startAutoSync()
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down sync service...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down sync service...')
  process.exit(0)
})

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { syncAttendanceLogs, startAutoSync }
