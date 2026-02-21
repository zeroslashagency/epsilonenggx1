import {
  applyPermissionCodesToModules,
  buildPermissionCodes,
  PermissionModules,
  recomputeParentFlagsFromChildren,
} from '@/app/lib/features/auth/permission-mapping'
import { MAIN_DASHBOARD_CHILD_ITEMS } from '@/app/lib/features/auth/dashboard-permissions'

const buildWebUserAttendanceFixture = (): PermissionModules => ({
  web_user_attendance: {
    name: 'Web User Attendance',
    items: {
      Attendance: { full: false, view: false, isCollapsible: true },
      'Attendance: Overview': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      'Attendance: Calendar': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      'Attendance: Timeline': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      'Attendance: History': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
    },
  },
})

describe('permission-mapping helpers', () => {
  test('recomputeParentFlagsFromChildren sets parent true when all children are true', () => {
    const fixture = buildWebUserAttendanceFixture()
    fixture.web_user_attendance.items['Attendance: Overview'].view = true
    fixture.web_user_attendance.items['Attendance: Calendar'].view = true
    fixture.web_user_attendance.items['Attendance: Timeline'].view = true
    fixture.web_user_attendance.items['Attendance: History'].view = true

    const recomputed = recomputeParentFlagsFromChildren(fixture)

    expect(recomputed.web_user_attendance.items.Attendance.view).toBe(true)
  })

  test('recomputeParentFlagsFromChildren sets parent false when any child is false', () => {
    const fixture = buildWebUserAttendanceFixture()
    fixture.web_user_attendance.items['Attendance: Overview'].view = true
    fixture.web_user_attendance.items['Attendance: Calendar'].view = false
    fixture.web_user_attendance.items['Attendance: Timeline'].view = true
    fixture.web_user_attendance.items['Attendance: History'].view = true

    const recomputed = recomputeParentFlagsFromChildren(fixture)

    expect(recomputed.web_user_attendance.items.Attendance.view).toBe(false)
  })

  test('recomputeParentFlagsFromChildren only computes actions that children expose', () => {
    const fixture: PermissionModules = {
      web_user_attendance: {
        name: 'Web User Attendance',
        items: {
          FIR: { full: false, view: false, create: false, edit: false, isCollapsible: true },
          'FIR: Dashboard': {
            full: false,
            view: true,
            isSubItem: true,
            parent: 'FIR',
          },
          'FIR: Reports': {
            full: false,
            view: true,
            create: false,
            edit: false,
            isSubItem: true,
            parent: 'FIR',
          },
        },
      },
    }

    const recomputed = recomputeParentFlagsFromChildren(fixture)

    expect(recomputed.web_user_attendance.items.FIR.view).toBe(true)
    expect(recomputed.web_user_attendance.items.FIR.create).toBe(false)
    expect(recomputed.web_user_attendance.items.FIR.edit).toBe(false)
  })

  test('applyPermissionCodesToModules overlays effective child permissions', () => {
    const fixture = buildWebUserAttendanceFixture()

    const result = applyPermissionCodesToModules(fixture, ['attendance.history.view'])

    expect(result.web_user_attendance.items['Attendance: History'].view).toBe(true)
    expect(result.web_user_attendance.items['Attendance: Overview'].view).toBe(false)
  })

  test('buildPermissionCodes does not emit fir.dashboard.create/edit from web FIR parent', () => {
    const fixture: PermissionModules = {
      web_user_attendance: {
        name: 'Web User Attendance',
        items: {
          FIR: {
            full: false,
            view: false,
            create: true,
            edit: true,
            isCollapsible: true,
          },
          'FIR: Dashboard': {
            full: false,
            view: true,
            isSubItem: true,
            parent: 'FIR',
          },
          'FIR: Reports': {
            full: false,
            view: true,
            create: true,
            edit: true,
            isSubItem: true,
            parent: 'FIR',
          },
          'FIR: History': {
            full: false,
            view: true,
            create: true,
            edit: true,
            isSubItem: true,
            parent: 'FIR',
          },
          'FIR: Category': {
            full: false,
            view: true,
            create: true,
            edit: true,
            isSubItem: true,
            parent: 'FIR',
          },
        },
      },
    }

    const codes = buildPermissionCodes(fixture)
    expect(codes).toContain('fir.reports.create')
    expect(codes).toContain('fir.history.create')
    expect(codes).toContain('fir.category.create')
    expect(codes).not.toContain('fir.dashboard.create')
    expect(codes).not.toContain('fir.dashboard.edit')
  })

  test('applyPermissionCodesToModules overlays dashboard codes to dashboard children', () => {
    const fixture: PermissionModules = {
      main_dashboard: {
        name: 'MAIN - Dashboard',
        items: {
          Dashboard: { full: false, view: false, export: false, isCollapsible: true },
          'Overview Widget': {
            full: false,
            view: false,
            export: false,
            isSubItem: true,
            parent: 'Dashboard',
          },
          'Production Metrics': {
            full: false,
            view: false,
            export: false,
            isSubItem: true,
            parent: 'Dashboard',
          },
          'Recent Activity': { full: false, view: false, isSubItem: true, parent: 'Dashboard' },
          'Machine Status Table': {
            full: false,
            view: false,
            export: false,
            isSubItem: true,
            parent: 'Dashboard',
          },
          'Alerts Panel': { full: false, view: false, isSubItem: true, parent: 'Dashboard' },
        },
      },
    }

    const mapped = applyPermissionCodesToModules(fixture, ['dashboard.view', 'dashboard.create'])

    expect(mapped.main_dashboard.items.Dashboard.view).toBe(true)
    expect(mapped.main_dashboard.items.Dashboard.export).toBe(true)
    MAIN_DASHBOARD_CHILD_ITEMS.forEach(itemKey => {
      expect(mapped.main_dashboard.items[itemKey].view).toBe(true)
    })
    expect(mapped.main_dashboard.items['Overview Widget'].export).toBe(true)
    expect(mapped.main_dashboard.items['Machine Status Table'].export).toBe(true)
  })

  test('buildPermissionCodes emits dashboard codes when dashboard child is selected', () => {
    const fixture: PermissionModules = {
      main_dashboard: {
        name: 'MAIN - Dashboard',
        items: {
          Dashboard: { full: false, view: false, export: false, isCollapsible: true },
          'Overview Widget': {
            full: false,
            view: true,
            export: true,
            isSubItem: true,
            parent: 'Dashboard',
          },
        },
      },
    }

    const codes = buildPermissionCodes(fixture)
    expect(codes).toContain('dashboard.view')
    expect(codes).toContain('dashboard.create')
  })
})
