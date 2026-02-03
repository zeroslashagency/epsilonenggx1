'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Clock, Target, Activity } from 'lucide-react'

interface AnalyticsTabProps {
  employeeCode: string
  employeeName: string
}

interface TrendData {
  period: string
  attendance: number
  punctuality: number
}

interface HeatmapData {
  hour: number
  count: number
}

export default function AnalyticsTab({ employeeCode, employeeName }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(false)

  // Employee stats
  const employeeStats = {
    attendanceRate: 95,
    punctualityRate: 88,
    avgCheckInTime: '08:45',
    totalDays: 20
  }

  // Team averages
  const teamStats = {
    attendanceRate: 92,
    punctualityRate: 85,
    avgCheckInTime: '08:55',
    totalDays: 18
  }

  // Department comparison
  const departmentComparison = [
    { department: 'Engineering', attendance: 94, punctuality: 90, employees: 25 },
    { department: 'Sales', attendance: 89, punctuality: 82, employees: 18 },
    { department: 'Marketing', attendance: 91, punctuality: 87, employees: 12 },
    { department: 'HR', attendance: 96, punctuality: 93, employees: 8 },
    { department: 'Finance', attendance: 93, punctuality: 88, employees: 10 }
  ]

  // Weekly trend data
  const weeklyTrend: TrendData[] = [
    { period: 'Week 1', attendance: 100, punctuality: 90 },
    { period: 'Week 2', attendance: 95, punctuality: 85 },
    { period: 'Week 3', attendance: 90, punctuality: 88 },
    { period: 'Week 4', attendance: 95, punctuality: 92 }
  ]

  // Monthly trend data
  const monthlyTrend: TrendData[] = [
    { period: 'Aug', attendance: 92, punctuality: 85 },
    { period: 'Sep', attendance: 94, punctuality: 87 },
    { period: 'Oct', attendance: 96, punctuality: 90 },
    { period: 'Nov', attendance: 95, punctuality: 88 }
  ]

  // Check-in time heatmap (hour of day)
  const checkInHeatmap: HeatmapData[] = [
    { hour: 7, count: 2 },
    { hour: 8, count: 12 },
    { hour: 9, count: 5 },
    { hour: 10, count: 1 },
    { hour: 11, count: 0 }
  ]

  const getComparisonColor = (employee: number, team: number) => {
    const diff = employee - team
    if (diff > 5) return 'text-green-600'
    if (diff > 0) return 'text-blue-600'
    if (diff > -5) return 'text-orange-600'
    return 'text-red-600'
  }

  const getComparisonIcon = (employee: number, team: number) => {
    return employee >= team ? '↑' : '↓'
  }

  const maxHeatmapCount = Math.max(...checkInHeatmap.map(h => h.count))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-purple-600" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Trends</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Comparative analytics and performance insights</p>
        </div>
      </div>

      {/* Peer Benchmarking */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Peer Benchmarking
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</span>
              <span className={`text-sm font-bold ${getComparisonColor(employeeStats.attendanceRate, teamStats.attendanceRate)}`}>
                {getComparisonIcon(employeeStats.attendanceRate, teamStats.attendanceRate)} {Math.abs(employeeStats.attendanceRate - teamStats.attendanceRate)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">You</span>
                <span className="text-lg font-bold text-blue-600">{employeeStats.attendanceRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${employeeStats.attendanceRate}%` }}></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Team Average</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{teamStats.attendanceRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${teamStats.attendanceRate}%` }}></div>
              </div>
            </div>
          </div>

          {/* Punctuality Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Punctuality Rate</span>
              <span className={`text-sm font-bold ${getComparisonColor(employeeStats.punctualityRate, teamStats.punctualityRate)}`}>
                {getComparisonIcon(employeeStats.punctualityRate, teamStats.punctualityRate)} {Math.abs(employeeStats.punctualityRate - teamStats.punctualityRate)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">You</span>
                <span className="text-lg font-bold text-green-600">{employeeStats.punctualityRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className="bg-green-600 h-3 rounded-full" style={{ width: `${employeeStats.punctualityRate}%` }}></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Team Average</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{teamStats.punctualityRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: `${teamStats.punctualityRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            <strong>Great job!</strong> You're performing above team average in both attendance and punctuality. Keep up the excellent work! 🎉
          </p>
        </div>
      </div>

      {/* Department Comparison */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Department-Level Comparison
        </h4>

        <div className="space-y-4">
          {departmentComparison.map((dept, idx) => (
            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{dept.department}</div>
                  <div className="text-xs text-gray-500">{dept.employees} employees</div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Attendance</div>
                    <div className="text-lg font-bold text-blue-600">{dept.attendance}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Punctuality</div>
                    <div className="text-lg font-bold text-green-600">{dept.punctuality}%</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${dept.attendance}%` }}></div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${dept.punctuality}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Weekly Trend
          </h4>

          <div className="space-y-4">
            {weeklyTrend.map((week, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{week.period}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-blue-600 font-semibold">{week.attendance}%</span>
                    <span className="text-green-600 font-semibold">{week.punctuality}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${week.attendance}%` }}></div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${week.punctuality}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Attendance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Punctuality</span>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Monthly Trend
          </h4>

          <div className="space-y-4">
            {monthlyTrend.map((month, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{month.period}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-blue-600 font-semibold">{month.attendance}%</span>
                    <span className="text-green-600 font-semibold">{month.punctuality}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${month.attendance}%` }}></div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${month.punctuality}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-green-600">Trending Up:</strong> Your attendance has improved by 4% over the last 4 months!
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Time Heatmap */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Check-in Time Heatmap
        </h4>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Distribution of your check-in times over the last 20 working days
          </div>

          <div className="space-y-3">
            {checkInHeatmap.map((data, idx) => {
              const intensity = (data.count / maxHeatmapCount) * 100
              const getColor = () => {
                if (intensity > 75) return 'bg-red-500'
                if (intensity > 50) return 'bg-orange-500'
                if (intensity > 25) return 'bg-yellow-500'
                return 'bg-green-500'
              }

              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {data.hour}:00 - {data.hour + 1}:00
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                    {data.count > 0 && (
                      <div 
                        className={`${getColor()} h-8 rounded-full transition-all flex items-center justify-end pr-3`}
                        style={{ width: `${intensity}%` }}
                      >
                        <span className="text-white text-xs font-bold">{data.count} days</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-yellow-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-green-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">Consistency Analysis</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  You typically check in between <strong>8:00-9:00 AM</strong> (12 out of 20 days). 
                  This shows good consistency! Try to maintain this pattern for optimal punctuality.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-purple-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📈 Key Insights</h4>
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Your attendance rate (95%) is <strong>3% above</strong> team average</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Punctuality improved by <strong>7%</strong> from Week 2 to Week 4</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Most consistent check-in time: <strong>8:00-9:00 AM</strong></span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">!</span>
            <span>Opportunity: Reduce late arrivals after 9 AM to boost punctuality score</span>
          </div>
        </div>
      </div>
    </div>
  )
}
