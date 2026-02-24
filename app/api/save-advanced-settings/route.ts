export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireGranularPermission } from '@/app/lib/features/auth/auth.middleware'

const WINDOW_PATTERN = /^(\d{1,2}):([0-5]\d)-(\d{1,2}):([0-5]\d)$/

const hasOwn = (obj: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key)

const isValidWindow = (value: unknown): boolean => {
  if (value === null || value === undefined || String(value).trim() === '') return true
  const match = String(value).trim().match(WINDOW_PATTERN)
  if (!match) return false
  const sh = Number(match[1])
  const eh = Number(match[3])
  return sh >= 0 && sh <= 23 && eh >= 0 && eh <= 23
}

const parseDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const validateHolidays = (raw: unknown): string[] => {
  if (raw === null || raw === undefined) return []
  if (!Array.isArray(raw)) return ['holidays must be an array']

  const errors: string[] = []
  raw.forEach((item, idx) => {
    if (typeof item === 'string' || item instanceof Date) {
      if (!parseDate(item)) {
        errors.push(`holidays[${idx}] has invalid date value`)
      }
      return
    }

    if (!item || typeof item !== 'object') {
      errors.push(`holidays[${idx}] must be a string/date or object`)
      return
    }

    const holiday = item as Record<string, unknown>
    const start = parseDate(holiday.startDateTime || holiday.start || holiday.from || holiday.date)
    const end = parseDate(holiday.endDateTime || holiday.end || holiday.to)
    if (!start || !end) {
      errors.push(`holidays[${idx}] must include valid start and end datetime`)
      return
    }
    if (end <= start) {
      errors.push(`holidays[${idx}] end datetime must be after start datetime`)
    }
  })

  return errors
}

const validateBreakdowns = (raw: unknown): string[] => {
  if (raw === null || raw === undefined) return []
  if (!Array.isArray(raw)) return ['breakdowns must be an array']

  const errors: string[] = []
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`breakdowns[${idx}] must be an object`)
      return
    }

    const breakdown = item as Record<string, unknown>
    const start = parseDate(breakdown.startDateTime || breakdown.start || breakdown.from)
    const end = parseDate(breakdown.endDateTime || breakdown.end || breakdown.to)
    if (!start || !end) {
      errors.push(`breakdowns[${idx}] must include valid start and end datetime`)
      return
    }
    if (end <= start) {
      errors.push(`breakdowns[${idx}] end datetime must be after start datetime`)
    }

    const machines = Array.isArray(breakdown.machines)
      ? breakdown.machines
      : breakdown.machine
        ? [breakdown.machine]
        : []

    const normalized = machines
      .map(machine => String(machine || '').trim())
      .filter(Boolean)
    if (normalized.length === 0) {
      errors.push(`breakdowns[${idx}] must include at least one machine`)
    }
  })

  return errors
}

export async function POST(request: NextRequest) {
  // ✅ Check: main_scheduling.Schedule Generator.edit permission
  const authResult = await requireGranularPermission(request, 'main_scheduling', 'Schedule Generator', 'edit')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    const body = (await request.json()) as Record<string, unknown>
    const {
      user_email,
      global_start_datetime,
      global_setup_window,
      shift_1,
      shift_2,
      shift_3,
      production_shift_1,
      production_shift_2,
      production_shift_3,
      holidays,
      breakdowns,
      is_locked,
      locked_at,
      role
    } = body

    const userEmail = request.headers.get('X-User-Email') || user_email || user.email || 'default@user.com'

    const hasSettingsPayload = [
      'global_start_datetime',
      'global_setup_window',
      'shift_1',
      'shift_2',
      'shift_3',
      'production_shift_1',
      'production_shift_2',
      'production_shift_3',
      'holidays',
      'breakdowns',
    ].some(key => hasOwn(body, key))

    const lockRequested = is_locked === true

    if (!hasSettingsPayload && is_locked === false) {
      // UNLOCKING: deactivate active settings snapshot
      const { error } = await supabase
        .from('dashboard_data')
        .update({ is_active: false })
        .eq('session_name', `Advanced Settings - ${userEmail}`)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to unlock advanced settings', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Advanced settings unlocked successfully',
        data: null
      })
    }

    if (!hasSettingsPayload) {
      return NextResponse.json(
        { error: 'No advanced settings fields provided' },
        { status: 400 }
      )
    }

    const validationErrors: string[] = []
    ;[
      ['global_setup_window', global_setup_window],
      ['shift_1', shift_1],
      ['shift_2', shift_2],
      ['shift_3', shift_3],
      ['production_shift_1', production_shift_1],
      ['production_shift_2', production_shift_2],
      ['production_shift_3', production_shift_3],
    ].forEach(([label, value]) => {
      if (!isValidWindow(value)) {
        validationErrors.push(`${label} must match HH:MM-HH:MM`)
      }
    })

    const parsedGlobalStart = parseDate(global_start_datetime)
    if (
      global_start_datetime !== null &&
      global_start_datetime !== undefined &&
      String(global_start_datetime).trim() !== '' &&
      !parsedGlobalStart
    ) {
      validationErrors.push('global_start_datetime must be a valid datetime')
    }

    validationErrors.push(...validateHolidays(holidays))
    validationErrors.push(...validateBreakdowns(breakdowns))

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid advanced settings payload', details: validationErrors },
        { status: 400 }
      )
    }

    // Deactivate old snapshot before inserting a new one
    await supabase
      .from('dashboard_data')
      .update({ is_active: false })
      .eq('session_name', `Advanced Settings - ${userEmail}`)

    // Insert new snapshot (locked or draft)
    const settingsData = {
      global_start_datetime: global_start_datetime || null,
      global_setup_window: global_setup_window || null,
      shift_1: shift_1 || null,
      shift_2: shift_2 || null,
      shift_3: shift_3 || null,
      production_shift_1: production_shift_1 || null,
      production_shift_2: production_shift_2 || null,
      production_shift_3: production_shift_3 || null,
      holidays: Array.isArray(holidays) ? holidays : [],
      breakdowns: Array.isArray(breakdowns) ? breakdowns : [],
      is_locked: lockRequested,
      locked_at: lockRequested ? (locked_at || new Date().toISOString()) : null,
      role: role || 'operator',
      user_email: userEmail
    }

    const { data, error } = await supabase
      .from('dashboard_data')
      .insert({
        user_id: null,
        dashboard_session_id: `advanced_settings_${userEmail}_${Date.now()}`,
        session_name: `Advanced Settings - ${userEmail}`,
        timeline_view: 'advanced_settings',
        chart_data: {},
        machine_data: settingsData,
        is_active: true
      })
      .select()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save advanced settings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: lockRequested
        ? 'Advanced settings locked successfully'
        : 'Advanced settings saved successfully',
      data: data[0]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // ✅ Check: main_scheduling.Schedule Generator.view permission
  const authResult = await requireGranularPermission(request, 'main_scheduling', 'Schedule Generator', 'view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    const userEmail = request.headers.get('X-User-Email') || user.email || 'default@user.com'
    
    // Get the most recent active settings for this user from dashboard_data
    const { data, error } = await supabase
      .from('dashboard_data')
      .select('*')
      .eq('session_name', `Advanced Settings - ${userEmail}`)
      .eq('timeline_view', 'advanced_settings')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load advanced settings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0] || null
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
