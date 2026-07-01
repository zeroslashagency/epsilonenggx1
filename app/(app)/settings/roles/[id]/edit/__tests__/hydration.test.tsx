import { initialPermissionModules } from '@/app/(app)/settings/roles/permissionData'
import {
  applyPermissionCodesToModules,
  PermissionModule,
  recomputeParentFlagsFromChildren,
} from '@/app/lib/features/auth/permission-mapping'

const buildCleanPermissions = () => {
  const cleanPermissions: Record<string, PermissionModule> = {}

  Object.keys(initialPermissionModules).forEach(moduleKey => {
    cleanPermissions[moduleKey] = {
      name: initialPermissionModules[moduleKey].name,
      specialPermissions: initialPermissionModules[moduleKey].specialPermissions,
      items: {},
    }

    Object.keys(initialPermissionModules[moduleKey].items).forEach(itemKey => {
      const originalItem = initialPermissionModules[moduleKey].items[itemKey]
      cleanPermissions[moduleKey].items[itemKey] = {
        full: false,
        view: false,
        ...('create' in originalItem && { create: false }),
        ...('edit' in originalItem && { edit: false }),
        ...('delete' in originalItem && { delete: false }),
        ...(originalItem.approve !== undefined && { approve: false }),
        ...(originalItem.export !== undefined && { export: false }),
        ...(originalItem.isSubItem !== undefined && { isSubItem: originalItem.isSubItem }),
        ...(originalItem.parent !== undefined && { parent: originalItem.parent }),
        ...(originalItem.isCollapsible !== undefined && {
          isCollapsible: originalItem.isCollapsible,
        }),
      }
    })
  })

  return cleanPermissions
}

describe('Edit role hydration (mobile_user_attendance)', () => {
  test('hydrates stale JSON with effective mobile codes onto subsection items', () => {
    const cleanPermissions = buildCleanPermissions()

    const withEffectiveCodes = applyPermissionCodesToModules(cleanPermissions, [
      'mobile.attendance.recent_history.view',
      'mobile.fir.history.view',
    ])
    const hydrated = recomputeParentFlagsFromChildren(withEffectiveCodes)

    expect(hydrated.mobile_user_attendance.items['Attendance: Recent History'].view).toBe(true)
    expect(hydrated.mobile_user_attendance.items['FIR: History'].view).toBe(true)
  })

  test('parent Attendance row aggregates true when all mobile subsections are viewable', () => {
    const cleanPermissions = buildCleanPermissions()
    const withEffectiveCodes = applyPermissionCodesToModules(cleanPermissions, [
      'mobile.attendance.weekly_streak.view',
      'mobile.attendance.today_logs.view',
      'mobile.attendance.recent_history.view',
    ])
    const hydrated = recomputeParentFlagsFromChildren(withEffectiveCodes)

    expect(hydrated.mobile_user_attendance.items['Attendance: Weekly Streak'].view).toBe(true)
    expect(hydrated.mobile_user_attendance.items['Attendance: Today Logs'].view).toBe(true)
    expect(hydrated.mobile_user_attendance.items['Attendance: Recent History'].view).toBe(true)
    expect(hydrated.mobile_user_attendance.items.Attendance.view).toBe(true)
  })

  test('parent Attendance row is false when a mobile subsection is missing', () => {
    const cleanPermissions = buildCleanPermissions()
    const withEffectiveCodes = applyPermissionCodesToModules(cleanPermissions, [
      'mobile.attendance.weekly_streak.view',
      'mobile.attendance.recent_history.view',
    ])
    const hydrated = recomputeParentFlagsFromChildren(withEffectiveCodes)

    expect(hydrated.mobile_user_attendance.items.Attendance.view).toBe(false)
  })
})
