'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Info,
  User,
  UserPlus,
  Shield,
  ArrowUpDown,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { initialPermissionModules, ModulePermission, PermissionModule } from '../permissionData'
import {
  buildPermissionCodes,
  getModuleActionColumns,
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

export default function NewRolePage() {
  const router = useRouter()
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [isManufacturingRole, setIsManufacturingRole] = useState(false)

  // Helper to get collapse key from item name
  const getCollapseKey = (itemName: string): string => {
    return itemName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }

  const buildInitialCollapsedState = (modules: Record<string, PermissionModule>) => {
    const state: Record<string, boolean> = {}
    Object.values(modules).forEach(module => {
      Object.entries(module.items).forEach(([itemName, item]) => {
        if (item.isCollapsible) {
          const isMainDashboardParent =
            module.name === 'MAIN - Dashboard' && itemName === 'Dashboard'
          state[getCollapseKey(itemName)] = !isMainDashboardParent
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
    if (!roleName.trim()) {
      alert('Please enter a role name')
      return
    }

    try {
      const uniquePermissions = buildPermissionCodes(permissionModules as MappingPermissionModules)

      const { apiPost } = await import('@/app/lib/utils/api-client')
      const roleData = {
        name: roleName,
        description: description,
        is_manufacturing_role: isManufacturingRole,
        permissions: uniquePermissions,
        permissions_json: permissionModules, // New granular permissions
        updated_at: new Date().toISOString(),
      }
      const data = await apiPost('/api/admin/roles', roleData)

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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a new role with custom permissions
            </p>
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
          const parentItems = Object.entries(module.items).filter(([_, item]) => !item.isSubItem)

          return (
            <div
              key={moduleKey}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
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
                    {parentItems.map(([itemKey, item]) => {
                      const collapseKey = getCollapseKey(itemKey)
                      const isCollapsed = collapsed[collapseKey] ?? true
                      const hasSubItems = item.isCollapsible
                      const subItems = Object.entries(module.items).filter(
                        ([_, subItem]) => subItem.isSubItem && subItem.parent === itemKey
                      )

                      return (
                        <Fragment key={itemKey}>
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

                          {!isCollapsed &&
                            hasSubItems &&
                            subItems.map(([subItemKey, subItem]) => (
                              <tr
                                key={subItemKey}
                                className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                              >
                                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 pl-12">
                                  {formatSubItemLabel(subItemKey, itemKey)}
                                </td>

                                {actionColumns.map(action => (
                                  <td
                                    key={`${subItemKey}-${action}`}
                                    className="py-3 px-4 text-center border-r border-gray-200 dark:border-gray-600"
                                  >
                                    {subItem[action as keyof ModulePermission] !== undefined && (
                                      <input
                                        type="checkbox"
                                        checked={Boolean(subItem[action as keyof ModulePermission])}
                                        onChange={e =>
                                          updatePermission(
                                            moduleKey,
                                            subItemKey,
                                            action as keyof ModulePermission,
                                            e.target.checked
                                          )
                                        }
                                        className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          )
        })}
      </div>
    </div>
  )
}
