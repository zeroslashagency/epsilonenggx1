"use client"

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
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
  onMobileMenuClose?: () => void
}

// Memoized menu item component to prevent re-renders
const MenuItem = memo(({ 
  item, 
  collapsed, 
  isExpanded, 
  isActive, 
  onToggle,
  onMobileMenuClose
}: { 
  item: MenuItem
  collapsed: boolean
  isExpanded: boolean
  isActive: (href: string) => boolean
  onToggle: (id: string) => void
  onMobileMenuClose?: () => void
}) => {
  const hasChildren = item.items && item.items.length > 0
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  if (hasChildren) {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.preventDefault()
            onToggle(item.id)
          }}
          className={`
            w-full flex items-center justify-between px-4 py-2.5 rounded-md
            transition-all duration-200 ease-out group
            ${
              isActive(item.href || '')
                ? 'bg-[#4285F4] text-white shadow-md shadow-[0_0_20px_rgba(66,133,244,0.4)]'
                : 'text-[#374151] dark:text-gray-300 hover:bg-[#F3F4F6] dark:hover:bg-gray-800 hover:translate-x-0.5 hover:shadow-[0_0_15px_rgba(156,163,175,0.3)]'
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
            <div 
              className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[9999] min-w-[220px] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto"
              onMouseEnter={(e) => e.stopPropagation()}
            >
              {/* Header with icon */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</span>
                </div>
              </div>
              
              {/* Submenu items */}
              <div className="p-2">
                {item.items!.map((child) => (
                  <Link
                    key={child.id}
                    href={child.href || '#'}
                    onClick={onMobileMenuClose}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150"
                  >
                    {child.icon && <child.icon className="w-4 h-4" />}
                    <span>{child.label}</span>
                  </Link>
                ))}
              </div>
              
              {/* Arrow pointer */}
              <div className="absolute right-full top-4 mr-[-1px] border-8 border-transparent border-r-white dark:border-r-gray-900"></div>
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
                onClick={onMobileMenuClose}
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
        onClick={onMobileMenuClose}
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
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-md shadow-xl whitespace-nowrap z-[9999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
            {item.label}
            {/* Arrow pointer */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-[-1px] border-4 border-transparent border-r-gray-900 dark:border-r-gray-800"></div>
          </div>
        )}
      </Link>
    </div>
  )
})

MenuItem.displayName = 'MenuItem'

export const ZohoSidebar = memo(({ collapsed, onToggleAction, onMobileMenuClose }: ZohoSidebarProps) => {
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
        relative h-full bg-white dark:bg-gray-900 
        border-r border-[#E3E6F0] dark:border-gray-800
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'w-[70px]' : 'w-[280px]'}
        overflow-visible
      `}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E3E6F0] dark:border-gray-800 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img 
                src="/Epsilologo.svg" 
                alt="Epsilon Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-[#12263F] dark:text-white leading-tight">Epsilon</h1>
              <p className="text-xs text-[#95AAC9] leading-tight">Scheduling</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex items-center justify-center">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/Epsilologo.svg" 
                alt="Epsilon Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggleAction}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-[#95AAC9]" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav 
        ref={navRef}
        className={`flex-1 py-4 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}
        style={{ 
          scrollbarWidth: collapsed ? 'none' : 'thin', 
          scrollbarColor: '#cbd5e0 transparent',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
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
                onMobileMenuClose={onMobileMenuClose}
              />
            )
          })}
        </div>
      </nav>

      {/* Expand/Collapse Button - Bottom of Sidebar */}
      {collapsed && (
        <div className="border-t border-[#E3E6F0] dark:border-gray-800 p-2 flex justify-center">
          <button
            onClick={onToggleAction}
            className="p-2 rounded-[4px] hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-[#95AAC9]" />
          </button>
        </div>
      )}

      {/* User Profile Section */}
      <div className="border-t border-[#E3E6F0] dark:border-gray-800 p-4">
        <div className="relative group">
          <div
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-md
              text-[#374151] dark:text-gray-300
              hover:bg-[#F3F4F6] dark:hover:bg-gray-800
              transition-all duration-150 ease-out cursor-pointer
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Account</p>
                <p className="text-xs text-[#95AAC9] truncate">{userRole || 'User'}</p>
              </div>
            )}
          </div>

          {/* User Profile Dropdown - Shows on hover when collapsed */}
          {collapsed && (
            <div className="absolute left-full bottom-0 ml-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[9999] opacity-0 scale-95 -translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-250 delay-200 ease-out pointer-events-none group-hover:pointer-events-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    U
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#12263F] dark:text-white truncate">Account</p>
                    <p className="text-xs text-[#95AAC9] truncate">User Profile</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    🟢 {userRole || 'User'}
                  </span>
                </div>
              </div>
              
              <div className="p-2">
                <Link
                  href="/account"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>View profile</span>
                  <span className="ml-auto text-xs text-gray-400">⌘K→P</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                  <span className="ml-auto text-xs text-gray-400">⌘S</span>
                </Link>
                <Link
                  href="/activity"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  <span>Activity</span>
                </Link>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                  <span className="ml-auto text-xs text-gray-400">⌃⇧Q</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
})

ZohoSidebar.displayName = 'ZohoSidebar'
