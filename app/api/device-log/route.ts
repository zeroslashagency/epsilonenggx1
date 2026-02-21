export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'

const DEFAULT_DEVICE_LOG_API_URL = 'https://app.epsilonengg.in/api/v2/device-log'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'dashboard.view')
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const deviceId = searchParams.get('device_id')

  if (!startDate || !endDate || !deviceId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required query params: start_date, end_date, device_id',
      },
      { status: 400 }
    )
  }

  try {
    const upstreamUrl = new URL(process.env.DEVICE_LOG_API_URL || DEFAULT_DEVICE_LOG_API_URL)
    upstreamUrl.searchParams.set('start_date', startDate)
    upstreamUrl.searchParams.set('end_date', endDate)
    upstreamUrl.searchParams.set('device_id', deviceId)

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    const responseText = await upstreamResponse.text()
    let parsedBody: unknown

    try {
      parsedBody = responseText ? JSON.parse(responseText) : {}
    } catch {
      parsedBody = {
        success: false,
        error: 'Invalid upstream response format',
      }
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch upstream device logs',
          upstreamStatus: upstreamResponse.status,
          details: parsedBody,
        },
        { status: upstreamResponse.status }
      )
    }

    return NextResponse.json(parsedBody)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch device logs',
      },
      { status: 500 }
    )
  }
}

