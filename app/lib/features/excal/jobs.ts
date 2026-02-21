import { MAX_CYCLES_PER_JOB, MAX_GAP_SEC } from './constants'
import type { JobBlock, NormalizedLog, PauseBlock, SpindleCycle, WorkOrderDetails, WorkOrderSegment } from './types'
import { toSegmentId } from './utils'

interface SegmentExtraction {
  segments: WorkOrderSegment[]
  cyclesBySegment: Map<string, SpindleCycle[]>
  pausesBySegment: Map<string, PauseBlock[]>
  jobsBySegment: Map<string, JobBlock[]>
}

function splitByStartStop(logs: NormalizedLog[]): NormalizedLog[][] {
  if (!logs.length) return []

  const parts: NormalizedLog[][] = []
  let current: NormalizedLog[] = []
  let seenStart = false

  for (const log of logs) {
    const isStart = log.action === 'WO_START'
    const isStop = log.action === 'WO_STOP'

    if (isStart && current.length > 0 && seenStart) {
      parts.push(current)
      current = []
    }

    current.push(log)

    if (isStart) seenStart = true
    if (isStop && seenStart) {
      parts.push(current)
      current = []
      seenStart = false
    }
  }

  if (current.length > 0) {
    parts.push(current)
  }

  return parts
}

function getTargetForCycle(cycle: SpindleCycle): number | null {
  if (cycle.jobType === 2 && cycle.targetDuration && cycle.targetDuration > 0) {
    return cycle.targetDuration
  }

  if (cycle.pcl && cycle.pcl > 0) {
    return cycle.pcl
  }

  return null
}

export function segmentAndSplit(
  normalizedLogs: NormalizedLog[],
  woMap: Map<number, WorkOrderDetails>
): SegmentExtraction {
  const byWo = new Map<number | null, NormalizedLog[]>()

  for (const log of normalizedLogs) {
    const key = log.woId
    const bucket = byWo.get(key)
    if (bucket) {
      bucket.push(log)
    } else {
      byWo.set(key, [log])
    }
  }

  const segments: WorkOrderSegment[] = []
  const cyclesBySegment = new Map<string, SpindleCycle[]>()
  const pausesBySegment = new Map<string, PauseBlock[]>()
  const jobsBySegment = new Map<string, JobBlock[]>()

  const woEntries = Array.from(byWo.entries()).sort((a, b) => {
    const [woA, logsA] = a
    const [woB, logsB] = b
    const timeA = logsA[0]?.logTimeMs ?? 0
    const timeB = logsB[0]?.logTimeMs ?? 0

    if (woA === null && woB !== null) return 1
    if (woA !== null && woB === null) return -1
    return timeA - timeB
  })

  for (const [woId, logs] of woEntries) {
    const sortedLogs = [...logs].sort((a, b) => a.logTimeMs - b.logTimeMs)
    const partitions = splitByStartStop(sortedLogs)

    for (let partitionIndex = 0; partitionIndex < partitions.length; partitionIndex += 1) {
      const part = partitions[partitionIndex]
      if (!part.length) continue

      const segmentId = toSegmentId(part[0], partitionIndex)
      const woStart = part.find((log) => log.action === 'WO_START') ?? null
      const woStop = [...part].reverse().find((log) => log.action === 'WO_STOP') ?? null
      const woDetails = woId !== null ? woMap.get(woId) ?? null : null

      const segment: WorkOrderSegment = {
        segmentId,
        woId,
        logs: part,
        woStart,
        woStop,
        woDetails,
      }

      const { cycles, pauses } = pairCyclesAndPauses(segment)
      const jobs = splitJobs(cycles, segmentId)

      segments.push(segment)
      cyclesBySegment.set(segmentId, cycles)
      pausesBySegment.set(segmentId, pauses)
      jobsBySegment.set(segmentId, jobs)
    }
  }

  return {
    segments,
    cyclesBySegment,
    pausesBySegment,
    jobsBySegment,
  }
}

