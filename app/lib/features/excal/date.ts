import { DATE_QUERY_REGEX } from './constants'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function formatDateForApi(date: Date): string {
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${day}-${month}-${year} ${hours}:${minutes}`
}

export function parseDateFromApi(value: string): Date | null {
  if (!DATE_QUERY_REGEX.test(value)) return null
  const [datePart, timePart] = value.split(' ')
  const [dayStr, monthStr, yearStr] = datePart.split('-')
  const [hourStr, minuteStr] = timePart.split(':')

  const day = Number(dayStr)
  const month = Number(monthStr)
  const year = Number(yearStr)
  const hours = Number(hourStr)
  const minutes = Number(minuteStr)

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year) || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function ensureApiDateFormat(input: string): string {
  if (DATE_QUERY_REGEX.test(input)) return input
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return input
  return formatDateForApi(parsed)
}
