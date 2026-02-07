"use client"

import { useAuth } from '@/app/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedPageProps {
  children: React.ReactNode
  module: string
  item: string
  permission?: string
  anyOf?: Array<{ module: string; item: string; permission?: string }>
  fallbackUrl?: string
}

/**
 * ProtectedPage - Granular permission check for pages
 * Prevents URL bypass by checking permissions at page level
 * 
 * Usage:
 * <ProtectedPage module="production" item="Machines" permission="view">
 *   <MachinesPageContent />
 * </ProtectedPage>
 */
export function ProtectedPage({ 
  children, 
  module, 
  item, 
  permission = 'view',
  anyOf = [],
  fallbackUrl = '/dashboard'
}: ProtectedPageProps) {
  const { isAuthenticated, isLoading, userRole, userPermissions, hasPermission } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) return

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/auth')
      return
    }

    // 🔧 FIX: Wait for permissions to load before checking access
    // If userPermissions is empty and user is not Super Admin, permissions are still loading
    if (userRole !== 'Super Admin' && userRole !== 'super_admin' && Object.keys(userPermissions).length === 0) {
      return
    }

    // Super Admin has access to everything
    if (userRole === 'Super Admin' || userRole === 'super_admin') {
      setIsAuthorized(true)
      return
    }

    // Check granular permission (primary or any-of)
    const hasAccess =
      hasPermission(module, item, permission) ||
      anyOf.some((entry) => hasPermission(entry.module, entry.item, entry.permission ?? permission))
    
    if (!hasAccess) {
      setIsAuthorized(false)
      router.replace(fallbackUrl)
      return
    }

    setIsAuthorized(true)
  }, [isAuthenticated, isLoading, userRole, userPermissions, module, item, permission, hasPermission, router, fallbackUrl])

  // Show loading while checking auth
  if (isLoading || isAuthorized === null) {
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

  // Show loading while redirecting if unauthorized
  if (isAuthorized === false) {
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
