"use client"

import { useState } from 'react'
import { Search, ChevronRight, ChevronDown, Building2, Users, Settings } from 'lucide-react'
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

export default function OrganizationPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['organization'])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
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
                          item.href === '/settings/organization'
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
              <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white mb-2">Organization Settings</h1>
              <p className="text-[#95AAC9]">Manage your organization's basic information and preferences</p>
            </div>

            {/* Organization Info Card */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#E3F2FD] dark:bg-blue-900/20 rounded-[4px]">
                  <Building2 className="w-6 h-6 text-[#2C7BE5]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Company Information</h2>
                  <p className="text-sm text-[#95AAC9]">Basic details about your organization</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Company Name <span className="text-[#DC3545]">*</span>
                  </label>
                  <input
                    type="text"
                    defaultValue="Epsilon Scheduling"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Industry
                  </label>
                  <select className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent">
                    <option>Manufacturing</option>
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Education</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@epsilon.com"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    defaultValue="+1 (555) 123-4567"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="123 Business Street, Suite 100, City, State 12345"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                <button className="px-4 py-2 text-sm text-[#95AAC9] hover:text-[#12263F] dark:hover:text-white transition-colors">
                  Cancel
                </button>
                <button className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded-[4px] hover:bg-blue-600 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/settings/users" className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 hover:border-[#2C7BE5] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#E8F5E8] dark:bg-green-900/20 rounded-[4px] group-hover:bg-[#2C7BE5] group-hover:text-white transition-colors">
                    <Users className="w-6 h-6 text-[#28A745] group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#12263F] dark:text-white">User Management</h3>
                    <p className="text-sm text-[#95AAC9]">Manage users and permissions</p>
                  </div>
                </div>
              </Link>

              <Link href="/settings/roles" className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6 hover:border-[#2C7BE5] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#FFF3E0] dark:bg-orange-900/20 rounded-[4px] group-hover:bg-[#2C7BE5] group-hover:text-white transition-colors">
                    <Settings className="w-6 h-6 text-[#FD7E14] group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#12263F] dark:text-white">Role Management</h3>
                    <p className="text-sm text-[#95AAC9]">Configure user roles</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
