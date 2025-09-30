import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the current user's permissions from the database
    const response = await fetch('http://localhost:3000/api/admin/user-permissions')
    const userData = await response.json()

    // Find the main@gmail.com user
    const mainUser = userData.users?.find((user: any) => user.email === 'main@gmail.com')

    return NextResponse.json({
      message: 'Permission debug info',
      currentUser: {
        email: 'main@gmail.com',
        id: mainUser?.id,
        role: mainUser?.role,
        permissions: mainUser?.permissions,
        permissionCodes: mainUser?.permissions?.map((p: any) => p.code) || []
      },
      totalUsers: userData.users?.length || 0,
      apiResponse: userData
    })

  } catch (error: any) {
    console.error('Debug permissions error:', error)
    return NextResponse.json({
      error: error?.message || 'Debug failed'
    }, { status: 500 })
  }
}
