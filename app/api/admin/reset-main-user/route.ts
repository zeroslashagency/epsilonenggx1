import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // This will reset the main@gmail.com user password to "12345678" using SQL
    const response = await fetch('http://localhost:3000/api/admin/mock-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '1c29f384-997f-42e4-bd58-87aafbf18e70', // main@gmail.com user ID
        action: 'set',
        newPassword: '12345678',
        actorId: 'system'
      })
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Password reset for main@gmail.com',
      mockResult: result
    })

  } catch (error: any) {
    console.error('Error resetting main user password:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to reset password'
    }, { status: 500 })
  }
}

// Test the login credentials
export async function GET() {
  return NextResponse.json({
    message: 'Login test endpoint',
    credentials: {
      email: 'main@gmail.com',
      password: '12345678',
      userId: '1c29f384-997f-42e4-bd58-87aafbf18e70'
    },
    instructions: [
      '1. Use these credentials to log in',
      '2. If login still fails, the password needs to be updated in Supabase',
      '3. Try the mock password reset first'
    ]
  })
}
