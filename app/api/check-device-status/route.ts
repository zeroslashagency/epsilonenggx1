export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/middleware/auth.middleware'

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const { deviceUrl } = await request.json()
    

    // Try to ping the SmartOffice device
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(`${deviceUrl}/rest/v1/sync_requests`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return NextResponse.json({
          success: true,
          online: true,
          message: 'Device is online and responding',
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      } else {
        return NextResponse.json({
          success: true,
          online: false,
          message: `Device responded with status ${response.status}`,
          timestamp: new Date().toISOString()
        }, { headers: corsHeaders })
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      return NextResponse.json({
        success: true,
        online: false,
        message: 'Device is unreachable or offline',
        error: fetchError instanceof Error ? fetchError.message : 'Network error',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: 'Failed to check device status'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
