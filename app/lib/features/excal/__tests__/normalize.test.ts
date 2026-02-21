import { normalizeLogs } from '@/app/lib/features/excal/normalize'

describe('excal normalize logs', () => {
  it('dedupes by log_id and falls back to id', () => {
    const rows = normalizeLogs([
      { log_id: 1, log_time: '2026-02-10T00:00:00.000Z', action: 'spindle_on' },
      { log_id: 1, log_time: '2026-02-10T00:01:00.000Z', action: 'spindle_off' },
      { id: 2, log_time: '2026-02-10T00:02:00.000Z', action: 'wo_stop' },
      { id: 0, log_time: '2026-02-10T00:03:00.000Z', action: 'wo_stop' },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0].action).toBe('SPINDLE_ON')
    expect(rows[1].action).toBe('WO_STOP')
  })

  it('sorts ascending by log_time', () => {
    const rows = normalizeLogs([
      { id: 3, log_time: '2026-02-10T00:03:00.000Z', action: 'WO_STOP' },
      { id: 2, log_time: '2026-02-10T00:02:00.000Z', action: 'SPINDLE_OFF' },
      { id: 1, log_time: '2026-02-10T00:01:00.000Z', action: 'SPINDLE_ON' },
    ])

    expect(rows.map((row) => row.logId)).toEqual([1, 2, 3])
  })
})
