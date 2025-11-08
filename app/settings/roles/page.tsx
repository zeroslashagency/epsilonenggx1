"use client"

import { useState, useEffect } from 'react'
import { Shield, Plus, Edit, Trash2, Copy, Search, ChevronLeft, ChevronRight, X, User, UserPlus, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'
import { apiGet, apiPost, apiDelete } from '@/app/lib/utils/api-client'
import { TableLoading } from '@/components/ui/loading-spinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

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

function RolesPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [affectedUsers, setAffectedUsers] = useState<any[]>([])
  const [deleting, setDeleting] = useState(false)
  const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false)
  const [roleToClone, setRoleToClone] = useState<Role | null>(null)
  const [cloning, setCloning] = useState(false)

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
    setDeleteConfirmStep(1)
    setDeleteConfirmOpen(true)
  }

  const handleFirstConfirm = () => {
    setDeleteConfirmStep(2)
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
      setDeleteConfirmStep(1)
      setRoleToDelete(null)
      setDeleting(false)
      fetchRoles()
      
    } catch (error) {
      setDeleteError('Failed to delete role. Please try again.')
      setDeleting(false)
    }
  }

  const handleCloneClick = (role: Role) => {
    setRoleToClone(role)
    setCloneConfirmOpen(true)
  }

  const handleCloneConfirm = async () => {
    if (!roleToClone) return
    
    setCloning(true)
    try {
      const { apiPost } = await import('@/app/lib/utils/api-client')
      const data = await apiPost(`/api/admin/roles/${roleToClone.id}/clone`, {})
      
      if (data.success) {
        alert(`✅ Role cloned successfully as "${data.data.name}"`)
        setCloneConfirmOpen(false)
        setRoleToClone(null)
        fetchRoles()
      } else {
        alert(`❌ Failed to clone role: ${data.error}`)
      }
    } catch (error) {
      alert('❌ Failed to clone role. Please try again.')
    } finally {
      setCloning(false)
    }
  }

  return (
    <>
      <div className="space-y-6">

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
                  <TableLoading colSpan={3} text="Loading roles" />
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
                            onClick={() => handleCloneClick(role)}
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

        {/* Clone Confirmation Dialog */}
        {cloneConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">
                Clone Role: {roleToClone?.name}
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-[#95AAC9]">
                  Are you sure you want to clone the role <strong className="text-[#12263F] dark:text-white">"{roleToClone?.name}"</strong>?
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  ℹ️ A new role will be created with the same permissions as "{roleToClone?.name}" with "(Copy)" appended to the name.
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCloneConfirmOpen(false)
                      setRoleToClone(null)
                    }}
                    disabled={cloning}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloneConfirm}
                    disabled={cloning}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {cloning ? 'Cloning...' : 'Yes, Clone Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      setDeleteConfirmStep(1)
                      setRoleToDelete(null)
                      setDeleteError(null)
                      setAffectedUsers([])
                    }}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              ) : deleteConfirmStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#95AAC9]">
                    Are you sure you want to delete the role <strong className="text-[#12263F] dark:text-white">"{roleToDelete?.name}"</strong>?
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    ⚠️ Warning: This action cannot be undone.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(false)
                        setDeleteConfirmStep(1)
                        setRoleToDelete(null)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFirstConfirm}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ FINAL CONFIRMATION
                  </p>
                  <p className="text-sm text-[#95AAC9]">
                    You are about to permanently delete the role <strong className="text-[#12263F] dark:text-white">"{roleToDelete?.name}"</strong>. This action is irreversible.
                  </p>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-xs text-red-800 dark:text-red-200">
                      Please confirm that you understand this role will be permanently deleted.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeleteConfirmStep(1)
                      }}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-semibold"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Wrap with ProtectedRoute to require authentication
function ProtectedRolesPage() {
  return (
    <ProtectedRoute requireRole={['Super Admin', 'Admin']}>
      <RolesPage />
    </ProtectedRoute>
  )
}

export default ProtectedRolesPage
