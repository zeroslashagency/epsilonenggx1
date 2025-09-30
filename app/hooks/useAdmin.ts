import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/app/services/supabase-client'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  role_badge: string
  roles: any[]
  status: string
  created_at: string
  updated_at: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions?: Permission[]
}

interface Permission {
  id: string
  code: string
  description: string
}

interface AuditLog {
  id: string
  actor_id: string
  target_id: string
  action: string
  meta_json: any
  ip: string
  created_at: string
  actor?: {
    email: string
    full_name: string
  }
}

export function useAdmin() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingUsers, setFetchingUsers] = useState(false)
  const [fetchingRoles, setFetchingRoles] = useState(false)
  const [fetchingAudit, setFetchingAudit] = useState(false)

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    if (fetchingUsers) return // Prevent multiple simultaneous calls
    
    try {
      setFetchingUsers(true)
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      
      if (result.success) {
        setUsers(result.data.users)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setFetchingUsers(false)
      setLoading(false)
    }
  }, [fetchingUsers])

  // Fetch roles and permissions
  const fetchRoles = useCallback(async () => {
    if (fetchingRoles) return // Prevent multiple simultaneous calls
    
    try {
      setFetchingRoles(true)
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/roles')
      const result = await response.json()
      
      if (result.success) {
        setRoles(result.data.roles)
        setPermissions(result.data.permissions)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roles')
    } finally {
      setFetchingRoles(false)
      setLoading(false)
    }
  }, [fetchingRoles])

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (filters: any = {}) => {
    if (fetchingAudit) return // Prevent multiple simultaneous calls
    
    try {
      setFetchingAudit(true)
      setLoading(true)
      setError(null)
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/admin/audit?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setAuditLogs(result.data.logs)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setFetchingAudit(false)
      setLoading(false)
    }
  }, [fetchingAudit])

  // Create new user
  const createUser = async (userData: {
    email: string
    password: string
    full_name: string
    role: string
    roles?: string[]
    scope?: any
  }) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchUsers() // Refresh users list
        return result.data.user
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update user
  const updateUser = async (userId: string, userData: {
    email?: string
    full_name?: string
    role?: string
    roles?: string[]
    scope?: any
    status?: string
  }) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, ...userData })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchUsers() // Refresh users list
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Deactivate user
  const deactivateUser = async (userId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchUsers() // Refresh users list
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Create new role
  const createRole = async (roleData: {
    name: string
    description: string
    permissions: string[]
  }) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchRoles() // Refresh roles list
        return result.data.role
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update role
  const updateRole = async (roleId: string, roleData: {
    name?: string
    description?: string
    permissions?: string[]
  }) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId, ...roleData })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchRoles() // Refresh roles list
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Check user permissions
  const hasPermission = (user: User, permission: string): boolean => {
    // Super admin has all permissions
    if (user.role === 'super_admin' || user.roles?.some(r => r.roles?.name === 'super_admin')) {
      return true
    }

    // Check role-based permissions
    return user.roles?.some(userRole => 
      userRole.roles?.permissions?.some((p: Permission) => p.code === permission)
    ) || false
  }

  // Generate temporary password
  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Clear error
  const clearError = () => setError(null)

  return {
    // State
    users,
    roles,
    permissions,
    auditLogs,
    loading,
    error,

    // Actions
    fetchUsers,
    fetchRoles,
    fetchAuditLogs,
    createUser,
    updateUser,
    deactivateUser,
    createRole,
    updateRole,
    hasPermission,
    generateTempPassword,
    clearError
  }
}
