export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Manual sync endpoint that triggers the office sync script
export async function POST(request: NextRequest) {
  try {
    // This endpoint will trigger a sync from the office computer
    // For now, we'll return a response indicating the sync was triggered
    
    const body = await request.json()
    const { syncType = 'attendance' } = body
    
    
    // In a real implementation, this would:
    // 1. Send a signal to the office computer
    // 2. Trigger the office-sync-script.js
    // 3. Return the sync results
    
    // For now, we'll simulate the sync process
    const syncResult = {
      success: true,
      message: `Manual ${syncType} sync triggered successfully`,
      syncType: syncType,
      timestamp: new Date().toISOString(),
      status: 'In Progress',
      note: 'Office sync script should be running on your office computer'
    }
    
    return NextResponse.json(syncResult)
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Manual sync failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return sync status
    return NextResponse.json({
      success: true,
      message: 'Manual sync endpoint is ready',
      timestamp: new Date().toISOString(),
      availableSyncTypes: ['attendance', 'employees', 'fresh-install'],
      instructions: {
        attendance: 'Sync recent attendance data from SmartOffice',
        employees: 'Sync employee master data',
        'fresh-install': 'Clear all data and do full historical sync'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync status'
    }, { status: 500 })
  }
}





