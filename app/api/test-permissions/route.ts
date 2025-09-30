import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test different permission scenarios
    const testUserId = '1c29f384-997f-42e4-bd58-87aafbf18e70' // main@gmail.com
    
    // Get current user permissions
    const userPermissionsResponse = await fetch('http://localhost:3000/api/admin/user-permissions')
    const userData = await userPermissionsResponse.json()
    
    const mainUser = userData.users?.find((user: any) => user.email === 'main@gmail.com')
    
    return NextResponse.json({
      message: 'Permission system test',
      currentUser: {
        email: mainUser?.email,
        role: mainUser?.role?.name,
        permissions: mainUser?.permissions?.map((p: any) => p.code) || [],
        permissionCount: mainUser?.permissions?.length || 0
      },
      expectedOperatorPermissions: [
        'view_dashboard',
        'view_schedule', 
        'view_schedule_dashboard',
        'view_machine_analyzer'
      ],
      testScenarios: {
        scenario1: 'User should have operator role permissions by default',
        scenario2: 'When permissions are unchecked and saved, they should be revoked',
        scenario3: 'When page is refreshed, custom permissions should persist',
        scenario4: 'Two dashboards should be controlled separately'
      }
    })

  } catch (error: any) {
    console.error('Test permissions error:', error)
    return NextResponse.json({
      error: error?.message || 'Test failed'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, permissions } = await request.json()
    const testUserId = '1c29f384-997f-42e4-bd58-87aafbf18e70'
    
    if (action === 'revoke_all') {
      // Revoke all permissions for testing
      const response = await fetch('http://localhost:3000/api/admin/modify-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          customPermissions: [], // Grant nothing
          removePermissions: [
            '511be40d-d190-45f2-97ee-39aca4e352e5', // view_dashboard
            '786eab17-310c-4b82-ae99-d81137ddc384', // view_schedule
            '18010c8c-a4ca-4941-a595-269884f4a452', // view_schedule_dashboard
            'a3d2dcfc-f043-4727-b3ed-4fbeea41f635'  // view_machine_analyzer
          ],
          actorId: 'test-system'
        })
      })
      
      return NextResponse.json({
        success: true,
        message: 'All permissions revoked for testing',
        apiResponse: await response.json()
      })
    }
    
    if (action === 'grant_specific') {
      // Grant only specific permissions
      const response = await fetch('http://localhost:3000/api/admin/modify-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          customPermissions: permissions || ['511be40d-d190-45f2-97ee-39aca4e352e5'], // Just dashboard
          removePermissions: [],
          actorId: 'test-system'
        })
      })
      
      return NextResponse.json({
        success: true,
        message: 'Specific permissions granted for testing',
        apiResponse: await response.json()
      })
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use "revoke_all" or "grant_specific"'
    }, { status: 400 })

  } catch (error: any) {
    console.error('Test permissions POST error:', error)
    return NextResponse.json({
      error: error?.message || 'Test POST failed'
    }, { status: 500 })
  }
}
