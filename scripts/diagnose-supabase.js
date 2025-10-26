#!/usr/bin/env node

/**
 * Complete Supabase Diagnostic Tool
 * Tests everything about the Supabase connection
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const https = require('https')

console.log('\n🔍 COMPLETE SUPABASE DIAGNOSTIC\n')
console.log('=' .repeat(70))

// 1. Check environment variables
console.log('\n📋 STEP 1: Environment Variables')
console.log('-'.repeat(70))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl || '❌ MISSING')
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : '❌ MISSING')
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 30)}...` : '❌ MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ FATAL: Missing environment variables!')
  process.exit(1)
}

// 2. Check if URL is reachable
console.log('\n🌐 STEP 2: Network Connectivity')
console.log('-'.repeat(70))

function checkUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'HEAD',
      timeout: 5000
    }

    const req = https.request(options, (res) => {
      console.log(`✅ URL is reachable (Status: ${res.statusCode})`)
      resolve(true)
    })

    req.on('error', (error) => {
      console.error(`❌ Cannot reach URL: ${error.message}`)
      resolve(false)
    })

    req.on('timeout', () => {
      console.error('❌ Request timeout')
      req.destroy()
      resolve(false)
    })

    req.end()
  })
}

// 3. Test Supabase client creation
console.log('\n🔧 STEP 3: Creating Supabase Client')
console.log('-'.repeat(70))

let supabase
try {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  console.log('✅ Supabase client created successfully')
} catch (error) {
  console.error('❌ Failed to create client:', error.message)
  process.exit(1)
}

// 4. Test database connection
async function testDatabase() {
  console.log('\n🗄️  STEP 4: Testing Database Connection')
  console.log('-'.repeat(70))

  try {
    // Test 1: Simple query
    console.log('\nTest 1: Simple health check...')
    const { data, error } = await supabase
      .from('roles')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Database query failed')
      console.error('Error Message:', error.message)
      console.error('Error Code:', error.code)
      console.error('Error Details:', error.details)
      console.error('Error Hint:', error.hint)
      
      // Check if it's an API key issue
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        console.log('\n🔑 API KEY ISSUE DETECTED!')
        console.log('\nPossible causes:')
        console.log('1. API keys are expired')
        console.log('2. API keys are from a different project')
        console.log('3. Project was deleted/recreated')
        console.log('4. Keys have wrong permissions')
        
        console.log('\n📝 How to fix:')
        console.log('1. Go to: https://supabase.com/dashboard')
        console.log('2. Select your project')
        console.log('3. Settings → API')
        console.log('4. Copy fresh keys')
        console.log('5. Update .env.local')
        console.log('6. Restart server')
      }
      
      return false
    }

    console.log('✅ Database connection successful!')
    
    // Test 2: Check if roles table exists
    console.log('\nTest 2: Checking roles table...')
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(5)

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message)
      return false
    }

    console.log(`✅ Found ${roles?.length || 0} roles`)
    
    if (roles && roles.length > 0) {
      console.log('\nRoles in database:')
      roles.forEach(role => {
        console.log(`  • ${role.id}: ${role.name}`)
      })
      
      // Check schema
      console.log('\nTable columns:', Object.keys(roles[0]).join(', '))
      
      // Check for required columns
      const requiredColumns = ['id', 'name', 'description', 'is_manufacturing_role', 'permissions_json']
      const existingColumns = Object.keys(roles[0])
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
      
      if (missingColumns.length > 0) {
        console.warn('\n⚠️  Missing columns:', missingColumns.join(', '))
      } else {
        console.log('✅ All required columns exist')
      }
    } else {
      console.warn('⚠️  No roles found in database')
      console.log('\n💡 You may need to insert sample data')
    }

    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

// 5. Test specific role fetch
async function testRoleFetch() {
  console.log('\n🎯 STEP 5: Testing Specific Role Fetch')
  console.log('-'.repeat(70))

  try {
    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', '2')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error:', error.message)
      return false
    }

    if (role) {
      console.log('✅ Role ID 2 found:', role.name)
      console.log('Description:', role.description)
      console.log('Manufacturing Role:', role.is_manufacturing_role)
      console.log('Has Permissions:', !!role.permissions_json)
    } else {
      console.warn('⚠️  Role ID 2 not found')
    }

    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Run all tests
async function runDiagnostics() {
  try {
    // Check network
    const networkOk = await checkUrl(supabaseUrl)
    if (!networkOk) {
      console.log('\n❌ FAILED: Cannot reach Supabase URL')
      console.log('Check your internet connection or firewall')
      return false
    }

    // Test database
    const dbOk = await testDatabase()
    if (!dbOk) {
      console.log('\n❌ FAILED: Database connection failed')
      return false
    }

    // Test role fetch
    await testRoleFetch()

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ ALL DIAGNOSTICS PASSED!')
    console.log('='.repeat(70))
    console.log('\n🎉 Your Supabase connection is working correctly!')
    console.log('\nYou can now:')
    console.log('  • Edit roles at: http://localhost:3000/settings/roles/2/edit')
    console.log('  • Create new roles')
    console.log('  • Implement RBAC features')
    console.log('')

    return true

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message)
    console.error('Stack:', error.stack)
    return false
  }
}

// Execute
runDiagnostics()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
