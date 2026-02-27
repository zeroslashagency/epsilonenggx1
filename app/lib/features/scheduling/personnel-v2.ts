export type PersonnelSourceSection = 'production' | 'setup'

export interface SchedulerPersonnelProfileInput {
  uid: string
  name: string
  sourceSection: PersonnelSourceSection
  levelUp: number
  setupEligible: boolean
  productionEligible: boolean
  setupPriority: number
}

export interface PersonnelParseIssue {
  code:
    | 'missing_required_column'
    | 'schema_marker_row'
    | 'person_row_without_section'
    | 'invalid_level_up_value'
    | 'incomplete_person_row'
    | 'duplicate_person_uid_conflict'
    | 'duplicate_person_name_conflict'
  severity: 'warning' | 'critical'
  row: number
  message: string
  value?: string
}

export interface PersonnelParseResult {
  profiles: SchedulerPersonnelProfileInput[]
  issues: PersonnelParseIssue[]
  summary: {
    productionRowsDetected: number
    setupRowsDetected: number
    setupEligibleCount: number
    productionEligibleCount: number
  }
}

type LooseRow = Record<string, unknown>

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const normalizeToken = (value: unknown): string => normalizeKey(String(value || ''))

const SECTION_PRODUCTION_TOKENS = new Set(['productionperson', 'production', 'productionteam'])
const SECTION_SETUP_TOKENS = new Set(['setupperson', 'setup', 'setupteam'])

const HEADER_MARKER_TOKENS = new Set(['uid', 'name', 'levelup', 'level'])

const findColumnKey = (rows: LooseRow[], aliases: string[]): string | null => {
  const target = new Set(aliases.map(normalizeKey))
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (target.has(normalizeKey(key))) return key
    }
  }
  return null
}

const parseSectionMarker = (value: unknown): PersonnelSourceSection | null => {
  const token = normalizeToken(value)
  if (!token) return null
  if (SECTION_SETUP_TOKENS.has(token)) return 'setup'
  if (SECTION_PRODUCTION_TOKENS.has(token)) return 'production'
  return null
}

