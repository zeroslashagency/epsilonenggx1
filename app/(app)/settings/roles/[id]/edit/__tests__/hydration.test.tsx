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

describe('Edit role hydration', () => {
  test('hydrates stale JSON with effective codes and keeps parent aggregate correct', () => {
    const cleanPermissions = buildCleanPermissions()

    // Simulate stale JSON where nothing is checked.
    const withEffectiveCodes = applyPermissionCodesToModules(cleanPermissions, [
      'attendance.history.view',
      'fir.history.view',
    ])
    const hydrated = recomputeParentFlagsFromChildren(withEffectiveCodes)

    expect(hydrated.web_user_attendance.items['Attendance: History'].view).toBe(true)
    expect(hydrated.web_user_attendance.items.Attendance.view).toBe(false)
    expect(hydrated.web_user_attendance.items['FIR: History'].view).toBe(true)
    expect(hydrated.web_user_attendance.items.FIR.view).toBe(false)
  })

  test('parent row becomes true when all subsection view permissions are present', () => {
    const cleanPermissions = buildCleanPermissions()
    const withEffectiveCodes = applyPermissionCodesToModules(cleanPermissions, [
      'attendance.overview.view',
      'attendance.calendar.view',
      'attendance.timeline.view',
      'attendance.history.view',
    ])
    const hydrated = recomputeParentFlagsFromChildren(withEffectiveCodes)

    expect(hydrated.web_user_attendance.items.Attendance.view).toBe(true)
  })
})
