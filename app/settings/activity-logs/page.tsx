"use client"

import { useState, useEffect } from 'react'
import { Activity, Search, Filter, Download, Calendar, User, Shield, Clock, ChevronLeft, ChevronRight, UserPlus, Zap, RefreshCw, Users, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ZohoLayout } from '../../components/zoho-ui'
import { apiGet } from '@/app/lib/utils/api-client'
import { TableLoading, LoadingSpinner } from '@/components/ui/loading-spinner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

interface ActivityLog {
  id: string
  user_id: string
  target_user_id?: string
  action: string
  description: string
  timestamp: string
  ip: string
  details: any
  actor?: {
    full_name: string
    email: string
    role: string
  }
  target_user?: {
    full_name: string
    email: string
    role: string
  }
}

interface ActivityStats {
  totalActivities: number
  activeUsers: number
  deletions: number
  permissionChanges: number
  recentActivities: number
}

function ActivityLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats>({
    totalActivities: 0,
    activeUsers: 0,
    deletions: 0,
    permissionChanges: 0,
    recentActivities: 0
  })
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [activeTab, setActiveTab] = useState('activity-logging')
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchActivityLogs()
  }, [page, pageSize, filterAction, filterUser])

  const fetchActivityLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', pageSize.toString())
      if (filterAction !== 'all') params.append('action', filterAction)
      if (filterUser !== 'all') params.append('user', filterUser)
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      
      const data = await apiGet(`/api/admin/all-activity-logs?${params.toString()}`)
      
      if (data.success) {
        setLogs(data.logs || [])
        setStats(data.stats || {
          totalActivities: 0,
          activeUsers: 0,
          deletions: 0,
          permissionChanges: 0,
          recentActivities: 0
        })
        
        // Update pagination metadata
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1)
          setTotalCount(data.pagination.totalCount || 0)
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const styles = {
      user_deletion: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
      login: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
      logout: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      role_change: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
      user_created: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
      profile_update: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
    }

    const defaultStyle = 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
    const style = styles[action as keyof typeof styles] || defaultStyle

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${style}`}>
        {action.replace('_', ' ')}
      </span>
    )
  }

  // Filtering now handled server-side via API params
  const filteredLogs = logs

  const uniqueUsers = Array.from(new Set(logs.map(log => log.actor).filter(Boolean)))
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))

  return (
    <ZohoLayout>
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
              href="/settings/add-users"
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] transition-colors border-b-2 border-transparent"
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
              className="flex items-center gap-2 px-4 py-3 text-sm text-white bg-[#00A651] rounded-t transition-colors border-b-2 border-[#00A651]"
            >
              <Zap className="w-4 h-4" />
              Activity Logging
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Activity Logging</h1>
            <p className="text-[#95AAC9] mt-1">View all system activity logs and user unlock data from the entire system.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchActivityLogs}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Logs
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-[#12263F] dark:text-white border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <Activity className="w-6 h-6 text-[#2C7BE5]" />
              </div>
              <div>
                <p className="text-sm text-[#95AAC9]">Total Activities</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{stats.totalActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <Users className="w-6 h-6 text-[#00A651]" />
              </div>
              <div>
                <p className="text-sm text-[#95AAC9]">Active Users</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <Trash2 className="w-6 h-6 text-[#DC3545]" />
              </div>
              <div>
                <p className="text-sm text-[#95AAC9]">Deletions</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{stats.deletions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                <Shield className="w-6 h-6 text-[#6F42C1]" />
              </div>
              <div>
                <p className="text-sm text-[#95AAC9]">Permission Changes</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{stats.permissionChanges}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                Filter by User
              </label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map((user, index) => (
                  <option key={index} value={user?.full_name || user?.email}>
                    {user?.full_name || user?.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                Activity Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
              >
                <option value="all">All Activities</option>
                {uniqueActions.map((action, index) => (
                  <option key={index} value={action}>
                    {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#12263F] dark:text-white mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#00A651] text-white text-sm rounded hover:bg-green-600 transition-colors">
              <Zap className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded">
          <div className="p-6 border-b border-[#E3E6F0] dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#12263F] dark:text-white">System Activity Logs</h2>
              <div className="flex items-center gap-4">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-1 border border-[#E3E6F0] dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                >
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                  <option value="200">200 per page</option>
                </select>
                <p className="text-sm text-[#95AAC9]">
                  Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <LoadingSpinner text="Loading activity logs" />
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#95AAC9]">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border border-[#E3E6F0] dark:border-gray-700 rounded p-4 hover:border-[#2C7BE5] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Actor Information */}
                        {log.actor && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-[#2C7BE5] flex items-center justify-center text-white text-xs font-semibold">
                              {log.actor.full_name?.charAt(0) || log.actor.email?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#12263F] dark:text-white">
                                {log.actor.full_name || log.actor.email}
                              </p>
                              <p className="text-xs text-[#95AAC9]">
                                {log.actor.role}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Description */}
                        <p className="text-sm text-[#12263F] dark:text-white font-medium">{log.description}</p>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-[#95AAC9] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          {log.ip && log.ip !== 'unknown' && (
                            <p className="text-xs text-[#95AAC9]">
                              IP: {log.ip}
                            </p>
                          )}
                          {log.details?.creation_method && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[#95AAC9] rounded">
                              {log.details.creation_method.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Badge */}
                      {getActionBadge(log.action)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-[#E3E6F0] dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#95AAC9]">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#12263F] dark:text-white"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#12263F] dark:text-white"
                  >
                    Previous
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value)
                      if (newPage >= 1 && newPage <= totalPages) {
                        setPage(newPage)
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm text-center border border-[#E3E6F0] dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-[#12263F] dark:text-white"
                  />
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#12263F] dark:text-white"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border border-[#E3E6F0] dark:border-gray-700 rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#12263F] dark:text-white"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ZohoLayout>
  )
}

// Wrap with ProtectedRoute to require authentication
function ProtectedActivityLogsPage() {
  return (
    <ProtectedRoute requireRole={['Super Admin', 'Admin']}>
      <ActivityLogsPage />
    </ProtectedRoute>
  )
}

export default ProtectedActivityLogsPage
