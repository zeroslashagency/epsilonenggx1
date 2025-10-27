"use client"

import { User, UserPlus, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { ZohoLayout } from '../components/zoho-ui'

export default function SettingsPage() {
  return (
    <ZohoLayout breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="flex items-center gap-2 px-6">
            <Link
              href="/settings/users"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
            >
              <User className="w-4 h-4" />
              User Management
            </Link>
            <Link
              href="/settings/add-users"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
            >
              <UserPlus className="w-4 h-4" />
              Add Users
            </Link>
            <Link
              href="/settings/roles"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
            >
              <Shield className="w-4 h-4" />
              Role Profiles
            </Link>
            <Link
              href="/settings/activity-logs"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
            >
              <Zap className="w-4 h-4" />
              Activity Logging
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-12">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#12263F] dark:text-white mb-4">Settings</h2>
            <p className="text-[#95AAC9] mb-6">Select a tab above to manage your settings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Link
                href="/settings/users"
                className="p-6 border border-[#E3E6F0] dark:border-gray-700 rounded hover:border-[#2C7BE5] transition-colors group"
              >
                <User className="w-8 h-8 text-[#2C7BE5] mx-auto mb-3" />
                <h3 className="font-semibold text-[#12263F] dark:text-white mb-2">User Management</h3>
                <p className="text-sm text-[#95AAC9]">Manage users and permissions</p>
              </Link>
              <Link
                href="/settings/add-users"
                className="p-6 border border-[#E3E6F0] dark:border-gray-700 rounded hover:border-[#2C7BE5] transition-colors group"
              >
                <UserPlus className="w-8 h-8 text-[#00A651] mx-auto mb-3" />
                <h3 className="font-semibold text-[#12263F] dark:text-white mb-2">Add Users</h3>
                <p className="text-sm text-[#95AAC9]">Create new user accounts</p>
              </Link>
              <Link
                href="/settings/roles"
                className="p-6 border border-[#E3E6F0] dark:border-gray-700 rounded hover:border-[#2C7BE5] transition-colors group"
              >
                <Shield className="w-8 h-8 text-[#FD7E14] mx-auto mb-3" />
                <h3 className="font-semibold text-[#12263F] dark:text-white mb-2">Role Profiles</h3>
                <p className="text-sm text-[#95AAC9]">Configure user roles</p>
              </Link>
              <Link
                href="/settings/activity-logs"
                className="p-6 border border-[#E3E6F0] dark:border-gray-700 rounded hover:border-[#2C7BE5] transition-colors group"
              >
                <Zap className="w-8 h-8 text-[#E74C3C] mx-auto mb-3" />
                <h3 className="font-semibold text-[#12263F] dark:text-white mb-2">Activity Logging</h3>
                <p className="text-sm text-[#95AAC9]">View system activity logs</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
