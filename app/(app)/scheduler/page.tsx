'use client'

import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'
import {
  PartNumberService,
  PartNumber,
  samplePartNumbers,
} from '@/app/lib/features/scheduling/part-number-service'
import { BackendIntegrationService } from '@/app/lib/features/scheduling/backend-integration'
import { HolidayCalendar } from '@/app/components/holiday-calendar'
import { DateTimePicker } from '@/app/components/date-time-picker'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/app/lib/utils/utils'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { apiClient } from '@/app/lib/utils/api-client'
import * as XLSX from 'xlsx'
import { exportSchedulingWorkbookToFile } from '@/app/lib/features/scheduling/excel-export'
import {
  parsePersonnelProfilesFromRows,
  SchedulerPersonnelProfileInput,
} from '@/app/lib/features/scheduling/personnel-v2'
import {
  FLOW_DENSE_ROW_THRESHOLD,
  PieceRenderPolicy,
  applyPieceSlice,
  buildPieceFlowRows,
  filterPieceFlowRows,
  formatImportFailureAlert,
  formatSchedulingFailureAlert,
  resolvePieceRenderMode,
  normalizeMachineLane,
  safelyEvaluate,
} from '@/app/lib/features/scheduling/piece-flow-helpers'
import {
  deriveRunPermissionsFromCodes,
  isRunActionDisabled,
  resolveProfileForExecution,
  resolveRunPermissions,
} from '@/app/lib/features/scheduling/run-access-ui'
import {
  Settings,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  LogOut,
  Cog,
  Plus,
  Trash2,
  Download,
  Upload,
  BarChart3,
  RefreshCw,
  Loader2,
  Home,
  FileUp,
  Sparkles,
  FileDown,
  PieChart,
  Lock,
  Unlock,
  XCircle,
  Sun,
  Moon,
  Check,
  ChevronUp,
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { verifyPieceFlow } from '../../lib/features/scheduling/piece-flow-verifier'
import { HexagonBackground } from '@/components/ui/hexagon-background'
import { useTheme } from '@/app/lib/contexts/theme-context'
import { SidebarTrigger } from '@/components/animate-ui/components/radix/sidebar'
import { Separator } from '@/components/ui/separator'
import { ActionDock } from '@/components/ActionDock'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Order {
  id: string
  partNumber: string
  operationSeq: string
  orderQuantity: number
  priority: string
  dueDate?: string
  batchMode: string
  customBatchSize?: number
  breakdownMachine?: string
  breakdownDateTime?: string
  startDateTime?: string
  holiday?: string
  setupWindow?: string
  operationDetails?: ImportedOperationDetail[]
}

interface ImportedOperationDetail {
  operationSeq: number
  operationName: string
  setupTimeMin: number
  cycleTimeMin: number
  minimumBatchSize: number
  eligibleMachines: string[]
  handleMode: 'single' | 'double'
  fixedMachine?: string
}

export default function SchedulerPage() {
  return (
    <ProtectedRoute requirePermission="schedule.view">
      <SchedulerPageContent />
    </ProtectedRoute>
  )
}

interface Holiday {
  id: string
  startDateTime: string
  endDateTime: string
  reason: string
}

interface Breakdown {
  id: string
  machines: string[]
  startDateTime: string
  endDateTime: string
  reason: string
}

interface RunAccessState {
  loaded: boolean
  canRunBasic: boolean
  canRunAdvanced: boolean
}

interface PieceFlowRow {
  id: string
  part: string
  batch: string
  piece: number
  operationSeq: number
  machine: string
  start: Date
  end: Date
  status: string
}

interface PieceFlowLogRow {
  key: string
  partNumber: string
  orderQty: number
  priority: string
  batchId: string
  batchQty: number
  piece: number
  operationSeq: number
  operationName: string
  machine: string
  runPerson: string
  setupPerson: string
  setupStart: Date
  setupEnd: Date
  runStart: Date
  runEnd: Date
  timing: string
  dueDate: string
  status: string
}

interface PieceTimelinePayloadRow {
  partNumber?: string
  part?: string
  batchId?: string
  batch?: string
  piece?: number | string
  operationSeq?: number | string
  operation?: number | string
  machine?: string
  runStart?: string
  start?: string
  runEnd?: string
  end?: string
  status?: string
}

interface QualityIssue {
  code: string
  rule: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  entityRefs?: string[]
  timeWindow?: {
    start?: string
    end?: string
  }
  evidence?: Record<string, unknown>
}

interface QualityReport {
  status: 'GOOD' | 'WARNING' | 'BAD'
  score: number
  kpi: {
    feasibility: number
    delivery: number
    utilization: number
    flow: number
    machineUtilizationPct: number
    personUtilizationPct: number
    flowEfficiencyPct: number
    onTimePct: number
    avgQueueGapHours: number
  }
  issues: QualityIssue[]
  parameters: {
    setupWindow: string
    breakdownCount: number
    holidayCount: number
    operationRows: number
    pieceRows: number
  }
  summary: {
    total: number
    critical: number
    warning: number
    info: number
    byCode: Record<string, number>
    validationFailures: number
  }
}

const MACHINE_LANES = [
  'VMC 1',
  'VMC 2',
  'VMC 3',
  'VMC 4',
  'VMC 5',
  'VMC 6',
  'VMC 7',
  'VMC 8',
  'VMC 9',
  'VMC 10',
]

const FLOW_LOG_PAGE_SIZE = 250
const FLOW_RENDER_CHUNK_SIZE = 500
const FLOW_RENDER_ALL_CONFIRM_THRESHOLD = 25_000
const FLOW_TRACE_LINK_PREVIEW_LIMIT = 120

type FlowLinkVisibility = 'auto' | 'selected' | 'all' | 'none'
type FlowRenderProfile = 'balanced' | 'quality'

interface FlowRenderProgress {
  phase: 'idle' | 'prepare' | 'render' | 'done' | 'cancelled' | 'error'
  total: number
  processed: number
  message: string
  startedAtMs?: number
  speedRowsPerSec?: number
  etaSeconds?: number
}

interface FlowNode {
  id: string
  key: string
  x: number
  y: number
  width: number
  height: number
  startTs: number
  endTs: number
  label: string
  shortLabel: string
  fill: string
  stroke: string
  showLabel: boolean
  tooltip: string
  part: string
  batch: string
  operationSeq: number
  machine: string
  piece?: number
  pieceKey?: string
  status?: string
  runPerson?: string
  setupPerson?: string
}

interface FlowLink {
  id: string
  d: string
  color: string
  pieceKey?: string
}

const toDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  if (typeof value === 'string') {
    const normalized = value.replace(',', '')
    const retry = new Date(normalized)
    if (!Number.isNaN(retry.getTime())) return retry
  }
  return null
}

const parseWindowMinutes = (window: string): [number, number] | null => {
  const match = String(window || '').match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  return [start, end]
}

const toLocalDateTimeInput = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm")

const extractPieceIdentity = (key: string | null): string | null => {
  if (!key) return null
  const parts = key.split('|')
  if (parts.length < 3) return null
  const piece = Number(parts[2])
  if (!Number.isFinite(piece)) return null
  return `${parts[0]}|${parts[1]}|${piece}`
}

const getTooltipPosition = (x: number, y: number): { left: number; top: number } => {
  const fallback = { left: x + 15, top: y + 15 }
  if (typeof window === 'undefined') return fallback
  const maxLeft = Math.max(16, window.innerWidth - 360)
  const maxTop = Math.max(16, window.innerHeight - 220)
  return {
    left: Math.max(16, Math.min(maxLeft, x + 15)),
    top: Math.max(16, Math.min(maxTop, y + 15)),
  }
}

