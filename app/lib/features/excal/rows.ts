import { MAX_GAP_SEC } from './constants'
import type { ExcalRow, JobBlock, PauseBlock, SpindleCycle, WorkOrderSegment } from './types'
import { buildWoCode, jobTypeLabel, pickDeviceName } from './utils'

interface SegmentRowsInput {
  segment: WorkOrderSegment
  cycles: SpindleCycle[]
  pauses: PauseBlock[]
  jobs: JobBlock[]
}

interface JobTagMeta {
  jobTag: string
  groupId: string
  isGroupStart: boolean
  isGroupEnd: boolean
}

function buildJobMap(jobs: JobBlock[]): Map<string, JobTagMeta> {
  const map = new Map<string, JobTagMeta>()

  for (const job of jobs) {
    const jobCycles = job.cycles
    for (let i = 0; i < jobCycles.length; i += 1) {
      const cycle = jobCycles[i]
      const onKey = cycle.spindleOn.dedupeKey
      const offKey = cycle.spindleOff.dedupeKey

      map.set(onKey, {
        jobTag: job.label,
        groupId: job.groupId,
        isGroupStart: i === 0,
        isGroupEnd: false,
      })

      map.set(offKey, {
        jobTag: job.label,
        groupId: job.groupId,
        isGroupStart: false,
        isGroupEnd: i === jobCycles.length - 1,
      })
    }
  }

  return map
}

function makeRowBase(args: {
  rowId: string
  segmentId: string
  timestampMs: number
  logTimeIso: string
  action: string
  summary: string
  notes?: string
  isComputed?: boolean
  isBanner?: boolean
  jobTag?: string
  groupId?: string | null
  isGroupStart?: boolean
  isGroupEnd?: boolean
  isLoadingSeparator?: boolean
  woId: number | null
  woCode: string | null
  deviceId: number | null
  deviceName: string
  partNo: string | null
  operator: string | null
  jobType: number | null
  durationSec?: number | null
  rawTargetDurationSec?: number | null
  targetDurationSec?: number | null
  pclSec?: number | null
  idealSec?: number | null
  varianceSec?: number | null
  okQty?: number | null
  allotedQty?: number | null
  rejectQty?: number | null
  timeSaved?: number | null
  rawAction?: string | null
}): ExcalRow {
  return {
    rowId: args.rowId,
    segmentId: args.segmentId,
    timestampMs: args.timestampMs,
    logTimeIso: args.logTimeIso,
    action: args.action,
    summary: args.summary,
    notes: args.notes ?? '',
    isComputed: args.isComputed ?? false,
    isBanner: args.isBanner ?? false,
    jobTag: args.jobTag ?? '',
    groupId: args.groupId ?? null,
    isGroupStart: args.isGroupStart ?? false,
    isGroupEnd: args.isGroupEnd ?? false,
    isLoadingSeparator: args.isLoadingSeparator ?? false,
    woId: args.woId,
    woCode: args.woCode,
    deviceId: args.deviceId,
    deviceName: args.deviceName,
    partNo: args.partNo,
    operator: args.operator,
    jobType: args.jobType,
    jobTypeLabel: jobTypeLabel(args.jobType),
    durationSec: args.durationSec ?? null,
    rawTargetDurationSec: args.rawTargetDurationSec ?? null,
    targetDurationSec: args.targetDurationSec ?? null,
    pclSec: args.pclSec ?? null,
    idealSec: args.idealSec ?? null,
    varianceSec: args.varianceSec ?? null,
    classification: 'UNKNOWN',
    classificationReason: '',
    unknownKind: null,
    okQty: args.okQty ?? null,
    allotedQty: args.allotedQty ?? null,
    rejectQty: args.rejectQty ?? null,
    timeSaved: args.timeSaved ?? null,
    computedTimeSavedDelta: null,
    sNo: null,
    rawAction: args.rawAction ?? null,
  }
}

