import * as XLSX from 'xlsx'

interface QualityIssueLike {
  rule?: string
  severity?: string
  message?: string
}

interface QualityReportLike {
  issues?: QualityIssueLike[]
}

interface PersonnelProfileLike {
  uid?: string
  name?: string
  sourceSection?: string
  levelUp?: number
  setupEligible?: boolean
  productionEligible?: boolean
  setupPriority?: number
}

interface ShiftSettingsLike {
  shift1?: string
  shift2?: string
  shift3?: string
  globalSetupWindow?: string
}

export interface SchedulingExcelExportPayload {
  results: unknown[]
  orders?: unknown[]
  holidays?: unknown[]
  breakdowns?: unknown[]
  personnelProfiles?: PersonnelProfileLike[]
  shiftSettings?: ShiftSettingsLike
  qualityReport?: QualityReportLike | null
  generatedAt?: Date
  profileMode?: 'basic' | 'advanced'
}

interface NormalizedScheduleRow {
  partNumber: string
  orderQuantity: number
  priority: string
  batchId: string
  batchQty: number
  operationSeq: number
  operationName: string
  machine: string
  person: string
  setupPersonName: string
  productionPersonName: string
  setupStart: Date | null
  setupEnd: Date | null
  runStart: Date | null
  runEnd: Date | null
  timing: string
  dueDate: Date | string
  status: string
  breakdownMachine: string
  globalHolidayPeriods: string
  operator: string
  machineAvailabilityStatus: string
  source: Record<string, unknown>
}

interface ParsedTiming {
  totalMin: number
  pauseMin: number
}

interface ExclusionMatrixRow {
  machine: string
  count: number
  types: string
  descriptions: string
}

interface ShiftWindowRow {
  label: string
  window: string
}

interface ParsedShiftWindow extends ShiftWindowRow {
  startMin: number
  endMin: number
  overnight: boolean
}

interface PersonnelEventRow {
  eventGroupId: string
  sliceIndex: number
  eventDateTime: Date
  eventDate: string
  eventTime: string
  shiftDate: string
  shiftDay: string
  uid: string
  name: string
  sourceSection: string
  role: 'setup' | 'production'
  activityType: 'SETUP' | 'RUN'
  partNumber: string
  batchId: string
  operationSeq: number
  operationName: string
  machine: string
  startTime: Date
  endTime: Date
  durationMin: number
  originalStartTime: Date
  originalEndTime: Date
  originalDurationMin: number
  shiftLabel: string
  shiftWindow: string
  refKey: string
}

interface PersonnelDailyFullRow {
  name: string
  role: 'setup' | 'production'
  date: string
  runMin: number
  setupMin: number
  totalMin: number
  eventCount: number
  firstStart: Date
  lastEnd: Date
}

const OUTPUT_HEADERS = [
  'Part Number',
  'Order Qty',
  'Priority',
  'Batch ID',
  'Batch Qty',
  'Operation Seq',
  'Operation Name',
  'Machine',
  'Run Person',
  'Run Start',
  'Run End',
  'Timing',
  'Due Date',
  'Status',
] as const

const SETUP_OUTPUT_HEADERS = [
  'PartNumber',
  'Order_Quantity',
  'Batch_Qty',
  'OperationSeq',
  'Machine',
  'Person',
  'Production_Person',
  'SetupStart',
  'SetupEnd',
  'Timing',
] as const

const OUTPUT_2_HEADERS = [
  'Part Number',
  'Quantity',
  'Batch Size',
  'Date & Time',
  'Machine',
  'Expected Delivery Date',
] as const

const CLIENT_OUT_HEADERS = [
  'PartNumber',
  'Order_Quantity',
  'Timing',
  'Start Date',
  'Expected Delivery Date',
] as const

const PERSONNEL_EVENT_LOG_HEADERS = [
  'Event_Group_ID',
  'Slice_Index',
  'Event_DateTime',
  'Event_Date',
  'Event_Time',
  'Shift_Date',
  'Shift_Day',
  'UID',
  'Name',
  'Source_Section',
  'Role',
  'Activity_Type',
  'PartNumber',
  'Batch_ID',
  'OperationSeq',
  'OperationName',
  'Machine',
  'Start_Time',
  'End_Time',
  'Duration_Min',
  'Original_Start_DateTime',
  'Original_End_DateTime',
  'Original_Duration_Min',
  'Shift_Label',
  'Shift_Window',
  'Ref_Key',
] as const

const PERSONNEL_SUMMARY_HEADERS = [
  'Week_Start',
  'Date',
  'Day',
  'UID',
  'Name',
  'Source_Section',
  'Setup_Eligible',
  'Production_Eligible',
  'Setup_Priority',
  'Assigned_Shift_Label',
  'Assigned_Shift_Window',
  'First_Activity_Time',
  'Last_Activity_Time',
  'Setup_Minutes',
  'Run_Minutes',
  'Total_Work_Minutes',
  'Event_Count',
  'Ops_Count',
  'Machines_Used',
] as const

const PERSONNEL_DAILY_FULL_HEADERS = [
  'Name',
  'Role',
  'Date',
  'RUN',
  'SETUP',
  'Total_Min',
  'Event_Count',
  'First_Start',
  'Last_End',
] as const

const UTILIZATION_SUMMARY_HEADERS = [
  'Name',
  'Role',
  'Days_With_Work',
  'Run_Min',
  'Setup_Min',
  'Busy_Min',
  'Window_Min',
  'Util_Window_Pct',
  'Assumed_Avail_Min',
  'Util_Assumed_Pct',
  'Events',
] as const

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function coerceString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    if (!normalized) return fallback
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function pickFirst(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }
  return undefined
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const raw = coerceString(value)
  if (!raw) return null

  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return direct

  const normalized = raw.replace(',', '')
  const retry = new Date(normalized)
  if (!Number.isNaN(retry.getTime())) return retry

  return null
}

function toExcelDate(value: Date | string | null): Date | string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string') {
    const parsed = toDate(value)
    return parsed || value
  }
  return ''
}

function diffMinutes(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0
  const value = Math.round((end.getTime() - start.getTime()) / 60_000)
  return Math.max(0, value)
}

