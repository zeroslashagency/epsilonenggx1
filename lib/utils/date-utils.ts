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
  const now = new Date()
  let fromDateParam: string
  let toDateParam: string
  
  switch(range) {
    case 'today':
      fromDateParam = toDateParam = now.toISOString().split('T')[0]
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
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      fromDateParam = monthStart.toISOString().split('T')[0]
      toDateParam = monthEnd.toISOString().split('T')[0]
      break
      
    case 'prev-month':
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      fromDateParam = prevMonthStart.toISOString().split('T')[0]
      toDateParam = prevMonthEnd.toISOString().split('T')[0]
      break
      
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      fromDateParam = quarterStart.toISOString().split('T')[0]
      toDateParam = now.toISOString().split('T')[0]
      break
      
    case 'prev-quarter':
      const prevQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
      const prevQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
      fromDateParam = prevQuarterStart.toISOString().split('T')[0]
      toDateParam = prevQuarterEnd.toISOString().split('T')[0]
      break
      
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      fromDateParam = yearStart.toISOString().split('T')[0]
      toDateParam = now.toISOString().split('T')[0]
      break
      
    case 'prev-year':
      const prevYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31)
      fromDateParam = prevYearStart.toISOString().split('T')[0]
      toDateParam = prevYearEnd.toISOString().split('T')[0]
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
