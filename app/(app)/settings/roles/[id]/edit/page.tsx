'use client'

import { useState, useEffect, Fragment } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  User,
  UserPlus,
  Shield,
  ArrowUpDown,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { initialPermissionModules, ModulePermission, PermissionModule } from '../../permissionData'
import {
  applyPermissionCodesToModules,
  buildPermissionCodes,
  getModuleActionColumns,
  recomputeParentFlagsFromChildren,
  type PermissionModule as MappingPermissionModule,
  type PermissionModules as MappingPermissionModules,
} from '@/app/lib/features/auth/permission-mapping'

const ACTION_LABELS: Record<string, string> = {
  full: 'Full',
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
}

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
  const [fetchedEffectivePermissionCodes, setFetchedEffectivePermissionCodes] = useState<string[]>(
    []
  )

  // Get normalized key for collapse state
  const getCollapseKey = (itemName: string): string => {
    return itemName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  const buildInitialCollapsedState = (modules: Record<string, PermissionModule>) => {
    const state: Record<string, boolean> = {}
    Object.values(modules).forEach(module => {
      Object.entries(module.items).forEach(([itemName, item]) => {
        if (item.isCollapsible) {
          state[getCollapseKey(itemName)] = true
        }
      })
    })
    return state
  }

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    buildInitialCollapsedState(initialPermissionModules)
  )

  // Initialize permission modules from imported data
  const [permissionModules, setPermissionModules] =
    useState<Record<string, PermissionModule>>(initialPermissionModules)

  // Toggle collapse state for parent items
  const toggleCollapse = (itemKey: string) => {
    setCollapsed(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }))
  }

  useEffect(() => {
    if (roleId) {
      fetchRole()
    }
  }, [roleId])

  const fetchRole = async () => {
    try {
      console.log('🔍 Fetching role:', roleId)

      // Use apiGet helper which includes auth token
      const { apiGet } = await import('@/app/lib/utils/api-client')
      const data = await apiGet(`/api/admin/roles/${roleId}`)

      console.log('📊 Role data received:', data)

      if (data.success && data.data) {
        const role = data.data
        const effectivePermissionCodes = Array.isArray(data.effective_permission_codes)
          ? data.effective_permission_codes.filter(
            (code: unknown): code is string => typeof code === 'string' && code.length > 0
          )
          : []
        setFetchedEffectivePermissionCodes(effectivePermissionCodes)

        setRoleName(role.name || '')
        setDescription(role.description || '')
        setIsManufacturingRole(role.is_manufacturing_role || false)

        console.log('📋 Role permissions_json:', role.permissions_json)

        // CRITICAL FIX: Start with a CLEAN slate - all permissions FALSE
        // Create a deep copy of initialPermissionModules with ALL permissions set to FALSE
        const cleanPermissions: Record<string, PermissionModule> = {}

        Object.keys(initialPermissionModules).forEach(moduleKey => {
          cleanPermissions[moduleKey] = {
            name: initialPermissionModules[moduleKey].name,
            specialPermissions: initialPermissionModules[moduleKey].specialPermissions,
            items: {},
          }

          // Copy all items but set all permissions to FALSE
          Object.keys(initialPermissionModules[moduleKey].items).forEach(itemKey => {
            const originalItem = initialPermissionModules[moduleKey].items[itemKey]
            cleanPermissions[moduleKey].items[itemKey] = {
              full: false,
              view: false,
              ...('create' in originalItem && { create: false }),
              ...('edit' in originalItem && { edit: false }),
              ...('delete' in originalItem && { delete: false }),
              ...(originalItem.approve !== undefined && { approve: false }),
              ...(originalItem.export !== undefined && { export: false }),
              ...(originalItem.isSubItem !== undefined && { isSubItem: originalItem.isSubItem }),
              ...(originalItem.parent !== undefined && { parent: originalItem.parent }),
              ...(originalItem.isCollapsible !== undefined && {
                isCollapsible: originalItem.isCollapsible,
              }),
            }
          })
        })

        console.log('✅ Clean permissions created (all FALSE)')

        // NOW apply ONLY the permissions from database
        if (role.permissions_json && typeof role.permissions_json === 'object') {
          console.log('🔄 Applying database permissions...')
          const normalizedPermissions = { ...role.permissions_json } as Record<string, any>

          if (normalizedPermissions.user_attendance) {
            if (!normalizedPermissions.web_user_attendance) {
              normalizedPermissions.web_user_attendance = normalizedPermissions.user_attendance
            }
            if (!normalizedPermissions.mobile_user_attendance) {
              normalizedPermissions.mobile_user_attendance = normalizedPermissions.user_attendance
            }
          }

          Object.keys(normalizedPermissions).forEach(moduleKey => {
            if (cleanPermissions[moduleKey]) {
              const dbModule = normalizedPermissions[moduleKey]

              // Apply items from database
              if (dbModule.items && typeof dbModule.items === 'object') {
                Object.keys(dbModule.items).forEach(itemKey => {
                  if (cleanPermissions[moduleKey].items[itemKey]) {
                    const dbItem = dbModule.items[itemKey]

                    // Only copy permission flags, preserve structure flags
                    cleanPermissions[moduleKey].items[itemKey] = {
                      ...cleanPermissions[moduleKey].items[itemKey],
                      full: dbItem.full || false,
                      view: dbItem.view || false,
                      ...('create' in cleanPermissions[moduleKey].items[itemKey] && {
                        create: dbItem.create || false,
                      }),
                      ...('edit' in cleanPermissions[moduleKey].items[itemKey] && {
                        edit: dbItem.edit || false,
                      }),
                      ...('delete' in cleanPermissions[moduleKey].items[itemKey] && {
                        delete: dbItem.delete || false,
                      }),
                      ...(dbItem.approve !== undefined && { approve: dbItem.approve }),
                      ...(dbItem.export !== undefined && { export: dbItem.export }),
                    }

                    console.log(`  ✓ ${moduleKey}.${itemKey}:`, {
                      full: dbItem.full,
                      view: dbItem.view,
                      create: dbItem.create,
                      edit: dbItem.edit,
                      delete: dbItem.delete,
                    })
                  }
                })
              }
            }
          })

          const withEffectiveCodes = applyPermissionCodesToModules(
            cleanPermissions as MappingPermissionModules,
            effectivePermissionCodes
          )
          const reconciledPermissions = recomputeParentFlagsFromChildren(withEffectiveCodes) as Record<string, PermissionModule>
          console.log('✅ Database permissions applied')
          setPermissionModules(reconciledPermissions)
        } else {
          console.log('⚠️ No permissions_json in database, using effective permission codes only')
          const withEffectiveCodes = applyPermissionCodesToModules(
            cleanPermissions as MappingPermissionModules,
            effectivePermissionCodes
          )
          const reconciledPermissions = recomputeParentFlagsFromChildren(withEffectiveCodes) as Record<string, PermissionModule>
          setPermissionModules(reconciledPermissions)
        }

        return
      } else {
        throw new Error(data.error || 'Failed to fetch role data')
      }
    } catch (error: any) {
      alert(`❌ Failed to load role\n\n${error?.message || 'Unknown error'}`)
      router.push('/settings/roles')
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = (
    moduleKey: string,
    itemKey: string,
    permission: keyof ModulePermission,
    value: boolean
  ) => {
    setPermissionModules(prev => {
      const currentItem = prev[moduleKey].items[itemKey]
      const isParent = currentItem.isCollapsible
      const isChild = currentItem.isSubItem

      // Create fresh copy
      const updated: Record<string, PermissionModule> = JSON.parse(JSON.stringify(prev))

      if (isParent) {
        // Parent clicked: set this permission on parent AND all children
        ; (updated[moduleKey].items[itemKey] as any)[permission] = value

        // If 'full' toggled, also set all derived permissions on parent
        if (permission === 'full') {
          ; (updated[moduleKey].items[itemKey] as any).view = value
          if ('create' in currentItem) (updated[moduleKey].items[itemKey] as any).create = value
          if ('edit' in currentItem) (updated[moduleKey].items[itemKey] as any).edit = value
          if ('delete' in currentItem) (updated[moduleKey].items[itemKey] as any).delete = value
          if (currentItem.approve !== undefined) (updated[moduleKey].items[itemKey] as any).approve = value
          if (currentItem.export !== undefined) (updated[moduleKey].items[itemKey] as any).export = value
        }

        // Sync to all children
        Object.entries(updated[moduleKey].items).forEach(([childKey, childItem]) => {
          if (childItem.isSubItem && childItem.parent === itemKey) {
            ; (updated[moduleKey].items[childKey] as any)[permission] = value

            // If 'full' toggled, sync derived permissions to child too
            if (permission === 'full') {
              ; (updated[moduleKey].items[childKey] as any).view = value
              if ('create' in childItem) (updated[moduleKey].items[childKey] as any).create = value
              if ('edit' in childItem) (updated[moduleKey].items[childKey] as any).edit = value
              if ('delete' in childItem) (updated[moduleKey].items[childKey] as any).delete = value
              if (childItem.approve !== undefined) (updated[moduleKey].items[childKey] as any).approve = value
              if (childItem.export !== undefined) (updated[moduleKey].items[childKey] as any).export = value
            }
          }
        })
      } else if (isChild) {
        // Child clicked: update this child
        ; (updated[moduleKey].items[itemKey] as any)[permission] = value

        // If 'full' toggled, also set derived permissions on this child
        if (permission === 'full') {
          ; (updated[moduleKey].items[itemKey] as any).view = value
          if ('create' in currentItem) (updated[moduleKey].items[itemKey] as any).create = value
          if ('edit' in currentItem) (updated[moduleKey].items[itemKey] as any).edit = value
          if ('delete' in currentItem) (updated[moduleKey].items[itemKey] as any).delete = value
          if (currentItem.approve !== undefined) (updated[moduleKey].items[itemKey] as any).approve = value
          if (currentItem.export !== undefined) (updated[moduleKey].items[itemKey] as any).export = value
        }

        // Recompute parent state from all its children
        const parentKey = currentItem.parent
        if (parentKey && updated[moduleKey].items[parentKey]) {
          const siblings = Object.values(updated[moduleKey].items).filter(
            item => item.isSubItem && item.parent === parentKey
          )

          // Parent action is true only if ALL children have that action
          const parentItem = updated[moduleKey].items[parentKey]
            ;['full', 'view', 'create', 'edit', 'delete', 'approve', 'export'].forEach(action => {
              if (parentItem[action as keyof ModulePermission] !== undefined) {
                const relevantSiblings = siblings.filter(s => s[action as keyof ModulePermission] !== undefined)
                if (relevantSiblings.length > 0) {
                  ; (parentItem as any)[action] = relevantSiblings.every(
                    s => Boolean(s[action as keyof ModulePermission])
                  )
                }
              }
            })
        }
      } else {
        // Standalone item: just update it
        ; (updated[moduleKey].items[itemKey] as any)[permission] = value

        // If 'full' toggled, sync derived permissions
        if (permission === 'full') {
          ; (updated[moduleKey].items[itemKey] as any).view = value
          if ('create' in currentItem) (updated[moduleKey].items[itemKey] as any).create = value
          if ('edit' in currentItem) (updated[moduleKey].items[itemKey] as any).edit = value
          if ('delete' in currentItem) (updated[moduleKey].items[itemKey] as any).delete = value
          if (currentItem.approve !== undefined) (updated[moduleKey].items[itemKey] as any).approve = value
          if (currentItem.export !== undefined) (updated[moduleKey].items[itemKey] as any).export = value
        }
      }

      return updated
    })
  }

  const formatSubItemLabel = (label: string, parent: string) => {
    const prefix = `${parent}: `
    if (label.startsWith(prefix)) return label.slice(prefix.length)
    const altPrefix = `${parent} - `
    if (label.startsWith(altPrefix)) return label.slice(altPrefix.length)
    return label
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Count total permissions for logging
      const totalItems = Object.values(permissionModules).reduce(
        (sum, module) => sum + Object.keys(module.items).length,
        0
      )

      const permissionCodes = buildPermissionCodes(permissionModules as MappingPermissionModules)

      const roleData = {
        roleId, // Required by validation schema
        name: roleName,
        description: description,
        is_manufacturing_role: isManufacturingRole,
        permissions: permissionCodes,
        permissions_json: permissionModules, // New granular permissions
        updated_at: new Date().toISOString(),
      }

      console.log('📊 Permission structure:', {
        modules: Object.keys(permissionModules),
        totalItems,
        sample: Object.keys(permissionModules)[0]
          ? {
            module: Object.keys(permissionModules)[0],
            items: Object.keys(permissionModules[Object.keys(permissionModules)[0]].items).length,
          }
          : null,
      })

      const { apiPut } = await import('@/app/lib/utils/api-client')
      const data = await apiPut(`/api/admin/roles/${roleId}`, roleData)
      if (!data.success) {
        throw new Error(data.error || 'Failed to update role')
      }

      alert(
        `✅ Role "${roleName}" updated successfully!\n\nChanges saved:\n- Name: ${roleName}\n- Description: ${description}\n- Manufacturing Role: ${isManufacturingRole ? 'Yes' : 'No'}\n- Permissions: Updated`
      )
      router.push('/settings/roles')
    } catch (error: any) {
      alert(`❌ Failed to save role\n\n${error.message || 'Please check the console for details'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading role...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Modify role permissions and settings
                </p>
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
                  onChange={e => setRoleName(e.target.value)}
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
                  onChange={e => setDescription(e.target.value)}
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
                    onChange={e => setIsManufacturingRole(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <label
                      htmlFor="manufacturingRole"
                      className="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      This role is for Manufacturing users
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      If you mark this option, all users who are added with this role will be a
                      manufacturing user.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          {Object.entries(permissionModules).map(([moduleKey, module]) => {
            const actionColumns = getModuleActionColumns(module as MappingPermissionModule)

            return (
              <div
                key={moduleKey}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  {module.name}
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                          Particulars
                        </th>
                        {actionColumns.map(action => (
                          <th
                            key={action}
                            className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 w-20"
                          >
                            {ACTION_LABELS[action]}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(module.items).map(([itemKey, item]) => {
                        if (item.isSubItem) return null

                        const collapseKey = getCollapseKey(itemKey)
                        const isCollapsed = collapsed[collapseKey] ?? true
                        const hasSubItems = item.isCollapsible

                        return (
                          <Fragment key={itemKey}>
                            {/* Parent Row */}
                            <tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                  <span className={hasSubItems ? 'font-semibold' : ''}>
                                    {itemKey}
                                  </span>
                                </div>
                              </td>

                              {actionColumns.map(action => (
                                <td
                                  key={`${itemKey}-${action}`}
                                  className="py-4 px-4 text-center border-r border-gray-200 dark:border-gray-600"
                                >
                                  {item[action as keyof ModulePermission] !== undefined && (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(item[action as keyof ModulePermission])}
                                      ref={(el) => {
                                        if (el && hasSubItems) {
                                          // Calculate indeterminate state for parent
                                          const children = Object.entries(module.items)
                                            .filter(([_, subItem]) => subItem.isSubItem && subItem.parent === itemKey)
                                            .map(([_, subItem]) => Boolean(subItem[action as keyof ModulePermission]));
                                          const allChecked = children.length > 0 && children.every(Boolean);
                                          const someChecked = children.some(Boolean);
                                          el.indeterminate = someChecked && !allChecked;
                                        }
                                      }}
                                      onChange={e =>
                                        updatePermission(
                                          moduleKey,
                                          itemKey,
                                          action as keyof ModulePermission,
                                          e.target.checked
                                        )
                                      }
                                      className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 accent-blue-600 indeterminate:bg-blue-400 indeterminate:border-blue-400"
                                    />
                                  )}
                                </td>
                              ))}
                            </tr>

                            {/* Sub-Item Rows */}
                            {hasSubItems &&
                              !isCollapsed &&
                              Object.entries(module.items)
                                .filter(
                                  ([_, subItem]) => subItem.isSubItem && subItem.parent === itemKey
                                )
                                .map(([subItemKey, subItem]) => (
                                  <tr
                                    key={subItemKey}
                                    className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                                  >
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                                      <div className="flex items-center gap-2 pl-8">
                                        <span className="text-gray-400">└─</span>
                                        <span>{formatSubItemLabel(subItemKey, itemKey)}</span>
                                      </div>
                                    </td>

                                    {actionColumns.map(action => (
                                      <td
                                        key={`${subItemKey}-${action}`}
                                        className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600"
                                      >
                                        {subItem[action as keyof ModulePermission] !==
                                          undefined && (
                                            <input
                                              type="checkbox"
                                              checked={
                                                Boolean(subItem[action as keyof ModulePermission])
                                              }
                                              onChange={e =>
                                                updatePermission(
                                                  moduleKey,
                                                  subItemKey,
                                                  action as keyof ModulePermission,
                                                  e.target.checked
                                                )
                                              }
                                              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                          )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Special Permissions */}
                {module.specialPermissions && module.specialPermissions.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Additional Permissions
                    </h4>
                    <div className="space-y-2">
                      {module.specialPermissions.map((permission, index) => (
                        <label
                          key={index}
                          className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                        >
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
            )
          })}
        </div>
      </div>
    </>
  )
}
