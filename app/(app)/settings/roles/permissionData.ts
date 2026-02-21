// Permission structure: Old modules + grouped User Attendance

export interface ModulePermission {
  full?: boolean
  view?: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
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
  // MAIN - Dashboard
  main_dashboard: {
    name: 'MAIN - Dashboard',
    items: {
      Dashboard: {
        full: false,
        view: false,
        export: false,
        isCollapsible: true,
      },
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
      'Recent Activity': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Dashboard',
      },
      'Machine Status Table': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Dashboard',
      },
      'Alerts Panel': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Dashboard',
      },
    },
    specialPermissions: [
      'Allow users to export dashboard data',
      'Allow users to customize dashboard layout',
    ],
  },

  // MAIN - Scheduling
  main_scheduling: {
    name: 'MAIN - Scheduling',
    items: {
      'Schedule Generator': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      'Schedule Generator Dashboard': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
    },
    specialPermissions: [
      'Allow users to override schedule conflicts',
      'Allow users to publish schedules',
    ],
  },

  // MAIN - Analytics & Charts
  main_analytics: {
    name: 'MAIN - Analytics & Charts',
    items: {
      Chart: {
        full: false,
        view: false,
        export: false,
      },
      Analytics: {
        full: false,
        view: false,
        export: false,
      },
    },
    specialPermissions: [
      'Allow users to export analytics data',
      'Allow users to create custom reports',
    ],
  },

  // MAIN - Attendance
  main_attendance: {
    name: 'MAIN - Attendance',
    items: {
      Attendance: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
      'Standalone Attendance': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to mark attendance for others',
      'Allow users to edit attendance records',
    ],
  },

  // Web User Attendance
  web_user_attendance: {
    name: 'Web User Attendance',
    items: {
      Attendance: {
        full: false,
        view: false,
        isCollapsible: true,
      },
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
      FIR: {
        full: false,
        view: false,
        create: false,
        edit: false,
        isCollapsible: true,
      },
      'FIR: Dashboard': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: Category': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      Calls: {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Calls: Calls': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Calls',
      },
      'Calls: Call Logs': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Calls',
      },
      'Calls: Voice Record': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Calls',
      },
      'Calls: Call Logs GPS': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Calls',
      },
      'Device Monitoring': {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Device Monitoring: Overview': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Screen Time': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: App Usage': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Network': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Storage': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Events': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Bluetooth': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
    },
  },

  // Mobile User Attendance
  mobile_user_attendance: {
    name: 'Mobile User Attendance',
    items: {
      Attendance: {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Attendance: Weekly Streak': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      'Attendance: Today Logs': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      'Attendance: Recent History': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Attendance',
      },
      Calendar: {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Calendar: Calendar': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Calendar',
      },
      FIR: {
        full: false,
        view: false,
        create: false,
        edit: false,
        isCollapsible: true,
      },
      'FIR: Dashboard': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'FIR: Category': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'FIR',
      },
      'Device Monitoring': {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Device Monitoring: Overview': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Screen Time': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: App Usage': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Network': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Storage': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Events': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Bluetooth': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      'Device Monitoring: Monitoring Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        isSubItem: true,
        parent: 'Device Monitoring',
      },
      Notification: {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Notification: Notification': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Notification',
      },
      Account: {
        full: false,
        view: false,
        isCollapsible: true,
      },
      'Account: Account Settings': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Account',
      },
      'Account: Password Reset': {
        full: false,
        view: false,
        isSubItem: true,
        parent: 'Account',
      },
    },
  },

  // MAIN - Account
  main_account: {
    name: 'MAIN - Account',
    items: {
      Account: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to update their own profile',
      'Allow users to change password',
    ],
  },

  // PRODUCTION
  production: {
    name: 'PRODUCTION',
    items: {
      Orders: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      Machines: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      Personnel: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      Tasks: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
    },
    specialPermissions: [
      'Allow users to halt production lines',
      'Allow users to emergency stop machines',
      'Allow users to modify production schedules',
    ],
  },

  // MONITORING
  monitoring: {
    name: 'MONITORING',
    items: {
      Alerts: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      Reports: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      'Quality Control': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
      Maintenance: {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
      },
    },
    specialPermissions: [
      'Allow users to acknowledge critical alerts',
      'Allow users to override quality checks',
      'Allow users to schedule emergency maintenance',
    ],
  },

  // ADMINISTRATION - User Management
  admin_users: {
    name: 'ADMINISTRATION - User Management',
    items: {
      'User Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to reset passwords',
      'Allow users to impersonate other users',
    ],
  },

  // ADMINISTRATION - Add Users
  admin_add_users: {
    name: 'ADMINISTRATION - Add Users',
    items: {
      'Add Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to bulk import users',
      'Allow users to send invitation emails',
    ],
  },

  // ADMINISTRATION - Role Profiles
  admin_roles: {
    name: 'ADMINISTRATION - Role Profiles',
    items: {
      'Role Profiles': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: ['Allow users to clone roles', 'Allow users to delete roles'],
  },

  // ADMINISTRATION - Activity Logging
  admin_activity: {
    name: 'ADMINISTRATION - Activity Logging',
    items: {
      'Activity Logging': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: ['Allow users to delete logs', 'Allow users to filter sensitive logs'],
  },

  // ADMINISTRATION - System Settings
  admin_system: {
    name: 'ADMINISTRATION - System Settings',
    items: {
      'System Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to modify system configurations',
      'Allow users to backup system data',
    ],
  },

  // ADMINISTRATION - Account Settings
  admin_account: {
    name: 'ADMINISTRATION - Account Settings',
    items: {
      'Organization Settings': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: [
      'Allow users to update organization details',
      'Allow users to manage billing',
    ],
  },

  // TOOLS - Shift Management
  tools_shift: {
    name: 'TOOLS - Shift Management',
    items: {
      'Shift Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    specialPermissions: [
      'Allow users to override shift constraints',
      'Allow users to approve swap requests',
    ],
  },

  // TOOLS - Leave Management
  tools_leave: {
    name: 'TOOLS - Leave Management',
    items: {
      'Leave Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      },
    },
    specialPermissions: [
      'Allow users to view all department leaves',
      'Allow users to bypass leave policies',
    ],
  },

  // TOOLS - Health
  tools_health: {
    name: 'TOOLS - Health',
    items: {
      'Device Monitor': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
    },
    specialPermissions: ['Allow users to reboot devices', 'Allow users to update device firmware'],
  },

  // TOOLS - FIR Reporter
  tools_fir: {
    name: 'TOOLS - FIR Reporter',
    items: {
      'FIR Reporter': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      },
    },
    specialPermissions: ['Allow users to assign reports', 'Allow users to close reports'],
  },
}
