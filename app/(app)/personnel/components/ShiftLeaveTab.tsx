'use client'

import { useState, useEffect } from 'react'
import { Clock, Sun, Moon, Sunset, Calendar, FileText, AlertCircle, CheckCircle, XCircle, TrendingUp } from 'lucide-react'

interface ShiftLeaveTabProps {
  employeeCode: string
  employeeName: string
}

interface ShiftSchedule {
  type: 'morning' | 'evening' | 'night'
  startTime: string
  endTime: string
  days: string[]
}

interface LeaveRecord {
  id: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: 'approved' | 'pending' | 'rejected'
  reason: string
}

interface OvertimeRecord {
  date: string
  hours: number
  approved: boolean
}

export default function ShiftLeaveTab({ employeeCode, employeeName }: ShiftLeaveTabProps) {
  const [currentShift, setCurrentShift] = useState<ShiftSchedule>({
    type: 'morning',
    startTime: '09:00',
    endTime: '17:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  })
  
  const [leaveBalance, setLeaveBalance] = useState({
    total: 20,
    used: 8,
    pending: 2,
    remaining: 10
  })

  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([
    {
      id: '1',
      type: 'Sick Leave',
      startDate: '2025-10-15',
      endDate: '2025-10-17',
      days: 3,
      status: 'approved',
      reason: 'Medical appointment'
    },
    {
      id: '2',
      type: 'Casual Leave',
      startDate: '2025-11-05',
      endDate: '2025-11-05',
      days: 1,
      status: 'pending',
      reason: 'Personal work'
    }
  ])

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([
    { date: '2025-11-01', hours: 2.5, approved: true },
    { date: '2025-11-03', hours: 3.0, approved: true },
    { date: '2025-11-06', hours: 1.5, approved: false }
  ])

  const [lateJustifications, setLateJustifications] = useState([
    {
      date: '2025-11-07',
      arrivalTime: '09:45',
      lateBy: '45 min',
      reason: 'Traffic jam',
      status: 'approved'
    },
    {
      date: '2025-11-04',
      arrivalTime: '09:15',
      lateBy: '15 min',
      reason: 'Public transport delay',
      status: 'pending'
    }
  ])

  const getShiftIcon = (type: string) => {
    switch (type) {
      case 'morning': return <Sun className="w-6 h-6" />
      case 'evening': return <Sunset className="w-6 h-6" />
      case 'night': return <Moon className="w-6 h-6" />
      default: return <Clock className="w-6 h-6" />
    }
  }

  const getShiftColor = (type: string) => {
    switch (type) {
      case 'morning': return 'from-yellow-500 to-orange-500'
      case 'evening': return 'from-orange-500 to-red-500'
      case 'night': return 'from-indigo-500 to-purple-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const totalOvertimeHours = overtimeRecords.reduce((sum, record) => sum + record.hours, 0)
  const approvedOvertimeHours = overtimeRecords.filter(r => r.approved).reduce((sum, record) => sum + record.hours, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-blue-600" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Shift & Leave</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your shifts, leaves, and overtime</p>
        </div>
      </div>

      {/* Current Shift Schedule */}
      <div className={`bg-gradient-to-br ${getShiftColor(currentShift.type)} rounded-xl p-6 text-white shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getShiftIcon(currentShift.type)}
            <h4 className="text-2xl font-bold capitalize">{currentShift.type} Shift</h4>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <span className="font-semibold">Current Schedule</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-sm opacity-75 mb-1">Start Time</div>
            <div className="text-2xl font-bold">{currentShift.startTime}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-sm opacity-75 mb-1">End Time</div>
            <div className="text-2xl font-bold">{currentShift.endTime}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-sm opacity-75 mb-1">Working Days</div>
            <div className="text-lg font-bold">{currentShift.days.length} days/week</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-sm opacity-75 mb-2">Schedule</div>
          <div className="flex flex-wrap gap-2">
            {currentShift.days.map(day => (
              <span key={day} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                {day}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg text-sm">
          <strong>Auto Late Calculation:</strong> Arrivals after {currentShift.startTime} are marked as late automatically
        </div>
      </div>

      {/* Leave Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-6 border-2 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span className="text-3xl font-bold text-blue-600">{leaveBalance.total}</span>
          </div>
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-300">Total Leaves</div>
          <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">Annual allocation</div>
        </div>

        <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-6 border-2 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-3xl font-bold text-green-600">{leaveBalance.remaining}</span>
          </div>
          <div className="text-sm font-semibold text-green-900 dark:text-green-300">Remaining</div>
          <div className="text-xs text-green-700 dark:text-green-400 mt-1">Available to use</div>
        </div>

        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-6 border-2 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-6 h-6 text-orange-600" />
            <span className="text-3xl font-bold text-orange-600">{leaveBalance.used}</span>
          </div>
          <div className="text-sm font-semibold text-orange-900 dark:text-orange-300">Used</div>
          <div className="text-xs text-orange-700 dark:text-orange-400 mt-1">This year</div>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-6 border-2 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <span className="text-3xl font-bold text-yellow-600">{leaveBalance.pending}</span>
          </div>
          <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">Pending</div>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Awaiting approval</div>
        </div>
      </div>

      {/* Leave Records */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Leave History
        </h4>

        <div className="space-y-3">
          {leaveRecords.map(leave => (
            <div key={leave.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{leave.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    leave.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    leave.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {leave.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  <span className="ml-2">• {leave.days} {leave.days === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Reason: {leave.reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overtime & Late Justifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overtime */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Overtime Hours
            </h4>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{approvedOvertimeHours}h</div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
          </div>

          <div className="space-y-2">
            {overtimeRecords.map((record, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(record.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {record.hours} hours
                  </div>
                </div>
                <div>
                  {record.approved ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-semibold">
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-xs font-semibold">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Overtime</span>
              <span className="font-bold text-gray-900 dark:text-white">{totalOvertimeHours} hours</span>
            </div>
          </div>
        </div>

        {/* Late Justifications */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Late Justifications
          </h4>

          <div className="space-y-2">
            {lateJustifications.map((justification, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(justification.date).toLocaleDateString()}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    justification.status === 'approved' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {justification.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Arrived: {justification.arrivalTime} (Late by {justification.lateBy})
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Reason: {justification.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-blue-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">{currentShift.type}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Shift</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">{leaveBalance.remaining}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Leaves Left</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">{approvedOvertimeHours}h</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">OT Approved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">{lateJustifications.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Late Entries</div>
          </div>
        </div>
      </div>
    </div>
  )
}
