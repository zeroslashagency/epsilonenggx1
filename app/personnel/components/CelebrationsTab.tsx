'use client'

import { useState, useEffect } from 'react'
import { Cake, Gift, Calendar, Sparkles, Heart, PartyPopper } from 'lucide-react'

interface CelebrationsTabProps {
  employeeCode: string
  employeeName: string
}

interface Celebration {
  type: 'birthday' | 'work_anniversary'
  date: string
  yearsCompleted?: number
  daysUntil: number
}

export default function CelebrationsTab({ employeeCode, employeeName }: CelebrationsTabProps) {
  const [celebrations, setCelebrations] = useState<Celebration[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (employeeCode) {
      calculateCelebrations()
    }
  }, [employeeCode])

  const calculateCelebrations = () => {
    setLoading(true)
    
    // Mock data - In production, fetch from employee profile
    const today = new Date()
    const currentYear = today.getFullYear()
    
    // Example: Birthday on December 15
    const birthday = new Date(currentYear, 11, 15) // Month is 0-indexed
    if (birthday < today) {
      birthday.setFullYear(currentYear + 1)
    }
    
    // Example: Work anniversary on March 10, 2022 (joined)
    const joinDate = new Date(2022, 2, 10)
    const anniversary = new Date(currentYear, 2, 10)
    if (anniversary < today) {
      anniversary.setFullYear(currentYear + 1)
    }
    
    const yearsCompleted = currentYear - joinDate.getFullYear()
    
    const birthdayDaysUntil = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const anniversaryDaysUntil = Math.ceil((anniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    setCelebrations([
      {
        type: 'birthday',
        date: birthday.toISOString(),
        daysUntil: birthdayDaysUntil
      },
      {
        type: 'work_anniversary',
        date: anniversary.toISOString(),
        yearsCompleted: yearsCompleted,
        daysUntil: anniversaryDaysUntil
      }
    ])
    
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getGreeting = (celebration: Celebration) => {
    if (celebration.daysUntil === 0) {
      if (celebration.type === 'birthday') {
        return `🎉 Happy Birthday, ${employeeName}! 🎂`
      } else {
        return `🎊 Happy Work Anniversary, ${employeeName}! 🎉`
      }
    } else if (celebration.daysUntil === 1) {
      return celebration.type === 'birthday' 
        ? 'Your birthday is tomorrow!' 
        : 'Your work anniversary is tomorrow!'
    } else if (celebration.daysUntil <= 7) {
      return `Coming up in ${celebration.daysUntil} days`
    } else if (celebration.daysUntil <= 30) {
      return `${celebration.daysUntil} days away`
    } else {
      return `${Math.floor(celebration.daysUntil / 30)} months away`
    }
  }

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'from-pink-500 to-purple-500'
    if (daysUntil <= 7) return 'from-blue-500 to-indigo-500'
    if (daysUntil <= 30) return 'from-green-500 to-teal-500'
    return 'from-gray-500 to-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PartyPopper className="w-8 h-8 text-pink-600" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Celebrations</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Birthdays & Work Anniversaries</p>
        </div>
      </div>

      {/* Celebration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {celebrations.map((celebration, idx) => (
          <div
            key={idx}
            className={`
              relative overflow-hidden rounded-2xl p-8 text-white
              bg-gradient-to-br ${getUrgencyColor(celebration.daysUntil)}
              shadow-xl hover:shadow-2xl transition-all
            `}
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 opacity-10">
              {celebration.type === 'birthday' ? (
                <Cake className="w-32 h-32" />
              ) : (
                <Gift className="w-32 h-32" />
              )}
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                {celebration.type === 'birthday' ? (
                  <Cake className="w-8 h-8" />
                ) : (
                  <Gift className="w-8 h-8" />
                )}
                <h4 className="text-2xl font-bold">
                  {celebration.type === 'birthday' ? 'Birthday' : 'Work Anniversary'}
                </h4>
              </div>

              <div className="space-y-3">
                <div className="text-lg font-semibold">
                  {formatDate(celebration.date)}
                </div>

                {celebration.type === 'work_anniversary' && celebration.yearsCompleted && (
                  <div className="text-sm opacity-90">
                    {celebration.yearsCompleted} {celebration.yearsCompleted === 1 ? 'year' : 'years'} with the company
                  </div>
                )}

                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg font-semibold">
                  {getGreeting(celebration)}
                </div>
              </div>

              {/* Countdown */}
              {celebration.daysUntil > 0 && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-75">Countdown</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-2xl font-bold">{celebration.daysUntil}</span>
                      <span className="text-sm">days</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Today's celebration */}
              {celebration.daysUntil === 0 && (
                <div className="mt-6 flex items-center gap-2 text-lg font-bold animate-pulse">
                  <Sparkles className="w-5 h-5" />
                  <span>Today!</span>
                  <Sparkles className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Personalized Message */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-pink-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <Heart className="w-8 h-8 text-pink-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Special Message
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {celebrations.some(c => c.daysUntil === 0) ? (
                <>
                  🎉 <strong>Congratulations, {employeeName}!</strong> We're so grateful to have you on our team. 
                  Your dedication and hard work make a real difference every day. Here's to celebrating you today! 🎂✨
                </>
              ) : celebrations.some(c => c.daysUntil <= 7) ? (
                <>
                  🎈 <strong>Hey {employeeName}!</strong> Your special day is coming up soon! 
                  We're looking forward to celebrating with you. Get ready for some surprises! 🎁
                </>
              ) : (
                <>
                  💫 <strong>Hi {employeeName}!</strong> We have some exciting celebrations coming up for you. 
                  Mark your calendar and stay tuned for special surprises! 🌟
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-600" />
          Upcoming Milestones
        </h4>

        <div className="space-y-3">
          {celebrations
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .map((celebration, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {celebration.type === 'birthday' ? (
                    <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                      <Cake className="w-5 h-5 text-pink-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Gift className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {celebration.type === 'birthday' ? 'Birthday' : 'Work Anniversary'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(celebration.date)}
                      {celebration.type === 'work_anniversary' && celebration.yearsCompleted && (
                        <span className="ml-2">• {celebration.yearsCompleted} years</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {celebration.daysUntil === 0 ? 'Today!' : `${celebration.daysUntil}d`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {celebration.daysUntil === 0 ? '🎉' : 'remaining'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Fun Facts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎂</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
            {celebrations.find(c => c.type === 'birthday')?.daysUntil || 0}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">Days to Birthday</div>
        </div>

        <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎁</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
            {celebrations.find(c => c.type === 'work_anniversary')?.yearsCompleted || 0}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-400 mt-1">Years with Company</div>
        </div>

        <div className="bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✨</div>
          <div className="text-2xl font-bold text-pink-900 dark:text-pink-300">
            {celebrations.filter(c => c.daysUntil <= 30).length}
          </div>
          <div className="text-sm text-pink-700 dark:text-pink-400 mt-1">Events This Month</div>
        </div>
      </div>
    </div>
  )
}
