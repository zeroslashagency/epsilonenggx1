"use client"

import { useState, useEffect } from 'react'
import { User, UserPlus, Shield, ArrowUpDown, Zap, Edit, Trash2, Settings, X, Save, RefreshCw, Key, Mail } from 'lucide-react'
import Link from 'next/link'
import { ZohoLayout } from '../components/zoho-ui'

interface UserType {
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

export default function UsersPageDrawer() {
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'scope' | 'activity' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [permissions, setPermissions] = useState<string[]>(['dashboard', 'schedule_generator'])
  const [editedRole, setEditedRole] = useState('')
  const [editedPhone, setEditedPhone] = useState('')
  const [editedEmployeeCode, setEditedEmployeeCode] = useState('')
  const [editedDepartment, setEditedDepartment] = useState('')
  const [editedDesignation, setEditedDesignation] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data.users || [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDrawer = (user: UserType) => {
    setSelectedUser(user)
    setShowDrawer(true)
    setIsEditing(false)
    setActiveTab('overview')
    setEditedPhone(user.phone || '')
    setEditedEmployeeCode(user.employee_code || '')
    setEditedDepartment(user.department || '')
    setEditedDesignation(user.designation || '')
  }

  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setIsEditing(false)
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditedRole(selectedUser?.role || '')
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return
    
    try {
      const response = await fetch('/api/admin/update-user-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          phone: editedPhone,
          employee_code: editedEmployeeCode,
          department: editedDepartment,
          designation: editedDesignation
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Changes saved successfully!')
        setIsEditing(false)
        // Update local state
        setSelectedUser({
          ...selectedUser,
          phone: editedPhone,
          employee_code: editedEmployeeCode,
          department: editedDepartment,
          designation: editedDesignation
        })
        // Refresh users list
        fetchUsers()
      } else {
        alert(`Failed to save: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Failed to save changes')
    }
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">All Users</h1>
          <div className="flex items-center gap-2">
            <Link href="/users/add">
              <button className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors">
                Invite User
              </button>
            </Link>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
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
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#95AAC9]">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#95AAC9]">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F8F9FC] dark:hover:bg-gray-800">
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
                      <button
                        onClick={() => handleOpenDrawer(user)}
                        className="p-2 hover:bg-[#E3E6F0] dark:hover:bg-gray-700 rounded transition-colors"
                        title="User Settings"
                      >
                        <Settings className="w-5 h-5 text-[#95AAC9]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer */}
      {showDrawer && selectedUser && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseDrawer}
          ></div>

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 h-full w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-[#E3E6F0] dark:border-gray-700 flex items-start justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#12263F] dark:text-white">{selectedUser.full_name}</h2>
                  <p className="text-[#95AAC9]">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                      {selectedUser.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      <X className="w-5 h-5" />
                    </button>
                    <button onClick={handleSaveChanges} className="flex items-center gap-2 px-3 py-1.5 bg-[#00A651] text-white text-sm rounded hover:bg-green-600">
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleEditClick} className="flex items-center gap-2 px-3 py-1.5 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button onClick={handleCloseDrawer} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      <X className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#E3E6F0] dark:border-gray-700 sticky top-[120px] bg-white dark:bg-gray-900">
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
              {activeTab === 'overview' && (
                <div className="space-y-6">
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
                            className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
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
                            className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
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
                            className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
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
                            className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
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
                          {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '9/29/2025'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Access Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-[#95AAC9]">Permissions:</p>
                        <p className="text-2xl font-bold text-[#12263F] dark:text-white">{permissions.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#95AAC9]">Overrides:</p>
                        <p className="text-2xl font-bold text-[#12263F] dark:text-white">0</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#95AAC9]">Plants:</p>
                        <p className="text-2xl font-bold text-[#12263F] dark:text-white">0</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'roles' && (
                <div>
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">Role Assignment</h3>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Role</label>
                    <select
                      value={isEditing ? editedRole : selectedUser.role}
                      onChange={(e) => setEditedRole(e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-[#E3E6F0] rounded text-sm ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select role</option>
                      <option value="Admin">Admin</option>
                      <option value="Operator">Operator</option>
                      <option value="Test User">Test User</option>
                    </select>
                  </div>

                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">System Functions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {SYSTEM_FUNCTIONS.map((func) => (
                      <div key={func.id} className="flex items-start gap-3 p-3 border border-[#E3E6F0] rounded">
                        <input
                          type="checkbox"
                          checked={permissions.includes(func.id)}
                          disabled={!isEditing}
                          onChange={() => {
                            if (isEditing) {
                              setPermissions(prev =>
                                prev.includes(func.id) ? prev.filter(p => p !== func.id) : [...prev, func.id]
                              )
                            }
                          }}
                          className="mt-1 w-4 h-4"
                        />
                        <div>
                          <h4 className="text-sm font-medium">{func.label}</h4>
                          <p className="text-xs text-[#95AAC9] mt-1">{func.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="text-center py-8">
                  <p className="text-[#95AAC9]">No activity logs found</p>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </ZohoLayout>
  )
}
