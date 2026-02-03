import React, { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface EditableRoleSectionProps {
  isEditing: boolean
  selectedRole: string
  standaloneAttendance: boolean
  onRoleChange: (role: string) => void
  onStandaloneToggle: () => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}

export function EditableRoleSection({
  isEditing,
  selectedRole,
  standaloneAttendance,
  onRoleChange,
  onStandaloneToggle,
  onEdit,
  onCancel,
  onSave
}: EditableRoleSectionProps) {
  const [availableRoles, setAvailableRoles] = useState<string[]>(['Operator'])

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const data = await apiGet('/api/admin/roles')
      if (data.success && data.data) {
        const roles = Array.isArray(data.data.roles) ? data.data.roles : data.data
        const roleNames = roles.map((r: any) => r.name)
        setAvailableRoles(roleNames)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }
  return (
    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#12263F] dark:text-white flex items-center gap-2">
            🔧 Editable Settings
          </h3>
          <p className="text-xs text-[#95AAC9] mt-1">
            Change user role and standalone attendance access
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm text-[#2C7BE5] border border-[#2C7BE5] rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit user role and standalone attendance"
          >
            Edit Role
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
            User Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            disabled={!isEditing}
            className={`w-full max-w-md px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white ${
              !isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <option value="">Select role</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
            <option value="Test User">Test User</option>
          </select>
          <p className="text-xs text-[#95AAC9] mt-2">
            {isEditing 
              ? '✅ Changing role will update all permissions below' 
              : '💡 Click "Edit Role" to modify user role'
            }
          </p>
        </div>
        
        {/* Standalone Attendance Toggle */}
        <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
          <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
            Additional Access
          </label>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={standaloneAttendance}
              onChange={onStandaloneToggle}
              disabled={!isEditing}
              className={`mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5] ${
                !isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            />
            <div>
              <p className="text-sm font-medium text-[#12263F] dark:text-white">
                Enable Standalone Attendance Site
              </p>
              <p className="text-xs text-[#95AAC9] mt-1">
                Allow user to access the dedicated attendance website with same credentials
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
