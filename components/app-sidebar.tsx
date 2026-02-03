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
  const { open } = useSidebar()

  // --- Menu Logic Ported from ZohoSidebar ---
  const menuGroups = React.useMemo(() => {
    const groups: { label: string; items: MenuItem[] }[] = []

    // 1. MAIN Section
    const mainItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('main_dashboard', 'Dashboard', 'view')) {
      mainItems.push({ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard })
    }
    if (userRole === 'Super Admin' || hasPermissionCode('schedule.view')) {
      mainItems.push({ id: 'schedule-generator', label: 'Schedule Generator', href: '/scheduler', icon: Calendar })
    }
    if (userRole === 'Super Admin' || hasPermission('main_charts', 'Chart', 'view')) {
      mainItems.push({ id: 'chart', label: 'Chart', href: '/chart', icon: BarChart3 })
    }
    if (userRole === 'Super Admin' || hasPermission('main_analytics', 'Analytics', 'view')) {
      mainItems.push({ id: 'analytics', label: 'Analytics', href: '/analytics', icon: TrendingUp })
    }
    if (userRole === 'Super Admin' || hasPermission('main_attendance', 'Attendance', 'view')) {
      mainItems.push({ id: 'attendance', label: 'Attendance', href: '/attendance', icon: Clock })
    }
    if (userRole === 'Super Admin' || hasPermission('main_attendance', 'Standalone Attendance', 'view')) {
      mainItems.push({ id: 'standalone-attendance', label: 'Standalone Attendance', href: 'https://epsilon-attendance.vercel.app/', icon: UserCheck })
    }
    if (mainItems.length > 0) {
      groups.push({ label: 'MAIN', items: mainItems })
    }

    // 2. PROFILE Section
    const profileItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('production', 'Personnel', 'view')) {
      profileItems.push({ id: 'profile-personnel', label: 'Personnel', href: '/personnel', icon: Users })
    }

    // Shift Management
    const shiftItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('tools_shift', 'Shift Manager', 'view')) {
      shiftItems.push({ id: 'profile-shift-manager', label: 'Shift Manager', href: '/tools/shifts', icon: Clock })
    }
    if (userRole === 'Super Admin' || hasPermission('tools_shift', 'Roster Board', 'view')) {
      shiftItems.push({ id: 'profile-roster-board', label: 'Roster Board', href: '/tools/roster-board', icon: Users })
    }
    if (userRole === 'Super Admin' || hasPermission('tools_shift', 'Calendar View', 'view')) {
      shiftItems.push({ id: 'profile-calendar-view', label: 'Calendar View', href: '/tools/calendar-view', icon: Calendar })
    }
    if (userRole === 'Super Admin' || hasPermission('tools_shift', 'Employee Assignment', 'view')) {
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
    if (userRole === 'Super Admin' || hasPermission('production', 'Orders', 'view')) {
      prodSubItems.push({ id: 'orders', label: 'Orders', href: '/production/orders', icon: FileText })
    }
    if (userRole === 'Super Admin' || hasPermission('production', 'Machines', 'view')) {
      prodSubItems.push({ id: 'machines', label: 'Machines', href: '/production/machines', icon: Wrench })
    }
    if (userRole === 'Super Admin' || hasPermission('production', 'Tasks', 'view')) {
      prodSubItems.push({ id: 'tasks', label: 'Tasks', href: '/production/tasks', icon: FileText })
    }
    if (prodSubItems.length > 0) {
      productionItems.push({ id: 'production', label: 'Production', href: '#', icon: Package, items: prodSubItems })
    }

    // Monitoring Sub-items
    const monitorSubItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Alerts', 'view')) {
      monitorSubItems.push({ id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell })
    }
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Reports', 'view')) {
      monitorSubItems.push({ id: 'reports', label: 'Reports', href: '/monitoring/reports', icon: FileText })
    }
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Quality Control', 'view')) {
      monitorSubItems.push({ id: 'quality', label: 'Quality Control', href: '/monitoring/quality', icon: Shield })
    }
    if (userRole === 'Super Admin' || hasPermission('monitoring', 'Maintenance', 'view')) {
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
    monitorPersonItems.push({ id: 'call-recorder', label: 'Call Recorder', href: '/monitor/call-logs', icon: Phone })
    if (userRole === 'Super Admin' || hasPermission('tools_health', 'Device Status', 'view')) {
      monitorPersonItems.push({ id: 'monitor-device', label: 'Mobile Device Logs', href: '/monitor/device-logs', icon: Smartphone })
    }
    if (userRole === 'Super Admin' || hasPermission('tools_fir', 'FIR Reporter', 'view')) {
      monitorPersonItems.push({ id: 'monitor-fir', label: 'FIR Status', href: '/fir', icon: Shield })
    }
    if (monitorPersonItems.length > 0) {
      groups.push({ label: 'MONITOR PERSON', items: monitorPersonItems })
    }

    // 5. TOOLS Section
    const toolsItems: MenuItem[] = []
    // Leave Management
    const leaveItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('tools_leave', 'Leave Requests', 'view')) {
      leaveItems.push({ id: 'leave-requests', label: 'Leave Requests', href: '/tools/leave-management', icon: Calendar })
    }
    if (leaveItems.length > 0) {
      toolsItems.push({ id: 'leave-management', label: 'Leave Management', icon: Calendar, items: leaveItems })
    }
    // Health (Skipped as per ZohoSidebar if empty)

    // FIR Reporter
    const firItems: MenuItem[] = []
    if (userRole === 'Super Admin' || hasPermission('tools_fir', 'FIR Reporter', 'view')) {
      firItems.push({ id: 'fir-dashboard', label: 'Dashboard', href: '/fir?view=dashboard', icon: LayoutDashboard })
      firItems.push({ id: 'fir-reports', label: 'All Reports', href: '/fir?view=reports', icon: FileText })
      if (userRole === 'Super Admin') {
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
    const hasUserManagementAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'User Management', 'view')
    const hasAddUsersAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Add Users', 'view')
    const hasRoleProfilesAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Role Profiles', 'view')
    const hasActivityLoggingAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Activity Logging', 'view')
    const hasSystemSettingsAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'System Settings', 'view')
    const hasAccountAccess = userRole === 'Super Admin' || hasPermission('system_administration', 'Account', 'view')
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <img src="/Epsilologo.svg" alt="Epsilon" className="size-6 invert" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Epsilon</span>
                  <span className="truncate text-xs">Scheduling</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                if (item.items && item.items.length > 0) {
                  return (
                    <Collapsible key={item.id} asChild defaultOpen={false} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.label}>
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

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={pathname === item.href}
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
            <SidebarMenuButton onClick={logout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
