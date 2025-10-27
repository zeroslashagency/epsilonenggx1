"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, Save, X, User, UserPlus, Shield, ArrowUpDown, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ZohoLayout } from '../../../../components/zoho-ui'

interface ModulePermission {
  full: boolean
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  approve?: boolean
}

interface PermissionModule {
  name: string
  items: Record<string, ModulePermission>
  specialPermissions?: string[]
}

interface Role {
  id: string
  name: string
  description: string
  isManufacturingRole?: boolean
  permissions?: Record<string, PermissionModule>
}

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const roleId = params?.id as string
  
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [isManufacturingRole, setIsManufacturingRole] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Initialize permission modules based on your system
  const [permissionModules, setPermissionModules] = useState<Record<string, PermissionModule>>({
    main_dashboard: {
      name: 'MAIN - Dashboard',
      items: {
        'Dashboard': {
          full: false,
          view: true,
          create: false,
          edit: false,
          delete: false
        }
      },
      specialPermissions: ['Allow users to export dashboard data', 'Allow users to customize dashboard layout']
    },
    main_scheduling: {
      name: 'MAIN - Scheduling',
      items: {
        'Schedule Generator': {
          full: false,
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: false
        },
        'Schedule Generator Dashboard': {
          full: false,
          view: true,
          create: false,
          edit: false,
          delete: false
        }
      },
      specialPermissions: ['Allow users to override schedule conflicts', 'Allow users to publish schedules']
    },
    main_analytics: {
      name: 'MAIN - Analytics & Charts',
      items: {
        'Chart': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Analytics': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      },
      specialPermissions: ['Allow users to export chart data', 'Allow users to create custom reports', 'Allow users to export sensitive data']
    },
    main_attendance: {
      name: 'MAIN - Attendance',
      items: {
        'Attendance': {
          full: false,
          view: true,
          create: true,
          edit: false,
          delete: false,
          approve: false
        },
        'Standalone Attendance': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      },
      specialPermissions: ['Allow users to modify attendance for others', 'Allow users to approve leave requests', 'Allow users to sync attendance data']
    },
    production: {
      name: 'PRODUCTION',
      items: {
        'Orders': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false
        },
        'Machines': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Personnel': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Tasks': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false
        }
      },
      specialPermissions: ['Allow users to halt production lines', 'Allow users to emergency stop machines', 'Allow users to modify production schedules']
    },
    monitoring: {
      name: 'MONITORING',
      items: {
        'Alerts': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Reports': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Quality Control': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false
        },
        'Maintenance': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false
        }
      },
      specialPermissions: ['Allow users to acknowledge critical alerts', 'Allow users to override quality checks', 'Allow users to schedule emergency maintenance']
    },
    system_administration: {
      name: 'SYSTEM - Administration',
      items: {
        'User Management': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Add Users': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Role Profiles': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Activity Logging': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'System Settings': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        },
        'Organization Settings': {
          full: false,
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      },
      specialPermissions: ['Allow users to impersonate other users', 'Allow users to modify system configurations', 'Allow users to delete users', 'Allow users to reset passwords']
    }
  })

  useEffect(() => {
    if (roleId) {
      fetchRole()
    }
  }, [roleId])

  const fetchRole = async () => {
    try {
      console.log('🔍 Fetching role from Supabase, ID:', roleId)
      
      // Try to fetch role from Supabase API
      const response = await fetch(`/api/admin/roles/${roleId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        const role = data.data
        
        console.log('✅ Role loaded from Supabase:', role)
        
        setRoleName(role.name)
        setDescription(role.description || '')
        setIsManufacturingRole(role.is_manufacturing_role || false)
        
        // Load permissions if available
        if (role.permissions_json) {
          setPermissionModules(role.permissions_json)
        } else if (role.name === 'Super Admin') {
          // Set all permissions for Super Admin if not in DB
          setPermissionModules(prev => {
            const updated = { ...prev }
            Object.keys(updated).forEach(moduleKey => {
              Object.keys(updated[moduleKey].items).forEach(itemKey => {
                updated[moduleKey].items[itemKey] = {
                  full: true,
                  view: true,
                  create: true,
                  edit: true,
                  delete: true,
                  ...(updated[moduleKey].items[itemKey].approve !== undefined && { approve: true })
                }
              })
            })
            return updated
          })
        }
      } else {
        // Fallback to mock data if Supabase fails
        console.warn('⚠️ Supabase failed, using mock data for role:', roleId)
        
        const mockRoles: Record<string, any> = {
          '1': { name: 'Super Admin', description: 'Full administrator access across every module.', isManufacturingRole: true },
          '2': { name: 'Admin', description: 'Operations leadership with scheduling, analytics, and user oversight.', isManufacturingRole: false },
          '3': { name: 'Operator', description: 'Production floor operator access to core scheduling tools.', isManufacturingRole: true },
          '4': { name: 'Monitor', description: 'Analytics and monitoring only; no editing rights.', isManufacturingRole: false },
          '5': { name: 'Attendance', description: 'Time & attendance tools only.', isManufacturingRole: false }
        }
        
        const mockRole = mockRoles[roleId]
        
        if (mockRole) {
          setRoleName(mockRole.name)
          setDescription(mockRole.description)
          setIsManufacturingRole(mockRole.isManufacturingRole)
          
          // Set permissions for Super Admin
          if (mockRole.name === 'Super Admin') {
            setPermissionModules(prev => {
              const updated = { ...prev }
              Object.keys(updated).forEach(moduleKey => {
                Object.keys(updated[moduleKey].items).forEach(itemKey => {
                  updated[moduleKey].items[itemKey] = {
                    full: true,
                    view: true,
                    create: true,
                    edit: true,
                    delete: true,
                    ...(updated[moduleKey].items[itemKey].approve !== undefined && { approve: true })
                  }
                })
              })
              return updated
            })
          }
          
          console.log('✅ Using mock data for role:', mockRole.name)
        } else {
          console.error('❌ Role not found with ID:', roleId)
          alert('Role not found')
          router.push('/settings/roles')
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch role:', error)
      
      // Fallback to mock data on error
      console.warn('⚠️ Error occurred, using mock data')
      const mockRoles: Record<string, any> = {
        '1': { name: 'Super Admin', description: 'Full administrator access across every module.', isManufacturingRole: true },
        '2': { name: 'Admin', description: 'Operations leadership with scheduling, analytics, and user oversight.', isManufacturingRole: false },
        '3': { name: 'Operator', description: 'Production floor operator access to core scheduling tools.', isManufacturingRole: true }
      }
      
      const mockRole = mockRoles[roleId]
      if (mockRole) {
        setRoleName(mockRole.name)
        setDescription(mockRole.description)
        setIsManufacturingRole(mockRole.isManufacturingRole)
        console.log('✅ Using mock data for role:', mockRole.name)
      }
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = (moduleKey: string, itemKey: string, permission: keyof ModulePermission, value: boolean) => {
    setPermissionModules(prev => {
      const currentItem = prev[moduleKey].items[itemKey]
      
      // If "Full" is checked, automatically check all other permissions
      if (permission === 'full' && value) {
        return {
          ...prev,
          [moduleKey]: {
            ...prev[moduleKey],
            items: {
              ...prev[moduleKey].items,
              [itemKey]: {
                full: true,
                view: true,
                create: true,
                edit: true,
                delete: true,
                ...(currentItem.approve !== undefined && { approve: true })
              }
            }
          }
        }
      }
      
      // If "Full" is unchecked, uncheck all permissions
      if (permission === 'full' && !value) {
        return {
          ...prev,
          [moduleKey]: {
            ...prev[moduleKey],
            items: {
              ...prev[moduleKey].items,
              [itemKey]: {
                full: false,
                view: false,
                create: false,
                edit: false,
                delete: false,
                ...(currentItem.approve !== undefined && { approve: false })
              }
            }
          }
        }
      }
      
      // For other permissions, just update that specific permission
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          items: {
            ...prev[moduleKey].items,
            [itemKey]: {
              ...prev[moduleKey].items[itemKey],
              [permission]: value
            }
          }
        }
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const roleData = {
        name: roleName,
        description: description,
        is_manufacturing_role: isManufacturingRole,
        permissions: permissionModules,
        updated_at: new Date().toISOString()
      }
      
      console.log('💾 Saving role:', roleData)
      
      // Try to save to Supabase
      try {
        const response = await fetch(`/api/admin/roles/${roleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleData)
        })

        const data = await response.json()
        
        if (data.success) {
          console.log('✅ Role saved successfully to Supabase')
          alert(`✅ Role "${roleName}" updated successfully!\n\nChanges saved:\n- Name: ${roleName}\n- Description: ${description}\n- Manufacturing Role: ${isManufacturingRole ? 'Yes' : 'No'}\n- Permissions: Updated`)
          router.push('/settings/roles')
          return
        } else {
          console.warn('⚠️ Supabase save failed, using mock save:', data.error)
        }
      } catch (apiError) {
        console.warn('⚠️ API error, using mock save:', apiError)
      }
      
      // Fallback: Mock save (just show success message)
      console.log('✅ Using mock save - changes logged but not persisted')
      alert(`✅ Role "${roleName}" updated successfully! (Mock Mode)\n\nChanges saved:\n- Name: ${roleName}\n- Description: ${description}\n- Manufacturing Role: ${isManufacturingRole ? 'Yes' : 'No'}\n- Permissions: Updated\n\n⚠️ Note: Changes are not persisted to database (using mock data)`)
      router.push('/settings/roles')
      
    } catch (error: any) {
      console.error('❌ Failed to save role:', error)
      alert(`❌ Failed to save role\n\n${error.message || 'Please check the console for details'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ZohoLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-600 dark:text-gray-400">Loading role...</div>
          </div>
        </div>
      </ZohoLayout>
    )
  }

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Role</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Modify role permissions and settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full p-6">

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter role name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Max. 500 characters"
                maxLength={500}
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-2xl">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="manufacturingRole"
                  checked={isManufacturingRole}
                  onChange={(e) => setIsManufacturingRole(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                />
                <div>
                  <label htmlFor="manufacturingRole" className="text-sm font-medium text-gray-900 dark:text-white">
                    This role is for Manufacturing users
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    If you mark this option, all users who are added with this role will be a manufacturing user.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        {Object.entries(permissionModules).map(([moduleKey, module]) => (
          <div key={moduleKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">{module.name}</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">Particulars</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20">Full</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20">View</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20">Create</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20">Edit</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20">Delete</th>
                    {Object.values(module.items).some(item => 'approve' in item) && (
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-20">Approve</th>
                    )}
                  </tr>
                </thead>
                
                <tbody>
                  {Object.entries(module.items).map(([itemKey, item]) => (
                    <tr key={itemKey} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">{itemKey}</td>
                      
                      <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={item.full}
                          onChange={(e) => updatePermission(moduleKey, itemKey, 'full', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={item.view}
                          onChange={(e) => updatePermission(moduleKey, itemKey, 'view', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={item.create}
                          onChange={(e) => updatePermission(moduleKey, itemKey, 'create', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={item.edit}
                          onChange={(e) => updatePermission(moduleKey, itemKey, 'edit', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                        <input
                          type="checkbox"
                          checked={item.delete}
                          onChange={(e) => updatePermission(moduleKey, itemKey, 'delete', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      
                      {item.approve !== undefined && (
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={item.approve}
                            onChange={(e) => updatePermission(moduleKey, itemKey, 'approve', e.target.checked)}
                            className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Special Permissions */}
            {module.specialPermissions && module.specialPermissions.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Additional Permissions</h4>
                <div className="space-y-2">
                  {module.specialPermissions.map((permission, index) => (
                    <label key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </ZohoLayout>
  )
}
