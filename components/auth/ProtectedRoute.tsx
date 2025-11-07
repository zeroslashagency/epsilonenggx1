"use client"

import { useAuth } from '@/app/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: string[]
  requirePermission?: string  // Backend permission code like 'schedule.view'
}

export function ProtectedRoute({ children, requireRole, requirePermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole, hasPermissionCode } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/auth')
      return
    }

    // Check role requirement if specified
    if (requireRole && requireRole.length > 0) {
      if (!userRole || !requireRole.includes(userRole)) {
        router.replace('/dashboard')
        return
      }
    }

    // Check permission requirement if specified
    if (requirePermission && !hasPermissionCode(requirePermission)) {
      router.replace('/dashboard')
      return
    }
  }, [isAuthenticated, isLoading, userRole, requireRole, requirePermission, hasPermissionCode, router])

  // CRITICAL: Always show loading first to prevent content flash
  // This ensures no page content renders before auth check completes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (redirecting)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Check role requirement - show loading while redirecting
  if (requireRole && requireRole.length > 0) {
    if (!userRole || !requireRole.includes(userRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Access denied. Redirecting...</p>
          </div>
        </div>
      )
    }
  }

  // Check permission requirement
  if (requirePermission && !hasPermissionCode(requirePermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Access denied. Redirecting...</p>
        </div>
      </div>
    )
  }

  // Render protected content only after all checks pass
  return <>{children}</>
}
