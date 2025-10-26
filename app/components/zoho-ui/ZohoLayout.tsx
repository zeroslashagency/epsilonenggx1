"use client"

import { useState, ReactNode } from 'react'
import { ZohoSidebar } from './ZohoSidebar'
import { ZohoHeader } from './ZohoHeader'
import { ZohoBreadcrumb } from './ZohoBreadcrumb'

interface ZohoLayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function ZohoLayout({ children, breadcrumbs }: ZohoLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <ZohoSidebar collapsed={sidebarCollapsed} onToggleAction={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
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