function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const days = Math.floor(safe / 1440)
  const hours = Math.floor((safe % 1440) / 60)
  const mins = safe % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}D`)
  if (hours > 0 || days > 0) parts.push(`${hours}H`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}M`)
  return parts.join(' ')
}

function parseDurationText(text: string): number {
  const src = (text || '').toUpperCase()
  let total = 0

  const d = src.match(/(\d+)\s*D/)
  const h = src.match(/(\d+)\s*H/)
  const m = src.match(/(\d+)\s*M/)

  if (d) total += Number(d[1]) * 1440
  if (h) total += Number(h[1]) * 60
  if (m) total += Number(m[1])

  if (!d && !h && !m) {
    const fallback = src.match(/(\d+)/)
    if (fallback) total += Number(fallback[1]) * 60
  }

  return total
}

function parseTiming(timing: string, setupStart: Date | null, runEnd: Date | null): ParsedTiming {
  const text = coerceString(timing)
  const head = text.split('(')[0]?.trim() || ''
  let totalMin = parseDurationText(head)
  if (!totalMin) totalMin = diffMinutes(setupStart, runEnd)

  const paused = text.match(/paused\s+([^\)]+?)(?:\s+due to|\))/i)
  const pauseMin = paused ? parseDurationText(paused[1]) : 0

  return { totalMin, pauseMin }
}

function formatDateTimeForReport(value: Date): string {
  const dd = String(value.getDate()).padStart(2, '0')
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const yyyy = value.getFullYear()
  const hh = String(value.getHours()).padStart(2, '0')
  const min = String(value.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:00`
}

function formatDateOnly(value: Date): string {
  const dd = String(value.getDate()).padStart(2, '0')
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const yyyy = value.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function parseDateOnly(value: string): Date | null {
  const text = coerceString(value)
  if (!text) return null

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) {
    const dd = Number(match[1])
    const mm = Number(match[2])
    const yyyy = Number(match[3])
    const parsed = new Date(yyyy, mm - 1, dd)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const fallback = new Date(text)
  if (!Number.isNaN(fallback.getTime())) return fallback
  return null
}

function formatTimeOnly(value: Date): string {
  const hh = String(value.getHours()).padStart(2, '0')
  const min = String(value.getMinutes()).padStart(2, '0')
  const sec = String(value.getSeconds()).padStart(2, '0')
  return `${hh}:${min}:${sec}`
}

function formatDateTimeIsoText(value: Date): string {
  const yyyy = value.getFullYear()
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  const dd = String(value.getDate()).padStart(2, '0')
  const hh = String(value.getHours())
  const min = String(value.getMinutes()).padStart(2, '0')
  const sec = String(value.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`
}

function formatTimeHHMM(value: Date): string {
  const hh = String(value.getHours()).padStart(2, '0')
  const min = String(value.getMinutes()).padStart(2, '0')
  return `${hh}:${min}`
}

function toDisplayDateTime(value: Date | string | null): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateTimeForReport(value)
  }
  if (typeof value === 'string') {
    const parsed = toDate(value)
    if (parsed) return formatDateTimeForReport(parsed)
    return value
  }
  return ''
}

function startOfDay(value: Date): Date {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60_000)
}

function startOfWeekMonday(value: Date): Date {
  const d = startOfDay(value)
  const day = d.getDay() // 0 Sunday
  const delta = day === 0 ? -6 : 1 - day
  return addDays(d, delta)
}

function toRoundedPercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
  const rounded = Math.round((numerator / denominator) * 1000) / 10
  return Number.isInteger(rounded) ? Math.trunc(rounded) : rounded
}

function dayLabel(value: Date): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return labels[value.getDay()] || ''
}

function parseShiftWindows(settings?: ShiftSettingsLike): ShiftWindowRow[] {
  const values = [
    { label: 'Shift 1', window: coerceString(settings?.shift1) },
    { label: 'Shift 2', window: coerceString(settings?.shift2) },
    { label: 'Shift 3', window: coerceString(settings?.shift3) },
  ].filter(item => item.window)

  if (values.length > 0) return values
  const fallback = coerceString(settings?.globalSetupWindow)
  if (fallback) return [{ label: 'Global', window: fallback }]
  return [{ label: 'Global', window: '06:00-22:00' }]
}

function parseShiftWindow(window: string, label: string): ParsedShiftWindow {
  const text = coerceString(window)
  const match = text.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
  if (!match) {
    return {
      label,
      window: text || '06:00-22:00',
      startMin: 6 * 60,
      endMin: 22 * 60,
      overnight: false,
    }
  }
  const startMin = Number(match[1]) * 60 + Number(match[2])
  const endMin = Number(match[3]) * 60 + Number(match[4])
  return {
    label,
    window: text,
    startMin,
    endMin,
    overnight: endMin <= startMin,
  }
}

function atMinute(date: Date, minuteOfDay: number): Date {
  const d = new Date(date)
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0)
  return d
}

function intersectIntervals(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): { start: Date; end: Date } | null {
  const start = new Date(Math.max(aStart.getTime(), bStart.getTime()))
  const end = new Date(Math.min(aEnd.getTime(), bEnd.getTime()))
  if (end <= start) return null
  return { start, end }
}

