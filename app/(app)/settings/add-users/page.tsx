"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, Plus, Mail, Pencil, Trash2, X, ChevronRight, Upload, Camera, Check, Settings, Loader2, RefreshCw, Key, Shield, User, ChevronDown, Lock, Calendar, Edit, Eye, Briefcase, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiGet, apiPost } from '@/app/lib/utils/api-client'
import { useToast } from '@/components/ui/use-toast'

interface Employee {
  id: string
  name: string
  code: string
  role: string
  email?: string | null
  lastActive?: string | null
}

interface Role {
  id: string
  name: string
  description: string
}

export default function AddUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeMethod, setActiveMethod] = useState<'manual' | 'employees'>('employees')
  const [roles, setRoles] = useState<Role[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    roleId: '',
    department: '',
    designation: '',
    standaloneAttendance: false,
    forcePasswordReset: false,
    avatarUrl: ''
  })

  const [manualSendEmail, setManualSendEmail] = useState(false)
  const [manualFormErrors, setManualFormErrors] = useState<Record<string, string>>({})

  const [employeeFormData, setEmployeeFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    department: '',
    standaloneAttendance: false,
    avatarUrl: '',
    forcePasswordReset: false
  })

  const cardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Shift Assignment State
  const [showShiftAssignment, setShowShiftAssignment] = useState(false)
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([])
  const [assignmentData, setAssignmentData] = useState({
    type: 'fixed',
    templateId: '',
    startDate: new Date().toISOString().split('T')[0]
  })

  const [sendEmailInvitation, setSendEmailInvitation] = useState(false)
  const [employeeFormErrors, setEmployeeFormErrors] = useState<Record<string, string>>({})
  const [isCreating, setIsCreating] = useState(false)


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // helper to validate size/type if needed
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setEmployeeFormData(prev => ({ ...prev, avatarUrl: data.url }))
        toast({ title: 'Success', description: 'Profile photo uploaded' })
      } else {
        toast({ title: 'Error', description: data.error || 'Upload failed', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Error', description: 'Failed to upload photo', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleCardClick = () => {
    fileInputRef.current?.click()
  }
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (activeMethod === 'employees') {
      fetchEmployees()
    }
  }, [activeMethod])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const tiltX = ((y - centerY) / centerY) * -10
    const tiltY = ((x - centerX) / centerX) * 10
    setTilt({ x: tiltX, y: tiltY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  const fetchRoles = async () => {
    try {
      const data = await apiGet('/api/admin/roles')
      if (data.success && data.data) {
        const rolesList = Array.isArray(data.data.roles) ? data.data.roles : Array.isArray(data.data) ? data.data : []
        setRoles(rolesList)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchShiftTemplates = async () => {
    try {
      console.log('Fetching shift templates...')
      const data = await apiGet('/api/shift-templates')
      console.log('Shift templates response:', data)
      if (data.data) {
        setShiftTemplates(data.data)
        if (data.data.length > 0 && !assignmentData.templateId) {
          setAssignmentData(prev => ({ ...prev, templateId: data.data[0].id }))
        }
      } else if (Array.isArray(data)) {
        // Robustness: handle if it returns array directly
        setShiftTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching shift templates:', error)
    }
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/get-employees')

      if (data.success && data.employees) {
        const transformedEmployees = data.employees.map((emp: any) => ({
          id: emp.employee_code,
          name: emp.employee_name || emp.name || `Employee ${emp.employee_code}`,
          code: emp.employee_code,
          role: emp.designation || 'Employee',
          email: emp.email,
          lastActive: emp.lastActive
        })).sort((a: any, b: any) => {
          // Sort by lastActive descending (active top, inactive bottom)
          if (a.lastActive && !b.lastActive) return -1
          if (!a.lastActive && b.lastActive) return 1
          if (a.lastActive && b.lastActive) {
            return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
          }
          // If both inactive, sort by name
          return a.name.localeCompare(b.name)
        })

        setEmployees(transformedEmployees)
      } else {
        setEmployees([])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
    } finally {
      setLoading(false)
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
      department: '',
      standaloneAttendance: false,
      avatarUrl: '',
      forcePasswordReset: false
    })
    setSendEmailInvitation(false)
    setEmployeeFormErrors({})
  }

  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return { valid: false, error: 'Email is required' }
    if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' }
    return { valid: true }
  }

  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password) return { valid: false, error: 'Password is required' }
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' }
    return { valid: true }
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
      const selectedRole = roles.find(r => r.id === employeeFormData.roleId)
      const roleName = selectedRole?.name || 'Operator'

      const result = await apiPost('/api/admin/create-user-from-employee', {
        employee_code: selectedEmployee.code,
        employee_name: selectedEmployee.name,
        email: employeeFormData.email,
        password: employeeFormData.password,
        role: roleName,
        department: employeeFormData.department || 'Default',
        designation: selectedEmployee.role,
        standalone_attendance: employeeFormData.standaloneAttendance ? 'YES' : 'NO',
        send_email_invitation: sendEmailInvitation,
        avatar_url: employeeFormData.avatarUrl || null,
        force_password_reset: employeeFormData.forcePasswordReset
      })

      if (result.success) {

        // Handle Shift Assignment if enabled
        if (showShiftAssignment && assignmentData.templateId && assignmentData.startDate) {
          try {
            await apiPost('/api/assignments/bulk', {
              employees: [selectedEmployee.code],
              shiftType: assignmentData.type,
              shiftId: assignmentData.templateId,
              startDate: assignmentData.startDate
            })
            toast({
              title: "User & Shift Assigned",
              description: `User created and shift assigned successfully.`,
              variant: "default"
            })
          } catch (assignError) {
            console.error("Shift assignment failed:", assignError)
            toast({
              title: "User Created, Assignment Failed",
              description: "User was created but shift assignment failed. Please check Shift Manager.",
              variant: "destructive"
            })
            // Don't return here, proceed to reset form
          }
        } else {
          toast({
            title: "✅ User Created Successfully",
            description: sendEmailInvitation
              ? `Account created for ${selectedEmployee.name}. Invitation email sent to ${employeeFormData.email}`
              : (result.isTempPassword || result.tempPassword)
                ? `Account created for ${selectedEmployee.name}. Temporary password: ${result.tempPassword}`
                : `Account created for ${selectedEmployee.name}`,
            variant: "default"
          })
        }

        setShowEmployeeForm(false)
        setSelectedEmployee(null)
        const defaultRole = roles.find((r: Role) => r.name === 'Operator') || roles[0]
        setEmployeeFormData({
          email: '',
          password: '',
          confirmPassword: '',
          roleId: defaultRole?.id || '',
          department: '',
          standaloneAttendance: false,
          avatarUrl: '',
          forcePasswordReset: false
        })
        setSendEmailInvitation(false)
        setEmployeeFormErrors({})
        fetchEmployees()
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

  const handleCreateManual = async () => {
    const errors: Record<string, string> = {}

    // Validation
    if (!formData.fullName) errors.fullName = 'Full Name is required'
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) errors.email = emailValidation.error!
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) errors.password = passwordValidation.error!
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (!formData.roleId) errors.roleId = 'Please select a role'

    if (Object.keys(errors).length > 0) {
      setManualFormErrors(errors)
      toast({ title: "Validation Error", description: "Please fix the errors in the form", variant: "destructive" })
      return
    }

    setManualFormErrors({})
    setIsCreating(true)

    try {
      const selectedRole = roles.find(r => r.id === formData.roleId)
      const roleName = selectedRole?.name || 'Operator'

      const result = await apiPost('/api/admin/create-user-from-employee', {
        employee_code: formData.employeeCode || `MAN-${Date.now().toString().slice(-6)}`,
        employee_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: roleName,
        department: formData.department || 'Default',
        designation: formData.designation || 'Staff',
        standalone_attendance: formData.standaloneAttendance ? 'YES' : 'NO',
        send_email_invitation: manualSendEmail,
        avatar_url: formData.avatarUrl || null,
        force_password_reset: formData.forcePasswordReset
      })

      if (result.success) {
        const empCode = formData.employeeCode || result.employee_code
        if (showShiftAssignment && assignmentData.templateId && assignmentData.startDate) {
          try {
            await apiPost('/api/assignments/bulk', {
              employees: [empCode],
              shiftType: assignmentData.type,
              shiftId: assignmentData.templateId,
              startDate: assignmentData.startDate
            })
            toast({ title: "User & Shift Assigned", description: "User created and shift assigned successfully." })
          } catch (e) {
            toast({ title: "User Created, Assignment Failed", description: "User created but shift assignment failed.", variant: "destructive" })
          }
        } else {
          toast({ title: "✅ User Created Successfully" })
        }
        router.push('/settings/users')
      } else {
        toast({ title: "❌ Failed", description: result.error || 'Failed to create user', variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "❌ Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Add New User</h1>
        <p className="text-[#95AAC9] mt-1">Choose your preferred method to create a new user account</p>
      </div>

      {/* Method Selection - Switch Style */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setActiveMethod('manual')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${activeMethod === 'manual'
            ? 'bg-[#2C7BE5] text-white shadow-sm'
            : 'bg-white dark:bg-gray-900 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
            }`}
        >
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Manual Entry
          </div>
        </button>

        <button
          onClick={() => setActiveMethod('employees')}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${activeMethod === 'employees'
            ? 'bg-[#2C7BE5] text-white shadow-sm'
            : 'bg-white dark:bg-gray-900 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
            }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Select from Biometric
          </div>
        </button>
      </div>

      {/* Split Screen Layout */}
      {activeMethod === 'manual' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: Realistic ID Card with Flip Animation (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="flex items-center gap-2 text-xs font-medium text-[#95AAC9] mb-3">
                <Eye className="w-4 h-4" />
                Live Preview
              </div>

              {/* Lanyard Clip */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-8 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-t-lg shadow-md relative">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-gray-200 dark:bg-gray-500 rounded-full border-2 border-gray-400 dark:border-gray-600"></div>
                </div>
              </div>

              {/* ID Card with 3D Flip */}
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="perspective-1000"
              >
                <div
                  className={`relative w-full transition-all duration-700 transform-style-3d ${formData.fullName || formData.email ? 'rotate-y-180' : ''
                    }`}
                  style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${formData.fullName || formData.email ? 180 + tilt.y : tilt.y}deg)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                >

                  {/* FRONT SIDE - Company Logo (Empty State) */}
                  <div className="backface-hidden">
                    <div className="bg-gradient-to-br from-[#2C7BE5] to-[#1a5bb8] rounded-xl overflow-hidden border-4 border-white dark:border-gray-700 shadow-[0_20px_60px_-15px_rgba(44,123,229,0.5)] hover:shadow-[0_25px_70px_-15px_rgba(44,123,229,0.6)] transition-shadow duration-300 relative">
                      {/* 3D Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>

                      {/* Lanyard Hole */}
                      <div className="flex justify-center pt-3 relative z-10">
                        <div className="w-6 h-6 rounded-full bg-white/20 border-2 border-white/40"></div>
                      </div>

                      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                        {/* Company Logo */}
                        <div className="mb-6">
                          <div className="text-white text-5xl font-bold tracking-wider">EPSILON</div>
                          <div className="text-white/80 text-sm text-center mt-2 tracking-widest">ENGINEERING</div>
                        </div>

                        {/* Decorative Lines */}
                        <div className="w-full max-w-[200px] space-y-2 mt-8">
                          <div className="h-1 bg-white/30 rounded"></div>
                          <div className="h-1 bg-white/20 rounded w-3/4 mx-auto"></div>
                          <div className="h-1 bg-white/10 rounded w-1/2 mx-auto"></div>
                        </div>

                        <div className="mt-12 text-white/60 text-xs text-center">
                          EMPLOYEE IDENTIFICATION
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE - Employee Details (Filled State) */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className={`rounded-xl overflow-hidden border-4 border-gray-200 dark:border-gray-700 relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-shadow duration-300 ${(() => {
                      const selectedRole = roles.find(r => r.id === formData.roleId)
                      const roleName = selectedRole?.name?.toLowerCase() || ''
                      if (roleName.includes('super')) return 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950'
                      if (roleName.includes('admin')) return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950'
                      return 'bg-white dark:bg-gray-900'
                    })()
                      }`}>
                      {/* 3D Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>

                      {/* Background Logo Watermark */}
                      <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none overflow-hidden">
                        <img
                          src="/Epsilologo.svg"
                          alt="Background Logo"
                          className="w-64 h-auto grayscale opacity-5"
                        />
                      </div>

                      {/* Lanyard Hole */}
                      <div className="flex justify-center pt-3 bg-[#F8F9FC] dark:bg-gray-800 relative z-10">
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-gray-400 dark:border-gray-500"></div>
                      </div>

                      {/* Header */}
                      <div className={`px-6 py-3 relative z-10 ${(() => {
                        const selectedRole = roles.find(r => r.id === formData.roleId)
                        const roleName = selectedRole?.name?.toLowerCase() || ''
                        if (roleName.includes('super')) return 'bg-gradient-to-r from-yellow-500 to-amber-500'
                        if (roleName.includes('admin')) return 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        return 'bg-[#2C7BE5]'
                      })()
                        }`}>
                        <div className="text-white text-xs font-bold tracking-wider">EMPLOYEE ID CARD</div>
                        <div className="text-white/70 text-[10px] mt-0.5">Epsilon Engineering Pvt. Ltd.</div>
                      </div>

                      {/* Photo & Details */}
                      <div className="p-5 relative z-10">
                        {/* Photo Section - Centered */}
                        <div className="flex justify-center mb-6">
                          <div className="relative">
                            {/* Main Photo - Round */}
                            <div className="w-32 h-32 rounded-full bg-[#2C7BE5] flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-[0_10px_30px_-5px_rgba(44,123,229,0.5)] overflow-hidden relative">
                              {/* 3D Highlight */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
                              {formData.fullName ? (
                                <div className="w-full h-full bg-[#2C7BE5] flex items-center justify-center relative z-10">
                                  <User className="w-20 h-20 text-white" />
                                </div>
                              ) : (
                                <User className="w-20 h-20 text-white/50 relative z-10" />
                              )}
                            </div>

                            {/* Role Badge - Bottom Right */}
                            <div className="absolute -bottom-1 -right-1 z-20">
                              {(() => {
                                const selectedRole = roles.find(r => r.id === formData.roleId)
                                const roleName = selectedRole?.name?.toLowerCase() || ''

                                if (roleName.includes('admin') || roleName.includes('super')) {
                                  return (
                                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                      <Shield className="w-5 h-5 text-white" />
                                    </div>
                                  )
                                } else if (roleName.includes('manager')) {
                                  return (
                                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                      <Briefcase className="w-5 h-5 text-white" />
                                    </div>
                                  )
                                } else if (roleName.includes('operator')) {
                                  return (
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                      <User className="w-5 h-5 text-white" />
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                      <UserPlus className="w-5 h-5 text-white" />
                                    </div>
                                  )
                                }
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Name */}
                        <div className="mb-4 pb-3 border-b-2 border-[#E3E6F0] dark:border-gray-700">
                          <div className="text-2xl font-bold text-[#12263F] dark:text-white leading-tight">
                            {formData.fullName || 'FULL NAME'}
                          </div>
                          <div className="text-xs text-[#95AAC9] mt-1">
                            {roles.find(r => r.id === formData.roleId)?.name || 'Position'}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-2 text-xs">
                          {formData.employeeCode && (
                            <div className="flex justify-between">
                              <span className="text-[#95AAC9] font-medium">ID Number:</span>
                              <span className="text-[#12263F] dark:text-white font-semibold">{formData.employeeCode}</span>
                            </div>
                          )}
                          {formData.department && (
                            <div className="flex justify-between">
                              <span className="text-[#95AAC9] font-medium">Department:</span>
                              <span className="text-[#12263F] dark:text-white font-semibold truncate ml-2">{formData.department}</span>
                            </div>
                          )}
                          {formData.email && (
                            <div className="flex justify-between items-start">
                              <span className="text-[#95AAC9] font-medium">Email:</span>
                              <span className="text-[#12263F] dark:text-white font-semibold text-right truncate ml-2 max-w-[60%]">{formData.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="mt-4 pt-3 border-t border-[#E3E6F0] dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-[#00A651] rounded-full"></div>
                              <span className="text-[10px] font-semibold text-[#00A651]">ACTIVE</span>
                            </div>
                            {formData.standaloneAttendance && (
                              <div className="text-[10px] font-semibold text-[#2C7BE5]">STANDALONE</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-[#F8F9FC] dark:bg-gray-800 px-4 py-2 border-t border-[#E3E6F0] dark:border-gray-700 relative z-10">
                        <div className="text-[9px] text-[#95AAC9] text-center">
                          This card remains property of Epsilon Engineering
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helper Text */}
              <div className="mt-4 text-center">
                <p className="text-xs text-[#95AAC9]">
                  {formData.fullName || formData.email ? '✓ Card flipped to show details' : 'Enter details to flip card'}
                </p>
              </div>
            </div>
          </div>

          <style jsx>{`
            .perspective-1000 {
              perspective: 1000px;
            }
            .transform-style-3d {
              transform-style: preserve-3d;
            }
            .backface-hidden {
              backface-visibility: hidden;
            }
            .rotate-y-180 {
              transform: rotateY(180deg);
            }
          `}</style>

          {/* RIGHT: Form Panel (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#E3E6F0] dark:border-gray-700 p-6 shadow-sm">
              <div className="space-y-6">
                {/* Account Section */}
                <div>
                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Account Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value })
                          if (manualFormErrors.fullName) {
                            setManualFormErrors(prev => {
                              const { fullName, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="John Doe"
                        className={`w-full px-3 py-2 border ${manualFormErrors.fullName ? 'border-red-500' : 'border-[#E3E6F0]'} dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {manualFormErrors.fullName && <p className="text-xs text-red-500 mt-1">{manualFormErrors.fullName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          if (manualFormErrors.email) {
                            setManualFormErrors(prev => {
                              const { email, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="john.doe@company.com"
                        className={`w-full px-3 py-2 border ${manualFormErrors.email ? 'border-red-500' : 'border-[#E3E6F0]'} dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {manualFormErrors.email && <p className="text-xs text-red-500 mt-1">{manualFormErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value })
                          if (manualFormErrors.password) {
                            setManualFormErrors(prev => {
                              const { password, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="Minimum 8 characters"
                        className={`w-full px-3 py-2 border ${manualFormErrors.password ? 'border-red-500' : 'border-[#E3E6F0]'} dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {manualFormErrors.password && <p className="text-xs text-red-500 mt-1">{manualFormErrors.password}</p>}
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
                          if (manualFormErrors.confirmPassword) {
                            setManualFormErrors(prev => {
                              const { confirmPassword, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        placeholder="Re-enter password"
                        className={`w-full px-3 py-2 border ${manualFormErrors.confirmPassword ? 'border-red-500' : 'border-[#E3E6F0]'} dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                      />
                      {manualFormErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{manualFormErrors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {/* Role Section */}
                <div className="pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Role & Permissions</h3>
                  <div>
                    <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                      User Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      className={`w-full px-3 py-2 border ${manualFormErrors.roleId ? 'border-red-500' : 'border-[#E3E6F0]'} dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                    >
                      <option value="">Select a role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    {manualFormErrors.roleId && <p className="text-xs text-red-500 mt-1">{manualFormErrors.roleId}</p>}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Additional Details (Optional)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Employee Code</label>
                      <input
                        type="text"
                        value={formData.employeeCode}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                        placeholder="EMP001"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="Engineering"
                        className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="flex items-start gap-3 p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.standaloneAttendance}
                        onChange={(e) => setFormData({ ...formData, standaloneAttendance: e.target.checked })}
                        className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[#12263F] dark:text-white">Enable Standalone Attendance Site</p>
                        <p className="text-xs text-[#95AAC9] mt-1">Allow user to access dedicated attendance website</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                      <input
                        type="checkbox"
                        checked={manualSendEmail}
                        onChange={(e) => setManualSendEmail(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#2C7BE5]" />
                          <p className="text-sm font-medium text-[#12263F] dark:text-white">Send Email Invitation</p>
                        </div>
                        <p className="text-xs text-[#95AAC9] mt-1">Send login credentials to user's email address after account creation</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.forcePasswordReset}
                        onChange={(e) => setFormData({ ...formData, forcePasswordReset: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-[#E3E6F0] text-[#2C7BE5] focus:ring-[#2C7BE5]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-[#2C7BE5]" />
                          <p className="text-sm font-medium text-[#12263F] dark:text-white">Require Password Change</p>
                        </div>
                        <p className="text-xs text-[#95AAC9] mt-1">User will be forced to reset their password upon first login</p>
                      </div>
                    </label>
                  </div>

                  {/* Shift Assignment Section - Modal (Synced to Manual) */}
                  <div className="mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                    <Dialog onOpenChange={(open) => {
                      if (open) fetchShiftTemplates()
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="p-0 h-auto text-sm font-medium text-[#2C7BE5] hover:text-[#2C7BE5] hover:bg-transparent flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          {assignmentData.templateId ? 'Shift Assignment Configured' : 'Assign Shift (Optional)'}
                          {assignmentData.templateId && <Check className="w-3 h-3 text-green-500 ml-1" />}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Assign Shift</DialogTitle>
                          <DialogDescription>
                            Select a shift template to assign to this user immediately.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Assignment Type</label>
                            <select
                              value={assignmentData.type}
                              onChange={(e) => setAssignmentData({ ...assignmentData, type: e.target.value })}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                              <option value="fixed">Fixed Shift</option>
                              <option value="rotation">Rotating Pattern</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Shift Template</label>
                            <select
                              value={assignmentData.templateId}
                              onChange={(e) => setAssignmentData({ ...assignmentData, templateId: e.target.value })}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              {shiftTemplates.length === 0 ? (
                                <option value="">No templates found</option>
                              ) : (
                                <>
                                  <option value="">Select a template</option>
                                  {shiftTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.start_time} - {t.end_time})</option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <input
                              type="date"
                              value={assignmentData.startDate}
                              onChange={(e) => setAssignmentData({ ...assignmentData, startDate: e.target.value })}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" onClick={() => setShowShiftAssignment(true)}>Save Assignment</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                  <button
                    onClick={() => router.push('/settings/users')}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded text-sm font-medium hover:bg-[#F8F9FC] dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateManual}
                    disabled={isCreating}
                    className={`flex-1 px-4 py-2 bg-[#00A651] text-white rounded text-sm font-medium hover:bg-[#008F46] transition-colors shadow-sm ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" />
                        Creating...
                      </>
                    ) : (
                      'Create User Account'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Selection View */}
      {activeMethod === 'employees' && !showEmployeeForm && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#E3E6F0] dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">Available Employees</h2>
              <p className="text-sm text-[#95AAC9] mt-1">Select an employee to create a user account</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 text-[#12263F] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2C7BE5] focus:border-[#2C7BE5] sm:text-sm"
                />
              </div>
              <button
                onClick={fetchEmployees}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C7BE5]"></div>
                <span className="ml-3 text-[#95AAC9]">Loading employees...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <User className="w-12 h-12 text-[#95AAC9] mx-auto mb-3" />
                <p className="text-[#95AAC9]">No employees found</p>
              </div>
            ) : employees.filter(emp =>
              emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              emp.code.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <User className="w-12 h-12 text-[#95AAC9] mx-auto mb-3" />
                <p className="text-[#95AAC9]">No employees match your search</p>
              </div>
            ) : (
              employees
                .filter(emp =>
                  emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  emp.code.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => handleSelectEmployee(employee)}
                    className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-lg p-6 hover:border-[#2C7BE5] hover:shadow-sm transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      ```
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2C7BE5] to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#12263F] dark:text-white truncate">{employee.name}</h3>
                        {employee.email && (
                          <p className="text-xs text-[#2C7BE5] truncate mb-0.5">{employee.email}</p>
                        )}
                        <p className="text-xs text-[#95AAC9] truncate flex items-center gap-1.5">
                          Code: {employee.code}
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          {employee.role}
                        </p>
                      </div>
                      {/* Activity Status Dot */}
                      <div className="flex-shrink-0 self-center pl-2">
                        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${(() => {
                          if (!employee.lastActive) return 'bg-gray-300 dark:bg-gray-600'

                          const daysAgo = (new Date().getTime() - new Date(employee.lastActive).getTime()) / (1000 * 3600 * 24)

                          if (daysAgo <= 30) return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                          if (daysAgo <= 60) return 'bg-green-400 opacity-80'
                          if (daysAgo <= 90) return 'bg-green-300 opacity-60'
                          return 'bg-gray-300 dark:bg-gray-600'
                        })()
                          }`} title={employee.lastActive ? `Last Active: ${new Date(employee.lastActive).toLocaleDateString()}` : 'No activity'}></div>
                      </div>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Employee Form - After Selection (Manual Entry Style) */}
      {activeMethod === 'employees' && showEmployeeForm && selectedEmployee && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#12263F] dark:text-white">Create Account for: {selectedEmployee.name}</h2>
            <button
              onClick={() => {
                setShowEmployeeForm(false)
                setSelectedEmployee(null)
                setEmployeeFormData({ email: '', password: '', confirmPassword: '', roleId: '', department: '', standaloneAttendance: false, avatarUrl: '', forcePasswordReset: false })
              }}
              className="text-sm text-[#2C7BE5] hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Employee Selection
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* LEFT: ID Card Preview (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <div className="flex items-center gap-2 text-xs font-medium text-[#95AAC9] mb-3">
                  <Eye className="w-4 h-4" />
                  Live Preview
                </div>

                {/* Lanyard Clip */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-8 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-t-lg shadow-md relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-gray-200 dark:bg-gray-500 rounded-full border-2 border-gray-400 dark:border-gray-600"></div>
                  </div>
                </div>

                {/* ID Card - Auto-flipped to show details */}
                <div
                  ref={cardRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="perspective-1000"
                >
                  <div
                    className="relative w-full transition-all duration-700 transform-style-3d rotate-y-180"
                    style={{
                      transform: `rotateX(${tilt.x}deg) rotateY(${180 + tilt.y}deg)`,
                      transition: 'transform 0.1s ease-out'
                    }}
                  >
                    {/* BACK SIDE - Employee Details */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <div className={`rounded-xl overflow-hidden border-4 border-gray-200 dark:border-gray-700 relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-shadow duration-300 ${(() => {
                        const selectedRole = roles.find(r => r.id === employeeFormData.roleId)
                        const roleName = selectedRole?.name?.toLowerCase() || ''
                        if (roleName.includes('super')) return 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950'
                        if (roleName.includes('admin')) return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950'
                        return 'bg-white dark:bg-gray-900'
                      })()
                        }`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>

                        <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none overflow-hidden">
                          <img
                            src="/Epsilologo.svg"
                            alt="Background Logo"
                            className="w-64 h-auto grayscale opacity-5"
                          />
                        </div>

                        <div className="flex justify-center pt-3 bg-[#F8F9FC] dark:bg-gray-800 relative z-10">
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-gray-400 dark:border-gray-500"></div>
                        </div>

                        <div className={`px-6 py-3 relative z-10 ${(() => {
                          const selectedRole = roles.find(r => r.id === employeeFormData.roleId)
                          const roleName = selectedRole?.name?.toLowerCase() || ''
                          if (roleName.includes('super')) return 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          if (roleName.includes('admin')) return 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          return 'bg-[#2C7BE5]'
                        })()
                          }`}>
                          <div className="text-white text-xs font-bold tracking-wider">EMPLOYEE ID CARD</div>
                          <div className="text-white/70 text-[10px] mt-0.5">Epsilon Engineering Pvt. Ltd.</div>
                        </div>

                        <div className="p-5 relative z-10">
                          <div className="flex justify-center mb-6">
                            <div className="relative">
                              <div className="w-32 h-32 rounded-full bg-[#2C7BE5] flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-[0_10px_30px_-5px_rgba(44,123,229,0.5)] overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none"></div>
                                <div className="w-full h-full bg-[#2C7BE5] flex items-center justify-center relative z-10 cursor-pointer group" onClick={handleCardClick}>
                                  {employeeFormData.avatarUrl ? (
                                    <img src={employeeFormData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-20 h-20 text-white" />
                                  )}

                                  {/* Upload Overlay */}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {uploading ? (
                                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    ) : (
                                      <Camera className="w-8 h-8 text-white" />
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                  />
                                </div>
                              </div>

                              <div className="absolute -bottom-1 -right-1 z-20">
                                {(() => {
                                  const selectedRole = roles.find(r => r.id === employeeFormData.roleId)
                                  const roleName = selectedRole?.name?.toLowerCase() || ''

                                  if (roleName.includes('admin') || roleName.includes('super')) {
                                    return (
                                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                        <Shield className="w-5 h-5 text-white" />
                                      </div>
                                    )
                                  } else if (roleName.includes('manager')) {
                                    return (
                                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                        <Briefcase className="w-5 h-5 text-white" />
                                      </div>
                                    )
                                  } else if (roleName.includes('operator')) {
                                    return (
                                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                        <User className="w-5 h-5 text-white" />
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                                        <UserPlus className="w-5 h-5 text-white" />
                                      </div>
                                    )
                                  }
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="mb-4 pb-3 border-b-2 border-[#E3E6F0] dark:border-gray-700">
                            <div className="text-2xl font-bold text-[#12263F] dark:text-white leading-tight">
                              {selectedEmployee.name}
                            </div>
                            <div className="text-xs text-[#95AAC9] mt-1">
                              {roles.find(r => r.id === employeeFormData.roleId)?.name || selectedEmployee.role}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#95AAC9] font-medium">ID Number:</span>
                              <span className="text-[#12263F] dark:text-white font-semibold">{selectedEmployee.code}</span>
                            </div>
                            {employeeFormData.department && (
                              <div className="flex justify-between">
                                <span className="text-[#95AAC9] font-medium">Department:</span>
                                <span className="text-[#12263F] dark:text-white font-semibold truncate ml-2">{employeeFormData.department}</span>
                              </div>
                            )}
                            {employeeFormData.email && (
                              <div className="flex justify-between items-start">
                                <span className="text-[#95AAC9] font-medium">Email:</span>
                                <span className="text-[#12263F] dark:text-white font-semibold text-right truncate ml-2 max-w-[60%]">{employeeFormData.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#E3E6F0] dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-[#00A651] rounded-full"></div>
                                <span className="text-[10px] font-semibold text-[#00A651]">ACTIVE</span>
                              </div>
                              {employeeFormData.standaloneAttendance && (
                                <div className="text-[10px] font-semibold text-[#2C7BE5]">STANDALONE</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#F8F9FC] dark:bg-gray-800 px-4 py-2 border-t border-[#E3E6F0] dark:border-gray-700 relative z-10">
                          <div className="text-[9px] text-[#95AAC9] text-center">
                            This card remains property of Epsilon Engineering
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-[#95AAC9]">
                    ✓ Card auto-filled with employee data
                  </p>
                </div>
              </div>
            </div>

            <style jsx>{`
              .perspective-1000 {
                perspective: 1000px;
              }
              .transform-style-3d {
                transform-style: preserve-3d;
              }
              .backface-hidden {
                backface-visibility: hidden;
              }
              .rotate-y-180 {
                transform: rotateY(180deg);
              }
            `}</style>

            {/* RIGHT: Form Panel (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#E3E6F0] dark:border-gray-700 p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Account Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Account Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={selectedEmployee.name}
                          disabled
                          className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-gray-100 dark:bg-gray-800 text-[#12263F] dark:text-white cursor-not-allowed"
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
                          placeholder="employee@company.com"
                          className={`w-full px-3 py-2 border ${employeeFormErrors.email ? 'border-red-500' : 'border-[#E3E6F0]'
                            } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                        />
                        {employeeFormErrors.email && (
                          <p className="text-xs text-red-500 mt-1">{employeeFormErrors.email}</p>
                        )}
                      </div>
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
                          className={`w-full px-3 py-2 border ${employeeFormErrors.password ? 'border-red-500' : 'border-[#E3E6F0]'
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
                          className={`w-full px-3 py-2 border ${employeeFormErrors.confirmPassword ? 'border-red-500' : 'border-[#E3E6F0]'
                            } dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]`}
                        />
                        {employeeFormErrors.confirmPassword && (
                          <p className="text-xs text-red-500 mt-1">{employeeFormErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Section */}
                  <div className="pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Role & Permissions</h3>
                    <div>
                      <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                        User Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={employeeFormData.roleId}
                        onChange={(e) => {
                          setEmployeeFormData({ ...employeeFormData, roleId: e.target.value })
                          if (employeeFormErrors.roleId) {
                            setEmployeeFormErrors(prev => {
                              const { roleId, ...rest } = prev
                              return rest
                            })
                          }
                        }}
                        className={`w-full px-3 py-2 border ${employeeFormErrors.roleId ? 'border-red-500' : 'border-[#E3E6F0]'
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
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-[#12263F] dark:text-white mb-4">Additional Details (Optional)</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Employee Code</label>
                        <input
                          type="text"
                          value={selectedEmployee.code}
                          disabled
                          className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-gray-100 dark:bg-gray-800 text-[#12263F] dark:text-white cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">Department</label>
                        <input
                          type="text"
                          value={employeeFormData.department}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}
                          placeholder="Engineering"
                          className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="flex items-start gap-3 p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={employeeFormData.standaloneAttendance}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, standaloneAttendance: e.target.checked })}
                          className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#12263F] dark:text-white">Enable Standalone Attendance Site</p>
                          <p className="text-xs text-[#95AAC9] mt-1">Allow user to access dedicated attendance website</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                        <input
                          type="checkbox"
                          checked={sendEmailInvitation}
                          onChange={(e) => setSendEmailInvitation(e.target.checked)}
                          className="mt-1 w-4 h-4 text-[#2C7BE5] border-gray-300 rounded focus:ring-[#2C7BE5]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#2C7BE5]" />
                            <p className="text-sm font-medium text-[#12263F] dark:text-white">Send Email Invitation</p>
                          </div>
                          <p className="text-xs text-[#95AAC9] mt-1">Send login credentials to user's email address after account creation</p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="flex items-start gap-3 p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={employeeFormData.forcePasswordReset}
                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, forcePasswordReset: e.target.checked })}
                          className="mt-1 h-4 w-4 rounded border-[#E3E6F0] text-[#2C7BE5] focus:ring-[#2C7BE5]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#2C7BE5]" />
                            <p className="text-sm font-medium text-[#12263F] dark:text-white">Require Password Change</p>
                          </div>
                          <p className="text-xs text-[#95AAC9] mt-1">User will be forced to reset their password upon first login</p>
                        </div>
                      </label>
                    </div>


                    {/* Shift Assignment Section - Modal */}
                    <div className="mt-6 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                      <Dialog onOpenChange={(open) => {
                        if (open) fetchShiftTemplates()
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="p-0 h-auto text-sm font-medium text-[#2C7BE5] hover:text-[#2C7BE5] hover:bg-transparent flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            {assignmentData.templateId ? 'Shift Assignment Configured' : 'Assign Shift (Optional)'}
                            {assignmentData.templateId && <Check className="w-3 h-3 text-green-500 ml-1" />}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Assign Shift</DialogTitle>
                            <DialogDescription>
                              Select a shift template to assign to this user immediately upon creation.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Assignment Type</label>
                              <select
                                value={assignmentData.type}
                                onChange={(e) => setAssignmentData({ ...assignmentData, type: e.target.value })}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="fixed">Fixed Shift</option>
                                <option value="rotation">Rotating Pattern</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Shift Template</label>
                              <select
                                value={assignmentData.templateId}
                                onChange={(e) => setAssignmentData({ ...assignmentData, templateId: e.target.value })}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                {shiftTemplates.length === 0 ? (
                                  <option value="">No templates found</option>
                                ) : (
                                  <>
                                    <option value="">Select a template</option>
                                    {shiftTemplates.map(t => (
                                      <option key={t.id} value={t.id}>{t.name} ({t.start_time} - {t.end_time})</option>
                                    ))}
                                  </>
                                )}
                              </select>
                              {shiftTemplates.length === 0 && (
                                <p className="text-xs text-red-500">
                                  No templates found. Please create one in <Link href="/shifts/templates" className="underline">Shift Manager</Link>.
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Start Date</label>
                              <input
                                type="date"
                                value={assignmentData.startDate}
                                onChange={(e) => setAssignmentData({ ...assignmentData, startDate: e.target.value })}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button type="button" onClick={() => setShowShiftAssignment(true)}>Save Assignment</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-[#E3E6F0] dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowEmployeeForm(false)
                        setSelectedEmployee(null)
                        setEmployeeFormData({ email: '', password: '', confirmPassword: '', roleId: '', department: '', standaloneAttendance: false, avatarUrl: '', forcePasswordReset: false })
                        setSendEmailInvitation(false)
                      }}
                      className="px-4 py-2 bg-white dark:bg-gray-800 text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded text-sm font-medium hover:bg-[#F8F9FC] dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateFromEmployee}
                      disabled={isCreating}
                      className={`flex-1 px-4 py-2 bg-[#00A651] text-white rounded text-sm font-medium hover:bg-[#008F46] transition-colors shadow-sm ${isCreating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      {isCreating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        'Create User Account'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
