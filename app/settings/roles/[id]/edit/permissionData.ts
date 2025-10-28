// Complete 82-item dual-mode permission structure
// Generated from ROLE_PROFILE_DUAL_MODE_IMPLEMENTATION.md

export interface ModulePermission {
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
  items: Record<string, ModulePermission>
  specialPermissions?: string[]
}

export const initialPermissionModules: Record<string, PermissionModule> = {
  // 1. MAIN - Dashboard (1 parent + 3 sub-items = 4)
  main_dashboard: {
    name: 'MAIN - Dashboard',
    items: {
      'Dashboard': {
        full: false,
        view: true,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Overview Widget': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Production Metrics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Recent Activity': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Dashboard'
      }
    },
    specialPermissions: ['Allow users to export dashboard data', 'Allow users to customize dashboard layout']
  },

  // 2. MAIN - Scheduling (2 parents + 7 sub-items = 9)
  main_scheduling: {
    name: 'MAIN - Scheduling',
    items: {
      'Schedule Generator': {
        full: false,
        view: true,
        create: true,
        edit: true,
        delete: false,
        approve: false,
        isCollapsible: true
      },
      'Create Schedule': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Edit Schedule': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Publish Schedule': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Schedule History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Schedule Generator Dashboard': {
        full: false,
        view: true,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Timeline View': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'Calendar View': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'Statistics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      }
    },
    specialPermissions: ['Allow users to override schedule conflicts', 'Allow users to publish schedules']
  },

  // 3. MAIN - Charts (1 parent + 3 sub-items = 4)
  main_charts: {
    name: 'MAIN - Charts',
    items: {
      'Chart': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Timeline View': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Chart'
      },
      'Gantt Chart': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Chart'
      },
      'KPI Charts': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Chart'
      }
    },
    specialPermissions: ['Allow users to export chart data', 'Allow users to create custom reports']
  },

  // 4. MAIN - Analytics (1 parent + 3 sub-items = 4)
  main_analytics: {
    name: 'MAIN - Analytics',
    items: {
      'Analytics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Production Efficiency': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Quality Analytics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Machine Analytics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Analytics'
      }
    },
    specialPermissions: ['Allow users to export sensitive data']
  },

  // 5. MAIN - Attendance (2 parents + 6 sub-items = 8)
  main_attendance: {
    name: 'MAIN - Attendance',
    items: {
      'Attendance': {
        full: false,
        view: true,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      "Today's Recent Activity": {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Attendance'
      },
      'All Track Records': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
        isSubItem: true,
        parent: 'Attendance'
      },
      'Export Excel': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
        isSubItem: true,
        parent: 'Attendance'
      },
      'Standalone Attendance': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Employee Self-Service': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      },
      'Attendance Sync': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      },
      'Attendance Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      }
    },
    specialPermissions: ['Allow users to modify attendance for others', 'Allow users to approve leave requests', 'Allow users to sync attendance data']
  },

  // 6. PRODUCTION (4 parents + 12 sub-items = 16)
  production: {
    name: 'PRODUCTION',
    items: {
      'Orders': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isCollapsible: true
      },
      'Create Order': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Edit Order': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Order Status': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Order Approval': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Machines': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Machine List': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Machines'
      },
      'Machine Status': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Machines'
      },
      'Machine Configuration': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Machines'
      },
      'Personnel': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Personnel List': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Personnel'
      },
      'Shift Assignment': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Personnel'
      },
      'Skill Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Personnel'
      },
      'Tasks': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isCollapsible: true
      },
      'Create Task': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Assignment': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Progress': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Completion': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Tasks'
      }
    },
    specialPermissions: ['Allow users to halt production lines', 'Allow users to emergency stop machines', 'Allow users to modify production schedules']
  },

  // 7. MONITORING (4 parents + 12 sub-items = 16)
  monitoring: {
    name: 'MONITORING',
    items: {
      'Alerts': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'View Alerts': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Create Alert Rules': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Alert History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Generate Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Reports'
      },
      'Scheduled Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Reports'
      },
      'Report Templates': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Reports'
      },
      'Quality Control': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isCollapsible: true
      },
      'Quality Inspections': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Quality Metrics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Quality Approvals': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Maintenance': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isCollapsible: true
      },
      'Maintenance Schedule': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance Requests': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance Approval': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Maintenance'
      }
    },
    specialPermissions: ['Allow users to acknowledge critical alerts', 'Allow users to override quality checks', 'Allow users to schedule emergency maintenance']
  },

  // 8. SYSTEM - Administration (6 parents + 14 sub-items = 20)
  system_administration: {
    name: 'SYSTEM - Administration',
    items: {
      'User Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'View Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      },
      'Edit User Details': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      },
      'User Permissions': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      },
      'Add Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Manual User Creation': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Add Users'
      },
      'Bulk User Import': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Add Users'
      },
      'Role Profiles': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'View Roles': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Role Profiles'
      },
      'Create Role': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Role Profiles'
      },
      'Edit Role Permissions': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Role Profiles'
      },
      'Activity Logging': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'View Logs': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Activity Logging'
      },
      'Filter Logs': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Activity Logging'
      },
      'Export Logs': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Activity Logging'
      },
      'System Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'General Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'System Settings'
      },
      'Security Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'System Settings'
      },
      'Integration Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'System Settings'
      },
      'Account': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Profile Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Account'
      },
      'Password & Security': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Account'
      }
    },
    specialPermissions: ['Allow users to impersonate other users', 'Allow users to modify system configurations', 'Allow users to delete users', 'Allow users to reset passwords']
  }
}
