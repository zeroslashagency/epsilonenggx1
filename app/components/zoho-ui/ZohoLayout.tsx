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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Persist sidebar state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  // Lock body scroll when mobile menu is open (mobile only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isMobile = window.innerWidth < 768
    
    if (mobileMenuOpen && isMobile) {
      // Lock scroll on mobile only
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      // Restore scroll
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [mobileMenuOpen])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[80] md:hidden"
          onClick={handleMobileMenuClose}
        />
      )}

      {/* Sidebar - Always fixed position */}
      <div 
        className={`
          fixed top-0 left-0 h-screen z-[150]
          transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
        style={{
          overscrollBehavior: 'contain',
          touchAction: 'none'
        }}
        onTouchMove={(e) => {
          // Prevent touch scroll from propagating to body
          e.stopPropagation()
        }}
      >
        <MemoizedSidebar 
          collapsed={sidebarCollapsed} 
          onToggleAction={handleToggle}
          onMobileMenuClose={handleMobileMenuClose}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ml-0
          md:ml-[70px]
          ${sidebarCollapsed ? '' : 'lg:ml-[280px]'}
          overflow-x-hidden
        `}
      >
        {/* Header */}
        <ZohoHeader 
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuToggle={handleMobileMenuToggle}
        />

        {/* Content */}
        <main className="pt-16">
          {/* Breadcrumb */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <ZohoBreadcrumb items={breadcrumbs} />
            </div>
          )}

          {/* Page Content */}
          <div className="p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
