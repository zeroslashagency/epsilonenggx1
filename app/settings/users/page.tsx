"use client"

import { useState, useEffect } from 'react'
import { User, Mail, Shield, Search, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Eye, EyeOff, RefreshCw, X, Check, Phone, Calendar, Activity, UserPlus, Zap, Settings, Save, Key } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'
import { apiGet, apiPost, apiPut, apiDelete } from '@/app/lib/utils/api-client'
import { TableLoading, LoadingSpinner } from '@/components/ui/loading-spinner'
import { EditableRoleSection } from './[id]/components/EditableRoleSection'
import { PermissionsDisplay } from './[id]/components/PermissionsDisplay'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  status: 'active' | 'pending' | 'inactive'
  created_at: string
  employee_code?: string
  department?: string
  designation?: string
  phone?: string
  last_login?: string
  standalone_attendance?: 'YES' | 'NO'
}

const SYSTEM_FUNCTIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'Access the primary manufacturing overview dashboard.' },
  { id: 'schedule_generator', label: 'Schedule Generator', description: 'Open the smart schedule builder and adjust production timelines.' },
  { id: 'schedule_generator_dashboard', label: 'Schedule Generator Dashboard', description: 'Access the dedicated schedule generator dashboard page.' },
  { id: 'chart', label: 'Chart', description: 'Explore production charts and machine KPIs.' },
  { id: 'analytics', label: 'Analytics', description: 'Run analytics dashboards and export performance reports.' },
  { id: 'attendance', label: 'Attendance', description: 'View attendance data and reports within the main system.' },
  { id: 'standalone_attendance', label: 'Standalone Attendance', description: 'Access the dedicated attendance website with same credentials.' },
  { id: 'production', label: 'Production', description: 'Access production workflow screens including orders, machines, personnel, and tasks.' },
  { id: 'monitoring', label: 'Monitoring', description: 'Access monitoring dashboards including alerts, reports, quality control, and maintenance.' },
  { id: 'manage_users', label: 'Manage Users & Security', description: 'Create users, assign roles, view audit logs, and impersonate accounts.' }
]

