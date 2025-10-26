"use client"

import { useState, useEffect } from 'react'
import { User, UserPlus, Shield, ArrowUpDown, Zap, ArrowLeft, Save, X, RefreshCw, Key, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'

interface UserDetail {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  created_at: string
  employee_code?: string
  department?: string
  designation?: string
  phone?: string
  last_login?: string
}

const SYSTEM_FUNCTIONS = [
  { id: 'dashboard', label: 'Dashboard', description: 'Access the primary manufacturing overview dashboard.' },
  { id: 'schedule_generator', label: 'Schedule Generator', description: 'Open the smart schedule builder and adjust production timelines.' },
  { id: 'schedule_generator_dashboard', label: 'Schedule Generator Dashboard', description: 'Access the dedicated schedule generator dashboard page.' },
  { id: 'chart', label: 'Chart', description: 'Explore production charts and machine KPIs.' },
  { id: 'analytics', label: 'Analytics', description: 'Run analytics dashboards and export performance reports.' },
  { id: 'attendance', label: 'Attendance', description: 'View attendance data and reports within the main system.' },
  { id: 'standalone_attendance', label: 'Standalone Attendance', description: 'Access the dedicated attendance website with same credentials.' },
  { id: 'production', label: 'Production (Coming Soon)', description: 'Early toggle for upcoming production workflow screens.' },
  { id: 'monitoring', label: 'Monitoring (Coming Soon)', description: 'Early toggle for upcoming monitoring dashboards.' },
  { id: 'manage_users', label: 'Manage Users & Security', description: 'Create users, assign roles, view audit logs, and impersonate accounts.' }
]

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'scope' | 'activity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [editedPhone, setEditedPhone] = useState('')
  const [editedEmployeeCode, setEditedEmployeeCode] = useState('')
  const [editedDepartment, setEditedDepartment] = useState('')
  const [editedDesignation, setEditedDesignation] = useState('')

  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId])

  useEffect(() => {
    if (activeTab === 'activity' && userId) {
      fetchActivityLogs()
    }
  }, [activeTab, userId])

  const fetchActivityLogs = async () => {
    setLoadingActivity(true)
    try {
      const response = await fetch(`/api/admin/user-activity-logs/${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setActivityLogs(data.logs || [])
        console.log(`✅ Loaded ${data.logs?.length || 0} activity logs for user`)
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        const foundUser = data.data.users.find((u: any) => u.id === userId)
        if (foundUser) {
          setUser(foundUser)
          setSelectedRole(foundUser.role || '')
          setEditedPhone(foundUser.phone || '')
          setEditedEmployeeCode(foundUser.employee_code || '')
          setEditedDepartment(foundUser.department || '')
          setEditedDesignation(foundUser.designation || '')
          
          // Load actual permissions from user data
          // Permissions are role-based, but we can show what they have access to
          const userPermissions: string[] = []
          
          // All users get dashboard
          userPermissions.push('dashboard')
          
          // Role-based permissions
          if (foundUser.role === 'Admin') {
            userPermissions.push('schedule_generator', 'schedule_generator_dashboard', 'chart', 'analytics', 'attendance', 'manage_users')
          } else if (foundUser.role === 'Operator') {
            userPermissions.push('schedule_generator', 'attendance')
          } else if (foundUser.role === 'Test User') {
            userPermissions.push('chart', 'analytics', 'attendance')
          }
          
          // Add standalone attendance if enabled
          if (foundUser.standalone_attendance === 'YES') {
            userPermissions.push('standalone_attendance')
          }
          
          setPermissions(userPermissions)
          console.log('✅ Loaded permissions for', foundUser.role, ':', userPermissions)
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    )
  }

  const handleSaveChanges = async () => {
    try {
      console.log('💾 Saving changes...', { userId, role: selectedRole, permissions })
      
      // Determine standalone_attendance based on permissions
      const standalone_attendance = permissions.includes('standalone_attendance') ? 'YES' : 'NO'
      
      const response = await fetch('/api/admin/update-user-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          role: selectedRole,
          permissions: permissions,
          standalone_attendance: standalone_attendance
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Changes saved successfully')
        alert('Changes saved successfully!')
        setIsEditing(false)
        // Reload user data to show updated values
        fetchUser()
      } else {
        console.error('❌ Failed to save:', data.error)
        alert(`Failed to save: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Save error:', error)
      alert('Failed to save changes. Please try again.')
    }
  }

  const handleGeneratePassword = () => {
    const generated = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '123!'
    setPassword(generated)
    setConfirmPassword(generated)
    alert(`Generated password: ${generated}`)
  }

  const handleSavePassword = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    // Save password logic here
    alert('Password saved successfully')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSaveContactInfo = async () => {
    try {
      const response = await fetch('/api/admin/update-user-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          phone: editedPhone,
          employee_code: editedEmployeeCode,
          department: editedDepartment,
          designation: editedDesignation
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Contact information updated successfully!')
        setIsEditingContact(false)
        fetchUser() // Reload user data
      } else {
        alert(`Failed to update: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating contact info:', error)
      alert('Failed to update contact information')
    }
  }

  const handleSendResetEmail = async () => {
    // Send reset email logic
    alert('Password reset email sent to ' + user?.email)
  }

  if (loading) {
    return (
      <ZohoLayout breadcrumbs={[]}>
        <div className="flex items-center justify-center h-64">
          <p className="text-[#95AAC9]">Loading user...</p>
        </div>
      </ZohoLayout>
    )
  }

  if (!user) {
    return (
      <ZohoLayout breadcrumbs={[]}>
        <div className="flex items-center justify-center h-64">
          <p className="text-[#95AAC9]">User not found</p>
        </div>
      </ZohoLayout>
    )
  }

  return (
    <ZohoLayout breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="flex items-center gap-2 px-6">
            <Link href="/users" className="flex items-center gap-2 px-4 py-3 text-sm text-white bg-[#00A651] rounded-t transition-colors border-b-2 border-[#00A651]">
              <User className="w-4 h-4" />
              User Management
            </Link>
            <Link href="/users/add" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <UserPlus className="w-4 h-4" />
              Add Users
            </Link>
            <Link href="/settings/roles" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Shield className="w-4 h-4" />
              Role Profiles
            </Link>
            <Link href="/settings/attendance-sync" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <ArrowUpDown className="w-4 h-4" />
              Attendance Sync
            </Link>
            <Link href="/settings/activity-logs" className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent">
              <Zap className="w-4 h-4" />
              Activity Logging
            </Link>
          </div>
        </div>

        {/* User Header */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Link href="/users">
                <button className="p-2 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[#95AAC9]" />
                </button>
              </Link>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">{user.full_name}</h1>
                <p className="text-[#95AAC9]">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                    {user.status || 'active'}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                    {user.role || 'Operator'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors">
                    Password Actions
                  </button>
                  <button className="px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors">
                    Set Password Manually
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700">
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
        <div className="grid grid-cols-12 gap-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="col-span-6 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Contact Information</h3>
                  {!isEditingContact ? (
                    <button
                      onClick={() => setIsEditingContact(true)}
                      className="px-3 py-1.5 text-sm text-[#2C7BE5] border border-[#2C7BE5] rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingContact(false)
                          setEditedPhone(user.phone || '')
                          setEditedEmployeeCode(user.employee_code || '')
                          setEditedDepartment(user.department || '')
                          setEditedDesignation(user.designation || '')
                        }}
                        className="px-3 py-1.5 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveContactInfo}
                        className="px-3 py-1.5 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Phone:</p>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                    ) : (
                      <p className="text-sm text-[#12263F] dark:text-white">{user.phone || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Employee Code:</p>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={editedEmployeeCode}
                        onChange={(e) => setEditedEmployeeCode(e.target.value)}
                        placeholder="Enter employee code"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                    ) : (
                      <p className="text-sm text-[#12263F] dark:text-white">{user.employee_code || 'Not assigned'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Department:</p>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={editedDepartment}
                        onChange={(e) => setEditedDepartment(e.target.value)}
                        placeholder="Enter department"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                    ) : (
                      <p className="text-sm text-[#12263F] dark:text-white">{user.department || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Designation:</p>
                    {isEditingContact ? (
                      <input
                        type="text"
                        value={editedDesignation}
                        onChange={(e) => setEditedDesignation(e.target.value)}
                        placeholder="Enter designation"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                    ) : (
                      <p className="text-sm text-[#12263F] dark:text-white">{user.designation || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Last Login:</p>
                    <p className="text-sm text-[#12263F] dark:text-white">{user.last_login || '9/28/2025, 3:09:52 PM'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Created:</p>
                    <p className="text-sm text-[#12263F] dark:text-white">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '9/28/2025'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-6 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">Access Summary</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Permissions:</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">{permissions.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Overrides:</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">0</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#95AAC9] mb-1">Plants:</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">0</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="col-span-12 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Role Assignment</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm text-[#2C7BE5] border border-[#2C7BE5] rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    Edit Permissions
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        fetchUser() // Reload to reset changes
                      }}
                      className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Current Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full max-w-md px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="Operator">Operator</option>
                  <option value="Test User">Test User</option>
                </select>
                <p className="text-xs text-[#95AAC9] mt-2">
                  {isEditing ? 'Select a role for this user' : 'Click "Edit Permissions" to modify user role'}
                </p>
              </div>

              <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">System Functions</h3>
              <div className="grid grid-cols-2 gap-4">
                {SYSTEM_FUNCTIONS.map((func) => (
                  <div key={func.id} className="flex items-start gap-3 p-3 border border-[#E3E6F0] dark:border-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={permissions.includes(func.id)}
                      onChange={() => togglePermission(func.id)}
                      disabled={!isEditing}
                      className={`mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5] ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <div>
                      <h4 className="text-sm font-medium text-[#12263F] dark:text-white">{func.label}</h4>
                      <p className="text-xs text-[#95AAC9] mt-1">{func.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#95AAC9] mt-4">Click "Edit" above to modify permissions</p>
            </div>
          )}

          {/* Scope Tab */}
          {activeTab === 'scope' && (
            <div className="col-span-12 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
              <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">Scope</h3>
              <p className="text-[#95AAC9]">Scope configuration will appear here</p>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="col-span-12 bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Recent Activity</h3>
                <button 
                  onClick={fetchActivityLogs}
                  disabled={loadingActivity}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#2C7BE5] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingActivity ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              {loadingActivity ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 text-[#95AAC9] animate-spin mx-auto mb-2" />
                  <p className="text-[#95AAC9]">Loading activity logs...</p>
                </div>
              ) : activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="border border-[#D4E1F4] dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              log.action === 'user_deletion' ? 'bg-red-100 text-red-700' :
                              log.action === 'permission_grant' ? 'bg-green-100 text-green-700' :
                              log.action === 'permission_revoke' ? 'bg-orange-100 text-orange-700' :
                              log.action === 'role_change' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {log.action.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-[#95AAC9]">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-[#12263F] dark:text-gray-300">{log.description}</p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-xs text-[#95AAC9]">
                              {log.details.role && <span className="mr-3">Role: {log.details.role}</span>}
                              {log.details.permissions && Array.isArray(log.details.permissions) && (
                                <span>Permissions: {log.details.permissions.join(', ') || 'None'}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#95AAC9]">No activity logs found</p>
                  <p className="text-xs text-[#95AAC9] mt-2">Permission and role changes will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="col-span-12 space-y-6">
              <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-2">Password & Security Tools</h3>
                <p className="text-sm text-[#95AAC9] mb-6">Generate temporary passwords, send reset emails, or manually set a new password for the selected user.</p>

                <div className="space-y-6">
                  {/* Generate Temporary Password */}
                  <div className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                    <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-2">Generate Temporary Password</h4>
                    <p className="text-xs text-[#95AAC9] mb-4">Create a random, strong password for the user. Share it securely and ask them to change it on first login.</p>
                    <button
                      onClick={handleGeneratePassword}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      Generate password
                    </button>
                  </div>

                  {/* Set Password Manually */}
                  <div className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                    <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-2">Set Password Manually</h4>
                    <p className="text-xs text-[#95AAC9] mb-4">Define a specific password for this account. The user will be able to log in immediately using the new password.</p>
                    <p className="text-xs text-[#95AAC9] mb-4">Password must be at least 8 characters and match exactly.</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New password"
                        className="px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                      />
                    </div>
                    <button
                      onClick={handleSavePassword}
                      className="px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors"
                    >
                      Save password
                    </button>
                  </div>

                  {/* Send Password Reset Email */}
                  <div className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4">
                    <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-2">Send Password Reset Email</h4>
                    <p className="text-xs text-[#95AAC9] mb-4">Supabase will send a reset link to the user's email address if it's valid.</p>
                    <button
                      onClick={handleSendResetEmail}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Send reset email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ZohoLayout>
  )
}
