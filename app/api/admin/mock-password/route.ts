import { NextRequest, NextResponse } from 'next/server'

// Mock password update that simulates success
// This allows you to test the UI flow while we resolve the service key issue

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  const cryptoObj = globalThis.crypto || (globalThis as any).msCrypto
  if (cryptoObj) {
    const randomValues = new Uint32Array(length)
    cryptoObj.getRandomValues(randomValues)
    for (let i = 0; i < length; i++) {
      password += chars[randomValues[i] % chars.length]
    }
  } else {
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action, newPassword, actorId } = await request.json()

    console.log('[MOCK] Password update request received:', {
      userId,
      action,
      hasPassword: !!newPassword,
      actorId
    })

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format. Must be a valid UUID.' }, { status: 400 })
    }

    if (!action || !['generate', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    let passwordToSet: string

    if (action === 'generate') {
      passwordToSet = generatePassword()
    } else {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
      }
      passwordToSet = newPassword
    }

    // Simulate a delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('[MOCK] Password update simulated successfully:', {
      userId,
      action,
      passwordLength: passwordToSet.length
    })

    return NextResponse.json({
      success: true,
      password: action === 'generate' ? passwordToSet : undefined,
      message: action === 'generate' 
        ? 'Temporary password generated successfully (MOCK)' 
        : 'Password updated successfully (MOCK)',
      mock: true // Indicate this is a mock response
    })

  } catch (error: any) {
    console.error('Mock password update error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
