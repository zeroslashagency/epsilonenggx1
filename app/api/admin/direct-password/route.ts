import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// This will use the MCP server connection which is working
async function updatePasswordDirectly(userId: string, newPassword: string) {
  try {
    // Hash the password using bcrypt (same as Supabase)
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // Update the password directly in the database using a server action
    const response = await fetch('http://localhost:3000/api/admin/update-password-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        hashedPassword
      })
    })
    
    return await response.json()
  } catch (error) {
    console.error('Error in direct password update:', error)
    throw error
  }
}

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

    console.log(`[DEBUG] Updating password for user: ${userId}`)
    console.log(`[DEBUG] Password length: ${passwordToSet.length}`)

    // Update password directly
    const result = await updatePasswordDirectly(userId, passwordToSet)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to update password'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      password: action === 'generate' ? passwordToSet : undefined,
      message: action === 'generate' 
        ? 'Temporary password generated successfully' 
        : 'Password updated successfully'
    })

  } catch (error: any) {
    console.error('Unexpected error updating password:', error)
    return NextResponse.json({ 
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
