#!/usr/bin/env node

/**
 * 🎯 RAW DATA ONLY - SmartOffice Sync Script
 * 
 * Features:
 * - Store EXACT device data (no processing)
 * - Allow duplicate INs/OUTs (employee clicks IN multiple times)
 * - Separate employee names storage
 * - Manual & Auto sync support
 * - Your UI controls all calculations
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// ============================================================================
// CONFIGURATION
// ============================================================================

require('dotenv').config()

const CONFIG = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
  },
  
  // SmartOffice API Configuration (from your documentation)
  smartOffice: {
    baseUrl: process.env.SMARTOFFICE_API_URL || 'http://localhost:84/api/v2/WebAPI',
    apiKey: process.env.SMARTOFFICE_API_KEY || '344612092518',
    deviceId: process.env.SMARTOFFICE_DEVICE_ID || 'C26044C84F13202C'
  },
  
  // Sync Configuration
  sync: {
    autoSyncInterval: 5000, // 5 seconds
    batchSize: 100, // Process logs in batches
    maxRetries: 3,
    retryDelay: 2000
  }
}

// ============================================================================
// INITIALIZE SUPABASE CLIENT
// ============================================================================

const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key)

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    console.log(logEntry)
    if (data) {
      console.log(JSON.stringify(data, null, 2))
    }
    
    // Write to log file
    const logFile = path.join(__dirname, 'raw-sync-logs.txt')
    fs.appendFileSync(logFile, logEntry + '\n')
  }
  
  static info(message, data) { this.log('info', message, data) }
  static warn(message, data) { this.log('warn', message, data) }
  static error(message, data) { this.log('error', message, data) }
  static success(message, data) { this.log('success', message, data) }
}

// ============================================================================
// DEVICE STATUS MANAGER
// ============================================================================

class DeviceStatusManager {
  static async updateStatus(status, errorMessage = null) {
    try {
      const { error } = await supabase
        .from('device_status')
        .upsert({
          device_id: CONFIG.smartOffice.deviceId,
          device_name: 'SmartOffice Attendance Device',
          serial_number: CONFIG.smartOffice.deviceId,
          last_sync: new Date().toISOString(),
          status: status,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      Logger.info(`Device status updated: ${status}`)
    } catch (error) {
      Logger.error('Failed to update device status', error)
    }
  }
}

// ============================================================================
// SMARTOFFICE API CLIENT
// ============================================================================

class SmartOfficeAPI {
  static async fetchAttendanceLogs(fromDate = null, toDate = null) {
    try {
      let url = `${CONFIG.smartOffice.baseUrl}/GetAttendanceLogs`
      const params = new URLSearchParams({
        APIKey: CONFIG.smartOffice.apiKey
      })
      
      if (fromDate) params.append('FromDate', fromDate)
      if (toDate) params.append('ToDate', toDate)
      
      url += '?' + params.toString()
      
      Logger.info(`Fetching attendance logs: ${url}`)
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 200 && response.data) {
        const logs = Array.isArray(response.data) ? response.data : []
        Logger.success(`Fetched ${logs.length} raw logs from SmartOffice`)
        return logs
      } else {
        throw new Error(`Invalid response: ${response.status}`)
      }
    } catch (error) {
      Logger.error('Failed to fetch attendance logs', {
        error: error.message,
        url: error.config?.url
      })
      throw error
    }
  }
  
  static async fetchEmployees() {
    try {
      const url = `${CONFIG.smartOffice.baseUrl}/GetEmployees?APIKey=${CONFIG.smartOffice.apiKey}`
      Logger.info(`Fetching employees: ${url}`)
      
      const response = await axios.get(url, { timeout: 15000 })
      
      if (response.status === 200 && response.data) {
        const employees = Array.isArray(response.data) ? response.data : []
        Logger.success(`Fetched ${employees.length} employees from SmartOffice`)
        return employees
      }
      return []
    } catch (error) {
      Logger.error('Failed to fetch employees from SmartOffice', error)
      return []
    }
  }
}

// ============================================================================
// RAW DATA PROCESSOR (NO CALCULATIONS)
// ============================================================================

class RawDataProcessor {
  static async storeRawLogs(logs) {
    if (!logs || logs.length === 0) {
      Logger.info('No logs to store')
      return { stored: 0, errors: 0 }
    }
    
    let stored = 0
    let errors = 0
    
    Logger.info(`Storing ${logs.length} raw logs (allowing duplicates)`)
    
    // Process in batches
    for (let i = 0; i < logs.length; i += CONFIG.sync.batchSize) {
      const batch = logs.slice(i, i + CONFIG.sync.batchSize)
      
      try {
        const rawLogEntries = batch.map(log => ({
          employee_code: log.EmployeeCode || 'Unknown',
          log_date: log.LogDate,
          serial_number: log.SerialNumber,
          punch_direction: log.PunchDirection || 'in',
          temperature: parseInt(log.Temperature) || 0,
          temperature_state: log.TemperatureState || 'Not Measured',
          raw_json: log, // Store complete original JSON
          synced_at: new Date().toISOString()
        }))
        
        // Insert without conflict resolution - allow duplicates
        const { data, error } = await supabase
          .from('employee_raw_logs')
          .insert(rawLogEntries)
        
        if (error) {
          Logger.error(`Batch storage error:`, error)
          errors += batch.length
        } else {
          stored += batch.length
          Logger.info(`Stored batch: ${batch.length} raw logs`)
        }
        
      } catch (error) {
        Logger.error(`Failed to store batch:`, error)
        errors += batch.length
      }
    }
    
    Logger.success(`Raw storage complete: ${stored} stored, ${errors} errors`)
    return { stored, errors }
  }
  
  static async updateEmployeeNames(employees) {
    if (!employees || employees.length === 0) {
      Logger.info('No employee data to update')
      return
    }
    
    try {
      const employeeData = employees.map(emp => ({
        employee_code: emp.EmployeeCode || emp.Code || emp.employee_code,
        employee_name: emp.EmployeeName || emp.Name || emp.employee_name || `Employee ${emp.EmployeeCode}`,
        department: emp.Department || 'Unknown',
        designation: emp.Designation || 'Unknown',
        status: emp.Status || 'active',
        last_updated: new Date().toISOString()
      }))
      
      // Upsert employee names (update existing, insert new)
      const { error } = await supabase
        .from('employee_master_simple')
        .upsert(employeeData, { 
          onConflict: 'employee_code',
          ignoreDuplicates: false 
        })
      
      if (error) throw error
      
      Logger.success(`Updated ${employees.length} employee names`)
    } catch (error) {
      Logger.error('Failed to update employee names', error)
    }
  }
}

// ============================================================================
// SYNC REQUEST HANDLER
// ============================================================================

class SyncRequestHandler {
  static async checkPendingRequests() {
    try {
      const { data: requests, error } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })
      
      if (error) throw error
      
      for (const request of requests || []) {
        await this.processSyncRequest(request)
      }
    } catch (error) {
      Logger.error('Failed to check pending requests', error)
    }
  }
  
  static async processSyncRequest(request) {
    try {
      Logger.info(`Processing sync request: ${request.id}`, request)
      
      // Mark as running
      await supabase
        .from('sync_requests')
        .update({ 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .eq('id', request.id)
      
      let logs = []
      
      if (request.sync_type === 'historical') {
        // Fetch historical data (if date range supported by API)
        logs = await SmartOfficeAPI.fetchAttendanceLogs()
      } else {
        // Fetch recent data
        logs = await SmartOfficeAPI.fetchAttendanceLogs()
      }
      
      const result = await RawDataProcessor.storeRawLogs(logs)
      
      // Mark as completed
      await supabase
        .from('sync_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: `Stored ${result.stored} raw logs`
        })
        .eq('id', request.id)
      
      Logger.success(`Sync request ${request.id} completed: ${result.stored} logs stored`)
      
    } catch (error) {
      Logger.error(`Sync request ${request.id} failed`, error)
      
      await supabase
        .from('sync_requests')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          result: `Error: ${error.message}`
        })
        .eq('id', request.id)
    }
  }
}

// ============================================================================
// MAIN RAW DATA SYNC MANAGER
// ============================================================================

class RawDataSyncManager {
  constructor() {
    this.isRunning = false
    this.syncInterval = null
  }
  
  async start() {
    if (this.isRunning) {
      Logger.warn('Raw data sync manager already running')
      return
    }
    
    this.isRunning = true
    Logger.info('🎯 Starting RAW DATA ONLY Sync Manager')
    
    // Update device status
    await DeviceStatusManager.updateStatus('online')
    
    // Start auto-sync interval
    this.syncInterval = setInterval(async () => {
      await this.performRawDataSync()
    }, CONFIG.sync.autoSyncInterval)
    
    // Initial sync
    await this.performRawDataSync()
    
    // Check for pending manual requests
    setInterval(async () => {
      await SyncRequestHandler.checkPendingRequests()
    }, 10000) // Check every 10 seconds
    
    Logger.success('Raw data sync manager started successfully')
  }
  
  async stop() {
    if (!this.isRunning) return
    
    this.isRunning = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    await DeviceStatusManager.updateStatus('offline')
    Logger.info('Raw data sync manager stopped')
  }
  
  async performRawDataSync() {
    try {
      Logger.info('Performing raw data sync...')
      
      // Fetch raw logs from SmartOffice (no date filtering for recent data)
      const logs = await SmartOfficeAPI.fetchAttendanceLogs()
      
      // Store EXACT data (no processing)
      const result = await RawDataProcessor.storeRawLogs(logs)
      
      // Update employee names separately (periodically)
      if (Math.random() < 0.1) { // 10% chance each sync
        const employees = await SmartOfficeAPI.fetchEmployees()
        await RawDataProcessor.updateEmployeeNames(employees)
      }
      
      await DeviceStatusManager.updateStatus('online')
      
      Logger.success(`Raw sync completed: ${result.stored} logs stored`)
      
    } catch (error) {
      Logger.error('Raw data sync failed', error)
      await DeviceStatusManager.updateStatus('error', error.message)
    }
  }
  
  async syncHistoricalData(fromDate, toDate) {
    Logger.info(`Starting historical raw data sync: ${fromDate} to ${toDate}`)
    
    try {
      // Fetch historical logs
      const logs = await SmartOfficeAPI.fetchAttendanceLogs(fromDate, toDate)
      
      // Store raw data
      const result = await RawDataProcessor.storeRawLogs(logs)
      
      Logger.success(`Historical sync completed: ${result.stored} raw logs stored`)
      
    } catch (error) {
      Logger.error('Historical raw data sync failed', error)
      throw error
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  const syncManager = new RawDataSyncManager()
  
  try {
    switch (command) {
      case 'start':
        await syncManager.start()
        
        // Keep running
        process.on('SIGINT', async () => {
          Logger.info('Received SIGINT, stopping raw data sync manager...')
          await syncManager.stop()
          process.exit(0)
        })
        
        // Keep process alive
        setInterval(() => {}, 1000)
        break
        
      case 'historical':
        const fromDate = args[1] || '2025-01-01'
        const toDate = args[2] || new Date().toISOString().split('T')[0]
        
        Logger.info(`Syncing historical raw data: ${fromDate} to ${toDate}`)
        await syncManager.syncHistoricalData(fromDate, toDate)
        break
        
      case 'manual':
        Logger.info('Performing manual raw data sync...')
        await syncManager.performRawDataSync()
        break
        
      default:
        console.log(`
🎯 RAW DATA ONLY - SmartOffice Sync Script

Usage:
  node office-sync-script-raw-data-only.js start              # Start auto-sync (5 second intervals)
  node office-sync-script-raw-data-only.js manual             # Manual one-time sync
  node office-sync-script-raw-data-only.js historical [from] [to]  # Sync historical raw data

Examples:
  node office-sync-script-raw-data-only.js start
  node office-sync-script-raw-data-only.js historical 2025-01-01 2025-09-28
  node office-sync-script-raw-data-only.js manual

Features:
  ✅ Stores EXACT device data (no processing)
  ✅ Allows duplicate INs/OUTs (employee clicks IN multiple times)
  ✅ Separate employee names storage
  ✅ Your UI controls all calculations
        `)
        break
    }
  } catch (error) {
    Logger.error('Script execution failed', error)
    process.exit(1)
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

module.exports = {
  RawDataSyncManager,
  SmartOfficeAPI,
  RawDataProcessor,
  SyncRequestHandler,
  DeviceStatusManager
}

// Run if called directly
if (require.main === module) {
  main()
}
