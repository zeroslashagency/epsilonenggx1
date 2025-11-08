'use client'

import { useState, useEffect } from 'react'
import { Trophy, Award, Flame, Bird, Star, TrendingUp, Users, Clock, Calendar, Zap } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface GamificationTabProps {
  employeeCode: string
  employeeName: string
}

interface Badge {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  earned: boolean
  earnedDate?: string
  color: string
  bgColor: string
}

interface Achievement {
  currentStreak: number
  longestStreak: number
  perfectMonths: number
  earlyBirdCount: number
  totalDaysPresent: number
  punctualityScore: number
}

export default function GamificationTab({ employeeCode, employeeName }: GamificationTabProps) {
  const [achievements, setAchievements] = useState<Achievement>({
    currentStreak: 0,
    longestStreak: 0,
    perfectMonths: 0,
    earlyBirdCount: 0,
    totalDaysPresent: 0,
    punctualityScore: 0
  })
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (employeeCode) {
      fetchGamificationData()
    }
  }, [employeeCode])

  const fetchGamificationData = async () => {
    try {
      setLoading(true)
      
      // Fetch last 90 days of attendance
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      
      const fromDate = startDate.toISOString().split('T')[0]
      const toDate = endDate.toISOString().split('T')[0]

      const data = await apiGet(`/api/get-attendance?employeeCode=${employeeCode}&fromDate=${fromDate}&toDate=${toDate}`)

      if (data.success && data.data?.allLogs) {
        const logs = data.data.allLogs
        calculateAchievements(logs)
      }
    } catch (error) {
      console.error('Failed to fetch gamification data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAchievements = (logs: any[]) => {
    // Group logs by date
    const logsByDate: Record<string, any[]> = {}
    logs.forEach(log => {
      const date = new Date(log.log_date).toISOString().split('T')[0]
      if (!logsByDate[date]) {
        logsByDate[date] = []
      }
      logsByDate[date].push(log)
    })

    // Calculate streaks
    const dates = Object.keys(logsByDate).sort()
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    dates.forEach(dateStr => {
      const date = new Date(dateStr)
      const dayOfWeek = date.getDay()
      
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) return

      if (lastDate) {
        const diffDays = Math.floor((date.getTime() - (lastDate as Date).getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1 || (diffDays <= 3 && (lastDate as Date).getDay() === 5)) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }

      longestStreak = Math.max(longestStreak, tempStreak)
      lastDate = date
    })

    // Current streak (check if last date is recent)
    if (lastDate) {
      const today = new Date()
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 3) {
        currentStreak = tempStreak
      }
    }

    // Count early birds (before 9 AM)
    let earlyBirdCount = 0
    Object.values(logsByDate).forEach(dayLogs => {
      const firstIn = dayLogs.find(log => log.punch_direction?.toLowerCase() === 'in')
      if (firstIn) {
        const hour = new Date(firstIn.log_date).getHours()
        if (hour < 9) earlyBirdCount++
      }
    })

    // Count perfect months (95%+ attendance)
    const monthlyAttendance: Record<string, { present: number, total: number }> = {}
    Object.keys(logsByDate).forEach(dateStr => {
      const date = new Date(dateStr)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      if (!monthlyAttendance[monthKey]) {
        monthlyAttendance[monthKey] = { present: 0, total: 0 }
      }
      monthlyAttendance[monthKey].present++
    })

    // Count working days per month
    Object.keys(monthlyAttendance).forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number)
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      let workingDays = 0
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        const dayOfWeek = date.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++
      }
      monthlyAttendance[monthKey].total = workingDays
    })

    const perfectMonths = Object.values(monthlyAttendance).filter(
      m => m.total > 0 && (m.present / m.total) >= 0.95
    ).length

    // Calculate punctuality score
    const totalWorkingDays = Object.keys(logsByDate).filter(dateStr => {
      const dayOfWeek = new Date(dateStr).getDay()
      return dayOfWeek !== 0 && dayOfWeek !== 6
    }).length

    const punctualityScore = totalWorkingDays > 0 
      ? Math.round((earlyBirdCount / totalWorkingDays) * 100)
      : 0

    setAchievements({
      currentStreak,
      longestStreak,
      perfectMonths,
      earlyBirdCount,
      totalDaysPresent: Object.keys(logsByDate).length,
      punctualityScore
    })

    // Generate badges
    const earnedBadges: Badge[] = [
      {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Arrived before 9 AM for 10+ days',
        icon: <Bird className="w-8 h-8" />,
        earned: earlyBirdCount >= 10,
        earnedDate: earlyBirdCount >= 10 ? new Date().toISOString() : undefined,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
      },
      {
        id: 'perfect-month',
        name: 'Perfect Month',
        description: '95%+ attendance for a full month',
        icon: <Star className="w-8 h-8" />,
        earned: perfectMonths >= 1,
        earnedDate: perfectMonths >= 1 ? new Date().toISOString() : undefined,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
      },
      {
        id: 'comeback-streak',
        name: 'Comeback Streak',
        description: '5+ consecutive days present',
        icon: <Flame className="w-8 h-8" />,
        earned: currentStreak >= 5,
        earnedDate: currentStreak >= 5 ? new Date().toISOString() : undefined,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30'
      },
      {
        id: 'consistency-king',
        name: 'Consistency King',
        description: '30+ days present in 90 days',
        icon: <Trophy className="w-8 h-8" />,
        earned: achievements.totalDaysPresent >= 30,
        earnedDate: achievements.totalDaysPresent >= 30 ? new Date().toISOString() : undefined,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30'
      },
      {
        id: 'punctuality-pro',
        name: 'Punctuality Pro',
        description: '80%+ punctuality score',
        icon: <Zap className="w-8 h-8" />,
        earned: punctualityScore >= 80,
        earnedDate: punctualityScore >= 80 ? new Date().toISOString() : undefined,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      }
    ]

    setBadges(earnedBadges)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-600" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Gamified Attendance</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your achievements and compete with others!</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-6 h-6" />
            <span className="text-3xl font-bold">{achievements.currentStreak}</span>
          </div>
          <div className="text-sm opacity-90">Current Streak</div>
          <div className="text-xs opacity-75 mt-1">Consecutive days</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-6 h-6" />
            <span className="text-3xl font-bold">{achievements.longestStreak}</span>
          </div>
          <div className="text-sm opacity-90">Longest Streak</div>
          <div className="text-xs opacity-75 mt-1">Personal best</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-6 h-6" />
            <span className="text-3xl font-bold">{achievements.perfectMonths}</span>
          </div>
          <div className="text-sm opacity-90">Perfect Months</div>
          <div className="text-xs opacity-75 mt-1">95%+ attendance</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Bird className="w-6 h-6" />
            <span className="text-3xl font-bold">{achievements.earlyBirdCount}</span>
          </div>
          <div className="text-sm opacity-90">Early Birds</div>
          <div className="text-xs opacity-75 mt-1">Before 9 AM</div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-6 h-6 text-blue-600" />
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">Your Badges</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div
              key={badge.id}
              className={`
                relative p-6 rounded-xl border-2 transition-all
                ${badge.earned 
                  ? `${badge.bgColor} border-current ${badge.color} shadow-lg` 
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-50 grayscale'
                }
              `}
            >
              {badge.earned && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    ✓ Earned
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className={`mb-3 ${badge.earned ? badge.color : 'text-gray-400'}`}>
                  {badge.icon}
                </div>
                <h5 className={`font-bold text-lg mb-1 ${badge.earned ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                  {badge.name}
                </h5>
                <p className={`text-sm ${badge.earned ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                  {badge.description}
                </p>
                {badge.earned && badge.earnedDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Earned recently
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <h4 className="text-xl font-bold text-gray-900 dark:text-white">Punctuality Leaderboard</h4>
        </div>

        <div className="space-y-3">
          {/* Current User */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold">
              YOU
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-white">{employeeName}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Your Position</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{achievements.punctualityScore}%</div>
              <div className="text-xs text-gray-500">Punctuality</div>
            </div>
          </div>

          {/* Placeholder for other employees */}
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Leaderboard coming soon!</p>
            <p className="text-xs mt-1">Compete with your colleagues</p>
          </div>
        </div>
      </div>

      {/* Motivation Section */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-8 h-8" />
          <h4 className="text-xl font-bold">Keep Going!</h4>
        </div>
        <div className="space-y-2 text-sm opacity-90">
          {achievements.currentStreak < 5 && (
            <p>• Attend {5 - achievements.currentStreak} more days to earn the Comeback Streak badge!</p>
          )}
          {achievements.earlyBirdCount < 10 && (
            <p>• Arrive early {10 - achievements.earlyBirdCount} more times to earn the Early Bird badge!</p>
          )}
          {achievements.punctualityScore < 80 && (
            <p>• Improve your punctuality to {80 - achievements.punctualityScore}% more to earn Punctuality Pro!</p>
          )}
          {achievements.currentStreak >= 5 && achievements.earlyBirdCount >= 10 && achievements.punctualityScore >= 80 && (
            <p>• Amazing! You're crushing it! Keep up the great work! 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}
