export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireGranularPermission } from '@/app/lib/middleware/auth.middleware'

/**
 * TEST ROUTE: Verify requireGranularPermission middleware works
 * 
 * Test cases:
 * 1. GET /api/test-granular-permission?module=production&item=Orders&permission=view
 * 2. GET /api/test-granular-permission?module=monitoring&item=Alerts&permission=view
 * 
 * Expected responses:
 * - Super Admin: 200 OK
 * - User with permission: 200 OK
 * - User without permission: 403 Forbidden
 * - No auth: 401 Unauthorized
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const module = searchParams.get('module') || 'production'
  const item = searchParams.get('item') || 'Orders'
  const permission = searchParams.get('permission') || 'view'
  
  console.log(`\n🧪 TEST: Checking ${module}.${item}.${permission}`)
  
  // Test the middleware
  const authResult = await requireGranularPermission(request, module, item, permission)
  
  if (authResult instanceof NextResponse) {
    console.log('❌ TEST FAILED: Permission denied')
    return authResult
  }
  
  const user = authResult
  console.log('✅ TEST PASSED: Permission granted')
  
  return NextResponse.json({
    success: true,
    message: 'Permission check passed',
    user: {
      email: user.email,
      role: user.role
    },
    tested: {
      module,
      item,
      permission
    }
  })
}