function normalizeRows(rows: unknown[], holidayPeriodsText: string): NormalizedScheduleRow[] {
  return rows
    .map((raw, index) => {
      const source = asObject(raw)

      const partNumber =
        coerceString(pickFirst(source, ['partNumber', 'PartNumber', 'part_number'])) ||
        `PART-${index + 1}`
      const orderQuantity = Math.max(
        0,
        Math.round(
          coerceNumber(
            pickFirst(source, ['orderQty', 'Order_Quantity', 'order_quantity', 'orderQuantity']),
            0
          )
        )
      )
      const priorityRaw = coerceString(pickFirst(source, ['priority', 'Priority']), 'normal')
      const priority = priorityRaw ? priorityRaw.toLowerCase() : 'normal'

      const batchId = coerceString(
        pickFirst(source, ['batchId', 'Batch_ID', 'batch_id']),
        `B${index + 1}`
      )
      const batchQty = Math.max(
        0,
        Math.round(coerceNumber(pickFirst(source, ['batchQty', 'Batch_Qty', 'batch_qty']), 0))
      )
      const operationSeq = Math.max(
        1,
        Math.round(
          coerceNumber(pickFirst(source, ['operationSeq', 'OperationSeq', 'operation_seq']), 1)
        )
      )
      const operationName =
        coerceString(pickFirst(source, ['operationName', 'OperationName', 'operation_name'])) ||
        `Operation ${operationSeq}`
      const machine = coerceString(pickFirst(source, ['machine', 'Machine']), 'VMC 1')
      const person = coerceString(pickFirst(source, ['person', 'Person']))
      const setupPersonName = coerceString(
        pickFirst(source, ['setupPersonName', 'setup_person_name', 'setupPerson', 'Setup_Person'])
      )
      const productionPersonName = coerceString(
        pickFirst(source, [
          'productionPersonName',
          'production_person_name',
          'productionPerson',
          'Production_Person',
        ])
      )
      const operator = coerceString(pickFirst(source, ['operator', 'Operator']))

      const setupStart = toDate(pickFirst(source, ['setupStart', 'SetupStart', 'setup_start']))
      const setupEnd = toDate(pickFirst(source, ['setupEnd', 'SetupEnd', 'setup_end']))
      const runStart = toDate(pickFirst(source, ['runStart', 'RunStart', 'run_start']))
      const runEnd = toDate(pickFirst(source, ['runEnd', 'RunEnd', 'run_end']))

      const timingRaw = coerceString(pickFirst(source, ['timing', 'Timing']))
      const parsedTiming = parseTiming(timingRaw, setupStart, runEnd)
      const timing = timingRaw || formatDuration(parsedTiming.totalMin)

      const dueDateValue = pickFirst(source, ['dueDate', 'DueDate', 'due_date'])
      const parsedDue = toDate(dueDateValue)
      const dueDate = parsedDue || coerceString(dueDateValue)
      const status =
        coerceString(
          pickFirst(source, ['status', 'Status', 'scheduleStatus', 'Schedule_Status'])
        ) || 'Scheduled'

      const breakdownMachine = coerceString(
        pickFirst(source, ['breakdownMachine', 'BreakdownMachine', 'breakdown_machine'])
      )

      const globalHolidayPeriods =
        coerceString(pickFirst(source, ['globalHolidayPeriods', 'Global_Holiday_Periods'])) ||
        holidayPeriodsText

      const machineAvailabilityStatus =
        coerceString(
          pickFirst(source, [
            'machineAvailabilityStatus',
            'Machine_Availability_STATUS',
            'machine_availability_status',
          ])
        ) || (machine ? `FIXED_VALIDATED | SELECTED: ${machine}` : '')

      return {
        partNumber,
        orderQuantity,
        priority,
        batchId,
        batchQty,
        operationSeq,
        operationName,
        machine,
        person: productionPersonName || person,
        setupPersonName: setupPersonName || person || productionPersonName,
        productionPersonName: productionPersonName || person,
        setupStart,
        setupEnd,
        runStart,
        runEnd,
        timing,
        dueDate,
        status,
        breakdownMachine,
        globalHolidayPeriods,
        operator: operator || productionPersonName || person,
        machineAvailabilityStatus,
        source,
      } satisfies NormalizedScheduleRow
    })
    .filter(row => row.partNumber && row.batchId)
}

function buildHolidayPeriodsText(holidays: unknown[]): string {
  if (!Array.isArray(holidays) || holidays.length === 0) return ''

  const parts = holidays
    .map((item: unknown) => {
      const obj = asObject(item)
      const start = toDate(pickFirst(obj, ['startDateTime', 'start', 'StartDateTime']))
      const end = toDate(pickFirst(obj, ['endDateTime', 'end', 'EndDateTime']))

      if (start && end) {
        return `${formatDateTimeForReport(start)} -> ${formatDateTimeForReport(end)}`
      }

      const direct = coerceString(item)
      return direct
    })
    .filter(Boolean)

  return parts.join('; ')
}

function buildOutputSheetRows(rows: NormalizedScheduleRow[]): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = rows.map(row => ({
    'Part Number': row.partNumber,
    'Order Qty': row.orderQuantity,
    Priority: row.priority,
    'Batch ID': row.batchId,
    'Batch Qty': row.batchQty,
    'Operation Seq': row.operationSeq,
    'Operation Name': row.operationName,
    Machine: row.machine,
    'Run Person': row.person || row.productionPersonName || row.setupPersonName,
    'Run Start': row.runStart ? formatDateTimeForReport(row.runStart) : '',
    'Run End': row.runEnd ? formatDateTimeForReport(row.runEnd) : '',
    Timing: row.timing,
    'Due Date': toExcelDate(row.dueDate),
    Status: row.status,
  }))

  const totalMinutes = rows.reduce((sum, row) => {
    const parsed = parseTiming(row.timing, row.setupStart, row.runEnd)
    return sum + parsed.totalMin
  }, 0)

  if (data.length > 0) {
    data.push({
      'Part Number': 'TOTAL (Timing)',
      'Order Qty': '',
      Priority: '',
      'Batch ID': '',
      'Batch Qty': '',
      'Operation Seq': '',
      'Operation Name': '',
      Machine: '',
      'Run Person': '',
      'Run Start': '',
      'Run End': formatDuration(totalMinutes),
      Timing: '',
      'Due Date': '',
      Status: '',
    })
  }

  return data
}

function buildSetupOutputRows(rows: NormalizedScheduleRow[]): Record<string, unknown>[] {
  return rows.map(row => {
    const setupMin = diffMinutes(row.setupStart, row.setupEnd)
    return {
      PartNumber: row.partNumber,
      Order_Quantity: row.orderQuantity,
      Batch_Qty: row.batchQty,
      OperationSeq: row.operationSeq,
      Machine: row.machine,
      Person: row.setupPersonName || row.person,
      Production_Person: row.productionPersonName || row.person,
      SetupStart: row.setupStart ? formatDateTimeForReport(row.setupStart) : '',
      SetupEnd: row.setupEnd ? formatDateTimeForReport(row.setupEnd) : '',
      Timing: formatDuration(setupMin),
    }
  })
}

