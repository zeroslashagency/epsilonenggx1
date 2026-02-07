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
} from 'lucide-react'
import { useTheme } from '@/app/lib/contexts/theme-context'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { SidebarTrigger } from '@/components/animate-ui/components/radix/sidebar'
import { Separator } from '@/components/ui/separator'

export function AppHeader() {
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
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background px-4">
            <div className="flex items-center gap-2 px-4 md:hidden">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
            </div>

            {/* Search Bar - Hidden on very small mobile only */}
            <div className="hidden sm:flex flex-1 max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="
              w-full pl-9 pr-3 py-2 
              bg-muted/50 
              border-none
              rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-ring
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
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {/* Notifications */}
                <div className="relative hidden sm:block">
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications)
                            setShowUserMenu(false)
                        }}
                        className="relative p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
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
                      px-4 py-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors
                      ${notification.unread ? 'bg-muted/30' : ''}
                    `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{notification.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                                            </div>
                                            {notification.unread && (
                                                <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowUserMenu(!showUserMenu)
                            setShowNotifications(false)
                        }}
                        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border"
                    >
                        <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">
                            {userEmail?.split('@')[0] || 'admin'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* User Dropdown */}
                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="text-sm font-medium">{userEmail?.split('@')[0] || 'User'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
                            </div>
                            <div className="py-2">
                                <button className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-muted/50 transition-colors">
                                    <UserCircle className="w-4 h-4" />
                                    <span className="text-sm">My Profile</span>
                                </button>
                                <button className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-muted/50 transition-colors">
                                    <Settings className="w-4 h-4" />
                                    <span className="text-sm">Settings</span>
                                </button>
                                <button className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-muted/50 transition-colors">
                                    <HelpCircle className="w-4 h-4" />
                                    <span className="text-sm">Help & Support</span>
                                </button>
                            </div>
                            <div className="border-t border-border py-2">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
