export const MAIN_DASHBOARD_PARENT_ITEM = 'Dashboard' as const

export const MAIN_DASHBOARD_CHILD_ITEMS = [
  'Overview Widget',
  'Production Metrics',
  'Recent Activity',
  'Machine Status Table',
  'Alerts Panel',
] as const

export const MAIN_DASHBOARD_ITEMS = [
  MAIN_DASHBOARD_PARENT_ITEM,
  ...MAIN_DASHBOARD_CHILD_ITEMS,
] as const

type DashboardAction = 'full' | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

type DashboardPermissionItem = {
  full?: boolean
  view?: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
  approve?: boolean
  export?: boolean
}

const hasAction = (item: DashboardPermissionItem | undefined, action: DashboardAction): boolean => {
  if (!item) return false
  return item.full === true || item[action] === true
}

const getMainDashboardItems = (
  permissionModules: unknown
): Record<string, DashboardPermissionItem> => {
  if (!permissionModules || typeof permissionModules !== 'object' || Array.isArray(permissionModules)) {
    return {}
  }

  const mainDashboard = (permissionModules as Record<string, unknown>).main_dashboard
  if (!mainDashboard || typeof mainDashboard !== 'object' || Array.isArray(mainDashboard)) {
    return {}
  }

  const items = (mainDashboard as { items?: unknown }).items
  if (!items || typeof items !== 'object' || Array.isArray(items)) {
    return {}
  }

  return items as Record<string, DashboardPermissionItem>
}

export const hasMainDashboardPermission = (
  permissionModules: unknown,
  action: DashboardAction = 'view',
  itemKey: string = MAIN_DASHBOARD_PARENT_ITEM
): boolean => {
  const items = getMainDashboardItems(permissionModules)
  if (!Object.keys(items).length) return false

  const parentItem = items[MAIN_DASHBOARD_PARENT_ITEM]
  const requestedItem = items[itemKey]

  if (hasAction(requestedItem, action)) {
    return true
  }

  if (itemKey !== MAIN_DASHBOARD_PARENT_ITEM && hasAction(parentItem, action)) {
    return true
  }

  if (itemKey === MAIN_DASHBOARD_PARENT_ITEM) {
    return MAIN_DASHBOARD_CHILD_ITEMS.some(childItem => hasAction(items[childItem], action))
  }

  return false
}

export const hasAnyMainDashboardPermission = (
  permissionModules: unknown,
  action: DashboardAction = 'view'
): boolean => {
  if (hasMainDashboardPermission(permissionModules, action, MAIN_DASHBOARD_PARENT_ITEM)) {
    return true
  }

  return MAIN_DASHBOARD_CHILD_ITEMS.some(childItem =>
    hasMainDashboardPermission(permissionModules, action, childItem)
  )
}