function UsersPageZoho() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'scope' | 'activity' | 'security'>('overview')
  const [permissions, setPermissions] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userActivityLogs, setUserActivityLogs] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRole, setEditedRole] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editedPhone, setEditedPhone] = useState('')
  const [editedEmployeeCode, setEditedEmployeeCode] = useState('')
  const [editedDepartment, setEditedDepartment] = useState('')
  const [editedDesignation, setEditedDesignation] = useState('')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmNewEmail, setConfirmNewEmail] = useState('')

  useEffect(() => {
    let isMounted = true
    
    const loadUsers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('limit', pageSize.toString())
        
        const data = await apiGet(`/api/admin/users?${params.toString()}`)
        
        if (isMounted && data.success) {
          // Ensure we always set an array
          const usersData = data.data?.users || data.data || []
          setUsers(Array.isArray(usersData) ? usersData : [])
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1)
            setTotalCount(data.pagination.totalCount || 0)
          }
        }
      } catch (error) {
        if (isMounted) {
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadUsers()
    
    return () => {
      isMounted = false
    }
  }, [page, pageSize])

  useEffect(() => {
  }, [permissions])

  // Auto-fetch activity logs when activity tab is opened
  useEffect(() => {
    if (activeTab === 'activity' && selectedUser) {
      fetchUserActivityLogs(selectedUser.id)
    }
  }, [activeTab, selectedUser])

  const fetchUserActivityLogs = async (userId: string) => {
    setLoadingActivity(true)
    try {
      const data = await apiGet(`/api/admin/user-activity-logs?userId=${userId}`)
      if (data.success) {
        setUserActivityLogs(data.logs || [])
      }
    } catch (error) {
    } finally {
      setLoadingActivity(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/admin/users')
      
      if (data.success) {
        const usersData = data.data?.users || data.data || []
        setUsers(Array.isArray(usersData) ? usersData : [])
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user)
    
    try {
      // Fetch user's actual permissions from database
      const result = await apiGet(`/api/admin/get-user-permissions?userId=${user.id}`)
      
      console.log('📥 [USER-SELECT] API Response:', result)
      
      if (result.success) {
        // Use permissions from API response (already includes standalone_attendance if enabled)
        setPermissions(result.permissions || [])
        setEditedRole(result.role || user.role)
        
        console.log('✅ [USER-SELECT] Permissions loaded:', {
          permissions: result.permissions,
          standalone_attendance: result.standalone_attendance,
          hasStandaloneInPermissions: result.permissions?.includes('standalone_attendance')
        })
      } else {
        // Fallback to default permissions if API fails
        const defaultPermissions = ['dashboard']
        if (user.standalone_attendance === 'YES') {
          defaultPermissions.push('standalone_attendance')
        }
        setPermissions(defaultPermissions)
        setEditedRole(user.role)
      }
    } catch (error) {
      console.error('❌ [USER-SELECT] Error fetching permissions:', error)
      // Fallback to default permissions
      const defaultPermissions = ['dashboard']
      if (user.standalone_attendance === 'YES') {
        defaultPermissions.push('standalone_attendance')
      }
      setPermissions(defaultPermissions)
      setEditedRole(user.role)
    }
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setIsEditing(false)
  }

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setEditedPhone(user.phone || '')
    setEditedEmployeeCode(user.employee_code || '')
    setEditedDepartment(user.department || '')
    setEditedDesignation(user.designation || '')
    setEditedRole(user.role || 'Operator')
    
    // Set permissions based on standalone_attendance
    const userPermissions = ['dashboard']
    if (user.standalone_attendance === 'YES') {
      userPermissions.push('standalone_attendance')
    }
    setPermissions(userPermissions)
    setIsEditing(false)
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditedRole(selectedUser?.role || '')
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return

    console.log('💾 [SAVE] Starting save with permissions:', permissions)
    console.log('💾 [SAVE] Standalone attendance enabled:', permissions.includes('standalone_attendance'))

    try {
      console.log('💾 Saving changes...', { 
        userId: selectedUser.id,
        role: editedRole, 
        permissions,
        contact: {
          phone: editedPhone,
          employee_code: editedEmployeeCode,
          department: editedDepartment,
          designation: editedDesignation
        }
      })

      // Save contact information first
      const contactResult = await apiPost('/api/admin/update-user-contact', {
        userId: selectedUser.id,
        phone: editedPhone,
        employee_code: editedEmployeeCode,
        department: editedDepartment,
        designation: editedDesignation
      })

      if (!contactResult.success) {
        throw new Error(contactResult.error || 'Failed to save contact information')
      }

      // Check if standalone_attendance permission is enabled
      const hasStandaloneAttendance = permissions.includes('standalone_attendance')

      const payload = {
        userId: selectedUser.id,
        role: editedRole,
        permissions,
        standalone_attendance: hasStandaloneAttendance ? 'YES' : 'NO'
      }

      console.log('📤 [SAVE] Sending to API:', payload)

      const result = await apiPost('/api/admin/update-user-permissions', payload)

      console.log('📥 [SAVE] API Response:', result)

      if (result.success) {
        if (result.warning) {
          alert(`⚠️ Changes saved with warning:\n\n${result.message}\n\n${result.warning}`)
        } else {
          alert('✅ Changes saved successfully!')
        }
        setIsEditing(false)
        // Update local state
        setSelectedUser({
          ...selectedUser,
          phone: editedPhone,
          employee_code: editedEmployeeCode,
          department: editedDepartment,
          designation: editedDesignation,
          role: editedRole
        })
        // Refresh user list to show updated data
        await fetchUsers()
      } else {
        throw new Error(result.error || 'Failed to save changes')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`❌ Failed to save changes:\n\n${errorMessage}`)
    }
  }

  const handleCancelEdit = async () => {
    setIsEditing(false)
    setEditedRole(selectedUser?.role || '')
    // Reset contact fields
    setEditedPhone(selectedUser?.phone || '')
    setEditedEmployeeCode(selectedUser?.employee_code || '')
    setEditedDepartment(selectedUser?.department || '')
    setEditedDesignation(selectedUser?.designation || '')
    
    // Reload the user's actual permissions instead of hardcoded defaults
    if (selectedUser) {
      try {
        const response = await fetch(`/api/admin/get-user-permissions?userId=${selectedUser.id}`)
        const result = await response.json()
        
        if (result.success) {
          setPermissions(result.permissions || [])
        } else {
          // Fallback to basic permissions
          const defaultPermissions = ['dashboard']
          if (selectedUser.standalone_attendance === 'YES') {
            defaultPermissions.push('standalone_attendance')
          }
          setPermissions(defaultPermissions)
        }
      } catch (error) {
        // Fallback to basic permissions
        const defaultPermissions = ['dashboard']
        if (selectedUser.standalone_attendance === 'YES') {
          defaultPermissions.push('standalone_attendance')
        }
        setPermissions(defaultPermissions)
      }
    }
  }

  const handleSendPasswordReset = async () => {
    if (!selectedUser) return
    
    try {
      const result = await apiPost('/api/admin/send-password-reset', {
        userEmail: selectedUser.email
      })
      
      if (result.success) {
        alert(`✅ Password reset email sent to ${selectedUser.email}`)
      } else {
        alert(`❌ Error: ${result.error}`)
      }
    } catch (error: any) {
      alert(`❌ Failed to send password reset email: ${error.message}`)
    }
  }

  const handleChangeEmail = async () => {
    if (!selectedUser) return
    
    if (newEmail !== confirmNewEmail) {
      alert('❌ Emails do not match')
      return
    }

    if (!newEmail) {
      alert('❌ Please enter a new email')
      return
    }

    try {
      const result = await apiPost('/api/admin/change-user-email', {
        userId: selectedUser.id,
        newEmail: newEmail
      })
      
      if (result.success) {
        alert(`✅ ${result.message}`)
        setIsChangingEmail(false)
        setNewEmail('')
        setConfirmNewEmail('')
        // Refresh user list
        await fetchUsers()
      } else {
        alert(`❌ Error: ${result.error}`)
      }
    } catch (error: any) {
      alert(`❌ Failed to change email: ${error.message}`)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    const confirmDelete = confirm(
      `⚠️ DELETE USER ACCOUNT\n\n` +
      `Are you sure you want to permanently delete this user?\n\n` +
      `User: ${selectedUser.full_name}\n` +
      `Email: ${selectedUser.email}\n` +
      `Employee Code: ${selectedUser.employee_code || 'N/A'}\n\n` +
      `This action CANNOT be undone!`
    )

    if (!confirmDelete) return

    try {
      
      const result = await apiPost('/api/admin/delete-user', {
        userId: selectedUser.id,
        userEmail: selectedUser.email,
        userName: selectedUser.full_name,
        actorId: 'current-user-id' // TODO: Get actual current user ID
      })


      if (result.success) {
        alert('✅ User deleted successfully!')
      } else {
        throw new Error(result.error || 'Failed to delete user')
      }
      
      // Close drawer and refresh user list (will filter out deleted user)
      setShowDrawer(false)
      setSelectedUser(null)
      await fetchUsers()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`❌ Failed to delete user:\n\n${errorMessage}\n\nCheck console for details.`)
    }
  }

  const handleSetPassword = () => {
    if (!selectedUser) return
    
    // Switch to security tab to set password
    setActiveTab('security')
  }

  const handleSavePassword = async () => {
    if (!selectedUser) return

    // Validate passwords
    if (!password || !confirmPassword) {
      alert('⚠️ Please enter both password fields')
      return
    }

    if (password.length < 8) {
      alert('⚠️ Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      alert('⚠️ Passwords do not match')
      return
    }

    try {

      const result = await apiPost('/api/admin/set-user-password', {
        userId: selectedUser.id,
        userEmail: selectedUser.email,
        password: password
      })

      if (result.success) {
        alert('✅ Password updated successfully!')
        setPassword('')
        setConfirmPassword('')
      } else {
        throw new Error(result.error || 'Failed to update password')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`❌ Failed to update password:\n\n${errorMessage}`)
    }
  }

  const handleGeneratePassword = () => {
    // Generate a random 12-character password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    let generatedPassword = ''
    for (let i = 0; i < 12; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    setPassword(generatedPassword)
    setConfirmPassword(generatedPassword)
    
    // Copy to clipboard
    navigator.clipboard.writeText(generatedPassword)
    alert(`✅ Password generated and copied to clipboard:\n\n${generatedPassword}\n\nPlease save this password securely!`)
  }

  const stats = {
    total: Array.isArray(users) ? users.length : 0,
    active: Array.isArray(users) ? users.filter(u => u.status === 'active').length : 0,
    pending: Array.isArray(users) ? users.filter(u => u.status === 'pending').length : 0,
    roles: Array.isArray(users) ? new Set(users.map(u => u.role)).size : 0
  }

  return (
    <ZohoLayout breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="flex items-center gap-2 px-6">
            <Link href="/settings/users" className="flex items-center gap-2 px-4 py-3 text-sm text-white bg-[#00A651] rounded-t transition-colors border-b-2 border-[#00A651]">
              <User className="w-4 h-4" />
              User Management
            </Link>
            <Link href="/settings/add-users" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <UserPlus className="w-4 h-4" />
              Add Users
            </Link>
            <Link href="/settings/roles" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Shield className="w-4 h-4" />
              Role Profiles
            </Link>
            <Link href="/settings/activity-logs" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Zap className="w-4 h-4" />
              Activity Logging
            </Link>
          </div>
        </div>

        {/* User Statistics */}
        <div className="flex items-center gap-6 px-4 py-3 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#12263F] dark:text-white">Users • {stats.total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#95AAC9]">Active:</span>
            <span className="text-sm font-semibold text-[#28A745]">{stats.active}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#95AAC9]">Pending:</span>
            <span className="text-sm font-semibold text-[#FD7E14]">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#95AAC9]">Roles:</span>
            <span className="text-sm font-semibold text-[#12263F] dark:text-white">{stats.roles}</span>
          </div>
        </div>

        {/* Conditional Layout: Full-width table OR Two-column view */}
        {!selectedUser ? (
          /* Full-Width User Table */
          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
            <div className="p-4 border-b border-[#E3E6F0] dark:border-gray-700">
              <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">All Users</h2>
              <p className="text-xs text-[#95AAC9] mt-1">USER DETAILS</p>
            </div>
            <table className="w-full">
              <thead className="bg-[#F8F9FC] dark:bg-gray-800 border-b border-[#E3E6F0] dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#95AAC9] uppercase">USER DETAILS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#95AAC9] uppercase">ROLE</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[#95AAC9] uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6F0] dark:divide-gray-700">
                {loading ? (
                  <TableLoading colSpan={3} text="Loading users" />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-[#95AAC9]">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleSelectUser(user)}
                      className="hover:bg-[#F8F9FC] dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-[#12263F] dark:text-white">{user.full_name}</div>
                            <div className="text-sm text-[#95AAC9]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#12263F] dark:text-white">{user.role || 'No Role'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Settings className="w-5 h-5 text-[#95AAC9] inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Two Column Layout - When User is Selected */
          <div className="grid grid-cols-12 gap-6">
            {/* Left: User List */}
            <div className="col-span-4">
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
              <div className="p-4 border-b border-[#E3E6F0] dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">All Users</h2>
                  <p className="text-xs text-[#95AAC9] mt-1">USER DETAILS</p>
                </div>
                <Link href="/settings/add-users">
                  <button className="px-3 py-1.5 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors">
                    Invite User
                  </button>
                </Link>
              </div>
              
              <div className="divide-y divide-[#E3E6F0] dark:divide-gray-700 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                {loading ? (
                  <LoadingSpinner text="Loading users" />
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-[#95AAC9]">No users found</div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        handleUserSelect(user)
                      }}
                      className={`px-6 py-4 cursor-pointer transition-colors ${
                        selectedUser?.id === user.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-[#2C7BE5]' 
                          : 'hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#12263F] dark:text-white truncate">
                            {user.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-[#95AAC9] truncate">{user.email}</div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <div className="w-2 h-2 bg-[#2C7BE5] rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Full User Details with Tabs */}
          <div className="col-span-8">
            {selectedUser ? (
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
                {/* User Header */}
                <div className="p-6 border-b border-[#E3E6F0] dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-[#12263F] dark:text-white">{selectedUser.full_name}</h2>
                        <p className="text-[#95AAC9]">{selectedUser.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                            {selectedUser.status || 'active'}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                            {selectedUser.role || 'Operator'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={handleCancelEdit}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveChanges}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={handleEditClick}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button 
                            onClick={handleDeleteUser}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                          </button>
                          <button 
                            onClick={handleSetPassword}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors"
                          >
                            <Key className="w-4 h-4" />
                            Set Password Manually
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setSelectedUser(null)}
                        className="p-2 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded transition-colors"
                        title="Close"
                      >
                        <X className="w-5 h-5 text-[#95AAC9]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-[#E3E6F0] dark:border-gray-700">
                  <div className="flex gap-6 px-6">
                    {['overview', 'roles', 'scope', 'activity', 'security'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-3 text-sm font-medium capitalize ${
                          activeTab === tab
                            ? 'text-[#2C7BE5] border-b-2 border-[#2C7BE5]'
                            : 'text-[#95AAC9] hover:text-[#12263F] dark:hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Phone:</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedPhone}
                                onChange={(e) => setEditedPhone(e.target.value)}
                                placeholder="Enter phone number"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                              />
                            ) : (
                              <p className="text-sm text-[#12263F] dark:text-white">{selectedUser.phone || 'Not provided'} ✏️</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Employee Code:</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedEmployeeCode}
                                onChange={(e) => setEditedEmployeeCode(e.target.value)}
                                placeholder="Enter employee code"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                              />
                            ) : (
                              <p className="text-sm text-[#12263F] dark:text-white">{selectedUser.employee_code || 'Not assigned'} ✏️</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Department:</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedDepartment}
                                onChange={(e) => setEditedDepartment(e.target.value)}
                                placeholder="Enter department"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                              />
                            ) : (
                              <p className="text-sm text-[#12263F] dark:text-white">{selectedUser.department || 'Not specified'} ✏️</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Designation:</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editedDesignation}
                                onChange={(e) => setEditedDesignation(e.target.value)}
                                placeholder="Enter designation"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
                              />
                            ) : (
                              <p className="text-sm text-[#12263F] dark:text-white">{selectedUser.designation || 'Not specified'} ✏️</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Last Login:</p>
                            <p className="text-sm text-[#12263F] dark:text-white">{selectedUser.last_login || '9/28/2025, 3:09:52 PM'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Created:</p>
                            <p className="text-sm text-[#12263F] dark:text-white">
                              {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '9/28/2025'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Access Summary</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Permissions:</p>
                            <p className="text-3xl font-bold text-[#12263F] dark:text-white">{permissions.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Overrides:</p>
                            <p className="text-3xl font-bold text-[#12263F] dark:text-white">0</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#95AAC9] mb-1">Plants:</p>
                            <p className="text-3xl font-bold text-[#12263F] dark:text-white">0</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Roles Tab */}
                  {activeTab === 'roles' && (
                    <div className="space-y-6">
                      <EditableRoleSection
                        isEditing={isEditing}
                        selectedRole={isEditing ? editedRole : selectedUser.role}
                        standaloneAttendance={permissions.includes('standalone_attendance')}
                        onRoleChange={setEditedRole}
                        onStandaloneToggle={() => {
                          if (permissions.includes('standalone_attendance')) {
                            setPermissions(permissions.filter(p => p !== 'standalone_attendance'))
                          } else {
                            setPermissions([...permissions, 'standalone_attendance'])
                          }
                        }}
                        onEdit={() => setIsEditing(true)}
                        onCancel={handleCancelEdit}
                        onSave={handleSaveChanges}
                      />
                      
                      <PermissionsDisplay
                        role={isEditing ? editedRole : selectedUser.role}
                        standaloneAttendance={permissions.includes('standalone_attendance')}
                      />
                    </div>
                  )}

                  {/* Scope Tab */}
                  {activeTab === 'scope' && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">Scope</h3>
                      <p className="text-[#95AAC9]">Scope configuration will appear here</p>
                    </div>
                  )}

                  {/* Activity Tab */}
                  {activeTab === 'activity' && selectedUser && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Recent Activity</h3>
                        <button 
                          onClick={() => {
                            fetchUserActivityLogs(selectedUser.id)
                          }}
                          disabled={loadingActivity}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#2C7BE5] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                      
                      {loadingActivity ? (
                        <LoadingSpinner text="Loading activity logs" />
                      ) : userActivityLogs.length > 0 ? (
                        <div className="space-y-3">
                          {userActivityLogs.map((log) => (
                            <div key={log.id} className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm text-[#12263F] dark:text-white font-medium">{log.description}</p>
                                  <p className="text-xs text-[#95AAC9] mt-1">
                                    {new Date(log.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-[#2C7BE5] rounded">
                                  {log.action.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-[#95AAC9]">No activity logs found for this user</p>
                          <p className="text-sm text-[#95AAC9] mt-2">Activity will appear here when actions are performed on or by this user</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-2">Password & Security Tools</h3>
                        <p className="text-sm text-[#95AAC9] mb-6">Send password reset emails to users.</p>
                      </div>

                      <div className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                        <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-2">Send Password Reset Email</h4>
                        <p className="text-xs text-[#95AAC9] mb-4">Supabase will send a reset link to the user's email address if it's valid.</p>
                        <button 
                          onClick={handleSendPasswordReset}
                          disabled={!selectedUser}
                          className="flex items-center gap-2 px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Mail className="w-4 h-4" />
                          Send reset email
                        </button>
                      </div>

                      {/* Change Email */}
                      <div className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                        <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-2">Change Email Address</h4>
                        <p className="text-xs text-[#95AAC9] mb-4">Update the user's email address. This will be auto-confirmed.</p>
                        
                        {!isChangingEmail ? (
                          <button 
                            onClick={() => setIsChangingEmail(true)}
                            disabled={!selectedUser}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Mail className="w-4 h-4" />
                            Change email
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-[#12263F] dark:text-white mb-1">Current Email</label>
                              <p className="text-sm text-[#95AAC9]">{selectedUser?.email}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#12263F] dark:text-white mb-1">New Email</label>
                              <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Enter new email"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#12263F] dark:text-white mb-1">Confirm New Email</label>
                              <input
                                type="email"
                                value={confirmNewEmail}
                                onChange={(e) => setConfirmNewEmail(e.target.value)}
                                placeholder="Confirm new email"
                                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleChangeEmail}
                                disabled={!newEmail || !confirmNewEmail || newEmail !== confirmNewEmail}
                                className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Update Email
                              </button>
                              <button
                                onClick={() => {
                                  setIsChangingEmail(false)
                                  setNewEmail('')
                                  setConfirmNewEmail('')
                                }}
                                className="px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 text-[#12263F] dark:text-white text-sm rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded flex items-center justify-center h-96">
                <div className="text-center">
                  <User className="w-16 h-16 text-[#95AAC9] mx-auto mb-4" />
                  <p className="text-[#95AAC9]">Select a user to view details</p>
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

// Wrap with ProtectedRoute to require authentication
function ProtectedUsersPage() {
  return (
    <ProtectedRoute requireRole={['Super Admin', 'Admin']}>
      <UsersPageZoho />
    </ProtectedRoute>
  )
}

export { ProtectedUsersPage as default }
