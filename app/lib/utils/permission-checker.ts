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

const resolveModuleKey = (
  permissions: Record<string, PermissionModule> | null | undefined,
  moduleKey: string
) => {
  if (permissions?.[moduleKey]) return moduleKey
  if ((moduleKey === 'web_user_attendance' || moduleKey === 'mobile_user_attendance') && permissions?.user_attendance) {
    return 'user_attendance'
  }
  return moduleKey
}

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
  const resolvedModuleKey = resolveModuleKey(permissions, moduleKey)
  if (!permissions || !permissions[resolvedModuleKey]) {
    return false
  }

  const module = permissions[resolvedModuleKey]
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
  const resolvedModuleKey = resolveModuleKey(permissions, moduleKey)
  if (!permissions || !permissions[resolvedModuleKey]) {
    return false
  }

  const item = permissions[resolvedModuleKey].items[itemKey]
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
 * Check if user has Super Admin role (fallback when permissions_json is missing)
 */
export function isSuperAdmin(userRole: string | null | undefined): boolean {
  if (!userRole) return false
  return userRole === 'Super Admin' || userRole === 'super_admin'
}

const hasAnyUserAttendanceAccess = (permissions: Record<string, PermissionModule> | null | undefined) =>
  canView(permissions, 'web_user_attendance', 'Attendance: Overview') ||
  canView(permissions, 'web_user_attendance', 'Attendance: Calendar') ||
  canView(permissions, 'web_user_attendance', 'Attendance: Timeline') ||
  canView(permissions, 'web_user_attendance', 'Attendance: History')

/**
 * Attendance-specific permission checks
 */
export const AttendancePermissions = {
  canViewTodaysActivity: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_attendance', 'Attendance') || hasAnyUserAttendanceAccess(permissions),
  
  canViewAllRecords: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_attendance', 'Attendance') || hasAnyUserAttendanceAccess(permissions),
  
  canExportRecords: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || hasPermission(permissions, 'main_attendance', 'Attendance', 'edit'),
  
  canExportExcel: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || hasPermission(permissions, 'main_attendance', 'Attendance', 'edit'),
  
  canAccessStandalone: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || hasAnyAccess(permissions, 'main_attendance', 'Standalone Attendance')
}

/**
 * Chart-specific permission checks
 */
export const ChartPermissions = {
  canViewCharts: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Chart'),
  
  canViewTimeline: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Chart'),
  
  canViewGantt: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Chart'),
  
  canViewKPI: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Chart'),
  
  canExportCharts: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Chart')
}

/**
 * Analytics-specific permission checks
 */
export const AnalyticsPermissions = {
  canViewAnalytics: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Analytics'),
  
  canViewProduction: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Analytics'),
  
  canViewEfficiency: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Analytics'),
  
  canViewQuality: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Analytics'),
  
  canViewMachine: (permissions: Record<string, PermissionModule> | null | undefined, userRole?: string | null) =>
    isSuperAdmin(userRole) || canView(permissions, 'main_analytics', 'Analytics')
}

/**
 * Scheduling-specific permission checks
 */
export const SchedulingPermissions = {
  canViewScheduleGenerator: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator'),
  
  canViewScheduleDashboard: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator Dashboard'),
  
  canCreateSchedule: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'main_scheduling', 'Schedule Generator', 'create'),
  
  canEditSchedule: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'main_scheduling', 'Schedule Generator', 'edit'),
  
  canPublishSchedule: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'main_scheduling', 'Schedule Generator', 'approve'),
  
  canViewScheduleHistory: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator'),
  
  canViewTimeline: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator'),
  
  canViewCalendar: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator'),
  
  canViewListView: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator'),
  
  canViewFilterOptions: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'main_scheduling', 'Schedule Generator')
}

/**
 * Production-specific permission checks
 */
export const ProductionPermissions = {
  canViewOrders: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Orders'),
  
  canViewMachines: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Machines'),
  
  canViewPersonnel: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Personnel'),
  
  canViewTasks: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Tasks'),
  
  canCreateOrder: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Create Order', 'create'),
  
  canEditOrder: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Edit Order', 'edit'),
  
  canApproveOrder: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Order Approval', 'approve'),
  
  canViewOrderStatus: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Order Status'),
  
  canViewMachineList: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Machine List'),
  
  canViewMachineStatus: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Machine Status'),
  
  canViewMachineConfiguration: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Machine Configuration'),
  
  canViewPersonnelList: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Personnel List'),
  
  canViewShiftAssignment: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Shift Assignment'),
  
  canViewSkillManagement: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Skill Management'),
  
  canCreateTask: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Create Task', 'create'),
  
  canAssignTask: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Task Assignment', 'edit'),
  
  canCompleteTask: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'production', 'Task Completion', 'approve'),
  
  canViewTaskProgress: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'production', 'Task Progress')
}

/**
 * Monitoring-specific permission checks
 */
export const MonitoringPermissions = {
  canViewAlerts: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Alerts'),
  
  canViewReports: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Reports'),
  
  canViewQualityControl: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Quality Control'),
  
  canViewMaintenance: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Maintenance'),
  
  canCreateAlertRules: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Create Alert Rules', 'create'),
  
  canViewAlertsDashboard: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'View Alerts'),
  
  canViewAlertHistory: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Alert History'),
  
  canGenerateReports: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Generate Reports', 'create'),
  
  canViewScheduledReports: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Scheduled Reports'),
  
  canViewReportTemplates: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Report Templates'),
  
  canCreateQualityInspections: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Quality Inspections', 'create'),
  
  canApproveQuality: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Quality Approvals', 'approve'),
  
  canViewQualityMetrics: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Quality Metrics'),
  
  canCreateMaintenanceRequests: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Maintenance Requests', 'create'),
  
  canApproveMaintenance: (permissions: Record<string, PermissionModule> | null | undefined) =>
    hasPermission(permissions, 'monitoring', 'Maintenance Approval', 'approve'),
  
  canViewMaintenanceSchedule: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Maintenance Schedule'),
  
  canViewMaintenanceHistory: (permissions: Record<string, PermissionModule> | null | undefined) =>
    canView(permissions, 'monitoring', 'Maintenance History')
}