function buildOutput2Rows(rows: NormalizedScheduleRow[]): Record<string, unknown>[] {
  return rows.map(row => ({
    'Part Number': row.partNumber,
    Quantity: row.orderQuantity,
    'Batch Size': row.batchQty,
    'Date & Time': toDisplayDateTime(row.setupEnd || row.setupStart),
    Machine: row.machine,
    'Expected Delivery Date': toDisplayDateTime(row.runEnd),
  }))
}

function buildClientOutRows(rows: NormalizedScheduleRow[]): Record<string, unknown>[] {
  const grouped = new Map<string, NormalizedScheduleRow[]>()

  rows.forEach(row => {
    const key = row.partNumber
    const bucket = grouped.get(key)
    if (bucket) bucket.push(row)
    else grouped.set(key, [row])
  })

  const output: Record<string, unknown>[] = []

  Array.from(grouped.keys())
    .sort((a, b) => a.localeCompare(b))
    .forEach(partNumber => {
      const group = grouped.get(partNumber) || []
      const starts = group.map(row => row.setupStart).filter((x): x is Date => Boolean(x))
      const ends = group.map(row => row.runEnd).filter((x): x is Date => Boolean(x))
      const orderQuantity = Math.max(0, ...group.map(row => row.orderQuantity), 0)

      const start = starts.length > 0 ? new Date(Math.min(...starts.map(x => x.getTime()))) : null
      const end = ends.length > 0 ? new Date(Math.max(...ends.map(x => x.getTime()))) : null

      const spanMin = diffMinutes(start, end)
      const pauseMin = group.reduce((sum, row) => {
        const parsed = parseTiming(row.timing, row.setupStart, row.runEnd)
        return sum + parsed.pauseMin
      }, 0)

      const timing =
        pauseMin > 0
          ? `${formatDuration(spanMin)} (paused ${formatDuration(pauseMin)} due to shift gaps)`
          : formatDuration(spanMin)

      output.push({
        PartNumber: partNumber,
        Order_Quantity: orderQuantity,
        Timing: timing,
        'Start Date': toDisplayDateTime(start),
        'Expected Delivery Date': toDisplayDateTime(end),
      })
    })

  return output
}

function buildExclusionMatrixRows(breakdowns: unknown[]): ExclusionMatrixRow[] {
  const grouped = new Map<string, { types: Set<string>; descriptions: string[] }>()

  ;(Array.isArray(breakdowns) ? breakdowns : []).forEach(item => {
    const obj = asObject(item)
    const start = toDate(pickFirst(obj, ['startDateTime', 'start', 'StartDateTime']))
    const end = toDate(pickFirst(obj, ['endDateTime', 'end', 'EndDateTime']))
    const reason = coerceString(pickFirst(obj, ['reason', 'Reason']))

    const machinesRaw = pickFirst(obj, ['machines'])
    const fallbackMachine = coerceString(
      pickFirst(obj, ['machine', 'Machine', 'breakdownMachine', 'BreakdownMachine'])
    )

    const machines: string[] = Array.isArray(machinesRaw)
      ? machinesRaw.map(m => coerceString(m)).filter(Boolean)
      : fallbackMachine
        ? [fallbackMachine]
        : []

    machines.forEach(machine => {
      const bucket = grouped.get(machine) || { types: new Set<string>(), descriptions: [] }
      bucket.types.add('RANGE')
      if (start && end) {
        const base = `${formatDateTimeForReport(start)} to ${formatDateTimeForReport(end)}`
        bucket.descriptions.push(reason ? `${base} (${reason})` : base)
      } else if (reason) {
        bucket.descriptions.push(reason)
      } else {
        bucket.descriptions.push('N/A')
      }
      grouped.set(machine, bucket)
    })
  })

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([machine, value]) => ({
      machine,
      count: value.descriptions.length,
      types: Array.from(value.types).join(', '),
      descriptions: value.descriptions.join(' | '),
    }))
}

function buildPersonnelIndex(personnelProfiles: PersonnelProfileLike[], shifts: ShiftWindowRow[]) {
  const byName = new Map<
    string,
    {
      uid: string
      name: string
      sourceSection: string
      setupEligible: boolean
      productionEligible: boolean
      setupPriority: number
      shiftLabel: string
      shiftWindow: string
    }
  >()

  const sorted = [...personnelProfiles].sort((a, b) =>
    coerceString(a.name).localeCompare(coerceString(b.name))
  )

  sorted.forEach((profile, index) => {
    const name = coerceString(profile.name)
    if (!name) return
    const uid = coerceString(profile.uid) || `UID-${index + 1}`
    const sourceSection = coerceString(profile.sourceSection) || 'production'
    const setupEligible = profile.setupEligible === true || sourceSection === 'setup'
    const productionEligible = profile.productionEligible !== false
    const setupPriority = Math.max(1, Math.round(coerceNumber(profile.setupPriority, 99)))
    const shift = shifts[index % shifts.length] || shifts[0]

    byName.set(name.toLowerCase(), {
      uid,
      name,
      sourceSection,
      setupEligible,
      productionEligible,
      setupPriority,
      shiftLabel: shift.label,
      shiftWindow: shift.window,
    })
  })

  return byName
}

