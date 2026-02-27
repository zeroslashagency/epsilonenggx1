export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, requireAuth } from '@/app/lib/features/auth/auth.middleware'
import type { User } from '@/app/lib/features/auth/types'

type ProfileMode = 'basic' | 'advanced'

const BASIC_RUN_PERMISSIONS = ['schedule.run.basic', 'schedule.create', 'schedule.edit']
const ADVANCED_RUN_PERMISSIONS = ['schedule.run.advanced', 'schedule.edit']

async function hasAnyPermission(user: User, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(user, permission)) return true
  }
  return false
}

async function resolveRunAccess(
  user: User
): Promise<{ canRunBasic: boolean; canRunAdvanced: boolean }> {
  const [canRunBasic, canRunAdvanced] = await Promise.all([
    hasAnyPermission(user, BASIC_RUN_PERMISSIONS),
    hasAnyPermission(user, ADVANCED_RUN_PERMISSIONS),
  ])

  return { canRunBasic, canRunAdvanced }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const access = await resolveRunAccess(authResult)

  return NextResponse.json({
    success: true,
    data: {
      ...access,
      availableProfiles: [
        ...(access.canRunBasic ? (['basic'] as ProfileMode[]) : []),
        ...(access.canRunAdvanced ? (['advanced'] as ProfileMode[]) : []),
      ],
      defaultProfile: access.canRunAdvanced ? 'advanced' : 'basic',
    },
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const body = (await request.json().catch(() => null)) as { profileMode?: ProfileMode } | null
  const requestedMode = body?.profileMode

  if (requestedMode !== 'basic' && requestedMode !== 'advanced') {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid profile mode. Expected "basic" or "advanced".',
      },
      { status: 400 }
    )
  }

  const access = await resolveRunAccess(authResult)
  const allowed = requestedMode === 'advanced' ? access.canRunAdvanced : access.canRunBasic

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          requestedMode === 'advanced'
            ? 'You do not have permission to run Advanced profile (setup + run).'
            : 'You do not have permission to run Basic profile (run-only).',
        data: access,
      },
      { status: 403 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      ...access,
      profileMode: requestedMode,
    },
  })
}
