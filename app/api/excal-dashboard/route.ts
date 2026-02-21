export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/app/lib/features/auth/auth.middleware'
import { DATE_QUERY_REGEX } from '@/app/lib/features/excal/constants'
import { ensureApiDateFormat } from '@/app/lib/features/excal/date'
import { runExcalPipeline } from '@/app/lib/features/excal/pipeline'

export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, 'dashboard.view')
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const startDateParam = searchParams.get('start_date')
  const endDateParam = searchParams.get('end_date')
  const deviceId = searchParams.get('device_id')

  if (!startDateParam || !endDateParam || !deviceId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required query params: start_date, end_date, device_id',
      },
      { status: 400 }
    )
  }

  const startDate = ensureApiDateFormat(startDateParam)
  const endDate = ensureApiDateFormat(endDateParam)

  if (!DATE_QUERY_REGEX.test(startDate) || !DATE_QUERY_REGEX.test(endDate)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid date format. Expected DD-MM-YYYY HH:MM',
      },
      { status: 400 }
    )
  }

  try {
    const data = await runExcalPipeline({
      startDate,
      endDate,
      deviceId,
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build Excal dashboard',
      },
      { status: 500 }
    )
  }
}
