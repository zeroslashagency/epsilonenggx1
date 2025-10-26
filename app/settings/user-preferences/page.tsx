"use client"

import { useState } from 'react'
import { Search, ChevronRight, ChevronDown, User, Bell, Palette, Clock } from 'lucide-react'
import Link from 'next/link'

const settingsSections = [
  {
    id: 'organization',
    title: 'ORGANIZATION SETTINGS',
    items: [
      { id: 'org', label: 'Organization', href: '/settings/organization' },
      { id: 'user-management', label: 'User Management', href: '/users' },
      { id: 'add-users', label: 'Add Users', href: '/users?action=add' },
      { id: 'role-profiles', label: 'Role Profiles', href: '/settings/roles' },
      { id: 'activity-logging', label: 'Activity Logging', href: '/settings/activity-logs' },
      { id: 'user-prefs', label: 'User Preferences', href: '/settings/user-preferences' }
    ]
  }
]

export default function UserPreferencesPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['organization'])
  const [searchQuery, setSearchQuery] = useState('')
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    emailAlerts: true,
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
    language: 'en'
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-gray-950">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-900 border-r border-[#E3E6F0] dark:border-gray-800 min-h-screen">
          {/* Header */}
          <div className="p-6 border-b border-[#E3E6F0] dark:border-gray-800">
            <h1 className="text-lg font-semibold text-[#12263F] dark:text-white">All Settings</h1>
            
            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#95AAC9]" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white placeholder-[#95AAC9] focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            {settingsSections.map((section) => (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left p-2 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded-[4px] transition-colors"
                >
                  <span className="text-xs font-semibold text-[#95AAC9] uppercase tracking-wider">
                    {section.title}
                  </span>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="w-4 h-4 text-[#95AAC9]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#95AAC9]" />
                  )}
                </button>
                
                {expandedSections.includes(section.id) && (
                  <div className="ml-2 mt-2 space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`block px-3 py-2 text-sm rounded-[4px] transition-colors ${
                          item.href === '/settings/user-preferences'
                            ? 'bg-[#2C7BE5] text-white'
                            : 'text-[#12263F] dark:text-gray-300 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white mb-2">User Preferences</h1>
              <p className="text-[#95AAC9]">Customize your personal settings and preferences</p>
            </div>

            {/* Appearance Settings */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#E3F2FD] dark:bg-blue-900/20 rounded-[4px]">
                  <Palette className="w-6 h-6 text-[#2C7BE5]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Appearance</h2>
                  <p className="text-sm text-[#95AAC9]">Customize how the interface looks</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-3">
                    Theme
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={preferences.theme === 'light'}
                        onChange={(e) => updatePreference('theme', e.target.value)}
                        className="w-4 h-4 text-[#2C7BE5] border-[#E3E6F0] focus:ring-[#2C7BE5]"
                      />
                      <span className="ml-2 text-sm text-[#12263F] dark:text-white">Light</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={preferences.theme === 'dark'}
                        onChange={(e) => updatePreference('theme', e.target.value)}
                        className="w-4 h-4 text-[#2C7BE5] border-[#E3E6F0] focus:ring-[#2C7BE5]"
                      />
                      <span className="ml-2 text-sm text-[#12263F] dark:text-white">Dark</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="theme"
                        value="auto"
                        checked={preferences.theme === 'auto'}
                        onChange={(e) => updatePreference('theme', e.target.value)}
                        className="w-4 h-4 text-[#2C7BE5] border-[#E3E6F0] focus:ring-[#2C7BE5]"
                      />
                      <span className="ml-2 text-sm text-[#12263F] dark:text-white">Auto</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Language
                  </label>
                  <select 
                    value={preferences.language}
                    onChange={(e) => updatePreference('language', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#E8F5E8] dark:bg-green-900/20 rounded-[4px]">
                  <Bell className="w-6 h-6 text-[#28A745]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Notifications</h2>
                  <p className="text-sm text-[#95AAC9]">Manage how you receive notifications</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#12263F] dark:text-white">Push Notifications</h3>
                    <p className="text-sm text-[#95AAC9]">Receive notifications in the browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications}
                      onChange={(e) => updatePreference('notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#2C7BE5]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#12263F] dark:text-white">Email Alerts</h3>
                    <p className="text-sm text-[#95AAC9]">Receive important updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailAlerts}
                      onChange={(e) => updatePreference('emailAlerts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#2C7BE5]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Time & Date Settings */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#FFF3E0] dark:bg-orange-900/20 rounded-[4px]">
                  <Clock className="w-6 h-6 text-[#FD7E14]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Time & Date</h2>
                  <p className="text-sm text-[#95AAC9]">Configure time zone and date formats</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Time Zone
                  </label>
                  <select 
                    value={preferences.timezone}
                    onChange={(e) => updatePreference('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  >
                    <option value="UTC-8">Pacific Time (UTC-8)</option>
                    <option value="UTC-7">Mountain Time (UTC-7)</option>
                    <option value="UTC-6">Central Time (UTC-6)</option>
                    <option value="UTC-5">Eastern Time (UTC-5)</option>
                    <option value="UTC+0">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Date Format
                  </label>
                  <select 
                    value={preferences.dateFormat}
                    onChange={(e) => updatePreference('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-sm text-[#95AAC9] hover:text-[#12263F] dark:hover:text-white transition-colors">
                Reset to Defaults
              </button>
              <button className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded-[4px] hover:bg-blue-600 transition-colors">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
