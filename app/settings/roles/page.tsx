"use client"

import { useState, useEffect } from 'react'
import { Shield, User, UserPlus, ArrowUpDown, Zap, Plus, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'
import { apiGet } from '@/app/lib/utils/api-client'

interface Role {
  id: string
  name: string
  description: string
  default_permissions?: string[]
}

interface RoleProfile {
  name: string
  description: string
  permissions: string[]
}

// Permission labels mapping
const PERMISSION_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'schedule_generator': 'Schedule Generator',
  'schedule_generator_dashboard': 'Schedule Generator Dashboard',
  'chart': 'Chart',
  'analytics': 'Analytics',
  'attendance': 'Attendance',
  'standalone_attendance': 'Standalone Attendance',
  'production': 'Production',
  'monitoring': 'Monitoring',
  'manage_users': 'Manage Users & Security'
}

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'dashboard': 'Access the primary manufacturing overview dashboard.',
  'schedule_generator': 'Open the smart schedule builder and adjust production timelines.',
  'schedule_generator_dashboard': 'Access the dedicated schedule generator dashboard page.',
  'chart': 'Explore production charts and machine KPIs.',
  'analytics': 'Run analytics dashboards and export performance reports.',
  'attendance': 'View attendance data and reports within the main system.',
  'standalone_attendance': 'Access the dedicated attendance website with same credentials.',
  'production': 'Early toggle for upcoming production workflow screens.',
  'monitoring': 'Early toggle for upcoming monitoring dashboards.',
  'manage_users': 'Create users, assign roles, view audit logs, and impersonate accounts.'
}

export default function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const data = await apiGet('/api/admin/roles')
      if (data.success && Array.isArray(data.data)) {
        setRoles(data.data)
      } else {
        // Fallback to mock data with permissions
        setRoles([
          {
            id: '1',
            name: 'Super Admin',
            description: 'Full administrator access across every module.',
            default_permissions: ['dashboard', 'schedule_generator', 'schedule_generator_dashboard', 'chart', 'analytics', 'attendance', 'standalone_attendance', 'production', 'monitoring', 'manage_users']
          },
          {
            id: '2',
            name: 'Admin',
            description: 'Operations leadership with scheduling, analytics, and user oversight.',
            default_permissions: ['dashboard', 'schedule_generator', 'schedule_generator_dashboard', 'chart', 'analytics', 'attendance', 'standalone_attendance', 'manage_users']
          },
          {
            id: '3',
            name: 'Operator',
            description: 'Production floor operator access to core scheduling tools.',
            default_permissions: ['dashboard', 'schedule_generator', 'schedule_generator_dashboard', 'chart']
          },
          {
            id: '4',
            name: 'Monitor',
            description: 'Analytics and monitoring only; no editing rights.',
            default_permissions: ['dashboard', 'chart', 'analytics']
          },
          {
            id: '5',
            name: 'Attendance',
            description: 'Time & attendance tools only.',
            default_permissions: ['attendance', 'standalone_attendance']
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <ZohoLayout>
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
              className="flex items-center gap-2 px-4 py-3 text-sm text-white bg-[#00A651] rounded-t transition-colors border-b-2 border-[#00A651]"
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

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Roles</h1>
          </div>
          <Link href="/settings/roles/new">
            <button className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center gap-2">
              New Role
            </button>
          </Link>
        </div>

        {/* Roles Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">ROLE NAME</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">DESCRIPTION</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-700 dark:text-gray-300">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No roles found
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{role.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{role.description}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/settings/roles/${role.id}/edit`}>
                            <button className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              Edit
                            </button>
                          </Link>
                          <button className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Clone
                          </button>
                          <button className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