function buildPersonnelEventRows(
  rows: NormalizedScheduleRow[],
  personnelProfiles: PersonnelProfileLike[],
  shiftSettings?: ShiftSettingsLike,
  profileMode?: 'basic' | 'advanced'
): PersonnelEventRow[] {
  const shifts = parseShiftWindows(shiftSettings)
  const parsedShifts = shifts.map(shift => parseShiftWindow(shift.window, shift.label))
  const byName = buildPersonnelIndex(personnelProfiles, shifts)

  const events: PersonnelEventRow[] = []
  let eventGroupCounter = 0

  const splitByShift = (start: Date, end: Date) => {
    const slices: Array<{
      start: Date
      end: Date
      shiftLabel: string
      shiftWindow: string
      shiftDate: Date
    }> = []
    const firstDay = addDays(startOfDay(start), -1)
    const lastDay = addDays(startOfDay(end), 1)

    for (let day = new Date(firstDay); day <= lastDay; day = addDays(day, 1)) {
      parsedShifts.forEach(shift => {
        const shiftStart = atMinute(day, shift.startMin)
        const shiftEnd = shift.overnight
          ? atMinute(addDays(day, 1), shift.endMin)
          : atMinute(day, shift.endMin)
        const overlap = intersectIntervals(start, end, shiftStart, shiftEnd)
        if (!overlap) return
        slices.push({
          start: overlap.start,
          end: overlap.end,
          shiftLabel: shift.label,
          shiftWindow: shift.window,
          shiftDate: day,
        })
      })
    }

    slices.sort((a, b) => a.start.getTime() - b.start.getTime())
    return slices
  }

  const pushEvent = (
    role: 'setup' | 'production',
    activityType: 'SETUP' | 'RUN',
    personName: string,
    start: Date | null,
    end: Date | null,
    row: NormalizedScheduleRow
  ) => {
    const trimmedName = coerceString(personName)
    if (!trimmedName || !start || !end || end <= start) return

    const fallbackShift = shifts[0]
    const profile = byName.get(trimmedName.toLowerCase())
    const uid = profile?.uid || `UNMAPPED-${trimmedName}`

    const slices = splitByShift(start, end)
    const fallbackSlices =
      slices.length > 0
        ? slices
        : [
            {
              start,
              end,
              shiftLabel: profile?.shiftLabel || fallbackShift.label,
              shiftWindow: profile?.shiftWindow || fallbackShift.window,
              shiftDate: startOfDay(start),
            },
          ]

    eventGroupCounter += 1
    const eventGroupId = `EVT-${activityType}-${String(eventGroupCounter).padStart(4, '0')}`
    const originalDurationMin = diffMinutes(start, end)

    fallbackSlices.forEach((slice, index) => {
      events.push({
        eventGroupId,
        sliceIndex: index + 1,
        eventDateTime: slice.start,
        eventDate: formatDateOnly(slice.start),
        eventTime: formatTimeOnly(slice.start),
        shiftDate: formatDateOnly(slice.shiftDate),
        shiftDay: dayLabel(slice.shiftDate),
        uid,
        name: trimmedName,
        sourceSection: profile?.sourceSection || (role === 'setup' ? 'setup' : 'production'),
        role,
        activityType,
        partNumber: row.partNumber,
        batchId: row.batchId,
        operationSeq: row.operationSeq,
        operationName: row.operationName,
        machine: row.machine,
        startTime: slice.start,
        endTime: slice.end,
        durationMin: diffMinutes(slice.start, slice.end),
        originalStartTime: start,
        originalEndTime: end,
        originalDurationMin,
        shiftLabel: slice.shiftLabel,
        shiftWindow: slice.shiftWindow,
        refKey: `${row.partNumber}/${row.batchId}/OP${row.operationSeq}`,
      })
    })
  }

  rows.forEach(row => {
    // In Basic mode there are no setup persons; skip SETUP events entirely
    if (profileMode !== 'basic') {
      pushEvent('setup', 'SETUP', row.setupPersonName, row.setupStart, row.setupEnd, row)
    }
    pushEvent(
      'production',
      'RUN',
      row.productionPersonName || row.person,
      row.runStart,
      row.runEnd,
      row
    )
  })

  events.sort((a, b) => {
    const dt = a.eventDateTime.getTime() - b.eventDateTime.getTime()
    if (dt !== 0) return dt
    const byNameSort = a.name.localeCompare(b.name)
    if (byNameSort !== 0) return byNameSort
    return a.refKey.localeCompare(b.refKey)
  })

  return events
}

function buildPersonnelEventLogRows(events: PersonnelEventRow[]): Record<string, unknown>[] {
  return events.map(event => ({
    Event_Group_ID: event.eventGroupId,
    Slice_Index: event.sliceIndex,
    Event_DateTime: formatDateTimeForReport(event.eventDateTime),
    Event_Date: event.eventDate,
    Event_Time: event.eventTime,
    Shift_Date: event.shiftDate,
    Shift_Day: event.shiftDay,
    UID: event.uid,
    Name: event.name,
    Source_Section: event.sourceSection,
    Role: event.role,
    Activity_Type: event.activityType,
    PartNumber: event.partNumber,
    Batch_ID: event.batchId,
    OperationSeq: event.operationSeq,
    OperationName: event.operationName,
    Machine: event.machine,
    Start_Time: formatDateTimeForReport(event.startTime),
    End_Time: formatDateTimeForReport(event.endTime),
    Duration_Min: event.durationMin,
    Original_Start_DateTime: formatDateTimeForReport(event.originalStartTime),
    Original_End_DateTime: formatDateTimeForReport(event.originalEndTime),
    Original_Duration_Min: event.originalDurationMin,
    Shift_Label: event.shiftLabel,
    Shift_Window: event.shiftWindow,
    Ref_Key: event.refKey,
  }))
}

