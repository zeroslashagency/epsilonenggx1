"use client"

import { useState, useEffect } from 'react'
import { User, UserPlus, Shield, ArrowUpDown, Zap, RefreshCw, Edit } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'
import { apiGet, apiPost } from '@/app/lib/utils/api-client'

interface Employee {
  id: string
  name: string
  code: string
  role: string
}

export default function AddUsersPage() {
  const router = useRouter()
  const [activeMethod, setActiveMethod] = useState<'manual' | 'employees'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  
  // Manual entry form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    role: 'Operator',
    department: '',
    designation: '',
    notes: ''
  })
  
  // Employee form state
  const [employeeFormData, setEmployeeFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Operator',
    notes: ''
  })

  useEffect(() => {
    if (activeMethod === 'employees') {
      fetchEmployees()
    }
  }, [activeMethod])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      
      // Fetch real employee data from API
      const data = await apiGet('/api/get-employees')
      
      if (data.success && data.employees) {
        // Transform the data to match our interface
        const transformedEmployees = data.employees.map((emp: any) => ({
          id: emp.employee_code,
          name: emp.employee_name || emp.name || `Employee ${emp.employee_code}`,
          code: emp.employee_code,
          role: emp.designation || 'Employee'
        }))
        
        setEmployees(transformedEmployees)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      // Fallback to empty array instead of mock data
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    // Validate form
    if (!formData.fullName || !formData.email || !formData.password) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      const result = await apiPost('/api/admin/create-user', {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        employee_code: formData.employeeCode,
        role: formData.role,
        department: formData.department,
        designation: formData.designation,
        notes: formData.notes
      })

      if (result.success) {
        alert('User created successfully!')
        router.push('/settings/users')
      } else {
        alert('Failed to create user: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to create user')
    }
  }

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeForm(true)
    setEmployeeFormData({
      email: '',
      password: '',
      confirmPassword: '',
      role: 'Operator',
      notes: ''
    })
  }

  const handleCreateFromEmployee = async () => {
    if (!selectedEmployee) return

    // Validate
    if (!employeeFormData.email || !employeeFormData.password) {
      alert('Please fill in email and password')
      return
    }

    if (employeeFormData.password !== employeeFormData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      const result = await apiPost('/api/admin/create-user-from-employee', {
        employee_code: selectedEmployee.code,
        employee_name: selectedEmployee.name,
        email: employeeFormData.email,
        password: employeeFormData.password,
        role: employeeFormData.role,
        department: 'Default',
        designation: selectedEmployee.role
      })

      if (result.success) {
        
        let successMessage = '✅ User created successfully!'
        if (result.tempPassword) {
          successMessage += `\n\n🔑 Temporary Password: ${result.tempPassword}\n\nPlease save this password and ask the user to change it on first login.`
        }
        
        alert(successMessage)
        router.push('/settings/users')
      } else {
        alert('❌ Failed to create user: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('❌ Failed to create user')
    }
  }

  return (
    <ZohoLayout breadcrumbs={[]}>
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
              href="/settings/users/add"
              className="flex items-center gap-2 px-4 py-3 text-sm text-white bg-[#00A651] rounded-t transition-colors border-b-2 border-[#00A651]"
            >
              <UserPlus className="w-4 h-4" />
              Add Users
            </Link>
            <Link
              href="/settings/roles"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
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
        <div>
          <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Add New User</h1>
          <p className="text-[#95AAC9] mt-1">Choose how you want to create a new user account.</p>
        </div>

        {/* Method Selection */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveMethod('manual')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${
              activeMethod === 'manual'
                ? 'bg-[#00A651] text-white'
                : 'bg-white dark:bg-gray-800 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 hover:bg-[#F8F9FC] dark:hover:bg-gray-700'
            }`}
          >
            <Edit className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            onClick={() => setActiveMethod('employees')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors ${
              activeMethod === 'employees'
                ? 'bg-[#00A651] text-white'
                : 'bg-white dark:bg-gray-800 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 hover:bg-[#F8F9FC] dark:hover:bg-gray-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Select from Employees
          </button>
        </div>

        {/* Manual Entry Form */}
        {activeMethod === 'manual' && (
          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-semibold text-[#12263F] dark:text-white mb-6">Manual User Creation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Account Details</h3>
                <p className="text-xs text-[#95AAC9]">Enter all user information manually.</p>
                
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Employee Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="EMP001"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  />
                </div>
              </div>

              {/* Role & Additional Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Role & Additional Info</h3>
                <p className="text-xs text-[#95AAC9]">Select role and add optional details.</p>
                
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Operator">Operator</option>
                    <option value="Test User">Test User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Engineering"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Designation (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Software Engineer"
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add internal notes or onboarding details."
                    rows={4}
                    className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
              <button
                onClick={() => setFormData({
                  fullName: '', email: '', password: '', confirmPassword: '',
                  employeeCode: '', role: 'Operator', department: '', designation: '', notes: ''
                })}
                className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
              >
                Clear Form
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                ✓ Create User Account (FIXED)
              </button>
            </div>
          </div>
        )}

        {/* Select from Employees */}
        {activeMethod === 'employees' && !showEmployeeForm && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Available Employees</h2>
              <button
                onClick={fetchEmployees}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-3 text-center py-8 text-[#95AAC9]">
                  Loading employees...
                </div>
              ) : employees.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-[#95AAC9]">
                  No employees available
                </div>
              ) : (
                employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6 hover:border-[#2C7BE5] transition-colors cursor-pointer"
                    onClick={() => handleSelectEmployee(employee)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#12263F] dark:text-white">{employee.name}</h3>
                        <p className="text-sm text-[#95AAC9]">Code: {employee.code}</p>
                        <p className="text-xs text-[#95AAC9]">Default - {employee.role}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Employee Form - After Selection */}
        {activeMethod === 'employees' && showEmployeeForm && selectedEmployee && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Create Account for Employee</h2>
              <button
                onClick={() => {
                  setShowEmployeeForm(false)
                  setSelectedEmployee(null)
                }}
                className="text-sm text-[#2C7BE5] hover:underline"
              >
                ← Back to Employee Selection
              </button>
            </div>

            {/* Selected Employee Card */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[#12263F] dark:text-white">Selected Employee: {selectedEmployee.name}</h3>
                  <p className="text-sm text-[#95AAC9]">Code: {selectedEmployee.code} • Default - {selectedEmployee.role}</p>
                </div>
              </div>
            </div>

            {/* Employee Account Form */}
            <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Account Details</h3>
                  <p className="text-xs text-[#95AAC9]">Enter user profile information and credentials.</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={selectedEmployee.name}
                      disabled
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-gray-100 dark:bg-gray-800 text-[#12263F] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={employeeFormData.email}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                      placeholder="john.doe@example.com"
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={employeeFormData.password}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={employeeFormData.confirmPassword}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, confirmPassword: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={employeeFormData.notes}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, notes: e.target.value })}
                      placeholder="Add internal notes or onboarding details."
                      rows={3}
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] resize-none"
                    />
                  </div>
                </div>

                {/* Role & Permissions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Role & Permissions</h3>
                  <p className="text-xs text-[#95AAC9]">Select a role to preview default access.</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={employeeFormData.role}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Operator">Operator</option>
                      <option value="Test User">Test User</option>
                    </select>
                  </div>

                  <div className="bg-[#F8F9FC] dark:bg-gray-800 rounded p-4">
                    <h4 className="text-xs font-semibold text-[#12263F] dark:text-white mb-3">DEFAULT PERMISSIONS</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-[#12263F] dark:text-white">Dashboard</p>
                          <p className="text-xs text-[#95AAC9]">Access the primary manufacturing overview dashboard.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-[#12263F] dark:text-white">Schedule Generator</p>
                          <p className="text-xs text-[#95AAC9]">Open the smart schedule builder and adjust production timelines.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-[#12263F] dark:text-white">Chart</p>
                          <p className="text-xs text-[#95AAC9]">Explore production charts and machine KPIs.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowEmployeeForm(false)
                    setSelectedEmployee(null)
                  }}
                  className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFromEmployee}
                  className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  ✓ Create User Account (FIXED)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
