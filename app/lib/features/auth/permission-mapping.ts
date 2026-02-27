import {
  MAIN_DASHBOARD_CHILD_ITEMS,
  MAIN_DASHBOARD_ITEMS,
  MAIN_DASHBOARD_PARENT_ITEM,
} from './dashboard-permissions'

export type PermissionFlag = 'full' | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

export type PermissionItem = Record<PermissionFlag, boolean | undefined> & {
  isSubItem?: boolean
  parent?: string
  isCollapsible?: boolean
}

export type PermissionModule = {
  name: string
  items: Record<string, PermissionItem>
  specialPermissions?: string[]
}

export type PermissionModules = Record<string, PermissionModule>

const ACTION_ORDER: PermissionFlag[] = [
  'full',
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
]

const mergePermissions = (items: Array<PermissionItem | undefined>) => {
  const merged: Record<PermissionFlag, boolean> = {
    full: false,
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false,
  }

  items.forEach(item => {
    if (!item) return
    ACTION_ORDER.forEach(action => {
      if (item[action]) merged[action] = true
    })
  })

  return merged
}

const anyPermissionSet = (merged: Record<PermissionFlag, boolean>) =>
  ACTION_ORDER.some(action => merged[action])

const stripParentPrefix = (label: string, parent: string) => {
  const prefix = `${parent}: `
  if (label.startsWith(prefix)) return label.slice(prefix.length)
  const altPrefix = `${parent} - `
  if (label.startsWith(altPrefix)) return label.slice(altPrefix.length)
  return label
}

type UserAttendanceConfig = {
  prefix: string
  items: Record<string, string>
  allowCreate?: boolean
  allowEdit?: boolean
  createItems?: string[]
  editItems?: string[]
}

const WEB_USER_ATTENDANCE_MAP: Record<string, UserAttendanceConfig> = {
  Attendance: {
    prefix: 'attendance',
    items: {
      Overview: 'overview',
      Calendar: 'calendar',
      Timeline: 'timeline',
      History: 'history',
    },
  },
  FIR: {
    prefix: 'fir',
    items: {
      Dashboard: 'dashboard',
      Reports: 'reports',
      History: 'history',
      Category: 'category',
    },
    allowCreate: true,
    allowEdit: true,
    // FIR dashboard supports view/full only in current DB schema.
    createItems: ['reports', 'history', 'category'],
    editItems: ['reports', 'history', 'category'],
  },
  Calls: {
    prefix: 'calls',
    items: {
      Calls: 'calls',
      'Call Logs': 'call_logs',
      'Voice Record': 'voice_record',
      'Call Logs GPS': 'call_logs_gps',
    },
  },
  'Device Monitoring': {
    prefix: 'device_monitor',
    items: {
      Overview: 'overview',
      'Screen Time': 'screen_time',
      'App Usage': 'app_usage',
      Network: 'network',
      Storage: 'storage',
      Events: 'events',
      Bluetooth: 'bluetooth',
    },
  },
}

const MOBILE_USER_ATTENDANCE_MAP: Record<string, UserAttendanceConfig> = {
  Attendance: {
    prefix: 'mobile.attendance',
    items: {
      'Weekly Streak': 'weekly_streak',
      'Today Logs': 'today_logs',
      'Recent History': 'recent_history',
    },
  },
  Calendar: {
    prefix: 'mobile.attendance',
    items: {
      Calendar: 'calendar',
    },
  },
  FIR: {
    prefix: 'mobile.fir',
    items: {
      Dashboard: 'dashboard',
      Reports: 'reports',
      History: 'history',
      Category: 'category',
    },
    allowCreate: true,
    allowEdit: true,
  },
  'Device Monitoring': {
    prefix: 'mobile.device',
    items: {
      Overview: 'overview',
      'Screen Time': 'screen_time',
      'App Usage': 'app_usage',
      Network: 'network',
      Storage: 'storage',
      Events: 'events',
      Bluetooth: 'bluetooth',
      'Monitoring Settings': 'settings',
    },
    allowCreate: true,
    allowEdit: true,
    createItems: ['settings'],
    editItems: ['settings'],
  },
  Notification: {
    prefix: 'mobile',
    items: {
      Notification: 'notification',
    },
  },
  Account: {
    prefix: 'mobile.account',
    items: {
      'Account Settings': 'settings',
      'Password Reset': 'password_reset',
    },
  },
}

