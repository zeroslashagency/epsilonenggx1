/**
 * Permission Checker Utility for 82-item Dual-Mode Permission System
 * Handles granular permission checks for parent and sub-item permissions
 */

export interface PermissionModuleItem {
  full: boolean
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  approve?: boolean
  export?: boolean
  isSubItem?: boolean
  parent?: string
  isCollapsible?: boolean
}

export interface PermissionModule {
  name: string
  items: Record<string, PermissionModuleItem>
  specialPermissions?: string[]
}

export type PermissionAction = 'full' | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

/**
 * Check if user has a specific permission action
 * @param permissions - User's permission modules from database
 * @param moduleKey - Module key (e.g., 'main_attendance')
 * @param itemKey - Item key (e.g., 'Attendance' or 'Export Excel')
 * @param action - Action to check (e.g., 'view', 'export')
 * @returns boolean indicating if user has permission
 */
export function hasPermission(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string,
  action: PermissionAction
): boolean {
  // No permissions = no access
  if (!permissions || !permissions[moduleKey]) {
    return false
  }

  const module = permissions[moduleKey]
  const item = module.items[itemKey]

  if (!item) {
    return false
  }

  // Full permission grants all actions
  if (item.full) {
    return true
  }

  // Check specific action
  return item[action] === true
}

/**
 * Check if user has any access to a module item (any action enabled)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user has any access
 */
export function hasAnyAccess(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  if (!permissions || !permissions[moduleKey]) {
    return false
  }

  const item = permissions[moduleKey].items[itemKey]
  if (!item) {
    return false
  }

  // Check if any action is enabled
  return item.full || item.view || item.create || item.edit || item.delete || 
         item.approve === true || item.export === true
}

/**
 * Check if user can view a page (has view or higher permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can view
 */
export function canView(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'view') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Check if user can edit (has edit or full permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can edit
 */
export function canEdit(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'edit') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Check if user can create (has create or full permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can create
 */
export function canCreate(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'create') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Check if user can delete (has delete or full permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can delete
 */
export function canDelete(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'delete') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Check if user can export (has export or full permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can export
 */
export function canExport(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'export') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Check if user can approve (has approve or full permission)
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns boolean indicating if user can approve
 */
export function canApprove(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): boolean {
  return hasPermission(permissions, moduleKey, itemKey, 'approve') ||
         hasPermission(permissions, moduleKey, itemKey, 'full')
}

/**
 * Get all enabled actions for a permission item
 * @param permissions - User's permission modules
 * @param moduleKey - Module key
 * @param itemKey - Item key
 * @returns Array of enabled action names
 */
export function getEnabledActions(
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string,
  itemKey: string
): PermissionAction[] {
  if (!permissions || !permissions[moduleKey]) {
    return []
  }

  const item = permissions[moduleKey].items[itemKey]
  if (!item) {
    return []
  }

  const actions: PermissionAction[] = []

  if (item.full) return ['full', 'view', 'create', 'edit', 'delete', 'approve', 'export']
  if (item.view) actions.push('view')
  if (item.create) actions.push('create')
  if (item.edit) actions.push('edit')
  if (item.delete) actions.push('delete')
  if (item.approve) actions.push('approve')
  if (item.export) actions.push('export')

  return actions
}

/**
 * Check multiple permissions at once
 * @param permissions - User's permission modules
 * @param checks - Array of permission checks
 * @returns Object with results for each check
 */
export function checkMultiplePermissions(
  permissions: Record<string, PermissionModule> | null | undefined,
  checks: Array<{ moduleKey: string; itemKey: string; action: PermissionAction }>
): Record<string, boolean> {
  const results: Record<string, boolean> = {}

  checks.forEach(check => {
    const key = `${check.moduleKey}.${check.itemKey}.${check.action}`
    results[key] = hasPermission(permissions, check.moduleKey, check.itemKey, check.action)
  })

  return results
}

/**
 * Attendance-specific permission checks
 */
export const AttendancePermissions = {
  canViewTodaysActivity: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_attendance', "Today's Recent Activity"),
  
  canViewAllRecords: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_attendance', 'All Track Records'),
  
  canExportRecords: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canExport(permissions, 'main_attendance', 'All Track Records'),
  
  canExportExcel: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canExport(permissions, 'main_attendance', 'Export Excel'),
  
  canAccessStandalone: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasAnyAccess(permissions, 'main_attendance', 'Standalone Attendance')
}

/**
 * Chart-specific permission checks
 */
export const ChartPermissions = {
  canViewCharts: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_charts', 'Chart'),
  
  canViewTimeline: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_charts', 'Timeline View'),
  
  canViewGantt: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_charts', 'Gantt Chart'),
  
  canViewKPI: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_charts', 'KPI Charts'),
  
  canExportCharts: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canExport(permissions, 'main_charts', 'Chart')
}

/**
 * Analytics-specific permission checks
 */
export const AnalyticsPermissions = {
  canViewAnalytics: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_analytics', 'Analytics'),
  
  canViewProduction: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_analytics', 'Production Efficiency'),
  
  canViewQuality: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_analytics', 'Quality Analytics'),
  
  canViewMachine: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_analytics', 'Machine Analytics')
}
