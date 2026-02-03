"use client"

import { useState } from 'react'
import {
  Search,
  Bell,
  Settings,
  User,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  UserCircle,
  HelpCircle,
  Menu
} from 'lucide-react'
import { useTheme } from '@/app/lib/contexts/theme-context'
import { useAuth } from '@/app/lib/contexts/auth-context'

interface ZohoHeaderProps {
  breadcrumbs?: any
  sidebarCollapsed?: boolean
  onMobileMenuToggle?: () => void
}

export function ZohoHeader({ breadcrumbs, sidebarCollapsed = false, onMobileMenuToggle }: ZohoHeaderProps) {
  const themeContext = useTheme()
  const theme = themeContext?.theme || 'light'
  const toggleTheme = themeContext?.toggleTheme || (() => { })
  const { userEmail, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const notifications = [
    { id: 1, title: 'New user registered', time: '5 min ago', unread: true },
    { id: 2, title: 'Schedule updated', time: '1 hour ago', unread: true },
    { id: 3, title: 'Attendance report ready', time: '2 hours ago', unread: false }
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header
      className={`
        fixed top-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-[100]
        left-0 right-0
        md:left-[70px]
        ${!sidebarCollapsed ? 'lg:left-[280px]' : ''}
      `}
      style={{
        position: 'fixed !important' as any,
        top: '0 !important',
        zIndex: 100
      }}
    >
      <div className="h-full px-4 md:px-6 flex items-center gap-3">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar - Hidden on very small mobile only */}
        <div className="hidden sm:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-9 pr-3 py-2 
                bg-gray-50 dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700
                rounded-lg text-sm
                text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                focus:border-transparent
                transition-all
              "
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="
              p-2 rounded-full
              text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
            "
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="
                relative p-2 rounded-full
                text-gray-600 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors
              "
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="
                absolute right-0 mt-2 w-80
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg
                overflow-hidden
              ">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        px-4 py-3 border-b border-gray-100 dark:border-gray-700
                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                        cursor-pointer transition-colors
                        ${notification.unread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {notification.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                  <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            className="
              p-2 rounded-full
              text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
            "
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="
                flex items-center space-x-2 px-2.5 py-1.5 rounded-full
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors border border-gray-200 dark:border-gray-700
              "
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium">
                {userEmail?.split('@')[0] || 'admin'}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="
                absolute right-0 mt-2 w-64
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg
                overflow-hidden
              ">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {userEmail?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {userEmail}
                  </p>
                </div>
                <div className="py-2">
                  <button className="
                    w-full flex items-center space-x-3 px-4 py-2
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    transition-colors
                  ">
                    <UserCircle className="w-4 h-4" />
                    <span className="text-sm">My Profile</span>
                  </button>
                  <button className="
                    w-full flex items-center space-x-3 px-4 py-2
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    transition-colors
                  ">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button className="
                    w-full flex items-center space-x-3 px-4 py-2
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    transition-colors
                  ">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-sm">Help & Support</span>
                  </button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                  <button
                    onClick={logout}
                    className="
                      w-full flex items-center space-x-3 px-4 py-2
                      text-red-600 dark:text-red-400
                      hover:bg-red-50 dark:hover:bg-red-900/20
                      transition-colors
                    "
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