const readCell = (row: LooseRow, key: string | null): string => {
  if (!key) return ''
  const value = row[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const parseLevelValue = (
  rawValue: string,
  row: number,
  fallback: number,
  issues: PersonnelParseIssue[]
): number => {
  if (!rawValue) return fallback
  const numeric = Number(rawValue)
  if (Number.isFinite(numeric) && (numeric === 0 || numeric === 1)) return numeric
  issues.push({
    code: 'invalid_level_up_value',
    severity: 'warning',
    row,
    message: `Invalid level-up value "${rawValue}". Falling back to ${fallback}.`,
    value: rawValue,
  })
  return fallback
}

export function parsePersonnelProfilesFromRows(rawRows: LooseRow[]): PersonnelParseResult {
  const issues: PersonnelParseIssue[] = []
  const rows = Array.isArray(rawRows) ? rawRows : []

  const sectionKey = findColumnKey(rows, [
    'Production-Person',
    'production_person',
    'production person',
  ])
  const uidKey = findColumnKey(rows, ['uid', 'user id', 'employee id'])
  const nameKey = findColumnKey(rows, ['Name', 'person name', 'employee name'])
  const levelKey = findColumnKey(rows, ['level-up', 'level up', 'levelup', 'level'])

  if (!sectionKey || !uidKey || !nameKey || !levelKey) {
    issues.push({
      code: 'missing_required_column',
      severity: 'critical',
      row: 1,
      message: 'Personnel columns missing. Required: Production-Person, uid, Name, level-up.',
    })
    return {
      profiles: [],
      issues,
      summary: {
        productionRowsDetected: 0,
        setupRowsDetected: 0,
        setupEligibleCount: 0,
        productionEligibleCount: 0,
      },
    }
  }

  let currentSection: PersonnelSourceSection | null = 'production'
  let productionRowsDetected = 0
  let setupRowsDetected = 0

  const byUid = new Map<string, SchedulerPersonnelProfileInput>()
  const nameToUid = new Map<string, string>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // sheet_to_json skips header row, so data starts at excel row 2
    const sectionRaw = readCell(row, sectionKey)
    const sectionMarker = parseSectionMarker(sectionRaw)
    if (sectionMarker) currentSection = sectionMarker

    const uid = readCell(row, uidKey)
    const name = readCell(row, nameKey)
    const levelRaw = readCell(row, levelKey)

    const hasAnyPersonnelCell = Boolean(uid || name || levelRaw)
    if (!hasAnyPersonnelCell) return

    const isHeaderMarkerRow =
      HEADER_MARKER_TOKENS.has(normalizeToken(uid)) ||
      HEADER_MARKER_TOKENS.has(normalizeToken(name)) ||
      HEADER_MARKER_TOKENS.has(normalizeToken(levelRaw))

    if (isHeaderMarkerRow) {
      issues.push({
        code: 'schema_marker_row',
        severity: 'warning',
        row: rowNumber,
        message: 'Ignored schema marker row in personnel block.',
      })
      return
    }

    if (!currentSection) {
      issues.push({
        code: 'person_row_without_section',
        severity: 'warning',
        row: rowNumber,
        message: 'Ignored personnel row because no section marker was found yet.',
      })
      return
    }

    if (!uid || !name) {
      issues.push({
        code: 'incomplete_person_row',
        severity: 'warning',
        row: rowNumber,
        message: 'Ignored personnel row with missing uid or Name.',
      })
      return
    }

    const defaultLevel = currentSection === 'setup' ? 1 : 0
    const levelUp = parseLevelValue(levelRaw, rowNumber, defaultLevel, issues)

    const sourceSection: PersonnelSourceSection = currentSection
    const setupEligible = sourceSection === 'setup' || levelUp === 1
    const productionEligible = sourceSection === 'production' || levelUp === 1
    const setupPriority = sourceSection === 'setup' ? 1 : levelUp === 1 ? 2 : 99

    if (sourceSection === 'setup') setupRowsDetected += 1
    else productionRowsDetected += 1

    const existingUid = nameToUid.get(name.toLowerCase())
    if (existingUid && existingUid !== uid) {
      issues.push({
        code: 'duplicate_person_name_conflict',
        severity: 'warning',
        row: rowNumber,
        message: `Name "${name}" is mapped to multiple UIDs (${existingUid}, ${uid}).`,
      })
    }
    nameToUid.set(name.toLowerCase(), uid)

    const existing = byUid.get(uid)
    if (!existing) {
      byUid.set(uid, {
        uid,
        name,
        sourceSection,
        levelUp,
        setupEligible,
        productionEligible,
        setupPriority,
      })
      return
    }

    if (existing.name !== name) {
      issues.push({
        code: 'duplicate_person_uid_conflict',
        severity: 'warning',
        row: rowNumber,
        message: `UID ${uid} has conflicting names (${existing.name} vs ${name}). Keeping first name.`,
      })
    }

    existing.setupEligible = existing.setupEligible || setupEligible
    existing.productionEligible = existing.productionEligible || productionEligible
    existing.setupPriority = Math.min(existing.setupPriority, setupPriority)
    existing.levelUp = Math.max(existing.levelUp, levelUp)
    if (sourceSection === 'setup') existing.sourceSection = 'setup'
    byUid.set(uid, existing)
  })

  const profiles = Array.from(byUid.values()).sort((a, b) => {
    if (a.setupPriority !== b.setupPriority) return a.setupPriority - b.setupPriority
    return a.name.localeCompare(b.name)
  })

  return {
    profiles,
    issues,
    summary: {
      productionRowsDetected,
      setupRowsDetected,
      setupEligibleCount: profiles.filter(profile => profile.setupEligible).length,
      productionEligibleCount: profiles.filter(profile => profile.productionEligible).length,
    },
  }
}
