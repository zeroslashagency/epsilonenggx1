"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  Calendar,
  BarChart3,
  TrendingUp,
  Package,
  Users,
  UserPlus,
  UserCheck,
  Wrench,
  Bell,
  FileText,
  Shield,
  Activity,
  Settings,
  User,
  Clock,
  Factory,
  CheckSquare,
  AlertTriangle,
  ClipboardList,
  Cpu,
  ChevronRight,
  ChevronLeft,
  UserCircle,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../lib/contexts/auth-context'

interface MenuItem {
  id: string
  label: string
  href?: string
  icon?: any
  badge?: string
  children?: MenuItem[]
  isSection?: boolean
  items?: MenuItem[]
}

interface ZohoSidebarProps {
  collapsed: boolean;
  onToggleAction: () => void;
}

export function ZohoSidebar({ collapsed, onToggleAction }: ZohoSidebarProps) {
  const pathname = usePathname()
  const { userPermissions, logout, hasPermission, refreshPermissions } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['settings'])

  const menuItems: MenuItem[] = [
    // MAIN Section
    {
      id: 'main',
      label: 'MAIN',
      isSection: true
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'schedule-generator',
      label: 'Schedule Generator',
      href: '/scheduler',
      icon: Calendar
    },
    {
      id: 'chart',
      label: 'Chart',
      href: '/chart',
      icon: BarChart3
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/analytics',
      icon: TrendingUp
    },
    {
      id: 'attendance',
      label: 'Attendance',
      href: '/attendance',
      icon: Clock
    },
    {
      id: 'standalone-attendance',
      label: 'Standalone Attendance',
      href: '/standalone-attendance',
      icon: UserCheck
    },

    // PRODUCTION & MONITORING Section
    {
      id: 'production-section',
      label: 'PRODUCTION & MONITORING',
      isSection: true
    },
    {
      id: 'production',
      label: 'Production',
      href: '/production',
      icon: Package,
      items: [
        { id: 'orders', label: 'Orders', href: '/production/orders', icon: FileText },
        { id: 'machines', label: 'Machines', href: '/production/machines', icon: Wrench },
        { id: 'personnel', label: 'Personnel', href: '/personnel', icon: Users },
        { id: 'tasks', label: 'Tasks', href: '/production/tasks', icon: CheckSquare }
      ]
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      href: '/monitoring',
      icon: Bell,
      items: [
        { id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell },
        { id: 'reports', label: 'Reports', href: '/monitoring/reports', icon: FileText },
        { id: 'quality', label: 'Quality Control', href: '/monitoring/quality', icon: Shield },
        { id: 'maintenance', label: 'Maintenance', href: '/monitoring/maintenance', icon: Wrench }
      ]
    },

    // SYSTEM Section
    {
      id: 'system',
      label: 'SYSTEM',
      isSection: true
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      items: [
        {
          id: 'user-management',
          label: 'User Management',
          href: '/settings/users',
          icon: Users
        },
        {
          id: 'add-users',
          label: 'Add Users',
          href: '/settings/add-users',
          icon: UserPlus
        },
        {
          id: 'role-profiles',
          label: 'Role Profiles',
          href: '/settings/roles',
          icon: Shield
        },
        {
          id: 'activity-logging',
          label: 'Activity Logging',
          href: '/settings/activity-logs',
          icon: Activity
        }
      ]
    },
    {
      id: 'account',
      label: 'Account',
      href: '/account',
      icon: User
    }
  ]

  // Filter menu items based on user permissions
  const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // Always show section headers
      if (item.isSection) return true
      
      // Map menu item IDs to actual database permission codes
      const permissionMap: Record<string, string> = {
        'dashboard': 'view_dashboard',
        'schedule-generator': 'view_schedule',
        'chart': 'view_dashboard', // Chart uses dashboard permission
        'analytics': 'view_reports', // Analytics uses reports permission
        'attendance': 'attendance_read',
        'standalone-attendance': 'attendance_read',
        'production': 'operate_machine', // Production section
        'orders': 'operate_machine',
        'machines': 'operate_machine',
        'personnel': 'manage_users',
        'tasks': 'operate_machine',
        'monitoring': 'view_reports', // Monitoring section
        'alerts': 'view_reports',
        'reports': 'view_reports',
        'quality-control': 'view_reports',
        'maintenance': 'operate_machine',
        'settings': 'manage_users', // Settings requires manage_users permission
        'account': 'view_dashboard' // Account always visible if can view dashboard
      }
      
      const requiredPermission = permissionMap[item.id]
      
      // If no permission mapping, hide the item (safer default)
      if (!requiredPermission) return false
      
      // Check if user has the required permission
      return hasPermission(requiredPermission)
    })
  }
  
  const visibleMenuItems = filterMenuByPermissions(menuItems)

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActive = (href: string) => {
    if (!href || href === '#') return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 
        border-r border-[#E3E6F0] dark:border-gray-800
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E3E6F0] dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2C7BE5] to-blue-600 rounded-[4px] flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#12263F] dark:text-white">Epsilon</h1>
              <p className="text-xs text-[#95AAC9]">Scheduling</p>
            </div>
          </div>
        )}
        <button
        onClick={onToggleAction}
          className="p-1.5 rounded-[4px] hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#95AAC9]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#95AAC9]" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {visibleMenuItems.map((item) => {
            // Section Headers
            if (item.isSection) {
              return (
                <div key={item.id} className={`px-3 py-2 ${collapsed ? 'hidden' : ''}`}>
                  <h3 className="text-xs font-semibold text-[#95AAC9] uppercase tracking-wider">
                    {item.label}
                  </h3>
                </div>
              )
            }

            // Menu Items
            const hasChildren = item.items && item.items.length > 0
            const isExpanded = expandedItems.includes(item.id)
            
            return (
              <div key={item.id}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-[4px]
                      transition-all duration-200 group
                      ${
                        isActive(item.href || '')
                          ? 'bg-[#2C7BE5] text-white'
                          : 'text-[#12263F] dark:text-gray-300 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon && <item.icon className={`w-5 h-5 ${collapsed ? '' : 'flex-shrink-0'}`} />}
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.label}</span>
                      )}
                    </div>
                    
                    {!collapsed && (
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href || '#'}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-[4px]
                      transition-all duration-200 group
                      ${
                        isActive(item.href || '')
                          ? 'bg-[#2C7BE5] text-white'
                          : 'text-[#12263F] dark:text-gray-300 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon && <item.icon className={`w-5 h-5 ${collapsed ? '' : 'flex-shrink-0'}`} />}
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.label}</span>
                      )}
                    </div>
                    
                    {!collapsed && item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-[#2C7BE5] text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Submenu */}
                {hasChildren && !collapsed && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.items!.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href || '#'}
                        className={`
                          flex items-center space-x-3 px-3 py-2 rounded-[4px] text-sm
                          transition-colors duration-200
                          ${
                            isActive(child.href || '')
                              ? 'bg-[#2C7BE5] text-white'
                              : 'text-[#95AAC9] hover:text-[#12263F] dark:hover:text-white hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        {child.icon && <child.icon className="w-4 h-4" />}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Refresh Permissions Button */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={refreshPermissions}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#95AAC9] hover:text-[#12263F] dark:hover:text-white hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded transition-colors"
            title="Refresh your permissions"
          >
            <Activity className="w-3 h-3" />
            Refresh Permissions
          </button>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-[#E3E6F0] dark:border-gray-800 p-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#2C7BE5] rounded-full flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#12263F] dark:text-white truncate">Admin</p>
              <p className="text-xs text-[#95AAC9] truncate">admin@epsilon.com</p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-[#95AAC9]" />
          </button>
        </div>
      </div>
    </aside>
  )
}
