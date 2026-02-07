"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Phone,
  Smartphone,
  ChevronRight,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar"
import { useAuth } from "@/app/lib/contexts/auth-context"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Reusing the MenuItem interface logic but adapting for the new structure
interface MenuItem {
  id: string
  label: string
  href?: string
  icon?: any
  items?: MenuItem[]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { userRole, hasPermission, hasPermissionCode, logout } = useAuth()
  const { open, setOpen, isMobile } = useSidebar()
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const flyoutRef = React.useRef<HTMLDivElement>(null)
  const [flyout, setFlyout] = React.useState<{
    id: string
    label: string
    items: MenuItem[]
    top: number
  } | null>(null)

  // --- Menu Logic Ported from ZohoSidebar ---
  const menuGroups = React.useMemo(() => {
    const groups: { label: string; items: MenuItem[] }[] = []
    const isSuperAdmin = userRole === 'Super Admin' || userRole === 'super_admin'

    const canUserAttendanceAttendance =
      hasPermission('web_user_attendance', 'Attendance: Overview', 'view') ||
      hasPermission('web_user_attendance', 'Attendance: Calendar', 'view') ||
      hasPermission('web_user_attendance', 'Attendance: Timeline', 'view') ||
      hasPermission('web_user_attendance', 'Attendance: History', 'view')

    const canUserAttendanceFir =
      hasPermission('web_user_attendance', 'FIR: Dashboard', 'view') ||
      hasPermission('web_user_attendance', 'FIR: Reports', 'view') ||
      hasPermission('web_user_attendance', 'FIR: History', 'view') ||
      hasPermission('web_user_attendance', 'FIR: Category', 'view')

    const canUserAttendanceCalls =
      hasPermission('web_user_attendance', 'Calls: Calls', 'view') ||
      hasPermission('web_user_attendance', 'Calls: Call Logs', 'view') ||
      hasPermission('web_user_attendance', 'Calls: Voice Record', 'view') ||
      hasPermission('web_user_attendance', 'Calls: Call Logs GPS', 'view')

    const canUserAttendanceDeviceMonitoring =
      hasPermission('web_user_attendance', 'Device Monitoring: Overview', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: Screen Time', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: App Usage', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: Network', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: Storage', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: Events', 'view') ||
      hasPermission('web_user_attendance', 'Device Monitoring: Bluetooth', 'view')

    // 1. MAIN Section
    const mainItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('main_dashboard', 'Dashboard', 'view')) {
      mainItems.push({ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard })
    }
    if (isSuperAdmin || hasPermissionCode('schedule.view')) {
      mainItems.push({ id: 'schedule-generator', label: 'Schedule Generator', href: '/scheduler', icon: Calendar })
    }
    if (isSuperAdmin || hasPermission('main_analytics', 'Chart', 'view')) {
      mainItems.push({ id: 'chart', label: 'Chart', href: '/chart', icon: BarChart3 })
    }
    if (isSuperAdmin || hasPermission('main_analytics', 'Analytics', 'view')) {
      mainItems.push({ id: 'analytics', label: 'Analytics', href: '/analytics', icon: TrendingUp })
    }
    if (isSuperAdmin || canUserAttendanceAttendance) {
      mainItems.push({ id: 'attendance', label: 'Attendance', href: '/attendance', icon: Clock })
    }
    if (isSuperAdmin || hasPermission('main_attendance', 'Standalone Attendance', 'view')) {
      mainItems.push({ id: 'standalone-attendance', label: 'Standalone Attendance', href: 'https://epsilon-attendance.vercel.app/', icon: UserCheck })
    }
    if (mainItems.length > 0) {
      groups.push({ label: 'MAIN', items: mainItems })
    }

    // 2. PROFILE Section
    const profileItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('production', 'Personnel', 'view')) {
      profileItems.push({ id: 'profile-personnel', label: 'Personnel', href: '/personnel', icon: Users })
    }

    // Shift Management
    const shiftItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('tools_shift', 'Shift Management', 'view')) {
      shiftItems.push({ id: 'profile-shift-manager', label: 'Shift Manager', href: '/tools/shifts', icon: Clock })
    }
    if (isSuperAdmin || hasPermission('tools_shift', 'Shift Management', 'view')) {
      shiftItems.push({ id: 'profile-roster-board', label: 'Roster Board', href: '/tools/roster-board', icon: Users })
    }
    if (isSuperAdmin || hasPermission('tools_shift', 'Shift Management', 'view')) {
      shiftItems.push({ id: 'profile-calendar-view', label: 'Calendar View', href: '/tools/calendar-view', icon: Calendar })
    }
    if (isSuperAdmin || hasPermission('tools_shift', 'Shift Management', 'view')) {
      shiftItems.push({ id: 'profile-employee-assignment', label: 'Employee Assignment', href: '/tools/employee-assignment', icon: UserPlus })
    }
    if (shiftItems.length > 0) {
      profileItems.push({
        id: 'profile-shift-management',
        label: 'Shift Management',
        icon: Clock,
        items: shiftItems
      })
    }
    if (profileItems.length > 0) {
      groups.push({ label: 'PROFILE', items: profileItems })
    }

