import { ensureApiDateFormat, formatDateForApi } from '@/app/lib/features/excal/date'

describe('excal api date format', () => {
  it('formats as DD-MM-YYYY HH:MM', () => {
    const date = new Date(2026, 1, 12, 9, 5)
    expect(formatDateForApi(date)).toBe('12-02-2026 09:05')
  })

  it('keeps valid format unchanged', () => {
    expect(ensureApiDateFormat('05-01-2026 13:45')).toBe('05-01-2026 13:45')
  })
})
