import { splitJobs } from '@/app/lib/features/excal/jobs'
import type { SpindleCycle } from '@/app/lib/features/excal/types'

function cycle(
  id: number,
  durationSec: number,
  startMs: number,
  options: Partial<SpindleCycle> = {}
): SpindleCycle {
  const endMs = startMs + durationSec * 1000
  return {
    cycleId: `C-${id}`,
    segmentId: 'S-1',
    woId: 1,
    spindleOn: {
      logId: id * 2,
      dedupeKey: `ON-${id}`,
      action: 'SPINDLE_ON',
      logTimeIso: new Date(startMs).toISOString(),
      logTimeMs: startMs,
      woId: 1,
      deviceId: 1,
      operator: 'OP',
      partNo: 'P-1',
      reason: null,
      jobType: 2,
      rawTargetDuration: 120,
      targetDuration: 120,
      pcl: 120,
      okQty: 1,
      allotedQty: 1,
      rejectQty: 0,
      timeSaved: 0,
      raw: {},
    },
    spindleOff: {
      logId: id * 2 + 1,
      dedupeKey: `OFF-${id}`,
      action: 'SPINDLE_OFF',
      logTimeIso: new Date(endMs).toISOString(),
      logTimeMs: endMs,
      woId: 1,
      deviceId: 1,
      operator: 'OP',
      partNo: 'P-1',
      reason: null,
      jobType: 2,
      rawTargetDuration: 120,
      targetDuration: 120,
      pcl: 120,
      okQty: 1,
      allotedQty: 1,
      rejectQty: 0,
      timeSaved: 0,
      raw: {},
    },
    durationSec,
    gapFromPreviousSec: null,
    deviceId: 1,
    operator: 'OP',
    partNo: 'P-1',
    jobType: 2,
    targetDuration: 120,
    pcl: 120,
    okQty: 1,
    allotedQty: 1,
    rejectQty: 0,
    timeSaved: 0,
    ...options,
  }
}

describe('excal job splitting', () => {
  it('finds best-fit boundary and computes variance', () => {
    const cycles = [cycle(1, 40, 0), cycle(2, 40, 41000), cycle(3, 50, 82000)]
    const jobs = splitJobs(cycles, 'S-1')

    expect(jobs).toHaveLength(1)
    expect(jobs[0].label).toBe('JOB - 01')
    expect(jobs[0].totalSec).toBe(130)
    expect(jobs[0].varianceSec).toBe(10)
  })

  it('pushes unused cycles to next iteration', () => {
    const cycles = [cycle(1, 70, 0), cycle(2, 70, 71000), cycle(3, 70, 142000)]
    const jobs = splitJobs(cycles, 'S-1')

    expect(jobs).toHaveLength(2)
    expect(jobs[0].cycles).toHaveLength(2)
    expect(jobs[1].cycles).toHaveLength(1)
  })

  it('stops at gap > 900 sec boundary', () => {
    const cycles = [
      cycle(1, 60, 0),
      cycle(2, 60, 1000 * (60 + 901)),
      cycle(3, 60, 1000 * (60 + 901 + 61)),
    ]

    const jobs = splitJobs(cycles, 'S-1')
    expect(jobs[0].cycles).toHaveLength(1)
  })

  it('creates single-cycle jobs when target is invalid', () => {
    const cycles = [
      cycle(1, 60, 0, { targetDuration: null, pcl: null, jobType: 2 }),
      cycle(2, 60, 61000, { targetDuration: null, pcl: null, jobType: 2 }),
    ]

    const jobs = splitJobs(cycles, 'S-1')
    expect(jobs).toHaveLength(2)
    expect(jobs[0].varianceSec).toBeNull()
    expect(jobs[1].varianceSec).toBeNull()
  })
})
