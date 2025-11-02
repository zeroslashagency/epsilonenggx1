"use client"

import { useState, useEffect } from 'react'
import { apiGet } from '@/app/lib/utils/api-client'
import { DayDetailsModal } from './DayDetailsModal'

interface AttendanceLog {
  log_date: string
  punch_direction: string
  employee_code: string
  employee_name?: string
}

interface DayRecord {
  date: Date
  firstCheckIn: string | null
  allLogs: AttendanceLog[]
}

interface RecentAttendanceRecordsProps {
  employeeCode: string
  employeeName: string
  dateRange: string
  loading?: boolean
}

export function RecentAttendanceRecords({
  employeeCode,
  employeeName,
  dateRange,
  loading
}: RecentAttendanceRecordsProps) {
  const [records, setRecords] = useState<DayRecord[]>([])
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (employeeCode) {
      fetchRecords()
    }
  }, [employeeCode, dateRange])

  const fetchRecords = async () => {
    try {
      setLoadingData(true)
      
      // Calculate date range based on selected range
      const { fromDate, toDate } = calculateDateRange(dateRange)
      
      // Fetch attendance data for this employee
      const data = await apiGet(`/api/get-attendance?employeeCode=${employeeCode}&fromDate=${fromDate}&toDate=${toDate}`)
      
      if (data.success && data.data?.allLogs) {
        const logs = data.data.allLogs
        
        // Group logs by date
        const logsByDate: Record<string, AttendanceLog[]> = {}
        
        logs.forEach((log: AttendanceLog) => {
          const dateKey = new Date(log.log_date).toDateString()
          if (!logsByDate[dateKey]) {
            logsByDate[dateKey] = []
          }
          logsByDate[dateKey].push(log)
        })
        
        // Create records array
        const recordsArray: DayRecord[] = Object.entries(logsByDate).map(([dateKey, dayLogs]) => {
          const sortedLogs = dayLogs.sort((a, b) => 
            new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
          )
          
          const checkIns = sortedLogs.filter(l => l.punch_direction?.toLowerCase() === 'in')
          
          return {
            date: new Date(dateKey),
            firstCheckIn: checkIns.length > 0 ? checkIns[0].log_date : null,
            allLogs: sortedLogs
          }
        })
        
        // Sort by date descending (most recent first)
        recordsArray.sort((a, b) => b.date.getTime() - a.date.getTime())
        
        setRecords(recordsArray)
      } else {
        setRecords([])
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      setRecords([])
    } finally {
      setLoadingData(false)
    }
  }

  const calculateDateRange = (range: string) => {
    const now = new Date()
    let fromDate: string
    let toDate: string

    switch (range) {
      case 'today':
        fromDate = toDate = now.toISOString().split('T')[0]
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        fromDate = toDate = yesterday.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        fromDate = weekStart.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
        break
      case 'month':
      default:
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        fromDate = monthStart.toISOString().split('T')[0]
        toDate = now.toISOString().split('T')[0]
        break
    }

    return { fromDate, toDate }
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  if (loading || loadingData) {
    return (
      <div className="bg-gray-900 dark:bg-gray-900 bg-white rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📋 Recent Attendance Records
          </h3>
        </div>
        <div className="p-12 text-center">
          <div className="text-gray-600 dark:text-gray-400">Loading records...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📋 Recent Attendance Records
          </h3>
        </div>
        
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-600 dark:text-gray-400">No attendance records found for this period</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Check In
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr 
                  key={idx}
                  onClick={() => setSelectedDay(record)}
                  className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-gray-900 dark:text-white font-medium">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {formatFullDate(record.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {record.firstCheckIn ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                        🕐 {formatTime(record.firstCheckIn)}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-500">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedDay && (
        <DayDetailsModal
          date={selectedDay.date}
          employeeName={employeeName}
          logs={selectedDay.allLogs}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
