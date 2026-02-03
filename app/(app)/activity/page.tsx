"use client"

import { useState } from 'react'
import {
  ZohoCard,
  ZohoButton,
  ZohoBadge
} from '../components/zoho-ui'
import {
  Activity,
  Clock,
  User,
  Settings,
  FileText,
  RefreshCw,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { ProtectedPage } from '@/components/auth/ProtectedPage'

interface ActivityLog {
  id: string
  user: string
  action: string
  details: string
  timestamp: string
  type: 'success' | 'warning' | 'error' | 'info'
}

function ActivityPageContent() {
  const [activities] = useState<ActivityLog[]>([
    {
      id: '1',
      user: 'John Doe',
      action: 'Started Task',
      details: 'Started machining operation on VMC 1 for Part PN-001',
      timestamp: '2 minutes ago',
      type: 'success'
    },
    {
      id: '2',
      user: 'Jane Smith',
      action: 'Updated Schedule',
      details: 'Modified production schedule for next week',
      timestamp: '15 minutes ago',
      type: 'info'
    },
    {
      id: '3',
      user: 'Mike Johnson',
      action: 'Completed Task',
      details: 'Finished drilling operation on VMC 3 for Part PN-003',
      timestamp: '30 minutes ago',
      type: 'success'
    },
    {
      id: '4',
      user: 'System',
      action: 'Machine Alert',
      details: 'VMC 7 temperature exceeded normal range',
      timestamp: '1 hour ago',
      type: 'warning'
    },
    {
      id: '5',
      user: 'Sarah Williams',
      action: 'Quality Check',
      details: 'Performed quality inspection on Batch B-2024-001',
      timestamp: '2 hours ago',
      type: 'success'
    },
    {
      id: '6',
      user: 'System',
      action: 'Machine Offline',
      details: 'VMC 10 went offline unexpectedly',
      timestamp: '3 hours ago',
      type: 'error'
    },
    {
      id: '7',
      user: 'Tom Brown',
      action: 'Maintenance',
      details: 'Scheduled maintenance for VMC 9',
      timestamp: '4 hours ago',
      type: 'info'
    },
    {
      id: '8',
      user: 'Admin',
      action: 'User Added',
      details: 'Added new operator account for David Lee',
      timestamp: '5 hours ago',
      type: 'info'
    },
  ])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-[#28A745]" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-[#FD7E14]" />
      case 'error': return <XCircle className="w-5 h-5 text-[#DC3545]" />
      case 'info': return <Activity className="w-5 h-5 text-[#2C7BE5]" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-[#28A745]/10'
      case 'warning': return 'bg-[#FD7E14]/10'
      case 'error': return 'bg-[#DC3545]/10'
      case 'info': return 'bg-[#2C7BE5]/10'
      default: return 'bg-[#95AAC9]/10'
    }
  }

  const todayActivities = activities.filter(a => a.timestamp.includes('minutes') || a.timestamp.includes('hour')).length

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#2C7BE5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#12263F] dark:text-white">Activity Log</h1>
              <p className="text-[#95AAC9] mt-1">Track all system activities and user actions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ZohoButton
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
            >
              Filter
            </ZohoButton>
            <ZohoButton
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </ZohoButton>
            <ZohoButton
              variant="primary"
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </ZohoButton>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Total Activities</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{activities.length}</p>
              </div>
              <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#2C7BE5]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Today</p>
                <p className="text-2xl font-bold text-[#28A745]">{todayActivities}</p>
              </div>
              <div className="w-10 h-10 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#28A745]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Success</p>
                <p className="text-2xl font-bold text-[#28A745]">{activities.filter(a => a.type === 'success').length}</p>
              </div>
              <div className="w-10 h-10 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#28A745]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Errors</p>
                <p className="text-2xl font-bold text-[#DC3545]">{activities.filter(a => a.type === 'error').length}</p>
              </div>
              <div className="w-10 h-10 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#DC3545]" />
              </div>
            </div>
          </ZohoCard>
        </div>

        {/* Activity Timeline */}
        <ZohoCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Recent Activity</h3>
              <p className="text-sm text-[#95AAC9]">Latest system and user activities</p>
            </div>
          </div>

          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="relative">
                {/* Timeline Line */}
                {index !== activities.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-[#E3E6F0] dark:bg-gray-700"></div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${getActivityBgColor(activity.type)} rounded-lg flex items-center justify-center flex-shrink-0 relative z-10`}>
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[#12263F] dark:text-white">{activity.action}</h4>
                          <span className="text-xs text-[#95AAC9]">by {activity.user}</span>
                        </div>
                        <p className="text-sm text-[#95AAC9] mb-2">{activity.details}</p>
                        <div className="flex items-center gap-2 text-xs text-[#95AAC9]">
                          <Clock className="w-3 h-3" />
                          <span>{activity.timestamp}</span>
                        </div>
                      </div>
                      <ZohoBadge
                        variant={
                          activity.type === 'success' ? 'success' :
                            activity.type === 'warning' ? 'warning' :
                              activity.type === 'error' ? 'danger' : 'primary'
                        }
                        size="sm"
                      >
                        {activity.type}
                      </ZohoBadge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ZohoCard>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  return (
    <ProtectedPage module="system_administration" item="Activity Logging" permission="view">
      <ActivityPageContent />
    </ProtectedPage>
  )
}
