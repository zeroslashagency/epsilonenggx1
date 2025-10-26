#!/usr/bin/env node

/**
 * FIXED SMARTOFFICE SYNC SCRIPT
 * - Clean schema (only essential data)
 * - No timezone conversion bugs
 * - Proper duplicate prevention
 * - No storage waste
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

// Load environment variables (install: npm install dotenv)
try {
  require('dotenv').config()
} catch (error) {
  // dotenv not installed - will use fallback values
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
  },
  smartoffice: {
    baseUrl: process.env.SMARTOFFICE_BASE_URL || 'http://localhost:84/api/v2/WebAPI',
    apiKey: process.env.SMARTOFFICE_API_KEY || '344612092518'
  }
}

const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key)

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  static info(message, data = null) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [INFO] ${message}`)
    if (data) console.log(data)
  }
  
  static success(message, data = null) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [SUCCESS] ✅ ${message}`)
    if (data) console.log(data)
  }
  
  static error(message, error = null) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [ERROR] ❌ ${message}`)
    if (error) console.log(error)
  }
}

// ============================================================================
// SMARTOFFICE API CLIENT
// ============================================================================

class SmartOfficeAPI {
  static async fetchAttendanceLogs(fromDate, toDate) {
    try {
      Logger.info(`Fetching attendance logs: ${fromDate} to ${toDate}`)
      
      const response = await axios.get(`${CONFIG.smartoffice.baseUrl}/GetDeviceLogs`, {
        params: {
          apikey: CONFIG.smartoffice.apiKey,
          fromdate: fromDate,
          todate: toDate
        },
        timeout: 30000
      })
      
      if (response.data && Array.isArray(response.data)) {
        Logger.success(`Fetched ${response.data.length} raw logs from SmartOffice`)
        return response.data
      } else {
        Logger.error('Invalid response format from SmartOffice API')
        return []
      }
    } catch (error) {
      Logger.error('Failed to fetch attendance logs', error.message)
      return []
    }
  }
  
  static async fetchAllEmployees() {
    try {
      Logger.info('👥 Fetching all employees from SmartOffice...')
      
      const response = await axios.get(`${CONFIG.smartoffice.baseUrl}/GetAllEmployees`, {
        params: {
          apikey: CONFIG.smartoffice.apiKey
        },
        timeout: 30000
      })
      
      if (response.data && Array.isArray(response.data)) {
        Logger.success(`✅ Fetched ${response.data.length} employees from SmartOffice`)
        return response.data
      } else {
        Logger.error('Invalid employee response format from SmartOffice API')
        return []
      }
    } catch (error) {
      Logger.error('Failed to fetch employees', error.message)
      return []
    }
  }
}

// ============================================================================
// DATA PROCESSOR (FIXED - CLEAN SCHEMA)
// ============================================================================

class DataProcessor {
  static async storeAttendanceLogs(logs) {
    if (!logs || logs.length === 0) {
      Logger.info('No logs to store')
    }
    
    Logger.info(`Processing ${logs.length} attendance logs...`)
    
    try {
      // CLEAN TRANSFORMATION - Essential data + sync timing
      const syncTimestamp = new Date().toISOString()
      const cleanLogs = logs.map(log => ({
        employee_code: String(log.EmployeeCode || ''),
        log_date: log.LogDate,  //  Direct mapping - no timezone conversion!
        punch_direction: (log.PunchDirection || 'unknown').toLowerCase(),
        sync_time: syncTimestamp  //  Track when this data was synced
      })).filter(log => 
        log.employee_code && 
        log.log_date && 
        ['in', 'out'].includes(log.punch_direction)
      )
      
      Logger.info(`Storing ${cleanLogs.length} clean attendance logs...`)
      
      // Insert with duplicate handling - 5 columns including sync_time
      const { data, error } = await supabase
        .from('employee_raw_logs')
        .upsert(cleanLogs, { 
          onConflict: 'employee_code,log_date,punch_direction',
          ignoreDuplicates: true 
        })
      
      if (error) {
        Logger.error('Failed to store logs:', error.message)
        return { stored: 0, errors: cleanLogs.length }
      }
      
      Logger.success(`✅ Successfully stored ${cleanLogs.length} logs`)
      return { stored: cleanLogs.length, errors: 0 }
      
    } catch (error) {
      Logger.error('Storage failed:', error.message)
      return { stored: 0, errors: logs.length }
    }
  }
  
  static async updateEmployeeNames(employees) {
    if (!employees || employees.length === 0) {
      Logger.info('No employee data to update')
      return { updated: 0, errors: 0 }
    }
    
    try {
      Logger.info(`👥 Updating ${employees.length} employee names...`)
      
      // Transform employee data
      const employeeData = employees.map(emp => ({
        employee_code: String(emp.EmployeeCode || emp.Code || ''),
        employee_name: emp.EmployeeName || emp.Name || `Employee ${emp.EmployeeCode}`,
        department: emp.DepartmentSName || emp.Department || 'Default',
        designation: emp.Designation || 'Employee',
        status: emp.Status === 'Working' ? 'active' : 'inactive',
        last_updated: new Date().toISOString()
      })).filter(emp => emp.employee_code)
      
      if (employeeData.length === 0) {
        Logger.info('No valid employee data after filtering')
        return { updated: 0, errors: employees.length }
      }
      
      // Upsert employee data
      const { error } = await supabase
        .from('employee_master_simple')
        .upsert(employeeData, { 
          onConflict: 'employee_code',
          ignoreDuplicates: false 
        })
      
      if (error) {
        Logger.error('Failed to update employee names:', error.message)
        return { updated: 0, errors: employeeData.length }
      }
      
      Logger.success(`✅ Successfully updated ${employeeData.length} employee names`)
      return { updated: employeeData.length, errors: 0 }
      
    } catch (error) {
      Logger.error('Employee update failed:', error.message)
      return { updated: 0, errors: employees.length }
    }
  }
  
  static async updateDeviceStatus(status, lastSync = null, errorMessage = null) {
    try {
      const statusData = {
        status,
        last_sync: lastSync || new Date().toISOString(),
        error_message: errorMessage
      }
      
      await supabase
        .from('device_status')
        .upsert(statusData, { onConflict: 'id' })
      
      Logger.info(`Device status updated: ${status}`)
    } catch (error) {
      Logger.error('Failed to update device status', error.message)
    }
  }
}

// ============================================================================
// SYNC MANAGER
// ============================================================================

class SyncManager {
  static lastEmployeeSync = 0  // Track last employee sync time
  
  static async syncEmployeeNames() {
    try {
      Logger.info('👥 Syncing employee names from SmartOffice...')
      
      // Fetch employees from SmartOffice
      const employees = await SmartOfficeAPI.fetchAllEmployees()
      
      if (employees.length === 0) {
        Logger.info('No employees found in SmartOffice')
        return { updated: 0, errors: 0 }
      }
      
      // Update employee names in database
      const result = await DataProcessor.updateEmployeeNames(employees)
      
      // Update last sync time
      this.lastEmployeeSync = Date.now()
      
      Logger.success(`✅ Employee sync completed: ${result.updated} updated, ${result.errors} errors`)
      return result
      
    } catch (error) {
      Logger.error('Employee sync failed:', error.message)
      return { updated: 0, errors: 1 }
    }
  }
  
  static async checkEmployeeSync() {
    try {
      const now = Date.now()
      const fifteenMinutes = 15 * 60 * 1000  // 15 minutes in milliseconds
      
      // Check if 15 minutes have passed since last employee sync
      if (now - this.lastEmployeeSync >= fifteenMinutes) {
        Logger.info('⏰ 15 minutes elapsed - checking for employee updates...')
        await this.syncEmployeeNames()
      }
    } catch (error) {
      Logger.error('Employee sync check failed:', error.message)
    }
  }
  
  static async checkFirstDeployment() {
    try {
      Logger.info('🔍 Checking if this is first deployment...')
      
      // Check if employee_raw_logs table has historical data
      const { count, error } = await supabase
        .from('employee_raw_logs')
        .select('*', { count: 'exact', head: true })
        .gte('log_date', '2025-08-01')
        .lte('log_date', '2025-10-31')
      
      if (error) {
        Logger.error('Failed to check deployment status', error.message)
        return false
      }
      
      if (count === 0) {
        Logger.info('🚀 MISSING HISTORICAL DATA DETECTED - Auto-fetching 3 months historical data!')
        Logger.info('   Date Range: August 1 - October 31, 2025')
        Logger.info('   Expected Records: 15,000-30,000')
        Logger.info('')
        
        // Auto-fetch 3 months historical data
        const result = await this.performSync('2025-08-01', '2025-10-31')
        
        // Also sync employee names on first deployment
        Logger.info('👥 First deployment - syncing employee names...')
        await this.syncEmployeeNames()
        
        if (result.newLogs > 0) {
          Logger.success(`✅ First deployment complete! Synced ${result.newLogs} historical records`)
        } else {
          Logger.error('❌ First deployment failed - no historical data found')
        }
        
        return true
      } else {
        Logger.info(`✅ Historical data exists (${count} records found for Aug-Oct 2025)`)
        return false
      }
    } catch (error) {
      Logger.error('Failed to check first deployment', error.message)
      return false
    }
  }
  
  static async performSync(fromDate = null, toDate = null) {
    try {
      // Default to last 24 hours if no dates provided
      if (!fromDate || !toDate) {
        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        fromDate = yesterday.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
      }
      
      Logger.info(`🔄 Starting sync: ${fromDate} to ${toDate}`)
      
      // Fetch logs from SmartOffice
      const logs = await SmartOfficeAPI.fetchAttendanceLogs(fromDate, toDate)
      
      if (logs.length === 0) {
        Logger.info('No new logs found')
        await DataProcessor.updateDeviceStatus('online')
        return { newLogs: 0, errors: 0 }
      }
      
      // Store clean logs
      const result = await DataProcessor.storeAttendanceLogs(logs)
      
      // Update device status
      await DataProcessor.updateDeviceStatus('online')
      
      Logger.success(`✅ Sync completed in ${Date.now() - Date.now()}ms`)
      Logger.success(`   New logs: ${result.stored}`)
      Logger.success(`   Errors: ${result.errors}`)
      
      return {
        newLogs: result.stored,
        errors: result.errors
      }
      
    } catch (error) {
      Logger.error('Sync failed:', error.message)
      await DataProcessor.updateDeviceStatus('error', null, error.message)
      return { newLogs: 0, errors: 1 }
    }
  }
  
  static async checkSyncRequests() {
    try {
      Logger.info('🔍 Checking for pending sync requests...')
      
      const { data: requests, error } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })
        .limit(5)
      
      if (error) {
        Logger.error('Failed to check sync requests', error.message)
        return
      }
      
      if (!requests || requests.length === 0) {
        Logger.info('No pending sync requests')
        return
      }
      
      for (const request of requests) {
        Logger.info(`🔔 Found pending sync request #${request.id}`)
        Logger.info(`   Type: ${request.sync_type}`)
        Logger.info(`   Requested by: ${request.requested_by}`)
        
        await this.processSyncRequest(request)
      }
      
    } catch (error) {
      Logger.error('Failed to check sync requests', error.message)
    }
  }
  
  static async processSyncRequest(request) {
    try {
      // Update status to processing
      await supabase
        .from('sync_requests')
        .update({ status: 'processing' })
        .eq('id', request.id)
      
      let result = { newLogs: 0, errors: 0 }
      
      if (request.sync_type === 'historical') {
        // Extract date range from result field
        const dateMatch = request.result.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          const [, fromDate, toDate] = dateMatch
          Logger.info(`🔄 Processing historical sync: ${fromDate} to ${toDate}`)
          result = await this.performSync(fromDate, toDate)
        }
      } else if (request.sync_type === 'manual') {
        Logger.info(`🔄 Processing manual sync`)
        result = await this.performSync()
      } else if (request.sync_type === 'employees') {
        Logger.info(`👥 Processing employee sync`)
        const empResult = await this.syncEmployeeNames()
        result = { newLogs: empResult.updated, errors: empResult.errors }
      }
      
      // Update request status
      const statusUpdate = {
        status: result.errors > 0 ? 'failed' : 'completed',
        result: `Synced ${result.newLogs} new logs`,
        completed_at: new Date().toISOString()
      }
      
      await supabase
        .from('sync_requests')
        .update(statusUpdate)
        .eq('id', request.id)
      
      Logger.success(`✅ Sync request #${request.id} completed: ${statusUpdate.result}`)
      
    } catch (error) {
      Logger.error(`Failed to process sync request #${request.id}`, error.message)
      
      await supabase
        .from('sync_requests')
        .update({ 
          status: 'failed', 
          result: `Error: ${error.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', request.id)
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  Logger.info('🎯 FIXED SmartOffice Sync Script Starting...')
  
  try {
    if (command === '--once') {
      // Single sync
      Logger.info('🔄 Running single sync...')
      await SyncManager.performSync()
      
    } else if (command === '--daemon') {
      // Check for first deployment and auto-sync 3 months
      await SyncManager.checkFirstDeployment()
      
      // Continuous sync every 5 seconds
      Logger.info('🔄 Starting daemon mode (5-second intervals)...')
      
      setInterval(async () => {
        await SyncManager.performSync()
        await SyncManager.checkSyncRequests()
        await SyncManager.checkEmployeeSync()  // Check every 5 seconds, but only sync every 15 minutes
      }, 5000)
      
      // Keep process alive
      process.on('SIGINT', () => {
        Logger.info('Daemon stopped')
        process.exit(0)
      })
      
    } else if (command === 'historical' && args[1] && args[2]) {
      // Historical sync with date range
      const fromDate = args[1]
      const toDate = args[2]
      Logger.info(`🔄 Running historical sync: ${fromDate} to ${toDate}`)
      await SyncManager.performSync(fromDate, toDate)
      
    } else {
      // Default: check first deployment, then check requests and run sync
      await SyncManager.checkFirstDeployment()
      await SyncManager.checkSyncRequests()
      await SyncManager.performSync()
    }
    
  } catch (error) {
    Logger.error('Script execution failed', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { SyncManager, DataProcessor, SmartOfficeAPI }
