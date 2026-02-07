"use client"

import { useState } from 'react'
import {
  ZohoCard,
  ZohoButton,
  ZohoBadge
} from '@/app/components/zoho-ui'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Filter,
  RefreshCw
} from 'lucide-react'
import { ProtectedPage } from '@/components/auth/ProtectedPage'

interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  machine?: string
  timestamp: string
  read: boolean
}

function AlertsPageContent() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'critical',
      title: 'Machine VMC 10 Offline',
      message: 'VMC 10 has stopped responding and is currently offline',
      machine: 'VMC 10',
      timestamp: '2 minutes ago',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Temperature Alert',
      message: 'VMC 7 temperature exceeds normal operating range',
      machine: 'VMC 7',
      timestamp: '15 minutes ago',
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Maintenance Due',
      message: 'VMC 9 scheduled maintenance is due in 2 days',
      machine: 'VMC 9',
      timestamp: '1 hour ago',
      read: true
    },
    {
      id: '4',
      type: 'info',
      title: 'Production Target Reached',
      message: 'Daily production target of 1000 units has been achieved',
      timestamp: '2 hours ago',
      read: true
    },
    {
      id: '5',
      type: 'success',
      title: 'Quality Check Passed',
      message: 'Batch #B-2024-001 has passed all quality checks',
      timestamp: '3 hours ago',
      read: true
    },
  ])

  const [filterType, setFilterType] = useState<string>('all')

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <Info className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
  }

  const getAlertColor = (type: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' => {
    switch (type) {
      case 'critical': return 'danger'
      case 'warning': return 'warning'
      case 'info': return 'primary'
      case 'success': return 'success'
      default: return 'neutral'
    }
  }

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-[#DC3545]/10'
      case 'warning': return 'bg-[#FD7E14]/10'
      case 'info': return 'bg-[#2C7BE5]/10'
      case 'success': return 'bg-[#28A745]/10'
      default: return 'bg-[#95AAC9]/10'
    }
  }

  const filteredAlerts = filterType === 'all'
    ? alerts
    : alerts.filter(alert => alert.type === filterType)

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#DC3545]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#12263F] dark:text-white">System Alerts</h1>
            <p className="text-[#95AAC9] mt-1">Monitor and manage system notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ZohoButton
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </ZohoButton>
          <ZohoButton
            variant="primary"
            icon={<Filter className="w-4 h-4" />}
          >
            Filter
          </ZohoButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <ZohoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#95AAC9] mb-1">Total Alerts</p>
              <p className="text-2xl font-bold text-[#12263F] dark:text-white">{alerts.length}</p>
            </div>
            <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#2C7BE5]" />
            </div>
          </div>
        </ZohoCard>

        <ZohoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#95AAC9] mb-1">Unread</p>
              <p className="text-2xl font-bold text-[#DC3545]">{unreadCount}</p>
            </div>
            <div className="w-10 h-10 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#DC3545]" />
            </div>
          </div>
        </ZohoCard>

        <ZohoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#95AAC9] mb-1">Critical</p>
              <p className="text-2xl font-bold text-[#DC3545]">{alerts.filter(a => a.type === 'critical').length}</p>
            </div>
            <div className="w-10 h-10 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#DC3545]" />
            </div>
          </div>
        </ZohoCard>

        <ZohoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#95AAC9] mb-1">Warnings</p>
              <p className="text-2xl font-bold text-[#FD7E14]">{alerts.filter(a => a.type === 'warning').length}</p>
            </div>
            <div className="w-10 h-10 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#FD7E14]" />
            </div>
          </div>
        </ZohoCard>

        <ZohoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#95AAC9] mb-1">Info</p>
              <p className="text-2xl font-bold text-[#2C7BE5]">{alerts.filter(a => a.type === 'info').length}</p>
            </div>
            <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-[#2C7BE5]" />
            </div>
          </div>
        </ZohoCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg p-1">
        {['all', 'critical', 'warning', 'info', 'success'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${filterType === type
              ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm'
              : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <ZohoCard key={alert.id}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${getAlertBgColor(alert.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#12263F] dark:text-white">{alert.title}</h3>
                      {!alert.read && (
                        <div className="w-2 h-2 bg-[#DC3545] rounded-full"></div>
                      )}
                    </div>
                    <p className="text-sm text-[#95AAC9] mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-[#95AAC9]">
                      <span>{alert.timestamp}</span>
                      {alert.machine && (
                        <>
                          <span>•</span>
                          <span>{alert.machine}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZohoBadge variant={getAlertColor(alert.type)} size="sm">
                      {alert.type}
                    </ZohoBadge>
                    <button className="p-1 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded">
                      <X className="w-4 h-4 text-[#95AAC9]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ZohoCard>
        ))}
      </div>
    </div>
  )
}

export default function AlertsPage() {
  return (
    <ProtectedPage module="monitoring" item="Alerts" permission="view">
      <AlertsPageContent />
    </ProtectedPage>
  )
}
