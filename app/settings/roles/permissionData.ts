// Complete 82-item dual-mode permission structure
// Generated from ROLE_PROFILE_DUAL_MODE_IMPLEMENTATION.md

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
  // 1. MAIN - Dashboard (1 parent + 5 sub-items = 6)
  main_dashboard: {
    name: 'MAIN - Dashboard',
    items: {
      'Dashboard': {
        full: false,
        view: true,
        export: false,
        isCollapsible: true
      },
      'Overview Widget': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Production Metrics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Recent Activity': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Machine Status Table': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Dashboard'
      },
      'Alerts Panel': {
        full: false,
        view: false,
        export: false,
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
        create: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Edit Schedule': {
        edit: false,
        isSubItem: true,
        parent: 'Schedule Generator'
      },
      'Publish Schedule': {
        approve: false,
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
        export: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'Calendar View': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'List View': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'Filter Options': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      }
    },
    specialPermissions: ['Allow users to override schedule conflicts', 'Allow users to publish schedules']
  },

  // 3. MAIN - Analytics & Charts (2 parents + 5 sub-items = 7)
  main_analytics: {
    name: 'MAIN - Analytics & Charts',
    items: {
      'Chart': {
        full: false,
        view: false,
        export: false,
        isCollapsible: true
      },
      'Timeline View': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Chart'
      },
      'Performance Metrics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Chart'
      },
      'Analytics': {
        full: false,
        view: false,
        export: false,
        isCollapsible: true
      },
      'Production Analytics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Efficiency Analytics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Quality Analytics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Machine Analytics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Analytics'
      }
    },
    specialPermissions: ['Allow users to export analytics data', 'Allow users to create custom reports']
  },

  // 4. MAIN - Attendance (2 parents + 5 sub-items = 7)
  main_attendance: {
    name: 'MAIN - Attendance',
    items: {
      'Attendance': {
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
        parent: 'Attendance'
      },
      'Attendance Records': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
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
      "Today's Recent Activity": {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      },
      'Mark Attendance': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      },
      'View Attendance History': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Standalone Attendance'
      }
    },
    specialPermissions: ['Allow users to mark attendance for others', 'Allow users to edit attendance records']
  },

  // 5. MAIN - Account (1 parent + 2 sub-items = 3)
  main_account: {
    name: 'MAIN - Account',
    items: {
      'Account': {
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
        parent: 'Account'
      },
      'Personal Information': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Account'
      }
    },
    specialPermissions: ['Allow users to update their own profile', 'Allow users to change password']
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
        create: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Edit Order': {
        edit: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Order Status': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Order Approval': {
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
        export: false,
        isSubItem: true,
        parent: 'Machines'
      },
      'Machine Status': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Machines'
      },
      'Machine Configuration': {
        full: false,
        view: false,
        export: false,
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
        export: false,
        isSubItem: true,
        parent: 'Personnel'
      },
      'Shift Assignment': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Personnel'
      },
      'Skill Management': {
        full: false,
        view: false,
        export: false,
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
        create: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Assignment': {
        edit: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Progress': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Task Completion': {
        approve: false,
        isSubItem: true,
        parent: 'Tasks'
      }
    },
    specialPermissions: ['Allow users to halt production lines', 'Allow users to emergency stop machines', 'Allow users to modify production schedules']
  },

  // 7. MONITORING (4 parents + 13 sub-items = 17)
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
        export: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Create Alert Rules': {
        create: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Alert History': {
        full: false,
        view: false,
        export: false,
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
        create: false,
        isSubItem: true,
        parent: 'Reports'
      },
      'Scheduled Reports': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Reports'
      },
      'Report Templates': {
        full: false,
        view: false,
        export: false,
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
        create: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Quality Metrics': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Quality Approvals': {
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
        export: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance Requests': {
        create: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance History': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Maintenance Approval': {
        approve: false,
        isSubItem: true,
        parent: 'Maintenance'
      }
    },
    specialPermissions: ['Allow users to acknowledge critical alerts', 'Allow users to override quality checks', 'Allow users to schedule emergency maintenance']
  },

  // 14. ADMINISTRATION - User Management (1 parent + 4 sub-items = 5)
  admin_users: {
    name: 'ADMINISTRATION - User Management',
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
      'Create Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      },
      'Edit Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      },
      'Delete Users': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'User Management'
      }
    },
    specialPermissions: ['Allow users to reset passwords', 'Allow users to impersonate other users']
  },

  // 15. ADMINISTRATION - Add Users (1 parent + 1 sub-item = 2)
  admin_add_users: {
    name: 'ADMINISTRATION - Add Users',
    items: {
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
      }
    },
    specialPermissions: ['Allow users to bulk import users', 'Allow users to send invitation emails']
  },

  // 16. ADMINISTRATION - Role Profiles (1 parent + 3 sub-items = 4)
  admin_roles: {
    name: 'ADMINISTRATION - Role Profiles',
    items: {
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
      'Create Roles': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Role Profiles'
      },
      'Edit Roles': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Role Profiles'
      }
    },
    specialPermissions: ['Allow users to clone roles', 'Allow users to delete roles']
  },

  // 17. ADMINISTRATION - Activity Logging (1 parent + 2 sub-items = 3)
  admin_activity: {
    name: 'ADMINISTRATION - Activity Logging',
    items: {
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
      'Export Logs': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Activity Logging'
      }
    },
    specialPermissions: ['Allow users to delete logs', 'Allow users to filter sensitive logs']
  },

  // 18. ADMINISTRATION - System Settings (1 parent + 2 sub-items = 3)
  admin_system: {
    name: 'ADMINISTRATION - System Settings',
    items: {
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
      }
    },
    specialPermissions: ['Allow users to modify system configurations', 'Allow users to backup system data']
  },

  // 19. ADMINISTRATION - Account Settings (1 parent + 2 sub-items = 3)
  admin_account: {
    name: 'ADMINISTRATION - Account Settings',
    items: {
      'Organization Settings': {
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
        parent: 'Organization Settings'
      },
      'Notification Preferences': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Organization Settings'
      }
    },
    specialPermissions: ['Allow users to update organization details', 'Allow users to manage billing']
  },

  // 20. TOOLS - Shift Management (1 parent + 4 sub-items = 5)
  tools_shift: {
    name: 'TOOLS - Shift Management',
    items: {
      'Shift Management': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Shift Manager': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Shift Management'
      },
      'Roster Board': {
        full: false,
        view: false,
        create: false, // Controls Drag & Drop / Assignment
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Shift Management'
      },
      'Calendar View': {
        full: false,
        view: false,
        export: false,
        isSubItem: true,
        parent: 'Shift Management'
      },
      'Employee Assignment': {
        full: false,
        view: false,
        create: false,
        edit: false, // Controls Bulk Assignment
        delete: false,
        isSubItem: true,
        parent: 'Shift Management'
      }
    },
    specialPermissions: ['Allow users to override shift constraints', 'Allow users to approve swap requests']
  },

  // 21. TOOLS - Leave Management (1 parent + 1 sub-item = 2)
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
        isCollapsible: true
      },
      'Leave Requests': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Leave Management'
      }
    },
    specialPermissions: ['Allow users to view all department leaves', 'Allow users to bypass leave policies']
  },

  // 22. TOOLS - Health (1 parent + 1 sub-item = 2)
  tools_health: {
    name: 'TOOLS - Health',
    items: {
      'Device Monitor': {
        full: false,
        view: false,
        create: false, // Reset/Reboot commands
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Device Status': {
        full: false,
        view: false,
        create: false,
        isSubItem: true,
        parent: 'Device Monitor'
      }
    },
    specialPermissions: ['Allow users to reboot devices', 'Allow users to update device firmware']
  },

  // 23. TOOLS - FIR (1 parent + 4 sub-items = 5)
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
        isCollapsible: true
      },
      'Dashboard': {
        view: false,
        isSubItem: true,
        parent: 'FIR Reporter'
      },
      'All Reports': {
        view: false,
        create: false,
        isSubItem: true,
        parent: 'FIR Reporter'
      },
      'Categories': {
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'FIR Reporter'
      },
      'Analytics': {
        view: false,
        isSubItem: true,
        parent: 'FIR Reporter'
      }
    },
    specialPermissions: ['Allow users to assign reports', 'Allow users to close reports']
  }
}
