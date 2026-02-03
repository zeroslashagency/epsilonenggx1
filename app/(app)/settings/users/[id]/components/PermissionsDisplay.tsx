import React from 'react'
import { Check, X } from 'lucide-react'
import { getGroupedPermissions } from '@/app/lib/utils/permission-levels'
import { PermissionBadge } from './PermissionBadge'

interface PermissionsDisplayProps {
  role: string
  standaloneAttendance: boolean
}

export function PermissionsDisplay({ role, standaloneAttendance }: PermissionsDisplayProps) {
  const groupedPermissions = getGroupedPermissions(role, standaloneAttendance)
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#12263F] dark:text-white flex items-center gap-2">
          📋 Current Permissions
          <span className="text-xs font-normal text-[#95AAC9]">(Read-Only)</span>
        </h3>
        <p className="text-sm text-[#95AAC9] mt-1">
          Based on role: <span className="font-medium text-[#12263F] dark:text-white">{role}</span>
        </p>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, permissions]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              {category}
            </h4>
            <div className="space-y-2">
              {permissions.map((perm) => (
                <div 
                  key={perm.id}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {perm.hasAccess ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-medium text-[#12263F] dark:text-white">
                        {perm.label}
                      </h5>
                      <PermissionBadge level={perm.level} />
                    </div>
                    <p className="text-xs text-[#95AAC9]">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded">
        <p className="text-xs text-blue-800 dark:text-blue-400">
          💡 <strong>Note:</strong> Permissions are automatically determined by the user's role and cannot be changed individually. 
          Only the role and standalone attendance access can be modified.
        </p>
      </div>
    </div>
  )
}
