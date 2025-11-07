// Check qwer role permissions from database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPermissions() {
  console.log('🔍 Checking qwer role permissions...\n')
  
  // Get qwer role permissions
  const { data: role, error } = await supabase
    .from('roles')
    .select('name, permissions_json')
    .eq('name', 'qwer')
    .single()
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  if (!role) {
    console.log('❌ Role "qwer" not found')
    return
  }
  
  console.log('✅ Found role:', role.name)
  console.log('\n📊 Permissions JSON:\n')
  
  const permissions = role.permissions_json
  
  // Check specific modules
  console.log('1. DASHBOARD (main_dashboard):')
  if (permissions.main_dashboard?.items?.Dashboard) {
    console.log('   ✅ Dashboard:', JSON.stringify(permissions.main_dashboard.items.Dashboard, null, 2))
  } else {
    console.log('   ❌ Dashboard: NOT FOUND')
  }
  
  console.log('\n2. ATTENDANCE (main_attendance):')
  if (permissions.main_attendance?.items?.Attendance) {
    console.log('   ✅ Attendance:', JSON.stringify(permissions.main_attendance.items.Attendance, null, 2))
  } else {
    console.log('   ❌ Attendance: NOT FOUND')
  }
  
  console.log('\n3. ACCOUNT (system_settings):')
  if (permissions.system_settings?.items?.Account) {
    console.log('   ✅ Account:', JSON.stringify(permissions.system_settings.items.Account, null, 2))
  } else {
    console.log('   ❌ Account: NOT FOUND')
  }
  
  console.log('\n4. QUALITY (monitoring):')
  if (permissions.monitoring?.items?.['Quality Control']) {
    console.log('   ✅ Quality Control:', JSON.stringify(permissions.monitoring.items['Quality Control'], null, 2))
  } else {
    console.log('   ❌ Quality Control: NOT FOUND')
  }
  
  console.log('\n📋 All modules in permissions_json:')
  Object.keys(permissions).forEach(module => {
    console.log(`   - ${module}`)
  })
  
  console.log('\n✅ Check complete')
}

checkPermissions().catch(console.error)
