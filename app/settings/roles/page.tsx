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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [affectedUsers, setAffectedUsers] = useState<any[]>([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const data = await apiGet('/api/admin/roles')
      console.log('📋 Roles API response:', data)
      
      if (data.success && data.data) {
        // Use roles from API response
        if (Array.isArray(data.data.roles)) {
          setRoles(data.data.roles)
        } else if (Array.isArray(data.data)) {
          setRoles(data.data)
        } else {
          console.error('❌ Unexpected roles data format:', data.data)
          setRoles([])
        }
      } else {
        console.error('❌ Failed to fetch roles:', data.error)
        setRoles([])
      }
    } catch (error) {
      console.error('❌ Error fetching roles:', error)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role)
    setDeleteError(null)
    setAffectedUsers([])
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return
    
    setDeleting(true)
    try {
      const { apiDelete } = await import('@/app/lib/utils/api-client')
      const data = await apiDelete(`/api/admin/roles/${roleToDelete.id}`)
      
      if (!data.success) {
        // Role is assigned to users
        setDeleteError(data.message || 'Cannot delete this role')
        setAffectedUsers(data.users || [])
        setDeleting(false)
        return
      }
      
      // Success - refresh roles list
      alert(`✅ Role "${roleToDelete.name}" deleted successfully!`)
      setDeleteConfirmOpen(false)
      setRoleToDelete(null)
      setDeleting(false)
      fetchRoles()
      
    } catch (error) {
      setDeleteError('Failed to delete role. Please try again.')
      setDeleting(false)
    }
  }

  const handleCloneRole = async (role: Role) => {
    try {
      const { apiPost } = await import('@/app/lib/utils/api-client')
      const data = await apiPost(`/api/admin/roles/${role.id}/clone`, {})
      
      if (data.success) {
        alert(`✅ Role cloned successfully as "${data.data.name}"`)
        fetchRoles()
      } else {
        alert(`❌ Failed to clone role: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Failed to clone role. Please try again.')
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
                          <button 
                            onClick={() => handleCloneRole(role)}
                            className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Clone
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(role)}
                            className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
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

        {/* Delete Confirmation Dialog */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">
                Delete Role: {roleToDelete?.name}
              </h3>
              
              {deleteError ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-800 dark:text-red-200">{deleteError}</p>
                  </div>
                  
                  {affectedUsers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[#12263F] dark:text-white">
                        Users with this role:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {affectedUsers.map((user, idx) => (
                          <div key={idx} className="text-sm text-[#95AAC9] bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            {user.name} ({user.email})
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#95AAC9] mt-2">
                        Please reassign these users to another role before deleting.
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setDeleteConfirmOpen(false)
                      setRoleToDelete(null)
                      setDeleteError(null)
                      setAffectedUsers([])
                    }}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[#95AAC9]">
                    Are you sure you want to delete this role? This action cannot be undone.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(false)
                        setRoleToDelete(null)
                      }}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
