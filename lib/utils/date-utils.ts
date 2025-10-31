/**
 * Date Range Calculation Utility
 * 
 * Centralized date range calculation to ensure consistency across the application.
 * Used by attendance tracking, Excel exports, and data filtering.
 */

export interface DateRange {
  fromDate: string
  toDate: string
}

/**
 * Calculate date range based on preset or custom dates
 * 
 * @param range - Preset range identifier (today, yesterday, month, etc.)
 * @param customFromDate - Optional custom start date (YYYY-MM-DD)
 * @param customToDate - Optional custom end date (YYYY-MM-DD)
 * @returns Object with fromDate and toDate in YYYY-MM-DD format
 * 
 * @example
 * // Get today's date range
 * const { fromDate, toDate } = calculateDateRange('today')
 * // Returns: { fromDate: '2025-10-27', toDate: '2025-10-27' }
 * 
 * @example
 * // Get previous month
 * const { fromDate, toDate } = calculateDateRange('prev-month')
 * // Returns: { fromDate: '2025-09-01', toDate: '2025-09-30' }
 * 
 * @example
 * // Custom date range
 * const { fromDate, toDate } = calculateDateRange('custom', '2025-01-01', '2025-01-31')
 * // Returns: { fromDate: '2025-01-01', toDate: '2025-01-31' }
 */
export function calculateDateRange(
  range: string,
  customFromDate?: string,
  customToDate?: string
): DateRange {
  // Get current date in IST (UTC+5:30) timezone
  const now = new Date()
  // IST offset is +5:30 = 330 minutes = 19800000 milliseconds
  const istOffset = 330 * 60 * 1000
  const istDate = new Date(now.getTime() + istOffset)
  let fromDateParam: string
  let toDateParam: string
  
  switch(range) {
    case 'today':
      // Use IST date to match Indian timezone (where the data is)
      fromDateParam = toDateParam = istDate.toISOString().split('T')[0]
      break
      
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      fromDateParam = toDateParam = yesterday.toISOString().split('T')[0]
      break
      
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - now.getDay())
      fromDateParam = weekStart.toISOString().split('T')[0]
      toDateParam = now.toISOString().split('T')[0]
      break
      
    case 'prev-week':
      const prevWeekEnd = new Date(now)
      prevWeekEnd.setDate(prevWeekEnd.getDate() - now.getDay() - 1)
      const prevWeekStart = new Date(prevWeekEnd)
      prevWeekStart.setDate(prevWeekStart.getDate() - 6)
      fromDateParam = prevWeekStart.toISOString().split('T')[0]
      toDateParam = prevWeekEnd.toISOString().split('T')[0]
      break
      
    case 'month':
      // Extract year and month from IST date string to avoid timezone conversion
      const istDateStr = istDate.toISOString().split('T')[0] // "2025-10-31"
      const [year, month] = istDateStr.split('-').map(Number)
      const monthStartDate = new Date(Date.UTC(year, month - 1, 1))
      const monthEndDate = new Date(Date.UTC(year, month, 0))
      fromDateParam = monthStartDate.toISOString().split('T')[0]
      toDateParam = monthEndDate.toISOString().split('T')[0]
      break
      
    case 'prev-month':
      // Extract year and month from IST date string to avoid timezone conversion
      const istDateStrPrev = istDate.toISOString().split('T')[0]
      const [yearPrev, monthPrev] = istDateStrPrev.split('-').map(Number)
      const prevMonthStartDate = new Date(Date.UTC(yearPrev, monthPrev - 2, 1))
      const prevMonthEndDate = new Date(Date.UTC(yearPrev, monthPrev - 1, 0))
      fromDateParam = prevMonthStartDate.toISOString().split('T')[0]
      toDateParam = prevMonthEndDate.toISOString().split('T')[0]
      break
      
    case 'quarter':
      // Extract year and month from IST date string
      const istDateStrQ = istDate.toISOString().split('T')[0]
      const [yearQ, monthQ] = istDateStrQ.split('-').map(Number)
      const quarterStartMonth = Math.floor((monthQ - 1) / 3) * 3
      const quarterStartDate = new Date(Date.UTC(yearQ, quarterStartMonth, 1))
      fromDateParam = quarterStartDate.toISOString().split('T')[0]
      toDateParam = istDateStrQ
      break
      
    case 'prev-quarter':
      // Extract year and month from IST date string
      const istDateStrPQ = istDate.toISOString().split('T')[0]
      const [yearPQ, monthPQ] = istDateStrPQ.split('-').map(Number)
      const prevQuarterStartMonth = Math.floor((monthPQ - 1) / 3) * 3 - 3
      const prevQuarterStartDate = new Date(Date.UTC(yearPQ, prevQuarterStartMonth, 1))
      const prevQuarterEndDate = new Date(Date.UTC(yearPQ, prevQuarterStartMonth + 3, 0))
      fromDateParam = prevQuarterStartDate.toISOString().split('T')[0]
      toDateParam = prevQuarterEndDate.toISOString().split('T')[0]
      break
      
    case 'year':
      // Extract year from IST date string
      const istDateStrY = istDate.toISOString().split('T')[0]
      const [yearY] = istDateStrY.split('-').map(Number)
      const yearStartDate = new Date(Date.UTC(yearY, 0, 1))
      fromDateParam = yearStartDate.toISOString().split('T')[0]
      toDateParam = istDateStrY
      break
      
    case 'prev-year':
      // Extract year from IST date string
      const istDateStrPY = istDate.toISOString().split('T')[0]
      const [yearPY] = istDateStrPY.split('-').map(Number)
      const prevYearStartDate = new Date(Date.UTC(yearPY - 1, 0, 1))
      const prevYearEndDate = new Date(Date.UTC(yearPY - 1, 11, 31))
      fromDateParam = prevYearStartDate.toISOString().split('T')[0]
      toDateParam = prevYearEndDate.toISOString().split('T')[0]
      break
      
    case 'custom':
      if (customFromDate && customToDate) {
        fromDateParam = customFromDate
        toDateParam = customToDate
      } else {
        fromDateParam = toDateParam = now.toISOString().split('T')[0]
      }
      break
      
    default:
      fromDateParam = toDateParam = now.toISOString().split('T')[0]
  }
  
  return { fromDate: fromDateParam, toDate: toDateParam }
}

/**
 * Get human-readable label for date range
 * 
 * @param range - Date range identifier
 * @returns Human-readable label
 * 
 * @example
 * getDateRangeLabel('prev-month') // Returns: "Previous Month"
 */
export function getDateRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    'week': 'This Week',
    'prev-week': 'Previous Week',
    'month': 'This Month',
    'prev-month': 'Previous Month',
    'quarter': 'This Quarter',
    'prev-quarter': 'Previous Quarter',
    'year': 'This Year',
    'prev-year': 'Previous Year',
    'custom': 'Custom Range'
  }
  return labels[range] || 'Today'
}
