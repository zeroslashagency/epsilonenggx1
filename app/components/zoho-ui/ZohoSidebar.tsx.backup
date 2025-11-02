"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
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
  const { userPermissions, logout, hasPermission, refreshPermissions, userRole } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Load expanded items from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expandedMenuItems')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Save scroll position before navigation
  useEffect(() => {
    if (navRef.current && typeof window !== 'undefined') {
      const savedScroll = localStorage.getItem('sidebarScrollPosition')
      if (savedScroll) {
        navRef.current.scrollTop = parseInt(savedScroll, 10)
      }
    }
  }, [])

  // Save scroll position on scroll
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarScrollPosition', String(nav.scrollTop))
      }
    }

    nav.addEventListener('scroll', handleScroll)
    return () => nav.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-expand parent menu when on a child route (only on initial load)
  useEffect(() => {
    const pathSegments = pathname.split('/')
    const newExpanded: string[] = []
    
    // Check if we're on a production sub-route
    if (pathname.startsWith('/production/') || pathname === '/personnel') {
      newExpanded.push('production')
    }
    
    // Check if we're on a monitoring sub-route
    if (pathname.startsWith('/monitoring/') || pathname === '/alerts') {
      newExpanded.push('monitoring')
    }
    
    // Check if we're on a settings sub-route
    if (pathname.startsWith('/settings/')) {
      newExpanded.push('settings')
    }
    
    // Only update if different from current state and merge with existing
    if (newExpanded.length > 0) {
      setExpandedItems(prev => {
        const combined = [...new Set([...prev, ...newExpanded])]
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('expandedMenuItems', JSON.stringify(combined))
        }
        return combined
      })
    }
  }, [pathname])

  const menuItems: MenuItem[] = useMemo(() => [
    // MAIN Section
    {
      id: 'main',
      label: 'MAIN',
      isSection: true
    },
    ...(userRole === 'Super Admin' || hasPermission('main_dashboard', 'Dashboard', 'view') ? [{
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    }] : []),
    ...(userRole === 'Super Admin' || hasPermission('main_scheduling', 'Schedule Generator', 'view') ? [{
      id: 'schedule-generator',
      label: 'Schedule Generator',
      href: '/scheduler',
      icon: Calendar
    }] : []),
    ...(userRole === 'Super Admin' || hasPermission('main_charts', 'Chart', 'view') ? [{
      id: 'chart',
      label: 'Chart',
      href: '/chart',
      icon: BarChart3
    }] : []),
    ...(userRole === 'Super Admin' || hasPermission('main_analytics', 'Analytics', 'view') ? [{
      id: 'analytics',
      label: 'Analytics',
      href: '/analytics',
      icon: TrendingUp
    }] : []),
    ...(userRole === 'Super Admin' || hasPermission('main_attendance', 'Attendance', 'view') ? [{
      id: 'attendance',
      label: 'Attendance',
      href: '/attendance',
      icon: Clock
    }] : []),
    ...(userRole === 'Super Admin' || hasPermission('main_attendance', 'Standalone Attendance', 'view') ? [{
      id: 'standalone-attendance',
      label: 'Standalone Attendance',
      href: 'https://epsilon-attendance.vercel.app/',
      icon: UserCheck
    }] : []),

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
  ], [userRole, hasPermission])

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
      
      // Super Admin sees everything
      if (userRole === 'Super Admin') return true
      
      // Check if user has the required permission (legacy single-arg check)
      // This is for backward compatibility - will be removed once all checks are updated
      return true // Temporarily allow all items that made it through the menuItems filter
    })
  }
  
  const visibleMenuItems = useMemo(() => filterMenuByPermissions(menuItems), [menuItems, userRole])

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('expandedMenuItems', JSON.stringify(newExpanded))
      }
      
      return newExpanded
    })
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
        onWheel={(e) => {
          e.stopPropagation()
        }}
      >
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
              <div key={item.id} className="relative">
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      toggleExpanded(item.id)
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
                      {item.icon && <item.icon className={`w-5 h-5 ${collapsed ? '' : 'flex-shrink-0'}`} />}
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.label}</span>
                      )}
                    </div>
                    
                    {!collapsed && (
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform duration-200 ease-out ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    )}
                    
                    {/* Tooltip/Submenu for collapsed state */}
                    {collapsed && hasChildren && (
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
                    {collapsed && !hasChildren && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        {item.label}
                      </div>
                    )}
                  </button>
                ) : (
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
                    
                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-md shadow-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        {item.label}
                      </div>
                    )}
                  </Link>
                )}

                {/* Submenu */}
                {hasChildren && !collapsed && (
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
}
