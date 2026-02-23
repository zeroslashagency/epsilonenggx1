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
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { verifyPieceFlow } from '../../lib/features/scheduling/piece-flow-verifier'

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

const normalizeMachineLane = (value: unknown): string => {
  const raw = String(value || '').trim()
  if (!raw) return 'VMC 1'
  const compact = raw.toUpperCase().replace(/\s+/g, '')
  const match = compact.match(/^VMC0*(\d{1,2})$/)
  if (match) {
    return `VMC ${Number(match[1])}`
  }
  return raw
}

const buildPieceFlowRows = (
  scheduleRows: any[],
  pieceTimelineRows: PieceTimelinePayloadRow[] = []
): { rows: PieceFlowRow[], isApproximate: boolean } => {
  if (pieceTimelineRows.length > 0) {
    const rows = pieceTimelineRows
      .map((row: PieceTimelinePayloadRow, rowIndex: number) => {
        const part = String(row.partNumber || row.part || 'UNKNOWN')
        const batch = String(row.batchId || row.batch || `B-${rowIndex + 1}`)
        const piece = Number(row.piece || 0)
        const operationSeq = Number(row.operationSeq || row.operation || 1)
        const machine = normalizeMachineLane(row.machine || 'VMC 1')
        const start = toDate(row.runStart || row.start)
        const end = toDate(row.runEnd || row.end)

        if (!start || !end || end <= start) return null
        if (!Number.isFinite(piece) || piece <= 0) return null
        if (!Number.isFinite(operationSeq) || operationSeq <= 0) return null

        return {
          id: `${part}-${batch}-op${operationSeq}-p${piece}`,
          part,
          batch,
          piece,
          operationSeq,
          machine,
          start,
          end,
          status: String(row.status || 'OK'),
        } satisfies PieceFlowRow
      })
      .filter((row): row is PieceFlowRow => Boolean(row))

    return { rows, isApproximate: false }
  }

  const rows: PieceFlowRow[] = []

  scheduleRows.forEach((row: any, rowIndex: number) => {
    const part = String(row.partNumber || row.partnumber || row.part_number || 'UNKNOWN')
    const batch = String(row.batchId || row.batch_id || `B-${rowIndex + 1}`)
    const operationSeq = Number(row.operationSeq || row.operation_seq || 1)
    const machine = normalizeMachineLane(row.machine || 'VMC 1')
    const runStart = toDate(row.runStart || row.run_start)
    const runEnd = toDate(row.runEnd || row.run_end)
    const qtyRaw = Number(row.batchQty || row.batch_qty || row.orderQty || row.order_quantity || 1)
    const qty = Math.max(1, Number.isFinite(qtyRaw) ? Math.round(qtyRaw) : 1)

    if (!runStart || !runEnd || runEnd <= runStart) return

    const totalMs = runEnd.getTime() - runStart.getTime()
    const eachMs = Math.max(60_000, Math.floor(totalMs / qty))

    for (let piece = 1; piece <= qty; piece++) {
      const pieceStart = new Date(runStart.getTime() + eachMs * (piece - 1))
      const tentativeEnd = new Date(runStart.getTime() + eachMs * piece)
      const pieceEnd = piece === qty ? runEnd : tentativeEnd

      rows.push({
        id: `${part}-${batch}-op${operationSeq}-p${piece}`,
        part,
        batch,
        piece,
        operationSeq,
        machine,
        start: pieceStart,
        end: pieceEnd,
        status: String(row.status || 'OK'),
      })
    }
  })

  return { rows, isApproximate: true }
}

