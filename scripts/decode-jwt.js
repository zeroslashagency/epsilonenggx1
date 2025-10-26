#!/usr/bin/env node

/**
 * Decode JWT tokens to check project info
 */

require('dotenv').config({ path: '.env.local' })

function decodeJWT(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format' }
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return payload
  } catch (error) {
    return { error: error.message }
  }
}

console.log('\n🔍 JWT TOKEN ANALYSIS\n')
console.log('=' .repeat(70))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n📍 Project URL:', supabaseUrl)

if (supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (match) {
    console.log('📦 Project ID from URL:', match[1])
  }
}

console.log('\n🔑 Anon Key Analysis:')
console.log('-'.repeat(70))
if (anonKey) {
  const decoded = decodeJWT(anonKey)
  if (decoded.error) {
    console.log('❌ Error:', decoded.error)
  } else {
    console.log('Issuer:', decoded.iss)
    console.log('Project Ref:', decoded.ref)
    console.log('Role:', decoded.role)
    console.log('Issued At:', new Date(decoded.iat * 1000).toISOString())
    console.log('Expires At:', new Date(decoded.exp * 1000).toISOString())
    
    const now = Date.now() / 1000
    if (decoded.exp < now) {
      console.log('❌ TOKEN EXPIRED!')
    } else {
      console.log('✅ Token is valid until', new Date(decoded.exp * 1000).toLocaleDateString())
    }
  }
} else {
  console.log('❌ No anon key found')
}

console.log('\n🔐 Service Role Key Analysis:')
console.log('-'.repeat(70))
if (serviceKey) {
  const decoded = decodeJWT(serviceKey)
  if (decoded.error) {
    console.log('❌ Error:', decoded.error)
  } else {
    console.log('Issuer:', decoded.iss)
    console.log('Project Ref:', decoded.ref)
    console.log('Role:', decoded.role)
    console.log('Issued At:', new Date(decoded.iat * 1000).toISOString())
    console.log('Expires At:', new Date(decoded.exp * 1000).toISOString())
    
    const now = Date.now() / 1000
    if (decoded.exp < now) {
      console.log('❌ TOKEN EXPIRED!')
    } else {
      console.log('✅ Token is valid until', new Date(decoded.exp * 1000).toLocaleDateString())
    }
    
    // Check if project ref matches URL
    const urlMatch = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)
    if (urlMatch && decoded.ref !== urlMatch[1]) {
      console.log('\n⚠️  WARNING: Project ref in token does NOT match URL!')
      console.log('Token project:', decoded.ref)
      console.log('URL project:', urlMatch[1])
      console.log('\n❌ This is why the keys are invalid!')
    }
  }
} else {
  console.log('❌ No service key found')
}

console.log('\n' + '='.repeat(70))
console.log('\n💡 RECOMMENDATION:')
console.log('\nThe keys are technically valid JWT tokens, but Supabase is rejecting them.')
console.log('This means either:')
console.log('  1. The project was deleted/recreated')
console.log('  2. The keys were regenerated in Supabase Dashboard')
console.log('  3. The keys belong to a different project')
console.log('\n✅ SOLUTION: Get fresh keys from Supabase Dashboard')
console.log('   https://supabase.com/dashboard/project/' + (supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'YOUR_PROJECT') + '/settings/api')
console.log('')