const USER_ATTENDANCE_MAP_BY_MODULE: Record<string, Record<string, UserAttendanceConfig>> = {
  user_attendance: WEB_USER_ATTENDANCE_MAP,
  web_user_attendance: WEB_USER_ATTENDANCE_MAP,
  mobile_user_attendance: MOBILE_USER_ATTENDANCE_MAP,
  tools_health: { 'Device Monitor': WEB_USER_ATTENDANCE_MAP['Device Monitoring'] },
}

const shallowCloneModules = (permissionModules: PermissionModules): PermissionModules => {
  const cloned: PermissionModules = {}
  Object.entries(permissionModules).forEach(([moduleKey, module]) => {
    const clonedItems: Record<string, PermissionItem> = {}
    Object.entries(module.items).forEach(([itemKey, item]) => {
      clonedItems[itemKey] = { ...item }
    })

    cloned[moduleKey] = {
      ...module,
      items: clonedItems,
    }
  })
  return cloned
}

const parseActionFromCode = (permissionCode: string): PermissionFlag | null => {
  for (const action of ACTION_ORDER) {
    if (permissionCode.endsWith(`.${action}`)) return action
  }
  return null
}

const findSubItemKey = (
  module: PermissionModule,
  parentName: string,
  childLabel: string
): string | null => {
  for (const [itemKey, item] of Object.entries(module.items)) {
    if (!item.isSubItem || item.parent !== parentName) continue
    if (stripParentPrefix(itemKey, parentName) === childLabel) return itemKey
  }
  return null
}

const getCodePrefixWithoutAction = (permissionCode: string, action: PermissionFlag): string => {
  return permissionCode.slice(0, -(action.length + 1))
}

const applyUserAttendanceCodeOverlay = (
  module: PermissionModule | undefined,
  moduleMap: Record<string, UserAttendanceConfig>,
  permissionCodes: string[]
) => {
  if (!module) return

  permissionCodes.forEach(permissionCode => {
    const action = parseActionFromCode(permissionCode)
    if (!action) return

    const prefixWithoutAction = getCodePrefixWithoutAction(permissionCode, action)

    Object.entries(moduleMap).forEach(([parentName, config]) => {
      Object.entries(config.items).forEach(([childLabel, itemCode]) => {
        const expectedPrefix = `${config.prefix}.${itemCode}`
        if (expectedPrefix !== prefixWithoutAction) return

        const itemKey = findSubItemKey(module, parentName, childLabel)
        if (!itemKey) return

        const current = module.items[itemKey]
        if (current[action] === undefined) return

        module.items[itemKey] = {
          ...current,
          [action]: true,
        }
      })
    })
  })
}

const applyMainDashboardCodeOverlay = (
  module: PermissionModule | undefined,
  permissionCodes: string[]
) => {
  if (!module) return

  const hasDashboardView = permissionCodes.includes('dashboard.view')
  const hasDashboardCreate = permissionCodes.includes('dashboard.create')
  if (!hasDashboardView && !hasDashboardCreate) return

  MAIN_DASHBOARD_ITEMS.forEach(itemKey => {
    const current = module.items[itemKey]
    if (!current) return

    const next: PermissionItem = {
      ...current,
      ...(hasDashboardView && current.view !== undefined ? { view: true } : {}),
      ...(hasDashboardCreate && current.export !== undefined ? { export: true } : {}),
    }

    module.items[itemKey] = next
  })
}

export function applyPermissionCodesToModules(
  permissionModules: PermissionModules,
  permissionCodes: string[]
): PermissionModules {
  const cloned = shallowCloneModules(permissionModules)
  if (!permissionCodes.length) return cloned

  applyMainDashboardCodeOverlay(cloned.main_dashboard, permissionCodes)

  Object.entries(USER_ATTENDANCE_MAP_BY_MODULE).forEach(([moduleKey, moduleMap]) => {
    applyUserAttendanceCodeOverlay(cloned[moduleKey], moduleMap, permissionCodes)
  })

  return cloned
}

