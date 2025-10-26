#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://sxnaopzgaddvziplrlbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
)

async function checkFullOctober() {
  console.log('🔍 FULL OCTOBER 2025 REPORT - REAL DATA FROM DATABASE\n')
  console.log('=' .repeat(70))

  try {
    // Check each day of October
    for (let day = 1; day <= 26; day++) {
      const dateStr = `2025-10-${String(day).padStart(2, '0')}`
      
      const startDate = new Date(dateStr)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(dateStr)
      endDate.setHours(23, 59, 59, 999)

      const { data, error, count } = await supabase
        .from('employee_raw_logs')
        .select('*', { count: 'exact' })
        .gte('log_date', startDate.toISOString())
        .lte('log_date', endDate.toISOString())

      if (error) {
        console.error(`❌ Error for ${dateStr}:`, error.message)
        continue
      }

      // Count unique employees
      const uniqueEmployees = new Set(data.map(log => log.employee_code))

      const icon = count > 0 ? '✅' : '❌'
      console.log(`${icon} ${dateStr}: ${count} punches, ${uniqueEmployees.size} employees`)
    }

    console.log('=' .repeat(70))
    
    // Get total for October
    const { count: octoberTotal } = await supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact', head: true })
      .gte('log_date', '2025-10-01T00:00:00.000Z')
      .lte('log_date', '2025-10-31T23:59:59.999Z')

    console.log(`\n📊 OCTOBER 2025 TOTAL: ${octoberTotal} records`)

    // Get overall total
    const { count: totalCount } = await supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 DATABASE TOTAL: ${totalCount} records`)

    // Check for Oct 12-13 specifically
    console.log('\n🔍 DETAILED CHECK FOR OCT 12-13:')
    console.log('=' .repeat(70))
    
    for (const date of ['2025-10-12', '2025-10-13']) {
      const { data: logs } = await supabase
        .from('employee_raw_logs')
        .select('*')
        .gte('log_date', `${date}T00:00:00.000Z`)
        .lte('log_date', `${date}T23:59:59.999Z`)
        .limit(5)

      console.log(`\n${date}:`)
      if (logs && logs.length > 0) {
        console.log(`  Found ${logs.length} records (showing first 5):`)
        logs.forEach((log, i) => {
          console.log(`  ${i + 1}. Employee: ${log.employee_code}, Time: ${log.log_date}, Direction: ${log.punch_direction}`)
        })
      } else {
        console.log(`  ❌ NO RECORDS FOUND`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkFullOctober()
