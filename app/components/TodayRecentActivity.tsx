'use client'

import { Clock, User, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { ZohoBadge } from './zoho-ui'

interface ActivityLog {
  id: number
  employee_code: string
  employee_name?: string
  log_date: string
  punch_direction: string
  sync_time: string
}

interface TodayRecentActivityProps {
  data: ActivityLog[]
  onRefresh?: () => void
}

export default function TodayRecentActivity({ data, onRefresh }: TodayRecentActivityProps) {
  // Get today's logs and sort by time (most recent first)
  // Use LOCAL date, not UTC (fixes timezone issue)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`
  
  const todayLogs = data
    .filter(log => log.log_date.startsWith(today))
    .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
    // Show ALL today's activities (removed .slice(0, 10) limit)

  const getStatusIcon = (direction: string) => {
    return direction.toLowerCase() === 'in' 
      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
      : <XCircle className="w-4 h-4 text-blue-500" />
  }

  const getStatusBadge = (direction: string) => {
    return direction.toLowerCase() === 'in' 
      ? <ZohoBadge variant="success">Check In</ZohoBadge>
      : <ZohoBadge variant="info">Check Out</ZohoBadge>
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const logTime = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - logTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    return 'Earlier today'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Today's Recent Activity
          </h3>
          <p className="text-sm text-gray-600 mt-1">Latest punch activities from today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {todayLogs.length} activities today
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Refresh today's data"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {todayLogs.length > 0 ? (
        <div className="space-y-3">
          {todayLogs.map((log, index) => (
            <div 
              key={`${log.id}-${index}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(log.punch_direction)}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {log.employee_name || `Employee ${log.employee_code}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.employee_code}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {getStatusBadge(log.punch_direction)}
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatTime(log.log_date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTimeAgo(log.log_date)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Today</h3>
          <p className="text-gray-500">No punch records found for today</p>
        </div>
      )}
    </div>
  )
}
