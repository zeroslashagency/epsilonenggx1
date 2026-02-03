"use client"

import { useState, useEffect } from 'react'
import { 
  ZohoCard, 
  ZohoButton,
  ZohoBadge 
} from '@/app/components/zoho-ui'
import { 
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Filter,
  RefreshCw,
  Package
} from 'lucide-react'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { apiGet } from '@/app/lib/utils/api-client'

interface Report {
  id: string
  title: string
  description: string
  icon: any
  color: string
  lastGenerated: string
}

function ReportsPageContent() {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [reports, setReports] = useState<Report[]>([])

  const fetchReports = async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      params.append('period', selectedPeriod)
      
      const data = await apiGet(`/api/monitoring/reports?${params.toString()}`)
      
      if (data.success) {
        const reportsData = (data.data || []).map((r: any) => ({
          ...r,
          icon: r.type === 'production' ? Package : 
                r.type === 'machine' ? TrendingUp :
                r.type === 'personnel' ? Users : FileText
        }))
        setReports(reportsData)
        setLastUpdate(new Date())
      } else {
        // Fallback to default reports if API fails
        setReports([
          {
            id: '1',
            title: 'Production Summary',
            description: 'Overall production metrics and KPIs',
            icon: Package,
            color: 'bg-blue-100 text-blue-600',
            lastGenerated: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Machine Utilization',
            description: 'Machine efficiency and uptime analysis',
            icon: TrendingUp,
            color: 'bg-purple-100 text-purple-600',
            lastGenerated: new Date().toISOString()
          },
          {
            id: '3',
            title: 'Personnel Performance',
            description: 'Staff productivity and efficiency metrics',
            icon: Users,
            color: 'bg-green-100 text-green-600',
            lastGenerated: new Date().toISOString()
          },
          {
            id: '4',
            title: 'Quality Control',
            description: 'Quality metrics and defect analysis',
            icon: FileText,
            color: 'bg-orange-100 text-orange-600',
            lastGenerated: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [selectedPeriod])

  const generateReport = async (reportId: string) => {
    try {
      const data = await apiGet(`/api/monitoring/reports/${reportId}/generate`)
      if (data.success) {
        fetchReports() // Refresh list after generation
      }
    } catch (error) {
    }
  }

  return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {loading ? (
          /* Loading Skeletons */
          <>
            {/* Header Skeleton */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div>
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Reports Grid Skeleton */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
                        <div className="flex items-center justify-between">
                          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Generate and view production reports</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <button
                onClick={fetchReports}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export All
              </button>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => {
              const ReportIcon = report.icon
              
              return (
                <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${report.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <ReportIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{report.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{report.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Last generated: {new Date(report.lastGenerated).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => generateReport(report.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Reports</h2>
            <div className="space-y-3">
              {[
                { name: 'Production_Summary_2025-10-25.pdf', date: '2025-10-25T14:00:00', size: '2.4 MB' },
                { name: 'Machine_Utilization_2025-10-24.pdf', date: '2025-10-24T16:30:00', size: '1.8 MB' },
                { name: 'Quality_Report_2025-10-23.pdf', date: '2025-10-23T15:00:00', size: '3.1 MB' }
              ].map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(file.date).toLocaleString()} • {file.size}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      )
}

export default function ReportsPage() {
  return (
    <ProtectedPage module="monitoring" item="Reports" permission="view">
      <ReportsPageContent />
    </ProtectedPage>
  )
}