export function recomputeParentFlagsFromChildren(
  permissionModules: PermissionModules
): PermissionModules {
  const cloned = shallowCloneModules(permissionModules)

  Object.values(cloned).forEach(module => {
    Object.entries(module.items).forEach(([parentKey, parentItem]) => {
      if (!parentItem.isCollapsible) return

      const childItems = Object.values(module.items).filter(
        item => item.isSubItem && item.parent === parentKey
      )
      if (!childItems.length) return

      ACTION_ORDER.forEach(action => {
        if (parentItem[action] === undefined) return

        const relevantChildren = childItems.filter(child => child[action] !== undefined)
        if (!relevantChildren.length) return

        parentItem[action] = relevantChildren.every(child => Boolean(child[action]))
      })

      module.items[parentKey] = {
        ...parentItem,
      }
    })
  })

  return cloned
}

const canCreateForItem = (config: UserAttendanceConfig, itemCode: string) =>
  Boolean(
    config.allowCreate &&
      // Mobile device create/edit are valid only for settings.
      (config.prefix !== 'mobile.device' || itemCode === 'settings') &&
      (!config.createItems || config.createItems.includes(itemCode))
  )

const canEditForItem = (config: UserAttendanceConfig, itemCode: string) =>
  Boolean(
    config.allowEdit &&
      // Mobile device create/edit are valid only for settings.
      (config.prefix !== 'mobile.device' || itemCode === 'settings') &&
      (!config.editItems || config.editItems.includes(itemCode))
  )

export function getModuleActionColumns(module: PermissionModule): PermissionFlag[] {
  return ACTION_ORDER.filter(action =>
    Object.values(module.items).some(item => item[action] !== undefined)
  )
}

const addUserAttendanceCodes = (
  module: PermissionModule | undefined,
  moduleKey: string,
  codes: Set<string>
) => {
  if (!module) return
  const moduleMap = USER_ATTENDANCE_MAP_BY_MODULE[moduleKey]
  if (!moduleMap) return

  const baseState: Record<string, { hasFull: boolean; hasAny: boolean }> = {}
  const matchedChildCodesByParent: Record<string, Set<string>> = {}

  Object.entries(module.items).forEach(([itemName, perms]) => {
    if (!perms.isSubItem || !perms.parent) return

    const config = moduleMap[perms.parent]
    if (!config) return
    const parentPerms = module.items[perms.parent]

    const itemLabel = stripParentPrefix(itemName, perms.parent)
    const itemCode = config.items[itemLabel]
    if (!itemCode) return

    const base = baseState[config.prefix] ?? { hasFull: false, hasAny: false }
    const matchedForParent = matchedChildCodesByParent[perms.parent] ?? new Set<string>()
    const inheritParentForChildren = moduleKey !== 'mobile_user_attendance'
    const effectiveFull = Boolean(
      perms.full || (inheritParentForChildren ? parentPerms?.full : false)
    )
    const effectiveView = Boolean(
      perms.view || (inheritParentForChildren ? parentPerms?.view : false) || effectiveFull
    )
    const effectiveCreate = Boolean(
      perms.create || (inheritParentForChildren ? parentPerms?.create : false) || effectiveFull
    )
    const effectiveEdit = Boolean(
      perms.edit || (inheritParentForChildren ? parentPerms?.edit : false) || effectiveFull
    )

    if (effectiveFull) {
      codes.add(`${config.prefix}.${itemCode}.full`)
      base.hasFull = true
      base.hasAny = true
    }

    if (effectiveView) {
      codes.add(`${config.prefix}.${itemCode}.view`)
      base.hasAny = true
    }

    const canCreateForCurrentItem = canCreateForItem(config, itemCode) && effectiveCreate
    if (canCreateForCurrentItem) {
      codes.add(`${config.prefix}.${itemCode}.create`)
      base.hasAny = true
    }

    const canEditForCurrentItem = canEditForItem(config, itemCode) && effectiveEdit
    if (canEditForCurrentItem) {
      codes.add(`${config.prefix}.${itemCode}.edit`)
      base.hasAny = true
    }

    const hasEffectiveSelection =
      effectiveFull || effectiveView || canCreateForCurrentItem || canEditForCurrentItem
    if (hasEffectiveSelection) {
      matchedForParent.add(itemCode)
      matchedChildCodesByParent[perms.parent] = matchedForParent
    }
    baseState[config.prefix] = base
  })

  // Backward-compatible fallback:
  // If a parent row has permissions but child rows are missing, fan out parent permissions.
  // Mobile User Attendance is strict subsection-based: parent rows never fan out.
  Object.entries(moduleMap).forEach(([parentName, config]) => {
    const parentPerms = module.items[parentName]
    if (!parentPerms) return

    if (
      moduleKey === 'mobile_user_attendance' ||
      moduleKey === 'web_user_attendance' ||
      moduleKey === 'tools_health'
    )
      return

    const matchedForParent = matchedChildCodesByParent[parentName] ?? new Set<string>()

    const missingChildCodes = Object.values(config.items).filter(
      itemCode => !matchedForParent.has(itemCode)
    )

    if (missingChildCodes.length === 0) return

    const effectiveFull = Boolean(parentPerms.full)
    const effectiveView = Boolean(parentPerms.view || effectiveFull)
    const effectiveCreate = Boolean(parentPerms.create || effectiveFull)
    const effectiveEdit = Boolean(parentPerms.edit || effectiveFull)

    if (!effectiveFull && !effectiveView && !effectiveCreate && !effectiveEdit) return

    const base = baseState[config.prefix] ?? { hasFull: false, hasAny: false }

    missingChildCodes.forEach(itemCode => {
      if (effectiveFull) {
        codes.add(`${config.prefix}.${itemCode}.full`)
        base.hasFull = true
        base.hasAny = true
      }

      if (effectiveView) {
        codes.add(`${config.prefix}.${itemCode}.view`)
        base.hasAny = true
      }

      if (canCreateForItem(config, itemCode) && effectiveCreate) {
        codes.add(`${config.prefix}.${itemCode}.create`)
        base.hasAny = true
      }

      if (canEditForItem(config, itemCode) && effectiveEdit) {
        codes.add(`${config.prefix}.${itemCode}.edit`)
        base.hasAny = true
      }
    })

    baseState[config.prefix] = base
  })

  Object.entries(baseState).forEach(([prefix, state]) => {
    if (
      moduleKey === 'mobile_user_attendance' ||
      moduleKey === 'web_user_attendance' ||
      moduleKey === 'tools_health'
    )
      return
    if (state.hasFull) {
      codes.add(`${prefix}.view_all`)
    } else if (state.hasAny) {
      codes.add(`${prefix}.view_own`)
    }
  })
}

