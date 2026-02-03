"use client"

import { useEffect } from 'react'
import { BreadcrumbItem, useBreadcrumbs } from '@/app/lib/contexts/breadcrumb-context'

export function PageBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    const { setBreadcrumbs } = useBreadcrumbs()

    useEffect(() => {
        // Immediate update on mount
        setBreadcrumbs(items)
        return () => {
            // Optional: clear on unmount if we want empty state between transitions, 
            // but typically keeping the last state until new one overrides is smoother.
            // setBreadcrumbs([]) 
        }
    }, [items, setBreadcrumbs]) // Reacting to items changes if they are dynamic

    return null
}
