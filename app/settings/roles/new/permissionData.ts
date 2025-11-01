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
      'List View': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Schedule Generator Dashboard'
      },
      'Filter Options': {
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

  // 3. MAIN - Analytics & Charts (2 parents + 5 sub-items = 7)
  main_analytics: {
    name: 'MAIN - Analytics & Charts',
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
      'Performance Metrics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Chart'
      },
      'Analytics': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isCollapsible: true
      },
      'Analytics Timeline View': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Production Trends': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Analytics'
      },
      'Efficiency Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
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

  // 6. PRODUCTION - Orders (1 parent + 4 sub-items = 5)
  production_orders: {
    name: 'PRODUCTION - Orders',
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
      'Delete Order': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Orders'
      },
      'Approve Order': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Orders'
      }
    },
    specialPermissions: ['Allow users to override order priorities', 'Allow users to cancel orders']
  },

  // 7. PRODUCTION - Machines (1 parent + 2 sub-items = 3)
  production_machines: {
    name: 'PRODUCTION - Machines',
    items: {
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
      }
    },
    specialPermissions: ['Allow users to update machine status', 'Allow users to schedule maintenance']
  },

  // 8. PRODUCTION - Personnel (1 parent + 2 sub-items = 3)
  production_personnel: {
    name: 'PRODUCTION - Personnel',
    items: {
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
      'Skill Matrix': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Personnel'
      }
    },
    specialPermissions: ['Allow users to assign personnel to tasks', 'Allow users to update skill levels']
  },

  // 9. PRODUCTION - Tasks (1 parent + 5 sub-items = 6)
  production_tasks: {
    name: 'PRODUCTION - Tasks',
    items: {
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
      'Edit Task': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Delete Task': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Assign Task': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Tasks'
      },
      'Complete Task': {
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
    specialPermissions: ['Allow users to reassign tasks', 'Allow users to set task priorities']
  },

  // 10. MONITORING - Alerts (1 parent + 3 sub-items = 4)
  monitoring_alerts: {
    name: 'MONITORING - Alerts',
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
      'Configure Alerts': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Alerts'
      },
      'Acknowledge Alerts': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Alerts'
      }
    },
    specialPermissions: ['Allow users to create custom alerts', 'Allow users to disable alerts']
  },

  // 11. MONITORING - Reports (1 parent + 2 sub-items = 3)
  monitoring_reports: {
    name: 'MONITORING - Reports',
    items: {
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
      'Schedule Reports': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Reports'
      }
    },
    specialPermissions: ['Allow users to export reports', 'Allow users to share reports']
  },

  // 12. MONITORING - Quality Control (1 parent + 3 sub-items = 4)
  monitoring_quality: {
    name: 'MONITORING - Quality Control',
    items: {
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
      'Defect Tracking': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Quality Control'
      },
      'Approve Quality': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        isSubItem: true,
        parent: 'Quality Control'
      }
    },
    specialPermissions: ['Allow users to fail quality checks', 'Allow users to override quality decisions']
  },

  // 13. MONITORING - Maintenance (1 parent + 3 sub-items = 4)
  monitoring_maintenance: {
    name: 'MONITORING - Maintenance',
    items: {
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
      'Maintenance Logs': {
        full: false,
        view: false,
        create: false,
        edit: false,
        delete: false,
        isSubItem: true,
        parent: 'Maintenance'
      },
      'Approve Maintenance': {
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
    specialPermissions: ['Allow users to schedule emergency maintenance', 'Allow users to close maintenance tickets']
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
  }
}
