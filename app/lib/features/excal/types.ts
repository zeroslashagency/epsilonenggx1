export type FilterMode = 'GOOD_ONLY' | 'GOOD_WARNING' | 'ALL'

export type Classification = 'GOOD' | 'WARNING' | 'BAD' | 'UNKNOWN'

export type UnknownKind = 'BREAK_CONTEXT' | 'NON_PRODUCTION_EVENT' | null

export interface RawDeviceLog {
  id?: unknown
  log_id?: unknown
  log_time?: unknown
  timestamp?: unknown
  action?: unknown
  message?: unknown
  wo_id?: unknown
  device_id?: unknown
  uid?: unknown
  job_type?: unknown
  target_duration?: unknown
  pcl?: unknown
  part_no?: unknown
  operator?: unknown
  reason?: unknown
  ok_qty?: unknown
  alloted_qty?: unknown
  reject_qty?: unknown
  time_saved?: unknown
  [key: string]: unknown
}

export interface WorkOrderDetails {
  id: number
  wo_no?: string | null
  wo_id?: number | null
  part_no?: string | null
  operator?: string | null
  device_name?: string | null
  device_id?: number | null
  job_type?: number | null
  target_duration?: number | null
  pcl?: number | null
  alloted_qty?: number | null
  ok_qty?: number | null
  reject_qty?: number | null
  comments?: string | null
  [key: string]: unknown
}

export interface NormalizedLog {
  logId: number
  dedupeKey: string
  action: string
  logTimeIso: string
  logTimeMs: number
  woId: number | null
  deviceId: number | null
  operator: string | null
  partNo: string | null
  reason: string | null
  jobType: number | null
  rawTargetDuration: number | null
  targetDuration: number | null
  pcl: number | null
  okQty: number | null
  allotedQty: number | null
  rejectQty: number | null
  timeSaved: number | null
  raw: RawDeviceLog
}

export interface WorkOrderSegment {
  segmentId: string
  woId: number | null
  logs: NormalizedLog[]
  woStart: NormalizedLog | null
  woStop: NormalizedLog | null
  woDetails: WorkOrderDetails | null
}

export interface SpindleCycle {
  cycleId: string
  segmentId: string
  woId: number | null
  spindleOn: NormalizedLog
  spindleOff: NormalizedLog
  durationSec: number
  gapFromPreviousSec: number | null
  deviceId: number | null
  operator: string | null
  partNo: string | null
  jobType: number | null
  targetDuration: number | null
  pcl: number | null
  okQty: number | null
  allotedQty: number | null
  rejectQty: number | null
  timeSaved: number | null
}

export interface PauseBlock {
  pauseId: string
  segmentId: string
  start: NormalizedLog
  end: NormalizedLog
  durationSec: number
  reason: string | null
}

export interface JobBlock {
  jobId: string
  segmentId: string
  label: string
  cycles: SpindleCycle[]
  totalSec: number
  targetSec: number | null
  varianceSec: number | null
  groupId: string
}

export interface ExcalRow {
  rowId: string
  segmentId: string
  timestampMs: number
  logTimeIso: string
  action: string
  summary: string
  notes: string
  isComputed: boolean
  isBanner: boolean
  jobTag: string
  groupId: string | null
  isGroupStart: boolean
  isGroupEnd: boolean
  isLoadingSeparator: boolean
  woId: number | null
  woCode: string | null
  deviceId: number | null
  deviceName: string
  partNo: string | null
  operator: string | null
  jobType: number | null
  jobTypeLabel: string
  durationSec: number | null
  rawTargetDurationSec: number | null
  targetDurationSec: number | null
  pclSec: number | null
  idealSec: number | null
  varianceSec: number | null
  classification: Classification
  classificationReason: string
  unknownKind: UnknownKind
  okQty: number | null
  allotedQty: number | null
  rejectQty: number | null
  timeSaved: number | null
  computedTimeSavedDelta: number | null
  sNo: number | null
  rawAction: string | null
}

export interface ExcalFilters {
  mode: FilterMode
  includeUnknown: boolean
  includeBreakExtensions: boolean
}

export interface ExcalKpi {
  totalCycles: number
  goodCycles: number
  warningCycles: number
  badCycles: number
  goodRatePct: number
  avgDurationSec: number
  avgIdealSec: number
  avgVarianceSec: number
}

export interface WOBreakdownRow {
  woId: number | null
  woCode: string
  cycles: number
  good: number
  warning: number
  bad: number
  totalDurationSec: number
  rejectQty: number
}

export interface OperatorSummaryRow {
  operator: string
  cycles: number
  good: number
  warning: number
  bad: number
  rejectQty: number
}

export interface PipelineMeta {
  fetchedPages: number
  fetchedLogs: number
  normalizedLogs: number
  segments: number
  cycles: number
  jobs: number
}

export interface ExcalPipelineOutput {
  rows: ExcalRow[]
  kpis: ExcalKpi
  woBreakdown: WOBreakdownRow[]
  operatorSummary: OperatorSummaryRow[]
  meta: PipelineMeta
}

export interface PipelineRequest {
  startDate: string
  endDate: string
  deviceId: string
}

export interface ExportLogRow {
  serial: number | ''
  logTime: string
  action: string
  jobTag: string
  summaryNotes: string
  woCore: string
  setupDevice: string
  jobType: string
  operator: string
  row: ExcalRow
}
