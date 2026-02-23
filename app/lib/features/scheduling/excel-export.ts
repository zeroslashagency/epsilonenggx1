import * as XLSX from 'xlsx'

interface QualityIssueLike {
  rule?: string
  severity?: string
  message?: string
}

interface QualityReportLike {
  issues?: QualityIssueLike[]
}

export interface SchedulingExcelExportPayload {
  results: unknown[]
  orders?: unknown[]
  holidays?: unknown[]
  breakdowns?: unknown[]
  qualityReport?: QualityReportLike | null
  generatedAt?: Date
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

const OUTPUT_HEADERS = [
  'PartNumber',
  'Order_Quantity',
  'Priority',
  'Batch_ID',
  'Batch_Qty',
  'OperationSeq',
  'OperationName',
  'Machine',
  'Person',
  'SetupStart',
  'SetupEnd',
  'RunStart',
  'RunEnd',
  'Timing',
  'DueDate',
  'BreakdownMachine',
  'Global_Holiday_Periods',
  'Operator',
  'Machine_Availability_STATUS',
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
    PartNumber: row.partNumber,
    Order_Quantity: row.orderQuantity,
    Priority: row.priority,
    Batch_ID: row.batchId,
    Batch_Qty: row.batchQty,
    OperationSeq: row.operationSeq,
    OperationName: row.operationName,
    Machine: row.machine,
    Person: row.person || row.productionPersonName || row.setupPersonName,
    SetupStart: row.setupStart ? formatDateTimeForReport(row.setupStart) : '',
    SetupEnd: row.setupEnd ? formatDateTimeForReport(row.setupEnd) : '',
    RunStart: row.runStart ? formatDateTimeForReport(row.runStart) : '',
    RunEnd: row.runEnd ? formatDateTimeForReport(row.runEnd) : '',
    Timing: row.timing,
    DueDate: toExcelDate(row.dueDate),
    BreakdownMachine: row.breakdownMachine,
    Global_Holiday_Periods: row.globalHolidayPeriods,
    Operator: row.operator,
    Machine_Availability_STATUS: row.machineAvailabilityStatus,
  }))

  const totalMinutes = rows.reduce((sum, row) => {
    const parsed = parseTiming(row.timing, row.setupStart, row.runEnd)
    return sum + parsed.totalMin
  }, 0)

  if (data.length > 0) {
    data.push({
      PartNumber: 'TOTAL (Timing)',
      Order_Quantity: '',
      Priority: '',
      Batch_ID: '',
      Batch_Qty: '',
      OperationSeq: '',
      OperationName: '',
      Machine: '',
      Person: '',
      SetupStart: '',
      SetupEnd: '',
      RunStart: '',
      RunEnd: formatDuration(totalMinutes),
      Timing: '',
      DueDate: '',
      BreakdownMachine: '',
      Global_Holiday_Periods: '',
      Operator: '',
      Machine_Availability_STATUS: '',
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
      SetupStart: toExcelDate(row.setupStart),
      SetupEnd: toExcelDate(row.setupEnd),
      Timing: formatDuration(setupMin),
    }
  })
}

function buildOutput2Rows(rows: NormalizedScheduleRow[]): Record<string, unknown>[] {
  return rows.map(row => ({
    'Part Number': row.partNumber,
    Quantity: row.orderQuantity,
    'Batch Size': row.batchQty,
    'Date & Time': toExcelDate(row.setupEnd || row.setupStart),
    Machine: row.machine,
    'Expected Delivery Date': toExcelDate(row.runEnd),
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
        'Start Date': toExcelDate(start),
        'Expected Delivery Date': toExcelDate(end),
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

  const holidayPeriodsText = buildHolidayPeriodsText(payload.holidays || [])
  const normalizedRows = normalizeRows(payload.results || [], holidayPeriodsText)

  const outputRows = buildOutputSheetRows(normalizedRows)
  const setupOutputRows = buildSetupOutputRows(normalizedRows)
  const output2Rows = buildOutput2Rows(normalizedRows)
  const clientOutRows = buildClientOutRows(normalizedRows)

  const outputSheet = XLSX.utils.json_to_sheet(outputRows, {
    header: [...OUTPUT_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(outputSheet, OUTPUT_HEADERS.length)

  const setupOutputSheet = XLSX.utils.json_to_sheet(setupOutputRows, {
    header: [...SETUP_OUTPUT_HEADERS],
    skipHeader: false,
  })
  setStandardColumns(setupOutputSheet, SETUP_OUTPUT_HEADERS.length)

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

  XLSX.utils.book_append_sheet(workbook, outputSheet, 'Output')
  XLSX.utils.book_append_sheet(workbook, setupOutputSheet, 'Setup_output')
  XLSX.utils.book_append_sheet(workbook, output2Sheet, 'Output_2')
  XLSX.utils.book_append_sheet(workbook, clientOutSheet, 'Client_Out')
  XLSX.utils.book_append_sheet(workbook, fixedReportSheet, 'Fixed_Report')

  return workbook
}

export function exportSchedulingWorkbookToFile(
  payload: SchedulingExcelExportPayload,
  fileName: string
): void {
  const workbook = buildSchedulingWorkbook(payload)
  XLSX.writeFile(workbook, fileName)
}
