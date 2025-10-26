#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://sxnaopzgaddvziplrlbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
)

async function checkDatabaseGrowth() {
  console.log('🔍 DATABASE GROWTH INVESTIGATION')
  console.log('=' .repeat(70))
  console.log('')

  try {
    // Check total count
    const { count: totalCount } = await supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 TOTAL RECORDS: ${totalCount}`)
    console.log('')

    // Check count by month
    console.log('📅 RECORDS BY MONTH:')
    console.log('-'.repeat(70))

    const months = [
      { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
      { name: 'June 2025', start: '2025-06-01', end: '2025-06-30' },
      { name: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
      { name: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
      { name: 'September 2025', start: '2025-09-01', end: '2025-09-30' },
      { name: 'October 2025', start: '2025-10-01', end: '2025-10-31' },
    ]

    for (const month of months) {
      const { count } = await supabase
        .from('employee_raw_logs')
        .select('*', { count: 'exact', head: true })
        .gte('log_date', `${month.start}T00:00:00.000Z`)
        .lte('log_date', `${month.end}T23:59:59.999Z`)

      console.log(`  ${month.name}: ${count} records`)
    }

    console.log('')
    console.log('🔍 CHECKING FOR LIMITS IN DATABASE:')
    console.log('-'.repeat(70))

    // Check latest records
    const { data: latestRecords } = await supabase
      .from('employee_raw_logs')
      .select('log_date, sync_time')
      .order('log_date', { ascending: false })
      .limit(10)

    console.log('  Latest 10 records:')
    latestRecords?.forEach((record, i) => {
      console.log(`    ${i + 1}. Log Date: ${record.log_date}, Synced: ${record.sync_time}`)
    })

    console.log('')
    console.log('🔍 CHECKING TODAY\'S NEW RECORDS:')
    console.log('-'.repeat(70))

    const today = new Date().toISOString().split('T')[0]
    const { data: todayRecords, count: todayCount } = await supabase
      .from('employee_raw_logs')
      .select('*', { count: 'exact' })
      .gte('log_date', `${today}T00:00:00.000Z`)
      .lte('log_date', `${today}T23:59:59.999Z`)

    console.log(`  Today (${today}): ${todayCount} records`)

    // Check sync times for today
    if (todayRecords && todayRecords.length > 0) {
      const syncTimes = new Set(todayRecords.map(r => r.sync_time))
      console.log(`  Unique sync times today: ${syncTimes.size}`)
      console.log(`  Latest sync: ${Array.from(syncTimes).sort().pop()}`)
    }

    console.log('')
    console.log('🔍 CHECKING FOR DUPLICATE PREVENTION:')
    console.log('-'.repeat(70))

    // Check if there are any duplicate attempts
    const { data: sampleRecords } = await supabase
      .from('employee_raw_logs')
      .select('employee_code, log_date, punch_direction')
      .limit(5)

    console.log('  Sample records (checking for duplicates):')
    for (const record of sampleRecords || []) {
      const { count: duplicateCount } = await supabase
        .from('employee_raw_logs')
        .select('*', { count: 'exact', head: true })
        .eq('employee_code', record.employee_code)
        .eq('log_date', record.log_date)
        .eq('punch_direction', record.punch_direction)

      console.log(`    Employee ${record.employee_code}, ${record.log_date}: ${duplicateCount} record(s)`)
    }

    console.log('')
    console.log('🔍 CHECKING SYNC SCRIPT STATUS:')
    console.log('-'.repeat(70))

    // Check device status
    const { data: deviceStatus } = await supabase
      .from('device_status')
      .select('*')
      .limit(1)

    if (deviceStatus && deviceStatus.length > 0) {
      console.log('  Device Status:', deviceStatus[0].status)
      console.log('  Last Sync:', deviceStatus[0].last_sync)
      console.log('  Error:', deviceStatus[0].error_message || 'None')
    }

    console.log('')
    console.log('=' .repeat(70))
    console.log('🎯 ANALYSIS:')
    console.log('')

    if (totalCount === 14962) {
      console.log('⚠️  WARNING: Total count is exactly 14962')
      console.log('⚠️  This might indicate a limit or sync stopped')
      console.log('⚠️  New data should be added daily')
    }

    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkDatabaseGrowth()
