"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../services/supabase-client'

const supabase = getSupabaseClient()

interface AuthContextType {
  isAuthenticated: boolean
  userEmail: string | null
  userRole: string | null
  userPermissions: string[]
  hasPermission: (permission: string) => boolean
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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Function to fetch user profile and calculate permissions
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, standalone_attendance')
        .eq('id', userId)
        .single()
      
      if (error || !profile) {
        console.error('Failed to fetch user profile:', error)
        return
      }
      
      setUserRole(profile.role)
      
      // Calculate permissions based on role
      const permissions: string[] = ['dashboard'] // All users get dashboard
      
      if (profile.role === 'Admin') {
        permissions.push('schedule_generator', 'schedule_generator_dashboard', 'chart', 'analytics', 'attendance', 'manage_users')
      } else if (profile.role === 'Operator') {
        permissions.push('schedule_generator', 'attendance')
      } else if (profile.role === 'Test User') {
        permissions.push('chart', 'analytics', 'attendance')
      }
      
      // Add standalone attendance if enabled
      if (profile.standalone_attendance === 'YES') {
        permissions.push('standalone_attendance')
      }
      
      setUserPermissions(permissions)
      console.log('✅ User permissions loaded:', { role: profile.role, permissions })
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }
  
  // Helper function to check if user has a permission
  const hasPermission = (permission: string): boolean => {
    // Super Admin has ALL permissions
    if (userRole === 'Super Admin' || userRole === 'super_admin') {
      return true
    }
    return userPermissions.includes(permission)
  }

  // Function to refresh user permissions (for real-time updates)
  const refreshPermissions = async () => {
    if (!isAuthenticated) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        console.log('🔄 Refreshing user permissions...')
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error)
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
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('userEmail', session.user.email || "")
          
          // Fetch user profile and permissions
          await fetchUserProfile(session.user.id)
        } else {
          // Clear any stale local storage if no valid session
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('userEmail')
          localStorage.removeItem('sb-sxnaopzgaddvziplrlbe-auth-token')
          setIsAuthenticated(false)
          setUserEmail(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false)
        setUserEmail(null)
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('sb-sxnaopzgaddvziplrlbe-auth-token')
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true)
        setUserEmail(session.user?.email || null)
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', session.user?.email || '')
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
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', data.user.email || email)
        
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
      setUserPermissions([])
      
      // Force redirect to auth page
      router.push('/auth')
      router.refresh() // Force refresh to clear any cached data
    } catch (error) {
      console.error('Logout error:', error)
      // Even if Supabase logout fails, clear local data
      localStorage.clear()
      sessionStorage.clear()
      setIsAuthenticated(false)
      setUserEmail(null)
      setUserRole(null)
      setUserPermissions([])
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
      userPermissions,
      hasPermission,
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