function buildPersonnelSummaryRows(
  events: PersonnelEventRow[],
  personnelProfiles: PersonnelProfileLike[],
  shiftSettings?: ShiftSettingsLike
): Record<string, unknown>[] {
  const shifts = parseShiftWindows(shiftSettings)
  const byName = buildPersonnelIndex(personnelProfiles, shifts)

  const allPeople = new Map<
    string,
    ReturnType<typeof buildPersonnelIndex> extends Map<string, infer V> ? V : never
  >()
  byName.forEach((value, key) => allPeople.set(key, value))
  events.forEach(event => {
    const key = event.name.toLowerCase()
    if (allPeople.has(key)) return
    allPeople.set(key, {
      uid: event.uid,
      name: event.name,
      sourceSection: event.sourceSection,
      setupEligible: event.role === 'setup',
      productionEligible: true,
      setupPriority: 99,
      shiftLabel: event.shiftLabel,
      shiftWindow: event.shiftWindow,
    })
  })

  const allDates = events.map(e => startOfDay(e.eventDateTime))
  const weekStart =
    allDates.length > 0 ? startOfWeekMonday(allDates[0]) : startOfWeekMonday(new Date())
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const grouped = new Map<string, PersonnelEventRow[]>()
  events.forEach(event => {
    const key = `${event.uid}|${formatDateOnly(startOfDay(event.eventDateTime))}`
    const bucket = grouped.get(key) || []
    bucket.push(event)
    grouped.set(key, bucket)
  })

  const rows: Record<string, unknown>[] = []
  Array.from(allPeople.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(person => {
      weekDays.forEach(day => {
        const key = `${person.uid}|${formatDateOnly(day)}`
        const bucket = grouped.get(key) || []
        const sorted = [...bucket].sort(
          (a, b) => a.eventDateTime.getTime() - b.eventDateTime.getTime()
        )

        const first = sorted[0]?.startTime || null
        const last = sorted.length > 0 ? sorted[sorted.length - 1].endTime : null
        const setupMinutes = sorted
          .filter(item => item.activityType === 'SETUP')
          .reduce((sum, item) => sum + item.durationMin, 0)
        const runMinutes = sorted
          .filter(item => item.activityType === 'RUN')
          .reduce((sum, item) => sum + item.durationMin, 0)
        const opCount = new Set(
          sorted.map(item => `${item.partNumber}|${item.batchId}|${item.operationSeq}`)
        ).size
        const machines = Array.from(new Set(sorted.map(item => item.machine)))
          .sort()
          .join(', ')

        rows.push({
          Week_Start: formatDateOnly(weekStart),
          Date: formatDateOnly(day),
          Day: dayLabel(day),
          UID: person.uid,
          Name: person.name,
          Source_Section: person.sourceSection,
          Setup_Eligible: person.setupEligible ? 'Yes' : 'No',
          Production_Eligible: person.productionEligible ? 'Yes' : 'No',
          Setup_Priority: person.setupPriority,
          Assigned_Shift_Label: person.shiftLabel,
          Assigned_Shift_Window: person.shiftWindow,
          First_Activity_Time: first ? formatDateTimeForReport(first) : '',
          Last_Activity_Time: last ? formatDateTimeForReport(last) : '',
          Setup_Minutes: setupMinutes,
          Run_Minutes: runMinutes,
          Total_Work_Minutes: setupMinutes + runMinutes,
          Event_Count: sorted.length,
          Ops_Count: opCount,
          Machines_Used: machines,
        })
      })
    })

  return rows
}

function buildPersonnelDailyRows(events: PersonnelEventRow[]): PersonnelDailyFullRow[] {
  const grouped = new Map<string, PersonnelDailyFullRow>()

  events.forEach(event => {
    const date = coerceString(event.shiftDate || event.eventDate)
    if (!date) return

    const role = event.role === 'setup' ? 'setup' : 'production'
    const key = `${event.name.toLowerCase()}|${role}|${date}`
    const existing = grouped.get(key)

    if (existing) {
      if (event.activityType === 'SETUP') existing.setupMin += event.durationMin
      else existing.runMin += event.durationMin
      existing.totalMin += event.durationMin
      existing.eventCount += 1
      if (event.startTime < existing.firstStart) existing.firstStart = event.startTime
      if (event.endTime > existing.lastEnd) existing.lastEnd = event.endTime
      return
    }

    grouped.set(key, {
      name: event.name,
      role,
      date,
      runMin: event.activityType === 'RUN' ? event.durationMin : 0,
      setupMin: event.activityType === 'SETUP' ? event.durationMin : 0,
      totalMin: event.durationMin,
      eventCount: 1,
      firstStart: event.startTime,
      lastEnd: event.endTime,
    })
  })

  return Array.from(grouped.values()).sort((a, b) => {
    const byName = a.name.localeCompare(b.name)
    if (byName !== 0) return byName

    const aDate = parseDateOnly(a.date)
    const bDate = parseDateOnly(b.date)
    const byDate = (aDate?.getTime() || 0) - (bDate?.getTime() || 0)
    if (byDate !== 0) return byDate

    return a.role.localeCompare(b.role)
  })
}

function buildPersonnelDailyFullRows(rows: PersonnelDailyFullRow[]): Record<string, unknown>[] {
  return rows.map(row => ({
    Name: row.name,
    Role: row.role,
    Date: row.date,
    RUN: row.runMin,
    SETUP: row.setupMin,
    Total_Min: row.totalMin,
    Event_Count: row.eventCount,
    First_Start: formatDateTimeIsoText(row.firstStart),
    Last_End: formatDateTimeIsoText(row.lastEnd),
  }))
}

function buildUtilizationSummaryRows(rows: PersonnelDailyFullRow[]): Record<string, unknown>[] {
  const grouped = new Map<
    string,
    {
      name: string
      role: 'setup' | 'production'
      dates: Set<string>
      runMin: number
      setupMin: number
      busyMin: number
      firstStart: Date
      lastEnd: Date
      events: number
    }
  >()

  rows.forEach(row => {
    const key = `${row.name.toLowerCase()}|${row.role}`
    const existing = grouped.get(key)
    if (existing) {
      existing.dates.add(row.date)
      existing.runMin += row.runMin
      existing.setupMin += row.setupMin
      existing.busyMin += row.totalMin
      existing.events += row.eventCount
      if (row.firstStart < existing.firstStart) existing.firstStart = row.firstStart
      if (row.lastEnd > existing.lastEnd) existing.lastEnd = row.lastEnd
      return
    }

    grouped.set(key, {
      name: row.name,
      role: row.role,
      dates: new Set([row.date]),
      runMin: row.runMin,
      setupMin: row.setupMin,
      busyMin: row.totalMin,
      firstStart: row.firstStart,
      lastEnd: row.lastEnd,
      events: row.eventCount,
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName
      return a.role.localeCompare(b.role)
    })
    .map(row => {
      const daysWithWork = row.dates.size
      const windowMin = diffMinutes(row.firstStart, row.lastEnd)
      const assumedAvailMin = daysWithWork * (row.role === 'setup' ? 16 * 60 : 24 * 60)

      return {
        Name: row.name,
        Role: row.role,
        Days_With_Work: daysWithWork,
        Run_Min: row.runMin,
        Setup_Min: row.setupMin,
        Busy_Min: row.busyMin,
        Window_Min: windowMin,
        Util_Window_Pct: toRoundedPercent(row.busyMin, windowMin),
        Assumed_Avail_Min: assumedAvailMin,
        Util_Assumed_Pct: toRoundedPercent(row.busyMin, assumedAvailMin),
        Events: row.events,
      }
    })
}

function buildPercentReportSheet(
  events: PersonnelEventRow[],
  personnelProfiles: PersonnelProfileLike[],
  shiftSettings?: ShiftSettingsLike,
  generatedAt?: Date
): XLSX.WorkSheet {
  const shifts = parseShiftWindows(shiftSettings)
  const safeShifts = shifts.length > 0 ? shifts : [{ label: 'Shift 1', window: '06:00-14:00' }]

  const allNames = new Set<string>()
  personnelProfiles.forEach(profile => {
    const name = coerceString(profile.name)
    if (name) allNames.add(name)
  })
  events.forEach(event => {
    const name = coerceString(event.name)
    if (name) allNames.add(name)
  })

  const sortedNames = Array.from(allNames).sort((a, b) => a.localeCompare(b))

  const allEventDays = events.map(event => startOfDay(event.eventDateTime))
  const firstDate =
    allEventDays.length > 0
      ? new Date(Math.min(...allEventDays.map(day => day.getTime())))
      : startOfDay(generatedAt || new Date())
  const lastDate =
    allEventDays.length > 0
      ? new Date(Math.max(...allEventDays.map(day => day.getTime())))
      : new Date(firstDate)

  const dates: Date[] = []
  for (let day = new Date(firstDate); day <= lastDate; day = addDays(day, 1)) {
    dates.push(new Date(day))
  }

  const totalShiftColumns = dates.length * safeShifts.length
  const row1: string[] = ['No.S', 'Name']
  const row2: string[] = ['', '']

  dates.forEach(day => {
    row1.push(String(day.getDate()))
    for (let i = 1; i < safeShifts.length; i += 1) row1.push('')
    safeShifts.forEach(shift => row2.push(shift.label))
  })

  const eventMap = new Map<string, PersonnelEventRow[]>()
  events.forEach(event => {
    const key = `${event.name.toLowerCase()}|${event.shiftDate}|${event.shiftLabel}`
    const bucket = eventMap.get(key) || []
    bucket.push(event)
    eventMap.set(key, bucket)
  })

  const aoa: Array<Array<string | number>> = [row1, row2]

  sortedNames.forEach((name, index) => {
    const row: Array<string | number> = [index + 1, name]

    dates.forEach(day => {
      const dateKey = formatDateOnly(day)
      safeShifts.forEach(shift => {
        const key = `${name.toLowerCase()}|${dateKey}|${shift.label}`
        const matches = [...(eventMap.get(key) || [])].sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        )

        if (matches.length === 0) {
          row.push('X')
          return
        }

        const content = matches
          .map(
            item =>
              `${item.machine} (${formatTimeHHMM(item.startTime)}-${formatTimeHHMM(item.endTime)}) [${item.activityType}] ${item.partNumber}/OP${item.operationSeq}`
          )
          .join('\n')
        row.push(content)
      })
    })

    aoa.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
  ]

  dates.forEach((_, index) => {
    const startCol = 2 + index * safeShifts.length
    merges.push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: startCol + safeShifts.length - 1 },
    })
  })

  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    ...Array.from({ length: totalShiftColumns }, () => ({ wch: 44 })),
  ]

  const rangeRef = ws['!ref']
  if (rangeRef) {
    const range = XLSX.utils.decode_range(rangeRef)
    for (let row = 2; row <= range.e.r; row += 1) {
      for (let col = 2; col <= range.e.c; col += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = ws[cellRef]
        if (!cell) continue
        cell.s = {
          ...(cell.s || {}),
          alignment: {
            ...(cell.s?.alignment || {}),
            wrapText: true,
            vertical: 'top',
          },
        }
      }
    }
  }

  return ws
}