const formatEta = (seconds?: number): string => {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return '0s'
  const whole = Math.max(0, Math.round(seconds))
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

const isWithinWindow = (date: Date, window: string): boolean => {
  const parsed = parseWindowMinutes(window)
  if (!parsed) return true
  const [start, end] = parsed
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (end > start) return minutes >= start && minutes < end
  return minutes >= start || minutes < end
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean => {
  return aStart < bEnd && bStart < aEnd
}

const clampPct = (value: number): number => Math.max(0, Math.min(100, value))

const minutesBetween = (start: Date, end: Date): number =>
  Math.max(0, (end.getTime() - start.getTime()) / 60_000)

const formatDurationShort = (totalMinutes: number): string => {
  const mins = Math.max(0, Math.round(totalMinutes))
  const days = Math.floor(mins / (24 * 60))
  const hours = Math.floor((mins % (24 * 60)) / 60)
  const minutes = mins % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const chooseTickStepHours = (spanHours: number): number => {
  if (spanHours <= 24) return 2
  if (spanHours <= 72) return 6
  if (spanHours <= 240) return 12
  return 24
}

const alignLocalTickStartMs = (ts: number, stepHours: number): number => {
  const date = new Date(ts)
  const base = new Date(date)
  base.setSeconds(0, 0)
  const midnight = new Date(base)
  midnight.setHours(0, 0, 0, 0)
  const minutesSinceMidnight = base.getHours() * 60 + base.getMinutes()
  const stepMinutes = Math.max(60, stepHours * 60)
  const flooredMinutes = Math.floor(minutesSinceMidnight / stepMinutes) * stepMinutes
  midnight.setMinutes(flooredMinutes)
  return midnight.getTime()
}

const evaluateScheduleQuality = (
  scheduleRows: any[],
  setupWindow: string,
  breakdowns: Breakdown[],
  pieceRows: PieceFlowRow[],
  holidays: Holiday[],
  pieceTimeline: any[] = [],
  productionWindows: string[] = [],
  profileMode: 'basic' | 'advanced' = 'advanced'
): QualityReport => {
  const issues: QualityIssue[] = []

  const addIssue = (issue: QualityIssue) => {
    issues.push(issue)
  }

  const rowSignatures = new Set<string>()
  const machineIntervals = new Map<
    string,
    Array<{ start: Date; end: Date; ref: string; type: 'setup' | 'run' }>
  >()
  const operatorIntervals = new Map<
    string,
    Array<{
      start: Date
      end: Date
      ref: string
      machine: string
      type: 'setup' | 'run'
      handleMode: 'single' | 'double'
      units: number
    }>
  >()
  const batchFlowRows = new Map<
    string,
    Array<{ op: number; runStart: Date; runEnd: Date; ref: string }>
  >()
  const partExpectedQty = new Map<string, number>()
  const partBatchQty = new Map<string, Map<string, number>>()
  const runMinutesByMachine = new Map<string, number>()
  const personActiveMinutes = new Map<string, number>()
  let earliestTs = Number.POSITIVE_INFINITY
  let latestTs = Number.NEGATIVE_INFINITY
  let dueRowCount = 0
  let onTimeCount = 0
  let lateRowCount = 0
  let totalLatenessMinutes = 0

  scheduleRows.forEach((row: any, index: number) => {
    const machine = normalizeMachineLane(row.machine || 'VMC 1')
    const setupPerson =
      String(
        row.setupPersonName ||
        row.setupPerson ||
        row.setup_person_name ||
        row.setup_person ||
        row.person ||
        row.operator ||
        ''
      ).trim() || 'Unassigned'
    const productionPerson =
      String(
        row.productionPersonName ||
        row.productionPerson ||
        row.production_person_name ||
        row.production_person ||
        row.person ||
        row.operator ||
        ''
      ).trim() || 'Unassigned'
    const handleModeRaw = String(
      row.handleMode ||
      row.handle_mode ||
      row.HandleMode ||
      row.HandleMachines ||
      row.handleMachines ||
      ''
    )
      .trim()
      .toLowerCase()
    const handleMode: 'single' | 'double' = handleModeRaw.includes('double') ? 'double' : 'single'
    const setupStart = toDate(row.setupStart || row.setup_start)
    const setupEnd = toDate(row.setupEnd || row.setup_end)
    const runStart = toDate(row.runStart || row.run_start)
    const runEnd = toDate(row.runEnd || row.run_end)
    const dueDate = toDate(row.dueDate || row.due_date)
    const part = String(row.partNumber || row.partnumber || row.part_number || 'UNKNOWN')
    const batch = String(row.batchId || row.batch_id || `B-${index + 1}`)
    const op = Number(row.operationSeq || row.operation_seq || 1)
    const batchQty = Number(row.batchQty || row.batch_qty || 0)
    const orderQty = Number(row.orderQty || row.order_quantity || row.orderQuantity || 0)
    const ref = `${part}/${batch}/OP${op}`

    if (!setupStart || !setupEnd || !runStart || !runEnd) {
      addIssue({
        code: 'timestamp_parse_error',
        rule: 'Timestamp Parse',
        severity: 'critical',
        message: `${ref} has invalid setup/run timestamps.`,
        entityRefs: [ref],
      })
      return
    }

    // In Basic mode, zero-duration setup is expected (no setup step)
    const setupInvalid = profileMode === 'basic' ? false : setupEnd <= setupStart
    if (setupInvalid || runEnd <= runStart) {
      addIssue({
        code: 'negative_duration',
        rule: 'Duration Validity',
        severity: 'critical',
        message: `${ref} has non-positive ${setupInvalid ? 'setup' : 'run'} duration.`,
        entityRefs: [ref],
        timeWindow: { start: setupStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
      return
    }

    earliestTs = Math.min(earliestTs, setupStart.getTime(), runStart.getTime())
    latestTs = Math.max(latestTs, setupEnd.getTime(), runEnd.getTime())

    const runMinutes = minutesBetween(runStart, runEnd)
    runMinutesByMachine.set(machine, (runMinutesByMachine.get(machine) || 0) + runMinutes)

    const setupMinutes = minutesBetween(setupStart, setupEnd)
    // In Basic mode there's no setup; don't pollute person minutes
    if (profileMode !== 'basic' && setupPerson && setupPerson !== 'Unassigned') {
      personActiveMinutes.set(
        setupPerson,
        (personActiveMinutes.get(setupPerson) || 0) + setupMinutes
      )
    }
    personActiveMinutes.set(
      productionPerson,
      (personActiveMinutes.get(productionPerson) || 0) + runMinutes
    )

    if (profileMode !== 'basic' && setupEnd > runStart) {
      addIssue({
        code: 'machine_setup_run_overlap',
        rule: 'Setup vs Run',
        severity: 'critical',
        message: `${ref} setup overlaps run window.`,
        entityRefs: [ref],
        timeWindow: { start: setupStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
    }

    if (
      profileMode !== 'basic' &&
      (!isWithinWindow(setupStart, setupWindow) || !isWithinWindow(setupEnd, setupWindow))
    ) {
      addIssue({
        code: 'setup_window_violation',
        rule: 'Setup Window',
        severity: 'critical',
        message: `${ref} setup (${setupStart.toLocaleString()} - ${setupEnd.toLocaleString()}) outside ${setupWindow}.`,
        entityRefs: [ref],
        timeWindow: { start: setupStart.toLocaleString(), end: setupEnd.toLocaleString() },
      })
    }

    if (dueDate && runEnd > dueDate) {
      dueRowCount += 1
      lateRowCount += 1
      totalLatenessMinutes += minutesBetween(dueDate, runEnd)
      addIssue({
        code: 'due_date_missed',
        rule: 'Due Date',
        severity: 'warning',
        message: `${ref} ends ${runEnd.toLocaleString()} after due ${dueDate.toLocaleString()}.`,
        entityRefs: [ref],
        timeWindow: { start: runStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
    } else if (dueDate) {
      dueRowCount += 1
      onTimeCount += 1
    }

    breakdowns.forEach(breakdown => {
      if (!breakdown.machines?.includes(machine)) return
      const bStart = toDate(breakdown.startDateTime)
      const bEnd = toDate(breakdown.endDateTime)
      if (!bStart || !bEnd) return
      const setupConflict = overlaps(setupStart, setupEnd, bStart, bEnd)
      const runConflict = overlaps(runStart, runEnd, bStart, bEnd)
      if (!setupConflict && !runConflict) return
      addIssue({
        code: 'machine_breakdown_conflict',
        rule: 'Breakdown Conflict',
        severity: 'critical',
        message: `${ref} overlaps ${machine} breakdown (${breakdown.reason || 'maintenance'}).`,
        entityRefs: [ref, machine],
        timeWindow: { start: bStart.toLocaleString(), end: bEnd.toLocaleString() },
      })
    })

    holidays.forEach(holiday => {
      const hStart = toDate(holiday.startDateTime)
      const hEnd = toDate(holiday.endDateTime)
      if (!hStart || !hEnd) return
      const setupConflict = overlaps(setupStart, setupEnd, hStart, hEnd)
      const runConflict = overlaps(runStart, runEnd, hStart, hEnd)
      if (!setupConflict && !runConflict) return
      addIssue({
        code: 'holiday_conflict',
        rule: 'Holiday Conflict',
        severity: 'critical',
        message: `${ref} overlaps holiday period (${holiday.reason || 'Holiday'}).`,
        entityRefs: [ref],
        timeWindow: { start: hStart.toLocaleString(), end: hEnd.toLocaleString() },
      })
    })

    const signature = `${part}|${batch}|${op}|${machine}|${runStart.toISOString()}|${runEnd.toISOString()}`
    if (rowSignatures.has(signature)) {
      addIssue({
        code: 'duplicate_row_signature',
        rule: 'Duplicate Row',
        severity: 'warning',
        message: `${ref} duplicated with identical machine/time window.`,
        entityRefs: [ref],
      })
    }
    rowSignatures.add(signature)

    const machineBucket = machineIntervals.get(machine) || []
    machineBucket.push({ start: setupStart, end: setupEnd, ref, type: 'setup' })
    machineBucket.push({ start: runStart, end: runEnd, ref, type: 'run' })
    machineIntervals.set(machine, machineBucket)

    const setupBucket = operatorIntervals.get(setupPerson) || []
    setupBucket.push({
      start: setupStart,
      end: setupEnd,
      ref,
      machine,
      type: 'setup',
      handleMode: 'single',
      units: 2,
    })
    operatorIntervals.set(setupPerson, setupBucket)

    const runBucket = operatorIntervals.get(productionPerson) || []
    runBucket.push({
      start: runStart,
      end: runEnd,
      ref,
      machine,
      type: 'run',
      handleMode,
      units: handleMode === 'double' ? 1 : 2,
    })
    operatorIntervals.set(productionPerson, runBucket)

    const flowKey = `${part}::${batch}`
    const flow = batchFlowRows.get(flowKey) || []
    flow.push({ op, runStart, runEnd, ref })
    batchFlowRows.set(flowKey, flow)

    if (Number.isFinite(orderQty) && orderQty > 0 && !partExpectedQty.has(part)) {
      partExpectedQty.set(part, Math.round(orderQty))
    }
    if (Number.isFinite(batchQty) && batchQty > 0) {
      const batchMap = partBatchQty.get(part) || new Map<string, number>()
      if (!batchMap.has(batch)) batchMap.set(batch, Math.round(batchQty))
      partBatchQty.set(part, batchMap)
    }
  })

  machineIntervals.forEach((entries, machine) => {
    const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime())
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (!overlaps(prev.start, prev.end, curr.start, curr.end)) continue

      const code = prev.type === curr.type ? 'machine_overlap' : 'machine_setup_run_overlap'
      const rule = prev.type === curr.type ? 'Machine Overlap' : 'Machine Setup/Run Overlap'
      addIssue({
        code,
        rule,
        severity: 'critical',
        message: `${machine} overlap between ${prev.ref} (${prev.type}) and ${curr.ref} (${curr.type}).`,
        entityRefs: [prev.ref, curr.ref, machine],
        timeWindow: {
          start: curr.start.toLocaleString(),
          end: prev.end.toLocaleString(),
        },
      })
    }
  })

  operatorIntervals.forEach((entries, person) => {
    if (entries.length < 2) return
    const points = Array.from(
      new Set(entries.flatMap(entry => [entry.start.getTime(), entry.end.getTime()]))
    ).sort((a, b) => a - b)

    const issueKeys = new Set<string>()
    for (let i = 0; i < points.length - 1; i++) {
      const segStart = new Date(points[i])
      const segEnd = new Date(points[i + 1])
      if (segEnd <= segStart) continue

      const active = entries.filter(entry => overlaps(entry.start, entry.end, segStart, segEnd))
      if (active.length <= 1) continue

      const activeSetup = active.filter(entry => entry.type === 'setup')
      const activeRun = active.filter(entry => entry.type === 'run')

      if (activeSetup.length >= 2) {
        const a = activeSetup[0]
        const b = activeSetup[1]
        const key = `setup|${person}|${a.ref}|${b.ref}|${points[i]}`
        if (!issueKeys.has(key)) {
          issueKeys.add(key)
          addIssue({
            code: 'operator_setup_overlap',
            rule: 'Operator Setup Overlap',
            severity: 'critical',
            message: `${person} setup overlap between ${a.ref} and ${b.ref}.`,
            entityRefs: [a.ref, b.ref, person],
            timeWindow: {
              start: segStart.toLocaleString(),
              end: segEnd.toLocaleString(),
            },
          })
        }
      }

      if (activeSetup.length > 0 && activeRun.length > 0) {
        const a = activeSetup[0]
        const b = activeRun[0]
        const key = `setuprun|${person}|${a.ref}|${b.ref}|${points[i]}`
        if (!issueKeys.has(key)) {
          issueKeys.add(key)
          addIssue({
            code: 'operator_overlap',
            rule: 'Operator Setup/Run Overlap',
            severity: 'critical',
            message: `${person} setup/run overlap between ${a.ref} and ${b.ref}.`,
            entityRefs: [a.ref, b.ref, person],
            timeWindow: {
              start: segStart.toLocaleString(),
              end: segEnd.toLocaleString(),
            },
          })
        }
      }

      if (activeRun.length > 1) {
        const runUnits = activeRun.reduce((sum, entry) => sum + entry.units, 0)
        const hasSingle = activeRun.some(entry => entry.handleMode === 'single')
        if (hasSingle) {
          const refs = Array.from(new Set(activeRun.map(entry => entry.ref))).slice(0, 3)
          const key = `singlemode|${person}|${refs.join('|')}|${points[i]}`
          if (!issueKeys.has(key)) {
            issueKeys.add(key)
            addIssue({
              code: 'person_single_mode_overlap',
              rule: 'Single Machine Exclusivity',
              severity: 'critical',
              message: `${person} has SINGLE MACHINE run overlapping another run assignment.`,
              entityRefs: [...refs, person],
              timeWindow: {
                start: segStart.toLocaleString(),
                end: segEnd.toLocaleString(),
              },
              evidence: {
                activeRuns: activeRun.map(item => ({
                  ref: item.ref,
                  handleMode: item.handleMode,
                })),
              },
            })
          }
        }

        if (runUnits > 2) {
          const refs = Array.from(new Set(activeRun.map(entry => entry.ref))).slice(0, 3)
          const key = `capacity|${person}|${refs.join('|')}|${points[i]}`
          if (!issueKeys.has(key)) {
            issueKeys.add(key)
            addIssue({
              code: 'person_run_capacity_exceeded',
              rule: 'Double Machine Capacity',
              severity: 'critical',
              message: `${person} run capacity exceeded (used ${runUnits}, max 2).`,
              entityRefs: [...refs, person],
              timeWindow: {
                start: segStart.toLocaleString(),
                end: segEnd.toLocaleString(),
              },
              evidence: {
                runUnits,
                activeRuns: activeRun.map(item => ({
                  ref: item.ref,
                  units: item.units,
                  handleMode: item.handleMode,
                })),
              },
            })
          }
        }
      }
    }
  })

  batchFlowRows.forEach((rows, key) => {
    const uniqueOps = Array.from(new Set(rows.map(row => row.op))).sort((a, b) => a - b)
    if (uniqueOps.length > 0) {
      const minOp = uniqueOps[0]
      const maxOp = uniqueOps[uniqueOps.length - 1]
      for (let op = minOp; op <= maxOp; op++) {
        if (uniqueOps.includes(op)) continue
        addIssue({
          code: 'failed_operations',
          rule: 'Route Completeness',
          severity: 'critical',
          message: `${key} missing required OP${op}.`,
          entityRefs: [key],
        })
      }
    }

    const byStart = [...rows].sort((a, b) => a.runStart.getTime() - b.runStart.getTime())
    let maxOpSeen = 0
    byStart.forEach(row => {
      if (row.op < maxOpSeen) {
        addIssue({
          code: 'operation_order_violation',
          rule: 'Operation Order',
          severity: 'critical',
          message: `${key} has OP${row.op} starting after higher operation already started.`,
          entityRefs: [row.ref],
          timeWindow: { start: row.runStart.toLocaleString(), end: row.runEnd.toLocaleString() },
        })
      }
      maxOpSeen = Math.max(maxOpSeen, row.op)
    })
  })

  const pieceGroups = new Map<string, PieceFlowRow[]>()
  pieceRows.forEach(row => {
    const key = `${row.part}|${row.batch}|${row.piece}`
    const bucket = pieceGroups.get(key) || []
    bucket.push(row)
    pieceGroups.set(key, bucket)
  })
  pieceGroups.forEach((rows, key) => {
    const sorted = [...rows].sort((a, b) => a.operationSeq - b.operationSeq)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr.start < prev.start || curr.operationSeq <= prev.operationSeq) {
        addIssue({
          code: 'piece_precedence_violation',
          rule: 'Piece Precedence',
          severity: 'critical',
          message: `${key} violates OP precedence between OP${prev.operationSeq} and OP${curr.operationSeq}.`,
          entityRefs: [prev.id, curr.id],
          timeWindow: { start: curr.start.toLocaleString(), end: prev.end.toLocaleString() },
        })
      }
    }
  })

  let totalActivePieceMinutes = 0
  let totalQueueMinutes = 0
  let queueGapCount = 0
  pieceGroups.forEach(rows => {
    const sorted = [...rows].sort((a, b) => a.operationSeq - b.operationSeq)
    sorted.forEach(row => {
      totalActivePieceMinutes += minutesBetween(row.start, row.end)
    })
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr.start > prev.end) {
        totalQueueMinutes += minutesBetween(prev.end, curr.start)
        queueGapCount += 1
      }
    }
  })

  partBatchQty.forEach((batchMap, part) => {
    const expectedQty = partExpectedQty.get(part)
    if (!expectedQty) return
    const actualQty = Array.from(batchMap.values()).reduce((sum, value) => sum + value, 0)
    if (actualQty !== expectedQty) {
      addIssue({
        code: 'quantity_mismatch',
        rule: 'Quantity Integrity',
        severity: 'critical',
        message: `${part} batch split total ${actualQty} != order quantity ${expectedQty}.`,
        entityRefs: [part],
        evidence: {
          expectedQty,
          actualQty,
          batches: Array.from(batchMap.entries()),
        },
      })
    }
  })

  const byCode = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.code] = (acc[issue.code] || 0) + 1
    return acc
  }, {})

  const criticalCount = issues.filter(issue => issue.severity === 'critical').length
  const warningCount = issues.filter(issue => issue.severity === 'warning').length
  const infoCount = issues.filter(issue => issue.severity === 'info').length
  const validationFailures = criticalCount

  const normalizedProductionWindows = productionWindows
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const productionWindowSet =
    normalizedProductionWindows.length > 0 ? normalizedProductionWindows : [setupWindow]

  const holidayIntervals = holidays
    .map(holiday => ({
      start: toDate(holiday.startDateTime),
      end: toDate(holiday.endDateTime),
    }))
    .filter((interval): interval is { start: Date; end: Date } =>
      Boolean(interval.start && interval.end && interval.end > interval.start)
    )

  const breakdownByMachine = new Map<string, Array<{ start: Date; end: Date }>>()
  breakdowns.forEach(item => {
    const start = toDate(item.startDateTime)
    const end = toDate(item.endDateTime)
    if (!start || !end || end <= start) return
      ; (item.machines || []).forEach(machine => {
        const lane = normalizeMachineLane(machine)
        const bucket = breakdownByMachine.get(lane) || []
        bucket.push({ start, end })
        breakdownByMachine.set(lane, bucket)
      })
  })

  const inHoliday = (date: Date): boolean =>
    holidayIntervals.some(interval => interval.start <= date && date < interval.end)

  const inBreakdown = (machine: string, date: Date): boolean => {
    const intervals = breakdownByMachine.get(machine) || []
    return intervals.some(interval => interval.start <= date && date < interval.end)
  }

  const rangeStart =
    Number.isFinite(earliestTs) && earliestTs !== Number.POSITIVE_INFINITY
      ? new Date(earliestTs)
      : null
  const rangeEnd =
    Number.isFinite(latestTs) && latestTs !== Number.NEGATIVE_INFINITY ? new Date(latestTs) : null

  let availableMachineMinutes = 0
  let availablePersonMinutes = 0
  const personCount = Math.max(1, personActiveMinutes.size)

  if (rangeStart && rangeEnd && rangeEnd > rangeStart) {
    const cursor = new Date(rangeStart)
    while (cursor < rangeEnd) {
      const productionOpen = productionWindowSet.some(window => isWithinWindow(cursor, window))
      const setupOpen = isWithinWindow(cursor, setupWindow)

      if (!inHoliday(cursor) && setupOpen) {
        availablePersonMinutes += personCount
      }

      if (productionOpen && !inHoliday(cursor)) {
        MACHINE_LANES.forEach(machine => {
          if (!inBreakdown(machine, cursor)) {
            availableMachineMinutes += 1
          }
        })
      }

      cursor.setMinutes(cursor.getMinutes() + 1)
    }
  }

  const totalRunMinutes = Array.from(runMinutesByMachine.values()).reduce(
    (sum, value) => sum + value,
    0
  )
  const totalPersonActiveMinutes = Array.from(personActiveMinutes.values()).reduce(
    (sum, value) => sum + value,
    0
  )
  const machineUtilizationPct =
    availableMachineMinutes > 0 ? clampPct((totalRunMinutes / availableMachineMinutes) * 100) : 0
  const personUtilizationPct =
    availablePersonMinutes > 0
      ? clampPct((totalPersonActiveMinutes / availablePersonMinutes) * 100)
      : 0
  const flowEfficiencyPct =
    totalActivePieceMinutes + totalQueueMinutes > 0
      ? clampPct((totalActivePieceMinutes / (totalActivePieceMinutes + totalQueueMinutes)) * 100)
      : 100
  const avgQueueGapHours = queueGapCount > 0 ? totalQueueMinutes / queueGapCount / 60 : 0
  const onTimePct = dueRowCount > 0 ? clampPct((onTimeCount / dueRowCount) * 100) : 100
  const avgLatenessMinutes = lateRowCount > 0 ? totalLatenessMinutes / lateRowCount : 0

  const feasibility = clampPct(100 - criticalCount * 12 - warningCount * 4 - infoCount)
  const delivery = clampPct(onTimePct - Math.min(40, avgLatenessMinutes / 30))
  const utilization = clampPct(machineUtilizationPct * 0.65 + personUtilizationPct * 0.35)
  const flow = clampPct(flowEfficiencyPct - Math.min(30, avgQueueGapHours * 1.5))
  const score = Math.round(feasibility * 0.4 + delivery * 0.2 + utilization * 0.2 + flow * 0.2)
  const status: QualityReport['status'] =
    criticalCount > 0 ? 'BAD' : warningCount > 0 ? 'WARNING' : 'GOOD'

  return {
    status,
    score,
    kpi: {
      feasibility,
      delivery,
      utilization,
      flow,
      machineUtilizationPct,
      personUtilizationPct,
      flowEfficiencyPct,
      onTimePct,
      avgQueueGapHours,
    },
    issues,
    parameters: {
      setupWindow,
      breakdownCount: breakdowns.length,
      holidayCount: holidays.length,
      operationRows: scheduleRows.length,
      pieceRows: pieceRows.length,
    },
    summary: {
      total: issues.length,
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      byCode,
      validationFailures,
    },
  }
}

function SchedulerPageContent() {
  const themeContext = useTheme()
  const theme = themeContext?.theme || 'light'
  const toggleTheme = themeContext?.toggleTheme || (() => { })
  const [scheduleProfile, setScheduleProfile] = useState<'basic' | 'advanced'>('advanced')
  const [runAccess, setRunAccess] = useState<RunAccessState>({
    loaded: false,
    canRunBasic: false,
    canRunAdvanced: false,
  })
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [pieceTimelinePayload, setPieceTimelinePayload] = useState<PieceTimelinePayloadRow[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showFlowMap, setShowFlowMap] = useState(false)
  const [pieceFlowRows, setPieceFlowRows] = useState<PieceFlowRow[]>([])
  const [isApproximateView, setIsApproximateView] = useState(false)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [engineQualityMetrics, setEngineQualityMetrics] = useState<{
    machineUtilPct: number
    personUtilPct: number
    avgQueueHours: number
    totalSpanHours: number
    activeMachines: number
    activePersons: number
  } | null>(null)
  const [qualityScope, setQualityScope] = useState<'all' | 'filtered'>('all')
  const [flowPartFilter, setFlowPartFilter] = useState('ALL')
  const [flowBatchFilter, setFlowBatchFilter] = useState('ALL')
  const [flowOpFilter, setFlowOpFilter] = useState('ALL')
  const [flowMachineFilter, setFlowMachineFilter] = useState('ALL')
  const [flowPersonFilter, setFlowPersonFilter] = useState('ALL')
  const [pieceRange, setPieceRange] = useState({ from: 1, to: 20 })
  const [flowRenderProfile, setFlowRenderProfile] = useState<FlowRenderProfile>('quality')
  const [flowRenderPolicy, setFlowRenderPolicy] = useState<PieceRenderPolicy>('all')
  const [flowRenderProgress, setFlowRenderProgress] = useState<FlowRenderProgress>({
    phase: 'idle',
    total: 0,
    processed: 0,
    message: '',
  })
  const [renderAllProcessedCount, setRenderAllProcessedCount] = useState(0)
  const [flowMapMode, setFlowMapMode] = useState<'blocks' | 'trace' | 'playback' | 'logs'>('trace')
  const [hoveredNode, setHoveredNode] = useState<{ node: FlowNode; x: number; y: number } | null>(
    null
  )
  const [flowLinkVisibility, setFlowLinkVisibility] = useState<FlowLinkVisibility>('auto')
  const [flowFocusActivePiece, setFlowFocusActivePiece] = useState(true)
  const [traceNodeScale, setTraceNodeScale] = useState(1)
  const [traceLaneSpread, setTraceLaneSpread] = useState(1)
  const [traceLabelEveryPiece, setTraceLabelEveryPiece] = useState(24)
  const [traceLinkThickness, setTraceLinkThickness] = useState(1.25)
  const [traceBackgroundLinkOpacity, setTraceBackgroundLinkOpacity] = useState(0.16)
  const [flowMapZoom, setFlowMapZoom] = useState(1)
  const [verificationFilteredOnly, setVerificationFilteredOnly] = useState(false)
  const [autoVerifyAfterRender, setAutoVerifyAfterRender] = useState(true)
  const [playbackDelayMs, setPlaybackDelayMs] = useState(150)
  const [playbackStepMinutes, setPlaybackStepMinutes] = useState(5)
  const [playbackCursorMs, setPlaybackCursorMs] = useState<number | null>(null)
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false)
  const [flowTimeWindow, setFlowTimeWindow] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const [selectedFlowKey, setSelectedFlowKey] = useState<string | null>(null)
  const [pendingFlowScrollKey, setPendingFlowScrollKey] = useState<string | null>(null)
  const [showPersonTimeline, setShowPersonTimeline] = useState(true)
  const [flowLogPage, setFlowLogPage] = useState(1)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flowViewportRef = useRef<HTMLDivElement | null>(null)
  const renderAllSessionRef = useRef(0)
  const autoVerifySessionRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedProfile = window.localStorage.getItem('scheduler.flow.renderProfile.v1')
    if (savedProfile === 'balanced' || savedProfile === 'quality') {
      setFlowRenderProfile(savedProfile)
      if (savedProfile === 'quality') {
        setFlowRenderPolicy('all')
      }
    }

    const savedView = window.localStorage.getItem('scheduler.flow.viewSettings.v1')
    if (!savedView) return
    try {
      const parsed = JSON.parse(savedView) as Partial<{
        traceNodeScale: number
        traceLaneSpread: number
        traceLabelEveryPiece: number
        traceLinkThickness: number
        traceBackgroundLinkOpacity: number
        autoVerifyAfterRender: boolean
      }>
      if (Number.isFinite(parsed.traceNodeScale)) {
        setTraceNodeScale(Math.max(0.7, Math.min(1.6, Number(parsed.traceNodeScale))))
      }
      if (Number.isFinite(parsed.traceLaneSpread)) {
        setTraceLaneSpread(Math.max(0.85, Math.min(1.8, Number(parsed.traceLaneSpread))))
      }
      if (Number.isFinite(parsed.traceLabelEveryPiece)) {
        setTraceLabelEveryPiece(
          Math.max(6, Math.min(160, Math.round(Number(parsed.traceLabelEveryPiece))))
        )
      }
      if (Number.isFinite(parsed.traceLinkThickness)) {
        setTraceLinkThickness(Math.max(0.8, Math.min(2.8, Number(parsed.traceLinkThickness))))
      }
      if (Number.isFinite(parsed.traceBackgroundLinkOpacity)) {
        setTraceBackgroundLinkOpacity(
          Math.max(0.04, Math.min(0.5, Number(parsed.traceBackgroundLinkOpacity)))
        )
      }
      if (typeof parsed.autoVerifyAfterRender === 'boolean') {
        setAutoVerifyAfterRender(parsed.autoVerifyAfterRender)
      }
    } catch {
      // Ignore malformed persisted settings.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('scheduler.flow.renderProfile.v1', flowRenderProfile)
  }, [flowRenderProfile])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      'scheduler.flow.viewSettings.v1',
      JSON.stringify({
        traceNodeScale,
        traceLaneSpread,
        traceLabelEveryPiece,
        traceLinkThickness,
        traceBackgroundLinkOpacity,
        autoVerifyAfterRender,
      })
    )
  }, [
    traceNodeScale,
    traceLaneSpread,
    traceLabelEveryPiece,
    traceLinkThickness,
    traceBackgroundLinkOpacity,
    autoVerifyAfterRender,
  ])

  useEffect(() => {
    if (flowRenderProfile === 'quality' && flowRenderPolicy !== 'all') {
      setFlowRenderPolicy('all')
    }
  }, [flowRenderProfile, flowRenderPolicy])

  // Part number management state
  const [partNumbers, setPartNumbers] = useState<PartNumber[]>([])
  const [partNumberSearch, setPartNumberSearch] = useState('')
  const [showPartNumberDropdown, setShowPartNumberDropdown] = useState(false)
  const [filteredPartNumbers, setFilteredPartNumbers] = useState<PartNumber[]>([])
  const [selectedPartNumber, setSelectedPartNumber] = useState<PartNumber | null>(null)
  const [loadingPartNumbers, setLoadingPartNumbers] = useState(false)
  const [backendService, setBackendService] = useState<BackendIntegrationService | null>(null)

  // Operation sequence dropdown states
  const [showOperationDropdown, setShowOperationDropdown] = useState(false)
  const [operationSearch, setOperationSearch] = useState('')
  const [availableOperations, setAvailableOperations] = useState<string[]>([])
  const [filteredOperations, setFilteredOperations] = useState<string[]>([])
  const [importedExcelMeta, setImportedExcelMeta] = useState<{
    fileName: string
    partCount: number
    rowCount: number
    personnelCount: number
    productionTeamCount: number
    setupTeamCount: number
    personnelIssueCount: number
  } | null>(null)
  const [importedPersonnelProfiles, setImportedPersonnelProfiles] = useState<
    SchedulerPersonnelProfileInput[]
  >([])
  const [importedOperationCatalog, setImportedOperationCatalog] = useState<
    Record<string, ImportedOperationDetail[]>
  >({})

  // Form state
  const [formData, setFormData] = useState({
    partNumber: '',
    operationSeq: '',
    orderQuantity: 1,
    priority: 'Normal',
    dueDate: '',
    batchMode: 'auto-split',
    breakdownMachine: '',
    breakdownStart: '',
    breakdownEnd: '',
    startDateTime: '',
    holidayStart: '',
    holidayEnd: '',
    setupWindow: '06:00-22:00',
    customBatchSize: 0,
  })

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    globalStartDateTime: '', // Empty by default - will use current time if not specified
    globalSetupWindow: '06:00-22:00',
    shift1: '06:00-14:00',
    shift2: '14:00-22:00',
    shift3: '22:00-06:00',
    productionWindowShift1: '06:00-14:00',
    productionWindowShift2: '14:00-22:00',
    productionWindowShift3: '22:00-06:00',
  })

  // Breakdown form state
  const [breakdownForm, setBreakdownForm] = useState({
    selectedMachines: [] as string[],
    startDateTime: '',
    endDateTime: '',
    reason: '',
  })

  // Breakdown date picker state (same as Holiday Calendar)
  const [breakdownDateRange, setBreakdownDateRange] = useState<DateRange | undefined>()
  const [breakdownStartTime, setBreakdownStartTime] = useState('')
  const [breakdownEndTime, setBreakdownEndTime] = useState('')

  // Lock state for saving settings to Supabase
  const [settingsLocked, setSettingsLocked] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)

  const { userEmail, logout, hasPermissionCode } = useAuth()
  const router = useRouter()

  // Permission checks using backend codes
  const canView = hasPermissionCode('schedule.view')
  const canCreate = hasPermissionCode('schedule.create')
  const canEdit = hasPermissionCode('schedule.edit')
  const canDelete = hasPermissionCode('schedule.delete')
  const canApprove = hasPermissionCode('schedule.approve')
  const fallbackRunPermissions = deriveRunPermissionsFromCodes({
    hasRunBasicCode: hasPermissionCode('schedule.run.basic'),
    hasRunAdvancedCode: hasPermissionCode('schedule.run.advanced'),
    canCreate,
    canEdit,
  })
  const canRunBasicByCode = fallbackRunPermissions.canRunBasic
  const canRunAdvancedByCode = fallbackRunPermissions.canRunAdvanced
  const resolvedRunPermissions = resolveRunPermissions(runAccess, fallbackRunPermissions)
  const canRunBasic = resolvedRunPermissions.canRunBasic
  const canRunAdvanced = resolvedRunPermissions.canRunAdvanced

  const loadRunAccess = async () => {
    try {
      const response = await apiClient('/api/schedule/run-access', { method: 'GET' })
      if (!response.ok) {
        setRunAccess({
          loaded: true,
          canRunBasic: canRunBasicByCode,
          canRunAdvanced: canRunAdvancedByCode,
        })
        return
      }

      const payload = await response.json().catch(() => null)
      setRunAccess({
        loaded: true,
        canRunBasic: Boolean(payload?.data?.canRunBasic),
        canRunAdvanced: Boolean(payload?.data?.canRunAdvanced),
      })
    } catch {
      setRunAccess({
        loaded: true,
        canRunBasic: canRunBasicByCode,
        canRunAdvanced: canRunAdvancedByCode,
      })
    }
  }

  const applySavedSettings = (savedData: any) => {
    setSettingsLocked(savedData.is_locked || false)

    setAdvancedSettings(prev => ({
      ...prev,
      globalStartDateTime: savedData.global_start_datetime || '',
      globalSetupWindow: savedData.global_setup_window || '',
      shift1: savedData.shift_1 || '',
      shift2: savedData.shift_2 || '',
      shift3: savedData.shift_3 || '',
      productionWindowShift1: savedData.production_shift_1 || '',
      productionWindowShift2: savedData.production_shift_2 || '',
      productionWindowShift3: savedData.production_shift_3 || '',
    }))

    if (Array.isArray(savedData.holidays)) {
      setHolidays(savedData.holidays)
    }
    if (Array.isArray(savedData.breakdowns)) {
      setBreakdowns(savedData.breakdowns)
    }
  }

  const loadSavedSettings = async (): Promise<boolean> => {
    if (!userEmail) return false

    try {
      const response = await apiClient('/api/save-advanced-settings', {
        method: 'GET',
        headers: {
          'X-User-Email': userEmail || 'default@user.com',
        },
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      if (!result.success || !result.data?.machine_data) {
        return false
      }

      applySavedSettings(result.data.machine_data)
      return true
    } catch (error) {
      return false
    }
  }

  // Load saved advanced settings on mount
  useEffect(() => {
    let isMounted = true

    if (userEmail) {
      ; (async () => {
        const response = await apiClient('/api/save-advanced-settings', {
          method: 'GET',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
        })

        if (!response.ok) return

        const result = await response.json()
        if (isMounted && result.success && result.data?.machine_data) {
          applySavedSettings(result.data.machine_data)
        }
      })().catch(() => { })
    }

    return () => {
      isMounted = false
    }
  }, [userEmail])

  useEffect(() => {
    if (!userEmail) {
      setRunAccess({
        loaded: true,
        canRunBasic: canRunBasicByCode,
        canRunAdvanced: canRunAdvancedByCode,
      })
      return
    }

    void loadRunAccess()
  }, [userEmail, canRunBasicByCode, canRunAdvancedByCode])

  useEffect(() => {
    const nextProfile = resolveProfileForExecution(scheduleProfile, {
      canRunBasic,
      canRunAdvanced,
    })
    if (nextProfile !== scheduleProfile) setScheduleProfile(nextProfile)
  }, [scheduleProfile, canRunAdvanced, canRunBasic])

  // Initialize backend services and load part numbers on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ; (window as any).XLSX = XLSX
    }

    initializeBackendServices()

    // Check if XLSX library is available
    const checkXLSX = () => {
      if (typeof window !== 'undefined') {
        if (typeof (window as any).XLSX === 'undefined') {
          setTimeout(checkXLSX, 1000)
        } else {
        }
      }
    }

    // Listen for XLSX loaded event
    const handleXLSXLoaded = () => { }

    if (typeof window !== 'undefined') {
      window.addEventListener('xlsxLoaded', handleXLSXLoaded)
    }

    checkXLSX()

    // Cleanup event listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('xlsxLoaded', handleXLSXLoaded)
      }
    }
  }, [])

  // Initialize backend services (same as original HTML version)
  const initializeBackendServices = async () => {
    try {
      setLoadingPartNumbers(true)

      // Initialize backend integration service
      const backend = BackendIntegrationService.getInstance()
      await backend.initialize()
      setBackendService(backend)

      // Load part numbers using the backend service
      const availablePartNumbers = backend.getAvailablePartNumbers()

      // Convert to PartNumber format
      const partNumbersData: PartNumber[] = availablePartNumbers.map(partNumber => {
        const operations = backend.getOperationsForPart(partNumber)
        return {
          partnumber: partNumber,
          operations: operations.map(op => `OP${op.OperationSeq}`).sort(),
        }
      })

      setPartNumbers(partNumbersData)
    } catch (error) {
      // Fallback to sample data
      setPartNumbers(samplePartNumbers)
    } finally {
      setLoadingPartNumbers(false)
    }
  }

  // Filter part numbers based on search
  useEffect(() => {
    if (partNumberSearch.trim() === '') {
      setFilteredPartNumbers(partNumbers)
    } else {
      const filtered = partNumbers.filter((part: PartNumber) =>
        part.partnumber.toLowerCase().includes(partNumberSearch.toLowerCase())
      )
      setFilteredPartNumbers(filtered)
    }
  }, [partNumberSearch, partNumbers])

  // Filter operations based on search
  useEffect(() => {
    // Always show all available operations when dropdown is opened
    // The filtering is handled by the dropdown search functionality
    setFilteredOperations(availableOperations)
  }, [availableOperations])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.part-number-dropdown')) {
        setShowPartNumberDropdown(false)
      }
      if (!target.closest('.operation-sequence-dropdown')) {
        setShowOperationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!showResults || results.length === 0) {
      setPieceFlowRows([])
      setIsApproximateView(false)
      setQualityReport(null)
      setQualityScope('all')
      setFlowPartFilter('ALL')
      setFlowBatchFilter('ALL')
      setFlowOpFilter('ALL')
      setFlowMachineFilter('ALL')
      setFlowPersonFilter('ALL')
      setFlowLogPage(1)
      setPlaybackCursorMs(null)
      setIsPlaybackRunning(false)
      setFlowTimeWindow({ start: '', end: '' })
      setSelectedFlowKey(null)
      setPendingFlowScrollKey(null)
      return
    }

    const { rows: flowRows, isApproximate } = buildPieceFlowRows(results, pieceTimelinePayload)
    const maxPiece = flowRows.reduce((max, row) => Math.max(max, row.piece), 1)
    const minTs =
      flowRows.length > 0 ? Math.min(...flowRows.map(row => row.start.getTime())) : Date.now()
    const maxTs =
      flowRows.length > 0 ? Math.max(...flowRows.map(row => row.end.getTime())) : Date.now()

    setPieceFlowRows(flowRows)
    setIsApproximateView(isApproximate)
    const fallbackReport = {
      status: 'BAD' as const,
      score: 0,
      kpi: {
        feasibility: 0,
        delivery: 0,
        utilization: 0,
        flow: 0,
        machineUtilizationPct: 0,
        personUtilizationPct: 0,
        flowEfficiencyPct: 0,
        onTimePct: 0,
        avgQueueGapHours: 0,
      },
      issues: [
        {
          code: 'verification_exception',
          rule: 'Quality Evaluation',
          severity: 'critical' as const,
          message: 'Verification failed during initial quality evaluation.',
          entityRefs: ['quality-evaluator'],
        },
      ],
      parameters: {
        setupWindow: advancedSettings.globalSetupWindow,
        breakdownCount: breakdowns.length,
        holidayCount: holidays.length,
        operationRows: results.length,
        pieceRows: flowRows.length,
      },
      summary: {
        total: 1,
        critical: 1,
        warning: 0,
        info: 0,
        byCode: { verification_exception: 1 },
        validationFailures: 1,
      },
    }
    const evaluation = safelyEvaluate(
      () =>
        evaluateScheduleQuality(
          results,
          advancedSettings.globalSetupWindow,
          breakdowns,
          flowRows,
          holidays,
          pieceTimelinePayload,
          [
            advancedSettings.productionWindowShift1,
            advancedSettings.productionWindowShift2,
            advancedSettings.productionWindowShift3,
          ],
          scheduleProfile
        ),
      fallbackReport
    )
    setQualityReport(evaluation.value)
    if (evaluation.error) {
      alert(evaluation.error)
    }
    setQualityScope('all')
    setFlowPartFilter('ALL')
    setFlowBatchFilter('ALL')
    setFlowOpFilter('ALL')
    setFlowMachineFilter('ALL')
    setFlowPersonFilter('ALL')
    setFlowLogPage(1)
    setPieceRange({ from: 1, to: Math.min(20, maxPiece) })
    setFlowMapMode('trace')
    setFlowMapZoom(1)
    setPlaybackCursorMs(null)
    setIsPlaybackRunning(false)
    setFlowTimeWindow({
      start: toLocalDateTimeInput(new Date(minTs)),
      end: toLocalDateTimeInput(new Date(maxTs)),
    })
    setSelectedFlowKey(null)
    setPendingFlowScrollKey(null)
  }, [
    results,
    pieceTimelinePayload,
    showResults,
    advancedSettings.globalSetupWindow,
    advancedSettings.productionWindowShift1,
    advancedSettings.productionWindowShift2,
    advancedSettings.productionWindowShift3,
    breakdowns,
    holidays,
  ])

  // Prevent dropdown from closing when clicking inside dropdown
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  // Handle part number selection
  const handlePartNumberSelect = (partNumber: PartNumber) => {
    setSelectedPartNumber(partNumber)
    // Convert OP1, OP2 format to 1, 2 format for the scheduling engine
    const operationNumbers = partNumber.operations.map(op => op.replace('OP', '')).join(', ')
    setFormData((prev: any) => ({
      ...prev,
      partNumber: partNumber.partnumber,
      operationSeq: operationNumbers, // Auto-fill operations in correct format
    }))
    setShowPartNumberDropdown(false)
    setPartNumberSearch(partNumber.partnumber)

    // Set available operations for the dropdown
    setAvailableOperations(partNumber.operations)
    setFilteredOperations(partNumber.operations)
    setOperationSearch(operationNumbers)
  }

  // Handle part number search input
  const handlePartNumberSearch = (value: string) => {
    setPartNumberSearch(value)
    setShowPartNumberDropdown(true)

    // Clear selected part number if search doesn't match
    if (selectedPartNumber && !value.includes(selectedPartNumber.partnumber)) {
      setSelectedPartNumber(null)
    }
  }

  // Handle manual operation sequence editing
  const handleOperationSequenceChange = (value: string) => {
    // Convert any OP1, OP2 format to 1, 2 format for consistency
    const normalizedValue = value.replace(/OP(\d+)/g, '$1')

    setFormData((prev: any) => ({ ...prev, operationSeq: normalizedValue }))
    setOperationSearch(normalizedValue)

    // Clear selected part number if operations are manually changed
    const expectedValue = selectedPartNumber
      ? selectedPartNumber.operations.map((op: string) => op.replace('OP', '')).join(', ')
      : ''
    if (selectedPartNumber && normalizedValue !== expectedValue) {
      setSelectedPartNumber(null)
    }
  }

  // Handle operation sequence dropdown click
  const handleOperationSequenceClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (availableOperations.length > 0) {
      setShowOperationDropdown(!showOperationDropdown)
    }
  }

  // Handle operation sequence selection (multiple selection with toggle)
  const handleOperationSequenceSelect = (operation: string) => {
    const operationNumber = operation.replace('OP', '')
    const currentSeq = formData.operationSeq

    // If field is empty, just add the operation
    if (!currentSeq || currentSeq.trim() === '') {
      setFormData((prev: any) => ({ ...prev, operationSeq: operationNumber }))
      setOperationSearch(operationNumber)
    } else {
      // Check if operation is already in the sequence
      const operations = currentSeq.split(',').map((op: string) => op.trim())

      if (operations.includes(operationNumber)) {
        // Remove the operation if it's already selected (toggle off)
        const newOperations = operations.filter((op: string) => op !== operationNumber)
        const newSeq = newOperations.length > 0 ? newOperations.join(', ') : ''
        setFormData((prev: any) => ({ ...prev, operationSeq: newSeq }))
        setOperationSearch(newSeq)
      } else {
        // Add the operation to the existing sequence (toggle on)
        const newSeq = [...operations, operationNumber].join(', ')
        setFormData((prev: any) => ({ ...prev, operationSeq: newSeq }))
        setOperationSearch(newSeq)
      }
    }

    // Keep dropdown open for multiple selections
    // setShowOperationDropdown(false) // Removed to keep dropdown open
  }

  const handleAddOrder = () => {
    if (!formData.partNumber || !formData.operationSeq || !formData.orderQuantity) {
      return
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      partNumber: formData.partNumber,
      operationSeq: formData.operationSeq,
      orderQuantity: formData.orderQuantity,
      priority: formData.priority,
      dueDate: formData.dueDate || undefined,
      batchMode: formData.batchMode,
      customBatchSize:
        formData.batchMode === 'custom-batch-size' && formData.customBatchSize > 0
          ? formData.customBatchSize
          : undefined,
      breakdownMachine: formData.breakdownMachine || undefined,
      breakdownDateTime:
        formData.breakdownStart && formData.breakdownEnd
          ? `${formData.breakdownStart} - ${formData.breakdownEnd}`
          : undefined,
      startDateTime: formData.startDateTime || undefined,
      holiday:
        formData.holidayStart && formData.holidayEnd
          ? `${formData.holidayStart} - ${formData.holidayEnd}`
          : undefined,
      setupWindow: formData.setupWindow || undefined,
    }

    setOrders((prev: Order[]) => [...prev, newOrder])

    // Reset form
    setFormData({
      partNumber: '',
      operationSeq: '',
      orderQuantity: 1,
      priority: 'Normal',
      dueDate: '',
      batchMode: 'auto-split',
      breakdownMachine: '',
      breakdownStart: '',
      breakdownEnd: '',
      startDateTime: '',
      holidayStart: '',
      holidayEnd: '',
      setupWindow: '06:00-22:00',
      customBatchSize: 0,
    })
  }

  const handleDeleteOrder = (id: string) => {
    setOrders((prev: Order[]) => prev.filter((order: Order) => order.id !== id))
  }

  const handleClearForm = () => {
    setFormData({
      partNumber: '',
      operationSeq: '',
      orderQuantity: 1,
      priority: 'Normal',
      dueDate: '',
      batchMode: 'auto-split',
      breakdownMachine: '',
      breakdownStart: '',
      breakdownEnd: '',
      startDateTime: '',
      holidayStart: '',
      holidayEnd: '',
      setupWindow: '06:00-22:00',
      customBatchSize: 0,
    })
    setSelectedPartNumber(null)
    setPartNumberSearch('')
    setShowPartNumberDropdown(false)
    setShowOperationDropdown(false)
    setOperationSearch('')
    setAvailableOperations([])
    setFilteredOperations([])
  }

  const handleClearAllOrders = () => {
    setOrders([])
  }

  const handleAddHoliday = (holidayData: {
    startDateTime: string
    endDateTime: string
    reason: string
  }) => {
    const start = new Date(holidayData.startDateTime)
    const end = new Date(holidayData.endDateTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      alert('Holiday end must be after start')
      return
    }

    const newHoliday: Holiday = {
      id: Date.now().toString(),
      startDateTime: holidayData.startDateTime,
      endDateTime: holidayData.endDateTime,
      reason: holidayData.reason || 'Holiday',
    }

    setHolidays((prev: Holiday[]) => [...prev, newHoliday])
  }

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev: Holiday[]) => prev.filter((holiday: Holiday) => holiday.id !== id))
  }

  const handleAddBreakdown = () => {
    if (!breakdownForm.selectedMachines.length) {
      alert('Please select at least one machine.')
      return
    }

    if (!breakdownDateRange?.from || !breakdownDateRange?.to) {
      alert('Please select a breakdown date range.')
      return
    }

    if (!breakdownStartTime || !breakdownEndTime) {
      alert('Please select both breakdown start and end times.')
      return
    }

    // Combine date and time
    const startDateTime = `${format(breakdownDateRange.from, 'yyyy-MM-dd')}T${breakdownStartTime}`
    const endDateTime = `${format(breakdownDateRange.to, 'yyyy-MM-dd')}T${breakdownEndTime}`
    const start = new Date(startDateTime)
    const end = new Date(endDateTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      alert('Breakdown end must be after start')
      return
    }

    const newBreakdown: Breakdown = {
      id: Date.now().toString(),
      machines: breakdownForm.selectedMachines,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      reason: breakdownForm.reason || 'Maintenance',
    }

    setBreakdowns((prev: Breakdown[]) => [...prev, newBreakdown])
    setBreakdownForm({ selectedMachines: [], startDateTime: '', endDateTime: '', reason: '' })
    setBreakdownDateRange(undefined)
    setBreakdownStartTime('')
    setBreakdownEndTime('')
  }

  const handleDeleteBreakdown = (id: string) => {
    setBreakdowns((prev: Breakdown[]) => prev.filter((breakdown: Breakdown) => breakdown.id !== id))
  }

  const buildAdvancedSettingsPayload = (locked: boolean) => ({
    user_email: userEmail,
    global_start_datetime: advancedSettings.globalStartDateTime,
    global_setup_window: advancedSettings.globalSetupWindow,
    shift_1: advancedSettings.shift1,
    shift_2: advancedSettings.shift2,
    shift_3: advancedSettings.shift3,
    production_shift_1: advancedSettings.productionWindowShift1,
    production_shift_2: advancedSettings.productionWindowShift2,
    production_shift_3: advancedSettings.productionWindowShift3,
    holidays: holidays,
    breakdowns: breakdowns,
    is_locked: locked,
    locked_at: locked ? new Date().toISOString() : null,
    role: 'operator',
  })

  // Handle lock/unlock settings to Supabase
  const handleToggleSettingsLock = async () => {
    setLockLoading(true)
    try {
      if (settingsLocked) {
        // UNLOCK: Send unlock request to API
        const unlockData = {
          user_email: userEmail,
          is_locked: false,
        }

        const response = await apiClient('/api/save-advanced-settings', {
          method: 'POST',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
          body: JSON.stringify(unlockData),
        })

        if (response.ok) {
          setSettingsLocked(false)
        } else {
          throw new Error('Failed to unlock settings')
        }
      } else {
        // LOCK: Save to Supabase with lock state
        const response = await apiClient('/api/save-advanced-settings', {
          method: 'POST',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
          body: JSON.stringify(buildAdvancedSettingsPayload(true)),
        })

        if (response.ok) {
          setSettingsLocked(true)
        } else {
          throw new Error('Failed to lock settings')
        }
      }
    } catch (error) {
      alert('Failed to toggle settings lock. Please try again.')
    } finally {
      setLockLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setLockLoading(true)
    try {
      const response = await apiClient('/api/save-advanced-settings', {
        method: 'POST',
        headers: {
          'X-User-Email': userEmail || 'default@user.com',
        },
        body: JSON.stringify(buildAdvancedSettingsPayload(settingsLocked)),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const details = Array.isArray(payload?.details)
          ? payload.details.join(', ')
          : payload?.details || payload?.error
        throw new Error(details || 'Failed to save settings')
      }

      alert(settingsLocked ? 'Locked settings saved.' : 'Settings saved.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setLockLoading(false)
    }
  }

  const handleLoadSettings = async () => {
    setLockLoading(true)
    try {
      const loaded = await loadSavedSettings()
      if (!loaded) {
        alert('No saved advanced settings found for this user.')
      }
    } finally {
      setLockLoading(false)
    }
  }

  const handleMachineToggle = (machine: string) => {
    setBreakdownForm((prev: any) => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(machine)
        ? prev.selectedMachines.filter((m: string) => m !== machine)
        : [...prev.selectedMachines, machine],
    }))
  }

  const normalizeScheduleResponse = (
    payload: any
  ): {
    rows: any[]
    pieceTimeline: PieceTimelinePayloadRow[]
  } => {
    if (payload && Array.isArray(payload.rows)) {
      return {
        rows: payload.rows,
        pieceTimeline: Array.isArray(payload.pieceTimeline) ? payload.pieceTimeline : [],
      }
    }

    if (Array.isArray(payload)) {
      return { rows: payload, pieceTimeline: [] }
    }

    return { rows: [], pieceTimeline: [] }
  }

  const verifyRunProfileAccess = async (profileMode: 'basic' | 'advanced'): Promise<void> => {
    const response = await apiClient('/api/schedule/run-access', {
      method: 'POST',
      body: JSON.stringify({ profileMode }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const detail = payload?.error || 'Run permission denied for selected profile.'
      throw new Error(detail)
    }

    const payload = await response.json().catch(() => null)
    if (payload?.data) {
      setRunAccess({
        loaded: true,
        canRunBasic: Boolean(payload.data.canRunBasic),
        canRunAdvanced: Boolean(payload.data.canRunAdvanced),
      })
    }
  }

  const handleRunSchedule = async (profileOverride?: 'basic' | 'advanced') => {
    const activeProfile = profileOverride ?? scheduleProfile
    if (orders.length === 0) return

    if (activeProfile === 'advanced' && !canRunAdvanced) {
      alert('Advanced profile requires setup + run permission.')
      return
    }

    if (activeProfile === 'basic' && !canRunBasic) {
      alert('Basic profile requires run permission.')
      return
    }

    if (!backendService) {
      alert('Scheduling engine is still initializing. Please wait a moment and try again.')
      return
    }

    setLoading(true)
    setShowResults(false)

    try {
      await verifyRunProfileAccess(activeProfile)

      // Align default global start to setup-window start for deterministic schedules.
      const startDateTime =
        advancedSettings.globalStartDateTime ||
        (() => {
          const now = new Date()
          const parsedWindow = parseWindowMinutes(advancedSettings.globalSetupWindow)
          const startMinute = parsedWindow ? parsedWindow[0] : 6 * 60
          const aligned = new Date(now)
          aligned.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0)
          return aligned.toISOString().slice(0, 16)
        })()

      const ordersForScheduling = orders.map(order => {
        const operationDetails = resolveImportedOperationDetails(
          order.partNumber,
          order.operationSeq
        )
        if (operationDetails.length === 0) {
          return order
        }
        return {
          ...order,
          operationDetails,
        }
      })

      // Use the backend scheduling engine (same as original HTML version)
      const scheduleResponse = await backendService.runSchedule(ordersForScheduling, {
        globalStartDateTime: startDateTime,
        globalSetupWindow: advancedSettings.globalSetupWindow,
        shift1: advancedSettings.shift1,
        shift2: advancedSettings.shift2,
        shift3: advancedSettings.shift3,
        productionWindowShift1: advancedSettings.productionWindowShift1,
        productionWindowShift2: advancedSettings.productionWindowShift2,
        productionWindowShift3: advancedSettings.productionWindowShift3,
        holidays: holidays,
        breakdowns: breakdowns,
        personnelProfiles: importedPersonnelProfiles,
        profileMode: activeProfile,
      })

      const normalizedResponse = normalizeScheduleResponse(scheduleResponse)
      setResults(normalizedResponse.rows)
      setPieceTimelinePayload(normalizedResponse.pieceTimeline)
      if (scheduleResponse?.qualityMetrics) {
        setEngineQualityMetrics(scheduleResponse.qualityMetrics)
      }
      setShowResults(true)
      // Piece Flow Map remains hidden until the user explicitly clicks "Open Piece Flow"
    } catch (error) {
      setResults([])
      setPieceTimelinePayload([])
      setShowResults(false)
      setShowFlowMap(false)
      alert(formatSchedulingFailureAlert(error))
    } finally {
      setLoading(false)
    }
  }

  // Floating Action Bar Handlers
  const handleShowDashboard = () => {
    router.push('/schedule-dashboard')
  }

  const handleImportExcel = () => {
    const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizeBatchMode = (value: string): string => {
      const normalized = normalizeKey(value)
      if (normalized.includes('single')) return 'single-batch'
      if (normalized.includes('custom')) return 'custom-batch-size'
      if (normalized.includes('autosplit') || normalized === 'auto' || normalized.includes('split'))
        return 'auto-split'
      return 'auto-split'
    }
    const toPositiveInt = (value: string): number | null => {
      const numericValue = Number(
        String(value ?? '')
          .replace(/,/g, '')
          .trim()
      )
      if (!Number.isFinite(numericValue) || numericValue <= 0) return null
      return Math.round(numericValue)
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filePath = `${session.user.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

          // Fire and forget upload to not block the UI
          supabase.storage
            .from('scheduler-imports')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })
            .catch(err => console.error('Failed to upload Excel to Supabase:', err))
        }

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          alert('No sheet found in the selected Excel file.')
          return
        }

        const sheet = workbook.Sheets[firstSheetName]
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        })
        if (rawRows.length === 0) {
          alert('The selected Excel file is empty.')
          return
        }

        const readValue = (row: Record<string, unknown>, aliases: string[]): string => {
          const normalizedAliases = aliases.map(normalizeKey)
          const matchedKey = Object.keys(row).find(key =>
            normalizedAliases.includes(normalizeKey(key))
          )
          const value = matchedKey ? row[matchedKey] : ''
          return String(value ?? '').trim()
        }

        const parseMachineList = (value: string): string[] => {
          return String(value || '')
            .split(/[,|/;]/)
            .map(machine => machine.trim())
            .filter(Boolean)
        }
        const parseHandleMode = (value: string): 'single' | 'double' => {
          const normalized = String(value || '')
            .trim()
            .toLowerCase()
          if (normalized.includes('double')) return 'double'
          return 'single'
        }

        const importedCatalogMap = new Map<string, Map<number, ImportedOperationDetail>>()
        for (const row of rawRows) {
          const partNumber = readValue(row, [
            'partNumber',
            'part_number',
            'part no',
            'partno',
            'pn',
          ])
          const operationSeqRaw = readValue(row, [
            'operationSeq',
            'operation_seq',
            'operation',
            'op',
            'operation no',
          ])
          const opNumberMatch = operationSeqRaw.match(/\d+/)
          const operationSeq = opNumberMatch ? Number(opNumberMatch[0]) : NaN
          if (!partNumber || !Number.isFinite(operationSeq) || operationSeq <= 0) {
            continue
          }

          const setupRaw = readValue(row, ['setupTime_Min', 'setuptime_min', 'setup time', 'setup'])
          const cycleRaw = readValue(row, ['cycleTime_Min', 'cycletime_min', 'cycle time', 'cycle'])
          const minBatchRaw = readValue(row, [
            'minimum_batchsize',
            'minimum batch size',
            'minimum_batch_size',
            'min batch size',
          ])
          const operationNameRaw = readValue(row, ['operationName', 'operation_name'])
          const fixedMachine = readValue(row, ['machine', 'fixed machine', 'preferred machine'])
          const eligibleRaw = readValue(row, [
            'eligibleMachines',
            'eligible_machines',
            'eligible machines',
          ])
          const handleMachinesRaw = readValue(row, [
            'HandleMachines',
            'handle_machines',
            'handle machines',
            'handle machine',
            'handle mode',
          ])

          const hasSpecEvidence =
            Boolean(setupRaw) ||
            Boolean(cycleRaw) ||
            Boolean(minBatchRaw) ||
            Boolean(eligibleRaw) ||
            Boolean(fixedMachine)
          if (!hasSpecEvidence) {
            continue
          }

          const setupTimeMin = toPositiveInt(setupRaw) || 60
          const cycleTimeMin = toPositiveInt(cycleRaw) || 1
          const minimumBatchSize = toPositiveInt(minBatchRaw) || 1
          const operationName = operationNameRaw || `Operation ${operationSeq}`
          const eligibleMachines = parseMachineList(eligibleRaw)
          const mergedMachines =
            fixedMachine && eligibleMachines.length === 0
              ? [fixedMachine]
              : fixedMachine && !eligibleMachines.includes(fixedMachine)
                ? [fixedMachine, ...eligibleMachines]
                : eligibleMachines

          const detail: ImportedOperationDetail = {
            operationSeq,
            operationName,
            setupTimeMin,
            cycleTimeMin,
            minimumBatchSize,
            eligibleMachines: mergedMachines,
            handleMode: parseHandleMode(handleMachinesRaw),
            fixedMachine: fixedMachine || undefined,
          }

          const partMap =
            importedCatalogMap.get(partNumber) || new Map<number, ImportedOperationDetail>()
          partMap.set(operationSeq, detail)
          importedCatalogMap.set(partNumber, partMap)
        }

        // Format A: direct order import (part/op/qty row-wise)
        const directOrders: Order[] = rawRows
          .map((row, index) => {
            const partNumber = readValue(row, [
              'partNumber',
              'part_number',
              'part no',
              'partno',
              'pn',
            ])
            const operationSeqRaw = readValue(row, [
              'operationSeq',
              'operation_seq',
              'operation',
              'op',
              'operation no',
            ])
            const quantityRaw = readValue(row, [
              'orderQuantity',
              'order_qty',
              'orderqty',
              'quantity',
              'qty',
            ])

            const orderQuantity = toPositiveInt(quantityRaw)
            if (!partNumber || !operationSeqRaw || !orderQuantity) return null

            const priority = readValue(row, ['priority']) || 'Normal'
            const dueDate = readValue(row, ['dueDate', 'due_date', 'duedate'])
            const batchMode = normalizeBatchMode(
              readValue(row, ['batchMode', 'batch_mode', 'batch split', 'batch type'])
            )
            const customBatchSize = toPositiveInt(
              readValue(row, ['customBatchSize', 'custom_batch_size', 'batchSize', 'batch_size'])
            )

            return {
              id: `${Date.now()}-${index}`,
              partNumber,
              operationSeq: operationSeqRaw.replace(/OP/gi, '').trim(),
              orderQuantity,
              priority,
              dueDate: dueDate || undefined,
              batchMode,
              customBatchSize:
                batchMode === 'custom-batch-size' ? customBatchSize || undefined : undefined,
            } as Order
          })
          .filter((order): order is Order => Boolean(order))

        let importedOrders: Order[] = directOrders

        // Format B: master operations import (your current Excel format)
        if (importedOrders.length === 0) {
          const groupedByPart = new Map<
            string,
            { operations: Set<number>; minBatchSizes: number[] }
          >()

          for (const row of rawRows) {
            const partNumber = readValue(row, [
              'partNumber',
              'part_number',
              'part no',
              'partno',
              'pn',
            ])
            const operationSeqRaw = readValue(row, [
              'operationSeq',
              'operation_seq',
              'operation',
              'op',
            ])
            const minBatchRaw = readValue(row, [
              'minimum_batchsize',
              'minimum batch size',
              'minimum_batch_size',
              'min batch size',
            ])

            const opNumberMatch = operationSeqRaw.match(/\d+/)
            const operationNumber = opNumberMatch ? Number(opNumberMatch[0]) : NaN

            if (!partNumber || !Number.isFinite(operationNumber) || operationNumber <= 0) {
              continue
            }

            const group = groupedByPart.get(partNumber) || {
              operations: new Set<number>(),
              minBatchSizes: [],
            }

            group.operations.add(operationNumber)

            const minBatchSize = toPositiveInt(minBatchRaw)
            if (minBatchSize) {
              group.minBatchSizes.push(minBatchSize)
            }

            groupedByPart.set(partNumber, group)
          }

          importedOrders = Array.from(groupedByPart.entries()).map(([partNumber, group], index) => {
            const operationSeq = Array.from(group.operations)
              .sort((a, b) => a - b)
              .join(', ')
            const inferredQuantity =
              group.minBatchSizes.length > 0 ? Math.max(...group.minBatchSizes) : 1

            return {
              id: `${Date.now()}-master-${index}`,
              partNumber,
              operationSeq,
              orderQuantity: inferredQuantity,
              priority: 'Normal',
              batchMode: 'auto-split',
            }
          })
        }

        if (importedOrders.length === 0) {
          alert(
            'No valid rows found. Supported formats: order file (Part/Operation/Quantity) or master file (PartNumber/OperationSeq/Minimum_BatchSize).'
          )
          return
        }

        const importedPartMap = new Map<string, Set<string>>()
        importedOrders.forEach(order => {
          const operations = order.operationSeq
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => `OP${value.replace(/OP/gi, '')}`)
          if (!importedPartMap.has(order.partNumber)) {
            importedPartMap.set(order.partNumber, new Set<string>())
          }
          operations.forEach(op => importedPartMap.get(order.partNumber)?.add(op))
        })

        const importedPartNumbers: PartNumber[] = Array.from(importedPartMap.entries()).map(
          ([partnumber, operations]) => ({
            partnumber,
            operations: Array.from(operations).sort((a, b) => {
              const aNum = Number(a.replace('OP', ''))
              const bNum = Number(b.replace('OP', ''))
              return aNum - bNum
            }),
          })
        )

        const importedCatalogObject = Array.from(importedCatalogMap.entries()).reduce<
          Record<string, ImportedOperationDetail[]>
        >((acc, [partNumber, opMap]) => {
          acc[partNumber] = Array.from(opMap.values()).sort(
            (a, b) => a.operationSeq - b.operationSeq
          )
          return acc
        }, {})
        const personnelParse = parsePersonnelProfilesFromRows(rawRows)

        setPartNumbers(importedPartNumbers)
        setImportedOperationCatalog(importedCatalogObject)
        setImportedPersonnelProfiles(personnelParse.profiles)
        setImportedExcelMeta({
          fileName: file.name,
          partCount: importedPartNumbers.length,
          rowCount: rawRows.length,
          personnelCount: personnelParse.profiles.length,
          productionTeamCount: personnelParse.summary.productionRowsDetected,
          setupTeamCount: personnelParse.summary.setupRowsDetected,
          personnelIssueCount: personnelParse.issues.length,
        })
        setSelectedPartNumber(null)
        setPartNumberSearch('')
        setShowPartNumberDropdown(false)
        setShowOperationDropdown(false)
        setAvailableOperations([])
        setFilteredOperations([])
        setFormData((prev: any) => ({
          ...prev,
          partNumber: '',
          operationSeq: '',
        }))
        setActiveTab('orders')
        alert(
          `Imported ${importedPartNumbers.length} part numbers and ${personnelParse.profiles.length} personnel profiles from ${file.name}. Scheduler will use imported operation details (setup/cycle/machines) and real personnel names where available.${personnelParse.issues.length > 0 ? ` Personnel parser warnings: ${personnelParse.issues.length}.` : ''}`
        )
      } catch (error) {
        alert(formatImportFailureAlert(error))
      }
    }

    input.click()
  }

  const handleRemoveImportedData = () => {
    setImportedExcelMeta(null)
    setImportedPersonnelProfiles([])
    setImportedOperationCatalog({})
    setPartNumbers([])
    setSelectedPartNumber(null)
    setPartNumberSearch('')
    setShowPartNumberDropdown(false)
    setShowOperationDropdown(false)
    setAvailableOperations([])
    setFilteredOperations([])
    setFormData((prev: any) => ({
      ...prev,
      partNumber: '',
      operationSeq: '',
    }))
  }

  const handleExportExcel = async () => {
    if (results.length === 0) {
      alert('No results to export. Please run the schedule first.')
      return
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `production_schedule_${timestamp}.xlsx`

      exportSchedulingWorkbookToFile(
        {
          results,
          orders,
          holidays,
          breakdowns,
          personnelProfiles: importedPersonnelProfiles,
          shiftSettings: {
            shift1: advancedSettings.shift1,
            shift2: advancedSettings.shift2,
            shift3: advancedSettings.shift3,
            globalSetupWindow: advancedSettings.globalSetupWindow,
          },
          qualityReport,
          generatedAt: new Date(),
          profileMode: scheduleProfile,
        },
        filename
      )
    } catch (error) {
      alert('Failed to export file: ' + (error as Error).message)
    }
  }

  const handlePublishSchedule = async () => {
    if (!showResults || results.length === 0) {
      alert('Please run the schedule first before publishing.')
      return
    }

    if (
      !confirm(
        'Are you sure you want to publish this schedule? This will make it available to all users.'
      )
    ) {
      return
    }

    try {
      // Get auth token from Supabase session
      const supabase = getSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('❌ Not authenticated. Please login again.')
        router.push('/auth')
        return
      }

      const response = await fetch('/api/schedule/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scheduleId: `schedule_${Date.now()}`,
          scheduleName: `Schedule ${new Date().toLocaleDateString()}`,
          publishDate: new Date().toISOString(),
          schedulingResults: results,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ Schedule published successfully!')
      } else {
        alert(`❌ Failed to publish schedule: ${data.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`❌ Error publishing schedule: ${error.message}`)
    }
  }

  const handleShowChart = async () => {
    if (!showResults || results.length === 0) {
      alert('Please run the schedule first to see the chart.')
      return
    }

    try {
      // Calculate timeline starting from current time
      const now = new Date()
      let currentTime = new Date(now.getTime())

      // Prepare chart data from scheduling results with proper timeline calculation
      const chartTasks = results.map((result: any, index: number) => {
        // Calculate setup start time (current time)
        const setupStartTime = new Date(currentTime.getTime())

        // Calculate setup end time (setup start + setup duration)
        const setupDuration = 90 * 60 * 1000 // 90 minutes in milliseconds
        const setupEndTime = new Date(setupStartTime.getTime() + setupDuration)

        // Calculate run start time (setup end time)
        const runStartTime = new Date(setupEndTime.getTime())

        // Calculate run end time (run start + run duration)
        const runDuration = result.timing
          ? parseInt(result.timing.replace(/[^\d]/g, '')) * 60 * 1000
          : 480 * 60 * 1000 // Convert to milliseconds
        const runEndTime = new Date(runStartTime.getTime() + runDuration)

        // Update current time for next task (add some buffer between tasks)
        currentTime = new Date(runEndTime.getTime() + 30 * 60 * 1000) // 30 minute buffer

        // Debug: Log the actual result structure

        return {
          id: `${result.partNumber || result.partnumber || 'PN'}-${result.batchId || result.batch_id || 'B'}-Op${result.operationSeq || result.operation_seq || index}`,
          name: `${result.partNumber || result.partnumber || 'PN'}-${result.batchId || result.batch_id || 'B'}-Op${result.operationSeq || result.operation_seq || index}`,
          machine: result.machine?.toLowerCase().replace(/\s+/g, '') || 'vmc1',
          startTime: setupStartTime,
          endTime: runEndTime,
          duration: result.timing ? parseInt(result.timing.replace(/[^\d]/g, '')) * 60 : 480,
          status:
            result.status?.toLowerCase() === 'completed'
              ? 'completed'
              : result.status?.toLowerCase() === 'in progress'
                ? 'in-progress'
                : 'not-started',
          operator: result.person || result.operator || 'A',
          partNumber: result.partNumber || result.partnumber || 'PN',
          batchId: result.batchId || result.batch_id || 'B',
          operationNumber: result.operationSeq || result.operation_seq || index.toString(),
          operationName: result.operationName || result.operation_name || 'Operation',
          quantity: result.batchQty || result.batch_qty || 100,
          orderQty: result.orderQty || result.order_quantity || result.order_qty || 100,
          setupDuration: 90, // Default setup time
          runDuration: result.timing
            ? Math.max(parseInt(result.timing.replace(/[^\d]/g, '')) * 60 - 90, 30)
            : 390,
          priority: result.priority?.toLowerCase() || 'medium',
          isSetup: false,
        }
      })

      // Store chart data directly to Supabase cloud
      const chartData = {
        sessionId: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        timelineView: 'day',
        chartData: {
          tasks: chartTasks,
          currentTime: new Date().toISOString(),
          scrollPosition: 0,
        },
        machineData: {
          machines: [
            { id: 'vmc1', name: 'VMC 1', status: 'active', utilization: 85 },
            { id: 'vmc2', name: 'VMC 2', status: 'active', utilization: 72 },
            { id: 'vmc3', name: 'VMC 3', status: 'active', utilization: 45 },
            { id: 'vmc4', name: 'VMC 4', status: 'active', utilization: 91 },
            { id: 'vmc5', name: 'VMC 5', status: 'maintenance', utilization: 0 },
            { id: 'vmc6', name: 'VMC 6', status: 'active', utilization: 68 },
            { id: 'vmc7', name: 'VMC 7', status: 'active', utilization: 32 },
            { id: 'vmc8', name: 'VMC 8', status: 'active', utilization: 78 },
            { id: 'vmc9', name: 'VMC 9', status: 'active', utilization: 65 },
            { id: 'vmc10', name: 'VMC 10', status: 'active', utilization: 55 },
          ],
        },
      }

      // Store exact scheduling results to dedicated table
      const schedulingResponse = await apiClient('/api/store-scheduling-results', {
        method: 'POST',
        headers: {
          'X-User-Email': userEmail || 'default@user.com',
        },
        body: JSON.stringify({
          schedulingResults: results, // Store the exact scheduling output data
        }),
      })

      if (!schedulingResponse.ok) {
      }

      // Store to Supabase cloud via API with complete scheduling results
      const response = await apiClient('/api/store-chart-data', {
        method: 'POST',
        headers: {
          'X-User-Email': userEmail || 'default@user.com',
        },
        body: JSON.stringify({
          ...chartData,
          schedulingResults: results, // Include the complete scheduling results
        }),
      })

      if (response.ok) {
        // Navigate to chart page
        router.push('/chart')
      } else {
        throw new Error('Failed to store chart data to cloud')
      }
    } catch (error) {
      alert('Failed to store chart data to cloud. Please try again.')
    }
  }

  const handleClearSession = () => {
    if (
      confirm(
        'Are you sure you want to clear all current data? This will remove all orders and results, but preserve locked advanced settings.'
      )
    ) {
      setOrders([])
      setResults([])
      setPieceTimelinePayload([])
      setShowResults(false)
      setShowFlowMap(false)
      setFormData({
        partNumber: '',
        operationSeq: '',
        orderQuantity: 1,
        priority: 'Normal',
        dueDate: '',
        batchMode: 'auto-split',
        breakdownMachine: '',
        breakdownStart: '',
        breakdownEnd: '',
        startDateTime: '',
        holidayStart: '',
        holidayEnd: '',
        setupWindow: '06:00-22:00',
        customBatchSize: 0,
      })
      setSelectedPartNumber(null)
      setPartNumberSearch('')
      setShowPartNumberDropdown(false)
      setShowOperationDropdown(false)
      setOperationSearch('')
      setAvailableOperations([])
      setFilteredOperations([])
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Normal':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatOperationSeqDisplay = (operationSeq: string) => {
    return String(operationSeq || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => `Op ${value.replace(/^op\s*/i, '')}`)
      .join(', ')
  }

  const parseOperationNumbers = (operationSeq: string): number[] => {
    return String(operationSeq || '')
      .split(',')
      .map(token => Number(token.replace(/[^\d]/gi, '').trim()))
      .filter(value => Number.isFinite(value) && value > 0)
  }

  const resolveImportedOperationDetails = (
    partNumber: string,
    operationSeq: string
  ): ImportedOperationDetail[] => {
    const catalog = importedOperationCatalog[partNumber] || []
    if (catalog.length === 0) return []

    const requested = parseOperationNumbers(operationSeq)
    if (requested.length === 0) return []

    return requested
      .map(op => catalog.find(item => item.operationSeq === op))
      .filter((item): item is ImportedOperationDetail => Boolean(item))
      .map(item => ({ ...item }))
  }

  const availableFlowParts = React.useMemo(() => {
    return Array.from(new Set(pieceFlowRows.map(row => row.part))).sort()
  }, [pieceFlowRows])

  const flowDataBounds = React.useMemo(() => {
    if (pieceFlowRows.length === 0) return null
    return {
      minTs: Math.min(...pieceFlowRows.map(row => row.start.getTime())),
      maxTs: Math.max(...pieceFlowRows.map(row => row.end.getTime())),
    }
  }, [pieceFlowRows])

  const flowWindowStartDate = React.useMemo(
    () => toDate(flowTimeWindow.start),
    [flowTimeWindow.start]
  )
  const flowWindowEndDate = React.useMemo(() => toDate(flowTimeWindow.end), [flowTimeWindow.end])
  const hasFlowWindow = Boolean(
    flowWindowStartDate && flowWindowEndDate && flowWindowEndDate > flowWindowStartDate
  )
  const flowWindowHours =
    hasFlowWindow && flowWindowStartDate && flowWindowEndDate
      ? minutesBetween(flowWindowStartDate, flowWindowEndDate) / 60
      : 0

  const filteredFlowRowsBase = React.useMemo(() => {
    const baseRows = filterPieceFlowRows(pieceFlowRows, {
      part: flowPartFilter,
    })

    if (!flowWindowStartDate || !flowWindowEndDate || flowWindowEndDate <= flowWindowStartDate) {
      return baseRows
    }

    return baseRows.filter(row =>
      overlaps(row.start, row.end, flowWindowStartDate, flowWindowEndDate)
    )
  }, [pieceFlowRows, flowPartFilter, flowWindowStartDate, flowWindowEndDate])

  const setFlowWindowFromDates = (start: Date, end: Date) => {
    if (!start || !end || end <= start) return
    setFlowTimeWindow({
      start: toLocalDateTimeInput(start),
      end: toLocalDateTimeInput(end),
    })
  }

  const handleFitFlowWindow = () => {
    if (!flowDataBounds) return
    setFlowWindowFromDates(new Date(flowDataBounds.minTs), new Date(flowDataBounds.maxTs))
  }

  const handleFlowWindowPreset = (hours: number) => {
    if (!flowDataBounds) return
    const start = new Date(flowDataBounds.minTs)
    const end = new Date(
      Math.min(flowDataBounds.maxTs, flowDataBounds.minTs + hours * 60 * 60 * 1000)
    )
    setFlowWindowFromDates(start, end)
  }

  const buildScheduleRowKey = (row: any): string => {
    const part = String(row.partNumber || row.partnumber || row.part_number || 'UNKNOWN')
    const batch = String(row.batchId || row.batch_id || 'B')
    const op = Number(row.operationSeq || row.operation_seq || 1)
    const machine = normalizeMachineLane(row.machine || 'VMC 1')
    return `${part}|${batch}|${op}|${machine}`
  }

  const buildPieceRowKey = (row: PieceFlowRow): string => {
    return `${row.part}|${row.batch}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
  }

  const scheduleMetaByKey = React.useMemo(() => {
    const lookup = new Map<
      string,
      {
        setupPerson: string
        runPerson: string
        setupStart: string
        setupEnd: string
        runStart: string
        runEnd: string
      }
    >()
    results.forEach((row: any) => {
      lookup.set(buildScheduleRowKey(row), {
        setupPerson: String(row.setupPersonName || row.person || 'Unassigned'),
        runPerson: String(row.productionPersonName || row.person || 'Unassigned'),
        setupStart: String(row.setupStart || ''),
        setupEnd: String(row.setupEnd || ''),
        runStart: String(row.runStart || ''),
        runEnd: String(row.runEnd || ''),
      })
    })
    return lookup
  }, [results])

  const scheduleRowByKey = React.useMemo(() => {
    const lookup = new Map<string, any>()
    results.forEach((row: any) => {
      lookup.set(buildScheduleRowKey(row), row)
    })
    return lookup
  }, [results])

  const flowLogRows = React.useMemo(() => {
    const logs = pieceFlowRows.map((row): PieceFlowLogRow => {
      const key = `${row.part}|${row.batch}|${row.piece}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
      const scheduleRow = scheduleRowByKey.get(
        `${row.part}|${row.batch}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
      )
      const setupStart = toDate(scheduleRow?.setupStart || scheduleRow?.setup_start) || row.start
      const setupEnd = toDate(scheduleRow?.setupEnd || scheduleRow?.setup_end) || row.start
      const runStart = toDate(scheduleRow?.runStart || scheduleRow?.run_start) || row.start
      const runEnd = toDate(scheduleRow?.runEnd || scheduleRow?.run_end) || row.end

      return {
        key,
        partNumber: String(scheduleRow?.partNumber || row.part),
        orderQty: Number(scheduleRow?.orderQty || scheduleRow?.order_quantity || 0),
        priority: String(scheduleRow?.priority || 'Normal'),
        batchId: String(scheduleRow?.batchId || scheduleRow?.batch_id || row.batch),
        batchQty: Number(scheduleRow?.batchQty || scheduleRow?.batch_qty || 0),
        piece: row.piece,
        operationSeq: row.operationSeq,
        operationName: String(
          scheduleRow?.operationName || scheduleRow?.operation_name || 'Operation'
        ),
        machine: normalizeMachineLane(scheduleRow?.machine || row.machine),
        runPerson: String(scheduleRow?.productionPersonName || scheduleRow?.person || 'Unassigned'),
        setupPerson: String(scheduleRow?.setupPersonName || scheduleRow?.person || 'Unassigned'),
        setupStart,
        setupEnd,
        runStart,
        runEnd,
        timing:
          String(scheduleRow?.timing || '').trim() ||
          formatDurationShort(minutesBetween(runStart, runEnd)),
        dueDate: String(scheduleRow?.dueDate || scheduleRow?.due_date || 'N/A'),
        status: String(scheduleRow?.status || row.status || 'Scheduled'),
      }
    })
    logs.sort(
      (a, b) =>
        a.runStart.getTime() - b.runStart.getTime() ||
        a.partNumber.localeCompare(b.partNumber) ||
        a.batchId.localeCompare(b.batchId) ||
        a.piece - b.piece ||
        a.operationSeq - b.operationSeq
    )
    return logs
  }, [pieceFlowRows, scheduleRowByKey])

  const availableFlowBatches = React.useMemo(
    () => Array.from(new Set(flowLogRows.map(row => row.batchId))).sort(),
    [flowLogRows]
  )

  const availableFlowOps = React.useMemo(
    () => Array.from(new Set(flowLogRows.map(row => row.operationSeq))).sort((a, b) => a - b),
    [flowLogRows]
  )

  const availableFlowMachines = React.useMemo(
    () => Array.from(new Set(flowLogRows.map(row => row.machine))).sort(),
    [flowLogRows]
  )

  const availableFlowPeople = React.useMemo(
    () => Array.from(new Set(flowLogRows.flatMap(row => [row.setupPerson, row.runPerson]))).sort(),
    [flowLogRows]
  )

  const filteredFlowLogs = React.useMemo(() => {
    return flowLogRows.filter(row => {
      if (flowPartFilter !== 'ALL' && row.partNumber !== flowPartFilter) return false
      if (flowBatchFilter !== 'ALL' && row.batchId !== flowBatchFilter) return false
      if (flowOpFilter !== 'ALL' && String(row.operationSeq) !== flowOpFilter) return false
      if (flowMachineFilter !== 'ALL' && row.machine !== flowMachineFilter) return false
      if (
        flowPersonFilter !== 'ALL' &&
        row.setupPerson !== flowPersonFilter &&
        row.runPerson !== flowPersonFilter
      ) {
        return false
      }
      if (flowWindowStartDate && row.runEnd < flowWindowStartDate) return false
      if (flowWindowEndDate && row.runStart > flowWindowEndDate) return false
      return true
    })
  }, [
    flowLogRows,
    flowPartFilter,
    flowBatchFilter,
    flowOpFilter,
    flowMachineFilter,
    flowPersonFilter,
    flowWindowStartDate,
    flowWindowEndDate,
  ])

  const flowLogPageCount = Math.max(1, Math.ceil(filteredFlowLogs.length / FLOW_LOG_PAGE_SIZE))
  const flowLogCurrentPage = Math.min(flowLogPage, flowLogPageCount)
  const pagedFlowLogs = React.useMemo(() => {
    const start = (flowLogCurrentPage - 1) * FLOW_LOG_PAGE_SIZE
    return filteredFlowLogs.slice(start, start + FLOW_LOG_PAGE_SIZE)
  }, [filteredFlowLogs, flowLogCurrentPage])

  useEffect(() => {
    setFlowLogPage(1)
  }, [
    flowPartFilter,
    flowBatchFilter,
    flowOpFilter,
    flowMachineFilter,
    flowPersonFilter,
    flowWindowStartDate,
    flowWindowEndDate,
  ])

  useEffect(() => {
    if (!selectedFlowKey) return
    const index = filteredFlowLogs.findIndex(row => row.key === selectedFlowKey)
    if (index < 0) return
    const nextPage = Math.floor(index / FLOW_LOG_PAGE_SIZE) + 1
    if (nextPage !== flowLogPage) {
      setFlowLogPage(nextPage)
    }
  }, [selectedFlowKey, filteredFlowLogs, flowLogPage])

  const productionWindows = React.useMemo(
    () =>
      [
        advancedSettings.productionWindowShift1,
        advancedSettings.productionWindowShift2,
        advancedSettings.productionWindowShift3,
      ]
        .map(value => String(value || '').trim())
        .filter(Boolean),
    [
      advancedSettings.productionWindowShift1,
      advancedSettings.productionWindowShift2,
      advancedSettings.productionWindowShift3,
    ]
  )

  const scopedFlowRowsBase = React.useMemo(() => {
    return filteredFlowRowsBase.filter(row => {
      if (flowBatchFilter !== 'ALL' && row.batch !== flowBatchFilter) return false
      if (flowOpFilter !== 'ALL' && String(row.operationSeq) !== flowOpFilter) return false
      const machine = normalizeMachineLane(row.machine)
      if (flowMachineFilter !== 'ALL' && machine !== flowMachineFilter) return false
      if (flowPersonFilter !== 'ALL') {
        const meta = scheduleMetaByKey.get(
          `${row.part}|${row.batch}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
        )
        if (meta?.setupPerson !== flowPersonFilter && meta?.runPerson !== flowPersonFilter) {
          return false
        }
      }
      return true
    })
  }, [
    filteredFlowRowsBase,
    flowBatchFilter,
    flowOpFilter,
    flowMachineFilter,
    flowPersonFilter,
    scheduleMetaByKey,
  ])

  const scopedFlowRowsSliced = React.useMemo(
    () => applyPieceSlice(scopedFlowRowsBase, pieceRange.from, pieceRange.to),
    [scopedFlowRowsBase, pieceRange]
  )

  const effectiveRenderPolicy: PieceRenderPolicy =
    flowRenderProfile === 'quality' ? 'all' : flowRenderPolicy

  const resolvedRenderMode = React.useMemo(
    () =>
      resolvePieceRenderMode(
        effectiveRenderPolicy,
        scopedFlowRowsBase.length,
        FLOW_DENSE_ROW_THRESHOLD
      ),
    [effectiveRenderPolicy, scopedFlowRowsBase.length]
  )

  const isAutoDenseSlice = effectiveRenderPolicy === 'auto' && resolvedRenderMode === 'slice'
  const isRenderAllMode = effectiveRenderPolicy === 'all'
  const renderAllTotalRows = scopedFlowRowsBase.length
  const renderAllEstimatedMemoryMb = React.useMemo(
    () => Math.round((renderAllTotalRows * 260) / (1024 * 1024)),
    [renderAllTotalRows]
  )

  const renderFlowRows = React.useMemo(() => {
    if (resolvedRenderMode === 'slice') {
      return scopedFlowRowsSliced
    }
    if (effectiveRenderPolicy === 'all') {
      const safeCount = Math.max(0, Math.min(renderAllProcessedCount, scopedFlowRowsBase.length))
      return scopedFlowRowsBase.slice(0, safeCount)
    }
    return scopedFlowRowsBase
  }, [
    resolvedRenderMode,
    scopedFlowRowsSliced,
    effectiveRenderPolicy,
    renderAllProcessedCount,
    scopedFlowRowsBase,
  ])

  const isRenderAllRunning =
    flowRenderProgress.phase === 'prepare' || flowRenderProgress.phase === 'render'

  useEffect(() => {
    if (!showFlowMap || effectiveRenderPolicy !== 'all') {
      renderAllSessionRef.current += 1
      setRenderAllProcessedCount(0)
      setFlowRenderProgress(prev =>
        prev.phase === 'idle' && prev.total === 0
          ? prev
          : {
            phase: 'idle',
            total: 0,
            processed: 0,
            message: '',
          }
      )
      return
    }

    const total = scopedFlowRowsBase.length
    const session = renderAllSessionRef.current + 1
    renderAllSessionRef.current = session

    const startedAtMs = Date.now()
    setRenderAllProcessedCount(0)
    setFlowRenderProgress({
      phase: total > 0 ? 'prepare' : 'done',
      total,
      processed: 0,
      message: total > 0 ? 'Preparing full piece render...' : 'No rows to render in current scope.',
      startedAtMs,
      speedRowsPerSec: 0,
      etaSeconds: total > 0 ? undefined : 0,
    })

    if (total === 0) return

    let processed = 0
    let cancelled = false
    const chunkSize =
      flowRenderProfile === 'quality'
        ? Math.max(180, Math.floor(FLOW_RENDER_CHUNK_SIZE * 0.7))
        : FLOW_RENDER_CHUNK_SIZE

    const scheduleNext = (callback: () => void) => {
      if (typeof window === 'undefined') return
      const requester = (window as any).requestIdleCallback
      if (typeof requester === 'function') {
        requester(() => callback())
        return
      }
      window.setTimeout(callback, 0)
    }

    const pump = () => {
      if (cancelled || renderAllSessionRef.current !== session) return
      processed = Math.min(total, processed + chunkSize)
      const elapsedSec = Math.max(0.01, (Date.now() - startedAtMs) / 1000)
      const speedRowsPerSec = processed / elapsedSec
      const remaining = Math.max(0, total - processed)
      const etaSeconds = speedRowsPerSec > 0 ? remaining / speedRowsPerSec : undefined
      setRenderAllProcessedCount(processed)
      setFlowRenderProgress({
        phase: processed < total ? 'render' : 'done',
        total,
        processed,
        message:
          processed < total
            ? `Rendering ${processed.toLocaleString()} / ${total.toLocaleString()} pieces`
            : `Rendered ${total.toLocaleString()} pieces.`,
        startedAtMs,
        speedRowsPerSec,
        etaSeconds: processed < total ? etaSeconds : 0,
      })
      if (processed < total) {
        scheduleNext(pump)
      }
    }

    scheduleNext(pump)

    return () => {
      cancelled = true
    }
  }, [showFlowMap, effectiveRenderPolicy, scopedFlowRowsBase, flowRenderProfile])

  const handleRenderAllPieces = React.useCallback(() => {
    if (renderAllTotalRows > FLOW_RENDER_ALL_CONFIRM_THRESHOLD) {
      const proceed = window.confirm(
        `Render ${renderAllTotalRows.toLocaleString()} pieces now? This may use high browser memory.`
      )
      if (!proceed) return
    }
    if (flowRenderProfile !== 'quality') {
      setFlowRenderProfile('quality')
    }
    setFlowRenderPolicy('all')
  }, [renderAllTotalRows, flowRenderProfile])

  const handleCancelRenderAll = React.useCallback(() => {
    renderAllSessionRef.current += 1
    setFlowRenderProgress(prev => ({
      ...prev,
      phase: 'cancelled',
      message: `Full render cancelled at ${prev.processed.toLocaleString()} / ${prev.total.toLocaleString()}.`,
    }))
    setRenderAllProcessedCount(0)
    setFlowRenderPolicy('slice')
    setFlowRenderProfile('balanced')
  }, [])

  const selectedPieceRows = React.useMemo(() => {
    if (!selectedFlowKey) return []
    const tokens = selectedFlowKey.split('|')
    if (tokens.length < 4) return []
    const [part, batch, pieceToken] = tokens
    const piece = Number(pieceToken)
    if (!Number.isFinite(piece)) return []
    return pieceFlowRows
      .filter(row => row.part === part && row.batch === batch && row.piece === piece)
      .sort((a, b) => a.operationSeq - b.operationSeq)
  }, [selectedFlowKey, pieceFlowRows])

  const classifyGapReason = React.useCallback(
    (start: Date, end: Date, machine: string): string => {
      if (end <= start) return 'No gap'
      if (
        holidays.some(holiday => {
          const hStart = toDate(holiday.startDateTime)
          const hEnd = toDate(holiday.endDateTime)
          return hStart && hEnd && overlaps(start, end, hStart, hEnd)
        })
      ) {
        return 'Holiday pause'
      }
      if (
        breakdowns.some(item => {
          if (!item.machines.map(normalizeMachineLane).includes(normalizeMachineLane(machine))) {
            return false
          }
          const bStart = toDate(item.startDateTime)
          const bEnd = toDate(item.endDateTime)
          return bStart && bEnd && overlaps(start, end, bStart, bEnd)
        })
      ) {
        return 'Machine breakdown'
      }

      const sample = new Date(start.getTime() + Math.max(1, end.getTime() - start.getTime()) / 2)
      const inProductionWindow =
        productionWindows.length === 0
          ? true
          : productionWindows.some(window => isWithinWindow(sample, window))
      if (!inProductionWindow) {
        return 'Production window closed'
      }

      return 'Queue / machine availability'
    },
    [holidays, breakdowns, productionWindows]
  )

  const selectedPieceDetails = React.useMemo(() => {
    if (selectedPieceRows.length === 0) return []
    return selectedPieceRows.map((row, index) => {
      const lookupKey = `${row.part}|${row.batch}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
      const scheduleMeta = scheduleMetaByKey.get(lookupKey)
      const prevRow = index > 0 ? selectedPieceRows[index - 1] : null
      const gapMinutes =
        prevRow && row.start > prevRow.end ? minutesBetween(prevRow.end, row.start) : 0
      return {
        row,
        scheduleMeta,
        gapMinutes,
        gapReason:
          gapMinutes > 0 && prevRow
            ? classifyGapReason(prevRow.end, row.start, row.machine)
            : 'No queue gap',
      }
    })
  }, [selectedPieceRows, scheduleMetaByKey, classifyGapReason])

  const selectedPieceSummary = React.useMemo(() => {
    if (selectedPieceDetails.length === 0) {
      return {
        activeMinutes: 0,
        queueMinutes: 0,
        flowEfficiencyPct: 0,
      }
    }
    const activeMinutes = selectedPieceDetails.reduce(
      (sum, detail) => sum + minutesBetween(detail.row.start, detail.row.end),
      0
    )
    const queueMinutes = selectedPieceDetails.reduce((sum, detail) => sum + detail.gapMinutes, 0)
    const flowEfficiencyPct =
      activeMinutes + queueMinutes > 0
        ? clampPct((activeMinutes / (activeMinutes + queueMinutes)) * 100)
        : 100
    return { activeMinutes, queueMinutes, flowEfficiencyPct }
  }, [selectedPieceDetails])

  const selectedPieceIdentity = React.useMemo(
    () => extractPieceIdentity(selectedFlowKey),
    [selectedFlowKey]
  )

  const pieceIdentityAnchors = React.useMemo(() => {
    const anchorByPiece = new Map<string, { key: string; startTs: number }>()
    scopedFlowRowsBase.forEach(row => {
      const pieceIdentity = `${row.part}|${row.batch}|${row.piece}`
      const key = `${row.part}|${row.batch}|${row.piece}|${row.operationSeq}|${normalizeMachineLane(row.machine)}`
      const candidateStart = row.start.getTime()
      const existing = anchorByPiece.get(pieceIdentity)
      if (!existing || candidateStart < existing.startTs) {
        anchorByPiece.set(pieceIdentity, { key, startTs: candidateStart })
      }
    })
    const orderedIdentities = Array.from(anchorByPiece.entries())
      .sort((a, b) => a[1].startTs - b[1].startTs || a[0].localeCompare(b[0]))
      .map(entry => entry[0])
    return {
      orderedIdentities,
      anchorByPiece,
    }
  }, [scopedFlowRowsBase])

  const focusPieceIdentity = React.useCallback(
    (pieceIdentity: string) => {
      const anchor = pieceIdentityAnchors.anchorByPiece.get(pieceIdentity)
      if (!anchor) return
      if (effectiveRenderPolicy !== 'all') {
        const parts = pieceIdentity.split('|')
        const piece = Number(parts[2] || 1)
        if (Number.isFinite(piece)) {
          const from = Math.max(1, piece - 2)
          setPieceRange({ from, to: Math.max(from, piece + 2) })
        }
      }
      setFlowMapMode('trace')
      setSelectedFlowKey(anchor.key)
      setPendingFlowScrollKey(anchor.key)
    },
    [pieceIdentityAnchors.anchorByPiece, effectiveRenderPolicy]
  )

  const handleStepPieceFocus = React.useCallback(
    (direction: -1 | 1) => {
      const identities = pieceIdentityAnchors.orderedIdentities
      if (identities.length === 0) return
      if (!selectedPieceIdentity) {
        focusPieceIdentity(identities[0])
        return
      }
      const currentIndex = Math.max(0, identities.indexOf(selectedPieceIdentity))
      const nextIndex = Math.max(0, Math.min(identities.length - 1, currentIndex + direction))
      focusPieceIdentity(identities[nextIndex])
    },
    [pieceIdentityAnchors.orderedIdentities, selectedPieceIdentity, focusPieceIdentity]
  )

  const runQualityEvaluation = (filteredOnly: boolean) => {
    if (!showResults || results.length === 0) return

    let scheduleRows = results
    let pieceRowsForValidation = pieceFlowRows

    if (filteredOnly) {
      const keySet = new Set(renderFlowRows.map(buildPieceRowKey))
      scheduleRows = results.filter((row: any) => keySet.has(buildScheduleRowKey(row)))
      pieceRowsForValidation = renderFlowRows
    }

    const fallbackReport = {
      status: 'BAD' as const,
      score: 0,
      kpi: {
        feasibility: 0,
        delivery: 0,
        utilization: 0,
        flow: 0,
        machineUtilizationPct: 0,
        personUtilizationPct: 0,
        flowEfficiencyPct: 0,
        onTimePct: 0,
        avgQueueGapHours: 0,
      },
      issues: [
        {
          code: 'verification_exception',
          rule: 'Quality Evaluation',
          severity: 'critical' as const,
          message: 'Verification failed during quality evaluation.',
          entityRefs: ['quality-evaluator'],
        },
      ],
      parameters: {
        setupWindow: advancedSettings.globalSetupWindow,
        breakdownCount: breakdowns.length,
        holidayCount: holidays.length,
        operationRows: scheduleRows.length,
        pieceRows: pieceRowsForValidation.length,
      },
      summary: {
        total: 1,
        critical: 1,
        warning: 0,
        info: 0,
        byCode: { verification_exception: 1 },
        validationFailures: 1,
      },
    }
    const evaluation = safelyEvaluate(
      () =>
        evaluateScheduleQuality(
          scheduleRows,
          advancedSettings.globalSetupWindow,
          breakdowns,
          pieceRowsForValidation,
          holidays,
          pieceTimelinePayload,
          [
            advancedSettings.productionWindowShift1,
            advancedSettings.productionWindowShift2,
            advancedSettings.productionWindowShift3,
          ],
          scheduleProfile
        ),
      fallbackReport
    )
    setQualityReport(evaluation.value)
    if (evaluation.error) {
      alert(evaluation.error)
    }
    setQualityScope(filteredOnly ? 'filtered' : 'all')
  }

  useEffect(() => {
    if (!showFlowMap) return
    if (!isRenderAllMode) return
    if (!autoVerifyAfterRender) return
    if (flowRenderProgress.phase !== 'done') return
    if (flowRenderProgress.total === 0) return
    const session = renderAllSessionRef.current
    if (autoVerifySessionRef.current === session) return
    autoVerifySessionRef.current = session
    runQualityEvaluation(verificationFilteredOnly)
  }, [
    showFlowMap,
    isRenderAllMode,
    autoVerifyAfterRender,
    flowRenderProgress.phase,
    flowRenderProgress.total,
    verificationFilteredOnly,
    renderFlowRows.length,
  ])

  const flowMapModel = React.useMemo(() => {
    const leftPad = 190
    const rightPad = 210
    const laneHeight = Math.round(72 * traceLaneSpread)
    const topPad = 108 + Math.max(0, Math.round((traceLaneSpread - 1) * 18))
    const lanes = MACHINE_LANES.map((machine, index) => ({
      machine,
      y: topPad + index * laneHeight,
    }))
    const machineY = new Map(lanes.map(lane => [lane.machine, lane.y]))

    const emptyState = {
      width: 1700,
      height: topPad + MACHINE_LANES.length * laneHeight + 84,
      lanes,
      nodes: [] as FlowNode[],
      links: [] as FlowLink[],
      operationLegend: [] as number[],
      timeTicks: [] as Array<{ x: number; dateLabel: string; timeLabel: string }>,
      resolvedMode: flowMapMode,
      isDense: false,
      timeline: null as null | {
        minTs: number
        maxTs: number
        leftPad: number
        trackWidth: number
      },
    }

    if (renderFlowRows.length === 0) {
      return emptyState
    }

    const minTs = Math.min(...renderFlowRows.map(row => row.start.getTime()))
    const maxTs = Math.max(...renderFlowRows.map(row => row.end.getTime()))
    const span = Math.max(1, maxTs - minTs)
    const isDense = renderFlowRows.length > FLOW_DENSE_ROW_THRESHOLD
    const resolvedMode = flowMapMode
    const zoom = Math.max(0.6, Math.min(2, flowMapZoom))
    const width = Math.max(1700, Math.round((isDense ? 2600 : 1900) * zoom))
    const trackWidth = width - leftPad - rightPad
    const partHueMap = new Map<string, number>()
    availableFlowParts.forEach((part, index) => {
      partHueMap.set(part, (110 + index * 70) % 360)
    })

    const opShade = (part: string, operation: number) => {
      const hue = partHueMap.get(part) ?? 160
      const lightness = Math.max(36, 64 - (operation - 1) * 8)
      return `hsl(${hue} 72% ${lightness}%)`
    }

    const pieceStroke = (piece: number) => {
      const hue = (piece * 37) % 360
      return `hsl(${hue} 82% 64%)`
    }

    const toX = (ts: number) => leftPad + ((ts - minTs) / span) * trackWidth
    const selectedPieceIdentityFromKey = extractPieceIdentity(selectedFlowKey)
    const blockNodeHeight = Math.max(16, Math.round(24 * traceNodeScale))
    const traceNodeHeight = Math.max(14, Math.round((isDense ? 20 : 24) * traceNodeScale))
    const labelEveryPiece = Math.max(6, Math.min(160, Math.round(traceLabelEveryPiece)))

    let nodes: FlowNode[] = []
    const links: FlowLink[] = []

    if (resolvedMode === 'blocks') {
      const grouped = new Map<
        string,
        {
          id: string
          part: string
          batch: string
          machine: string
          operationSeq: number
          start: number
          end: number
          pieceMin: number
          pieceMax: number
          pieceCount: number
        }
      >()

      renderFlowRows.forEach(row => {
        const key = `${row.part}|${row.batch}|${row.machine}|${row.operationSeq}`
        const start = row.start.getTime()
        const end = row.end.getTime()
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, {
            id: key,
            part: row.part,
            batch: row.batch,
            machine: row.machine,
            operationSeq: row.operationSeq,
            start,
            end,
            pieceMin: row.piece,
            pieceMax: row.piece,
            pieceCount: 1,
          })
          return
        }
        existing.start = Math.min(existing.start, start)
        existing.end = Math.max(existing.end, end)
        existing.pieceMin = Math.min(existing.pieceMin, row.piece)
        existing.pieceMax = Math.max(existing.pieceMax, row.piece)
        existing.pieceCount += 1
      })

      const groups = Array.from(grouped.values()).sort(
        (a, b) => a.start - b.start || a.operationSeq - b.operationSeq
      )
      const laneOps = new Map<string, number[]>()
      groups.forEach(group => {
        const ops = laneOps.get(group.machine) || []
        if (!ops.includes(group.operationSeq)) ops.push(group.operationSeq)
        laneOps.set(group.machine, ops)
      })
      laneOps.forEach(ops => ops.sort((a, b) => a - b))

      nodes = groups.map(group => {
        const startX = toX(group.start)
        const endX = toX(group.end)
        const widthPx = Math.max(18, endX - startX)
        const opOrder = laneOps.get(group.machine) || []
        const opIndex = Math.max(0, opOrder.indexOf(group.operationSeq))
        const laneOffset = ((opIndex % 6) - 2.5) * 7
        const y =
          (machineY.get(group.machine) ?? topPad + MACHINE_LANES.length * laneHeight) -
          blockNodeHeight / 2 +
          laneOffset
        const pieceLabel =
          group.pieceMin === group.pieceMax
            ? `P${group.pieceMin}`
            : `P${group.pieceMin}-${group.pieceMax}`
        return {
          id: group.id,
          key: `${group.part}|${group.batch}|${group.operationSeq}`,
          x: startX,
          y,
          width: widthPx,
          height: blockNodeHeight,
          startTs: group.start,
          endTs: group.end,
          label: `${group.part} | OP${group.operationSeq} | ${pieceLabel}`,
          shortLabel: `OP${group.operationSeq} · ${group.pieceCount}p`,
          fill: opShade(group.part, group.operationSeq),
          stroke: '#72e4ff',
          showLabel: widthPx >= 70,
          tooltip: `${group.part} ${group.batch} | OP${group.operationSeq} | ${group.machine}\nPieces ${pieceLabel} (${group.pieceCount})\n${new Date(group.start).toLocaleString()} -> ${new Date(group.end).toLocaleString()}`,
          part: group.part,
          batch: group.batch,
          operationSeq: group.operationSeq,
          machine: group.machine,
          pieceKey: `${group.part}|${group.batch}`,
          status: 'Grouped',
        }
      })

      const nodeById = new Map(nodes.map(node => [node.id, node]))
      const groupedByBatch = new Map<string, typeof groups>()
      groups.forEach(group => {
        const key = `${group.part}|${group.batch}`
        const entries = groupedByBatch.get(key) || []
        entries.push(group)
        groupedByBatch.set(key, entries)
      })

      groupedByBatch.forEach((rows, key) => {
        const sorted = [...rows].sort(
          (a, b) => a.operationSeq - b.operationSeq || a.start - b.start
        )
        for (let i = 1; i < sorted.length; i++) {
          const prevNode = nodeById.get(sorted[i - 1].id)
          const currNode = nodeById.get(sorted[i].id)
          if (!prevNode || !currNode) continue
          const fromX = prevNode.x + prevNode.width
          const fromY = prevNode.y + prevNode.height / 2
          const toXValue = currNode.x
          const toY = currNode.y + currNode.height / 2
          const cx = (fromX + toXValue) / 2
          links.push({
            id: `${key}-blocks-${i}`,
            d: `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${toY.toFixed(2)} L ${toXValue.toFixed(2)} ${toY.toFixed(2)}`,
            color: opShade(sorted[i].part, sorted[i].operationSeq),
            pieceKey: `${sorted[i].part}|${sorted[i].batch}`,
          })
        }
      })
    } else {
      const laneSlotCounts = new Map<string, number>()
      const bucketSpanMs = Math.max(3 * 60_000, Math.floor(span / 260))
      const stackDepth = isDense ? Math.max(8, Math.round(10 * traceLaneSpread)) : Math.max(6, Math.round(7 * traceLaneSpread))
      const stackStep = (isDense ? 3.2 : 4.8) * traceLaneSpread
      const sortedRows = [...renderFlowRows].sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime() ||
          a.operationSeq - b.operationSeq ||
          a.piece - b.piece
      )

      nodes = sortedRows.map(row => {
        const startMs = row.start.getTime()
        const endMs = row.end.getTime()
        const startX = toX(startMs)
        const endX = toX(endMs)
        const widthPx = Math.max(8, endX - startX)
        const normalizedMachine = normalizeMachineLane(row.machine)
        const scheduleLookupKey = `${row.part}|${row.batch}|${row.operationSeq}|${normalizedMachine}`
        const scheduleMeta = scheduleMetaByKey.get(scheduleLookupKey)
        const bucket = Math.floor((startMs - minTs) / bucketSpanMs)
        const slotKey = `${row.machine}|${bucket}`
        const slot = laneSlotCounts.get(slotKey) || 0
        laneSlotCounts.set(slotKey, slot + 1)
        const offset = ((slot % stackDepth) - (stackDepth - 1) / 2) * stackStep
        const y =
          (machineY.get(row.machine) ?? topPad + MACHINE_LANES.length * laneHeight) -
          traceNodeHeight / 2 +
          offset
        const pieceKey = `${row.part}|${row.batch}|${row.piece}`
        const showLabel =
          pieceKey === selectedPieceIdentityFromKey ||
          (!isDense && widthPx >= 52 && row.piece % labelEveryPiece === 0) ||
          (isDense && widthPx >= 72 && row.piece % Math.max(labelEveryPiece, 100) === 0)
        const nodeKey = `${row.part}|${row.batch}|${row.piece}|${row.operationSeq}|${normalizedMachine}`
        const isSelected = selectedFlowKey === nodeKey
        const runPerson = scheduleMeta?.runPerson || 'Unassigned'
        const setupPerson = scheduleMeta?.setupPerson || runPerson
        const status = row.status || 'Scheduled'
        return {
          id: row.id,
          key: nodeKey,
          x: startX,
          y,
          width: widthPx,
          height: traceNodeHeight,
          startTs: startMs,
          endTs: endMs,
          label:
            widthPx > 140
              ? `${row.part} | P${row.piece} | OP${row.operationSeq}`
              : `P${row.piece}-OP${row.operationSeq}`,
          shortLabel: `P${row.piece}`,
          fill: opShade(row.part, row.operationSeq),
          stroke: isSelected ? '#f8fafc' : row.piece === 1 ? '#ecfeff' : pieceStroke(row.piece),
          showLabel,
          tooltip: `${row.part} ${row.batch} | Piece ${row.piece} | OP${row.operationSeq} | ${normalizedMachine}\nSetup ${setupPerson} | Run ${runPerson}\n${row.start.toLocaleString()} -> ${row.end.toLocaleString()} | ${status}`,
          part: row.part,
          batch: row.batch,
          piece: row.piece,
          pieceKey,
          operationSeq: row.operationSeq,
          machine: normalizedMachine,
          status,
          runPerson,
          setupPerson,
        }
      })

      const nodeByKey = new Map(nodes.map(node => [node.key, node]))
      const grouped = new Map<string, PieceFlowRow[]>()
      renderFlowRows.forEach(row => {
        const key = `${row.part}|${row.batch}|${row.piece}`
        const existing = grouped.get(key) || []
        existing.push(row)
        grouped.set(key, existing)
      })

      grouped.forEach((rows, key) => {
        const sorted = [...rows].sort((a, b) => a.operationSeq - b.operationSeq)
        for (let i = 1; i < sorted.length; i++) {
          const prevNode = nodeByKey.get(
            `${sorted[i - 1].part}|${sorted[i - 1].batch}|${sorted[i - 1].piece}|${sorted[i - 1].operationSeq}|${normalizeMachineLane(sorted[i - 1].machine)}`
          )
          const currNode = nodeByKey.get(
            `${sorted[i].part}|${sorted[i].batch}|${sorted[i].piece}|${sorted[i].operationSeq}|${normalizeMachineLane(sorted[i].machine)}`
          )
          if (!prevNode || !currNode) continue
          const fromX = prevNode.x + prevNode.width
          const fromY = prevNode.y + prevNode.height / 2
          const toXValue = currNode.x
          const toY = currNode.y + currNode.height / 2
          const pieceOffset = (sorted[i].piece % 5) * 3 - 6
          const cx = (fromX + toXValue) / 2 + pieceOffset
          links.push({
            id: `${key}-trace-${i}`,
            d: `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${toY.toFixed(2)} L ${toXValue.toFixed(2)} ${toY.toFixed(2)}`,
            color: pieceStroke(sorted[i].piece),
            pieceKey: key,
          })
        }
      })
    }

    const operationLegend = Array.from(new Set(renderFlowRows.map(row => row.operationSeq))).sort(
      (a, b) => a - b
    )

    const spanHours = span / (60 * 60 * 1000)
    const stepHours = chooseTickStepHours(spanHours)
    const stepMs = stepHours * 60 * 60 * 1000
    let tickTs = alignLocalTickStartMs(minTs, stepHours)
    while (tickTs < minTs) {
      tickTs += stepMs
    }
    const tickValues: number[] = [minTs]
    while (tickTs < maxTs) {
      tickValues.push(tickTs)
      tickTs += stepMs
    }
    if (tickValues[tickValues.length - 1] !== maxTs) {
      tickValues.push(maxTs)
    }

    const timeTicks = Array.from(new Set(tickValues)).map(tickMs => {
      const ratio = (tickMs - minTs) / span
      const tickDate = new Date(tickMs)
      return {
        x: leftPad + trackWidth * ratio,
        dateLabel: tickDate.toLocaleDateString([], { month: 'short', day: '2-digit' }),
        timeLabel: tickDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    })

    const height = topPad + MACHINE_LANES.length * laneHeight + 84
    return {
      width,
      height,
      lanes,
      nodes,
      links,
      operationLegend,
      timeTicks,
      resolvedMode,
      isDense,
      timeline: { minTs, maxTs, leftPad, trackWidth },
    }
  }, [
    renderFlowRows,
    availableFlowParts,
    flowMapMode,
    flowMapZoom,
    selectedFlowKey,
    scheduleMetaByKey,
    traceLaneSpread,
    traceNodeScale,
    traceLabelEveryPiece,
  ])
  const hoveredPieceIdentity = hoveredNode?.node.pieceKey || null
  const activePieceIdentity = hoveredPieceIdentity || selectedPieceIdentity

  const effectiveLinkVisibility = React.useMemo<FlowLinkVisibility>(() => {
    if (flowMapMode === 'blocks') return 'all'
    if (flowLinkVisibility !== 'auto') return flowLinkVisibility
    if (!flowMapModel.isDense && flowMapModel.links.length <= 700) return 'all'
    if (activePieceIdentity) return 'selected'
    return 'none'
  }, [
    flowMapMode,
    flowLinkVisibility,
    flowMapModel.isDense,
    flowMapModel.links.length,
    activePieceIdentity,
  ])

  const visibleFlowLinks = React.useMemo(() => {
    if (effectiveLinkVisibility === 'all') return flowMapModel.links
    if (effectiveLinkVisibility === 'none') return [] as FlowLink[]
    if (effectiveLinkVisibility === 'selected') {
      if (activePieceIdentity) {
        return flowMapModel.links.filter(link => link.pieceKey === activePieceIdentity)
      }
      return flowMapModel.links.slice(0, FLOW_TRACE_LINK_PREVIEW_LIMIT)
    }
    return flowMapModel.links
  }, [effectiveLinkVisibility, flowMapModel.links, activePieceIdentity])

  useEffect(() => {
    if (!pendingFlowScrollKey) return
    const viewport = flowViewportRef.current
    if (!viewport) return
    const node = flowMapModel.nodes.find(candidate => candidate.key === pendingFlowScrollKey)
    if (!node) return
    viewport.scrollLeft = Math.max(0, node.x - viewport.clientWidth * 0.35)
    setPendingFlowScrollKey(null)
  }, [pendingFlowScrollKey, flowMapModel.nodes])

  const focusFlowLogOnMap = (log: PieceFlowLogRow) => {
    const marginMs = 6 * 60 * 60 * 1000
    if (
      !flowWindowStartDate ||
      !flowWindowEndDate ||
      log.runStart < flowWindowStartDate ||
      log.runEnd > flowWindowEndDate
    ) {
      setFlowWindowFromDates(
        new Date(log.runStart.getTime() - marginMs),
        new Date(log.runEnd.getTime() + marginMs)
      )
    }

    setPieceRange(prev => {
      if (log.piece >= prev.from && log.piece <= prev.to) return prev
      const from = Math.max(1, log.piece - 2)
      return { from, to: Math.max(from, log.piece + 2) }
    })
    setSelectedFlowKey(log.key)
    setFlowMapMode('trace')
    setPlaybackCursorMs(log.runStart.getTime())
    setIsPlaybackRunning(false)
    setPendingFlowScrollKey(log.key)
  }

  const personTimelineModel = React.useMemo(() => {
    if (!flowMapModel.timeline || !showPersonTimeline) {
      return {
        width: flowMapModel.width,
        height: 0,
        leftPad: 190,
        rightPad: 210,
        lanes: [] as Array<{ person: string; y: number }>,
        segments: [] as Array<{
          id: string
          x: number
          y: number
          width: number
          fill: string
          stroke: string
          label: string
          tooltip: string
        }>,
      }
    }

    const { minTs, maxTs, leftPad, trackWidth } = flowMapModel.timeline
    const span = Math.max(1, maxTs - minTs)
    const selectedOps = new Set(
      selectedPieceRows.map(row => `${row.part}|${row.batch}|${row.operationSeq}`)
    )
    const toX = (ts: number) => leftPad + ((ts - minTs) / span) * trackWidth
    const keySet = new Set(renderFlowRows.map(buildPieceRowKey))
    const relevantScheduleRows = results.filter((row: any) => keySet.has(buildScheduleRowKey(row)))
    const laneOrder = new Set<string>()
    const seeds: Array<{
      person: string
      type: 'setup' | 'run'
      machine: string
      part: string
      batch: string
      operationSeq: number
      startTs: number
      endTs: number
    }> = []

    const pushSegment = (
      personRaw: string,
      type: 'setup' | 'run',
      machineRaw: string,
      partRaw: string,
      batchRaw: string,
      operationSeqRaw: number,
      startRaw: any,
      endRaw: any
    ) => {
      const start = toDate(startRaw)
      const end = toDate(endRaw)
      if (!start || !end || end <= start) return
      const clipStart = Math.max(minTs, start.getTime())
      const clipEnd = Math.min(maxTs, end.getTime())
      if (clipEnd <= clipStart) return

      const person = String(personRaw || 'Unassigned').trim() || 'Unassigned'
      const machine = normalizeMachineLane(machineRaw || 'VMC 1')
      const part = String(partRaw || 'UNKNOWN')
      const batch = String(batchRaw || 'B')
      const operationSeq = Number(operationSeqRaw || 1)

      laneOrder.add(person)
      seeds.push({
        person,
        type,
        machine,
        part,
        batch,
        operationSeq,
        startTs: clipStart,
        endTs: clipEnd,
      })
    }

    relevantScheduleRows.forEach((row: any) => {
      const machine = normalizeMachineLane(row.machine || 'VMC 1')
      const part = String(row.partNumber || row.partnumber || row.part_number || 'UNKNOWN')
      const batch = String(row.batchId || row.batch_id || 'B')
      const op = Number(row.operationSeq || row.operation_seq || 1)
      pushSegment(
        String(row.setupPersonName || row.person || 'Unassigned'),
        'setup',
        machine,
        part,
        batch,
        op,
        row.setupStart || row.setup_start,
        row.setupEnd || row.setup_end
      )
      pushSegment(
        String(row.productionPersonName || row.person || 'Unassigned'),
        'run',
        machine,
        part,
        batch,
        op,
        row.runStart || row.run_start,
        row.runEnd || row.run_end
      )
    })

    const lanes = Array.from(laneOrder)
      .sort((a, b) => a.localeCompare(b))
      .map((person, index) => ({ person, y: 54 + index * 38 }))
    const laneY = new Map(lanes.map(lane => [lane.person, lane.y]))
    const segments = seeds.map((seed, index) => {
      const x = toX(seed.startTs)
      const width = Math.max(10, toX(seed.endTs) - x)
      const y = (laneY.get(seed.person) || 54) - 10
      const selectedKey = `${seed.part}|${seed.batch}|${seed.operationSeq}`
      const isSelected = selectedOps.has(selectedKey)
      const fill = seed.type === 'setup' ? '#f59e0b' : '#22c55e'
      return {
        id: `${seed.person}-${seed.type}-${seed.machine}-${seed.startTs}-${index}`,
        x,
        y,
        width,
        fill,
        stroke: isSelected ? '#e2e8f0' : '#0f172a',
        label: `${seed.type === 'setup' ? 'S' : 'R'} OP${seed.operationSeq}`,
        tooltip: `${seed.person} | ${seed.type.toUpperCase()} | ${seed.part} ${seed.batch} OP${seed.operationSeq} | ${seed.machine}\n${new Date(seed.startTs).toLocaleString()} -> ${new Date(seed.endTs).toLocaleString()}`,
      }
    })

    return {
      width: flowMapModel.width,
      height: lanes.length === 0 ? 0 : 54 + lanes.length * 38 + 28,
      leftPad,
      rightPad: flowMapModel.width - leftPad - trackWidth,
      lanes,
      segments,
    }
  }, [
    flowMapModel.timeline,
    flowMapModel.width,
    showPersonTimeline,
    renderFlowRows,
    results,
    selectedPieceRows,
  ])

  const playbackCursorX = React.useMemo(() => {
    if (!flowMapModel.timeline || playbackCursorMs === null) return null
    const { minTs, maxTs, leftPad, trackWidth } = flowMapModel.timeline
    const span = Math.max(1, maxTs - minTs)
    const clamped = Math.min(maxTs, Math.max(minTs, playbackCursorMs))
    return leftPad + ((clamped - minTs) / span) * trackWidth
  }, [flowMapModel.timeline, playbackCursorMs])

  const handlePlaybackReset = React.useCallback(() => {
    setIsPlaybackRunning(false)
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    if (flowMapModel.timeline) {
      setPlaybackCursorMs(flowMapModel.timeline.minTs)
    } else {
      setPlaybackCursorMs(null)
    }
  }, [flowMapModel.timeline])

  const handlePlaybackToggle = React.useCallback(() => {
    if (!flowMapModel.timeline) return
    if (isPlaybackRunning) {
      setIsPlaybackRunning(false)
      return
    }
    setPlaybackCursorMs(prev => prev ?? flowMapModel.timeline!.minTs)
    setIsPlaybackRunning(true)
  }, [flowMapModel.timeline, isPlaybackRunning])

  useEffect(() => {
    if (!isPlaybackRunning || !flowMapModel.timeline) return

    const { minTs, maxTs } = flowMapModel.timeline
    const stepMs = Math.max(1, playbackStepMinutes) * 60_000
    const delay = Math.max(0, playbackDelayMs)

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }

    playbackIntervalRef.current = setInterval(() => {
      setPlaybackCursorMs(prev => {
        const current = prev ?? minTs
        const next = current + stepMs
        if (next >= maxTs) {
          setIsPlaybackRunning(false)
          return maxTs
        }
        return next
      })
    }, delay)

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
        playbackIntervalRef.current = null
      }
    }
  }, [flowMapModel.timeline, isPlaybackRunning, playbackDelayMs, playbackStepMinutes])

  useEffect(() => {
    if (!flowMapModel.timeline) {
      setPlaybackCursorMs(null)
      setIsPlaybackRunning(false)
      return
    }
    const { minTs, maxTs } = flowMapModel.timeline
    setPlaybackCursorMs(prev => (prev === null ? minTs : Math.max(minTs, Math.min(maxTs, prev))))
  }, [flowMapModel.timeline])

  const cardSurfaceClass =
    'bg-white border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800'

  return (
    <div className="relative min-h-screen bg-neutral-100 pb-48 dark:bg-neutral-900">
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <HexagonBackground />
      </div>

      {/* Premium Header */}
      <header className="relative z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 md:hidden">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                </div>
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/Epsilologo.svg" alt="Epsilon Logo" className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    Production Scheduler
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    Advanced Manufacturing Scheduling System
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                ) : (
                  <Sun className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                )}
              </button>
              <div className="relative hidden sm:block">
                <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-bell w-4 h-4 text-slate-700 dark:text-slate-300"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-gray-200 dark:border-slate-800"
                >
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-user w-3.5 h-3.5 text-white"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <span className="text-sm font-medium hidden sm:inline text-slate-700 dark:text-slate-300">
                    {userEmail ? userEmail.split('@')[0] : 'mr1398463'}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-down w-3.5 h-3.5 text-slate-700 dark:text-slate-300"
                  >
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px] bg-white border border-gray-200 dark:bg-slate-900 dark:border-slate-800">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 text-gray-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100"
            >
              <CalendarIcon className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex items-center gap-2 text-gray-700 dark:text-slate-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-slate-100"
            >
              <Settings className="w-4 h-4" />
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className={cardSurfaceClass}>
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 dark:text-slate-100">
                  Order Management
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Add and manage production orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mandatory Fields */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                    Mandatory Fields
                  </h3>
                  {importedExcelMeta && (
                    <div className="mb-4">
                      <Badge
                        variant="outline"
                        className="border-cyan-200 bg-cyan-50 text-cyan-700 flex items-center w-fit gap-2"
                      >
                        Import Excel: {importedExcelMeta.fileName}
                        <button
                          onClick={handleRemoveImportedData}
                          className="hover:text-cyan-900 focus:outline-none"
                          title="Remove imported data"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Local imported database active ({importedExcelMeta.partCount} part numbers,{' '}
                        {importedExcelMeta.rowCount} rows, {importedExcelMeta.personnelCount}{' '}
                        personnel | Production {importedExcelMeta.productionTeamCount} | Setup{' '}
                        {importedExcelMeta.setupTeamCount}
                        {importedExcelMeta.personnelIssueCount > 0
                          ? ` | Warnings ${importedExcelMeta.personnelIssueCount}`
                          : ''}
                        ).
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 relative part-number-dropdown">
                      <Label htmlFor="partNumber">Part Number</Label>
                      <div className="relative">
                        <Input
                          id="partNumber"
                          value={partNumberSearch}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            handlePartNumberSearch(e.target.value)
                            handleInputChange('partNumber', e.target.value)
                          }}
                          onFocus={() => setShowPartNumberDropdown(true)}
                          placeholder="Search part numbers..."
                          className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        />
                        {loadingPartNumbers && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Part Number Dropdown */}
                      {showPartNumberDropdown && filteredPartNumbers.length > 0 && (
                        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
                          {filteredPartNumbers.map((part: PartNumber, index: number) => (
                            <div
                              key={`${part.partnumber}-${index}`}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 dark:hover:bg-slate-800 dark:border-slate-700"
                              onClick={() => handlePartNumberSelect(part)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-slate-100">
                                  {part.partnumber}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-slate-500">
                                  {part.operations.length} ops
                                </div>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {part.operations.slice(0, 3).map((op: string, opIndex: number) => (
                                  <Badge key={opIndex} variant="outline" className="text-xs">
                                    {op}
                                  </Badge>
                                ))}
                                {part.operations.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{part.operations.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 relative operation-sequence-dropdown">
                      <Label htmlFor="operationSeq">Operation Sequence</Label>
                      <div className="relative">
                        <Input
                          id="operationSeq"
                          value={formData.operationSeq}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOperationSequenceChange(e.target.value)
                          }
                          onClick={handleOperationSequenceClick}
                          placeholder={
                            availableOperations.length > 0
                              ? 'Click to select operations'
                              : 'Select a part number first'
                          }
                          className="border-gray-200 focus:border-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                          readOnly={availableOperations.length === 0}
                          autoComplete="off"
                        />
                        {availableOperations.length > 0 && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        )}
                        {selectedPartNumber && (
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              Auto-filled
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Operation Sequence Dropdown - Frappe UI Style */}
                      {showOperationDropdown && availableOperations.length > 0 && (
                        <div
                          className="absolute top-full left-0 right-0 z-40 mt-1 bg-gray-50 border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto dark:bg-slate-900 dark:border-slate-700"
                          onClick={handleDropdownClick}
                        >
                          <div className="p-2">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 px-2">
                              <div className="text-sm font-medium text-gray-700 dark:text-slate-200">
                                Select Operations
                              </div>
                              <button
                                onClick={() => setShowOperationDropdown(false)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                Done
                              </button>
                            </div>

                            {/* Operations List */}
                            <div className="space-y-1">
                              {filteredOperations.map((operation: string, index: number) => {
                                const operationNumber = operation.replace('OP', '')
                                const isSelected = formData.operationSeq
                                  .split(',')
                                  .map((op: string) => op.trim())
                                  .includes(operationNumber)

                                return (
                                  <div
                                    key={`${operation}-${index}`}
                                    className={`px-3 py-2 cursor-pointer rounded transition-colors ${isSelected ? 'bg-gray-200' : 'hover:bg-gray-100'
                                      }`}
                                    onClick={e => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleOperationSequenceSelect(operation)
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Simple Checkbox */}
                                      <div
                                        className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                            ? 'bg-gray-400 border-gray-400'
                                            : 'border-gray-300'
                                          }`}
                                      >
                                        {isSelected && (
                                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                                        )}
                                      </div>

                                      {/* Operation Info */}
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                          {operation}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                          Operation {operationNumber}
                                        </div>
                                      </div>

                                      {/* Operation Number */}
                                      <div className="text-xs text-gray-500 dark:text-slate-400">
                                        {operationNumber}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {filteredOperations.length === 0 && (
                              <div className="px-3 py-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                                No operations found
                              </div>
                            )}

                            {/* Footer with Select All */}
                            {filteredOperations.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                                <button
                                  onClick={() => {
                                    const allOperations = filteredOperations
                                      .map((op: string) => op.replace('OP', ''))
                                      .join(', ')
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      operationSeq: allOperations,
                                    }))
                                    setOperationSearch(allOperations)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                                >
                                  Select All
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {availableOperations.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Select a part number first to see available operations
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Urgent"
                            checked={formData.priority === 'Urgent'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleInputChange('priority', e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="text-red-600">🔴 Urgent</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="High"
                            checked={formData.priority === 'High'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleInputChange('priority', e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="text-orange-600">🟠 High</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Normal"
                            checked={formData.priority === 'Normal'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleInputChange('priority', e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="text-yellow-600">🟡 Normal</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="priority"
                            value="Low"
                            checked={formData.priority === 'Low'}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleInputChange('priority', e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="text-green-600">🟢 Low</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date (Optional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleInputChange('dueDate', e.target.value)
                        }
                        placeholder="mm/dd/yyyy"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orderQuantity">Order Quantity</Label>
                      <Input
                        id="orderQuantity"
                        type="number"
                        min="1"
                        value={formData.orderQuantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleInputChange('orderQuantity', parseInt(e.target.value))
                        }
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Batch Mode Switch</Label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('batchMode', 'single-batch')}
                          className={`px-3 py-1 rounded ${formData.batchMode === 'single-batch' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('batchMode', 'auto-split')}
                          className={`px-3 py-1 rounded ${formData.batchMode === 'auto-split' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          ⭕ Auto-Split
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('batchMode', 'custom-batch-size')}
                          className={`px-3 py-1 rounded ${formData.batchMode === 'custom-batch-size' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}
                        >
                          Custom
                        </button>
                      </div>
                      {formData.batchMode === 'custom-batch-size' && (
                        <div className="mt-2">
                          <Label htmlFor="customBatchSize">Custom Batch Size</Label>
                          <Input
                            id="customBatchSize"
                            type="number"
                            min="1"
                            value={formData.customBatchSize || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleInputChange(
                                'customBatchSize',
                                parseInt(e.target.value || '0', 10)
                              )
                            }
                            placeholder="Enter custom batch size"
                            className="border-gray-200 focus:border-blue-500 mt-1 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {canCreate && (
                    <Button onClick={handleAddOrder} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />➕ Add Order
                    </Button>
                  )}
                  <Button onClick={handleClearForm} variant="outline">
                    🗑️ Clear Form
                  </Button>
                  {(canRunBasic || canRunAdvanced) && (
                    <Button
                      onClick={() => {
                        const fallbackProfile = canRunAdvanced ? scheduleProfile : 'basic'
                        if (fallbackProfile !== scheduleProfile) {
                          setScheduleProfile(fallbackProfile)
                        }
                        void handleRunSchedule(fallbackProfile)
                      }}
                      disabled={isRunActionDisabled({
                        ordersCount: orders.length,
                        loading,
                        access: { canRunBasic, canRunAdvanced },
                      })}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Run Schedule
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className={cardSurfaceClass}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-slate-100">
                      📋 Saved Orders
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Manage your production orders
                    </CardDescription>
                  </div>
                  {canDelete && (
                    <Button onClick={handleClearAllOrders} variant="outline" size="sm">
                      All Clear ❌
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <p>No orders added yet</p>
                    <p className="text-sm">Add your first order above to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Part Number
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Operation Seq
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Order Quantity
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Priority
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Due Date
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Batch Mode
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Breakdown Machine
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Breakdown DateTime
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Start DateTime
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Holiday
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Setup Window
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order: Order) => (
                          <tr
                            key={order.id}
                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                          >
                            <td className="py-3 px-4 text-gray-900 dark:text-slate-100">
                              {order.partNumber}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {formatOperationSeqDisplay(order.operationSeq)}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.orderQuantity}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.dueDate || 'Not set'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.batchMode}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.breakdownMachine || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.breakdownDateTime || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.startDateTime || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.holiday || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {order.setupWindow || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Results */}
            {showResults && (
              <Card id="schedule-results" className={cardSurfaceClass}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl text-gray-900 dark:text-slate-100">
                      📊 Schedule Results
                    </CardTitle>
                    <Badge
                      className={
                        scheduleProfile === 'basic'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700 text-xs font-semibold'
                          : 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-700 text-xs font-semibold'
                      }
                    >
                      {scheduleProfile === 'basic'
                        ? '⚡ Basic — Run Only'
                        : '🔧 Advanced — Setup + Run'}
                    </Badge>
                  </div>
                  <CardDescription className="dark:text-slate-400">
                    Generated production schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Part Number
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Order Qty
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Priority
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Batch ID
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Batch Qty
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Operation Seq
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Operation Name
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Machine
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            {scheduleProfile === 'basic' ? 'Run Person' : 'Run/Setup Person'}
                          </th>
                          {scheduleProfile === 'advanced' && (
                            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                              Setup Start
                            </th>
                          )}
                          {scheduleProfile === 'advanced' && (
                            <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                              Setup End
                            </th>
                          )}
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Run Start
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Run End
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Timing
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Due Date
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result: any) => (
                          <tr
                            key={result.id}
                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                          >
                            <td className="py-3 px-4 text-gray-900 dark:text-slate-100">
                              {result.partNumber}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.orderQty}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={getPriorityColor(result.priority)}>
                                {result.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.batchId}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.batchQty}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.operationSeq}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.operationName}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.machine}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {scheduleProfile === 'basic' ? (
                                <div>
                                  {result.productionPersonName || result.person || 'Unassigned'}
                                </div>
                              ) : (
                                <div className="leading-tight">
                                  <div>
                                    Run:{' '}
                                    {result.productionPersonName || result.person || 'Unassigned'}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                                    Setup: {result.setupPersonName || result.person || 'Unassigned'}
                                  </div>
                                </div>
                              )}
                            </td>
                            {scheduleProfile === 'advanced' && (
                              <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                                {new Date(result.setupStart).toLocaleString()}
                              </td>
                            )}
                            {scheduleProfile === 'advanced' && (
                              <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                                {new Date(result.setupEnd).toLocaleString()}
                              </td>
                            )}
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {new Date(result.runStart).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {new Date(result.runEnd).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.timing}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {result.dueDate}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                                {result.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                    <Button onClick={handleShowChart} variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Chart
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowFlowMap(prev => !prev)}
                      className="border-cyan-400 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {showFlowMap ? 'Hide Piece Flow' : 'Open Piece Flow'}
                    </Button>
                    {canApprove && (
                      <Button
                        onClick={handlePublishSchedule}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Publish Schedule
                      </Button>
                    )}
                  </div>

                  {qualityReport && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            className={
                              qualityReport.status === 'GOOD'
                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800'
                                : qualityReport.status === 'WARNING'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
                            }
                          >
                            Quality: {qualityReport.status}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                            Score: {qualityReport.score}/100
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            Scope: {qualityScope === 'filtered' ? 'filtered view only' : 'all rows'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                          <span className="rounded border border-gray-300 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-950">
                            Feasibility {Math.round(qualityReport.kpi.feasibility)}%
                          </span>
                          <span className="rounded border border-gray-300 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-950">
                            Delivery {Math.round(qualityReport.kpi.delivery)}%
                          </span>
                          <span className="rounded border border-gray-300 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-950">
                            Utilization {Math.round(qualityReport.kpi.utilization)}%
                          </span>
                          <span className="rounded border border-gray-300 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-slate-950">
                            Flow {Math.round(qualityReport.kpi.flow)}%
                          </span>
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5',
                              engineQualityMetrics && engineQualityMetrics.machineUtilPct >= 70
                                ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200'
                                : engineQualityMetrics && engineQualityMetrics.machineUtilPct >= 50
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
                            )}
                            title="Machine actively running / total window from first to last run per machine"
                          >
                            Machine Util{' '}
                            {engineQualityMetrics
                              ? `${engineQualityMetrics.machineUtilPct.toFixed(1)}%`
                              : `${qualityReport.kpi.machineUtilizationPct.toFixed(1)}%`}
                          </span>
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5',
                              (engineQualityMetrics
                                ? engineQualityMetrics.personUtilPct
                                : qualityReport.kpi.personUtilizationPct) >= 75
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                                : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                            )}
                            title="Run-only person busy/window ratio (setup time excluded)"
                          >
                            Run Util{' '}
                            {engineQualityMetrics
                              ? `${engineQualityMetrics.personUtilPct.toFixed(1)}%`
                              : `${qualityReport.kpi.personUtilizationPct.toFixed(1)}%`}
                          </span>
                          <span className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
                            On-time {qualityReport.kpi.onTimePct.toFixed(1)}%
                          </span>
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5',
                              (engineQualityMetrics
                                ? engineQualityMetrics.avgQueueHours
                                : qualityReport.kpi.avgQueueGapHours) < 20
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                                : (engineQualityMetrics
                                  ? engineQualityMetrics.avgQueueHours
                                  : qualityReport.kpi.avgQueueGapHours) < 40
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
                            )}
                            title="Avg wait time between consecutive operations per batch"
                          >
                            Avg Queue{' '}
                            {engineQualityMetrics
                              ? `${engineQualityMetrics.avgQueueHours.toFixed(1)}h`
                              : `${qualityReport.kpi.avgQueueGapHours.toFixed(2)}h`}
                          </span>
                          {engineQualityMetrics && (
                            <span
                              className="rounded border border-violet-300 bg-violet-50 px-2 py-0.5 text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
                              title="Total schedule duration from first run start to last run end"
                            >
                              Span {engineQualityMetrics.totalSpanHours.toFixed(0)}h
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                          <span>
                            Profile:{' '}
                            {scheduleProfile === 'basic'
                              ? 'Basic (Run Only)'
                              : 'Advanced (Setup + Run)'}{' '}
                            | Setup {qualityReport.parameters.setupWindow} | Breakdowns{' '}
                            {qualityReport.parameters.breakdownCount} | Holidays{' '}
                            {qualityReport.parameters.holidayCount} | Ops{' '}
                            {qualityReport.parameters.operationRows} | Pieces{' '}
                            {qualityReport.parameters.pieceRows}
                          </span>
                          <span>
                            Conflicts: {qualityReport.summary.critical} critical,{' '}
                            {qualityReport.summary.warning} warning, {qualityReport.summary.info}{' '}
                            info | validation_failures={qualityReport.summary.validationFailures}
                          </span>
                        </div>
                      </div>
                      {qualityReport.issues.length > 0 ? (
                        <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-slate-300 max-h-40 overflow-y-auto">
                          {qualityReport.issues.slice(0, 12).map((issue, idx) => (
                            <div
                              key={`${issue.code}-${idx}`}
                              className={`cursor-pointer rounded p-1.5 transition-colors hover:bg-slate-800/80 ${playbackCursorMs !== null && issue.timeWindow?.start && new Date(issue.timeWindow.start).getTime() === playbackCursorMs ? 'ring-1 ring-cyan-500 bg-slate-800/50 text-cyan-100' : ''}`}
                              onClick={() => {
                                if (issue.timeWindow?.start) {
                                  setFlowMapMode('playback')
                                  setPlaybackCursorMs(new Date(issue.timeWindow.start).getTime())
                                  setIsPlaybackRunning(false)
                                }
                              }}
                            >
                              <span
                                className={`font-semibold ${issue.severity === 'critical' ? 'text-red-400' : issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}
                              >
                                {issue.severity === 'critical'
                                  ? '[Critical]'
                                  : issue.severity === 'warning'
                                    ? '[Warning]'
                                    : '[Info]'}{' '}
                              </span>
                              {issue.code}: {issue.message}
                            </div>
                          ))}
                          {qualityReport.issues.length > 12 && (
                            <p className="text-gray-500 dark:text-slate-400">
                              +{qualityReport.issues.length - 12} more issues...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-green-700 dark:text-green-300">
                          All checks passed: machine conflicts, operator conflicts, setup-window,
                          breakdown, holiday, routing, and quantity integrity checks.
                        </p>
                      )}
                    </div>
                  )}

                  {showFlowMap && (
                    <div className="mt-5 rounded-xl border border-cyan-200 bg-slate-950 p-4 shadow-inner dark:border-cyan-900">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold text-cyan-100">
                              Piece Flow Map
                            </h4>
                            {isApproximateView && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-yellow-700/50 bg-yellow-900/20 text-yellow-400"
                              >
                                Approximate View
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-cyan-200/80">
                            Switch modes to analyze your schedule geometry, piece links, or play
                            back event simulations.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex overflow-hidden rounded-md border border-cyan-700">
                            <button
                              type="button"
                              onClick={() => setFlowMapMode('blocks')}
                              className={`h-8 px-3 text-xs font-medium ${flowMapMode === 'blocks'
                                  ? 'bg-cyan-500/20 text-cyan-100'
                                  : 'bg-slate-900 text-cyan-300'
                                }`}
                            >
                              Stacked
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlowMapMode('trace')}
                              className={`h-8 px-3 text-xs font-medium ${flowMapMode === 'trace'
                                  ? 'bg-cyan-500/20 text-cyan-100'
                                  : 'bg-slate-900 text-cyan-300'
                                }`}
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlowMapMode('playback')}
                              className={`h-8 px-3 text-xs font-medium ${flowMapMode === 'playback'
                                  ? 'bg-cyan-500/20 text-cyan-100'
                                  : 'bg-slate-900 text-cyan-300'
                                }`}
                            >
                              Playback
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlowMapMode('logs')}
                              className={`h-8 px-3 text-xs font-medium ${flowMapMode === 'logs'
                                  ? 'bg-cyan-500/20 text-cyan-100'
                                  : 'bg-slate-900 text-cyan-300'
                                }`}
                            >
                              Logs
                            </button>
                          </div>
                          <select
                            value={flowPartFilter}
                            onChange={e => setFlowPartFilter(e.target.value)}
                            className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                          >
                            <option value="ALL">All Parts</option>
                            {availableFlowParts.map(part => (
                              <option key={part} value={part}>
                                {part}
                              </option>
                            ))}
                          </select>
                          <select
                            value={flowBatchFilter}
                            onChange={e => setFlowBatchFilter(e.target.value)}
                            className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                          >
                            <option value="ALL">All Batches</option>
                            {availableFlowBatches.map(batch => (
                              <option key={batch} value={batch}>
                                {batch}
                              </option>
                            ))}
                          </select>
                          <select
                            value={flowOpFilter}
                            onChange={e => setFlowOpFilter(e.target.value)}
                            className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                          >
                            <option value="ALL">All Ops</option>
                            {availableFlowOps.map(op => (
                              <option key={op} value={String(op)}>
                                OP{op}
                              </option>
                            ))}
                          </select>
                          <select
                            value={flowMachineFilter}
                            onChange={e => setFlowMachineFilter(e.target.value)}
                            className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                          >
                            <option value="ALL">All Machines</option>
                            {availableFlowMachines.map(machine => (
                              <option key={machine} value={machine}>
                                {machine}
                              </option>
                            ))}
                          </select>
                          <select
                            value={flowPersonFilter}
                            onChange={e => setFlowPersonFilter(e.target.value)}
                            className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                          >
                            <option value="ALL">All People</option>
                            {availableFlowPeople.map(person => (
                              <option key={person} value={person}>
                                {person}
                              </option>
                            ))}
                          </select>
                          {flowMapMode !== 'logs' && (
                            <>
                              <select
                                value={flowRenderProfile}
                                onChange={e =>
                                  setFlowRenderProfile(e.target.value as FlowRenderProfile)
                                }
                                className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                              >
                                <option value="quality">Profile: Quality (Always Full)</option>
                                <option value="balanced">Profile: Balanced</option>
                              </select>
                              <select
                                value={flowRenderPolicy}
                                onChange={e =>
                                  setFlowRenderPolicy(e.target.value as PieceRenderPolicy)
                                }
                                disabled={flowRenderProfile === 'quality'}
                                className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                              >
                                <option value="auto">Render: Auto</option>
                                <option value="slice">Render: Slice</option>
                                <option value="all">Render: All (Progressive)</option>
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleRenderAllPieces}
                                disabled={renderAllTotalRows === 0 || isRenderAllRunning}
                                className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                              >
                                Render All ({renderAllTotalRows.toLocaleString()})
                              </Button>
                              {isRenderAllRunning && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelRenderAll}
                                  className="h-8 border-amber-700 bg-amber-900/20 text-amber-200 hover:bg-amber-900/30"
                                >
                                  Cancel
                                </Button>
                              )}
                              <Input
                                type="number"
                                min={1}
                                value={pieceRange.from}
                                disabled={effectiveRenderPolicy === 'all'}
                                onChange={e =>
                                  setPieceRange(prev => ({
                                    ...prev,
                                    from: Math.max(1, Number(e.target.value) || 1),
                                  }))
                                }
                                className="h-8 w-20 border-cyan-700 bg-slate-900 text-cyan-100"
                              />
                              <Input
                                type="number"
                                min={pieceRange.from}
                                value={pieceRange.to}
                                disabled={effectiveRenderPolicy === 'all'}
                                onChange={e =>
                                  setPieceRange(prev => ({
                                    ...prev,
                                    to: Math.max(prev.from, Number(e.target.value) || prev.from),
                                  }))
                                }
                                className="h-8 w-20 border-cyan-700 bg-slate-900 text-cyan-100"
                              />
                              <div className="flex h-8 items-center gap-2 rounded-md border border-cyan-700 bg-slate-900 px-2">
                                <span className="text-[11px] text-cyan-300">Zoom</span>
                                <input
                                  type="range"
                                  min={0.6}
                                  max={2}
                                  step={0.1}
                                  value={flowMapZoom}
                                  onChange={e => setFlowMapZoom(Number(e.target.value))}
                                  className="w-20 accent-cyan-400"
                                />
                                <span className="text-[11px] text-cyan-200">
                                  {Math.round(flowMapZoom * 100)}%
                                </span>
                              </div>
                              <select
                                value={flowLinkVisibility}
                                onChange={e =>
                                  setFlowLinkVisibility(e.target.value as FlowLinkVisibility)
                                }
                                className="h-8 rounded-md border border-cyan-700 bg-slate-900 px-2 text-xs text-cyan-100"
                                title="Link visibility"
                              >
                                <option value="auto">Links: Auto</option>
                                <option value="selected">Links: Selected Piece</option>
                                <option value="all">Links: All</option>
                                <option value="none">Links: Hidden</option>
                              </select>
                              <label className="inline-flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-900 px-2 h-8 text-[11px] text-cyan-200">
                                <input
                                  type="checkbox"
                                  checked={flowFocusActivePiece}
                                  onChange={e => setFlowFocusActivePiece(e.target.checked)}
                                  className="accent-cyan-400"
                                />
                                Focus active piece
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-cyan-800 bg-slate-900/70 px-3 py-2">
                        <span className="text-xs font-semibold text-cyan-200">Time Window</span>
                        <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                          <span className="text-[11px] text-cyan-300">From</span>
                          <Input
                            type="datetime-local"
                            value={flowTimeWindow.start}
                            onChange={e =>
                              setFlowTimeWindow(prev => ({ ...prev, start: e.target.value }))
                            }
                            className="h-6 w-[180px] border-cyan-700 bg-slate-900 text-cyan-100"
                          />
                        </div>
                        <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                          <span className="text-[11px] text-cyan-300">To</span>
                          <Input
                            type="datetime-local"
                            value={flowTimeWindow.end}
                            onChange={e =>
                              setFlowTimeWindow(prev => ({ ...prev, end: e.target.value }))
                            }
                            className="h-6 w-[180px] border-cyan-700 bg-slate-900 text-cyan-100"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleFitFlowWindow}
                          disabled={!flowDataBounds}
                          className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                        >
                          Fit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleFlowWindowPreset(24)}
                          disabled={!flowDataBounds}
                          className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                        >
                          24h
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleFlowWindowPreset(72)}
                          disabled={!flowDataBounds}
                          className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                        >
                          72h
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleFlowWindowPreset(7 * 24)}
                          disabled={!flowDataBounds}
                          className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                        >
                          7d
                        </Button>
                        <label className="inline-flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8 text-[11px] text-cyan-200">
                          <input
                            type="checkbox"
                            checked={showPersonTimeline}
                            onChange={e => setShowPersonTimeline(e.target.checked)}
                            className="accent-cyan-400"
                          />
                          Show person timeline
                        </label>
                        {flowDataBounds && (
                          <span className="text-[11px] text-cyan-200/85">
                            Data:{' '}
                            {new Date(flowDataBounds.minTs).toLocaleString([], {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(flowDataBounds.maxTs).toLocaleString([], {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {hasFlowWindow && (
                          <span className="text-[11px] rounded border border-cyan-700/70 bg-slate-950 px-2 py-1 text-cyan-200">
                            Window {flowWindowHours.toFixed(1)}h
                          </span>
                        )}
                        {!hasFlowWindow && flowTimeWindow.start && flowTimeWindow.end && (
                          <span className="text-[11px] rounded border border-amber-700/60 bg-amber-900/20 px-2 py-1 text-amber-300">
                            Invalid time range
                          </span>
                        )}
                      </div>
                      {flowMapMode !== 'logs' && (
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-cyan-800 bg-slate-900/70 px-3 py-2">
                          <span className="text-xs font-semibold text-cyan-200">
                            Playback Controls
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handlePlaybackToggle}
                            className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            {isPlaybackRunning ? 'Pause' : 'Play'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handlePlaybackReset}
                            className="h-8 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                          >
                            Reset
                          </Button>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Delay (ms)</span>
                            <Input
                              type="number"
                              min={0}
                              max={2000}
                              value={playbackDelayMs}
                              onChange={e =>
                                setPlaybackDelayMs(
                                  Math.max(0, Math.min(2000, Number(e.target.value) || 0))
                                )
                              }
                              className="h-6 w-20 border-cyan-700 bg-slate-900 text-cyan-100"
                            />
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Step (min)</span>
                            <Input
                              type="number"
                              min={1}
                              max={120}
                              value={playbackStepMinutes}
                              onChange={e =>
                                setPlaybackStepMinutes(
                                  Math.max(1, Math.min(120, Number(e.target.value) || 1))
                                )
                              }
                              className="h-6 w-20 border-cyan-700 bg-slate-900 text-cyan-100"
                            />
                          </div>
                          <label className="inline-flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8 text-[11px] text-cyan-200">
                            <input
                              type="checkbox"
                              checked={verificationFilteredOnly}
                              onChange={e => setVerificationFilteredOnly(e.target.checked)}
                              className="accent-cyan-400"
                            />
                            Filtered-only scope
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => runQualityEvaluation(verificationFilteredOnly)}
                            className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Run Verification
                          </Button>
                        </div>
                      )}
                      {flowMapMode !== 'logs' && (
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-cyan-800/80 bg-slate-900/60 px-3 py-2">
                          <span className="text-xs font-semibold text-cyan-200">Clarity</span>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Node</span>
                            <input
                              type="range"
                              min={0.7}
                              max={1.6}
                              step={0.05}
                              value={traceNodeScale}
                              onChange={e => setTraceNodeScale(Number(e.target.value))}
                              className="w-20 accent-cyan-400"
                            />
                            <span className="text-[11px] text-cyan-100">{traceNodeScale.toFixed(2)}x</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Lane</span>
                            <input
                              type="range"
                              min={0.85}
                              max={1.8}
                              step={0.05}
                              value={traceLaneSpread}
                              onChange={e => setTraceLaneSpread(Number(e.target.value))}
                              className="w-20 accent-cyan-400"
                            />
                            <span className="text-[11px] text-cyan-100">{traceLaneSpread.toFixed(2)}x</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Label every</span>
                            <Input
                              type="number"
                              min={6}
                              max={160}
                              value={traceLabelEveryPiece}
                              onChange={e =>
                                setTraceLabelEveryPiece(
                                  Math.max(6, Math.min(160, Number(e.target.value) || 6))
                                )
                              }
                              className="h-6 w-16 border-cyan-700 bg-slate-900 text-cyan-100"
                            />
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Link width</span>
                            <input
                              type="range"
                              min={0.8}
                              max={2.8}
                              step={0.1}
                              value={traceLinkThickness}
                              onChange={e => setTraceLinkThickness(Number(e.target.value))}
                              className="w-20 accent-cyan-400"
                            />
                            <span className="text-[11px] text-cyan-100">{traceLinkThickness.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8">
                            <span className="text-[11px] text-cyan-300">Bg link</span>
                            <input
                              type="range"
                              min={0.04}
                              max={0.5}
                              step={0.01}
                              value={traceBackgroundLinkOpacity}
                              onChange={e => setTraceBackgroundLinkOpacity(Number(e.target.value))}
                              className="w-20 accent-cyan-400"
                            />
                            <span className="text-[11px] text-cyan-100">{traceBackgroundLinkOpacity.toFixed(2)}</span>
                          </div>
                          <label className="inline-flex items-center gap-2 rounded-md border border-cyan-700 bg-slate-950 px-2 h-8 text-[11px] text-cyan-200">
                            <input
                              type="checkbox"
                              checked={autoVerifyAfterRender}
                              onChange={e => setAutoVerifyAfterRender(e.target.checked)}
                              className="accent-cyan-400"
                            />
                            Auto-verify when render done
                          </label>
                        </div>
                      )}
                      {flowMapMode !== 'logs' && isRenderAllMode && (
                        <div className="mb-3 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span>
                                {flowRenderProgress.message || 'Preparing full piece render...'}
                              </span>
                              {Number.isFinite(flowRenderProgress.speedRowsPerSec) && (
                                <span className="text-cyan-200/90">
                                  {Math.round(flowRenderProgress.speedRowsPerSec || 0).toLocaleString()} rows/s
                                </span>
                              )}
                              {(flowRenderProgress.phase === 'prepare' ||
                                flowRenderProgress.phase === 'render') && (
                                  <span className="text-cyan-200/90">
                                    ETA {formatEta(flowRenderProgress.etaSeconds)}
                                  </span>
                                )}
                            </div>
                            <span className="text-cyan-200/90 font-semibold">
                              {flowRenderProgress.processed.toLocaleString()} /{' '}
                              {flowRenderProgress.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-cyan-950/80">
                            <div
                              className="h-full bg-cyan-400 transition-all"
                              style={{
                                width: `${flowRenderProgress.total > 0
                                    ? Math.min(
                                      100,
                                      Math.round(
                                        (flowRenderProgress.processed /
                                          flowRenderProgress.total) *
                                        100
                                      )
                                    )
                                    : 0
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {flowMapMode !== 'logs' && renderAllEstimatedMemoryMb >= 24 && (
                        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          Full render estimate: ~{renderAllEstimatedMemoryMb} MB for current filtered scope.
                          Quality profile will still render all rows.
                        </div>
                      )}
                      {flowMapMode === 'trace' && isAutoDenseSlice && (
                        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          Too dense for clean trace in Auto mode. Showing piece slice (
                          {pieceRange.from}-{pieceRange.to}). Click{' '}
                          <span className="font-semibold">Render All</span> to load the full
                          filtered piece set.
                        </p>
                      )}
                      {flowMapMode === 'trace' &&
                        effectiveRenderPolicy === 'slice' &&
                        flowRenderProgress.phase !== 'render' && (
                          <p className="mb-3 rounded-md border border-cyan-600/35 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">
                            Slice mode active: showing pieces {pieceRange.from}-{pieceRange.to}.
                          </p>
                        )}
                      {flowMapMode !== 'logs' && (
                        <p className="mb-3 rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-cyan-200/90">
                          {effectiveLinkVisibility === 'all'
                            ? `Showing all ${flowMapModel.links.length.toLocaleString()} piece links.`
                            : effectiveLinkVisibility === 'selected'
                              ? activePieceIdentity
                                ? `Showing links for active piece ${activePieceIdentity.split('|').join(' / ')}.`
                                : `Showing preview links (${Math.min(FLOW_TRACE_LINK_PREVIEW_LIMIT, flowMapModel.links.length)}). Hover or click a piece to focus links.`
                              : effectiveLinkVisibility === 'none'
                                ? 'Links hidden. Use "Links: Selected Piece" or "Links: All" for full path lines.'
                                : 'Auto link mode active.'}
                        </p>
                      )}

                      {flowMapMode === 'logs' ? (
                        <div className="rounded-lg border border-cyan-900/60 bg-[#070b12] p-2">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                            <div className="text-xs text-cyan-100">
                              Showing {filteredFlowLogs.length.toLocaleString()} /{' '}
                              {flowLogRows.length.toLocaleString()} logs
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-cyan-300">
                                Page {flowLogCurrentPage} / {flowLogPageCount}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setFlowLogPage(prev => Math.max(1, prev - 1))}
                                disabled={flowLogCurrentPage <= 1}
                                className="h-7 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                              >
                                Prev
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setFlowLogPage(prev => Math.min(flowLogPageCount, prev + 1))
                                }
                                disabled={flowLogCurrentPage >= flowLogPageCount}
                                className="h-7 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                          <div className="max-h-[560px] overflow-auto rounded border border-cyan-900/60">
                            <table className="w-full min-w-[2000px] text-xs text-cyan-100">
                              <thead className="sticky top-0 z-10 bg-slate-900">
                                <tr className="border-b border-cyan-900/70 text-cyan-300">
                                  <th className="px-2 py-2 text-left">Part</th>
                                  <th className="px-2 py-2 text-left">Batch</th>
                                  <th className="px-2 py-2 text-left">Piece</th>
                                  <th className="px-2 py-2 text-left">OP</th>
                                  <th className="px-2 py-2 text-left">Operation</th>
                                  <th className="px-2 py-2 text-left">Machine</th>
                                  {scheduleProfile === 'advanced' && (
                                    <th className="px-2 py-2 text-left">Setup Person</th>
                                  )}
                                  <th className="px-2 py-2 text-left">Run Person</th>
                                  {scheduleProfile === 'advanced' && (
                                    <th className="px-2 py-2 text-left">Setup Start</th>
                                  )}
                                  {scheduleProfile === 'advanced' && (
                                    <th className="px-2 py-2 text-left">Setup End</th>
                                  )}
                                  <th className="px-2 py-2 text-left">Run Start</th>
                                  <th className="px-2 py-2 text-left">Run End</th>
                                  <th className="px-2 py-2 text-left">Timing</th>
                                  <th className="px-2 py-2 text-left">Order Qty</th>
                                  <th className="px-2 py-2 text-left">Batch Qty</th>
                                  <th className="px-2 py-2 text-left">Priority</th>
                                  <th className="px-2 py-2 text-left">Due Date</th>
                                  <th className="px-2 py-2 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pagedFlowLogs.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={scheduleProfile === 'advanced' ? 18 : 15}
                                      className="px-2 py-8 text-center text-cyan-300/80"
                                    >
                                      No logs in the selected filter window.
                                    </td>
                                  </tr>
                                ) : (
                                  pagedFlowLogs.map(log => (
                                    <tr
                                      key={log.key}
                                      className={`cursor-pointer border-b border-cyan-900/30 hover:bg-cyan-900/20 ${selectedFlowKey === log.key ? 'bg-cyan-900/35' : ''
                                        }`}
                                      onClick={() => focusFlowLogOnMap(log)}
                                    >
                                      <td className="px-2 py-1.5">{log.partNumber}</td>
                                      <td className="px-2 py-1.5">{log.batchId}</td>
                                      <td className="px-2 py-1.5">{log.piece}</td>
                                      <td className="px-2 py-1.5">OP{log.operationSeq}</td>
                                      <td className="px-2 py-1.5">{log.operationName}</td>
                                      <td className="px-2 py-1.5">{log.machine}</td>
                                      {scheduleProfile === 'advanced' && (
                                        <td className="px-2 py-1.5">{log.setupPerson}</td>
                                      )}
                                      <td className="px-2 py-1.5">{log.runPerson}</td>
                                      {scheduleProfile === 'advanced' && (
                                        <td className="px-2 py-1.5">
                                          {log.setupStart.toLocaleString()}
                                        </td>
                                      )}
                                      {scheduleProfile === 'advanced' && (
                                        <td className="px-2 py-1.5">
                                          {log.setupEnd.toLocaleString()}
                                        </td>
                                      )}
                                      <td className="px-2 py-1.5">
                                        {log.runStart.toLocaleString()}
                                      </td>
                                      <td className="px-2 py-1.5">{log.runEnd.toLocaleString()}</td>
                                      <td className="px-2 py-1.5">{log.timing}</td>
                                      <td className="px-2 py-1.5">{log.orderQty || 'N/A'}</td>
                                      <td className="px-2 py-1.5">{log.batchQty || 'N/A'}</td>
                                      <td className="px-2 py-1.5">{log.priority}</td>
                                      <td className="px-2 py-1.5">{log.dueDate || 'N/A'}</td>
                                      <td className="px-2 py-1.5">{log.status}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : renderFlowRows.length === 0 ? (
                        <p className="text-sm text-cyan-100/80">
                          No piece-level rows for selected filter.
                        </p>
                      ) : (
                        <>
                          <div
                            ref={flowViewportRef}
                            className="overflow-x-auto rounded-lg border border-cyan-900/60 bg-[#070b12]"
                          >
                            <svg
                              width={flowMapModel.width}
                              height={flowMapModel.height}
                              className="min-w-[1400px]"
                            >
                              <defs>
                                <marker
                                  id="flowArrow"
                                  viewBox="0 0 10 10"
                                  refX="9"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto-start-reverse"
                                >
                                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#8fb7ff" />
                                </marker>
                              </defs>

                              {flowMapModel.timeTicks.map(tick => (
                                <g key={`tick-${tick.x}`}>
                                  <line
                                    x1={tick.x}
                                    x2={tick.x}
                                    y1={58}
                                    y2={flowMapModel.height - 32}
                                    stroke="#12253f"
                                    strokeWidth={1}
                                    strokeDasharray="3 5"
                                  />
                                  <text
                                    x={tick.x}
                                    y={24}
                                    fill="#88c4ff"
                                    fontSize={11}
                                    textAnchor="middle"
                                    fontWeight={700}
                                  >
                                    {tick.dateLabel}
                                  </text>
                                  <text
                                    x={tick.x}
                                    y={40}
                                    fill="#6ba6ff"
                                    fontSize={11}
                                    textAnchor="middle"
                                  >
                                    {tick.timeLabel}
                                  </text>
                                </g>
                              ))}
                              {playbackCursorX !== null && (
                                <g>
                                  <line
                                    x1={playbackCursorX}
                                    x2={playbackCursorX}
                                    y1={58}
                                    y2={flowMapModel.height - 32}
                                    stroke="#ffd166"
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                  />
                                  <text
                                    x={playbackCursorX}
                                    y={16}
                                    fill="#ffd166"
                                    fontSize={11}
                                    textAnchor="middle"
                                    fontWeight={700}
                                  >
                                    {playbackCursorMs
                                      ? new Date(playbackCursorMs).toLocaleString([], {
                                        month: 'short',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                      : ''}
                                  </text>
                                </g>
                              )}

                              {flowMapModel.lanes.map(lane => (
                                <g key={lane.machine}>
                                  <line
                                    x1={190}
                                    x2={flowMapModel.width - 180}
                                    y1={lane.y}
                                    y2={lane.y}
                                    stroke="#1f3658"
                                    strokeWidth={1}
                                  />
                                  <text
                                    x={20}
                                    y={lane.y + 6}
                                    fill="#9ec8ff"
                                    fontSize={15}
                                    fontWeight={600}
                                  >
                                    {lane.machine}
                                  </text>
                                </g>
                              ))}

                              {flowMapModel.operationLegend.map((op, index) => (
                                <text
                                  key={`legend-op-${op}`}
                                  x={flowMapModel.width - 145}
                                  y={86 + index * 24}
                                  fill="#9cff57"
                                  fontSize={14}
                                  fontWeight={700}
                                >
                                  OP{op}
                                </text>
                              ))}

                              {visibleFlowLinks.map(link => (
                                <path
                                  key={link.id}
                                  d={link.d}
                                  fill="none"
                                  stroke={link.color}
                                  strokeOpacity={
                                    flowMapMode === 'blocks'
                                      ? 0.82
                                      : activePieceIdentity && link.pieceKey !== activePieceIdentity
                                        ? traceBackgroundLinkOpacity
                                        : 0.88
                                  }
                                  strokeWidth={
                                    flowMapMode === 'blocks'
                                      ? 1.5
                                      : activePieceIdentity && link.pieceKey === activePieceIdentity
                                        ? traceLinkThickness + 0.9
                                        : traceLinkThickness
                                  }
                                  markerEnd="url(#flowArrow)"
                                />
                              ))}

                              {flowMapModel.nodes.map(node => {
                                const isActivePiece =
                                  Boolean(activePieceIdentity) &&
                                  node.pieceKey === activePieceIdentity
                                const playbackActive =
                                  playbackCursorMs !== null &&
                                  node.startTs <= playbackCursorMs &&
                                  node.endTs >= playbackCursorMs
                                const selected = selectedFlowKey === node.key
                                const playbackOpacity =
                                  playbackCursorMs === null || node.endTs <= playbackCursorMs
                                    ? 1
                                    : node.startTs <= playbackCursorMs
                                      ? 1
                                      : 0.24
                                const focusOpacity =
                                  flowFocusActivePiece &&
                                    flowMapMode !== 'blocks' &&
                                    Boolean(activePieceIdentity) &&
                                    !isActivePiece
                                    ? 0.2
                                    : 1
                                const nodeOpacity = Math.max(0.12, playbackOpacity * focusOpacity)
                                const stroke = playbackActive
                                  ? '#fef08a'
                                  : selected
                                    ? '#f8fafc'
                                    : isActivePiece
                                      ? '#dbeafe'
                                      : node.stroke
                                const strokeWidth = playbackActive
                                  ? 2.8
                                  : selected || isActivePiece
                                    ? 2.4
                                    : node.stroke === '#ecfeff'
                                      ? 2
                                      : 1.1
                                const labelOpacity =
                                  playbackCursorMs === null || node.endTs <= playbackCursorMs
                                    ? 1
                                    : node.startTs <= playbackCursorMs
                                      ? 1
                                      : 0.45

                                return (
                                  <g key={node.id}>
                                    <title>{node.tooltip}</title>
                                    <rect
                                      x={node.x}
                                      y={node.y}
                                      width={node.width}
                                      height={node.height}
                                      rx={6}
                                      fill={node.fill}
                                      stroke={stroke}
                                      strokeWidth={strokeWidth}
                                      opacity={nodeOpacity}
                                    />
                                    <rect
                                      x={node.x}
                                      y={node.y}
                                      width={node.width}
                                      height={node.height}
                                      rx={6}
                                      fill="transparent"
                                      cursor="crosshair"
                                      onClick={() => {
                                        if (node.key.split('|').length >= 5) {
                                          setSelectedFlowKey(node.key)
                                        }
                                      }}
                                      onMouseEnter={e =>
                                        setHoveredNode({ node, x: e.clientX, y: e.clientY })
                                      }
                                      onMouseMove={e =>
                                        setHoveredNode(prev =>
                                          prev ? { ...prev, x: e.clientX, y: e.clientY } : null
                                        )
                                      }
                                      onMouseLeave={() => setHoveredNode(null)}
                                    />
                                    {node.showLabel && (
                                      <text
                                        x={node.x + 7}
                                        y={node.y + node.height - 7}
                                        fill="#04111d"
                                        fontSize={11}
                                        fontWeight={700}
                                        opacity={labelOpacity}
                                      >
                                        {node.width > 180 ? node.label : node.shortLabel}
                                      </text>
                                    )}
                                  </g>
                                )
                              })}
                            </svg>
                          </div>
                          {hoveredNode && hoveredNode.node && (
                            <div
                              className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-md border border-cyan-800 bg-slate-900/95 p-3 text-xs shadow-xl backdrop-blur-sm shadow-black/50"
                              style={getTooltipPosition(hoveredNode.x, hoveredNode.y)}
                            >
                              <div className="font-bold text-cyan-100 leading-tight">
                                {hoveredNode.node.part} {hoveredNode.node.batch}
                                {typeof hoveredNode.node.piece === 'number'
                                  ? ` | Piece ${hoveredNode.node.piece}`
                                  : ''}{' '}
                                | OP{hoveredNode.node.operationSeq}
                              </div>
                              <div className="text-cyan-300/90">
                                <span className="inline-block w-14 text-slate-500">Machine:</span>
                                {hoveredNode.node.machine}
                              </div>
                              {hoveredNode.node.setupPerson && (
                                <div className="text-cyan-300/90">
                                  <span className="inline-block w-14 text-slate-500">Setup:</span>
                                  {hoveredNode.node.setupPerson}
                                </div>
                              )}
                              {hoveredNode.node.runPerson && (
                                <div className="text-cyan-300/90">
                                  <span className="inline-block w-14 text-slate-500">Run:</span>
                                  {hoveredNode.node.runPerson}
                                </div>
                              )}
                              <div className="text-cyan-300/80">
                                <span className="inline-block w-14 text-slate-500">Start:</span>
                                {new Date(hoveredNode.node.startTs).toLocaleString()}
                              </div>
                              <div className="text-cyan-300/80">
                                <span className="inline-block w-14 text-slate-500">End:</span>
                                {new Date(hoveredNode.node.endTs).toLocaleString()}
                              </div>
                              <div className="text-cyan-300/80">
                                <span className="inline-block w-14 text-slate-500">Duration:</span>
                                {formatDurationShort(
                                  minutesBetween(
                                    new Date(hoveredNode.node.startTs),
                                    new Date(hoveredNode.node.endTs)
                                  )
                                )}
                              </div>
                              {hoveredNode.node.status && (
                                <div className="text-cyan-300/80">
                                  <span className="inline-block w-14 text-slate-500">Status:</span>
                                  {hoveredNode.node.status}
                                </div>
                              )}
                              <div className="mt-1 border-t border-cyan-800/50 pt-1 text-[10px] text-slate-400 whitespace-pre-wrap">
                                {hoveredNode.node.tooltip}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 rounded-lg border border-cyan-800/70 bg-slate-900/60 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <h5 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                                Selected Piece Inspector
                              </h5>
                              <div className="flex flex-wrap items-center gap-2">
                                {selectedPieceDetails.length > 0 && (
                                  <span className="text-[11px] text-cyan-100">
                                    {selectedPieceDetails[0].row.part}{' '}
                                    {selectedPieceDetails[0].row.batch} | Piece{' '}
                                    {selectedPieceDetails[0].row.piece}
                                  </span>
                                )}
                                <span className="text-[11px] text-cyan-300/90">
                                  {pieceIdentityAnchors.orderedIdentities.length.toLocaleString()} pieces
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStepPieceFocus(-1)}
                                  disabled={pieceIdentityAnchors.orderedIdentities.length === 0}
                                  className="h-7 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                                >
                                  Prev Piece
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStepPieceFocus(1)}
                                  disabled={pieceIdentityAnchors.orderedIdentities.length === 0}
                                  className="h-7 border-cyan-700 bg-slate-950 text-cyan-100 hover:bg-cyan-950/40"
                                >
                                  Next Piece
                                </Button>
                              </div>
                            </div>
                            {selectedPieceDetails.length === 0 ? (
                              <p className="text-xs text-cyan-100/80">
                                Click a piece node in Trace/Playback mode to inspect OP chain,
                                people, and queue reasons.
                              </p>
                            ) : (
                              <>
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-cyan-200">
                                  <span className="rounded border border-cyan-700 bg-slate-950 px-2 py-1">
                                    Active {formatDurationShort(selectedPieceSummary.activeMinutes)}
                                  </span>
                                  <span className="rounded border border-amber-700/70 bg-amber-900/20 px-2 py-1 text-amber-200">
                                    Queue {formatDurationShort(selectedPieceSummary.queueMinutes)}
                                  </span>
                                  <span className="rounded border border-emerald-700/70 bg-emerald-900/20 px-2 py-1 text-emerald-200">
                                    Flow {selectedPieceSummary.flowEfficiencyPct.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {selectedPieceDetails.map(detail => {
                                    const setupStart =
                                      toDate(detail.scheduleMeta?.setupStart) || detail.row.start
                                    const setupEnd =
                                      toDate(detail.scheduleMeta?.setupEnd) || detail.row.start
                                    const runStart =
                                      toDate(detail.scheduleMeta?.runStart) || detail.row.start
                                    const runEnd =
                                      toDate(detail.scheduleMeta?.runEnd) || detail.row.end
                                    return (
                                      <div
                                        key={detail.row.id}
                                        className="rounded border border-cyan-900/70 bg-[#07121f] px-3 py-2"
                                      >
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cyan-100">
                                          <span className="font-semibold">
                                            OP{detail.row.operationSeq}
                                          </span>
                                          <span>{detail.row.machine}</span>
                                          <span>
                                            Setup:{' '}
                                            {detail.scheduleMeta?.setupPerson || 'Unassigned'} (
                                            {setupStart.toLocaleString()} -{' '}
                                            {setupEnd.toLocaleString()})
                                          </span>
                                          <span>
                                            Run: {detail.scheduleMeta?.runPerson || 'Unassigned'} (
                                            {runStart.toLocaleString()} - {runEnd.toLocaleString()})
                                          </span>
                                        </div>
                                        {detail.gapMinutes > 0 && (
                                          <div className="mt-1 text-[11px] text-amber-300">
                                            Gap before this OP:{' '}
                                            {formatDurationShort(detail.gapMinutes)} (
                                            {detail.gapReason})
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            )}
                          </div>

                          {showPersonTimeline && (
                            <div className="mt-3 rounded-lg border border-cyan-800/70 bg-slate-900/60 p-3">
                              <div className="mb-2 flex flex-wrap items-center gap-3">
                                <h5 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                                  Person Timeline (Setup + Run)
                                </h5>
                                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-100">
                                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                                  Setup
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-100">
                                  <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
                                  Run
                                </span>
                                <span className="text-[11px] text-cyan-300/80">
                                  Uses the same time axis as the piece flow map.
                                </span>
                              </div>
                              {personTimelineModel.height === 0 ? (
                                <p className="text-xs text-cyan-100/80">
                                  No person assignments in current filter and time window.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-cyan-900/60 bg-[#070b12]">
                                  <svg
                                    width={personTimelineModel.width}
                                    height={personTimelineModel.height}
                                    className="min-w-[1400px]"
                                  >
                                    {personTimelineModel.lanes.map(lane => (
                                      <g key={`person-lane-${lane.person}`}>
                                        <line
                                          x1={personTimelineModel.leftPad}
                                          x2={
                                            personTimelineModel.width - personTimelineModel.rightPad
                                          }
                                          y1={lane.y}
                                          y2={lane.y}
                                          stroke="#14324f"
                                          strokeWidth={1}
                                        />
                                        <text
                                          x={16}
                                          y={lane.y + 4}
                                          fill="#9ec8ff"
                                          fontSize={12}
                                          fontWeight={600}
                                        >
                                          {lane.person}
                                        </text>
                                      </g>
                                    ))}
                                    {personTimelineModel.segments.map(segment => (
                                      <g key={segment.id}>
                                        <title>{segment.tooltip}</title>
                                        <rect
                                          x={segment.x}
                                          y={segment.y}
                                          width={segment.width}
                                          height={20}
                                          rx={4}
                                          fill={segment.fill}
                                          stroke={segment.stroke}
                                          strokeWidth={1.2}
                                          opacity={0.92}
                                        />
                                        {segment.width > 54 && (
                                          <text
                                            x={segment.x + 6}
                                            y={segment.y + 14}
                                            fill="#04111d"
                                            fontSize={10}
                                            fontWeight={700}
                                          >
                                            {segment.label}
                                          </text>
                                        )}
                                      </g>
                                    ))}
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-6">
            {/* Global Advanced Settings */}
            <Card className={cardSurfaceClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-slate-100">
                      ⚙️ Global Advanced Settings
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Configure global scheduling parameters
                    </CardDescription>
                  </div>
                  <button
                    onClick={handleToggleSettingsLock}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${settingsLocked
                        ? 'bg-transparent border-gray-400 text-gray-600 hover:border-gray-500 dark:border-slate-500 dark:text-slate-300 dark:hover:border-slate-300'
                        : 'bg-transparent border-gray-300 text-gray-500 hover:border-gray-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500'
                      }`}
                    title={
                      settingsLocked
                        ? 'Click to unlock and edit settings'
                        : 'Click to lock and save settings'
                    }
                    disabled={lockLoading}
                  >
                    {settingsLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="globalStartDateTime">
                        Global Start Date & Time (Master Clock)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="globalStartDateTime"
                          type="datetime-local"
                          value={advancedSettings.globalStartDateTime}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setAdvancedSettings((prev: any) => ({
                              ...prev,
                              globalStartDateTime: e.target.value,
                            }))
                          }
                          placeholder="mm/dd/yyyy, --:-- --"
                          className="border-gray-200 focus:border-blue-500 flex-1 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                          disabled={settingsLocked}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = new Date()
                            setAdvancedSettings((prev: any) => ({
                              ...prev,
                              globalStartDateTime: toLocalDateTimeInput(now),
                            }))
                          }}
                          className="whitespace-nowrap"
                          disabled={settingsLocked}
                        >
                          Now
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Sets the master clock for when scheduling begins. Leave empty to use current
                        date and time automatically.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="globalSetupWindow">
                        Global Setup Window (People-Dependent)
                      </Label>
                      <Input
                        id="globalSetupWindow"
                        value={advancedSettings.globalSetupWindow}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({
                            ...prev,
                            globalSetupWindow: e.target.value,
                          }))
                        }
                        placeholder="06:00-22:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Format: HH:MM-HH:MM. Auto-filled from Shift 1 and Shift 2 below (earliest
                        start to latest end). You can still override manually.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift1">Shift 1 (Controls Global Setup Window)</Label>
                      <Input
                        id="shift1"
                        value={advancedSettings.shift1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({ ...prev, shift1: e.target.value }))
                        }
                        placeholder="06:00-14:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shift2">Shift 2 (Controls Global Setup Window)</Label>
                      <Input
                        id="shift2"
                        value={advancedSettings.shift2}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({ ...prev, shift2: e.target.value }))
                        }
                        placeholder="14:00-22:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                    Production Window (Machine-Dependent)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prodShift1">Shift 1 (Morning)</Label>
                      <Input
                        id="prodShift1"
                        value={advancedSettings.productionWindowShift1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({
                            ...prev,
                            productionWindowShift1: e.target.value,
                          }))
                        }
                        placeholder="06:00-14:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodShift2">Shift 2 (Afternoon)</Label>
                      <Input
                        id="prodShift2"
                        value={advancedSettings.productionWindowShift2}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({
                            ...prev,
                            productionWindowShift2: e.target.value,
                          }))
                        }
                        placeholder="14:00-22:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prodShift3">Shift 3 (Night)</Label>
                      <Input
                        id="prodShift3"
                        value={advancedSettings.productionWindowShift3}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setAdvancedSettings((prev: any) => ({
                            ...prev,
                            productionWindowShift3: e.target.value,
                          }))
                        }
                        placeholder="22:00-06:00"
                        className="border-gray-200 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                        disabled={settingsLocked}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Holiday Calendar and Machine Breakdowns - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Holiday Calendar - Left Side */}
              <div className="space-y-4 h-full">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-1 rounded-lg">
                  <HolidayCalendar
                    holidays={holidays}
                    onAddHoliday={handleAddHoliday}
                    onDeleteHoliday={handleDeleteHoliday}
                    disabled={settingsLocked}
                  />
                </div>
              </div>

              {/* Machine Breakdowns - Right Side */}
              <div className="space-y-4 h-full">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-1 rounded-lg">
                  <Card className={`${cardSurfaceClass} h-full`}>
                    <CardHeader>
                      <CardTitle className="text-xl text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Machine Breakdowns (Downtime Control)
                      </CardTitle>
                      <CardDescription className="dark:text-slate-400">
                        Manage machine downtime and maintenance schedules
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            Select Machines
                          </Label>
                          <div className="grid grid-cols-5 gap-1">
                            {Array.from({ length: 10 }, (_, i) => (
                              <label
                                key={i}
                                className="flex items-center space-x-1 p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={breakdownForm.selectedMachines.includes(`VMC ${i + 1}`)}
                                  onChange={() => handleMachineToggle(`VMC ${i + 1}`)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  disabled={settingsLocked}
                                />
                                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                                  VMC {i + 1}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Date & Time Range Picker - Same as Holiday Calendar */}
                        <div className="space-y-4">
                          <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            Select Breakdown Period
                          </Label>

                          <DateTimePicker
                            dateRange={breakdownDateRange}
                            onDateRangeChange={setBreakdownDateRange}
                            startTime={breakdownStartTime}
                            onStartTimeChange={setBreakdownStartTime}
                            endTime={breakdownEndTime}
                            onEndTimeChange={setBreakdownEndTime}
                            placeholder="Pick start and end dates with times"
                            disabled={settingsLocked}
                            onSelect={() => {
                              // Optional: You can add any logic here when user clicks Select
                              console.log('Breakdown date/time selected:', {
                                breakdownDateRange,
                                breakdownStartTime,
                                breakdownEndTime,
                              })
                            }}
                          />

                          <div className="space-y-2">
                            <Label
                              htmlFor="breakdownReason"
                              className="text-sm font-medium text-gray-700 dark:text-slate-300"
                            >
                              Reason (Optional)
                            </Label>
                            <Input
                              id="breakdownReason"
                              value={breakdownForm.reason}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setBreakdownForm((prev: any) => ({
                                  ...prev,
                                  reason: e.target.value,
                                }))
                              }
                              placeholder="e.g., Maintenance, Repair"
                              className="border-gray-200 focus:border-orange-500 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-400"
                              disabled={settingsLocked}
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleAddBreakdown}
                        className="bg-orange-600 hover:bg-orange-700"
                        disabled={settingsLocked}
                      >
                        🔧 Add Breakdown
                      </Button>

                      {/* Saved Breakdowns */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Saved Machine Breakdowns
                          <Badge variant="secondary" className="ml-2">
                            {breakdowns.length} breakdowns
                          </Badge>
                        </h3>

                        {breakdowns.length === 0 ? (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center dark:border-slate-700">
                            <Settings className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-slate-400 text-lg font-medium mb-2">
                              No breakdowns added yet
                            </p>
                            <p className="text-gray-400 dark:text-slate-500 text-sm">
                              Add machine breakdown periods to schedule maintenance downtime
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {breakdowns.map((breakdown: Breakdown) => (
                              <div
                                key={breakdown.id}
                                className="border border-gray-200 rounded-lg p-4 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/40"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {new Date(breakdown.startDateTime).toLocaleDateString()}
                                      </Badge>
                                      <span className="text-gray-400 dark:text-slate-500">to</span>
                                      <Badge variant="outline" className="text-xs">
                                        {new Date(breakdown.endDateTime).toLocaleDateString()}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">
                                      {new Date(breakdown.startDateTime).toLocaleTimeString()} -{' '}
                                      {new Date(breakdown.endDateTime).toLocaleTimeString()}
                                    </p>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                        {breakdown.reason}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {breakdown.machines.map((machine, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {machine}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteBreakdown(breakdown.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                                    disabled={settingsLocked}
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Save/Load Settings */}
            <Card className={cardSurfaceClass}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveSettings}
                    disabled={lockLoading}
                  >
                    💾 Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleLoadSettings} disabled={lockLoading}>
                    📂 Load Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Bar */}
      <ActionDock
        resultsAvailable={results.length > 0}
        canGenerate={!isRunActionDisabled({
          ordersCount: orders.length,
          loading,
          access: { canRunBasic, canRunAdvanced },
        })}
        canRunBasic={canRunBasic}
        canRunAdvanced={canRunAdvanced}
        onDashboard={handleShowDashboard}
        onImportExcel={handleImportExcel}
        onGenerate={(mode) => {
          if (mode === 'basic' && !canRunBasic) return
          if (mode === 'advanced' && !canRunAdvanced) return
          setScheduleProfile(mode)
          void handleRunSchedule(mode)
        }}
        onExportExcel={handleExportExcel}
        onChart={handleShowChart}
        onClear={handleClearSession}
      />
    </div>
  )
}