    // 3. PRODUCTION Section
    const productionItems: MenuItem[] = []
    // Production Sub-items
    const prodSubItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('production', 'Orders', 'view')) {
      prodSubItems.push({ id: 'orders', label: 'Orders', href: '/production/orders', icon: FileText })
    }
    if (isSuperAdmin || hasPermission('production', 'Machines', 'view')) {
      prodSubItems.push({ id: 'machines', label: 'Machines', href: '/production/machines', icon: Wrench })
    }
    if (isSuperAdmin || hasPermission('production', 'Tasks', 'view')) {
      prodSubItems.push({ id: 'tasks', label: 'Tasks', href: '/production/tasks', icon: FileText })
    }
    if (prodSubItems.length > 0) {
      productionItems.push({ id: 'production', label: 'Production', href: '#', icon: Package, items: prodSubItems })
    }

    // Monitoring Sub-items
    const monitorSubItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('monitoring', 'Alerts', 'view')) {
      monitorSubItems.push({ id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell })
    }
    if (isSuperAdmin || hasPermission('monitoring', 'Reports', 'view')) {
      monitorSubItems.push({ id: 'reports', label: 'Reports', href: '/monitoring/reports', icon: FileText })
    }
    if (isSuperAdmin || hasPermission('monitoring', 'Quality Control', 'view')) {
      monitorSubItems.push({ id: 'quality', label: 'Quality Control', href: '/monitoring/quality', icon: Shield })
    }
    if (isSuperAdmin || hasPermission('monitoring', 'Maintenance', 'view')) {
      monitorSubItems.push({ id: 'maintenance', label: 'Maintenance', href: '/monitoring/maintenance', icon: Wrench })
    }
    if (monitorSubItems.length > 0) {
      productionItems.push({ id: 'monitoring', label: 'Monitoring', href: '#', icon: Bell, items: monitorSubItems })
    }

    if (productionItems.length > 0) {
      groups.push({ label: 'PRODUCTION', items: productionItems })
    }


    // 4. MONITOR PERSON Section
    const monitorPersonItems: MenuItem[] = []
    if (isSuperAdmin || canUserAttendanceCalls) {
      monitorPersonItems.push({ id: 'call-recorder', label: 'Call Recorder', href: '/monitor/call-logs', icon: Phone })
    }
    if (isSuperAdmin || canUserAttendanceDeviceMonitoring) {
      monitorPersonItems.push({ id: 'monitor-device', label: 'Mobile Device Logs', href: '/monitor/device-logs', icon: Smartphone })
    }
    if (isSuperAdmin || canUserAttendanceFir) {
      monitorPersonItems.push({ id: 'monitor-fir', label: 'FIR Status', href: '/fir', icon: Shield })
    }
    if (monitorPersonItems.length > 0) {
      groups.push({ label: 'MONITOR PERSON', items: monitorPersonItems })
    }

    // 5. TOOLS Section
    const toolsItems: MenuItem[] = []
    // Leave Management
    const leaveItems: MenuItem[] = []
    if (isSuperAdmin || hasPermission('tools_leave', 'Leave Management', 'view')) {
      leaveItems.push({ id: 'leave-requests', label: 'Leave Requests', href: '/tools/leave-management', icon: Calendar })
    }
    if (leaveItems.length > 0) {
      toolsItems.push({ id: 'leave-management', label: 'Leave Management', icon: Calendar, items: leaveItems })
    }
    // Health (Skipped as per ZohoSidebar if empty)

    // FIR Reporter
    const firItems: MenuItem[] = []
    if (isSuperAdmin || canUserAttendanceFir) {
      firItems.push({ id: 'fir-dashboard', label: 'Dashboard', href: '/fir?view=dashboard', icon: LayoutDashboard })
      firItems.push({ id: 'fir-reports', label: 'All Reports', href: '/fir?view=reports', icon: FileText })
      if (isSuperAdmin) {
        firItems.push({ id: 'fir-categories', label: 'Categories', href: '/fir?view=categories', icon: Package })
      }
      firItems.push({ id: 'fir-analytics', label: 'Analytics', href: '/fir?view=analytics', icon: BarChart3 })
    }
    if (firItems.length > 0) {
      toolsItems.push({ id: 'fir', label: 'FIR Reporter', icon: Shield, items: firItems })
    }

    if (toolsItems.length > 0) {
      groups.push({ label: 'TOOLS', items: toolsItems })
    }

    // 6. SYSTEM Section
    const systemItems: MenuItem[] = []
    const hasUserManagementAccess = isSuperAdmin || hasPermission('admin_users', 'User Management', 'view')
    const hasAddUsersAccess = isSuperAdmin || hasPermission('admin_add_users', 'Add Users', 'view')
    const hasRoleProfilesAccess = isSuperAdmin || hasPermission('admin_roles', 'Role Profiles', 'view')
    const hasActivityLoggingAccess = isSuperAdmin || hasPermission('admin_activity', 'Activity Logging', 'view')
    const hasSystemSettingsAccess = isSuperAdmin || hasPermission('admin_system', 'System Settings', 'view')
    const hasAccountAccess = isSuperAdmin || hasPermission('admin_account', 'Organization Settings', 'view')
    const hasAnySettingsAccess = hasUserManagementAccess || hasAddUsersAccess || hasRoleProfilesAccess || hasActivityLoggingAccess || hasSystemSettingsAccess

    if (hasAnySettingsAccess) {
      const settingsSubItems: MenuItem[] = []
      if (hasUserManagementAccess) settingsSubItems.push({ id: 'user-management', label: 'User Management', href: '/settings/users', icon: Users })
      if (hasAddUsersAccess) settingsSubItems.push({ id: 'add-users', label: 'Add Users', href: '/settings/add-users', icon: UserPlus })
      if (hasRoleProfilesAccess) settingsSubItems.push({ id: 'role-profiles', label: 'Role Profiles', href: '/settings/roles', icon: Shield })
      if (hasActivityLoggingAccess) settingsSubItems.push({ id: 'activity-logging', label: 'Activity Logging', href: '/settings/activity-logs', icon: Activity })

      if (settingsSubItems.length > 0) {
        systemItems.push({ id: 'settings', label: 'Settings', icon: Settings, items: settingsSubItems })
      }
    }
    if (hasAccountAccess) {
      systemItems.push({ id: 'account', label: 'Account', href: '/account', icon: User })
    }

    if (systemItems.length > 0) {
      groups.push({ label: 'SYSTEM', items: systemItems })
    }

    return groups
  }, [userRole, hasPermission, hasPermissionCode])

  const closeFlyout = React.useCallback(() => {
    setFlyout(null)
  }, [])

  const openFlyout = React.useCallback(
    (item: MenuItem, target: HTMLElement) => {
      if (isMobile || !item.items?.length) return
      const container = sidebarRef.current
      if (!container) return
      const itemRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      setFlyout({
        id: item.id,
        label: item.label,
        items: item.items ?? [],
        top: itemRect.top - containerRect.top,
      })
    },
    [isMobile],
  )

  React.useLayoutEffect(() => {
    if (!flyout || !sidebarRef.current || !flyoutRef.current) return
    const containerRect = sidebarRef.current.getBoundingClientRect()
    const panelRect = flyoutRef.current.getBoundingClientRect()
    const padding = 8
    const maxTop = Math.max(padding, containerRect.height - panelRect.height - padding)
    const nextTop = Math.min(Math.max(flyout.top, padding), maxTop)
    if (nextTop !== flyout.top) {
      setFlyout((prev) => (prev ? { ...prev, top: nextTop } : prev))
    }
  }, [flyout])

  const showHeaderText = isMobile || open

  return (
    <Sidebar collapsible="icon" {...props}>
      <div
        ref={sidebarRef}
        className="relative flex h-full flex-col"
        onMouseEnter={() => {
          if (!isMobile) setOpen(true)
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setOpen(false)
            closeFlyout()
          }
        }}
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/" className={showHeaderText ? '' : 'justify-center'}>
                  <div className="flex aspect-square size-10 items-center justify-center">
                    <img
                      src="/Epsilologo.svg"
                      alt="Epsilon"
                      className={showHeaderText ? 'size-8' : 'size-9'}
                    />
                  </div>
                  {showHeaderText && (
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Epsilon</span>
                      <span className="truncate text-xs">Scheduling</span>
                    </div>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent onScroll={closeFlyout}>
          {menuGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => {
                  const hasChildren = !!item.items?.length
                  const isParentActive = hasChildren
                    ? item.items?.some((subItem) => subItem.href === pathname)
                    : false

                  if (hasChildren && isMobile) {
                    return (
                      <Collapsible
                        key={item.id}
                        asChild
                        defaultOpen={false}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label} isActive={isParentActive}>
                              {item.icon && <item.icon />}
                              <span>{item.label}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === subItem.href}
                                  >
                                    <Link href={subItem.href || '#'}>
                                      {subItem.icon && <subItem.icon />}
                                      <span>{subItem.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  if (hasChildren) {
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={isParentActive}
                          type="button"
                          onMouseEnter={(event) =>
                            openFlyout(item, event.currentTarget)
                          }
                          onFocus={(event) =>
                            openFlyout(item, event.currentTarget)
                          }
                        >
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={pathname === item.href}
                        onMouseEnter={closeFlyout}
                        onFocus={closeFlyout}
                      >
                        <Link href={item.href || '#'}>
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                tooltip="Log out"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />

        {!isMobile && flyout && flyout.items.length > 0 && (
          <div
            ref={flyoutRef}
            className="absolute left-full z-50 ml-3 w-[260px] rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
            style={{ top: flyout.top }}
          >
            <div className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-sidebar-foreground/60">
              {flyout.label.toUpperCase()}
            </div>
            <div className="flex flex-col gap-1 px-2 pb-3">
              {flyout.items.map((subItem) => {
                const isActive = pathname === subItem.href
                return (
                  <Link
                    key={subItem.id}
                    href={subItem.href || '#'}
                    data-sidebar="menu-sub-button"
                    data-active={isActive}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none"
                    onClick={closeFlyout}
                  >
                    {subItem.icon && <subItem.icon className="size-4" />}
                    <span className="truncate">{subItem.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  )
}