function buildFixedReportSheet(
  rows: NormalizedScheduleRow[],
  payload: SchedulingExcelExportPayload
): XLSX.WorkSheet {
  const generatedAt = payload.generatedAt || new Date()
  const qualityIssues = Array.isArray(payload.qualityReport?.issues)
    ? payload.qualityReport?.issues || []
    : []

  const exclusionRows = buildExclusionMatrixRows(payload.breakdowns || [])
  const totalAssignments = rows.length
  const totalRejections = qualityIssues.filter(issue => {
    const rule = coerceString(issue.rule).toLowerCase()
    return rule.includes('no available machine') || rule.includes('machine availability')
  }).length
  const totalReschedules = rows.filter(row => {
    const status = row.machineAvailabilityStatus.toUpperCase()
    return status.includes('WINDOW_ADJUSTED') || status.includes('RESCHEDULE')
  }).length
  const validationFailures = qualityIssues.filter(
    issue => coerceString(issue.severity).toLowerCase() === 'critical'
  ).length

  const aoa: Array<Array<string | number>> = [
    ['FIXED UNIFIED SCHEDULING ENGINE REPORT', '', '', '', '', ''],
    [`Generated: ${formatDateTimeForReport(generatedAt)}`, '', '', '', '', ''],
    [
      `Exclusion Rules: ${exclusionRows.reduce((sum, row) => sum + row.count, 0)}`,
      '',
      '',
      '',
      '',
      '',
    ],
    [`Total Assignments: ${totalAssignments}`, '', '', '', '', ''],
    [`Total Rejections: ${totalRejections}`, '', '', '', '', ''],
    [`Total Reschedules: ${totalReschedules}`, '', '', '', '', ''],
    [`Validation Failures: ${validationFailures}`, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['EXCLUSION MATRIX', '', '', '', '', ''],
    ['Machine', 'Rules Count', 'Rule Types', 'Descriptions', '', ''],
  ]

  if (exclusionRows.length === 0) {
    aoa.push(['', '', '', '', '', ''])
  } else {
    exclusionRows.forEach(item => {
      aoa.push([item.machine, item.count, item.types, item.descriptions, '', ''])
    })
  }

  aoa.push(['', '', '', '', '', ''])
  aoa.push(['SUCCESSFUL ASSIGNMENTS', '', '', '', '', ''])
  aoa.push(['Machine', 'Operation', 'Final Window', 'Original Window', 'Attempts', 'Rescheduled'])

  rows.forEach(row => {
    const setup = row.setupStart ? formatDateTimeForReport(row.setupStart) : 'N/A'
    const end = row.runEnd ? formatDateTimeForReport(row.runEnd) : 'N/A'
    const status = row.machineAvailabilityStatus.toUpperCase()
    const rescheduled = status.includes('WINDOW_ADJUSTED') || status.includes('RESCHEDULE')

    aoa.push([
      row.machine,
      `${row.partNumber} Op${row.operationSeq}`,
      `${setup} to ${end}`,
      `${setup} to ${end}`,
      1,
      rescheduled ? 'Yes' : 'No',
    ])
  })

  aoa.push(['', '', '', '', '', ''])
  aoa.push(['REJECTIONS', '', '', '', '', ''])
  aoa.push(['Rule', 'Severity', 'Message', '', '', ''])

  if (qualityIssues.length === 0) {
    aoa.push(['None', '', '', '', '', ''])
  } else {
    qualityIssues.forEach(issue => {
      aoa.push([
        coerceString(issue.rule),
        coerceString(issue.severity),
        coerceString(issue.message),
        '',
        '',
        '',
      ])
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 34 }, { wch: 10 }, { wch: 12 }]
  return ws
}

function setStandardColumns(sheet: XLSX.WorkSheet, count: number): void {
  sheet['!cols'] = Array.from({ length: count }, () => ({ wch: 22 }))
}

export function buildSchedulingWorkbook(payload: SchedulingExcelExportPayload): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()
  const isBasic = payload.profileMode === 'basic'

  const holidayPeriodsText = buildHolidayPeriodsText(payload.holidays || [])
  const normalizedRows = normalizeRows(payload.results || [], holidayPeriodsText)

  const outputRows = buildOutputSheetRows(normalizedRows)
  const output2Rows = buildOutput2Rows(normalizedRows)
  const clientOutRows = buildClientOutRows(normalizedRows)
  const personnelEvents = buildPersonnelEventRows(
    normalizedRows,
    payload.personnelProfiles || [],
    payload.shiftSettings,
    payload.profileMode
  )
  const personnelEventLogRows = buildPersonnelEventLogRows(personnelEvents)
  const personnelSummaryRows = buildPersonnelSummaryRows(
    personnelEvents,
    payload.personnelProfiles || [],
    payload.shiftSettings
  )
  const personnelDailyRows = buildPersonnelDailyRows(personnelEvents)
  const personnelDailyFullRows = buildPersonnelDailyFullRows(personnelDailyRows)
  const utilizationSummaryRows = buildUtilizationSummaryRows(personnelDailyRows)
  const percentReportSheet = buildPercentReportSheet(
    personnelEvents,
    payload.personnelProfiles || [],
    payload.shiftSettings,
    payload.generatedAt
  )

  const outputSheet = XLSX.utils.json_to_sheet(outputRows, {
    header: [...OUTPUT_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(outputSheet, OUTPUT_HEADERS.length)

  const output2Sheet = XLSX.utils.json_to_sheet(output2Rows, {
    header: [...OUTPUT_2_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(output2Sheet, OUTPUT_2_HEADERS.length)

  const clientOutSheet = XLSX.utils.json_to_sheet(clientOutRows, {
    header: [...CLIENT_OUT_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(clientOutSheet, CLIENT_OUT_HEADERS.length)

  const fixedReportSheet = buildFixedReportSheet(normalizedRows, payload)

  const personnelEventLogSheet = XLSX.utils.json_to_sheet(personnelEventLogRows, {
    header: [...PERSONNEL_EVENT_LOG_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(personnelEventLogSheet, PERSONNEL_EVENT_LOG_HEADERS.length)

  const personnelSummarySheet = XLSX.utils.json_to_sheet(personnelSummaryRows, {
    header: [...PERSONNEL_SUMMARY_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(personnelSummarySheet, PERSONNEL_SUMMARY_HEADERS.length)

  const personnelDailyFullSheet = XLSX.utils.json_to_sheet(personnelDailyFullRows, {
    header: [...PERSONNEL_DAILY_FULL_HEADERS],
    skipHeader: false,
  })
  personnelDailyFullSheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 11 },
    { wch: 13 },
    { wch: 21 },
    { wch: 21 },
  ]

  const utilizationSummarySheet = XLSX.utils.json_to_sheet(utilizationSummaryRows, {
    header: [...UTILIZATION_SUMMARY_HEADERS],
    skipHeader: false,
  })
  utilizationSummarySheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 11 },
    { wch: 10 },
    { wch: 12 },
    { wch: 17 },
    { wch: 19 },
    { wch: 18 },
    { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(workbook, outputSheet, 'Output')

  // In Advanced mode: include the Setup_output sheet (setup person details)
  if (!isBasic) {
    const setupOutputRows = buildSetupOutputRows(normalizedRows)
    const setupOutputSheet = XLSX.utils.json_to_sheet(setupOutputRows, {
      header: [...SETUP_OUTPUT_HEADERS],
      skipHeader: false,
    })
    setStandardColumns(setupOutputSheet, SETUP_OUTPUT_HEADERS.length)
    XLSX.utils.book_append_sheet(workbook, setupOutputSheet, 'Setup_output')
  }

  XLSX.utils.book_append_sheet(workbook, output2Sheet, 'Output_2')
  XLSX.utils.book_append_sheet(workbook, clientOutSheet, 'Client_Out')
  XLSX.utils.book_append_sheet(workbook, personnelEventLogSheet, 'Personnel_Event_Log')
  XLSX.utils.book_append_sheet(workbook, personnelSummarySheet, 'Personnel_Personnel')
  XLSX.utils.book_append_sheet(workbook, percentReportSheet, 'Percent_Report')
  XLSX.utils.book_append_sheet(workbook, fixedReportSheet, 'Fixed_Report')
  XLSX.utils.book_append_sheet(workbook, personnelDailyFullSheet, 'Personnel_Daily_Full')
  XLSX.utils.book_append_sheet(workbook, utilizationSummarySheet, 'Utilization_Summary')

  return workbook
}

export function exportSchedulingWorkbookToFile(
  payload: SchedulingExcelExportPayload,
  fileName: string
): void {
  const workbook = buildSchedulingWorkbook(payload)
  XLSX.writeFile(workbook, fileName)
}
