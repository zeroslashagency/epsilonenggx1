export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// 🔐 SECURITY: Restrict CORS to your domain only
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const { smartOfficeUrl, syncType } = await request.json()


    // Simulate fetching data from SmartOffice device
    // In a real implementation, this would connect to your actual SmartOffice device
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulate successful sync with random number of new records
    const newRecords = Math.floor(Math.random() * 50) + 10

    return NextResponse.json({
      success: true,
      message: 'SmartOffice sync completed successfully',
      newRecords: newRecords,
      syncType: syncType,
      timestamp: new Date().toISOString(),
      deviceUrl: smartOfficeUrl
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: 'Failed to sync from SmartOffice device'
      },
      { status: 500 }
    )
  }
}
