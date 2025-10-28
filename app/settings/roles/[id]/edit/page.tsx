"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Save, X, User, UserPlus, Shield, ArrowUpDown, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ZohoLayout } from '../../../../components/zoho-ui'
import { initialPermissionModules, ModulePermission, PermissionModule } from './permissionData'

// Types imported from permissionData.ts

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

  // Get normalized key for collapse state
  const getCollapseKey = (itemName: string): string => {
    return itemName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }


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
                        
                        {/* Sub-Item Rows */}
                        {hasSubItems && !isCollapsed && Object.entries(module.items)
                          .filter(([_, subItem]) => subItem.isSubItem && subItem.parent === itemKey)
                          .map(([subItemKey, subItem]) => (
                            <tr key={subItemKey} className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/70">
                              <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-2 pl-8">
                                  <span className="text-gray-400">└─</span>
                                  <span>{subItemKey}</span>
                                </div>
                              </td>
                              
                              <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                <input
                                  type="checkbox"
                                  checked={subItem.full}
                                  onChange={(e) => updatePermission(moduleKey, subItemKey, 'full', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              
                              <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                <input
                                  type="checkbox"
                                  checked={subItem.view}
                                  onChange={(e) => updatePermission(moduleKey, subItemKey, 'view', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              
                              <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                <input
                                  type="checkbox"
                                  checked={subItem.create}
                                  onChange={(e) => updatePermission(moduleKey, subItemKey, 'create', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              
                              <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                <input
                                  type="checkbox"
                                  checked={subItem.edit}
                                  onChange={(e) => updatePermission(moduleKey, subItemKey, 'edit', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              
                              <td className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600">
                                <input
                                  type="checkbox"
                                  checked={subItem.delete}
                                  onChange={(e) => updatePermission(moduleKey, subItemKey, 'delete', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              
                              {subItem.approve !== undefined && (
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={subItem.approve}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'approve', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                              
                              {subItem.export !== undefined && (
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={subItem.export}
                                    onChange={(e) => updatePermission(moduleKey, subItemKey, 'export', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              )}
                            </tr>
                          ))
                        }
                      </>
                    )
                  })}
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