const evaluateScheduleQuality = (
  scheduleRows: any[],
  setupWindow: string,
  breakdowns: Breakdown[],
  pieceRows: PieceFlowRow[],
  holidays: Holiday[],
  pieceTimeline: any[] = []
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

    if (setupEnd <= setupStart || runEnd <= runStart) {
      addIssue({
        code: 'negative_duration',
        rule: 'Duration Validity',
        severity: 'critical',
        message: `${ref} has non-positive setup/run duration.`,
        entityRefs: [ref],
        timeWindow: { start: setupStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
      return
    }

    if (setupEnd > runStart) {
      addIssue({
        code: 'machine_setup_run_overlap',
        rule: 'Setup vs Run',
        severity: 'critical',
        message: `${ref} setup overlaps run window.`,
        entityRefs: [ref],
        timeWindow: { start: setupStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
    }

    if (!isWithinWindow(setupStart, setupWindow) || !isWithinWindow(setupEnd, setupWindow)) {
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
      addIssue({
        code: 'due_date_missed',
        rule: 'Due Date',
        severity: 'warning',
        message: `${ref} ends ${runEnd.toLocaleString()} after due ${dueDate.toLocaleString()}.`,
        entityRefs: [ref],
        timeWindow: { start: runStart.toLocaleString(), end: runEnd.toLocaleString() },
      })
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

  const score = Math.max(0, 100 - criticalCount * 12 - warningCount * 4 - infoCount)
  const status: QualityReport['status'] =
    criticalCount > 0 ? 'BAD' : warningCount > 0 ? 'WARNING' : 'GOOD'

  return {
    status,
    score,
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
  const [qualityScope, setQualityScope] = useState<'all' | 'filtered'>('all')
  const [flowPartFilter, setFlowPartFilter] = useState('ALL')
  const [pieceRange, setPieceRange] = useState({ from: 1, to: 20 })
  const [flowMapMode, setFlowMapMode] = useState<'blocks' | 'trace' | 'playback'>('trace')
  const [hoveredNode, setHoveredNode] = useState<{ node: any; x: number; y: number } | null>(null)
  const [flowMapZoom, setFlowMapZoom] = useState(1)
  const [verificationFilteredOnly, setVerificationFilteredOnly] = useState(false)
  const [playbackDelayMs, setPlaybackDelayMs] = useState(150)
  const [playbackStepMinutes, setPlaybackStepMinutes] = useState(5)
  const [playbackCursorMs, setPlaybackCursorMs] = useState<number | null>(null)
  const [isPlaybackRunning, setIsPlaybackRunning] = useState(false)
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Load saved advanced settings on mount
  useEffect(() => {
    let isMounted = true

    const loadSavedSettings = async () => {
      try {
        const response = await apiClient('/api/save-advanced-settings', {
          method: 'GET',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (isMounted && result.success && result.data) {
            const savedData = result.data.machine_data
            // Load lock state from saved data
            setSettingsLocked(savedData.is_locked || false)

            // Load advanced settings
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

            // Load holidays and breakdowns
            if (savedData.holidays) {
              setHolidays(savedData.holidays)
            }
            if (savedData.breakdowns) {
              setBreakdowns(savedData.breakdowns)
            }
          }
        }
      } catch (error) { }
    }

    if (userEmail) {
      loadSavedSettings()
    }

    return () => {
      isMounted = false
    }
  }, [userEmail])

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
      setPlaybackCursorMs(null)
      setIsPlaybackRunning(false)
      return
    }

    const { rows: flowRows, isApproximate } = buildPieceFlowRows(results, pieceTimelinePayload)
    const maxPiece = flowRows.reduce((max, row) => Math.max(max, row.piece), 1)

    setPieceFlowRows(flowRows)
    setIsApproximateView(isApproximate)
    setQualityReport(
      evaluateScheduleQuality(
        results,
        advancedSettings.globalSetupWindow,
        breakdowns,
        flowRows,
        holidays
      )
    )
    setQualityScope('all')
    setFlowPartFilter('ALL')
    setPieceRange({ from: 1, to: Math.min(20, maxPiece) })
    setFlowMapMode('trace')
    setFlowMapZoom(1)
    setPlaybackCursorMs(null)
    setIsPlaybackRunning(false)
  }, [
    results,
    pieceTimelinePayload,
    showResults,
    advancedSettings.globalSetupWindow,
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
    if (
      !breakdownForm.selectedMachines.length ||
      !breakdownDateRange?.from ||
      !breakdownDateRange?.to ||
      !breakdownStartTime ||
      !breakdownEndTime
    ) {
      alert('Please select machines, date range, and time range')
      return
    }

    // Combine date and time
    const startDateTime = `${format(breakdownDateRange.from, 'yyyy-MM-dd')}T${breakdownStartTime}`
    const endDateTime = `${format(breakdownDateRange.to, 'yyyy-MM-dd')}T${breakdownEndTime}`

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

  // Handle lock/unlock settings to Supabase
  const handleToggleSettingsLock = async () => {
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
        const settingsData = {
          user_email: userEmail,
          global_start_datetime: advancedSettings.globalStartDateTime,
          global_setup_window: advancedSettings.globalSetupWindow,
          shift_1: advancedSettings.shift1,
          shift_2: advancedSettings.shift2,
          production_shift_1: advancedSettings.productionWindowShift1,
          production_shift_2: advancedSettings.productionWindowShift2,
          production_shift_3: advancedSettings.productionWindowShift3,
          holidays: holidays,
          breakdowns: breakdowns,
          is_locked: true, // Lock state
          locked_at: new Date().toISOString(),
          role: 'operator',
        }

        const response = await apiClient('/api/save-advanced-settings', {
          method: 'POST',
          headers: {
            'X-User-Email': userEmail || 'default@user.com',
          },
          body: JSON.stringify(settingsData),
        })

        if (response.ok) {
          setSettingsLocked(true)
        } else {
          throw new Error('Failed to lock settings')
        }
      }
    } catch (error) {
      alert('Failed to toggle settings lock. Please try again.')
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

  const normalizeScheduleResponse = (payload: any): {
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

  const handleRunSchedule = async () => {
    if (orders.length === 0) return

    if (!backendService) {
      alert('Scheduling engine is still initializing. Please wait a moment and try again.')
      return
    }

    setLoading(true)
    setShowResults(false)

    try {
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
        const operationDetails = resolveImportedOperationDetails(order.partNumber, order.operationSeq)
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
      })

      const normalizedResponse = normalizeScheduleResponse(scheduleResponse)
      setResults(normalizedResponse.rows)
      setPieceTimelinePayload(normalizedResponse.pieceTimeline)
      setShowResults(true)
      setShowFlowMap(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduling error'
      setResults([])
      setPieceTimelinePayload([])
      setShowResults(false)
      setShowFlowMap(false)
      alert(`Scheduling failed: ${message}`)
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
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filePath = `${session.user.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

          // Fire and forget upload to not block the UI
          supabase.storage
            .from('scheduler-imports')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
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

          const partMap = importedCatalogMap.get(partNumber) || new Map<number, ImportedOperationDetail>()
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
        alert(`Failed to import Excel file: ${(error as Error).message}`)
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
          qualityReport,
          generatedAt: new Date(),
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

  const filteredFlowRows = React.useMemo(() => {
    return pieceFlowRows.filter(row => {
      const partMatch = flowPartFilter === 'ALL' || row.part === flowPartFilter
      const pieceMatch = row.piece >= pieceRange.from && row.piece <= pieceRange.to
      return partMatch && pieceMatch
    })
  }, [pieceFlowRows, flowPartFilter, pieceRange])

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

  const runQualityEvaluation = (filteredOnly: boolean) => {
    if (!showResults || results.length === 0) return

    let scheduleRows = results
    let pieceRowsForValidation = pieceFlowRows

    if (filteredOnly) {
      const keySet = new Set(filteredFlowRows.map(buildPieceRowKey))
      scheduleRows = results.filter((row: any) => keySet.has(buildScheduleRowKey(row)))
      pieceRowsForValidation = filteredFlowRows
    }

    const report = evaluateScheduleQuality(
      scheduleRows,
      advancedSettings.globalSetupWindow,
      breakdowns,
      pieceRowsForValidation,
      holidays
    )
    setQualityReport(report)
    setQualityScope(filteredOnly ? 'filtered' : 'all')
  }

  const flowMapModel = React.useMemo(() => {
    const leftPad = 190
    const rightPad = 210
    const laneHeight = 64
    const topPad = 88
    const lanes = MACHINE_LANES.map((machine, index) => ({
      machine,
      y: topPad + index * laneHeight,
    }))
    const machineY = new Map(lanes.map(lane => [lane.machine, lane.y]))

    const emptyState = {
      width: 1700,
      height: topPad + MACHINE_LANES.length * laneHeight + 84,
      lanes,
      nodes: [] as Array<{
        id: string
        key: string
        x: number
        y: number
        width: number
        startTs: number
        endTs: number
        label: string
        shortLabel: string
        fill: string
        stroke: string
        showLabel: boolean
        tooltip: string
      }>,
      links: [] as Array<{ id: string; d: string; color: string }>,
      operationLegend: [] as number[],
      timeTicks: [] as Array<{ x: number; label: string }>,
      resolvedMode: flowMapMode,
      isDense: false,
      timeline: null as null | { minTs: number; maxTs: number; leftPad: number; trackWidth: number },
    }

    if (filteredFlowRows.length === 0) {
      return emptyState
    }

    const minTs = Math.min(...filteredFlowRows.map(row => row.start.getTime()))
    const maxTs = Math.max(...filteredFlowRows.map(row => row.end.getTime()))
    const span = Math.max(1, maxTs - minTs)
    const denseThreshold = 420
    const isDense = filteredFlowRows.length > denseThreshold
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

    let nodes: Array<{
      id: string
      key: string
      x: number
      y: number
      width: number
      startTs: number
      endTs: number
      label: string
      shortLabel: string
      fill: string
      stroke: string
      showLabel: boolean
      tooltip: string
    }> = []
    const links: Array<{ id: string; d: string; color: string }> = []

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

      filteredFlowRows.forEach(row => {
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
        const laneOffset = ((opIndex % 6) - 2.5) * 6
        const y = (machineY.get(group.machine) ?? topPad + MACHINE_LANES.length * laneHeight) - 15 + laneOffset
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
          startTs: group.start,
          endTs: group.end,
          label: `${group.part} | OP${group.operationSeq} | ${pieceLabel}`,
          shortLabel: `OP${group.operationSeq} · ${group.pieceCount}p`,
          fill: opShade(group.part, group.operationSeq),
          stroke: '#72e4ff',
          showLabel: widthPx >= 70,
          tooltip: `${group.part} ${group.batch} | OP${group.operationSeq} | ${group.machine}\nPieces ${pieceLabel} (${group.pieceCount})\n${new Date(group.start).toLocaleString()} -> ${new Date(group.end).toLocaleString()}`,
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
        const sorted = [...rows].sort((a, b) => a.operationSeq - b.operationSeq || a.start - b.start)
        for (let i = 1; i < sorted.length; i++) {
          const prevNode = nodeById.get(sorted[i - 1].id)
          const currNode = nodeById.get(sorted[i].id)
          if (!prevNode || !currNode) continue
          const fromX = prevNode.x + prevNode.width
          const fromY = prevNode.y + 14
          const toXValue = currNode.x
          const toY = currNode.y + 14
          const cx = (fromX + toXValue) / 2
          links.push({
            id: `${key}-blocks-${i}`,
            d: `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${toY.toFixed(2)} L ${toXValue.toFixed(2)} ${toY.toFixed(2)}`,
            color: opShade(sorted[i].part, sorted[i].operationSeq),
          })
        }
      })
    } else {
      const laneSlotCounts = new Map<string, number>()
      const bucketSpanMs = Math.max(3 * 60_000, Math.floor(span / 260))
      const stackDepth = 5
      const sortedRows = [...filteredFlowRows].sort(
        (a, b) => a.start.getTime() - b.start.getTime() || a.operationSeq - b.operationSeq || a.piece - b.piece
      )

      nodes = sortedRows.map(row => {
        const startMs = row.start.getTime()
        const endMs = row.end.getTime()
        const startX = toX(startMs)
        const endX = toX(endMs)
        const widthPx = Math.max(10, endX - startX)
        const bucket = Math.floor((startMs - minTs) / bucketSpanMs)
        const slotKey = `${row.machine}|${bucket}`
        const slot = laneSlotCounts.get(slotKey) || 0
        laneSlotCounts.set(slotKey, slot + 1)
        const offset = (slot % stackDepth) * 6 - ((stackDepth - 1) * 3)
        const y = (machineY.get(row.machine) ?? topPad + MACHINE_LANES.length * laneHeight) - 15 + offset
        const showLabel = widthPx >= 46 && (row.piece <= 12 || row.piece % 25 === 0)
        return {
          id: row.id,
          key: `${row.part}|${row.batch}|${row.piece}|${row.operationSeq}`,
          x: startX,
          y,
          width: widthPx,
          startTs: startMs,
          endTs: endMs,
          label:
            widthPx > 140
              ? `${row.part} | P${row.piece} | OP${row.operationSeq}`
              : `P${row.piece}-OP${row.operationSeq}`,
          shortLabel: `P${row.piece}`,
          fill: opShade(row.part, row.operationSeq),
          stroke: row.piece === 1 ? '#ecfeff' : pieceStroke(row.piece),
          showLabel,
          tooltip: `${row.part} ${row.batch} | Piece ${row.piece} | OP${row.operationSeq} | ${row.machine}\n${row.start.toLocaleString()} -> ${row.end.toLocaleString()}`,
        }
      })

      const nodeByKey = new Map(nodes.map(node => [node.key, node]))
      const grouped = new Map<string, PieceFlowRow[]>()
      filteredFlowRows.forEach(row => {
        const key = `${row.part}|${row.batch}|${row.piece}`
        const existing = grouped.get(key) || []
        existing.push(row)
        grouped.set(key, existing)
      })

      grouped.forEach((rows, key) => {
        const sorted = [...rows].sort((a, b) => a.operationSeq - b.operationSeq)
        for (let i = 1; i < sorted.length; i++) {
          const prevNode = nodeByKey.get(
            `${sorted[i - 1].part}|${sorted[i - 1].batch}|${sorted[i - 1].piece}|${sorted[i - 1].operationSeq}`
          )
          const currNode = nodeByKey.get(
            `${sorted[i].part}|${sorted[i].batch}|${sorted[i].piece}|${sorted[i].operationSeq}`
          )
          if (!prevNode || !currNode) continue
          const fromX = prevNode.x + prevNode.width
          const fromY = prevNode.y + 14
          const toXValue = currNode.x
          const toY = currNode.y + 14
          const pieceOffset = (sorted[i].piece % 5) * 3 - 6
          const cx = (fromX + toXValue) / 2 + pieceOffset
          const cy = (fromY + toY) / 2 + pieceOffset
          links.push({
            id: `${key}-trace-${i}`,
            d: `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${fromY.toFixed(2)} L ${cx.toFixed(2)} ${toY.toFixed(2)} L ${toXValue.toFixed(2)} ${toY.toFixed(2)}`,
            color: pieceStroke(sorted[i].piece),
          })
        }
      })
    }

    const operationLegend = Array.from(new Set(filteredFlowRows.map(row => row.operationSeq))).sort(
      (a, b) => a - b
    )

    const tickCount = 8
    const timeTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
      const ratio = index / tickCount
      const tickMs = minTs + span * ratio
      const tickDate = new Date(tickMs)
      return {
        x: leftPad + trackWidth * ratio,
        label: tickDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  }, [filteredFlowRows, availableFlowParts, flowMapMode, flowMapZoom])

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
    setPlaybackCursorMs(prev =>
      prev === null ? minTs : Math.max(minTs, Math.min(maxTs, prev))
    )
  }, [flowMapModel.timeline])

  const cardSurfaceClass =
    'bg-white border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-800'

  return (
    <div className="min-h-screen bg-gray-50 pb-48 dark:bg-slate-950">
      {/* Premium Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
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
                  {userEmail && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Welcome, {userEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                System Online
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                <img src="/Epsilologo.svg" alt="Epsilon Logo" className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
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
                      <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700 flex items-center w-fit gap-2">
                        Import Excel: {importedExcelMeta.fileName}
                        <button onClick={handleRemoveImportedData} className="hover:text-cyan-900 focus:outline-none" title="Remove imported data">
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
                  {canEdit && (
                    <Button
                      onClick={handleRunSchedule}
                      disabled={orders.length === 0 || loading}
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
                  <CardTitle className="text-xl text-gray-900 dark:text-slate-100">
                    📊 Schedule Results
                  </CardTitle>
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
                            Run/Setup Person
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Setup Start
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-slate-100">
                            Setup End
                          </th>
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
                              <div className="leading-tight">
                                <div>Run: {result.productionPersonName || result.person || 'Unassigned'}</div>
                                <div className="text-[11px] text-gray-500 dark:text-slate-400">
                                  Setup: {result.setupPersonName || result.person || 'Unassigned'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {new Date(result.setupStart).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-slate-300">
                              {new Date(result.setupEnd).toLocaleString()}
                            </td>
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
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                          Score: {qualityReport.score}/100
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          Params: Setup {qualityReport.parameters.setupWindow} | Breakdowns{' '}
                          {qualityReport.parameters.breakdownCount} | Holidays{' '}
                          {qualityReport.parameters.holidayCount} | Ops{' '}
                          {qualityReport.parameters.operationRows} | Pieces{' '}
                          {qualityReport.parameters.pieceRows}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          Conflicts: {qualityReport.summary.critical} critical,{' '}
                          {qualityReport.summary.warning} warning, {qualityReport.summary.info} info |{' '}
                          validation_failures={qualityReport.summary.validationFailures}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          Scope: {qualityScope === 'filtered' ? 'filtered view only' : 'all rows'}
                        </span>
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
                              <span className={`font-semibold ${issue.severity === 'critical' ? 'text-red-400' : issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>
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
                            <h4 className="text-base font-semibold text-cyan-100">Piece Flow Map</h4>
                            {isApproximateView && (
                              <Badge variant="outline" className="text-[10px] border-yellow-700/50 bg-yellow-900/20 text-yellow-400">
                                Approximate View
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-cyan-200/80">
                            Switch modes to analyze your schedule geometry, piece links, or play back event simulations.
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
                              Blocks
                            </button>
                            <button
                              type="button"
                              onClick={() => setFlowMapMode('trace')}
                              className={`h-8 px-3 text-xs font-medium ${flowMapMode === 'trace'
                                ? 'bg-cyan-500/20 text-cyan-100'
                                : 'bg-slate-900 text-cyan-300'
                                }`}
                            >
                              Trace
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
                          <Input
                            type="number"
                            min={1}
                            value={pieceRange.from}
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
                            <span className="text-[11px] text-cyan-200">{Math.round(flowMapZoom * 100)}%</span>
                          </div>
                        </div>
                      </div>
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
                      {flowMapMode === 'trace' && flowMapModel.isDense && (
                        <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          Too dense to render every piece clearly. Showing the selected piece slice (
                          {pieceRange.from}-{pieceRange.to}). Narrow part/piece filters or reduce range
                          for clean one-by-one tracing.
                        </p>
                      )}

                      {filteredFlowRows.length === 0 ? (
                        <p className="text-sm text-cyan-100/80">
                          No piece-level rows for selected filter.
                        </p>
                      ) : (
                        <>
                          <div className="overflow-x-auto rounded-lg border border-cyan-900/60 bg-[#070b12]">
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
                                    y1={44}
                                    y2={flowMapModel.height - 32}
                                    stroke="#12253f"
                                    strokeWidth={1}
                                    strokeDasharray="3 5"
                                  />
                                  <text
                                    x={tick.x}
                                    y={30}
                                    fill="#6ba6ff"
                                    fontSize={11}
                                    textAnchor="middle"
                                  >
                                    {tick.label}
                                  </text>
                                </g>
                              ))}
                              {playbackCursorX !== null && (
                                <g>
                                  <line
                                    x1={playbackCursorX}
                                    x2={playbackCursorX}
                                    y1={44}
                                    y2={flowMapModel.height - 32}
                                    stroke="#ffd166"
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                  />
                                  <text
                                    x={playbackCursorX}
                                    y={18}
                                    fill="#ffd166"
                                    fontSize={11}
                                    textAnchor="middle"
                                    fontWeight={700}
                                  >
                                    {playbackCursorMs
                                      ? new Date(playbackCursorMs).toLocaleTimeString([], {
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

                              {flowMapModel.links.map(link => (
                                <path
                                  key={link.id}
                                  d={link.d}
                                  fill="none"
                                  stroke={link.color}
                                  strokeOpacity={0.9}
                                  strokeWidth={1.4}
                                  markerEnd="url(#flowArrow)"
                                />
                              ))}

                              {flowMapModel.nodes.map(node => (
                                <g key={node.id}>
                                  <title>{node.tooltip}</title>
                                  <rect
                                    x={node.x}
                                    y={node.y}
                                    width={node.width}
                                    height={28}
                                    rx={6}
                                    fill={node.fill}
                                    stroke={
                                      playbackCursorMs !== null &&
                                        node.startTs <= playbackCursorMs &&
                                        node.endTs >= playbackCursorMs
                                        ? '#fef08a'
                                        : node.stroke
                                    }
                                    strokeWidth={
                                      playbackCursorMs !== null &&
                                        node.startTs <= playbackCursorMs &&
                                        node.endTs >= playbackCursorMs
                                        ? 2.8
                                        : node.stroke === '#ecfeff'
                                          ? 2.3
                                          : 1.2
                                    }
                                    opacity={
                                      playbackCursorMs === null || node.endTs <= playbackCursorMs
                                        ? 1
                                        : node.startTs <= playbackCursorMs
                                          ? 1
                                          : 0.25
                                    }
                                  />
                                  <rect
                                    x={node.x}
                                    y={node.y}
                                    width={node.width}
                                    height={28}
                                    rx={6}
                                    fill="transparent"
                                    cursor="crosshair"
                                    onMouseEnter={(e) => setHoveredNode({ node, x: e.clientX, y: e.clientY })}
                                    onMouseMove={(e) => setHoveredNode(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                  />
                                  {node.showLabel && (
                                    <text
                                      x={node.x + 7}
                                      y={node.y + 18}
                                      fill="#04111d"
                                      fontSize={11}
                                      fontWeight={700}
                                      opacity={
                                        playbackCursorMs === null || node.endTs <= playbackCursorMs
                                          ? 1
                                          : node.startTs <= playbackCursorMs
                                            ? 1
                                            : 0.45
                                      }
                                    >
                                      {node.width > 180 ? node.label : node.shortLabel}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </svg>
                          </div>
                          {hoveredNode && hoveredNode.node && (
                            <div
                              className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-md border border-cyan-800 bg-slate-900/95 p-3 text-xs shadow-xl backdrop-blur-sm shadow-black/50"
                              style={{
                                top: hoveredNode.y + 15,
                                left: hoveredNode.x + 15
                              }}
                            >
                              <div className="font-bold text-cyan-100">{hoveredNode.node.label || hoveredNode.node.shortLabel}</div>
                              <div className="text-cyan-300/80">
                                <span className="inline-block w-12 text-slate-500">Start:</span>
                                {new Date(hoveredNode.node.startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              <div className="text-cyan-300/80">
                                <span className="inline-block w-12 text-slate-500">End:</span>
                                {new Date(hoveredNode.node.endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                              <div className="mt-1 border-t border-cyan-800/50 pt-1 text-[10px] text-slate-400 whitespace-pre-wrap">
                                {hoveredNode.node.tooltip.split('\n')[0]}
                              </div>
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
                            // Use actual current time, not forced to 6:00 AM
                            setAdvancedSettings((prev: any) => ({
                              ...prev,
                              globalStartDateTime: now.toISOString().slice(0, 16),
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
                  <Button className="bg-blue-600 hover:bg-blue-700">💾 Save Settings</Button>
                  <Button variant="outline">📂 Load Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 px-4">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 dark:bg-slate-900/95 dark:border-slate-700 rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3">
            {/* Dashboard Button */}
            <Button
              onClick={handleShowDashboard}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Dashboard"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {/* Import Excel Button */}
            <Button
              onClick={handleImportExcel}
              className="bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Import Excel"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import Excel
            </Button>

            {/* Schedule Generate Button */}
            <Button
              onClick={handleRunSchedule}
              disabled={orders.length === 0 || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-full px-6 py-2 relative overflow-hidden transition-all duration-200 hover:scale-105"
              title="Schedule Generate"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Schedule Generate</span>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </Button>

            {/* Export Excel Button */}
            <Button
              onClick={handleExportExcel}
              disabled={results.length === 0}
              className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600 rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              title={results.length === 0 ? 'Export Excel (No results available)' : 'Export Excel'}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export Excel
            </Button>

            {/* Chart Button */}
            <Button
              onClick={handleShowChart}
              className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Chart"
            >
              <PieChart className="w-4 h-4 mr-2" />
              Chart
            </Button>

            {/* Clear Session Button */}
            <Button
              onClick={handleClearSession}
              className="bg-red-600 hover:bg-red-700 text-white border-red-500 rounded-full px-4 py-2 transition-all duration-200 hover:scale-105"
              title="Clear Session"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div >
  )
}
