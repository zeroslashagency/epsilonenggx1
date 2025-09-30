"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/app/services/supabase-client'

const supabase = getSupabaseClient()

interface AuthContextType {
  isAuthenticated: boolean
  userEmail: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  resetPassword: (email: string) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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
