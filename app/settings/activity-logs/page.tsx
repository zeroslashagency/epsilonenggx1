"use client"

import { useState, useEffect } from 'react'
import { Activity, RefreshCw, Download, Users, UserPlus, Shield, ArrowUpDown, Zap, Trash2, User } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZohoLayout } from '../../components/zoho-ui'

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

export default function ActivityLogsPage() {
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

  useEffect(() => {
    fetchActivityLogs()
  }, [])

  const fetchActivityLogs = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/admin/all-activity-logs')
      
      if (data.success) {
        setLogs(data.logs || [])
        setStats(data.stats || {
          totalActivities: 0,
          activeUsers: 0,
          deletions: 0,
          permissionChanges: 0,
          recentActivities: 0
        })
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
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

  const filteredLogs = logs.filter(log => {
    const matchesActionFilter = filterAction === 'all' || log.action === filterAction
    const matchesUserFilter = filterUser === 'all' || log.user_id === filterUser
    return matchesActionFilter && matchesUserFilter
  })

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
              <p className="text-sm text-[#95AAC9]">Showing {filteredLogs.length} of {stats.totalActivities} activities</p>
            </div>
          </div>

          <div className="divide-y divide-[#E3E6F0] dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-[#95AAC9]">
                Loading activity logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-[#95AAC9]">
                No activity logs found
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-[#12263F] dark:text-white">
                          {log.description}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#95AAC9] ml-5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.actor?.full_name || log.actor?.email || 'System'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {log.ip || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      {getActionBadge(log.action)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
