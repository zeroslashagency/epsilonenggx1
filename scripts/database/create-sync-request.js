#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://sxnaopzgaddvziplrlbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
)

async function createSyncRequest() {
  console.log('🔄 Creating sync request for Oct 15-20, 2025...\n')

  try {
    const { data, error } = await supabase
      .from('sync_requests')
      .insert({
        sync_type: 'historical',
        requested_by: 'admin',
        result: 'Sync data from 2025-10-15 to 2025-10-20',
        status: 'pending'
      })
      .select()

    if (error) {
      console.error('❌ Error creating sync request:', error.message)
      return
    }

    console.log('✅ Sync request created successfully!')
    console.log('📋 Request ID:', data[0].id)
    console.log('📅 Date Range: 2025-10-15 to 2025-10-20')
    console.log('⏰ Status: pending')
    console.log('')
    console.log('🎯 Your office computer will process this request automatically!')
    console.log('   - Checks every 5 seconds for pending requests')
    console.log('   - Will fetch data from SmartOffice')
    console.log('   - Will sync to Supabase')
    console.log('   - Will update status to "completed"')
    console.log('')
    console.log('⏳ Expected completion: 1-2 minutes')
    console.log('📊 Monitor progress in Supabase logs')
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createSyncRequest()