export function buildPermissionCodes(permissionModules: PermissionModules): string[] {
  const codes = new Set<string>()

  addUserAttendanceCodes(permissionModules.web_user_attendance, 'web_user_attendance', codes)
  addUserAttendanceCodes(permissionModules.mobile_user_attendance, 'mobile_user_attendance', codes)
  addUserAttendanceCodes(permissionModules.user_attendance, 'user_attendance', codes)
  addUserAttendanceCodes(permissionModules.tools_health, 'tools_health', codes)
  // Marker to disable legacy mobile fallback and enforce explicit mobile section permissions.
  if (permissionModules.mobile_user_attendance) {
    codes.add('mobile.rbac.enabled')
  }

  const mainDashboard = permissionModules.main_dashboard
  if (mainDashboard) {
    const merged = mergePermissions([
      mainDashboard.items[MAIN_DASHBOARD_PARENT_ITEM],
      ...MAIN_DASHBOARD_CHILD_ITEMS.map(itemKey => mainDashboard.items[itemKey]),
    ])
    if (merged.full) {
      codes.add('dashboard.view')
      codes.add('dashboard.create')
    } else {
      if (merged.view) codes.add('dashboard.view')
      if (merged.export) codes.add('dashboard.create')
    }
  }

  const mainScheduling = permissionModules.main_scheduling
  if (mainScheduling) {
    const merged = mergePermissions([
      mainScheduling.items['Schedule Generator'],
      mainScheduling.items['Schedule Generator Dashboard'],
    ])

    if (merged.full) {
      codes.add('schedule.view')
      codes.add('schedule.create')
      codes.add('schedule.edit')
      codes.add('schedule.delete')
      codes.add('schedule.approve')
      codes.add('schedule.run.basic')
      codes.add('schedule.run.advanced')
    } else {
      if (merged.view) codes.add('schedule.view')
      if (merged.create) codes.add('schedule.create')
      if (merged.edit) codes.add('schedule.edit')
      if (merged.delete) codes.add('schedule.delete')
      if (merged.approve) codes.add('schedule.approve')
      if (merged.create || merged.edit || merged.approve) codes.add('schedule.run.basic')
      if (merged.edit || merged.approve) codes.add('schedule.run.advanced')
    }
  }

  const mainAnalytics = permissionModules.main_analytics
  if (mainAnalytics) {
    const merged = mergePermissions([
      mainAnalytics.items['Chart'],
      mainAnalytics.items['Analytics'],
    ])

    if (merged.view || merged.full) codes.add('analytics.view')
    if (merged.export || merged.full) codes.add('analytics.edit')
  }

  const mainAttendance = permissionModules.main_attendance
  if (mainAttendance) {
    const merged = mergePermissions([
      mainAttendance.items['Attendance'],
      mainAttendance.items['Standalone Attendance'],
    ])

    if (merged.full) codes.add('attendance.view_all')
    if (merged.view) codes.add('attendance.view_own')
    if (merged.create || merged.edit || merged.delete || merged.full) {
      codes.add('attendance.sync')
    }
  }

  const adminUsers = permissionModules.admin_users
  if (adminUsers) {
    const merged = mergePermissions([adminUsers.items['User Management']])
    if (merged.view || merged.full) codes.add('users.view')
    if (merged.create || merged.edit || merged.delete || merged.full) {
      codes.add('users.view')
      codes.add('manage_users')
      codes.add('users.edit')
    }
    if (merged.full) codes.add('users.permissions')
  }

  const adminAddUsers = permissionModules.admin_add_users
  if (adminAddUsers) {
    const merged = mergePermissions([adminAddUsers.items['Add Users']])
    if (merged.view || merged.full) codes.add('users.view')
    if (merged.create || merged.edit || merged.delete || merged.full) {
      codes.add('users.view')
      codes.add('manage_users')
      codes.add('users.edit')
    }
  }

  const adminRoles = permissionModules.admin_roles
  if (adminRoles) {
    const merged = mergePermissions([adminRoles.items['Role Profiles']])
    if (merged.view || merged.full) codes.add('roles.view')
    if (merged.create || merged.edit || merged.delete || merged.full) {
      codes.add('roles.manage')
      codes.add('assign_roles')
    }
  }

  const adminActivity = permissionModules.admin_activity
  if (adminActivity) {
    const merged = mergePermissions([adminActivity.items['Activity Logging']])
    if (merged.view || merged.delete || merged.full) codes.add('system.audit')
  }

  const adminSystem = permissionModules.admin_system
  if (adminSystem) {
    const merged = mergePermissions([adminSystem.items['System Settings']])
    if (anyPermissionSet(merged)) codes.add('admin')
  }

  const adminAccount = permissionModules.admin_account
  if (adminAccount) {
    const merged = mergePermissions([adminAccount.items['Organization Settings']])
    if (anyPermissionSet(merged)) codes.add('admin')
  }

  const toolsShift = permissionModules.tools_shift
  if (toolsShift) {
    const merged = mergePermissions([toolsShift.items['Shift Management']])
    if (merged.full) {
      codes.add('schedule.view')
      codes.add('schedule.create')
      codes.add('schedule.edit')
      codes.add('schedule.delete')
      codes.add('schedule.approve')
      codes.add('schedule.run.basic')
      codes.add('schedule.run.advanced')
    } else {
      if (merged.view) codes.add('schedule.view')
      if (merged.create) codes.add('schedule.create')
      if (merged.edit) codes.add('schedule.edit')
      if (merged.delete) codes.add('schedule.delete')
      if (merged.approve) codes.add('schedule.approve')
      if (merged.create || merged.edit || merged.approve) codes.add('schedule.run.basic')
      if (merged.edit || merged.approve) codes.add('schedule.run.advanced')
    }
  }

  const toolsLeave = permissionModules.tools_leave
  if (toolsLeave) {
    const merged = mergePermissions([toolsLeave.items['Leave Management']])
    if (merged.view || merged.full) codes.add('schedule.view')
    if (merged.create || merged.edit || merged.delete || merged.full) {
      codes.add('leave.edit')
    }
    if (merged.approve || merged.full) codes.add('leave.approve')
  }

  const toolsFir = permissionModules.tools_fir
  if (toolsFir) {
    const merged = mergePermissions([toolsFir.items['FIR Reporter']])
    if (merged.full) {
      codes.add('fir.view_all')
      codes.add('fir.reports.create')
      codes.add('fir.reports.edit')
    } else {
      if (merged.view) codes.add('fir.view_own')
      if (merged.create) codes.add('fir.reports.create')
      if (merged.edit) codes.add('fir.reports.edit')
      if (merged.approve) codes.add('fir.view_all')
    }
  }

  return Array.from(codes)
}
