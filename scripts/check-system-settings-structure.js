// Check system_settings vs system_administration module structure
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkModuleStructure() {
  console.log('🔍 Checking system modules structure...\n')
  
  const { data: role, error } = await supabase
    .from('roles')
    .select('name, permissions_json')
    .eq('name', 'qwer')
    .single()
  
  if (error || !role) {
    console.error('❌ Error:', error?.message || 'Role not found')
    return
  }
  
  const permissions = role.permissions_json
  
  console.log('📊 SYSTEM_ADMINISTRATION MODULE:')
  if (permissions.system_administration) {
    console.log('   Items:', Object.keys(permissions.system_administration.items || {}))
    
    if (permissions.system_administration.items?.Account) {
      console.log('\n   ✅ Account found in system_administration:')
      console.log('   ', JSON.stringify(permissions.system_administration.items.Account, null, 2))
    } else {
      console.log('\n   ❌ Account NOT in system_administration')
    }
  } else {
    console.log('   ❌ Module not found')
  }
  
  console.log('\n📊 SYSTEM_SETTINGS MODULE:')
  if (permissions.system_settings) {
    console.log('   Items:', Object.keys(permissions.system_settings.items || {}))
    
    if (permissions.system_settings.items?.Account) {
      console.log('\n   ✅ Account found in system_settings:')
      console.log('   ', JSON.stringify(permissions.system_settings.items.Account, null, 2))
    } else {
      console.log('\n   ❌ Account NOT in system_settings')
    }
  } else {
    console.log('   ❌ Module not found')
  }
  
  console.log('\n🔍 MONITORING MODULE:')
  if (permissions.monitoring?.items) {
    console.log('   Items:', Object.keys(permissions.monitoring.items))
    
    if (permissions.monitoring.items['Quality Control']) {
      console.log('\n   ✅ Quality Control:')
      console.log('   ', JSON.stringify(permissions.monitoring.items['Quality Control'], null, 2))
    }
  }
}

checkModuleStructure().catch(console.error)
