import type { ExcalFilters, ExcalRow } from './types'

export const DEFAULT_FILTERS: ExcalFilters = {
  mode: 'ALL',
  includeUnknown: false,
  includeBreakExtensions: false,
}

export function applyFilters(rows: ExcalRow[], filters: ExcalFilters): ExcalRow[] {
  return rows.filter((row) => {
    if (row.classification === 'UNKNOWN') {
      if (row.unknownKind === 'BREAK_CONTEXT') {
        return filters.includeBreakExtensions
      }
      return filters.includeUnknown
    }

    if (filters.mode === 'GOOD_ONLY') {
      return row.classification === 'GOOD'
    }

    if (filters.mode === 'GOOD_WARNING') {
      return row.classification === 'GOOD' || row.classification === 'WARNING'
    }

    return row.classification === 'GOOD' || row.classification === 'WARNING' || row.classification === 'BAD'
  })
}
