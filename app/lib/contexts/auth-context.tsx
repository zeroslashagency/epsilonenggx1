'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../services/supabase-client'
import { hasMainDashboardPermission } from '@/app/lib/features/auth/dashboard-permissions'

const supabase = getSupabaseBrowserClient()

interface PermissionModule {
  name: string
  items: Record<string, any>
  specialPermissions?: string[]
}

const PERMISSION_FLAGS = ['full', 'view', 'create', 'edit', 'delete', 'approve', 'export'] as const

const mergePermissionModules = (sources: unknown[]): Record<string, PermissionModule> => {
  const merged: Record<string, PermissionModule> = {}

  sources.forEach(source => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return

    Object.entries(source).forEach(([moduleKey, moduleValue]) => {
      if (!moduleValue || typeof moduleValue !== 'object' || Array.isArray(moduleValue)) return

      const typedModule = moduleValue as PermissionModule
      const currentModule = merged[moduleKey] || {
        name: typedModule.name || moduleKey,
        items: {},
        specialPermissions: [],
      }

      currentModule.name = typedModule.name || currentModule.name

      if (typedModule.items && typeof typedModule.items === 'object') {
        Object.entries(typedModule.items).forEach(([itemKey, itemValue]) => {
          if (!itemValue || typeof itemValue !== 'object' || Array.isArray(itemValue)) return

          const existingItem = currentModule.items[itemKey] || {}
          const mergedItem = { ...existingItem, ...itemValue }

          PERMISSION_FLAGS.forEach(flag => {
            mergedItem[flag] = Boolean(existingItem[flag] || (itemValue as any)[flag])
          })

          currentModule.items[itemKey] = mergedItem
        })
      }

      const existingSpecialPermissions = Array.isArray(currentModule.specialPermissions)
        ? currentModule.specialPermissions
        : []
      const incomingSpecialPermissions = Array.isArray(typedModule.specialPermissions)
        ? typedModule.specialPermissions
        : []

      currentModule.specialPermissions = Array.from(
        new Set([...existingSpecialPermissions, ...incomingSpecialPermissions])
      )

      merged[moduleKey] = currentModule
    })
  })

  return merged
}

interface AuthContextType {
  isAuthenticated: boolean
  userEmail: string | null
  userRole: string | null
  user: { id: string | null; role: string | null; email: string | null } | null
  userPermissions: Record<string, PermissionModule>
  hasPermission: (moduleKey: string, itemKey: string, action?: string) => boolean
  hasPermissionCode: (permissionCode: string) => boolean
  refreshPermissions: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  resetPassword: (email: string) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, PermissionModule>>({})
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Function to fetch user profile and permissions from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, standalone_attendance')
        .eq('id', userId)
        .single()

      const { data: userRoleRows } = await supabase
        .from('user_roles')
        .select(
          `
          role_id,
          roles (
            name,
            permissions_json
          )
        `
        )
        .eq('user_id', userId)

      const assignedRoles: Array<{ name: string | undefined; permissionsJson: unknown }> = []
      for (const row of userRoleRows || []) {
        const roleData = Array.isArray(row.roles) ? row.roles[0] : row.roles
        if (!roleData || typeof roleData !== 'object') continue
        assignedRoles.push({
          name: roleData.name as string | undefined,
          permissionsJson: roleData.permissions_json,
        })
      }

      const assignedRoleNames = assignedRoles
        .map(role => role.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)

      const hasSuperAdminRole =
        assignedRoleNames.some(name => name === 'Super Admin' || name === 'super_admin') ||
        profile?.role === 'Super Admin' ||
        profile?.role === 'super_admin'

      if (hasSuperAdminRole) {
        setUserRole('Super Admin')
        setUserPermissions({}) // Empty object = all permissions for Super Admin
        return
      }

      if (assignedRoles.length > 0) {
        const mergedPermissions = mergePermissionModules(
          assignedRoles.map(role => role.permissionsJson)
        )

        const resolvedRole =
          (profile?.role && assignedRoleNames.includes(profile.role) ? profile.role : null) ||
          assignedRoleNames[0] ||
          profile?.role ||
          'User'

        setUserRole(resolvedRole)
        setUserPermissions(mergedPermissions)
        return
      }

      if (profileError || !profile) {
        setUserRole('User')
        setUserPermissions({})
        return
      }

      const { data: fallbackRole, error: fallbackRoleError } = await supabase
        .from('roles')
        .select('permissions_json')
        .eq('name', profile.role)
        .single()

