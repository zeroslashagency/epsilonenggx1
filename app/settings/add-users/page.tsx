"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, UserPlus, Shield, Zap, RefreshCw, Edit } from 'lucide-react'
import { ZohoLayout } from '@/app/components/zoho-ui/ZohoLayout'
import { apiGet, apiPost } from '@/app/lib/utils/api-client'
import { useToast } from '@/components/ui/use-toast'

interface Employee {
  id: string
  name: string
  code: string
  role: string
}

interface Role {
  id: string
  name: string
  description: string
  default_permissions?: string[]
}

export default function AddUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeMethod, setActiveMethod] = useState<'manual' | 'employees'>('manual')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  
  // Roles state
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  
  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false)
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [employeeFormErrors, setEmployeeFormErrors] = useState<Record<string, string>>({})
  
  // Password strength
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    label: string
    color: string
    suggestions: string[]
  }>({ score: 0, label: 'None', color: 'gray', suggestions: [] })
  
  // Email validation
  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [emailCheckTimer, setEmailCheckTimer] = useState<NodeJS.Timeout | null>(null)
  
  // Manual entry form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    roleId: '',
    department: '',
    designation: '',
    notes: '',
    standaloneAttendance: false
  })
  
  // Employee form state
  const [employeeFormData, setEmployeeFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    notes: '',
    standaloneAttendance: false
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (activeMethod === 'employees') {
      fetchEmployees()
    }
  }, [activeMethod])

  const fetchRoles = async () => {
    setRolesLoading(true)
    setRolesError(null)
    try {
      const data = await apiGet('/api/admin/roles')
      console.log('📋 Fetched roles:', data)
      
      if (data.success && data.data) {
        const rolesList = Array.isArray(data.data.roles) ? data.data.roles : 
                         Array.isArray(data.data) ? data.data : []
        setRoles(rolesList)
        
        // Set default role if available
        if (rolesList.length > 0 && !formData.roleId) {
          const defaultRole = rolesList.find((r: Role) => r.name === 'Operator') || rolesList[0]
          setFormData(prev => ({ ...prev, roleId: defaultRole.id }))
          setEmployeeFormData(prev => ({ ...prev, roleId: defaultRole.id }))
          // Fetch permissions for default role
          if (defaultRole) {
            fetchRolePermissions(defaultRole.id)
          }
        }
      } else {
        setRolesError('Failed to load roles')
        console.error('❌ Failed to fetch roles:', data.error)
      }
    } catch (error) {
      setRolesError('Error loading roles')
      console.error('❌ Error fetching roles:', error)
    } finally {
      setRolesLoading(false)
    }
  }

  const fetchRolePermissions = async (roleId: string) => {
    if (!roleId) {
      setRolePermissions([])
      return
    }
    
    setPermissionsLoading(true)
    try {
      const data = await apiGet(`/api/admin/roles/${roleId}/permissions`)
      console.log('🔐 Fetched permissions for role:', data)
      
      if (data.success && data.permissions) {
        setRolePermissions(data.permissions)
      } else {
        setRolePermissions([])
      }
    } catch (error) {
      console.error('❌ Error fetching permissions:', error)
      setRolePermissions([])
    } finally {
      setPermissionsLoading(false)
    }
  }

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

  // Check if email already exists (debounced)
  const checkEmailAvailability = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setEmailCheckStatus('idle')
      return
    }

    setEmailCheckStatus('checking')
    
    try {
      // Check via API (you may need to create this endpoint)
      const response = await fetch(`/api/admin/check-email?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (data.exists) {
        setEmailCheckStatus('taken')
      } else {
        setEmailCheckStatus('available')
      }
    } catch (error) {
      // If API doesn't exist, just mark as available
      setEmailCheckStatus('available')
    }
  }

  // Validation functions
  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return { valid: false, error: 'Email is required' }
    if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' }
    if (emailCheckStatus === 'taken') return { valid: false, error: 'This email is already in use' }
    return { valid: true }
  }

  const calculatePasswordStrength = (password: string) => {
    if (!password) {
      return { score: 0, label: 'None', color: 'gray', suggestions: ['Enter a password'] }
    }

    let score = 0
    const suggestions: string[] = []

    // Length check
    if (password.length >= 8) score += 1
    else suggestions.push('Use at least 8 characters')
    
    if (password.length >= 12) score += 1

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1
    else suggestions.push('Add lowercase letters')
    
    if (/[A-Z]/.test(password)) score += 1
    else suggestions.push('Add uppercase letters')
    
    if (/[0-9]/.test(password)) score += 1
    else suggestions.push('Add numbers')
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else suggestions.push('Add special characters (!@#$%^&*)')

    // Determine strength
    let label = 'Weak'
    let color = 'red'
    
    if (score >= 5) {
      label = 'Strong'
      color = 'green'
    } else if (score >= 3) {
      label = 'Medium'
      color = 'yellow'
    }

    return { score, label, color, suggestions }
  }

  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password) return { valid: false, error: 'Password is required' }
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' }
    return { valid: true }
  }

  const validateManualForm = (): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}
    
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required'
    
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) errors.email = emailValidation.error!
    
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) errors.password = passwordValidation.error!
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.roleId) errors.roleId = 'Please select a role'
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }

  const validateEmployeeForm = (): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {}
    
    const emailValidation = validateEmail(employeeFormData.email)
    if (!emailValidation.valid) errors.email = emailValidation.error!
    
    const passwordValidation = validatePassword(employeeFormData.password)
    if (!passwordValidation.valid) errors.password = passwordValidation.error!
    
    if (employeeFormData.password !== employeeFormData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (!employeeFormData.roleId) errors.roleId = 'Please select a role'
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }

  const handleCreateUser = async () => {
    const validation = validateManualForm()
    
    if (!validation.valid) {
      setFormErrors(validation.errors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      })
      return
    }
    
    setFormErrors({})

    setIsCreating(true)
    try {
      const result = await apiPost('/api/admin/create-user', {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        employee_code: formData.employeeCode,
        roleId: formData.roleId,
        department: formData.department,
        designation: formData.designation,
        notes: formData.notes,
        standalone_attendance: formData.standaloneAttendance ? 'YES' : 'NO'
      })

      if (result.success) {
        toast({
          title: "✅ Success",
          description: `User ${formData.fullName} has been created successfully`,
          variant: "default"
        })
        
        // Reset form instead of redirecting
        const defaultRole = roles.find((r: Role) => r.name === 'Operator') || roles[0]
        setFormData({
          fullName: '', email: '', password: '', confirmPassword: '',
          employeeCode: '', roleId: defaultRole?.id || '', department: '', designation: '', notes: '',
          standaloneAttendance: false
        })
        setFormErrors({})
      } else {
        toast({
          title: "❌ Failed to Create User",
          description: result.error || 'An unexpected error occurred',
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeForm(true)
    const defaultRole = roles.find((r: Role) => r.name === 'Operator') || roles[0]
    setEmployeeFormData({
      email: '',
      password: '',
      confirmPassword: '',
      roleId: defaultRole?.id || '',
      notes: '',
      standaloneAttendance: false
    })
  }

  const handleCreateFromEmployee = async () => {
    if (!selectedEmployee) return

    const validation = validateEmployeeForm()
    
    if (!validation.valid) {
      setEmployeeFormErrors(validation.errors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      })
      return
    }
    
    setEmployeeFormErrors({})

    setIsCreating(true)
    try {
      // Get the role name from roleId
      const selectedRole = roles.find(r => r.id === employeeFormData.roleId)
      const roleName = selectedRole?.name || 'Operator'
      
      const result = await apiPost('/api/admin/create-user-from-employee', {
        employee_code: selectedEmployee.code,
        employee_name: selectedEmployee.name,
        email: employeeFormData.email,
        password: employeeFormData.password,
        role: roleName,
        department: 'Default',
        designation: selectedEmployee.role,
        standalone_attendance: employeeFormData.standaloneAttendance ? 'YES' : 'NO'
      })

      if (result.success) {
        toast({
          title: "✅ User Created Successfully",
          description: result.tempPassword 
            ? `Account created for ${selectedEmployee.name}. Temporary password: ${result.tempPassword}`
            : `Account created for ${selectedEmployee.name}`,
          variant: "default"
        })
        
        // Reset form and go back to employee selection
        setShowEmployeeForm(false)
        setSelectedEmployee(null)
        const defaultRole = roles.find((r: Role) => r.name === 'Operator') || roles[0]
        setEmployeeFormData({
          email: '',
          password: '',
          confirmPassword: '',
          roleId: defaultRole?.id || '',
          notes: '',
          standaloneAttendance: false
        })
        setEmployeeFormErrors({})
      } else {
        toast({
          title: "❌ Failed to Create User",
          description: result.error || 'An unexpected error occurred',
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'User Management', href: '/settings/users' },
    { label: 'Add New User', href: '/settings/add-users' }
  ]

  return (
    <ZohoLayout breadcrumbs={breadcrumbs}>
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
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value })
                      if (formErrors.fullName) {
                        setFormErrors(prev => {
                          const { fullName, ...rest } = prev
                          return rest
                        })
                      }
                    }}
                    placeholder="John Doe"
                    className={`w-full px-3 py-2 border ${
                      formErrors.fullName ? 'border-red-500' : 'border-[#E3E6F0]'
                    } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                  />
                  {formErrors.fullName && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        const newEmail = e.target.value
                        setFormData({ ...formData, email: newEmail })
                        
                        // Clear previous timer
                        if (emailCheckTimer) clearTimeout(emailCheckTimer)
                        
                        // Debounce email check (wait 500ms after user stops typing)
                        const timer = setTimeout(() => {
                          checkEmailAvailability(newEmail)
                        }, 500)
                        setEmailCheckTimer(timer)
                        
                        if (formErrors.email) {
                          setFormErrors(prev => {
                            const { email, ...rest } = prev
                            return rest
                          })
                        }
                      }}
                      placeholder="john.doe@example.com"
                      className={`w-full px-3 py-2 pr-10 border ${
                        formErrors.email ? 'border-red-500' :
                        emailCheckStatus === 'taken' ? 'border-red-500' :
                        emailCheckStatus === 'available' ? 'border-green-500' :
                        'border-[#E3E6F0]'
                      } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                    />
                    {/* Email status indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailCheckStatus === 'checking' && (
                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {emailCheckStatus === 'available' && (
                        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {emailCheckStatus === 'taken' && (
                        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                  {emailCheckStatus === 'taken' && !formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">This email is already registered</p>
                  )}
                  {emailCheckStatus === 'available' && (
                    <p className="text-xs text-green-600 mt-1">Email is available</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        const newPassword = e.target.value
                        setFormData({ ...formData, password: newPassword })
                        setPasswordStrength(calculatePasswordStrength(newPassword))
                        if (formErrors.password) {
                          setFormErrors(prev => {
                            const { password, ...rest } = prev
                            return rest
                          })
                        }
                      }}
                      placeholder="Minimum 8 characters"
                      className={`w-full px-3 py-2 border ${
                        formErrors.password ? 'border-red-500' : 'border-[#E3E6F0]'
                      } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                    />
                    {formErrors.password && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                    )}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[#12263F] dark:text-white">
                            Password Strength:
                          </span>
                          <span className={`text-xs font-semibold ${
                            passwordStrength.color === 'green' ? 'text-green-600' :
                            passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.color === 'green' ? 'bg-green-500' :
                              passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          />
                        </div>
                        {passwordStrength.suggestions.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {passwordStrength.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="text-xs text-[#95AAC9]">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value })
                        if (formErrors.confirmPassword) {
                          setFormErrors(prev => {
                            const { confirmPassword, ...rest } = prev
                            return rest
                          })
                        }
                      }}
                      placeholder="Re-enter password"
                      className={`w-full px-3 py-2 border ${
                        formErrors.confirmPassword ? 'border-red-500' : 'border-[#E3E6F0]'
                      } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                    )}
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
                {/* Standalone Attendance Toggle */}
                <div className="pb-4 border-b border-[#E3E6F0] dark:border-gray-700">
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Additional Access
                  </label>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.standaloneAttendance}
                      onChange={(e) => setFormData({ ...formData, standaloneAttendance: e.target.checked })}
                      className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5] cursor-pointer"
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

                <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Role & Additional Info</h3>
                <p className="text-xs text-[#95AAC9]">Select role and add optional details.</p>
                
                <div>
                  <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  {rolesLoading ? (
                    <div className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-gray-100 dark:bg-gray-800 text-[#95AAC9]">
                      Loading roles...
                    </div>
                  ) : rolesError ? (
                    <div className="w-full px-3 py-2 border border-red-300 rounded text-sm bg-red-50 text-red-600">
                      {rolesError}
                    </div>
                  ) : (
                    <>
                      <select
                        value={formData.roleId}
                        onChange={(e) => {
                          setFormData({ ...formData, roleId: e.target.value })
                          fetchRolePermissions(e.target.value)
                          if (formErrors.roleId) {
                            setFormErrors(prev => {
                              const { roleId, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        className={`w-full px-3 py-2 border ${
                          formErrors.roleId ? 'border-red-500' : 'border-[#E3E6F0]'
                        } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      >
                        <option value="">Select a role</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      {formErrors.roleId && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.roleId}</p>
                      )}
                    </>
                  )}
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
                onClick={() => {
                  const defaultRole = roles.find((r: Role) => r.name === 'Operator') || roles[0]
                  setFormData({
                    fullName: '', email: '', password: '', confirmPassword: '',
                    employeeCode: '', roleId: defaultRole?.id || '', department: '', designation: '', notes: '',
                    standaloneAttendance: false
                  })
                }}
                className="px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
              >
                Clear Form
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating || rolesLoading}
                className={`px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors ${
                  isCreating || rolesLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating User...
                  </>
                ) : (
                  '✓ Create User Account'
                )}
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
                      onChange={(e) => {
                        setEmployeeFormData({ ...employeeFormData, email: e.target.value })
                        if (employeeFormErrors.email) {
                          setEmployeeFormErrors(prev => {
                            const { email, ...rest } = prev
                            return rest
                          })
                        }
                      }}
                      placeholder="john.doe@example.com"
                      className={`w-full px-3 py-2 border ${
                        employeeFormErrors.email ? 'border-red-500' : 'border-[#E3E6F0]'
                      } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                    />
                    {employeeFormErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{employeeFormErrors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={employeeFormData.password}
                        onChange={(e) => {
                          setEmployeeFormData({ ...employeeFormData, password: e.target.value })
                          if (employeeFormErrors.password) {
                            setEmployeeFormErrors(prev => {
                              const { password, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="Minimum 8 characters"
                        className={`w-full px-3 py-2 border ${
                          employeeFormErrors.password ? 'border-red-500' : 'border-[#E3E6F0]'
                        } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {employeeFormErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{employeeFormErrors.password}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={employeeFormData.confirmPassword}
                        onChange={(e) => {
                          setEmployeeFormData({ ...employeeFormData, confirmPassword: e.target.value })
                          if (employeeFormErrors.confirmPassword) {
                            setEmployeeFormErrors(prev => {
                              const { confirmPassword, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="Re-enter password"
                        className={`w-full px-3 py-2 border ${
                          employeeFormErrors.confirmPassword ? 'border-red-500' : 'border-[#E3E6F0]'
                        } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {employeeFormErrors.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{employeeFormErrors.confirmPassword}</p>
                      )}
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
                  {/* Standalone Attendance Toggle */}
                  <div className="pb-4 border-b border-[#E3E6F0] dark:border-gray-700">
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Additional Access
                    </label>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={employeeFormData.standaloneAttendance}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, standaloneAttendance: e.target.checked })}
                        className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5] cursor-pointer"
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

                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white">Role & Permissions</h3>
                  <p className="text-xs text-[#95AAC9]">Select a role to preview default access.</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    {rolesLoading ? (
                      <div className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-gray-100 dark:bg-gray-800 text-[#95AAC9]">
                        Loading roles...
                      </div>
                    ) : rolesError ? (
                      <div className="w-full px-3 py-2 border border-red-300 rounded text-sm bg-red-50 text-red-600">
                        {rolesError}
                      </div>
                    ) : (
                      <>
                        <select
                          value={employeeFormData.roleId}
                          onChange={(e) => {
                            setEmployeeFormData({ ...employeeFormData, roleId: e.target.value })
                            fetchRolePermissions(e.target.value)
                            if (employeeFormErrors.roleId) {
                              setEmployeeFormErrors(prev => {
                                const { roleId, ...rest } = prev
                                return rest
                              })
                            }
                          }}
                          className={`w-full px-3 py-2 border ${
                            employeeFormErrors.roleId ? 'border-red-500' : 'border-[#E3E6F0]'
                          } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                        >
                          <option value="">Select a role</option>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        {employeeFormErrors.roleId && (
                          <p className="text-xs text-red-500 mt-1">{employeeFormErrors.roleId}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="bg-[#F8F9FC] dark:bg-gray-800 rounded p-4">
                    <h4 className="text-xs font-semibold text-[#12263F] dark:text-white mb-3">DEFAULT PERMISSIONS</h4>
                    {permissionsLoading ? (
                      <div className="text-center py-4 text-[#95AAC9] text-sm">
                        Loading permissions...
                      </div>
                    ) : rolePermissions.length === 0 ? (
                      <div className="text-center py-4 text-[#95AAC9] text-sm">
                        {employeeFormData.roleId ? 'No permissions assigned to this role' : 'Select a role to view permissions'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rolePermissions.map((perm: any) => (
                          <div key={perm.id || perm.name} className="flex items-center gap-2 text-sm">
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-[#12263F] dark:text-white">{perm.name || perm.permission_name}</p>
                              {perm.description && (
                                <p className="text-xs text-[#95AAC9]">{perm.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                  disabled={isCreating || rolesLoading}
                  className={`px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors ${
                    isCreating || rolesLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating User...
                    </>
                  ) : (
                    '✓ Create User Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
