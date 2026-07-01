/**
 * Permission Levels Utility
 * Determines the access level for each permission based on user role
 */

export type PermissionLevel = 'full' | 'edit' | 'view' | 'access' | 'none'

export interface PermissionInfo {
  id: string
  label: string
  description: string
  level: PermissionLevel
  hasAccess: boolean
}

/**
 * Get permission level for a specific permission based on role
 */
export function getPermissionLevel(permissionId: string, role: string): PermissionLevel {
  const roleLower = role.toLowerCase()
  
  // Super Admin has full access to everything
  if (roleLower === 'super admin' || roleLower === 'super_admin') {
    return 'full'
  }
  
  // Admin permissions
  if (roleLower === 'admin') {
    switch (permissionId) {
      case 'dashboard':
      case 'schedule_generator':
      case 'schedule_generator_dashboard':
      case 'analytics':
      case 'manage_users':
        return 'full'
      case 'chart':
        return 'view'
      case 'attendance':
        return 'edit'
      case 'production':
      case 'monitoring':
        return 'none'
      default:
        return 'none'
    }
  }
  
  // Operator permissions
  if (roleLower === 'operator') {
    switch (permissionId) {
      case 'dashboard':
      case 'chart':
        return 'view'
      case 'schedule_generator':
      case 'attendance':
        return 'edit'
      case 'schedule_generator_dashboard':
        return 'view'
      case 'analytics':
      case 'production':
      case 'monitoring':
      case 'manage_users':
        return 'none'
      default:
        return 'none'
    }
  }
  
  // Test User permissions
  if (roleLower === 'test user') {
    switch (permissionId) {
      case 'dashboard':
      case 'chart':
      case 'analytics':
      case 'attendance':
        return 'view'
      case 'schedule_generator':
      case 'schedule_generator_dashboard':
      case 'production':
      case 'monitoring':
      case 'manage_users':
        return 'none'
      default:
        return 'none'
    }
  }
  
  // Monitor role
  if (roleLower === 'monitor') {
    switch (permissionId) {
      case 'dashboard':
      case 'chart':
      case 'analytics':
        return 'view'
      case 'schedule_generator':
      case 'schedule_generator_dashboard':
      case 'attendance':
      case 'production':
      case 'monitoring':
      case 'manage_users':
        return 'none'
      default:
        return 'none'
    }
  }
  
  // Attendance role
  if (roleLower === 'attendance') {
    switch (permissionId) {
      case 'attendance':
        return 'edit'
      case 'dashboard':
      case 'schedule_generator':
      case 'schedule_generator_dashboard':
      case 'chart':
      case 'analytics':
      case 'production':
      case 'monitoring':
      case 'manage_users':
        return 'none'
      default:
        return 'none'
    }
  }
  
  // Default: no access
  return 'none'
}

/**
 * Check if user has access to a permission
 */
export function hasPermissionAccess(permissionId: string, role: string): boolean {
  const level = getPermissionLevel(permissionId, role)
  return level !== 'none'
}

/**
 * Get all permissions with their levels for a role
 */
export function getAllPermissionsForRole(role: string): PermissionInfo[] {
  const permissions = [
    { id: 'dashboard', label: 'Dashboard', description: 'Access the primary manufacturing overview dashboard.' },
    { id: 'schedule_generator', label: 'Schedule Generator', description: 'Open the smart schedule builder and adjust production timelines.' },
    { id: 'schedule_generator_dashboard', label: 'Schedule Generator Dashboard', description: 'Access the dedicated schedule generator dashboard page.' },
    { id: 'chart', label: 'Chart', description: 'Explore production charts and machine KPIs.' },
    { id: 'analytics', label: 'Analytics', description: 'Run analytics dashboards and export performance reports.' },
    { id: 'attendance', label: 'Attendance', description: 'View attendance data and reports within the main system.' },
    { id: 'production', label: 'Production', description: 'Access production workflow screens including orders, machines, personnel, and tasks.' },
    { id: 'monitoring', label: 'Monitoring', description: 'Access monitoring dashboards including alerts, reports, quality control, and maintenance.' },
    { id: 'manage_users', label: 'Manage Users & Security', description: 'Create users, assign roles, view audit logs, and impersonate accounts.' }
  ]
  
  return permissions.map(perm => {
    const level = getPermissionLevel(perm.id, role)
    return {
      ...perm,
      level,
      hasAccess: level !== 'none'
    }
  })
}

/**
 * Group permissions by category
 */
export function getGroupedPermissions(role: string) {
  const allPermissions = getAllPermissionsForRole(role)
  
  return {
    'Dashboard & Analytics': allPermissions.filter(p => 
      ['dashboard', 'analytics'].includes(p.id)
    ),
    'Scheduling': allPermissions.filter(p => 
      ['schedule_generator', 'schedule_generator_dashboard', 'chart'].includes(p.id)
    ),
    'Attendance': allPermissions.filter(p => 
      ['attendance'].includes(p.id)
    ),
    'Production & Monitoring': allPermissions.filter(p => 
      ['production', 'monitoring'].includes(p.id)
    ),
    'Administration': allPermissions.filter(p => 
      ['manage_users'].includes(p.id)
    )
  }
}
