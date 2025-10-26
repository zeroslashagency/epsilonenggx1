#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://sxnaopzgaddvziplrlbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
)

async function checkHistoricalData() {
  console.log('🔍 Checking historical data for Oct 14-20, 2025...\n')

  try {
    // Get data for each day
    const dates = [
      '2025-10-14',
      '2025-10-15',
      '2025-10-16',
      '2025-10-17',
      '2025-10-18',
      '2025-10-19',
      '2025-10-20'
    ]

    for (const date of dates) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      const { data, error, count } = await supabase
        .from('employee_raw_logs')
        .select('*', { count: 'exact' })
        .gte('log_date', startDate.toISOString())
        .lte('log_date', endDate.toISOString())

      if (error) {
        console.error(`❌ Error for ${date}:`, error.message)
        continue
      }

      // Count unique employees
      const uniqueEmployees = new Set(data.map(log => log.employee_code))

      if (count > 0) {
        console.log(`✅ ${date}: ${count} punches, ${uniqueEmployees.size} employees`)
      } else {
        console.log(`❌ ${date}: 0 punches, 0 employees`)
      }
    }

    // Get total count
    console.log('\n📊 Overall Statistics:')
    
    const { count: totalCount } = await supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact', head: true })

    console.log(`   Total records in database: ${totalCount}`)

    // Get date range
    const { data: minDate } = await supabase
      .from('employee_raw_logs')
      .select('log_date')
      .order('log_date', { ascending: true })
      .limit(1)

    const { data: maxDate } = await supabase
      .from('employee_raw_logs')
      .select('log_date')
      .order('log_date', { ascending: false })
      .limit(1)

    if (minDate && minDate.length > 0 && maxDate && maxDate.length > 0) {
      console.log(`   Date range: ${minDate[0].log_date.split('T')[0]} to ${maxDate[0].log_date.split('T')[0]}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkHistoricalData()
