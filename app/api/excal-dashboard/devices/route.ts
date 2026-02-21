export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { fetchDevices } from '@/app/lib/features/excal/api'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'dashboard.view')
  if (authResult instanceof NextResponse) return authResult

  try {
    const devices = await fetchDevices()
    return NextResponse.json({ success: true, data: devices })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch devices',
      },
      { status: 500 }
    )
  }
}
