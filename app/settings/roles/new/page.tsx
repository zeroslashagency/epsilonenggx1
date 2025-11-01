"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Save, X, Info, User, UserPlus, Shield, ArrowUpDown, Zap } from 'lucide-react'
import { ZohoLayout } from '../../../components/zoho-ui'
import Link from 'next/link'
import { initialPermissionModules, type ModulePermission, type PermissionModule } from './permissionData'

export default function NewRolePage() {
  const router = useRouter()
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [isManufacturingRole, setIsManufacturingRole] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    // Dashboard
    dashboard: true,
    // Scheduling
    schedule_generator: true,
    schedule_dashboard: true,
    // Charts & Analytics
    chart: true,
    analytics: true,
    // Attendance
    attendance: true,
    standalone_attendance: true,
    // Production
    orders: true,
    machines: true,
    personnel: true,
    tasks: true,
    // Monitoring
    alerts: true,
    reports: true,
    quality_control: true,
    maintenance: true,
    // Administration
    user_management: true,
    add_users: true,
    role_profiles: true,
    activity_logging: true,
    system_settings: true,
    account: true
  })
  
  // Initialize permission modules from imported data
  const [permissionModules, setPermissionModules] = useState<Record<string, PermissionModule>>(initialPermissionModules)
  
  // Toggle collapse state for parent items
  const toggleCollapse = (itemKey: string) => {
    setCollapsed(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }))
  }
  
  // Helper to get collapse key from item name
  const getCollapseKey = (itemName: string): string => {
    return itemName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
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
    if (!roleName.trim()) {
      alert('Please enter a role name')
      return
    }

    try {
      
      // Convert permission modules to simple permission codes for API
      const permissionCodes: string[] = []
      
      Object.entries(permissionModules).forEach(([moduleKey, module]) => {
        Object.entries(module.items).forEach(([itemName, permissions]) => {
          // Map UI permissions to database permission codes
          if (permissions.view) {
            // Add view permission based on item name
            if (itemName === 'Dashboard') permissionCodes.push('view_dashboard')
            if (itemName === 'Schedule Generator') permissionCodes.push('view_schedule')
            if (itemName === 'Schedule Generator Dashboard') permissionCodes.push('view_schedule_dashboard')
            if (itemName === 'Chart') permissionCodes.push('view_dashboard')
            if (itemName === 'Analytics') permissionCodes.push('view_reports')
            if (itemName === 'Attendance') permissionCodes.push('attendance_read')
            if (itemName === 'Standalone Attendance') permissionCodes.push('attendance_read')
          }
          if (permissions.create) {
            if (itemName === 'Schedule Generator') permissionCodes.push('edit_schedule')
            if (itemName === 'Attendance') permissionCodes.push('attendance_mark')
          }
          if (permissions.edit) {
            if (itemName === 'Schedule Generator') permissionCodes.push('edit_schedule')
          }
          if (permissions.approve) {
            // Add approve permissions if needed
          }
        })
      })
      
      // Remove duplicates
      const uniquePermissions = [...new Set(permissionCodes)]
      
      const { apiPost } = await import('@/app/lib/utils/api-client')
      const data = await apiPost('/api/admin/roles', {
        name: roleName,
        description: description || `Custom role: ${roleName}`,
        is_manufacturing_role: isManufacturingRole,
        permissions: uniquePermissions,
        permissions_json: permissionModules
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to create role')
      }

      alert('✅ Role created successfully!')
      router.push('/settings/roles')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`❌ Failed to save role:\n\n${errorMessage}`)
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">New Role</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create a new role with custom permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#2C7BE5] text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Role
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
            <div key={moduleKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{module.name}</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Header */}
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600">Particulars</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600 w-20">Full</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600 w-20">View</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600 w-20">Create</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600 w-20">Edit</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 dark:border-gray-600 w-20">Delete</th>
                      {Object.values(module.items).some(item => 'approve' in item) && (
                        <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-20">Approve</th>
                      )}
                    </tr>
                  </thead>
                  
                  {/* Body */}
                  <tbody>
                    {Object.entries(module.items).map(([itemKey, item]) => {
                      // Skip sub-items here, they'll be rendered after their parent
                      if (item.isSubItem) return null
                      
                      const collapseKey = getCollapseKey(itemKey)
                      const isCollapsed = collapsed[collapseKey] ?? true
                      const hasSubItems = item.isCollapsible
                      
                      return (
                        <>
                          {/* Parent Row */}
                          <tr key={itemKey} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-2">
                                {hasSubItems && (
                                  <button
                                    onClick={() => toggleCollapse(collapseKey)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                    type="button"
                                  >
                                    {isCollapsed ? (
                                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    )}
                                  </button>
                                )}
                                <span className={hasSubItems ? "font-semibold" : ""}>{itemKey}</span>
                              </div>
                            </td>
                        
                        <td className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600 dark:border-gray-600">
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
                          
                          {/* Sub-items (only shown when parent is expanded) */}
                          {!isCollapsed && hasSubItems && Object.entries(module.items)
                            .filter(([_, subItem]) => subItem.isSubItem && subItem.parent === itemKey)
                            .map(([subItemKey, subItem]) => (
                              <tr key={subItemKey} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 pl-12">
                                  {subItemKey}
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={subItem.full}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'full', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={subItem.view}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'view', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={subItem.create}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'create', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={subItem.edit}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'edit', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                
                                <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={subItem.delete}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'delete', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                                
                                {subItem.approve !== undefined && (
                                  <td className="py-3 px-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={subItem.approve}
                                      onChange={(e) => updatePermission(moduleKey, subItemKey, 'approve', e.target.checked)}
                                      className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </td>
                                )}
                              </tr>
                            ))}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Special Permissions */}
              {module.specialPermissions && module.specialPermissions.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Permissions</h4>
                  <div className="space-y-2">
                    {module.specialPermissions.map((permission, index) => (
                      <label key={index} className="flex items-start gap-3 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
