"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/contexts/auth-context'

interface PermissionGuardProps {
    children: React.ReactNode
    module: string
    item: string
    action?: string
    fallbackUrl?: string
}

export default function PermissionGuard({
    children,
    module,
    item,
    action = 'view',
    fallbackUrl = '/dashboard'
}: PermissionGuardProps) {
    const { isAuthenticated, isLoading, hasPermission, userRole } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (isLoading) return

        // Middleware should catch this, but double check
        if (!isAuthenticated) {
            router.push('/auth')
            return
        }

        // Super Admin bypass
        const normalizedRole = userRole?.toLowerCase()?.trim()
        if (normalizedRole === 'super admin' || normalizedRole === 'super_admin') {
            return
        }

        // Check granular permission
        if (!hasPermission(module, item, action)) {
            console.warn(`Access denied to [${module}.${item}.${action}] for role [${userRole}]`)
            router.push(fallbackUrl)
        }
    }, [isLoading, isAuthenticated, hasPermission, userRole, module, item, action, router, fallbackUrl])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    // Optimistic render - if effect triggers redirect, this will unmount quickly
    // Ideally, we'd render null until verified, but that can cause flash
    const normalizedRole = userRole?.toLowerCase()?.trim()
    const hasAccess =
        normalizedRole === 'super admin' ||
        normalizedRole === 'super_admin' ||
        hasPermission(module, item, action)

    return hasAccess ? <>{children}</> : null
}
