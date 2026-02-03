'use client'

import { useState, useEffect } from 'react'
import { FileText, AlertCircle, MessageSquare, Clock, CheckCircle, XCircle, Filter, Plus } from 'lucide-react'

interface ReportsTabProps {
  employeeCode: string
  employeeName: string
}

interface Complaint {
  id: string
  title: string
  category: string
  description: string
  submittedDate: string
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected'
  priority: 'low' | 'medium' | 'high'
  assignedTo?: string
  resolvedDate?: string
  resolution?: string
}

export default function ReportsTab({ employeeCode, employeeName }: ReportsTabProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([
    {
      id: '1',
      title: 'Attendance System Not Recording Punch',
      category: 'Technical Issue',
      description: 'The biometric system failed to record my check-in on November 5th. I arrived at 8:45 AM but the system shows no record.',
      submittedDate: '2025-11-05 09:30:00',
      status: 'resolved',
      priority: 'high',
      assignedTo: 'IT Support Team',
      resolvedDate: '2025-11-05 14:00:00',
      resolution: 'Manual attendance entry added. Biometric device was rebooted and is now functioning correctly.'
    },
    {
      id: '2',
      title: 'Incorrect Late Marking',
      category: 'Attendance Dispute',
      description: 'I was marked late on November 3rd, but I have proof of arriving at 8:50 AM. My manager approved early departure the previous day.',
      submittedDate: '2025-11-03 16:00:00',
      status: 'in-progress',
      priority: 'medium',
      assignedTo: 'HR Department'
    },
    {
      id: '3',
      title: 'Leave Request Not Reflected',
      category: 'Leave Management',
      description: 'My approved leave for November 10-12 is not showing in the system. I have the approval email from my manager.',
      submittedDate: '2025-11-02 10:15:00',
      status: 'pending',
      priority: 'medium'
    },
    {
      id: '4',
      title: 'Overtime Hours Not Calculated',
      category: 'Payroll Issue',
      description: 'I worked 3 extra hours on October 28th but it is not reflected in my overtime balance.',
      submittedDate: '2025-10-29 11:00:00',
      status: 'resolved',
      priority: 'high',
      assignedTo: 'Payroll Team',
      resolvedDate: '2025-10-30 15:30:00',
      resolution: 'Overtime hours added to your account. You now have 3 hours of approved overtime for October 28th.'
    },
    {
      id: '5',
      title: 'Unable to Access Mobile App',
      category: 'Technical Issue',
      description: 'The mobile attendance app keeps crashing when I try to punch in. Using Android 13.',
      submittedDate: '2025-11-07 08:00:00',
      status: 'in-progress',
      priority: 'high',
      assignedTo: 'IT Support Team'
    }
  ])

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'in-progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-orange-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'in-progress': return <AlertCircle className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const filteredComplaints = complaints.filter(complaint => {
    const statusMatch = filterStatus === 'all' || complaint.status === filterStatus
    const priorityMatch = filterPriority === 'all' || complaint.priority === filterPriority
    return statusMatch && priorityMatch
  })

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Complaints</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track and manage your issues and complaints</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Complaint
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-6 h-6" />
            <span className="text-3xl font-bold">{stats.total}</span>
          </div>
          <div className="text-sm opacity-90">Total Reports</div>
          <div className="text-xs opacity-75 mt-1">All time</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6" />
            <span className="text-3xl font-bold">{stats.pending}</span>
          </div>
          <div className="text-sm opacity-90">Pending</div>
          <div className="text-xs opacity-75 mt-1">Awaiting review</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-3xl font-bold">{stats.inProgress}</span>
          </div>
          <div className="text-sm opacity-90">In Progress</div>
          <div className="text-xs opacity-75 mt-1">Being handled</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-3xl font-bold">{stats.resolved}</span>
          </div>
          <div className="text-sm opacity-90">Resolved</div>
          <div className="text-xs opacity-75 mt-1">Completed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {filteredComplaints.map(complaint => (
          <div key={complaint.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-1 h-8 rounded ${getPriorityColor(complaint.priority)}`}></div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{complaint.title}</h4>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                    {complaint.category}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold flex items-center gap-1 ${getStatusColor(complaint.status)}`}>
                    {getStatusIcon(complaint.status)}
                    {complaint.status.replace('-', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    complaint.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    complaint.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {complaint.priority} priority
                  </span>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                <div>ID: #{complaint.id}</div>
                <div className="text-xs mt-1">{new Date(complaint.submittedDate).toLocaleString()}</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description:</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{complaint.description}</div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Submitted By</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{employeeName}</div>
              </div>
              {complaint.assignedTo && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Assigned To</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{complaint.assignedTo}</div>
                </div>
              )}
              {complaint.resolvedDate && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Resolved On</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(complaint.resolvedDate).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Resolution */}
            {complaint.resolution && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                <div className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Resolution:
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">{complaint.resolution}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredComplaints.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Complaints Found</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Try adjusting your filters or submit a new complaint</p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-blue-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">How to Submit a Complaint</h4>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>Click the "New Complaint" button at the top of the page</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>Select the appropriate category (Technical Issue, Attendance Dispute, Leave Management, etc.)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>Provide a clear title and detailed description of your issue</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>Attach any relevant documents or screenshots if needed</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-blue-600">5.</span>
            <span>Track your complaint status here - you'll receive updates as it progresses</span>
          </div>
        </div>
      </div>
    </div>
  )
}