export function buildRows(inputs: SegmentRowsInput[]): ExcalRow[] {
  const rows: ExcalRow[] = []

  for (const input of inputs) {
    const { segment, cycles, pauses, jobs } = input
    const segmentLogs = [...segment.logs].sort((a, b) => a.logTimeMs - b.logTimeMs)
    if (!segmentLogs.length) continue

    const segmentStart = segment.woStart ?? segmentLogs[0]
    const segmentEnd = segment.woStop ?? segmentLogs[segmentLogs.length - 1]
    const woCode = buildWoCode(segment.woId, segment.woDetails?.wo_no ?? null)

    const defaultDeviceId = segment.woDetails?.device_id ?? segmentLogs[0].deviceId
    const defaultDeviceName = pickDeviceName(defaultDeviceId, segment.woDetails?.device_name ?? null)
    const defaultOperator = segment.woDetails?.operator ?? segmentLogs[0].operator ?? null
    const defaultPartNo = segment.woDetails?.part_no ?? segmentLogs[0].partNo ?? null

    const cycleByOffKey = new Map(cycles.map((cycle) => [cycle.spindleOff.dedupeKey, cycle]))
    const jobTagMap = buildJobMap(jobs)

    rows.push(
      makeRowBase({
        rowId: `ROW-${segment.segmentId}-WO_HEADER`,
        segmentId: segment.segmentId,
        timestampMs: segmentStart.logTimeMs,
        logTimeIso: segmentStart.logTimeIso,
        action: 'WO_HEADER',
        summary: woCode ? `${woCode} started` : 'WO segment started',
        notes: `Segment ${segment.segmentId}`,
        isComputed: true,
        isBanner: true,
        woId: segment.woId,
        woCode,
        deviceId: defaultDeviceId ?? null,
        deviceName: defaultDeviceName,
        partNo: defaultPartNo,
        operator: defaultOperator,
        jobType: segment.woDetails?.job_type ?? segmentLogs[0].jobType,
      })
    )

    const firstSpindleOn = segmentLogs.find((log) => log.action === 'SPINDLE_ON')
    if (segmentStart && firstSpindleOn && firstSpindleOn.logTimeMs > segmentStart.logTimeMs) {
      const idealDurationSec = Math.max(0, Math.round((firstSpindleOn.logTimeMs - segmentStart.logTimeMs) / 1000))
      rows.push(
        makeRowBase({
          rowId: `ROW-${segment.segmentId}-IDEAL`,
          segmentId: segment.segmentId,
          timestampMs: firstSpindleOn.logTimeMs - 1,
          logTimeIso: new Date(firstSpindleOn.logTimeMs - 1).toISOString(),
          action: 'IDEAL_TIME',
          summary: 'Ideal Time',
          notes: `WO start to first spindle ON: ${idealDurationSec} sec`,
          isComputed: true,
          woId: segment.woId,
          woCode,
          deviceId: defaultDeviceId ?? null,
          deviceName: defaultDeviceName,
          partNo: defaultPartNo,
          operator: defaultOperator,
          jobType: segment.woDetails?.job_type ?? firstSpindleOn.jobType,
          durationSec: idealDurationSec,
        })
      )
    }

    for (let index = 0; index < segmentLogs.length; index += 1) {
      const log = segmentLogs[index]
      const cycle = cycleByOffKey.get(log.dedupeKey)
      const jobMeta = jobTagMap.get(log.dedupeKey)

      rows.push(
        makeRowBase({
          rowId: `ROW-${segment.segmentId}-${log.dedupeKey}`,
          segmentId: segment.segmentId,
          timestampMs: log.logTimeMs,
          logTimeIso: log.logTimeIso,
          action: log.action,
          summary: log.action,
          notes: log.reason ?? '',
          isComputed: false,
          isBanner: false,
          jobTag: jobMeta?.jobTag ?? '',
          groupId: jobMeta?.groupId ?? null,
          isGroupStart: jobMeta?.isGroupStart ?? false,
          isGroupEnd: jobMeta?.isGroupEnd ?? false,
          woId: log.woId,
          woCode,
          deviceId: log.deviceId ?? defaultDeviceId ?? null,
          deviceName: pickDeviceName(log.deviceId ?? defaultDeviceId ?? null, segment.woDetails?.device_name ?? null),
          partNo: log.partNo ?? defaultPartNo,
          operator: log.operator ?? defaultOperator,
          jobType: log.jobType ?? segment.woDetails?.job_type ?? null,
          durationSec: cycle?.durationSec ?? null,
          rawTargetDurationSec: log.rawTargetDuration ?? null,
          targetDurationSec: cycle?.targetDuration ?? log.targetDuration ?? segment.woDetails?.target_duration ?? null,
          pclSec: cycle?.pcl ?? log.pcl ?? segment.woDetails?.pcl ?? null,
          okQty: cycle?.okQty ?? log.okQty ?? segment.woDetails?.ok_qty ?? null,
          allotedQty: cycle?.allotedQty ?? log.allotedQty ?? segment.woDetails?.alloted_qty ?? null,
          rejectQty: cycle?.rejectQty ?? log.rejectQty ?? segment.woDetails?.reject_qty ?? null,
          timeSaved: cycle?.timeSaved ?? log.timeSaved ?? null,
          rawAction: log.action,
        })
      )

      const nextLog = segmentLogs[index + 1]
      if (!nextLog) continue

      const gapSec = Math.max(0, Math.round((nextLog.logTimeMs - log.logTimeMs) / 1000))
      if (gapSec <= 0) continue

      const inGroup = Boolean(jobMeta?.groupId)
      rows.push(
        makeRowBase({
          rowId: `ROW-${segment.segmentId}-GAP-${index + 1}`,
          segmentId: segment.segmentId,
          timestampMs: log.logTimeMs + 1,
          logTimeIso: new Date(log.logTimeMs + 1).toISOString(),
          action: 'LOADING_UNLOADING',
          summary: 'Loading/Unloading',
          notes: `${gapSec} sec gap`,
          isComputed: true,
          woId: segment.woId,
          woCode,
          deviceId: log.deviceId ?? defaultDeviceId ?? null,
          deviceName: pickDeviceName(log.deviceId ?? defaultDeviceId ?? null, segment.woDetails?.device_name ?? null),
          partNo: log.partNo ?? defaultPartNo,
          operator: log.operator ?? defaultOperator,
          jobType: log.jobType ?? segment.woDetails?.job_type ?? null,
          durationSec: gapSec,
          groupId: inGroup ? jobMeta?.groupId ?? null : null,
          isLoadingSeparator: true,
        })
      )

      if (gapSec > MAX_GAP_SEC) {
        rows.push(
          makeRowBase({
            rowId: `ROW-${segment.segmentId}-IDLE-${index + 1}`,
            segmentId: segment.segmentId,
            timestampMs: log.logTimeMs + 2,
            logTimeIso: new Date(log.logTimeMs + 2).toISOString(),
            action: 'IDLE_BREAK',
            summary: 'Idle/Break',
            notes: `Long idle gap: ${gapSec} sec`,
            isComputed: true,
            woId: segment.woId,
            woCode,
            deviceId: log.deviceId ?? defaultDeviceId ?? null,
            deviceName: pickDeviceName(log.deviceId ?? defaultDeviceId ?? null, segment.woDetails?.device_name ?? null),
            partNo: log.partNo ?? defaultPartNo,
            operator: log.operator ?? defaultOperator,
            jobType: log.jobType ?? segment.woDetails?.job_type ?? null,
            durationSec: gapSec,
          })
        )
      }
    }

    for (const pause of pauses) {
      rows.push(
        makeRowBase({
          rowId: `ROW-${segment.segmentId}-${pause.pauseId}`,
          segmentId: segment.segmentId,
          timestampMs: pause.end.logTimeMs,
          logTimeIso: pause.end.logTimeIso,
          action: 'PAUSE_BANNER',
          summary: 'Pause',
          notes: `${pause.reason ?? 'No reason'} (${pause.durationSec} sec)`,
          isComputed: true,
          isBanner: true,
          woId: segment.woId,
          woCode,
          deviceId: pause.end.deviceId ?? defaultDeviceId ?? null,
          deviceName: pickDeviceName(pause.end.deviceId ?? defaultDeviceId ?? null, segment.woDetails?.device_name ?? null),
          partNo: pause.end.partNo ?? defaultPartNo,
          operator: pause.end.operator ?? defaultOperator,
          jobType: pause.end.jobType ?? segment.woDetails?.job_type ?? null,
          durationSec: pause.durationSec,
        })
      )
    }

    const totalCycleSec = cycles.reduce((sum, cycle) => sum + cycle.durationSec, 0)
    const totalGoodCandidate = cycles.length

    const woInfo = [
      `WO: ${woCode ?? 'Unassigned'}`,
      `Part: ${defaultPartNo ?? '-'}`,
      `Device: ${defaultDeviceName}`,
    ].join('\n')

    const timeKpi = [
      `Cycles: ${cycles.length}`,
      `Total Cycle Time: ${totalCycleSec} sec`,
      `Jobs: ${jobs.length}`,
    ].join('\n')

    const outputComments = [
      `Operator: ${defaultOperator ?? '-'}`,
      `Cycle Rows: ${totalGoodCandidate}`,
      segment.woDetails?.comments ? `Comments: ${segment.woDetails.comments}` : 'Comments: -',
    ].join('\n')

    rows.push(
      makeRowBase({
        rowId: `ROW-${segment.segmentId}-WO_SUMMARY`,
        segmentId: segment.segmentId,
        timestampMs: segmentEnd.logTimeMs + 1,
        logTimeIso: new Date(segmentEnd.logTimeMs + 1).toISOString(),
        action: 'WO_SUMMARY',
        summary: woInfo,
        notes: `${timeKpi}\n${outputComments}`,
        isComputed: true,
        isBanner: true,
        woId: segment.woId,
        woCode,
        deviceId: defaultDeviceId ?? null,
        deviceName: defaultDeviceName,
        partNo: defaultPartNo,
        operator: defaultOperator,
        jobType: segment.woDetails?.job_type ?? null,
      })
    )
  }

  return rows.sort((a, b) => {
    if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs
    return a.rowId.localeCompare(b.rowId)
  })
}