      setUserRole(profile.role || 'User')
      if (!fallbackRoleError && fallbackRole?.permissions_json) {
        setUserPermissions(mergePermissionModules([fallbackRole.permissions_json]))
      } else {
        setUserPermissions({})
      }
    } catch (error) {
      setUserRole('User')
      setUserPermissions({})
    }
  }

  // Helper function to check if user has a permission (legacy format)
  const hasPermission = (moduleKey: string, itemKey: string, action: string = 'view'): boolean => {
    // Super Admin has ALL permissions
    if (userRole === 'Super Admin' || userRole === 'super_admin') {
      return true
    }

    const resolvedModuleKey =
      !userPermissions?.[moduleKey] &&
      (moduleKey === 'web_user_attendance' || moduleKey === 'mobile_user_attendance') &&
      userPermissions?.user_attendance
        ? 'user_attendance'
        : moduleKey

    // Check if module exists
    if (!userPermissions || !userPermissions[resolvedModuleKey]) {
      return false
    }

    if (resolvedModuleKey === 'main_dashboard') {
      return hasMainDashboardPermission(
        userPermissions,
        action as 'full' | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export',
        itemKey
      )
    }

    const permissionModule = userPermissions[resolvedModuleKey]
    const item = permissionModule.items?.[itemKey]

    if (!item) {
      return false
    }

    // Full permission grants all actions
    if (item.full === true) {
      return true
    }

    // Check specific action
    return item[action] === true
  }

  // Helper function to check backend permission codes (e.g., 'schedule.view', 'schedule.edit')
  const hasPermissionCode = (permissionCode: string): boolean => {
    // Super Admin has ALL permissions
    if (userRole === 'Super Admin' || userRole === 'super_admin') {
      return true
    }

    if (permissionCode === 'manage_users') {
      return (
        hasPermission('admin_users', 'User Management', 'create') ||
        hasPermission('admin_users', 'User Management', 'edit') ||
        hasPermission('admin_users', 'User Management', 'delete') ||
        hasPermission('admin_users', 'User Management', 'full')
      )
    }

    if (permissionCode === 'roles.manage' || permissionCode === 'assign_roles') {
      return (
        hasPermission('admin_roles', 'Role Profiles', 'create') ||
        hasPermission('admin_roles', 'Role Profiles', 'edit') ||
        hasPermission('admin_roles', 'Role Profiles', 'delete') ||
        hasPermission('admin_roles', 'Role Profiles', 'full')
      )
    }

    // For now, map backend codes to frontend permission structure
    // This is a transitional approach until full migration
    const codeMap: Record<string, { module: string; item: string; action: string }> = {
      'schedule.view': { module: 'main_scheduling', item: 'Schedule Generator', action: 'view' },
      'schedule.create': {
        module: 'main_scheduling',
        item: 'Schedule Generator',
        action: 'create',
      },
      'schedule.edit': { module: 'main_scheduling', item: 'Schedule Generator', action: 'edit' },
      'schedule.run.basic': {
        module: 'main_scheduling',
        item: 'Schedule Generator',
        action: 'create',
      },
      'schedule.run.advanced': {
        module: 'main_scheduling',
        item: 'Schedule Generator',
        action: 'edit',
      },
      'schedule.delete': {
        module: 'main_scheduling',
        item: 'Schedule Generator',
        action: 'delete',
      },
      'schedule.approve': {
        module: 'main_scheduling',
        item: 'Schedule Generator',
        action: 'approve',
      },
      'users.view': { module: 'admin_users', item: 'User Management', action: 'view' },
      'users.edit': { module: 'admin_users', item: 'User Management', action: 'edit' },
      'users.permissions': { module: 'admin_users', item: 'User Management', action: 'full' },
      manage_users: { module: 'admin_users', item: 'User Management', action: 'edit' },
      'roles.view': { module: 'admin_roles', item: 'Role Profiles', action: 'view' },
      'roles.manage': { module: 'admin_roles', item: 'Role Profiles', action: 'edit' },
      assign_roles: { module: 'admin_roles', item: 'Role Profiles', action: 'edit' },
    }

    const mapping = codeMap[permissionCode]
    if (mapping) {
      return hasPermission(mapping.module, mapping.item, mapping.action)
    }

    return false
  }

  // Function to refresh user permissions (for real-time updates)
  const refreshPermissions = async () => {
    if (!isAuthenticated) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error)
      // Don't block - set defaults
      setUserRole('User')
      setUserPermissions({})
    }
  }

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setIsAuthenticated(true)
          setUserEmail(session.user.email || '')
          setUserId(session.user.id)
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('userEmail', session.user.email || '')
          localStorage.setItem('userId', session.user.id)
          localStorage.setItem('userId', session.user.id)

          // Fetch user profile and permissions
          await fetchUserProfile(session.user.id)
        } else {
          // Clear any stale local storage if no valid session
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('userEmail')
          localStorage.removeItem('sb-sxnaopzgaddvziplrlbe-auth-token')
          setIsAuthenticated(false)
          setUserEmail(null)
          setUserId(null)
        }
      } catch (error) {
        // Clear everything on error
        localStorage.clear()
        setIsAuthenticated(false)
        setUserEmail(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false)
        setUserEmail(null)
        setUserId(null)
        setUserRole(null)
        setUserPermissions({})
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('sb-sxnaopzgaddvziplrlbe-auth-token')
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true)
        setUserEmail(session.user?.email || null)
        setUserId(session.user?.id || null)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', session.user?.email || '')
        // Fetch user profile and permissions on sign in (don't await)
        fetchUserProfile(session.user.id).catch(err => {
          console.error('Background profile fetch failed:', err)
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data.user) {
        setIsAuthenticated(true)
        setUserEmail(data.user.email || '')
        setUserId(data.user.id)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', data.user.email || email)
        localStorage.setItem('userId', data.user.id)

        // Fetch user profile and permissions
        await fetchUserProfile(data.user.id)
      }
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut()

      // Clear all localStorage
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('sb-sxnaopzgaddvziplrlbe-auth-token') // Clear Supabase token

      // Clear session storage
      sessionStorage.clear()

      // Reset state
      setIsAuthenticated(false)
      setUserEmail(null)
      setUserRole(null)
      setUserPermissions({})

      // Force redirect to auth page
      router.push('/auth')
      router.refresh() // Force refresh to clear any cached data
    } catch (error) {
      // Even if Supabase logout fails, clear local data
      localStorage.clear()
      sessionStorage.clear()
      setIsAuthenticated(false)
      setUserEmail(null)
      setUserRole(null)
      setUserPermissions({})
      router.push('/auth')
    }
  }

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error: any) {
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        userRole,
        user: { id: userId, role: userRole, email: userEmail },
        userPermissions,
        hasPermission,
        hasPermissionCode,
        refreshPermissions,
        login,
        logout,
        resetPassword,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
