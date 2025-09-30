"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/app/hooks/useAdmin"
import { useToast } from "@/hooks/use-toast"
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

// Editable Field Component
const EditableField = ({ label, value, placeholder, userId, field, className = '', onUpdate }: {
  label: string
  value: string
  placeholder: string
  userId: string
  field: string
  className?: string
  onUpdate: (value: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  // Update editValue when value prop changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/update-user-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          field,
          value: editValue.trim() || null
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onUpdate(editValue.trim())
        setIsEditing(false)
      } else {
        throw new Error(result.error || 'Failed to update')
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert(`Failed to update ${label}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setEditValue(value) // Reset to original value
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-gray-600">{label}:</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder={placeholder}
            disabled={isSaving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '...' : '✓'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center group">
      <span className="text-gray-600">{label}:</span>
      <div className="flex items-center gap-2">
        <span className={className || ''}>
          {value || placeholder}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 transition-opacity"
        >
          ✏️
        </button>
      </div>
    </div>
  )
}
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import ProtectedRoute from "@/app/components/protected-route"
import { useAuth } from "@/app/contexts/auth-context"
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  FileText,
  Wrench,
  User,
  UserPlus,
  UserX,
  ShieldCheck,
  KeyRound,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid,
  Save,
  Factory,
  Home,
  Cog,
  PlayCircle,
  MoreVertical,
  CheckCircle,
  XCircle,
  Calculator,
  Check,
  AlertTriangle,
  Loader2,
  Copy,
  Mail,
  LogOut,
  ExternalLink,
  Menu,
  Trash2
} from 'lucide-react'

type RoleProfileEntry = {
  id: string
  name: string
  description: string | null
  permissions: string[]
}

export default function MainDashboard() {
  const { toast } = useToast()
  
  // Initialize Supabase client
  const supabase = createClient(
    'https://sxnaopzgaddvziplrlbe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w'
  )
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [dashboardData, setDashboardData] = useState({
    activeOrders: 0,
    machinesRunning: 0,
    totalMachines: 10,
    utilizationRate: 0,
    onSchedule: 0,
    alerts: 0,
    alertDetails: '',
    statusCounts: {
      notStarted: 0,
      inProgress: 0,
      onHold: 0,
      completed: 0
    },
    machines: [],
    tasks: [] as any[],
    isLoading: false,
  })
  
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  
  // User management state
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userPermissionsData, setUserPermissionsData] = useState<any>(null)
  const [userPermissionsLoading, setUserPermissionsLoading] = useState(false)
  const [userListSearch, setUserListSearch] = useState('')
  const [roleFilters, setRoleFilters] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'disabled'>('all')
  const [showMyScopeOnly, setShowMyScopeOnly] = useState(false)
  const [currentUserPage, setCurrentUserPage] = useState(1)
  const [detailTab, setDetailTab] = useState<'overview' | 'roles' | 'scope' | 'activity' | 'security'>('overview')
  const [showSuccessPulse, setShowSuccessPulse] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [userPermissionChanges, setUserPermissionChanges] = useState<{[userId: string]: {[permission: string]: boolean}}>({})
  const [userRoleChanges, setUserRoleChanges] = useState<{[userId: string]: string}>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [passwordActionLoading, setPasswordActionLoading] = useState<null | 'generate' | 'set'>(null)
  const [passwordSectionMode, setPasswordSectionMode] = useState<'generate' | 'set' | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [customPasswordConfirm, setCustomPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const manualPasswordInputRef = useRef<HTMLInputElement | null>(null)
  const [userManagementSection, setUserManagementSection] = useState<'user-management' | 'add-user' | 'role-profiles' | 'attendance-sync' | 'activity-logging'>('user-management')
  
  // Raw attendance data state (for attendance section)
  const [rawAttendanceData, setRawAttendanceData] = useState<any>(null)
  const [rawLoading, setRawLoading] = useState(false)
  const [selectedAttendanceEmployee, setSelectedAttendanceEmployee] = useState<string | null>(null)
  
  // Historical data state
  const [historicalData, setHistoricalData] = useState<any>(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  
  // Personnel management state
  const [selectedPersonnelEmployee, setSelectedPersonnelEmployee] = useState<any>(null)
  const [employeeAttendance, setEmployeeAttendance] = useState<any>(null)
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // Activity Logging state
  const [allActivityLogs, setAllActivityLogs] = useState<any[]>([])
  const [filteredActivityLogs, setFilteredActivityLogs] = useState<any[]>([])
  const [allLogsLoading, setAllLogsLoading] = useState(false)
  const [activityStats, setActivityStats] = useState<any>(null)
  const [activityFilters, setActivityFilters] = useState({
    userId: '',
    action: '',
    fromDate: '',
    toDate: ''
  })
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'operator',
    customPermissions: [],
    notes: '',
    employee_code: '',
    department: '',
    designation: ''
  })
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('')
  
  // Employee selection state
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [showEmployeeSelection, setShowEmployeeSelection] = useState(true)
  const [userCreationMode, setUserCreationMode] = useState<'select' | 'manual'>('select') // Two options!

  // Attendance sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<any>(null)

  const pageSize = 5

  const roleBadgeVariants: Record<string, string> = {
    super_admin: 'bg-slate-900 text-white border border-slate-900',
    admin: 'bg-purple-100 text-purple-700 border border-purple-200',
    operator: 'bg-teal-100 text-teal-700 border border-teal-200',
    monitor: 'bg-blue-100 text-blue-700 border border-blue-200',
    attendance: 'bg-amber-100 text-amber-700 border border-amber-200'
  }

  const defaultRoleMetadata: Record<string, { label: string; description: string }> = {
    super_admin: {
      label: 'Super Admin',
      description: 'Full administrator access across every module.'
    },
    admin: {
      label: 'Admin',
      description: 'Operations leadership with scheduling, analytics, and user oversight.'
    },
    operator: {
      label: 'Operator',
      description: 'Production floor operator access to core scheduling tools.'
    },
    monitor: {
      label: 'Monitor',
      description: 'Analytics and monitoring only; no editing rights.'
    },
    attendance: {
      label: 'Attendance',
      description: 'Time & attendance tools only.'
    }
  }

  const cloneRolePermissionMap = (source: Record<string, string[]>): Record<string, string[]> => {
    const clone: Record<string, string[]> = {}
    Object.entries(source).forEach(([roleKey, permissions]) => {
      clone[roleKey] = [...permissions]
    })
    return clone
  }

  const arePermissionSetsEqual = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) return false
    const sortedA = [...a].sort()
    const sortedB = [...b].sort()
    return sortedA.every((permission, index) => permission === sortedB[index])
  }

  // Role profile editing helpers
  const toggleRoleEdit = (roleKey: string) => {
    setEditingRoles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roleKey)) {
        newSet.delete(roleKey)
        // Reset drafts to original when exiting edit mode
        setRoleProfilesDrafts(prev => ({
          ...prev,
          [roleKey]: [...roleProfilesOriginal[roleKey]]
        }))
        // Remove from dirty set
        setDirtyRoles(prev => {
          const newDirty = new Set(prev)
          newDirty.delete(roleKey)
          return newDirty
        })
      } else {
        newSet.add(roleKey)
      }
      return newSet
    })
  }

  const toggleRolePermission = (roleKey: string, permissionCode: string) => {
    setRoleProfilesDrafts(prev => {
      const currentPermissions = prev[roleKey] || []
      const newPermissions = currentPermissions.includes(permissionCode)
        ? currentPermissions.filter(p => p !== permissionCode)
        : [...currentPermissions, permissionCode]
      
      const updated = { ...prev, [roleKey]: newPermissions }
      
      // Update dirty state
      const isDirty = !arePermissionSetsEqual(newPermissions, roleProfilesOriginal[roleKey])
      setDirtyRoles(prev => {
        const newDirty = new Set(prev)
        if (isDirty) {
          newDirty.add(roleKey)
        } else {
          newDirty.delete(roleKey)
        }
        return newDirty
      })
      
      return updated
    })
  }

  const selectAllRolePermissions = (roleKey: string) => {
    const allPermissions = Object.keys(permissionDictionary)
    setRoleProfilesDrafts(prev => {
      const updated = { ...prev, [roleKey]: allPermissions }
      
      // Update dirty state
      const isDirty = !arePermissionSetsEqual(allPermissions, roleProfilesOriginal[roleKey])
      setDirtyRoles(prev => {
        const newDirty = new Set(prev)
        if (isDirty) {
          newDirty.add(roleKey)
        } else {
          newDirty.delete(roleKey)
        }
        return newDirty
      })
      
      return updated
    })
  }

  const clearAllRolePermissions = (roleKey: string) => {
    setRoleProfilesDrafts(prev => {
      const updated = { ...prev, [roleKey]: [] }
      
      // Update dirty state
      const isDirty = !arePermissionSetsEqual([], roleProfilesOriginal[roleKey])
      setDirtyRoles(prev => {
        const newDirty = new Set(prev)
        if (isDirty) {
          newDirty.add(roleKey)
        } else {
          newDirty.delete(roleKey)
        }
        return newDirty
      })
      
      return updated
    })
  }

  const resetRoleToDefaults = (roleKey: string) => {
    const defaultPermissions = defaultRolePermissions[roleKey] || []
    setRoleProfilesDrafts(prev => {
      const updated = { ...prev, [roleKey]: [...defaultPermissions] }
      
      // Update dirty state
      const isDirty = !arePermissionSetsEqual(defaultPermissions, roleProfilesOriginal[roleKey])
      setDirtyRoles(prev => {
        const newDirty = new Set(prev)
        if (isDirty) {
          newDirty.add(roleKey)
        } else {
          newDirty.delete(roleKey)
        }
        return newDirty
      })
      
      return updated
    })
  }

  const saveAllRoleProfiles = async () => {
    if (dirtyRoles.size === 0) return

    setSavingRoleProfiles(true)
    try {
      const response = await fetch('/api/admin/role-profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: Array.from(dirtyRoles).map(roleKey => ({
            roleKey,
            permissions: roleProfilesDrafts[roleKey]
          }))
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to save role profiles')
      }

      // Update original state to match drafts
      setRoleProfilesOriginal(prev => {
        const updated = { ...prev }
        dirtyRoles.forEach(roleKey => {
          updated[roleKey] = [...roleProfilesDrafts[roleKey]]
        })
        return updated
      })

      // Clear dirty and editing states
      setDirtyRoles(new Set())
      setEditingRoles(new Set())

      toast({
        title: 'Role Profiles Updated',
        description: `Successfully updated ${dirtyRoles.size} role(s).`,
      })

    } catch (error) {
      console.error('Error saving role profiles:', error)
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save role profile changes. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSavingRoleProfiles(false)
    }
  }

  const cancelAllRoleEdits = () => {
    // Reset all drafts to original
    setRoleProfilesDrafts({ ...roleProfilesOriginal })
    // Clear all editing and dirty states
    setEditingRoles(new Set())
    setDirtyRoles(new Set())
  }

  const loadRoleProfiles = async () => {
    try {
      const response = await fetch('/api/admin/role-profiles')
      const result = await response.json()

      if (result.success && result.data) {
        // Merge API data with fallback defaults
        const mergedProfiles = { ...defaultRolePermissions, ...result.data }
        setRoleProfilesOriginal(mergedProfiles)
        setRoleProfilesDrafts(mergedProfiles)
      }
    } catch (error) {
      console.error('Error loading role profiles:', error)
      // Fall back to default permissions if API fails
      setRoleProfilesOriginal(defaultRolePermissions)
      setRoleProfilesDrafts(defaultRolePermissions)
    }
  }

  const statusBadgeVariants: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    disabled: 'bg-slate-200 text-slate-600 border border-slate-200'
  }

  const permissionDictionary: Record<string, { label: string; group: string; description: string }> = {
    view_dashboard: {
      label: 'Dashboard',
      group: 'Main',
      description: 'Access the primary manufacturing overview dashboard.'
    },
    view_schedule: {
      label: 'Schedule Generator',
      group: 'Main',
      description: 'Open the smart schedule builder and adjust production timelines.'
    },
    view_schedule_dashboard: {
      label: 'Schedule Generator Dashboard',
      group: 'Main',
      description: 'Access the dedicated schedule generator dashboard page.'
    },
    view_machine_analyzer: {
      label: 'Chart',
      group: 'Main',
      description: 'Explore production charts and machine KPIs.'
    },
    view_reports: {
      label: 'Analytics',
      group: 'Main',
      description: 'Run analytics dashboards and export performance reports.'
    },
    attendance_read: {
      label: 'Attendance',
      group: 'Main',
      description: 'View attendance data and reports within the main system.'
    },
    standalone_attendance: {
      label: 'Standalone Attendance',
      group: 'Main',
      description: 'Access the dedicated attendance website with same credentials.'
    },
    edit_schedule: {
      label: 'Production (Coming Soon)',
      group: 'Production & Monitoring',
      description: 'Early toggle for upcoming production workflow screens.'
    },
    operate_machine: {
      label: 'Monitoring (Coming Soon)',
      group: 'Production & Monitoring',
      description: 'Early toggle for upcoming monitoring dashboards.'
    },
    manage_users: {
      label: 'Manage Users & Security',
      group: 'Admin',
      description: 'Create users, assign roles, view audit logs, and impersonate accounts.'
    }
  }

  const defaultRolePermissions: Record<string, string[]> = {
    super_admin: Object.keys(permissionDictionary),
    admin: ['view_dashboard', 'view_schedule', 'view_schedule_dashboard', 'view_machine_analyzer', 'view_reports', 'attendance_read', 'standalone_attendance', 'manage_users'],
    operator: ['view_dashboard', 'view_schedule', 'view_schedule_dashboard', 'view_machine_analyzer'],
    monitor: ['view_dashboard', 'view_machine_analyzer', 'view_reports'],
    attendance: ['attendance_read', 'standalone_attendance']
  }

  // Role Profiles editing state (initialized after defaultRolePermissions)
  const [roleProfilesOriginal, setRoleProfilesOriginal] = useState<Record<string, string[]>>(defaultRolePermissions)
  const [roleProfilesDrafts, setRoleProfilesDrafts] = useState<Record<string, string[]>>(defaultRolePermissions)
  const [editingRoles, setEditingRoles] = useState<Set<string>>(new Set())
  const [dirtyRoles, setDirtyRoles] = useState<Set<string>>(new Set())
  const [savingRoleProfiles, setSavingRoleProfiles] = useState(false)

  const goToSecurityTab = (focusManualField = false) => {
    setDetailTab('security')
    requestAnimationFrame(() => {
      if (focusManualField) {
        manualPasswordInputRef.current?.focus()
      }
    })
  }

  useEffect(() => {
    setTemporaryPassword('')
    setCustomPassword('')
    setCustomPasswordConfirm('')
    setPasswordError(null)
    setPasswordActionLoading(null)
  }, [selectedUser?.id])

  // Load role profiles on component mount
  useEffect(() => {
    if (activeSection === 'settings') {
      loadRoleProfiles()
    }
  }, [activeSection])

  const handleGeneratePassword = async () => {
    if (!selectedUser) return
    if (!isSuperAdmin()) {
      toast({
        title: 'Permission Denied',
        description: 'Only super admins can generate passwords.',
        variant: 'destructive'
      })
      return
    }

    const actorId = getCurrentUser()?.id || null
    goToSecurityTab()
    setPasswordSectionMode('generate')
    setTemporaryPassword('')
    setPasswordError(null)
    setPasswordActionLoading('generate')
    try {
      const response = await fetch('/api/admin/mock-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: 'generate',
          actorId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate password')
      }

      if (result.password) {
        setTemporaryPassword(result.password)
      }

      toast({
        title: 'Temporary password generated',
        description: 'Copy the password below and share it securely with the user.'
      })
    } catch (error: any) {
      console.error('Error generating password:', error)
      setPasswordError(error?.message || 'Failed to generate password')
    } finally {
      setPasswordActionLoading(null)
    }
  }

  const handleSetPassword = async () => {
    if (!selectedUser) return
    if (!isSuperAdmin()) {
      toast({
        title: 'Permission Denied',
        description: 'Only super admins can set passwords manually.',
        variant: 'destructive'
      })
      return
    }

    goToSecurityTab(true)
    setPasswordSectionMode('set')
    const trimmedPassword = customPassword.trim()
    const trimmedConfirm = customPasswordConfirm.trim()

    if (trimmedPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.')
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError('Passwords do not match.')
      return
    }

    const actorId = getCurrentUser()?.id || null

    setPasswordError(null)
    setPasswordActionLoading('set')

    try {
      const response = await fetch('/api/admin/mock-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: 'set',
          newPassword: trimmedPassword,
          actorId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to set password')
      }

      toast({
        title: 'Password updated',
        description: 'The user can now sign in with the new password.'
      })

      setCustomPassword('')
      setCustomPasswordConfirm('')
      setPasswordSectionMode(null)
    } catch (error: any) {
      console.error('Error setting password:', error)
      setPasswordError(error?.message || 'Failed to set password')
    } finally {
      setPasswordActionLoading(null)
    }
  }

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(temporaryPassword)
        toast({ title: 'Copied to clipboard' })
      }
    } catch (error) {
      console.error('Failed to copy password:', error)
      toast({ title: 'Copy failed', description: 'Copy the password manually.', variant: 'destructive' })
    }
  }

  const handleSendResetEmail = async () => {
    if (!selectedUser?.email) {
      toast({
        title: 'No email available',
        description: 'This user does not have a valid email address to send a reset link.',
        variant: 'destructive'
      })
      return
    }

    const email = selectedUser.email
    if (!email.includes('@')) {
      toast({
        title: 'Invalid email address',
        description: 'This looks like a placeholder email. Generate a temporary password instead.',
        variant: 'destructive'
      })
      return
    }

    setSendingResetEmail(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth?reset=true` : undefined
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Reset email sent',
        description: `Password reset instructions were emailed to ${email}.`
      })
    } catch (error: any) {
      console.error('Error sending reset email:', error)
      toast({
        title: 'Failed to send reset email',
        description: error?.message || 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setSendingResetEmail(false)
    }
  }

  const handleDeleteUser = async (user: any) => {
    if (!user) return
    
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `⚠️ DANGER: Delete Account\n\n` +
      `This will permanently delete the account for:\n` +
      `• Name: ${user.full_name || 'Unknown'}\n` +
      `• Email: ${user.email}\n` +
      `• Role: ${user.role?.name || 'No Role'}\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "DELETE" to confirm deletion:`
    )
    
    if (!confirmDelete) return
    
    // Additional confirmation
    const confirmText = window.prompt(
      `Final confirmation required.\n\nType "DELETE" exactly to proceed with deleting ${user.full_name || user.email}:`
    )
    
    if (confirmText !== 'DELETE') {
      toast({
        title: 'Deletion cancelled',
        description: 'Account deletion was cancelled.',
        variant: 'default'
      })
      return
    }

    try {
      console.log('🗑️ Deleting user account:', user.id)
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.full_name,
          actorId: getCurrentUser()?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast({
        title: '✅ Account Deleted',
        description: `${user.full_name || user.email} has been permanently deleted.`,
        variant: 'default'
      })

      // Clear selected user and refresh user list
      setSelectedUser(null)
      await fetchUserPermissions() // Refresh the user list

      console.log('✅ User deleted successfully:', result)

    } catch (error: any) {
      console.error('❌ Error deleting user:', error)
      toast({
        title: 'Failed to delete account',
        description: error?.message || 'Please try again later.',
        variant: 'destructive'
      })
    }
  }

  // Activity Logging functions
  const fetchAllActivityLogs = async () => {
    setAllLogsLoading(true)
    try {
      console.log('🔍 Fetching all activity logs...')
      
      const response = await fetch('/api/admin/all-activity-logs')
      const result = await response.json()

      if (result.success) {
        setAllActivityLogs(result.logs || [])
        setFilteredActivityLogs(result.logs || [])
        setActivityStats(result.stats || {})
        console.log('✅ Activity logs loaded:', result.logs?.length || 0)
      } else {
        throw new Error(result.error || 'Failed to fetch activity logs')
      }
    } catch (error: any) {
      console.error('❌ Error fetching activity logs:', error)
      toast({
        title: 'Failed to load activity logs',
        description: error?.message || 'Please try again later.',
        variant: 'destructive'
      })
    } finally {
      setAllLogsLoading(false)
    }
  }

  const applyActivityFilters = () => {
    let filtered = [...allActivityLogs]

    // Filter by user
    if (activityFilters.userId) {
      filtered = filtered.filter(log => 
        log.user_id === activityFilters.userId || 
        log.target_user_id === activityFilters.userId
      )
    }

    // Filter by action
    if (activityFilters.action) {
      filtered = filtered.filter(log => log.action === activityFilters.action)
    }

    // Filter by date range
    if (activityFilters.fromDate) {
      const fromDate = new Date(activityFilters.fromDate)
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate)
    }

    if (activityFilters.toDate) {
      const toDate = new Date(activityFilters.toDate)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate)
    }

    setFilteredActivityLogs(filtered)
    
    toast({
      title: 'Filters Applied',
      description: `Showing ${filtered.length} of ${allActivityLogs.length} activities`,
      variant: 'default'
    })
  }

  const exportActivityLogs = () => {
    try {
      const csvContent = [
        // Header
        ['Timestamp', 'Action', 'User', 'Target User', 'Description', 'IP Address'].join(','),
        // Data rows
        ...filteredActivityLogs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.action,
          log.actor?.full_name || log.actor?.email || 'System',
          log.target_user?.full_name || log.target_user?.email || '',
          log.description || '',
          log.ip || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export Complete',
        description: `Exported ${filteredActivityLogs.length} activity logs to CSV`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export activity logs',
        variant: 'destructive'
      })
    }
  }

  // Load activity logs when Activity Logging section is opened
  useEffect(() => {
    if (userManagementSection === 'activity-logging' && allActivityLogs.length === 0) {
      fetchAllActivityLogs()
    }
  }, [userManagementSection])

  const permissionDependencies: Record<string, { grant?: string[]; revoke?: string[] }> = {
    manage_users: {
      grant: ['assign_roles', 'view_audit_logs', 'impersonate_user'],
      revoke: ['assign_roles', 'view_audit_logs', 'impersonate_user']
    },
    attendance_read: {
      revoke: ['attendance_mark']
    }
  }

  const auxiliaryPermissionDetails: Record<string, { label: string; description: string }> = {
    assign_roles: {
      label: 'Assign Roles',
      description: 'Modify role assignments for any user.'
    },
    impersonate_user: {
      label: 'Impersonate User',
      description: 'Temporarily impersonate another account.'
    },
    view_audit_logs: {
      label: 'View Audit Logs',
      description: 'Read detailed audit trails.'
    },
    attendance_mark: {
      label: 'Attendance Write',
      description: 'Apply manual attendance overrides.'
    }
  }

  const USER_STATUS_ACTIVE = 'active'
  const USER_STATUS_PENDING = 'pending'
  const USER_STATUS_DISABLED = 'disabled'

  const USER_ROLE_SUPER_ADMIN = 'super_admin'
  const USER_ROLE_ADMIN = 'admin'
  const USER_ROLE_OPERATOR = 'operator'
  const USER_ROLE_MONITOR = 'monitor'
  const USER_ROLE_ATTENDANCE = 'attendance'

  // Helpers: derive display name and initials from email (requested behavior)
  const getDisplayName = (u: any) => {
    const email = u?.email || ''
    const prefix = email.split('@')[0] || ''
    if (!prefix) return u?.full_name || 'User'
    // If contains a digit, keep as-is (e.g., mr1398463)
    if (/\d/.test(prefix)) return prefix
    // Otherwise capitalize first letter only (e.g., admin -> Admin)
    return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase()
  }

  const getInitials = (u: any) => {
    const email = u?.email || ''
    const prefix = email.split('@')[0] || ''
    const cleaned = prefix.replace(/[^A-Za-z0-9]/g, '')
    const initials = (cleaned.slice(0, 2) || 'U').toUpperCase()
    return initials.length === 1 ? initials + 'U' : initials
  }

  // Fetch user permissions data
  const fetchUserPermissions = async () => {
    try {
      setUserPermissionsLoading(true)
      
      // Call the real API instead of using mock data
      const response = await fetch('/api/admin/user-permissions', {
        cache: 'no-store', // Force fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch user permissions')
      }
      
      const data = await response.json()
      console.log('Real API data:', data)
      console.log('Total users received:', data.users?.length)
      console.log('Users list:', data.users?.map((u: any) => ({ email: u.email, role: u.role?.name })))
      
      // Transform the data to match our UI expectations
      const transformedData = {
        users: data.users.map((user: any) => ({
          ...user,
          status: user.status || 'active',
          lastActive: user.updated_at || user.created_at,
          lastLogin: user.updated_at || user.created_at,
          createdAt: user.created_at,
          phone: user.phone || null,
          scope: {
            plants: user.scope?.plants || [],
            departments: user.scope?.departments || [],
            machineGroups: user.scope?.machineGroups || []
          },
          auditEvents: user.auditEvents || [
            { action: "User created", timestamp: user.created_at, actor: "system", ip: "127.0.0.1" }
          ],
          overrides: user.overrides || []
        })),
        availableRoles: data.availableRoles || [],
        availablePermissions: data.availablePermissions || []
      }
      
      setUserPermissionsData(transformedData)
      console.log('Successfully set user data from API')
      return // Exit here if API call was successful
      
      // Fallback to mock data if API fails (temporary solution)
      const mockData = {
        users: [
          {
            id: "bdbcaa43-f84b-48fa-9eac-3f98b02ebbe5",
            email: "admin@example.com",
            full_name: "Adeline Hart",
            role: { name: "super_admin", description: "Full access, can manage users/roles/impersonation" },
            status: "active",
            avatar: "/avatars/admin.png",
            lastActive: "2025-09-26T21:05:00Z",
            lastLogin: "2025-09-26T21:00:00Z",
            phone: "+1 555-0101",
            createdAt: "2024-01-12T10:15:00Z",
            createdBy: "system",
            scope: {
              plants: ["HQ"],
              departments: ["Operations", "Finance"],
              machineGroups: ["All"]
            },
            auditEvents: [
              { action: "Role updated", timestamp: "2025-09-22T14:12:00Z", actor: "admin@example.com", ip: "192.168.1.10" },
              { action: "User impersonated", timestamp: "2025-09-21T09:47:00Z", actor: "admin@example.com", ip: "192.168.1.10" }
            ],
            overrides: [],
            permissions: [
              { code: "view_dashboard", description: "View main dashboard" },
              { code: "view_schedule", description: "View scheduler" },
              { code: "edit_schedule", description: "Edit scheduler" },
              { code: "view_machine_analyzer", description: "View machine analyzer" },
              { code: "operate_machine", description: "Perform machine operations" },
              { code: "view_reports", description: "View reports" },
              { code: "manage_users", description: "Create/update/deactivate users" },
              { code: "assign_roles", description: "Assign roles and permissions" },
              { code: "impersonate_user", description: "Impersonate another user" },
              { code: "view_audit_logs", description: "View audit logs" },
              { code: "attendance_read", description: "Read attendance" },
              { code: "attendance_mark", description: "Mark attendance" }
            ]
          },
          {
            id: "4af4876d-9339-4060-9d4c-9bc8b4953483",
            email: "admin@hello.com",
            full_name: "Mika Sorensen",
            role: { name: "super_admin", description: "Full access, can manage users/roles/impersonation" },
            status: "active",
            avatar: "/avatars/mika.png",
            lastActive: "2025-09-26T18:42:00Z",
            lastLogin: "2025-09-26T18:40:00Z",
            phone: "+1 555-0102",
            createdAt: "2024-02-04T08:00:00Z",
            createdBy: "admin@example.com",
            scope: {
              plants: ["HQ", "Plant 2"],
              departments: ["Operations"],
              machineGroups: ["CNC", "Assembly"]
            },
            auditEvents: [
              { action: "Password reset", timestamp: "2025-09-20T16:30:00Z", actor: "admin@example.com", ip: "192.168.1.12" }
            ],
            overrides: [
              { code: "attendance_mark", type: "grant" }
            ],
            permissions: [
              { code: "view_dashboard", description: "View main dashboard" },
              { code: "manage_users", description: "Create/update/deactivate users" },
              { code: "assign_roles", description: "Assign roles and permissions" },
              { code: "view_audit_logs", description: "View audit logs" }
            ]
          },
          {
            id: "e86467e3-25aa-4025-9c7c-67a99372899b",
            email: "mr1398463@gmail.com",
            full_name: "Ravi Munir",
            role: { name: "admin", description: "Admin within scope; cannot modify super_admin" },
            status: "active",
            avatar: "/avatars/ravi.png",
            lastActive: "2025-09-25T15:05:00Z",
            lastLogin: "2025-09-25T14:55:00Z",
            phone: "+1 555-0110",
            createdAt: "2024-05-17T11:30:00Z",
            createdBy: "admin@example.com",
            scope: {
              plants: ["Plant 1"],
              departments: ["Scheduling"],
              machineGroups: ["Laser", "CNC"]
            },
            auditEvents: [
              { action: "Role updated", timestamp: "2025-08-18T10:02:00Z", actor: "admin@example.com", ip: "192.168.1.15" }
            ],
            overrides: [],
            permissions: [
              { code: "view_dashboard", description: "View main dashboard" },
              { code: "view_schedule", description: "View scheduler" },
              { code: "edit_schedule", description: "Edit scheduler" },
              { code: "manage_users", description: "Create/update/deactivate users" }
            ]
          },
          {
            id: "a4875a5a-f43a-4f2e-adce-2ee3af468771",
            email: "operator@example.com",
            full_name: "Jeanette Mills",
            role: { name: "operator", description: "Operate and edit scheduler within scope" },
            status: "active",
            avatar: "/avatars/jeanette.png",
            lastActive: "2025-09-26T13:30:00Z",
            lastLogin: "2025-09-26T13:25:00Z",
            phone: "+1 555-0115",
            createdAt: "2024-08-09T09:20:00Z",
            createdBy: "mr1398463@gmail.com",
            scope: {
              plants: ["Plant 1"],
              departments: ["Shop Floor"],
              machineGroups: ["Laser"]
            },
            auditEvents: [
              { action: "Override granted: operate_machine", timestamp: "2025-07-02T12:44:00Z", actor: "mr1398463@gmail.com", ip: "192.168.1.18" }
            ],
            overrides: [
              { code: "operate_machine", type: "grant" }
            ],
            permissions: [
              { code: "view_schedule", description: "View scheduler" },
              { code: "edit_schedule", description: "Edit scheduler" },
              { code: "view_machine_analyzer", description: "View machine analyzer" },
              { code: "operate_machine", description: "Perform machine operations" }
            ]
          },
          {
            id: "00cf5142-2eba-4752-9cba-81135dda3ca8",
            email: "test@example.com",
            full_name: "Sasha Lee",
            role: { name: "monitor", description: "Read-only access across allowed scope" },
            status: "pending",
            avatar: "/avatars/sasha.png",
            lastActive: null,
            lastLogin: null,
            phone: null,
            createdAt: "2025-09-20T17:50:00Z",
            createdBy: "admin@example.com",
            scope: {
              plants: ["Plant 3"],
              departments: ["Quality"],
              machineGroups: []
            },
            auditEvents: [
              { action: "Invite sent", timestamp: "2025-09-20T17:50:00Z", actor: "admin@example.com", ip: "192.168.1.10" }
            ],
            overrides: [],
            permissions: [
              { code: "view_dashboard", description: "View main dashboard" },
              { code: "view_schedule", description: "View scheduler" },
              { code: "view_machine_analyzer", description: "View machine analyzer" },
              { code: "view_reports", description: "View reports" }
            ]
          }
        ],
        availableRoles: [
          { id: "3a4677e5-b31b-465f-84c4-44d738b678b4", name: "super_admin", description: "Full access, can manage users/roles/impersonation" },
          { id: "fc0724ee-d98e-48bf-af5e-673c2a915deb", name: "admin", description: "Admin within scope; cannot modify super_admin" },
          { id: "b98dc2d7-3562-41b8-823f-5272a020c0e0", name: "operator", description: "Operate and edit scheduler within scope" },
          { id: "51d3173d-cf1e-464a-8cd1-0c04702c98c6", name: "monitor", description: "Read-only access across allowed scope" },
          { id: "66468915-f065-4612-9224-43b3754533c2", name: "attendance", description: "Attendance-only" }
        ],
        availablePermissions: [
          { code: "view_dashboard", description: "View main dashboard" },
          { code: "view_schedule", description: "View scheduler" },
          { code: "edit_schedule", description: "Edit scheduler" },
          { code: "view_machine_analyzer", description: "View machine analyzer" },
          { code: "operate_machine", description: "Perform machine operations" },
          { code: "view_reports", description: "View reports" },
          { code: "manage_users", description: "Create/update/deactivate users" },
          { code: "assign_roles", description: "Assign roles and permissions" },
          { code: "impersonate_user", description: "Impersonate another user" },
          { code: "view_audit_logs", description: "View audit logs" },
          { code: "attendance_read", description: "Read attendance" },
          { code: "attendance_mark", description: "Mark attendance" }
        ]
      }
      
      setUserPermissionsData(mockData)
    } catch (error) {
      console.error('Error fetching user permissions:', error)
      
      // Fallback to mock data if API fails
      const mockData = {
        users: [
          {
            id: "bdbcaa43-f84b-48fa-9eac-3f98b02ebbe5",
            email: "admin@example.com",
            full_name: "Admin User",
            role: { id: "3a4677e5-b31b-465f-84c4-44d738b678b4", name: "super_admin", description: "Full access, can manage users/roles/impersonation" },
            status: "active",
            lastActive: "2025-09-26T21:05:00Z",
            lastLogin: "2025-09-26T21:00:00Z",
            createdAt: "2024-01-12T10:15:00Z",
            phone: "+1 555-0101",
            scope: { plants: ["HQ"], departments: ["Operations"], machineGroups: ["All"] },
            auditEvents: [{ action: "Login", timestamp: "2025-09-26T21:00:00Z", actor: "admin@example.com", ip: "192.168.1.1" }],
            overrides: [],
            permissions: [
              { code: "view_dashboard", description: "View main dashboard" },
              { code: "manage_users", description: "Create/update/deactivate users" },
              { code: "assign_roles", description: "Assign roles and permissions" }
            ]
          }
        ],
        availableRoles: [
          { id: "3a4677e5-b31b-465f-84c4-44d738b678b4", name: "super_admin", description: "Full access, can manage users/roles/impersonation" },
          { id: "fc0724ee-d98e-48bf-af5e-673c2a915deb", name: "admin", description: "Admin within scope; cannot modify super_admin" },
          { id: "b98dc2d7-3562-41b8-823f-5272a020c0e0", name: "operator", description: "Operate and edit scheduler within scope" }
        ],
        availablePermissions: [
          { id: "511be40d-d190-45f2-97ee-39aca4e352e5", code: "view_dashboard", description: "View main dashboard" },
          { id: "431078b6-56e1-415f-8ef2-a7d7636150b1", code: "manage_users", description: "Create/update/deactivate users" },
          { id: "e5036fa1-63e7-4be2-a5eb-d6fcc70caff3", code: "assign_roles", description: "Assign roles and permissions" }
        ]
      }
      setUserPermissionsData(mockData)
      
      toast({
        title: "Warning",
        description: "Using offline data. Some features may not work properly.",
        variant: "destructive",
      })
    } finally {
      setUserPermissionsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserPermissions()
  }, [])

  // Fetch audit logs for selected user
  const fetchUserAuditLogs = async (userId: string) => {
    try {
      console.log('fetchUserAuditLogs called with userId:', userId)
      setAuditLogsLoading(true)
      
      const url = `/api/admin/audit-logs?userId=${userId}`
      console.log('Fetching from URL:', url)
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error('Failed to fetch audit logs')
      }
      
      const data = await response.json()
      console.log('Audit logs data received:', data)
      console.log('Number of audit logs:', data.auditLogs?.length || 0)
      
      setUserAuditLogs(data.auditLogs || [])
      console.log('UserAuditLogs state updated')
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setUserAuditLogs([])
    } finally {
      setAuditLogsLoading(false)
    }
  }

  // Fetch audit logs when user is selected or tab changes to activity
  useEffect(() => {
    console.log('Activity tab useEffect triggered:', { 
      hasSelectedUser: !!selectedUser, 
      detailTab, 
      userId: selectedUser?.id 
    })
    if (selectedUser && detailTab === 'activity') {
      console.log('Fetching audit logs for user:', selectedUser.id)
      fetchUserAuditLogs(selectedUser.id)
    }
  }, [selectedUser?.id, detailTab])

  // Attendance sync functions
  const performManualSync = async (syncType: 'manual' | 'historical' = 'manual', dateFrom?: string, dateTo?: string) => {
    setSyncStatus('syncing')
    setSyncMessage('Initiating sync request...')
    
    try {
      const response = await fetch('/api/admin/sync-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType,
          dateFrom,
          dateTo,
          requestedBy: userEmail || 'admin'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSyncStatus('success')
        setSyncMessage(`${syncType} sync request created successfully`)
        setLastSyncTime(new Date().toLocaleString())
        
        // Poll for completion
        setTimeout(() => checkSyncStatus(result.syncRequest.id), 2000)
      } else {
        throw new Error(result.error || 'Sync request failed')
      }
    } catch (error) {
      setSyncStatus('error')
      setSyncMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const checkSyncStatus = async (requestId: string) => {
    try {
      const response = await fetch(`/api/admin/sync-attendance?requestId=${requestId}`)
      const result = await response.json()

      if (result.success && result.syncRequest) {
        const request = result.syncRequest
        if (request.status === 'completed') {
          setSyncStatus('success')
          setSyncMessage(`Sync completed! ${request.logs_synced || 0} logs processed`)
        } else if (request.status === 'failed') {
          setSyncStatus('error')
          setSyncMessage(`Sync failed: ${request.error_message || 'Unknown error'}`)
        } else {
          // Still running, check again
          setTimeout(() => checkSyncStatus(requestId), 3000)
        }
      }
    } catch (error) {
      console.error('Error checking sync status:', error)
    }
  }

  const fetchAttendanceStats = async () => {
    try {
      const response = await fetch('/api/admin/attendance-dashboard')
      const result = await response.json()

      if (result.success) {
        setAttendanceStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
    }
  }

  // Fetch attendance stats when settings section is active
  useEffect(() => {
    if (activeSection === 'settings') {
      fetchAttendanceStats()
    }
  }, [activeSection])

  // Handle permission toggle
  const handlePermissionToggle = (userId: string, permissionCode: string, hasPermission: boolean) => {
    setUserPermissionChanges(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [permissionCode]: hasPermission
      }
    }))

    // Update the selected user's permissions in real-time for UI feedback
    if (selectedUser && selectedUser.id === userId) {
      const updatedPermissions = [...(selectedUser.permissions || [])]
      
      if (hasPermission) {
        // Add permission if it doesn't exist
        if (!updatedPermissions.some(p => p.code === permissionCode)) {
          updatedPermissions.push({ code: permissionCode, description: `Access to ${permissionCode}` })
        }
      } else {
        // Remove permission
        const index = updatedPermissions.findIndex(p => p.code === permissionCode)
        if (index > -1) {
          updatedPermissions.splice(index, 1)
        }
      }
      
      setSelectedUser({
        ...selectedUser,
        permissions: updatedPermissions
      })
    }
  }

  // Save user permissions to Supabase
  const saveUserPermissions = async (userId: string) => {
    try {
      setSavingPermissions(true)
      
      const changes = userPermissionChanges[userId]
      if (!changes) {
        console.log('No changes to save')
        return
      }

      const actorId = getCurrentUser()?.id || null

      // FIXED: Send ALL currently checked permissions, not just changes
      const grantedPermissions: string[] = []
      
      // Get all permissions that are currently checked in the UI
      Object.entries(permissionDictionary).forEach(([permissionCode, _]) => {
        const isCurrentlyChecked = selectedUser?.permissions?.some((p: any) => p.code === permissionCode)
        if (isCurrentlyChecked) {
          grantedPermissions.push(permissionCode)
        }
      })

      // Get permission IDs from available permissions
      const availablePermissions = userPermissionsData?.availablePermissions || []
      const grantedPermissionIds = grantedPermissions
        .map(code => availablePermissions.find((p: any) => p.code === code)?.id)
        .filter(Boolean)

      // Call API to update user permissions
      const response = await fetch('/api/admin/modify-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          customPermissions: grantedPermissionIds,
          actorId
        })
      })

      if (response.ok) {
        // Clear changes for this user
        setUserPermissionChanges(prev => {
          const updated = { ...prev }
          delete updated[userId]
          return updated
        })
        
        // Show success message
        toast({
          title: "Success",
          description: "Permissions updated successfully",
        })
        
        // Refresh user data
        await fetchUserPermissions()
        
        // Refresh audit logs if we're on the activity tab
        if (detailTab === 'activity' && selectedUser) {
          await fetchUserAuditLogs(selectedUser.id)
        }
      } else {
        throw new Error('Failed to update permissions')
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      })
    } finally {
      setSavingPermissions(false)
    }
  }

  // Handle role change
  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setSavingPermissions(true)
      
      console.log('Changing role for user:', userId, 'to role:', newRoleId)

      const actorId = getCurrentUser()?.id || null

      const response = await fetch('/api/admin/modify-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          roleId: newRoleId,
          actorId
        })
      })

      const result = await response.json()
      console.log('Role change response:', result)

      if (response.ok) {
        toast({
          title: "Success",
          description: "User role updated successfully",
        })
        
        // Update local state immediately for UI feedback
        if (selectedUser && selectedUser.id === userId) {
          const newRole = userPermissionsData?.availableRoles?.find((r: any) => r.id === newRoleId)
          if (newRole) {
            setSelectedUser({
              ...selectedUser,
              role: newRole
            })
            
            // Also update the user in the main list
            setUserPermissionsData((prev: any) => ({
              ...prev,
              users: prev.users.map((user: any) => 
                user.id === userId ? { ...user, role: newRole } : user
              )
            }))
          }
        }
        
        // Refresh user data to get updated permissions
        await fetchUserPermissions()
        
        // Refresh audit logs if we're on the activity tab
        if (detailTab === 'activity') {
          await fetchUserAuditLogs(userId)
        }
      } else {
        throw new Error(result.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: "Error",
        description: `Failed to update user role: ${error}`,
        variant: "destructive",
      })
    } finally {
      setSavingPermissions(false)
    }
  }
  
  const { userEmail, logout } = useAuth()
  const router = useRouter()

  const getCurrentUser = () => {
    if (!userEmail || !userPermissionsData?.users) return null
    return userPermissionsData.users.find((user: any) => user.email === userEmail) || null
  }

  const getCurrentUserPermissions = () => {
    const currentUser = getCurrentUser()
    return currentUser?.permissions || []
  }

  const isSuperAdmin = () => {
    if (userEmail?.toLowerCase() === 'admin@example.com') {
      return true
    }
    const currentUser = getCurrentUser()
    const roleName = currentUser?.role?.name || currentUser?.role?.toLowerCase?.()
    return roleName?.toLowerCase() === 'super_admin'
  }

  // Check if user has specific permission
  const hasPermission = (permissionCode: string | null) => {
    if (permissionCode === null) return true
    if (isSuperAdmin()) return true
    
    // SECURITY FIX: Don't grant access by default when data is loading
    if (userPermissionsLoading || !userPermissionsData) return false
    
    const permissions = getCurrentUserPermissions()
    return permissions.some((p: any) => p.code === permissionCode)
  }

  // Get allowed navigation sections based on permissions
  const getAllowedSections = () => {
    const sections: string[] = []

    // Super admin gets everything
    if (isSuperAdmin()) {
      return [
        'dashboard',
        'scheduler',
        'chart',
        'analytics',
        'attendance',
        'orders',
        'machines',
        'personnel',
        'tasks',
        'alerts',
        'reports',
        'quality',
        'maintenance',
        'settings',
        'account',
        'logout'
      ]
    }

    // SECURITY FIX: When loading or no data, return minimal access
    if (userPermissionsLoading || !userPermissionsData) {
      return ['account', 'logout'] // Only allow account and logout when data is not available
    }
    if (hasPermission('view_dashboard')) {
      sections.push('dashboard')
    }
    if (hasPermission('view_schedule_dashboard')) {
      sections.push('scheduler')
    }
    if (hasPermission('view_reports')) {
      sections.push('analytics', 'reports')
    }
    if (hasPermission('attendance_read') || hasPermission('attendance_mark')) {
      sections.push('attendance')
    }
    if (hasPermission('view_machine_analyzer')) {
      sections.push('chart', 'quality')
    }
    if (hasPermission('manage_users')) {
      sections.push('settings', 'personnel')
    }

    // Always allow account section
    sections.push('account')

    return Array.from(new Set(sections))
  }

  // Redirect to first allowed section on login
  useEffect(() => {
    if (userEmail && userPermissionsData) {
      const allowedSections = getAllowedSections()
      
      // If current section is not allowed, redirect to first allowed section
      if (allowedSections.length > 0 && !allowedSections.includes(activeSection)) {
        setActiveSection(allowedSections[0])
      }
    }
  }, [userEmail, userPermissionsData, activeSection])
  
  // Admin hook for settings management
  const {
    users,
    roles,
    permissions,
    auditLogs,
    loading: adminLoading,
    error: adminError,
    fetchUsers,
    fetchRoles,
    fetchAuditLogs,
    createUser,
    updateUser,
    deactivateUser,
    generateTempPassword,
    clearError
  } = useAdmin()

  // Load attendance data
  const loadAttendanceData = async () => {
    try {
      setAttendanceLoading(true)
      const response = await fetch('/api/get-attendance?dateRange=today')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAttendanceData(result.data)
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  // Sync attendance data from SmartOffice using Supabase Edge Function
  const syncAttendanceData = async () => {
    try {
      setAttendanceLoading(true)
      
      console.log('🚀 Starting manual sync via Supabase Edge Function...')
      
      // Call Supabase Edge Function for manual sync
      const edgeFunctionResponse = await fetch('https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/manual-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncType: 'attendance' })
      })
      
      if (!edgeFunctionResponse.ok) {
        throw new Error(`Edge Function error: ${edgeFunctionResponse.status}`)
      }
      
      const edgeResult = await edgeFunctionResponse.json()
      console.log('Edge Function result:', edgeResult)
      
      if (edgeResult.success) {
        // Wait for sync to complete (poll for status)
        await waitForSyncCompletion(edgeResult.requestId)
        
        // Reload the data
        await loadAttendanceData()
        
        alert(`✅ Manual sync completed successfully!\n\nRequest ID: ${edgeResult.requestId}\nOffice script should have processed the sync request.`)
      } else {
        throw new Error(edgeResult.error || 'Edge Function failed')
      }
      
    } catch (error) {
      console.error('Error syncing attendance data:', error)
      
      // Fallback to direct sync attempt
      try {
        console.log('🔄 Trying fallback direct sync...')
        const fallbackResponse = await fetch('/api/sync-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json()
          await loadAttendanceData()
          
          if (fallbackResult.warning) {
            alert(`⚠️ Edge Function failed, using fallback sync.\n\n${fallbackResult.warning}\n\n💡 Recommendation: ${fallbackResult.recommendation}`)
          } else {
            alert('✅ Fallback sync completed!')
          }
        } else {
          throw new Error('Both Edge Function and fallback sync failed')
        }
      } catch (fallbackError) {
        alert('❌ Manual sync failed completely. Please ensure:\n1. Supabase Edge Function is deployed\n2. Office sync script is running\n3. SmartOffice is accessible from office computer')
      }
    } finally {
      setAttendanceLoading(false)
    }
  }

  // Wait for sync completion by polling sync_requests table
  const waitForSyncCompletion = async (requestId: string) => {
    const maxAttempts = 30 // 30 seconds max wait
    let attempts = 0
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/check-sync-status?requestId=${requestId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.status === 'completed' || result.status === 'failed') {
            return result
          }
        }
      } catch (error) {
        console.warn('Error checking sync status:', error)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      attempts++
    }
    
    throw new Error('Sync request timed out')
  }

  // Load available employees
  const loadAvailableEmployees = async () => {
    try {
      setEmployeesLoading(true)
      const response = await fetch('/api/admin/available-employees')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableEmployees(result.employees || [])
        }
      }
    } catch (error) {
      console.error('Error loading available employees:', error)
    } finally {
      setEmployeesLoading(false)
    }
  }

  // Handle employee selection
  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee)
    setNewUser(prev => ({
      ...prev,
      full_name: employee.employee_name,
      employee_code: employee.employee_code,
      department: employee.department,
      designation: employee.designation,
      email: '', // Reset email to be filled by user
      password: '', // Reset password to be filled by user
    }))
    setShowEmployeeSelection(false)
  }

  // Reset employee selection
  const resetEmployeeSelection = () => {
    setSelectedEmployee(null)
    setNewUser({
      email: '',
      password: '',
      full_name: '',
      role: 'operator',
      customPermissions: [],
      notes: '',
      employee_code: '',
      department: '',
      designation: ''
    })
    setNewUserConfirmPassword('')
    setShowEmployeeSelection(true)
  }

  // Load employees when Add User section is opened
  useEffect(() => {
    if (userManagementSection === 'add-user') {
      loadAvailableEmployees()
    }
  }, [userManagementSection])

  // User management functions - UPDATED VERSION
  const handleCreateUser = async () => {
    console.log('🔥 STARTING NEW USER CREATION SYSTEM')
    try {
      if (!newUser.email || !newUser.full_name || !newUser.password) {
        alert('Please fill in all required fields: email, full name, password')
        return
      }

      if (newUser.password !== newUserConfirmPassword) {
        alert('Passwords do not match')
        return
      }

      if (newUser.password.length < 8) {
        alert('Password must be at least 8 characters long')
        return
      }

      // Import and use the new user creation system
      const { createUserRequest } = await import('./utils/userCreation')
      
      const result = await createUserRequest({
        full_name: newUser.full_name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        employee_code: newUser.employee_code || null,
        department: newUser.department || null,
        designation: newUser.designation || null,
        notes: newUser.notes || null,
        actorId: getCurrentUser()?.id || 'admin'
      })

      alert(`✅ SUCCESS! User creation request submitted for ${newUser.full_name}!

Request ID: ${result.request_id}

An administrator will process this request and create the user account. You will be notified once the account is ready.`)
      } catch (createError) {
        console.error('User creation request failed:', createError)
        const errorMessage = createError instanceof Error ? createError.message : 'Unknown error occurred'
        alert(`❌ Failed to submit user creation request: ${errorMessage}`)
        return
      }

      // Reset form
      if (userCreationMode === 'manual') {
        setNewUser({
          email: '',
          password: '',
          full_name: '',
          role: 'operator',
          customPermissions: [],
          notes: '',
          employee_code: '',
          department: '',
          designation: ''
        })
        setNewUserConfirmPassword('')
      } else {
        resetEmployeeSelection()
      }
      
      // Refresh available employees if in select mode
      if (userCreationMode === 'select') {
        loadAvailableEmployees()
      }
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      if (action === 'deactivate') {
        if (confirm('Are you sure you want to deactivate this user?')) {
          await deactivateUser(userId)
          alert('User deactivated successfully')
        }
      }
    } catch (err) {
      alert('Action failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Load attendance data when attendance section is active OR on main dashboard
  useEffect(() => {
    if (activeSection === 'attendance' || activeSection === 'dashboard') {
      loadAttendanceData()
    }
  }, [activeSection])

  // Load admin data when settings section is active
  useEffect(() => {
    if (activeSection === 'settings') {
      // Add a small delay to prevent rapid API calls
      const timer = setTimeout(() => {
        fetchUsers()
        fetchRoles()
        fetchUserPermissions()
        // fetchAuditLogs() // Temporarily disabled - has an issue
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [activeSection])

  // Load dashboard data from Supabase
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDashboardData((prev: any) => ({ ...prev, isLoading: true }))
        
        const response = await fetch('/api/sync-dashboard')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.chartData) {
            const chartData = result.data.chartData
            const tasks = chartData.tasks || []
            
            const uniqueOrders = new Set(tasks.map((task: any) => task.partNumber)).size
            const activeMachines = new Set(tasks.map((task: any) => task.machine)).size
            const totalScheduledTasks = tasks.length
            const totalCapacity = 10 * 8
            const onScheduleRate = totalCapacity > 0 ? Math.round((totalScheduledTasks / totalCapacity) * 100) : 0
            
            const statusCounts = {
              notStarted: tasks.filter((task: any) => task.status === 'not-started').length,
              inProgress: tasks.filter((task: any) => task.status === 'in-progress').length,
              onHold: tasks.filter((task: any) => task.status === 'on-hold').length,
              completed: tasks.filter((task: any) => task.status === 'completed').length
            }
            
            const now = new Date()
            const delayedTasks = tasks.filter((task: any) => {
              const endTime = new Date(task.endTime)
              return endTime < now
            }).length
            
            const maintenanceAlerts = 1
            const totalAlerts = delayedTasks + maintenanceAlerts
            
            const alertDetails = totalAlerts > 0 ? 
              `${delayedTasks > 0 ? delayedTasks + ' delay' + (delayedTasks > 1 ? 's' : '') : ''}${delayedTasks > 0 && maintenanceAlerts > 0 ? ', ' : ''}${maintenanceAlerts > 0 ? maintenanceAlerts + ' maintenance' : ''}` : 
              'No active alerts'
            
            setDashboardData({
              activeOrders: uniqueOrders,
              machinesRunning: activeMachines,
              totalMachines: 10,
              utilizationRate: Math.round((activeMachines / 10) * 100),
              onSchedule: onScheduleRate,
              alerts: totalAlerts,
              alertDetails,
              statusCounts,
              machines: [],
              tasks: tasks,
              isLoading: false
            })
          } else {
            setDashboardData((prev: any) => ({ ...prev, isLoading: false }))
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setDashboardData((prev: any) => ({ ...prev, isLoading: false }))
      }
    }

    loadDashboardData()
  }, [])

  // Redirect to auth if not authenticated
  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated')
      if (!isAuthenticated || isAuthenticated !== 'true') {
        router.push('/auth')
      }
    }
    checkAuth()
  }, [router])

  // Load raw attendance data when attendance section is active
  useEffect(() => {
    if (activeSection === 'attendance') {
      const loadRawAttendanceData = async () => {
        setRawLoading(true)
        try {
          const today = new Date().toISOString().split('T')[0]
          const response = await fetch(`/api/admin/raw-attendance?date=${today}`)
          const result = await response.json()
          
          if (result.success) {
            setRawAttendanceData(result.data)
            // Also load historical data automatically (last 7 days)
            loadHistoricalData()
          }
        } catch (error) {
          console.error('Error loading raw attendance data:', error)
        } finally {
          setRawLoading(false)
        }
      }
      
      const loadHistoricalData = async () => {
        setHistoricalLoading(true)
        try {
          const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const toDate = new Date().toISOString().split('T')[0]
          
          const response = await fetch(`/api/admin/raw-attendance?fromDate=${fromDate}&toDate=${toDate}&limit=50`)
          const result = await response.json()
          
          if (result.success) {
            setHistoricalData(result.data)
          }
        } catch (error) {
          console.error('Error loading historical data:', error)
        } finally {
          setHistoricalLoading(false)
        }
      }
      
      loadRawAttendanceData()
    }
  }, [activeSection])

  // Define all possible sidebar items with their required permissions
  const allSidebarItems = [
    {
      category: "Main",
      items: [
        { id: "dashboard", label: "Dashboard", icon: Home, permission: "view_dashboard" },
        { id: "scheduler", label: "Schedule Generator", icon: Settings, permission: "view_schedule_dashboard" },
        { id: "chart", label: "Chart", icon: BarChart3, permission: "view_machine_analyzer" },
        { id: "analytics", label: "Analytics", icon: TrendingUp, permission: "view_reports" },
        { id: "attendance", label: "Attendance", icon: Users, permission: "attendance_read" },
        { id: "standalone-attendance", label: "Standalone Attendance", icon: ExternalLink, permission: "standalone_attendance" },
      ]
    },
    {
      category: "Production",
      items: [
        { id: "orders", label: "Orders", icon: FileText, permission: "view_reports" },
        { id: "machines", label: "Machines", icon: Factory, permission: "operate_machine" },
        { id: "personnel", label: "Personnel", icon: Users, permission: "manage_users" },
        { id: "tasks", label: "Tasks", icon: CheckCircle2, permission: "edit_schedule" },
      ]
    },
    {
      category: "Monitoring",
      items: [
        { id: "alerts", label: "Alerts", icon: Bell, permission: "view_reports" },
        { id: "reports", label: "Reports", icon: FileText, permission: "view_reports" },
        { id: "quality", label: "Quality Control", icon: Shield, permission: "view_machine_analyzer" },
        { id: "maintenance", label: "Maintenance", icon: Wrench, permission: "operate_machine" },
      ]
    },
    {
      category: "System",
      items: [
        { id: "settings", label: "Settings", icon: Cog, permission: "manage_users" },
        { id: "account", label: "Account", icon: User, permission: null }, // Always visible
        { id: "logout", label: "Logout", icon: LogOut, permission: null }, // Always visible
      ]
    }
  ]

  // Filter sidebar items based on user permissions
  const sidebarItems = allSidebarItems.map(category => ({
    ...category,
    items: category.items.filter(item => {
      // Always show logout and account
      if (item.permission === null) return true
      
      // Check if user has the required permission
      return hasPermission(item.permission)
    })
  })).filter(category => category.items.length > 0) // Remove empty categories

  const handleSidebarItemClick = (itemId: string) => {
    if (itemId === "logout") {
      logout()
      return
    }
    
    if (itemId === "scheduler") {
      router.push('/scheduler')
      return
    }
    
    if (itemId === "chart") {
      router.push('/chart')
      return
    }
    
    if (itemId === "analytics") {
      router.push('/schedule-dashboard')
      return
    }
    
    // Check if user has permission to access this section
    const allowedSections = getAllowedSections()
    if (allowedSections.includes(itemId) || itemId === "account") {
      setActiveSection(itemId)
    } else {
      // Redirect to first allowed section if trying to access unauthorized section
      if (allowedSections.length > 0) {
        setActiveSection(allowedSections[0])
      }
    }
  }

  const renderDashboardContent = () => {
    // Check if user has permission to access current section
    const allowedSections = getAllowedSections()
    if (!allowedSections.includes(activeSection) && activeSection !== "account") {
      // Show unauthorized access message
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access this section.</p>
          </div>
        </div>
      )
    }

    switch (activeSection) {
      case "dashboard":
        return renderMainDashboard()
      case "attendance":
        return renderAttendanceView()
      case "standalone-attendance":
        return renderStandaloneAttendanceView()
      case "orders":
        return renderOrdersView()
      case "machines":
        return renderMachinesView()
      case "personnel":
        return renderPersonnelView()
      case "tasks":
        return renderTasksView()
      case "alerts":
        return renderAlertsView()
      case "reports":
        return renderReportsView()
      case "quality":
        return renderQualityView()
      case "maintenance":
        return renderMaintenanceView()
      case "settings":
        return renderSettingsView()
      case "account":
        return renderAccountView()
      default:
        return renderMainDashboard()
    }
  }

  const renderMainDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Active Orders</CardTitle>
            <PlayCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {dashboardData.isLoading ? '...' : dashboardData.activeOrders}
            </div>
            <p className="text-xs text-blue-700">
                <TrendingUp className="inline w-3 h-3 mr-1" />
              {dashboardData.isLoading ? 'Loading...' : 'Active orders from scheduling'}
              </p>
            </CardContent>
          </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Machines Running</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {dashboardData.isLoading ? '...' : `${dashboardData.machinesRunning}/${dashboardData.totalMachines}`}
            </div>
            <p className="text-xs text-green-700">
              {dashboardData.isLoading ? 'Loading...' : `${dashboardData.utilizationRate}% utilization rate`}
            </p>
            </CardContent>
          </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">On Schedule</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {dashboardData.isLoading ? '...' : `${dashboardData.onSchedule}%`}
            </div>
            <p className="text-xs text-purple-700">
              {dashboardData.isLoading ? 'Loading...' : `Completion rate from scheduling`}
            </p>
            </CardContent>
          </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {dashboardData.isLoading ? '...' : dashboardData.alerts}
            </div>
            <p className="text-xs text-red-700">
              {dashboardData.isLoading ? 'Loading...' : dashboardData.alertDetails}
            </p>
            </CardContent>
          </Card>
        </div>


      {/* Production Timeline */}
      <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
              <CardTitle className="text-xl text-gray-900">Production Timeline</CardTitle>
                    <CardDescription>Real-time view of machine scheduling and operations</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>
                    <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
          <div className="space-y-6">
            {/* Order Completion Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Part Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Start Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Expected End</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Machine</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">Loading orders...</td>
                    </tr>
                  ) : (
                    dashboardData.tasks?.slice(0, 10).map((task: any, index: number) => (
                      <tr key={task.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          ORD-{String(index + 1).padStart(3, '0')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {task.partNumber || `PN${1000 + index}`}
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant="outline" 
                            className={
                              task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              task.status === 'on-hold' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {task.status === 'completed' ? 'Completed' :
                             task.status === 'in-progress' ? 'In Progress' :
                             task.status === 'on-hold' ? 'On Hold' :
                             'Not Started'}
                        </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {task.startTime ? new Date(task.startTime).toLocaleDateString() : 'TBD'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {task.endTime ? new Date(task.endTime).toLocaleDateString() : 'TBD'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: task.status === 'completed' ? '100%' :
                                       task.status === 'in-progress' ? '65%' :
                                       task.status === 'on-hold' ? '30%' : '0%'
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {task.machine?.replace('vmc', 'VMC ') || `VMC ${(index % 10) + 1}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
                      </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Machine Utilization Chart */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">Machine Utilization</CardTitle>
                  <CardDescription className="text-blue-700">Current machine capacity usage</CardDescription>
                </CardHeader>
                <CardContent>
                      <div className="space-y-4">
                    {Array.from({ length: 5 }, (_, i) => {
                      const utilization = Math.floor(Math.random() * 40 + 60)
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-blue-900">VMC {i + 1}</span>
                            <span className="text-blue-700">{utilization}%</span>
                                </div>
                          <div className="w-full bg-blue-200 rounded-full h-3">
                            <div
                              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${utilization}%` }}
                            ></div>
                                </div>
                              </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Production Efficiency Chart */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900">Production Efficiency</CardTitle>
                  <CardDescription className="text-green-700">Weekly performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-green-800 font-medium">Production Efficiency Chart</p>
                      <p className="text-green-600 text-sm">Real-time performance visualization</p>
                            </div>
                          </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAttendanceView = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Today's Attendance</h2>
            <p className="text-gray-600">Real-time attendance data from SmartOffice device</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={async () => {
                setRawLoading(true)
                try {
                  const response = await fetch('/api/admin/sync-attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      syncType: 'manual',
                      requestedBy: 'ui-user'
                    })
                  })
                  
                  const result = await response.json()
                  
                  if (result.success) {
                    // Reload data after sync
                    const today = new Date().toISOString().split('T')[0]
                    const dataResponse = await fetch(`/api/admin/raw-attendance?date=${today}`)
                    const dataResult = await dataResponse.json()
                    
                    if (dataResult.success) {
                      setRawAttendanceData(dataResult.data)
                    }
                  }
                } catch (error) {
                  console.error('Error syncing:', error)
                } finally {
                  setRawLoading(false)
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={rawLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${rawLoading ? 'animate-spin' : ''}`} />
              {rawLoading ? 'Syncing...' : 'Sync from SmartOffice'}
            </Button>
          </div>
        </div>
        
        {/* Today's Attendance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Today Active Punches</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {rawLoading ? '...' : (rawAttendanceData?.statistics?.totalLogs || 0)}
              </div>
              <p className="text-xs text-green-700">All punch activities today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Today Active Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {rawLoading ? '...' : (rawAttendanceData?.statistics?.uniqueEmployees || 0)}
              </div>
              <p className="text-xs text-blue-700">Employees who came today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Delay Employee</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {rawLoading ? '...' : (rawAttendanceData?.statistics?.lateEmployees || 0)}
              </div>
              <p className="text-xs text-orange-700">Late arrivals today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Holiday Employee</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {rawLoading ? '...' : (rawAttendanceData?.statistics?.absentEmployees || 0)}
              </div>
              <p className="text-xs text-red-700">Not coming today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Total Employee</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {rawLoading ? '...' : (rawAttendanceData?.statistics?.totalEmployees || 0)}
              </div>
              <p className="text-xs text-purple-700">Registered employees</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Activity and Historical Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Today's Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Activity</CardTitle>
              <CardDescription>Latest punches from SmartOffice device (Today only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rawLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Loading today's activity...</p>
                  </div>
                ) : rawAttendanceData?.rawLogs && rawAttendanceData.rawLogs.length > 0 ? (
                  rawAttendanceData.rawLogs
                    .sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
                    .slice(0, 10)
                    .map((log: any, index: number) => {
                      const employee = rawAttendanceData.employees.find((emp: any) => emp.employee_code === log.employee_code)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                             onClick={() => setSelectedAttendanceEmployee(log.employee_code)}>
                          <div className="flex items-center gap-3">
                            {log.punch_direction === 'in' ? (
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee?.employee_name || `Employee ${log.employee_code}`}
                              </p>
                              <p className="text-sm text-gray-500">#{log.employee_code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {log.punch_direction.toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.log_date).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No punches recorded today</p>
                    <p className="text-sm">Connect SmartOffice device to see real-time data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Side: Historical Records with Advanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle>All Track Records</CardTitle>
              <CardDescription>Previous activity with advanced filtering options</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Advanced Filters */}
              <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          defaultValue={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          id="historicalFromDate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          id="historicalToDate"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Filter</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" id="historicalEmployeeFilter">
                      <option value="">All Employees</option>
                      {rawAttendanceData?.employees?.map((emp: any) => (
                        <option key={emp.employee_code} value={emp.employee_code}>
                          {emp.employee_name || `Employee ${emp.employee_code}`} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Records per page</label>
                    <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]" id="recordsPerPage">
                      <option value="10">10 records</option>
                      <option value="25">25 records</option>
                      <option value="50">50 records</option>
                      <option value="100">100 records</option>
                    </select>
                  </div>
                  
                  <Button 
                    onClick={async () => {
                      // Load historical data with filters
                      const fromDate = (document.getElementById('historicalFromDate') as HTMLInputElement)?.value
                      const toDate = (document.getElementById('historicalToDate') as HTMLInputElement)?.value
                      const employeeCode = (document.getElementById('historicalEmployeeFilter') as HTMLSelectElement)?.value
                      const recordsPerPageValue = (document.getElementById('recordsPerPage') as HTMLSelectElement)?.value
                      
                      setHistoricalLoading(true)
                      setCurrentPage(1)
                      setRecordsPerPage(parseInt(recordsPerPageValue) || 10)
                      
                      try {
                        // Build query parameters
                        const params = new URLSearchParams()
                        if (fromDate) params.append('fromDate', fromDate)
                        if (toDate) params.append('toDate', toDate)
                        if (employeeCode) params.append('employeeCode', employeeCode)
                        params.append('limit', recordsPerPageValue || '10')
                        params.append('page', '1')
                        
                        const response = await fetch(`/api/admin/raw-attendance?${params.toString()}`)
                        const result = await response.json()
                        
                        if (result.success) {
                          setHistoricalData(result.data)
                        } else {
                          console.error('Failed to load historical data:', result.error)
                        }
                      } catch (error) {
                        console.error('Error loading historical data:', error)
                      } finally {
                        setHistoricalLoading(false)
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={historicalLoading}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {historicalLoading ? 'Loading...' : 'Apply Filters'}
                  </Button>
                </div>
              </div>

              {/* Historical Records Display */}
              <div className="space-y-3">
                {historicalLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p>Loading historical records...</p>
                  </div>
                ) : historicalData?.rawLogs && historicalData.rawLogs.length > 0 ? (
                  // Show real historical data
                  historicalData.rawLogs
                    .sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
                    .map((log: any, index: number) => {
                      const employee = historicalData.employees?.find((emp: any) => emp.employee_code === log.employee_code)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            {log.punch_direction === 'in' ? (
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {employee?.employee_name || `Employee ${log.employee_code}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {log.punch_direction.toUpperCase()} Punch
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(log.log_date).toLocaleTimeString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.log_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })
                ) : selectedAttendanceEmployee && rawAttendanceData?.rawLogs ? (
                  // Show selected employee's data from today
                  rawAttendanceData.rawLogs
                    .filter((log: any) => log.employee_code === selectedAttendanceEmployee)
                    .sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
                    .map((log: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-3">
                          {log.punch_direction === 'in' ? (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{log.punch_direction.toUpperCase()} Punch</p>
                            <p className="text-sm text-gray-500">Employee #{log.employee_code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(log.log_date).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.log_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  // Show instructions when no data loaded
                  <div className="space-y-2">
                    <div className="text-center py-4 text-gray-500 bg-blue-50 rounded-lg">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">Loading Historical Records...</p>
                      <p className="text-sm">Historical data will appear here automatically</p>
                      <p className="text-xs mt-1">Use filters above to refine your search</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {historicalData?.rawLogs && historicalData.rawLogs.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * recordsPerPage) + 1}-{Math.min(currentPage * recordsPerPage, historicalData.rawLogs.length)} of {historicalData.rawLogs.length} records
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1)
                          // TODO: Load previous page data
                        }
                      }}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={historicalData.rawLogs.length < recordsPerPage}
                      onClick={() => {
                        setCurrentPage(currentPage + 1)
                        // TODO: Load next page data
                      }}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )

  const renderStandaloneAttendanceView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Standalone Attendance Portal</h2>
          <p className="text-gray-600">Access the dedicated attendance website with your current credentials</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <ExternalLink className="w-3 h-3 mr-1" />
          External Site
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <ExternalLink className="w-5 h-5" />
              Launch Attendance Portal
            </CardTitle>
            <CardDescription className="text-blue-700">
              Open the dedicated attendance management website in a new tab. Your current login credentials will work automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">Portal URL:</span>
                <code className="bg-white px-2 py-1 rounded text-blue-800 text-xs">attendance.epsilon.com</code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">Authentication:</span>
                <span className="text-blue-800 text-xs">Single Sign-On Enabled</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">Your Access:</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
                  Authorized
                </Badge>
              </div>
            </div>
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Open attendance portal in new tab
                window.open('https://attendance.epsilon.com', '_blank', 'noopener,noreferrer')
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Attendance Portal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal Features</CardTitle>
            <CardDescription>What you can do in the standalone attendance system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Real-time Clock In/Out</p>
                  <p className="text-sm text-gray-600">Mark attendance with biometric or manual entry</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Personal Timesheet</p>
                  <p className="text-sm text-gray-600">View your daily, weekly, and monthly attendance records</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Leave Requests</p>
                  <p className="text-sm text-gray-600">Submit and track leave applications</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Overtime Tracking</p>
                  <p className="text-sm text-gray-600">Monitor overtime hours and approvals</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Note</p>
                  <p className="text-xs text-amber-700">
                    The standalone portal uses the same user credentials as this main system. 
                    No separate login required.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Access Options</CardTitle>
          <CardDescription>Alternative ways to access attendance features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('https://attendance.epsilon.com/mobile', '_blank')}
            >
              <ExternalLink className="w-6 h-6 text-blue-600" />
              <div className="text-center">
                <p className="font-medium">Mobile App</p>
                <p className="text-xs text-gray-500">Download mobile attendance app</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('https://attendance.epsilon.com/kiosk', '_blank')}
            >
              <ExternalLink className="w-6 h-6 text-green-600" />
              <div className="text-center">
                <p className="font-medium">Kiosk Mode</p>
                <p className="text-xs text-gray-500">Full-screen attendance terminal</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.open('https://attendance.epsilon.com/reports', '_blank')}
            >
              <ExternalLink className="w-6 h-6 text-purple-600" />
              <div className="text-center">
                <p className="font-medium">Reports Only</p>
                <p className="text-xs text-gray-500">View-only attendance reports</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderOrdersView = () => (
    <div className="space-y-6">
                    <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
          <p className="text-gray-600">Manage production orders and scheduling</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
                    </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
          <CardDescription>Current production orders and their status</CardDescription>
                  </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Orders View</h3>
            <p className="text-gray-600">Detailed orders management interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderMachinesView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Machine Management</h2>
          <p className="text-gray-600">Monitor and manage production machines</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Settings className="w-4 h-4 mr-2" />
          Machine Settings
        </Button>
                      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Machine Status</CardTitle>
          <CardDescription>Real-time machine monitoring and control</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Factory className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Machines View</h3>
            <p className="text-gray-600">Detailed machine management interface will be implemented here</p>
                      </div>
                  </CardContent>
                </Card>
            </div>
  )

  // Function to load employee attendance data
  const loadEmployeeAttendance = async (employeeCode: string) => {
    setLoadingAttendance(true)
    try {
      // Get last 30 days of attendance
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = new Date().toISOString().split('T')[0]
      
      const response = await fetch(`/api/admin/raw-attendance?fromDate=${fromDate}&toDate=${toDate}&employeeCode=${employeeCode}&limit=100`)
      const result = await response.json()
      
      if (result.success) {
        setEmployeeAttendance(result.data)
      }
    } catch (error) {
      console.error('Error loading employee attendance:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const renderPersonnelView = () => {

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personnel Management</h2>
            <p className="text-gray-600">View detailed employee profiles and attendance tracking</p>
          </div>
          {selectedPersonnelEmployee && (
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedPersonnelEmployee(null)
                setEmployeeAttendance(null)
              }}
            >
              ← Back to List
            </Button>
          )}
        </div>

        {!selectedPersonnelEmployee ? (
          // Employee List View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Card 
                key={user.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedPersonnelEmployee(user)
                  loadEmployeeAttendance((user as any).employee_code || '1')
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {(user as any).employee_code && (
                          <Badge variant="secondary" className="text-xs">
                            #{(user as any).employee_code}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Department:</span>
                      <span className="font-medium">{(user as any).department || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Designation:</span>
                      <span className="font-medium">{(user as any).designation || 'Not Set'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Employee Detail View
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Employee Profile */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                      {selectedPersonnelEmployee.full_name?.charAt(0) || 'U'}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedPersonnelEmployee.full_name}</h2>
                    <p className="text-gray-500 mb-4">{selectedPersonnelEmployee.email}</p>
                    
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Employee ID:</span>
                        <span className="font-medium">#{(selectedPersonnelEmployee as any)?.employee_code || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Role:</span>
                        <Badge variant="outline">{selectedPersonnelEmployee?.role}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Department:</span>
                        <span className="font-medium">{(selectedPersonnelEmployee as any)?.department || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Designation:</span>
                        <span className="font-medium">{(selectedPersonnelEmployee as any)?.designation || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium">{(selectedPersonnelEmployee as any)?.phone || 'Not Set'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">
                      {employeeAttendance?.statistics?.presentDays || 0}
                    </div>
                    <p className="text-xs text-green-700">Present Days</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-900">
                      {employeeAttendance?.statistics?.absentDays || 0}
                    </div>
                    <p className="text-xs text-red-700">Absent Days</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-900">
                      {employeeAttendance?.statistics?.lateDays || 0}
                    </div>
                    <p className="text-xs text-orange-700">Late Arrivals</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {employeeAttendance?.statistics?.totalPunches || 0}
                    </div>
                    <p className="text-xs text-blue-700">Total Punches</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column - Attendance Details */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Attendance Chart</CardTitle>
                  <CardDescription>Last 30 days attendance tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAttendance ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
                      <p className="text-gray-500">Loading attendance data...</p>
                    </div>
                  ) : employeeAttendance?.rawLogs && employeeAttendance.rawLogs.length > 0 ? (
                    <div className="space-y-4">
                      {/* Recent Punches */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                        <div className="space-y-2">
                          {employeeAttendance.rawLogs
                            .sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
                            .slice(0, 10)
                            .map((log: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  {log.punch_direction === 'in' ? (
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">{log.punch_direction.toUpperCase()} Punch</p>
                                    <p className="text-sm text-gray-500">{new Date(log.log_date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">
                                    {new Date(log.log_date).toLocaleTimeString()}
                                  </div>
                                  {new Date(log.log_date).getHours() > 9 && log.punch_direction === 'in' && (
                                    <Badge variant="destructive" className="text-xs mt-1">Late</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
                      <p className="text-gray-500">No attendance records found for this employee</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTasksView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Management</h2>
          <p className="text-gray-600">Monitor and manage production tasks</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          New Task
        </Button>
                      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>Current task assignments and progress</CardDescription>
                    </CardHeader>
                    <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tasks View</h3>
            <p className="text-gray-600">Detailed task management interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAlertsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alert Center</h2>
          <p className="text-gray-600">System alerts and notifications</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700">
          <Bell className="w-4 h-4 mr-2" />
          Alert Settings
        </Button>
                          </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>Current system alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Alerts View</h3>
            <p className="text-gray-600">Detailed alerts management interface will be implemented here</p>
                      </div>
                    </CardContent>
                  </Card>
    </div>
  )

  const renderReportsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Generate and view production reports</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
            </div>

      <Card>
                <CardHeader>
          <CardTitle>Production Reports</CardTitle>
          <CardDescription>Detailed production analytics and reports</CardDescription>
                </CardHeader>
                <CardContent>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports View</h3>
            <p className="text-gray-600">Detailed reports interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderQualityView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quality Control</h2>
          <p className="text-gray-600">Monitor product quality and standards</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Shield className="w-4 h-4 mr-2" />
          Quality Settings
        </Button>
                    </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Quality Metrics</CardTitle>
          <CardDescription>Product quality monitoring and control</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Quality View</h3>
            <p className="text-gray-600">Detailed quality control interface will be implemented here</p>
                  </div>
                </CardContent>
              </Card>
    </div>
  )

  const renderMaintenanceView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maintenance</h2>
          <p className="text-gray-600">Schedule and track machine maintenance</p>
        </div>
        <Button className="bg-yellow-600 hover:bg-yellow-700">
          <Wrench className="w-4 h-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>
      
      <Card>
                <CardHeader>
          <CardTitle>Maintenance Schedule</CardTitle>
          <CardDescription>Machine maintenance tracking and scheduling</CardDescription>
                </CardHeader>
                <CardContent>
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance View</h3>
            <p className="text-gray-600">Detailed maintenance interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
                        </div>
  )

  const renderSettingsView = () => {
    // Computed values for user management
    const filteredUsers = (userPermissionsData?.users || []).filter((user: any) => {
      // Search filter
      const searchMatch = !userListSearch || 
        user.full_name?.toLowerCase().includes(userListSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userListSearch.toLowerCase())
      
      // Role filter
      const roleMatch = roleFilters.length === 0 || roleFilters.includes(user.role?.name)
      
      // Status filter
      const statusMatch = statusFilter === 'all' || user.status === statusFilter
      
      return searchMatch && roleMatch && statusMatch
    })
    
    console.log('Filtering debug:')
    console.log('- Total users from API:', userPermissionsData?.users?.length)
    console.log('- Search query:', userListSearch)
    console.log('- Role filters:', roleFilters)
    console.log('- Status filter:', statusFilter)
    console.log('- Filtered users count:', filteredUsers.length)
    console.log('- Filtered users:', filteredUsers.map((u: any) => ({ email: u.email, role: u.role?.name, status: u.status })))
    
    const totalPages = Math.ceil(filteredUsers.length / pageSize)
    const paginatedUsers = filteredUsers.slice(
      (currentUserPage - 1) * pageSize,
      currentUserPage * pageSize
    )
    
    const statusCounts = (userPermissionsData?.users || []).reduce((acc: any, user: any) => {
      acc[user.status] = (acc[user.status] || 0) + 1
      return acc
    }, { active: 0, pending: 0, disabled: 0 })
    
    const roleCounts = (userPermissionsData?.users || []).reduce((acc: any, user: any) => {
      const roleName = user.role?.name || 'unassigned'
      acc[roleName] = (acc[roleName] || 0) + 1
      return acc
    }, {})

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-600">
              Manage system access, roles, and permissions for all users.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            User: {userEmail || 'admin@epsilon.com'}
          </div>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={userManagementSection === 'user-management' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserManagementSection('user-management')}
              >
                <Users className="w-4 h-4 mr-2" />
                User Management
              </Button>
              <Button
                variant={userManagementSection === 'add-user' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserManagementSection('add-user')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Users
              </Button>
              <Button
                variant={userManagementSection === 'role-profiles' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserManagementSection('role-profiles')}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Role Profiles
              </Button>
              <Button
                variant={userManagementSection === 'attendance-sync' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserManagementSection('attendance-sync')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Attendance Sync
              </Button>
              <Button
                variant={userManagementSection === 'activity-logging' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserManagementSection('activity-logging')}
              >
                <Activity className="w-4 h-4 mr-2" />
                Activity Logging
              </Button>
            </div>
          </CardContent>
        </Card>

        {userManagementSection === 'user-management' && (
          <Card className="shadow-lg rounded-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-[600px]">
            {/* Left Pane - User List */}
            <div className="lg:col-span-2 border-r border-gray-200 bg-gray-50">
              {/* Header with Stats */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Users • {filteredUsers.length} total</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => fetchUserPermissions()}
                      disabled={userPermissionsLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${userPermissionsLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log('=== DEBUG INFO ===')
                        console.log('userPermissionsData:', userPermissionsData)
                        console.log('Total users:', userPermissionsData?.users?.length)
                        console.log('Search:', userListSearch)
                        console.log('Role filters:', roleFilters)
                        console.log('Status filter:', statusFilter)
                        alert(`Total users: ${userPermissionsData?.users?.length || 0}\nFiltered: ${filteredUsers.length}\nSearch: "${userListSearch}"\nStatus: ${statusFilter}`)
                      }}
                    >
                      Debug
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Add User
                    </Button>
                  </div>
                </div>
                
                {/* Summary Chips */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active: {statusCounts.active}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending: {statusCounts.pending}
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    Roles: {Object.keys(roleCounts).length}
                  </Badge>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="p-4 space-y-3 bg-white border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users..."
                    value={userListSearch}
                    onChange={(e) => setUserListSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* User List */}
              <div className="flex-1 overflow-y-auto">
                {userPermissionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : paginatedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {paginatedUsers.map((user: any) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user)
                          setIsEditMode(false) // Reset edit mode when switching users
                        }}
                        className={`p-3 m-1 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedUser?.id === user.id 
                            ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {getDisplayName(user)}
                              </p>
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            {user.employee_code && (
                              <p className="text-xs text-blue-600 font-medium">Code: {user.employee_code}</p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${roleBadgeVariants[user.role_badge || user.role?.name] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                              >
                                {user.role_badge || user.role?.name || 'No Role'}
                              </Badge>
                              
                              <span className="text-xs text-gray-400">
                                {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Page {currentUserPage} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentUserPage === 1}
                          onClick={() => setCurrentUserPage(currentUserPage - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentUserPage === totalPages}
                          onClick={() => setCurrentUserPage(currentUserPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Pane - User Details */}
            <div className="lg:col-span-3 bg-white">
              {!selectedUser ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
                    <p className="text-gray-500">Choose a user from the list to view and manage their details</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* User Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={selectedUser.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-medium">
                            {getInitials(selectedUser)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{getDisplayName(selectedUser)}</h2>
                          <p className="text-gray-600">{selectedUser.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={statusBadgeVariants[selectedUser.status] || 'bg-gray-100 text-gray-700 border-gray-200'}
                            >
                              {selectedUser.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={roleBadgeVariants[selectedUser.role?.name] || 'bg-gray-100 text-gray-700 border-gray-200'}
                            >
                              {selectedUser.role?.name || 'No Role'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isEditMode ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setIsEditMode(true)}
                              disabled={!isSuperAdmin()}
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteUser(selectedUser)}
                              disabled={!isSuperAdmin()}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete Account
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setIsEditMode(false)
                                // Clear any pending changes
                                setUserPermissionChanges(prev => {
                                  const updated = { ...prev }
                                  delete updated[selectedUser.id]
                                  return updated
                                })
                                setUserRoleChanges(prev => {
                                  const updated = { ...prev }
                                  delete updated[selectedUser.id]
                                  return updated
                                })
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={async () => {
                                await saveUserPermissions(selectedUser.id)
                                setIsEditMode(false)
                              }}
                              disabled={savingPermissions}
                            >
                              {savingPermissions ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isSuperAdmin()}
                          onClick={() => {
                            setPasswordSectionMode(null)
                            goToSecurityTab()
                          }}
                        >
                          <KeyRound className="w-4 h-4 mr-1" />
                          Password Actions
                        </Button>
                        <Button
                          size="sm"
                          disabled={!isSuperAdmin()}
                          onClick={() => {
                            if (!isSuperAdmin()) {
                              toast({
                                title: 'Permission Denied',
                                description: 'Only super admins can set passwords manually.',
                                variant: 'destructive'
                              })
                              return
                            }

                            setPasswordSectionMode('set')
                            goToSecurityTab(true)
                          }}
                        >
                          <ClipboardList className="w-4 h-4 mr-1" />
                          Set Password Manually
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabbed Content */}
                  <div className="flex-1 overflow-hidden">
                    <Tabs value={detailTab} onValueChange={(value: any) => setDetailTab(value)} className="h-full flex flex-col">
                      <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-5">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="roles">Roles</TabsTrigger>
                          <TabsTrigger value="scope">Scope</TabsTrigger>
                          <TabsTrigger value="activity">Activity</TabsTrigger>
                          <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6">
                        <TabsContent value="overview" className="space-y-4 mt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                              <div className="space-y-3 text-sm">
                                {/* Editable Phone */}
                                <EditableField
                                  label="Phone"
                                  value={selectedUser.phone || ''}
                                  placeholder="Not provided"
                                  userId={selectedUser.id}
                                  field="phone"
                                  onUpdate={(newValue) => {
                                    setSelectedUser({ ...selectedUser, phone: newValue })
                                    // Refresh users list to get updated data
                                    fetchUsers()
                                  }}
                                />
                                
                                {/* Editable Employee Code */}
                                <EditableField
                                  label="Employee Code"
                                  value={selectedUser.employee_code || ''}
                                  placeholder="Not assigned"
                                  userId={selectedUser.id}
                                  field="employee_code"
                                  className="font-medium text-blue-600"
                                  onUpdate={(newValue) => {
                                    setSelectedUser({ ...selectedUser, employee_code: newValue })
                                    // Refresh users list to get updated data
                                    fetchUsers()
                                  }}
                                />
                                
                                {/* Editable Department */}
                                <EditableField
                                  label="Department"
                                  value={selectedUser.department || ''}
                                  placeholder="Not specified"
                                  userId={selectedUser.id}
                                  field="department"
                                  onUpdate={(newValue) => {
                                    setSelectedUser({ ...selectedUser, department: newValue })
                                    // Refresh users list to get updated data
                                    fetchUsers()
                                  }}
                                />
                                
                                {/* Editable Designation */}
                                <EditableField
                                  label="Designation"
                                  value={selectedUser.designation || ''}
                                  placeholder="Not specified"
                                  userId={selectedUser.id}
                                  field="designation"
                                  onUpdate={(newValue) => {
                                    setSelectedUser({ ...selectedUser, designation: newValue })
                                    // Refresh users list to get updated data
                                    fetchUsers()
                                  }}
                                />
                                
                                {/* Non-editable fields */}
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Last Login:</span>
                                  <span>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Created:</span>
                                  <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </Card>
                            
                            <Card className="p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Access Summary</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Permissions:</span>
                                  <span className="font-medium">{selectedUser.permissions?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Overrides:</span>
                                  <span className="font-medium">{selectedUser.overrides?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Plants:</span>
                                  <span className="font-medium">{selectedUser.scope?.plants?.length || 0}</span>
                                </div>
                              </div>
                            </Card>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="roles" className="space-y-4 mt-0">
                          {/* Role Assignment Card */}
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3">Role Assignment</h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Current Role</Label>
                                <div className="mt-1">
                                  <Select 
                                    value={selectedUser.role?.id || ''} 
                                    onValueChange={(roleId) => handleRoleChange(selectedUser.id, roleId)}
                                    disabled={!isEditMode || !isSuperAdmin() || savingPermissions}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {userPermissionsData?.availableRoles?.map((role: any) => (
                                        <SelectItem key={role.id} value={role.id}>
                                          <div className="flex items-center gap-2">
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${roleBadgeVariants[role.name] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                                            >
                                              {role.name}
                                            </Badge>
                                            <span className="text-sm">{role.description}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {!isEditMode && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Click "Edit" to modify user role
                                  </p>
                                )}
                                {isEditMode && !isSuperAdmin() && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Only super admins can change user roles
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>

                          {/* System Functions Card */}
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3">System Functions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(permissionDictionary).map(([code, perm]) => {
                                const hasPermission = selectedUser.permissions?.some((p: any) => p.code === code)
                                return (
                                  <div key={code} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                                    <input
                                      type="checkbox"
                                      checked={hasPermission}
                                      onChange={(e) => handlePermissionToggle(selectedUser.id, code, e.target.checked)}
                                      disabled={!isEditMode || !isSuperAdmin()}
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                                      <p className="text-xs text-gray-600">{perm.description}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {isEditMode && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                {!isSuperAdmin() && (
                                  <p className="text-xs text-gray-500 mb-3">
                                    Only super admins can modify user permissions
                                  </p>
                                )}
                                <Button 
                                  onClick={() => saveUserPermissions(selectedUser.id)}
                                  disabled={savingPermissions || !isSuperAdmin()}
                                  className="w-full"
                                >
                                  {savingPermissions ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-4 h-4 mr-2" />
                                      Save Changes
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                            {!isEditMode && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 text-center">
                                  Click "Edit" above to modify permissions
                                </p>
                              </div>
                            )}
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="scope" className="space-y-4 mt-0">
                          <Card className="p-4">
                            <h4 className="font-medium text-gray-900 mb-3">Access Scope</h4>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Plants</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedUser.scope?.plants?.map((plant: string) => (
                                    <Badge key={plant} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {plant}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Departments</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedUser.scope?.departments?.map((dept: string) => (
                                    <Badge key={dept} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      {dept}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Machine Groups</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedUser.scope?.machineGroups?.map((group: string) => (
                                    <Badge key={group} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      {group}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="activity" className="space-y-4 mt-0">
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">Recent Activity</h4>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => fetchUserAuditLogs(selectedUser.id)}
                                disabled={auditLogsLoading}
                              >
                                <RefreshCw className={`w-4 h-4 mr-1 ${auditLogsLoading ? 'animate-spin' : ''}`} />
                                Refresh
                              </Button>
                            </div>
                            
                            {auditLogsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">Loading activity...</span>
                              </div>
                            ) : userAuditLogs.length > 0 ? (
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {userAuditLogs.map((log: any) => (
                                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                      log.action === 'role_change' ? 'bg-blue-500' :
                                      log.action === 'permission_grant' ? 'bg-green-500' :
                                      log.action === 'permission_revoke' ? 'bg-red-500' :
                                      log.action === 'user_deletion' ? 'bg-red-600' :
                                      log.action === 'user_deletion_completed' ? 'bg-red-700' :
                                      'bg-gray-500'
                                    }`}></div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{log.description}</p>
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                        <span>by {log.actor.full_name || log.actor.email}</span>
                                        {log.ip && <span>{log.ip}</span>}
                                      </div>
                                      {log.details && (
                                        <div className="mt-2 text-xs text-gray-600">
                                          {log.action === 'role_change' && log.details.new_role && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                              New Role: {log.details.new_role}
                                            </span>
                                          )}
                                          {log.action === 'permission_grant' && log.details.permission && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                              Permission: {log.details.permission}
                                            </span>
                                          )}
                                          {log.action === 'permission_revoke' && log.details.permission && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                              Revoked: {log.details.permission}
                                            </span>
                                          )}
                                          {(log.action === 'user_deletion' || log.action === 'user_deletion_completed') && log.details.deleted_user && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                              <div className="font-medium text-red-800">🗑️ Account Deletion</div>
                                              <div className="text-red-700 mt-1">
                                                <div><strong>User:</strong> {log.details.deleted_user.full_name || log.details.deleted_user.email}</div>
                                                <div><strong>Email:</strong> {log.details.deleted_user.email}</div>
                                                {log.details.deleted_user.role && <div><strong>Role:</strong> {log.details.deleted_user.role}</div>}
                                                {log.details.deleted_user.department && <div><strong>Department:</strong> {log.details.deleted_user.department}</div>}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No activity logs found</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Permission and role changes will appear here
                                </p>
                              </div>
                            )}
                          </Card>
                        </TabsContent>

                        <TabsContent value="security" className="space-y-4 mt-0">
                          <Card>
                            <CardHeader>
                              <CardTitle>Password & Security Tools</CardTitle>
                              <CardDescription>
                                Generate temporary passwords, send reset emails, or manually set a new password for the selected user.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              {!isSuperAdmin() ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                  Only super admins can manage passwords. Please contact a super admin if you need to reset this account.
                                </div>
                              ) : null}

                              {passwordError && (
                                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                  {passwordError}
                                </div>
                              )}

                              <div className="grid gap-6 md:grid-cols-2">
                                <div
                                  className={`rounded-lg border ${passwordSectionMode === 'generate' ? 'border-blue-300 shadow-inner shadow-blue-100' : 'border-gray-200'} p-5 space-y-4`}
                                >
                                  <div className="space-y-1">
                                    <h4 className="text-base font-semibold text-gray-900">Generate Temporary Password</h4>
                                    <p className="text-sm text-gray-600">
                                      Create a random, strong password for the user. Share it securely and ask them to change it on first login.
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={handleGeneratePassword}
                                      disabled={!isSuperAdmin() || passwordActionLoading === 'generate'}
                                    >
                                      {passwordActionLoading === 'generate' ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <KeyRound className="mr-2 h-4 w-4" />
                                          Generate password
                                        </>
                                      )}
                                    </Button>
                                    {temporaryPassword && (
                                      <Button variant="secondary" onClick={copyTemporaryPassword}>
                                        <Copy className="mr-2 h-4 w-4" /> Copy
                                      </Button>
                                    )}
                                  </div>

                                  {temporaryPassword ? (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Temporary password</Label>
                                      <div className="flex items-center gap-2">
                                        <Input value={temporaryPassword} readOnly className="font-mono" />
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        Make sure to copy this password now. It will be cleared once you leave this page or switch users.
                                      </p>
                                    </div>
                                  ) : null}
                                </div>

                                <div
                                  className={`rounded-lg border ${passwordSectionMode === 'set' ? 'border-blue-300 shadow-inner shadow-blue-100' : 'border-gray-200'} p-5 space-y-4`}
                                >
                                  <div className="space-y-1">
                                    <h4 className="text-base font-semibold text-gray-900">Set Password Manually</h4>
                                    <p className="text-sm text-gray-600">
                                      Define a specific password for this account. The user will be able to log in immediately using the new password.
                                    </p>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <Label htmlFor="security-new-password">New password</Label>
                                      <Input
                                        id="security-new-password"
                                        type="password"
                                        ref={manualPasswordInputRef}
                                        value={customPassword}
                                        onChange={(event) => setCustomPassword(event.target.value)}
                                        placeholder="Enter new password"
                                        disabled={!isSuperAdmin() || passwordActionLoading === 'set'}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label htmlFor="security-confirm-password">Confirm password</Label>
                                      <Input
                                        id="security-confirm-password"
                                        type="password"
                                        value={customPasswordConfirm}
                                        onChange={(event) => setCustomPasswordConfirm(event.target.value)}
                                        placeholder="Re-enter password"
                                        disabled={!isSuperAdmin() || passwordActionLoading === 'set'}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                      Password must be at least 8 characters and match exactly.
                                    </p>
                                    <Button
                                      onClick={handleSetPassword}
                                      disabled={!isSuperAdmin() || passwordActionLoading === 'set'}
                                      className="ml-4"
                                    >
                                      {passwordActionLoading === 'set' ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Save className="mr-2 h-4 w-4" /> Save password
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-gray-200 p-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h4 className="text-base font-semibold text-gray-900">Send Password Reset Email</h4>
                                    <p className="text-sm text-gray-600">
                                      Supabase will send a reset link to the user&apos;s email address if it&apos;s valid.
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={handleSendResetEmail}
                                    disabled={!isSuperAdmin() || sendingResetEmail}
                                  >
                                    {sendingResetEmail ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="mr-2 h-4 w-4" /> Send reset email
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              )}
            </div>
            </div>
          </Card>
        )}

        {userManagementSection === 'add-user' && (
          <Card className="shadow-lg rounded-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
                    <p className="text-gray-600">Choose how you want to create a new user account.</p>
                  </div>
                </div>

                {/* Two Options: Manual vs Employee Selection */}
                <div className="flex gap-4">
                  <Button
                    variant={userCreationMode === 'manual' ? 'default' : 'outline'}
                    onClick={() => {
                      setUserCreationMode('manual')
                      setShowEmployeeSelection(false)
                      setSelectedEmployee(null)
                      setNewUser({
                        email: '',
                        password: '',
                        full_name: '',
                        role: 'operator',
                        customPermissions: [],
                        notes: '',
                        employee_code: '',
                        department: '',
                        designation: ''
                      })
                    }}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Manual Entry
                  </Button>
                  <Button
                    variant={userCreationMode === 'select' ? 'default' : 'outline'}
                    onClick={() => {
                      setUserCreationMode('select')
                      setShowEmployeeSelection(true)
                      setSelectedEmployee(null)
                      loadAvailableEmployees()
                    }}
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Select from Employees
                  </Button>
                </div>
              </div>

              {userCreationMode === 'select' && showEmployeeSelection ? (
                // Employee Selection View
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">Available Employees</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadAvailableEmployees}
                      disabled={employeesLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${employeesLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {employeesLoading ? (
                    <div className="text-center py-12">
                      <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
                      <p className="text-gray-500">Loading available employees...</p>
                    </div>
                  ) : availableEmployees.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {availableEmployees.map((employee) => (
                        <Card 
                          key={employee.employee_code} 
                          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                          onClick={() => handleEmployeeSelect(employee)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">
                                  {employee.employee_name?.charAt(0) || employee.employee_code}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{employee.employee_name}</p>
                                <p className="text-sm text-gray-500">Code: {employee.employee_code}</p>
                                <p className="text-xs text-gray-400">{employee.department} • {employee.designation}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No employees available for user creation</p>
                      <p className="text-sm text-gray-400">All employees may already have user accounts</p>
                    </div>
                  )}
                </div>
              ) : userCreationMode === 'select' && !showEmployeeSelection ? (
                // User Creation Form View (from Employee Selection)
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">Create Account for Employee</h4>
                    <Button 
                      variant="outline" 
                      onClick={resetEmployeeSelection}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Employee Selection
                    </Button>
                  </div>
                  {/* Selected Employee Info */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-lg">
                            {selectedEmployee?.employee_name?.charAt(0) || selectedEmployee?.employee_code}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Selected Employee: {selectedEmployee?.employee_name}</p>
                          <p className="text-sm text-gray-600">Code: {selectedEmployee?.employee_code} • {selectedEmployee?.department} • {selectedEmployee?.designation}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                    <CardDescription>Enter user profile information and credentials.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="new-user-full-name">Full Name</Label>
                      <Input
                        id="new-user-full-name"
                        placeholder="John Doe"
                        value={newUser.full_name}
                        onChange={(event) => setNewUser((prev) => ({ ...prev, full_name: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-user-email">Email Address</Label>
                      <Input
                        id="new-user-email"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={newUser.email}
                        onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="new-user-password">Password</Label>
                        <Input
                          id="new-user-password"
                          type="password"
                          placeholder="Minimum 8 characters"
                          value={newUser.password}
                          onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-user-password-confirm">Confirm Password</Label>
                        <Input
                          id="new-user-password-confirm"
                          type="password"
                          placeholder="Re-enter password"
                          value={newUserConfirmPassword}
                          onChange={(event) => setNewUserConfirmPassword(event.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-user-notes">Notes (optional)</Label>
                      <Textarea
                        id="new-user-notes"
                        placeholder="Add internal notes or onboarding details."
                        value={newUser.notes}
                        onChange={(event) => setNewUser((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle>Role & Permissions</CardTitle>
                    <CardDescription>Select a role to preview default access.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="new-user-role">Role</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger id="new-user-role" className="mt-1">
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="monitor">Monitor</SelectItem>
                          <SelectItem value="attendance">Attendance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Default Permissions</h4>
                      <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                        {(roleProfilesOriginal[newUser.role] || []).length > 0 ? (
                          (roleProfilesOriginal[newUser.role] || []).map((permissionKey) => {
                            const permission = permissionDictionary[permissionKey]
                            if (!permission) return null
                            return (
                              <div key={permissionKey} className="flex items-start gap-3">
                                <ShieldCheck className="mt-1 h-4 w-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{permission.label}</p>
                                  <p className="text-xs text-gray-600">{permission.description}</p>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-sm text-gray-500">No default permissions configured for this role yet.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewUser({
                      email: '',
                      password: '',
                      full_name: '',
                      role: 'operator',
                      customPermissions: [],
                      notes: '',
                      employee_code: '',
                      department: '',
                      designation: ''
                    })
                    setNewUserConfirmPassword('')
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={async () => {
                    // FIXED USER CREATION - DIRECT API CALL
                    console.log('🚀 USING DIRECT API CALL - BYPASSING ALL ISSUES!')
                    
                    try {
                      const response = await fetch('/api/admin/user-creation-requests', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          full_name: newUser.full_name,
                          email: newUser.email,
                          password: newUser.password,
                          role: newUser.role,
                          employee_code: newUser.employee_code || null,
                          department: newUser.department || null,
                          designation: newUser.designation || null,
                          actorId: 'admin'
                        })
                      })

                      const result = await response.json()

                      if (response.ok && result.success) {
                        alert(`✅ SUCCESS! User creation request submitted for ${newUser.full_name}!

Request ID: ${result.request_id}

An administrator will process this request and create the user account.`)
                        
                        // Auto-process pending requests so the user appears immediately
                        try {
                          await fetch('/api/admin/process-simple-users', { method: 'POST' })
                        } catch (e) {
                          console.warn('Auto-process failed (non-blocking):', e)
                        }
                        
                        // Refresh user list without page reload
                        await fetchUsers()
                        
                        // Reset form
                        setNewUser({
                          email: '',
                          password: '',
                          full_name: '',
                          role: 'operator',
                          customPermissions: [],
                          notes: '',
                          employee_code: '',
                          department: '',
                          designation: ''
                        })
                        setNewUserConfirmPassword('')
                      } else {
                        throw new Error(result.error || 'Failed to submit request')
                      }
                    } catch (error) {
                      console.error('Request failed:', error)
                      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    }
                  }}
                  disabled={!newUser.email || !newUser.password || newUser.password !== newUserConfirmPassword}
                >
                  <Save className="mr-2 h-4 w-4" />
                  🚀 Create User Account (FIXED)
                </Button>
              </div>
                </div>
              ) : userCreationMode === 'manual' ? (
                // Manual Entry Form
                <div className="space-y-6">
                  <h4 className="text-lg font-medium text-gray-900">Manual User Creation</h4>
                  
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card className="border border-gray-200">
                      <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>Enter all user information manually.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="manual-full-name">Full Name</Label>
                          <Input
                            id="manual-full-name"
                            placeholder="John Doe"
                            value={newUser.full_name}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, full_name: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="manual-email">Email Address</Label>
                          <Input
                            id="manual-email"
                            type="email"
                            placeholder="john.doe@example.com"
                            value={newUser.email}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="manual-password">Password</Label>
                            <Input
                              id="manual-password"
                              type="password"
                              placeholder="Minimum 8 characters"
                              value={newUser.password}
                              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="manual-password-confirm">Confirm Password</Label>
                            <Input
                              id="manual-password-confirm"
                              type="password"
                              placeholder="Re-enter password"
                              value={newUserConfirmPassword}
                              onChange={(event) => setNewUserConfirmPassword(event.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="manual-employee-code">Employee Code (Optional)</Label>
                          <Input
                            id="manual-employee-code"
                            placeholder="EMP001"
                            value={newUser.employee_code}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, employee_code: event.target.value }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardHeader>
                        <CardTitle>Role & Additional Info</CardTitle>
                        <CardDescription>Select role and add optional details.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="manual-role">Role</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                          >
                            <SelectTrigger id="manual-role" className="mt-1">
                              <SelectValue placeholder="Choose a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="operator">Operator</SelectItem>
                              <SelectItem value="monitor">Monitor</SelectItem>
                              <SelectItem value="attendance">Attendance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="manual-department">Department (Optional)</Label>
                          <Input
                            id="manual-department"
                            placeholder="Engineering"
                            value={newUser.department}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, department: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="manual-designation">Designation (Optional)</Label>
                          <Input
                            id="manual-designation"
                            placeholder="Software Engineer"
                            value={newUser.designation}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, designation: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="manual-notes">Notes (Optional)</Label>
                          <Textarea
                            id="manual-notes"
                            placeholder="Add internal notes or onboarding details."
                            value={newUser.notes}
                            onChange={(event) => setNewUser((prev) => ({ ...prev, notes: event.target.value }))}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewUser({
                          email: '',
                          password: '',
                          full_name: '',
                          role: 'operator',
                          customPermissions: [],
                          notes: '',
                          employee_code: '',
                          department: '',
                          designation: ''
                        })
                        setNewUserConfirmPassword('')
                      }}
                    >
                      Clear Form
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        // FIXED USER CREATION - DIRECT API CALL (MANUAL FORM)
                        console.log('🚀 MANUAL FORM - USING DIRECT API CALL!')
                        
                        try {
                          const response = await fetch('/api/admin/user-creation-requests', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              full_name: newUser.full_name,
                              email: newUser.email,
                              password: newUser.password,
                              role: newUser.role,
                              employee_code: newUser.employee_code || null,
                              department: newUser.department || null,
                              designation: newUser.designation || null,
                              notes: newUser.notes || null,
                              actorId: 'admin'
                            })
                          })

                          const result = await response.json()

                          if (response.ok && result.success) {
                            alert(`✅ SUCCESS! User creation request submitted for ${newUser.full_name}!

Request ID: ${result.request_id}

An administrator will process this request and create the user account.`)
                            
                            // Auto-process pending requests so the user appears immediately
                            try {
                              await fetch('/api/admin/process-simple-users', { method: 'POST' })
                            } catch (e) {
                              console.warn('Auto-process failed (non-blocking):', e)
                            }
                            
                            // Refresh user list without page reload
                            await fetchUsers()
                            
                            // Reset form
                            setNewUser({
                              email: '',
                              password: '',
                              full_name: '',
                              role: 'operator',
                              customPermissions: [],
                              notes: '',
                              employee_code: '',
                              department: '',
                              designation: ''
                            })
                            setNewUserConfirmPassword('')
                          } else {
                            throw new Error(result.error || 'Failed to submit request')
                          }
                        } catch (error) {
                          console.error('Request failed:', error)
                          alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                        }
                      }}
                      disabled={!newUser.email || !newUser.full_name || !newUser.password || newUser.password !== newUserConfirmPassword}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      🚀 Create User Account (FIXED)
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        )}

        {userManagementSection === 'role-profiles' && (
          <>
            <Card className="shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Role Profiles</h3>
                    <p className="text-gray-600">Customize default access packages for each role.</p>
                  </div>
                  {dirtyRoles.size > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {dirtyRoles.size} role(s) modified
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {Object.entries(roleProfilesDrafts).map(([roleKey, permissions]) => {
                    const isEditing = editingRoles.has(roleKey)
                    const isDirty = dirtyRoles.has(roleKey)
                    const roleMetadata = defaultRoleMetadata[roleKey]
                    
                    return (
                      <Card 
                        key={roleKey} 
                        className={`border transition-all ${
                          isDirty 
                            ? 'border-l-4 border-l-blue-500 border-blue-200 bg-blue-50/30' 
                            : 'border-gray-200'
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={roleBadgeVariants[roleKey] || 'bg-gray-100 text-gray-700 border-gray-200'}>
                                {roleMetadata?.label || roleKey.replace('_', ' ')}
                              </Badge>
                              {isDirty && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                  Modified
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isEditing ? "default" : "outline"}
                              onClick={() => toggleRoleEdit(roleKey)}
                            >
                              {isEditing ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  Done
                                </>
                              ) : (
                                <>
                                  <Settings className="w-3 h-3 mr-1" />
                                  Customize
                                </>
                              )}
                            </Button>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{roleMetadata?.label || roleKey.replace('_', ' ')}</CardTitle>
                            <CardDescription>
                              {isEditing 
                                ? `Editing permissions for ${roleMetadata?.label || roleKey} role`
                                : roleMetadata?.description || 'Permissions automatically granted to this role.'
                              }
                            </CardDescription>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {isEditing ? (
                            <>
                              {/* Edit Mode: Permission Checkboxes */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">
                                    Permissions ({permissions.length} selected)
                                  </span>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => selectAllRolePermissions(roleKey)}
                                      className="text-xs"
                                    >
                                      Select All
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => clearAllRolePermissions(roleKey)}
                                      className="text-xs"
                                    >
                                      Clear All
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => resetRoleToDefaults(roleKey)}
                                      className="text-xs"
                                    >
                                      Reset
                                    </Button>
                                  </div>
                                </div>

                                {/* Group permissions by category */}
                                {Object.entries(
                                  Object.entries(permissionDictionary).reduce((groups, [code, meta]) => {
                                    if (!groups[meta.group]) groups[meta.group] = []
                                    groups[meta.group].push(code)
                                    return groups
                                  }, {} as Record<string, string[]>)
                                ).map(([groupName, groupPermissions]) => (
                                  <div key={groupName} className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                                      {groupName}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                      {groupPermissions.map((permissionCode) => {
                                        const permission = permissionDictionary[permissionCode]
                                        const isChecked = permissions.includes(permissionCode)
                                        
                                        return (
                                          <label
                                            key={permissionCode}
                                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleRolePermission(roleKey, permissionCode)}
                                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-gray-900">{permission.label}</p>
                                              <p className="text-xs text-gray-600">{permission.description}</p>
                                            </div>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* View Mode: Permission List */}
                              {permissions.length > 0 ? (
                                permissions.map((permissionKey) => {
                                  const permission = permissionDictionary[permissionKey]
                                  if (!permission) return null
                                  return (
                                    <div key={permissionKey} className="flex items-start gap-3">
                                      <Shield className="mt-1 h-4 w-4 text-blue-600" />
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">{permission.label}</p>
                                        <p className="text-xs text-gray-600">{permission.description}</p>
                                      </div>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="text-center py-6">
                                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No permissions assigned to this role</p>
                                  <p className="text-xs text-gray-400">Click "Customize" to add permissions</p>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* Global Save Banner */}
            {dirtyRoles.size > 0 && (
              <Card className="sticky bottom-4 border-2 border-blue-300 bg-blue-50 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">
                          You have unsaved changes to {dirtyRoles.size} role(s)
                        </p>
                        <p className="text-sm text-blue-700">
                          Save your changes to update role defaults for new users
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={cancelAllRoleEdits}
                        disabled={savingRoleProfiles}
                      >
                        Cancel All Changes
                      </Button>
                      <Button
                        onClick={saveAllRoleProfiles}
                        disabled={savingRoleProfiles}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {savingRoleProfiles ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}


        {userManagementSection === 'attendance-sync' && (
          <Card className="shadow-lg rounded-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Attendance Sync</h3>
                  <p className="text-gray-600">Sync attendance data from SmartOffice device to cloud database.</p>
                </div>
                <div className="flex items-center gap-2">
                  {syncStatus === 'syncing' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Syncing...</span>
                    </div>
                  )}
                  {syncStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Success</span>
                    </div>
                  )}
                  {syncStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">Error</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Status Message */}
              {syncMessage && (
                <div className={`p-4 rounded-lg border ${
                  syncStatus === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  syncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <p className="text-sm">{syncMessage}</p>
                  {lastSyncTime && (
                    <p className="text-xs mt-1 opacity-75">Last sync: {lastSyncTime}</p>
                  )}
                </div>
              )}

              {/* Attendance Statistics */}
              {attendanceStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Employees</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceStats.statistics?.totalEmployees || 0}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Present Today</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceStats.statistics?.presentToday || 0}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Absent Today</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceStats.statistics?.absentToday || 0}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Avg Hours</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceStats.statistics?.avgHours || '0.0'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Sync Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Manual Sync</h4>
                  <p className="text-gray-600 mb-4">Sync recent attendance data from the last 24 hours.</p>
                  <Button 
                    onClick={() => performManualSync('manual')}
                    disabled={syncStatus === 'syncing'}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </Button>
                </Card>

                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Historical Sync</h4>
                  <p className="text-gray-600 mb-4">Extract all previous data from the device.</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          defaultValue="2025-01-01"
                          id="fromDate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To Date</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          id="toDate"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        const fromDate = (document.getElementById('fromDate') as HTMLInputElement)?.value
                        const toDate = (document.getElementById('toDate') as HTMLInputElement)?.value
                        performManualSync('historical', fromDate, toDate)
                      }}
                      disabled={syncStatus === 'syncing'}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Extract Historical Data
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Device Status */}
              {attendanceStats?.deviceStatus && (
                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Device Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Device ID</p>
                      <p className="font-medium">{attendanceStats.deviceStatus.device_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Sync</p>
                      <p className="font-medium">
                        {attendanceStats.deviceStatus.last_sync 
                          ? new Date(attendanceStats.deviceStatus.last_sync).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge 
                        variant="outline" 
                        className={
                          attendanceStats.deviceStatus.status === 'online' 
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }
                      >
                        {attendanceStats.deviceStatus.status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent Logs */}
              {attendanceStats?.recentLogs && attendanceStats.recentLogs.length > 0 && (
                <Card className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Logs</h4>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {attendanceStats.recentLogs.slice(0, 10).map((log: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {log.employee_code}
                            </Badge>
                            <span className="text-sm font-medium">{log.punch_direction}</span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {new Date(log.log_date).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        )}

        {userManagementSection === 'activity-logging' && (
          <Card className="shadow-lg rounded-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Activity Logging</h3>
                  <p className="text-gray-600">View all system activity logs and user unlock data from the entire system.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fetchAllActivityLogs()}
                    disabled={allLogsLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${allLogsLoading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportActivityLogs()}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Activity Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Activities</p>
                      <p className="text-2xl font-bold text-gray-900">{activityStats?.totalActivities || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">{activityStats?.activeUsers || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Deletions</p>
                      <p className="text-2xl font-bold text-gray-900">{activityStats?.deletions || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Permission Changes</p>
                      <p className="text-2xl font-bold text-gray-900">{activityStats?.permissionChanges || 0}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={activityFilters.userId}
                      onChange={(e) => setActivityFilters(prev => ({ ...prev, userId: e.target.value }))}
                    >
                      <option value="">All Users</option>
                      {userPermissionsData?.users?.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={activityFilters.action}
                      onChange={(e) => setActivityFilters(prev => ({ ...prev, action: e.target.value }))}
                    >
                      <option value="">All Activities</option>
                      <option value="user_deletion">User Deletions</option>
                      <option value="role_change">Role Changes</option>
                      <option value="permission_grant">Permission Grants</option>
                      <option value="permission_revoke">Permission Revokes</option>
                      <option value="login">User Logins</option>
                      <option value="logout">User Logouts</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={activityFilters.fromDate}
                      onChange={(e) => setActivityFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={activityFilters.toDate}
                      onChange={(e) => setActivityFilters(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    size="sm"
                    onClick={() => applyActivityFilters()}
                    disabled={allLogsLoading}
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Apply Filters
                  </Button>
                </div>
              </Card>

              {/* Activity Logs Display */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">System Activity Logs</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Showing {filteredActivityLogs.length} of {allActivityLogs.length} activities</span>
                  </div>
                </div>
                
                {allLogsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <span className="ml-3 text-gray-500">Loading all activity logs...</span>
                  </div>
                ) : filteredActivityLogs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredActivityLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          log.action === 'role_change' ? 'bg-blue-500' :
                          log.action === 'permission_grant' ? 'bg-green-500' :
                          log.action === 'permission_revoke' ? 'bg-orange-500' :
                          log.action === 'user_deletion' ? 'bg-red-600' :
                          log.action === 'user_deletion_completed' ? 'bg-red-700' :
                          log.action === 'login' ? 'bg-emerald-500' :
                          log.action === 'logout' ? 'bg-gray-500' :
                          'bg-gray-400'
                        }`}></div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {log.description || `${log.action.replace('_', ' ').toUpperCase()} Activity`}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {log.actor?.full_name || log.actor?.email || 'System'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                                {log.ip && (
                                  <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {log.ip}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                log.action === 'user_deletion' ? 'bg-red-50 text-red-700 border-red-200' :
                                log.action === 'role_change' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                log.action === 'permission_grant' ? 'bg-green-50 text-green-700 border-green-200' :
                                log.action === 'permission_revoke' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {log.action.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {/* Activity Details */}
                          {log.details && (
                            <div className="mt-3 p-3 bg-white rounded border text-xs">
                              {log.action === 'user_deletion' && log.details.deleted_user && (
                                <div className="space-y-1">
                                  <div className="font-medium text-red-800">🗑️ Deleted User Details:</div>
                                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                                    <div><strong>Name:</strong> {log.details.deleted_user.full_name}</div>
                                    <div><strong>Email:</strong> {log.details.deleted_user.email}</div>
                                    <div><strong>Role:</strong> {log.details.deleted_user.role || 'None'}</div>
                                    <div><strong>Department:</strong> {log.details.deleted_user.department || 'None'}</div>
                                  </div>
                                </div>
                              )}
                              {log.action === 'role_change' && log.details.new_role && (
                                <div>
                                  <strong>Role Changed To:</strong> {log.details.new_role}
                                </div>
                              )}
                              {(log.action === 'permission_grant' || log.action === 'permission_revoke') && log.details.permission && (
                                <div>
                                  <strong>Permission:</strong> {log.details.permission}
                                </div>
                              )}
                              {log.details.message && (
                                <div className="mt-2 text-gray-600">
                                  {log.details.message}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs Found</h3>
                    <p className="text-gray-500">
                      {allActivityLogs.length === 0 
                        ? "No system activities have been logged yet."
                        : "No activities match your current filters. Try adjusting the filter criteria."
                      }
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </Card>
        )}
      </div>
    )
  }

  const renderAccountView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
          <p className="text-gray-600">Manage your account and profile</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <User className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Account View</h3>
            <p className="text-gray-600">Detailed account management interface will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarOpen ? 'w-64' : 'w-20'}
            bg-white shadow-lg transition-all duration-300 flex flex-col`}>
          {/* Logo */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/Epsilologo.svg" 
                  alt="Epsilon Scheduling Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              {sidebarOpen && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Epsilon Scheduling</h2>
                  <p className="text-xs text-gray-500">Admin Control Center</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            {sidebarItems.map((section) => (
              <div key={section.category} className="mb-6">
                {sidebarOpen && (
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.category}
                  </h3>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeSection === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSidebarItemClick(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                          ${isActive ? 'bg-blue-50 text-blue-700 font-medium border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-100'}
                          ${!sidebarOpen ? 'justify-center px-3' : ''}
                        `}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        {sidebarOpen && <span className="truncate">{item.label}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Collapse Button */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-0" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {sidebarItems.flatMap(s => s.items).find(item => item.id === activeSection)?.label || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600">
                  {userEmail && `Welcome back, ${userEmail}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => fetchUserPermissions()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userEmail || 'admin'}`} />
                    <AvatarFallback>{getInitials({ email: userEmail })}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {userEmail || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getCurrentUser()?.role?.name ? 
                      getCurrentUser()?.role?.name.charAt(0).toUpperCase() + getCurrentUser()?.role?.name.slice(1) 
                      : 'User'
                    }
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            {renderDashboardContent()}
          </main>
        </div>
      </div>

    </ProtectedRoute>
  )
}