export function pairCyclesAndPauses(segment: WorkOrderSegment): {
  cycles: SpindleCycle[]
  pauses: PauseBlock[]
} {
  const cycles: SpindleCycle[] = []
  const pauses: PauseBlock[] = []

  let spindleOn: NormalizedLog | null = null
  let pauseStart: NormalizedLog | null = null

  for (const log of segment.logs) {
    if (log.action === 'SPINDLE_ON') {
      spindleOn = log
      continue
    }

    if (log.action === 'SPINDLE_OFF' && spindleOn) {
      const durationSec = Math.max(0, Math.round((log.logTimeMs - spindleOn.logTimeMs) / 1000))
      const previousCycle = cycles.at(-1)
      const gapFromPreviousSec = previousCycle
        ? Math.max(0, Math.round((spindleOn.logTimeMs - previousCycle.spindleOff.logTimeMs) / 1000))
        : null

      cycles.push({
        cycleId: `CYCLE-${segment.segmentId}-${cycles.length + 1}`,
        segmentId: segment.segmentId,
        woId: segment.woId,
        spindleOn,
        spindleOff: log,
        durationSec,
        gapFromPreviousSec,
        deviceId: log.deviceId ?? spindleOn.deviceId,
        operator: log.operator ?? spindleOn.operator ?? segment.woDetails?.operator ?? null,
        partNo: log.partNo ?? spindleOn.partNo ?? segment.woDetails?.part_no ?? null,
        jobType: log.jobType ?? spindleOn.jobType ?? segment.woDetails?.job_type ?? null,
        targetDuration: log.targetDuration ?? spindleOn.targetDuration ?? segment.woDetails?.target_duration ?? null,
        pcl: log.pcl ?? spindleOn.pcl ?? segment.woDetails?.pcl ?? null,
        okQty: log.okQty ?? spindleOn.okQty ?? segment.woDetails?.ok_qty ?? null,
        allotedQty: log.allotedQty ?? spindleOn.allotedQty ?? segment.woDetails?.alloted_qty ?? null,
        rejectQty: log.rejectQty ?? spindleOn.rejectQty ?? segment.woDetails?.reject_qty ?? null,
        timeSaved: log.timeSaved ?? spindleOn.timeSaved ?? null,
      })

      spindleOn = null
      continue
    }

    if (log.action === 'WO_PAUSE') {
      pauseStart = log
      continue
    }

    if (log.action === 'WO_RESUME' && pauseStart) {
      const durationSec = Math.max(0, Math.round((log.logTimeMs - pauseStart.logTimeMs) / 1000))
      pauses.push({
        pauseId: `PAUSE-${segment.segmentId}-${pauses.length + 1}`,
        segmentId: segment.segmentId,
        start: pauseStart,
        end: log,
        durationSec,
        reason: pauseStart.reason ?? log.reason ?? null,
      })
      pauseStart = null
    }
  }

  return { cycles, pauses }
}

export function splitJobs(cycles: SpindleCycle[], segmentId: string): JobBlock[] {
  if (!cycles.length) return []

  const queue = [...cycles]
  const jobs: JobBlock[] = []
  let jobNumber = 1

  while (queue.length > 0) {
    const first = queue[0]
    const target = getTargetForCycle(first)

    if (!target || target <= 0) {
      const single = queue.shift()!
      jobs.push({
        jobId: `JOB-${segmentId}-${jobNumber}`,
        segmentId,
        label: `JOB - ${String(jobNumber).padStart(2, '0')}`,
        cycles: [single],
        totalSec: single.durationSec,
        targetSec: null,
        varianceSec: null,
        groupId: `GROUP-${segmentId}-${jobNumber}`,
      })
      jobNumber += 1
      continue
    }

    let accumulated = 0
    let bestBoundary = 1
    let bestDelta = Number.POSITIVE_INFINITY
    let scannedCount = 0

    for (let i = 0; i < queue.length && i < MAX_CYCLES_PER_JOB; i += 1) {
      if (i > 0) {
        const gapSec = Math.max(0, Math.round((queue[i].spindleOn.logTimeMs - queue[i - 1].spindleOff.logTimeMs) / 1000))
        if (gapSec > MAX_GAP_SEC) {
          break
        }
      }

      accumulated += queue[i].durationSec
      scannedCount = i + 1

      const delta = Math.abs(accumulated - target)
      if (delta <= bestDelta) {
        bestDelta = delta
        bestBoundary = i + 1
      }

      if (accumulated >= target || scannedCount >= MAX_CYCLES_PER_JOB) {
        break
      }
    }

    const emitCount = Math.max(1, Math.min(bestBoundary, scannedCount || 1))
    const usedCycles = queue.splice(0, emitCount)
    const totalSec = usedCycles.reduce((sum, cycle) => sum + cycle.durationSec, 0)

    jobs.push({
      jobId: `JOB-${segmentId}-${jobNumber}`,
      segmentId,
      label: `JOB - ${String(jobNumber).padStart(2, '0')}`,
      cycles: usedCycles,
      totalSec,
      targetSec: target,
      varianceSec: totalSec - target,
      groupId: `GROUP-${segmentId}-${jobNumber}`,
    })

    jobNumber += 1
  }

  return jobs
}
