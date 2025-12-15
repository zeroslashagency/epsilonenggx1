"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '../services/supabase-client'

const supabase = getSupabaseBrowserClient()

interface PermissionModule {
  name: string
  items: Record<string, any>
  specialPermissions?: string[]
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
      // Get user's role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, standalone_attendance')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        // Don't block - set defaults and continue
        setUserRole('User')
        setUserPermissions({})
        return
      }

      setUserRole(profile.role)

      // Super Admin gets all permissions
      if (profile.role === 'Super Admin' || profile.role === 'super_admin') {
        setUserPermissions({}) // Empty object = all permissions for Super Admin
        return
      }

      // Fetch role's permissions_json from roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('permissions_json')
        .eq('name', profile.role)
        .single()

      if (roleError) {
        // Don't block - set empty permissions and continue
        setUserPermissions({})
        return
      }

      if (roleData?.permissions_json) {
        setUserPermissions(roleData.permissions_json)
      } else {
        setUserPermissions({})
      }

    } catch (error) {
      setUserPermissions({})
    }
  }

  // Helper function to check if user has a permission (legacy format)
  const hasPermission = (moduleKey: string, itemKey: string, action: string = 'view'): boolean => {
    // Super Admin has ALL permissions
    if (userRole === 'Super Admin' || userRole === 'super_admin') {
      return true
    }

    // Check if module exists
    if (!userPermissions || !userPermissions[moduleKey]) {
      return false
    }

    const module = userPermissions[moduleKey]
    const item = module.items?.[itemKey]

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

    // For now, map backend codes to frontend permission structure
    // This is a transitional approach until full migration
    const codeMap: Record<string, { module: string; item: string; action: string }> = {
      'schedule.view': { module: 'main_scheduling', item: 'Schedule Generator', action: 'view' },
      'schedule.create': { module: 'main_scheduling', item: 'Schedule Generator', action: 'create' },
      'schedule.edit': { module: 'main_scheduling', item: 'Schedule Generator', action: 'edit' },
      'schedule.delete': { module: 'main_scheduling', item: 'Schedule Generator', action: 'delete' },
      'schedule.approve': { module: 'main_scheduling', item: 'Schedule Generator', action: 'approve' },
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
      const { data: { session } } = await supabase.auth.getSession()
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
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setIsAuthenticated(true)
          setUserEmail(session.user.email || "")
          setUserId(session.user.id)
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('userEmail', session.user.email || "")
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
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
        setUserEmail(data.user.email || "")
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
        redirectTo: `${window.location.origin}/auth?reset=true`
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error: any) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
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
      isLoading
    }}>
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
