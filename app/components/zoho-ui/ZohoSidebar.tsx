"use client"

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
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
  ChevronRight,
  ChevronLeft,
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
  collapsed: boolean
  onToggleAction: () => void
}

// Memoized menu item component to prevent re-renders
const MenuItem = memo(({ 
  item, 
  collapsed, 
  isExpanded, 
  isActive, 
  onToggle 
}: { 
  item: MenuItem
  collapsed: boolean
  isExpanded: boolean
  isActive: (href: string) => boolean
  onToggle: (id: string) => void
}) => {
  const hasChildren = item.items && item.items.length > 0

  if (hasChildren) {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault()
            onToggle(item.id)
          }}
          className={`
            w-full flex items-center justify-between px-4 py-2.5 rounded-md
            transition-all duration-200 ease-out group
            ${
              isActive(item.href || '')
                ? 'bg-[#4285F4] text-white shadow-md'
                : 'text-[#374151] dark:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:translate-x-0.5'
            }
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <div className="flex items-center space-x-3">
            {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </div>
          
          {!collapsed && (
            <ChevronRight 
              className={`w-4 h-4 transition-transform duration-200 ease-out ${
                isExpanded ? 'rotate-90' : ''
              }`} 
            />
          )}
          
          {/* Submenu popup for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 min-w-[200px]">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {item.label}
              </div>
              <div className="space-y-1">
                {item.items!.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href || '#'}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    {child.icon && <child.icon className="w-4 h-4" />}
                    <span>{child.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </button>

        {/* Submenu for expanded state */}
        {!collapsed && (
          <div className={`
            ml-6 mt-1 space-y-1 overflow-hidden
            transition-all duration-250 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            {item.items!.map((child) => (
              <Link
                key={child.id}
                href={child.href || '#'}
                className={`
                  flex items-center space-x-3 px-4 py-2 rounded-md text-sm
                  transition-all duration-200 ease-out
                  ${
                    isActive(child.href || '')
                      ? 'bg-[#4285F4] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#374151] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:translate-x-0.5'
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
  }

  return (
    <div className="relative">
      <Link
        href={item.href || '#'}
        target={item.href?.startsWith('http') ? '_blank' : undefined}
        rel={item.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={`
          flex items-center justify-between px-4 py-2.5 rounded-md
          transition-all duration-200 ease-out group
          ${
            isActive(item.href || '')
              ? 'bg-[#4285F4] text-white shadow-md'
              : 'text-[#374151] dark:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:translate-x-0.5'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <div className="flex items-center space-x-3">
          {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
        </div>
        
        {!collapsed && item.badge && (
          <span className="px-2 py-0.5 text-xs bg-[#2C7BE5] text-white rounded-full">
            {item.badge}
          </span>
        )}
        
        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {item.label}
          </div>
        )}
      </Link>
    </div>
  )
})

MenuItem.displayName = 'MenuItem'

export const ZohoSidebar = memo(({ collapsed, onToggleAction }: ZohoSidebarProps) => {
  const pathname = usePathname()
  const { logout, userRole, hasPermission, hasPermissionCode } = useAuth()
  const navRef = useRef<HTMLElement>(null)
  
  // Load state from localStorage
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedMenuItems')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Restore scroll position
  useEffect(() => {
    if (navRef.current && typeof window !== 'undefined') {
      const savedScroll = localStorage.getItem('sidebarScrollPosition')
      if (savedScroll) {
        navRef.current.scrollTop = parseInt(savedScroll, 10)
      }
    }
  }, [])

  // Save scroll position
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarScrollPosition', String(nav.scrollTop))
      }
    }

    nav.addEventListener('scroll', handleScroll, { passive: true })
    return () => nav.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-expand parent menus based on current route
  useEffect(() => {
    const newExpanded: string[] = []
    
    if (pathname.startsWith('/production/') || pathname === '/personnel') {
      newExpanded.push('production')
    }
    if (pathname.startsWith('/monitoring/') || pathname === '/alerts') {
      newExpanded.push('monitoring')
    }
    if (pathname.startsWith('/settings/')) {
      newExpanded.push('settings')
    }
    
    if (newExpanded.length > 0) {
      setExpandedItems(prev => {
        const combined = Array.from(new Set([...prev, ...newExpanded]))
        if (typeof window !== 'undefined') {
          localStorage.setItem('expandedMenuItems', JSON.stringify(combined))
        }
        return combined
      })
    }
  }, [pathname])

  // Memoized menu items
  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = []
    
    // MAIN Section
    items.push({ id: 'main', label: 'MAIN', isSection: true })
    
    if (userRole === 'Super Admin' || hasPermission('main_dashboard', 'Dashboard', 'view')) {
      items.push({ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard })
    }
    
    if (userRole === 'Super Admin' || hasPermissionCode('schedule.view')) {
      items.push({ id: 'schedule-generator', label: 'Schedule Generator', href: '/scheduler', icon: Calendar })
    }
    
    if (userRole === 'Super Admin' || hasPermission('main_charts', 'Chart', 'view')) {
      items.push({ id: 'chart', label: 'Chart', href: '/chart', icon: BarChart3 })
    }
    
    if (userRole === 'Super Admin' || hasPermission('main_analytics', 'Analytics', 'view')) {
      items.push({ id: 'analytics', label: 'Analytics', href: '/analytics', icon: TrendingUp })
    }
    
    if (userRole === 'Super Admin' || hasPermission('main_attendance', 'Attendance', 'view')) {
      items.push({ id: 'attendance', label: 'Attendance', href: '/attendance', icon: Clock })
    }
    
    if (userRole === 'Super Admin' || hasPermission('main_attendance', 'Standalone Attendance', 'view')) {
      items.push({ id: 'standalone-attendance', label: 'Standalone Attendance', href: 'https://epsilon-attendance.vercel.app/', icon: UserCheck })
    }
    
    // Build production sub-items based on individual permissions
    const productionItems: MenuItem[] = []
    
    if (userRole === 'Super Admin' || hasPermission('production', 'Orders', 'view')) {
      productionItems.push({ id: 'orders', label: 'Orders', href: '/production/orders', icon: FileText })
    }
    
    if (userRole === 'Super Admin' || hasPermission('production', 'Machines', 'view')) {
      productionItems.push({ id: 'machines', label: 'Machines', href: '/production/machines', icon: Wrench })
    }
    
    if (userRole === 'Super Admin' || hasPermission('production', 'Personnel', 'view')) {
      productionItems.push({ id: 'personnel', label: 'Personnel', href: '/personnel', icon: Users })
    }
    
    if (userRole === 'Super Admin' || hasPermission('production', 'Tasks', 'view')) {
      productionItems.push({ id: 'tasks', label: 'Tasks', href: '/production/tasks', icon: FileText })
    }
    
    // Build monitoring sub-items based on individual permissions
    const monitoringItems: MenuItem[] = []
    
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Alerts', 'view')) {
      monitoringItems.push({ id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell })
    }
    
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Reports', 'view')) {
      monitoringItems.push({ id: 'reports', label: 'Reports', href: '/monitoring/reports', icon: FileText })
    }
    
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Quality Control', 'view')) {
      monitoringItems.push({ id: 'quality', label: 'Quality Control', href: '/monitoring/quality', icon: Shield })
    }
    
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Maintenance', 'view')) {
      monitoringItems.push({ id: 'maintenance', label: 'Maintenance', href: '/monitoring/maintenance', icon: Wrench })
    }
    
    // Only show PRODUCTION & MONITORING section if user has access to at least one item
    if (productionItems.length > 0 || monitoringItems.length > 0) {
      items.push({ id: 'production-section', label: 'PRODUCTION & MONITORING', isSection: true })
      
      if (productionItems.length > 0) {
        items.push({
          id: 'production', 
          label: 'Production', 
          href: '/production', 
          icon: Package,
          items: productionItems
        })
      }
      
      if (monitoringItems.length > 0) {
        items.push({
          id: 'monitoring', 
          label: 'Monitoring', 
          href: '/monitoring', 
          icon: Bell,
          items: monitoringItems
        })
      }
    }
    
    // Check if user has ANY system administration permissions
    const hasUserManagementAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'User Management', 'view')
    const hasAddUsersAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Add Users', 'view')
    const hasRoleProfilesAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Role Profiles', 'view')
    const hasActivityLoggingAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Activity Logging', 'view')
    const hasSystemSettingsAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'System Settings', 'view')
    const hasAccountAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Account', 'view')
    
    const hasAnySettingsAccess = hasUserManagementAccess || hasAddUsersAccess || hasRoleProfilesAccess || hasActivityLoggingAccess || hasSystemSettingsAccess
    const hasSystemAccess = hasAnySettingsAccess || hasAccountAccess
    
    // Only show SYSTEM section if user has access to at least one system item
    if (hasSystemAccess) {
      items.push({ id: 'system', label: 'SYSTEM', isSection: true })
      
      // Settings menu - only show if user has access to at least one settings item
      if (hasAnySettingsAccess) {
        const settingsItems: MenuItem[] = []
        
        if (hasUserManagementAccess) {
          settingsItems.push({ id: 'user-management', label: 'User Management', href: '/settings/users', icon: Users })
        }
        if (hasAddUsersAccess) {
          settingsItems.push({ id: 'add-users', label: 'Add Users', href: '/settings/add-users', icon: UserPlus })
        }
        if (hasRoleProfilesAccess) {
          settingsItems.push({ id: 'role-profiles', label: 'Role Profiles', href: '/settings/roles', icon: Shield })
        }
        if (hasActivityLoggingAccess) {
          settingsItems.push({ id: 'activity-logging', label: 'Activity Logging', href: '/settings/activity-logs', icon: Activity })
        }
        
        if (settingsItems.length > 0) {
          items.push({
            id: 'settings', label: 'Settings', href: '/settings', icon: Settings,
            items: settingsItems
          })
        }
      }
      
      // Account - only show if user has account permission
      if (hasAccountAccess) {
        items.push({ id: 'account', label: 'Account', href: '/account', icon: User })
      }
    }
    
    return items
  }, [userRole, hasPermission, hasPermissionCode])

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('expandedMenuItems', JSON.stringify(newExpanded))
      }
      
      return newExpanded
    })
  }, [])

  const isActive = useCallback((href: string) => {
    if (!href || href === '#') return false
    return pathname === href || pathname.startsWith(href + '/')
  }, [pathname])

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 
        border-r border-[#E3E6F0] dark:border-gray-800
        transition-all duration-300 ease-in-out z-40 flex flex-col
        ${collapsed ? 'w-[70px]' : 'w-[280px]'}
      `}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E3E6F0] dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/Epsilologo.svg" 
                alt="Epsilon Logo" 
                className="w-8 h-8 object-contain"
              />
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
      <nav 
        ref={navRef}
        className="flex-1 py-4 overflow-y-auto" 
        style={{ 
          scrollbarWidth: 'thin', 
          scrollbarColor: '#cbd5e0 transparent',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div className="px-3 space-y-1">
          {menuItems.map((item) => {
            if (item.isSection) {
              return (
                <div key={item.id} className={`px-3 py-2 ${collapsed ? 'hidden' : ''}`}>
                  <h3 className="text-xs font-semibold text-[#95AAC9] uppercase tracking-wider">
                    {item.label}
                  </h3>
                </div>
              )
            }

            return (
              <MenuItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                isExpanded={expandedItems.includes(item.id)}
                isActive={isActive}
                onToggle={toggleExpanded}
              />
            )
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="border-t border-[#E3E6F0] dark:border-gray-800 p-3">
        <button
          onClick={logout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-md
            text-[#374151] dark:text-gray-300
            hover:bg-[#F3F4F6] dark:hover:bg-gray-800
            transition-all duration-150 ease-out
            ${collapsed ? 'justify-center' : ''}
          `}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
})

ZohoSidebar.displayName = 'ZohoSidebar'
