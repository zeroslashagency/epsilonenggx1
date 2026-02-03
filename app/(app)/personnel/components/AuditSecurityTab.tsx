'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, MapPin, Smartphone, Clock, User, Edit, Eye, AlertTriangle, CheckCircle } from 'lucide-react'

interface AuditSecurityTabProps {
  employeeCode: string
  employeeName: string
}

interface AuditLog {
  id: string
  timestamp: string
  action: string
  performedBy: string
  targetUser: string
  changes: string
  ipAddress: string
  device: string
  status: 'success' | 'failed' | 'warning'
}

interface DeviceInfo {
  id: string
  deviceName: string
  deviceType: string
  ipAddress: string
  location: string
  registered: string
  lastUsed: string
  status: 'active' | 'blocked'
}

export default function AuditSecurityTab({ employeeCode, employeeName }: AuditSecurityTabProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: '2025-11-08 09:15:23',
      action: 'Permission Changed',
      performedBy: 'Admin (admin@company.com)',
      targetUser: employeeName,
      changes: 'Changed role from "Employee" to "Team Lead" - Added permissions: [View Reports, Manage Team]',
      ipAddress: '192.168.1.105',
      device: 'Windows Desktop',
      status: 'success'
    },
    {
      id: '2',
      timestamp: '2025-11-07 14:30:12',
      action: 'Account Created',
      performedBy: 'HR Manager (hr@company.com)',
      targetUser: employeeName,
      changes: 'New user account created - Email: user@company.com - Initial role: Employee',
      ipAddress: '192.168.1.102',
      device: 'MacBook Pro',
      status: 'success'
    },
    {
      id: '3',
      timestamp: '2025-11-07 10:45:00',
      action: 'Attendance Modified',
      performedBy: 'Manager (manager@company.com)',
      targetUser: employeeName,
      changes: 'Manual attendance entry added for 2025-11-06 - Reason: System error during punch',
      ipAddress: '192.168.1.108',
      device: 'iPhone 14',
      status: 'success'
    },
    {
      id: '4',
      timestamp: '2025-11-06 16:20:45',
      action: 'Login Attempt',
      performedBy: 'Unknown',
      targetUser: employeeName,
      changes: 'Failed login attempt from unregistered device',
      ipAddress: '203.45.67.89',
      device: 'Unknown Android',
      status: 'failed'
    },
    {
      id: '5',
      timestamp: '2025-11-05 08:30:15',
      action: 'Password Changed',
      performedBy: employeeName,
      targetUser: employeeName,
      changes: 'User changed their password successfully',
      ipAddress: '192.168.1.105',
      device: 'Windows Desktop',
      status: 'success'
    }
  ])

  const [registeredDevices, setRegisteredDevices] = useState<DeviceInfo[]>([
    {
      id: '1',
      deviceName: 'Work Desktop',
      deviceType: 'Windows 11 Desktop',
      ipAddress: '192.168.1.105',
      location: 'Office - Floor 3',
      registered: '2025-10-01',
      lastUsed: '2025-11-08 09:15',
      status: 'active'
    },
    {
      id: '2',
      deviceName: 'Personal Phone',
      deviceType: 'iPhone 14 Pro',
      ipAddress: '192.168.1.120',
      location: 'Office WiFi',
      registered: '2025-10-15',
      lastUsed: '2025-11-07 17:30',
      status: 'active'
    },
    {
      id: '3',
      deviceName: 'Old Device',
      deviceType: 'Android Phone',
      ipAddress: '192.168.1.98',
      location: 'Unknown',
      registered: '2025-09-01',
      lastUsed: '2025-10-20 12:00',
      status: 'blocked'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <AlertTriangle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-600" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security & Audit Trail</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Complete transparency and device security</p>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Lock className="w-6 h-6" />
            <span className="text-3xl font-bold">{registeredDevices.filter(d => d.status === 'active').length}</span>
          </div>
          <div className="text-sm opacity-90">Active Devices</div>
          <div className="text-xs opacity-75 mt-1">Registered & approved</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-3xl font-bold">{auditLogs.filter(l => l.status === 'success').length}</span>
          </div>
          <div className="text-sm opacity-90">Successful Actions</div>
          <div className="text-xs opacity-75 mt-1">Last 30 days</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-3xl font-bold">{auditLogs.filter(l => l.status === 'failed').length}</span>
          </div>
          <div className="text-sm opacity-90">Failed Attempts</div>
          <div className="text-xs opacity-75 mt-1">Security alerts</div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" />
          Complete Audit Trail
        </h4>

        <div className="space-y-3">
          {auditLogs.map(log => (
            <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${getStatusColor(log.status)}`}>
                    {getStatusIcon(log.status)}
                    {log.status}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">{log.action}</div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {log.timestamp}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Performed by: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{log.performedBy}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Edit className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Target: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{log.targetUser}</span>
                  </div>
                </div>

                <div className="pl-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Changes Made:</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{log.changes}</div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    IP: {log.ipAddress}
                  </div>
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    {log.device}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered Devices */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-600" />
          Registered Devices & IP Lock
        </h4>

        <div className="space-y-3">
          {registeredDevices.map(device => (
            <div key={device.id} className={`p-4 rounded-lg border-2 ${
              device.status === 'active' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {device.deviceName}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      device.status === 'active' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {device.status === 'active' ? '✓ Active' : '✕ Blocked'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{device.deviceType}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">IP Address</div>
                  <div className="font-medium text-gray-900 dark:text-white">{device.ipAddress}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Location</div>
                  <div className="font-medium text-gray-900 dark:text-white">{device.location}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Registered</div>
                  <div className="font-medium text-gray-900 dark:text-white">{new Date(device.registered).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last Used</div>
                  <div className="font-medium text-gray-900 dark:text-white">{device.lastUsed}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Device & IP Lock Active:</strong> Punch-ins are restricted to registered devices and IP addresses only. 
              Any attempt from unregistered devices will be blocked and logged for security review.
            </div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-purple-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Security Features Enabled
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Complete Audit Trail</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Every action is logged with timestamp, user, IP, and device</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Device Registration</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Only approved devices can access the system</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">IP Address Lock</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Restrict access to specific IP ranges</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">Failed Login Detection</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Automatic blocking of suspicious activities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Activity Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Activity Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">5</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Actions</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">4</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Successful</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600">1</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Failed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">2</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Devices</div>
          </div>
        </div>
      </div>
    </div>
  )
}
