"use client"

import { useState, useEffect, ReactNode, memo } from 'react'
import { usePathname } from 'next/navigation'
import { ZohoSidebar } from './ZohoSidebar'
import { ZohoHeader } from './ZohoHeader'
import { ZohoBreadcrumb } from './ZohoBreadcrumb'

interface ZohoLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

// Memoize sidebar to prevent re-renders
const MemoizedSidebar = memo(ZohoSidebar)

export function ZohoLayout({ children, breadcrumbs }: ZohoLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // Persist sidebar state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - Memoized to prevent re-renders */}
      <MemoizedSidebar collapsed={sidebarCollapsed} onToggleAction={handleToggle} />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'ml-[70px]' : 'ml-[280px]'}
        `}
      >
        {/* Header */}
        <ZohoHeader sidebarCollapsed={sidebarCollapsed} />

        {/* Content */}
        <main className="pt-16">
          {/* Breadcrumb */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <ZohoBreadcrumb items={breadcrumbs} />
            </div>
          )}

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
