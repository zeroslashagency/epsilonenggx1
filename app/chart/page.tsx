"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { 
  ZohoLayout, 
  ZohoCard, 
  ZohoBadge, 
  ZohoButton 
} from '../components/zoho-ui'
import { 
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Cpu,
  Package,
  Clock,
  Users,
  CalendarDays,
  Grid3X3,
  PieChart,
  Upload
} from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface ChartData {
  label: string
  value: number
  change: number
  color: string
}

interface ProductionMetrics {
  productionOutput: number
  efficiencyRate: number
  qualityScore: number
  downtimeHours: number
  activeOrders: number
  completedOrders: number
  machineUtilization: number
}

export default function ChartPage() {
  const auth = useAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    productionOutput: 1250,
    efficiencyRate: 87.5,
    qualityScore: 94.2,
    downtimeHours: 2.3,
    activeOrders: 15,
    completedOrders: 42,
    machineUtilization: 87.5
  })
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [activeTab, setActiveTab] = useState('analytics')
  const [timelineView, setTimelineView] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Authentication guard
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/auth')
    }
  }, [auth.isAuthenticated, auth.isLoading, router])

  useEffect(() => {
    fetchMetrics()
  }, [selectedPeriod])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('period', selectedPeriod)
      
      const data = await apiGet(`/api/production/metrics?${params.toString()}`)
      
      if (data.success) {
        setMetrics(data.data)
        setLastUpdate(new Date())
      } else {
        // Fallback to mock data if API fails
        setMetrics({
          productionOutput: 1250,
          efficiencyRate: 87.5,
          qualityScore: 94.2,
          downtimeHours: 2.3,
          activeOrders: 15,
          completedOrders: 42,
          machineUtilization: 87.5
        })
      }
    } catch (error) {
      // Use mock data on error
      setMetrics({
        productionOutput: 1250,
        efficiencyRate: 87.5,
        qualityScore: 94.2,
        downtimeHours: 2.3,
        activeOrders: 15,
        completedOrders: 42,
        machineUtilization: 87.5
      })
    } finally {
      setLoading(false)
    }
  }

  const chartData: ChartData[] = [
    {
      label: 'Production Output',
      value: metrics.productionOutput,
      change: 12.5,
      color: '#2C7BE5'
    },
    {
      label: 'Efficiency Rate',
      value: metrics.efficiencyRate,
      change: 5.2,
      color: '#28A745'
    },
    {
      label: 'Quality Score',
      value: metrics.qualityScore,
      change: -1.8,
      color: '#FD7E14'
    },
    {
      label: 'Downtime Hours',
      value: metrics.downtimeHours,
      change: -15.3,
      color: '#DC3545'
    }
  ]

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <TrendingUp className="w-4 h-4 text-[#28A745]" />
    ) : (
      <TrendingDown className="w-4 h-4 text-[#DC3545]" />
    )
  }

  const getChangeBadge = (change: number) => {
    const variant = change >= 0 ? 'success' : 'danger'
    const sign = change >= 0 ? '+' : ''
    return (
      <ZohoBadge variant={variant} size="sm">
        {sign}{change.toFixed(1)}%
      </ZohoBadge>
    )
  }

  // Show loading while checking authentication
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!auth.isAuthenticated) {
    return null
  }

  return (
    <ZohoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">Analytics & Charts</h1>
            <p className="text-[#95AAC9] mt-1">Production metrics and performance analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-[#95AAC9]">
              Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <ZohoButton
              variant="secondary"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchMetrics}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </ZohoButton>
            <ZohoButton
              variant="primary"
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </ZohoButton>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#E3E6F0] dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-[#2C7BE5] text-[#2C7BE5]'
                  : 'border-transparent text-[#95AAC9] hover:text-[#12263F] hover:border-[#E3E6F0]'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Timeline View
              </div>
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'gantt'
                  ? 'border-[#2C7BE5] text-[#2C7BE5]'
                  : 'border-transparent text-[#95AAC9] hover:text-[#12263F] hover:border-[#E3E6F0]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Gantt Chart
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-[#2C7BE5] text-[#2C7BE5]'
                  : 'border-transparent text-[#95AAC9] hover:text-[#12263F] hover:border-[#E3E6F0]'
              }`}
            >
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Analytics
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Timeline Controls */}
            <ZohoCard>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#2C7BE5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Production Timeline</h3>
                    <p className="text-sm text-[#95AAC9]">Real-time machine scheduling & task management</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[#95AAC9]">Current Time</p>
                    <p className="text-sm font-medium text-[#12263F] dark:text-white">
                      {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  <ZohoButton variant="primary" size="sm" icon={<Clock className="w-4 h-4" />}>
                    Jump to Now
                  </ZohoButton>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#12263F] dark:text-white">Zoom:</span>
                    <div className="flex items-center gap-2 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg p-1">
                      <ZohoButton variant="ghost" size="sm" icon={<span className="text-sm font-bold">-</span>} />
                      <span className="text-sm font-medium min-w-[60px] text-center text-[#12263F] dark:text-white">100%</span>
                      <ZohoButton variant="ghost" size="sm" icon={<span className="text-sm font-bold">+</span>} />
                      <div className="w-px h-4 bg-[#E3E6F0] mx-1"></div>
                      <ZohoButton variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#28A745] rounded-full"></div>
                    <span className="text-sm text-[#95AAC9]">
                      Scale: 100px = 1 {timelineView} | Live Data
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Timeline View Controls */}
                  <div className="flex items-center gap-1 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg p-1">
                    <button 
                      onClick={() => setTimelineView('hour')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                        timelineView === 'hour' 
                          ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm' 
                          : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
                      }`}
                    >
                      Hour
                    </button>
                    <button 
                      onClick={() => setTimelineView('day')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                        timelineView === 'day' 
                          ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm' 
                          : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
                      }`}
                    >
                      Day
                    </button>
                    <button 
                      onClick={() => setTimelineView('week')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                        timelineView === 'week' 
                          ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm' 
                          : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
                      }`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setTimelineView('month')}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                        timelineView === 'month' 
                          ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm' 
                          : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                  
                  <div className="w-px h-6 bg-[#E3E6F0]"></div>
                  
                  <ZohoButton variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                    Import
                  </ZohoButton>
                  <ZohoButton variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
                    Export
                  </ZohoButton>
                  <ZohoButton variant="primary" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
                    Sync Dashboard
                  </ZohoButton>
                </div>
              </div>

              {/* Timeline Container */}
              <div className="relative bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                {/* Fixed Machine Sidebar + Scrollable Timeline */}
                <div className="flex">
                  {/* Fixed Machine Sidebar */}
                  <div className="w-52 bg-[#F8F9FC] dark:bg-gray-800 border-r border-[#E3E6F0] dark:border-gray-700">
                    {/* Header */}
                    <div className="h-14 bg-gradient-to-r from-[#F1F3F4] to-[#F8F9FC] dark:from-gray-700 dark:to-gray-800 border-b border-[#E3E6F0] dark:border-gray-700 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#2C7BE5]" />
                        <span className="font-semibold text-sm text-[#12263F] dark:text-white">Machines</span>
                      </div>
                    </div>
                    
                    {/* Machine List */}
                    <div className="divide-y divide-[#E3E6F0]">
                      {Array.from({ length: 10 }, (_, index) => {
                        const machineNumber = index + 1;
                        const machineName = `VMC ${machineNumber}`;
                        const isActive = index < 8; // VMC 1-8 active, VMC 9-10 maintenance
                        const utilization = isActive ? Math.max(95 - index * 8, 25) : 0;
                        
                        return (
                          <div key={machineName} className="h-18 p-4 flex items-center justify-between bg-white dark:bg-gray-900 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-all duration-200 border-l-4 border-transparent hover:border-l-[#2C7BE5]">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full shadow-sm ${
                                isActive ? 'bg-[#28A745] shadow-green-200' : 'bg-[#DC3545] shadow-red-200'
                              }`}></div>
                              <div>
                                <span className="text-sm font-semibold text-[#12263F] dark:text-white">{machineName}</span>
                                <p className="text-xs text-[#95AAC9]">{isActive ? 'Active' : 'Maintenance'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <ZohoBadge variant={isActive ? 'success' : 'danger'} size="sm">
                                {utilization}%
                              </ZohoBadge>
                              <p className="text-xs text-[#95AAC9] mt-1">Utilization</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scrollable Timeline */}
                  <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ maxHeight: '720px' }}>
                    {/* Timeline Header */}
                    <div className="h-14 bg-gradient-to-r from-[#F1F3F4] to-[#F8F9FC] dark:from-gray-700 dark:to-gray-800 border-b border-[#E3E6F0] dark:border-gray-700 sticky top-0 z-10">
                      <div className="relative h-full flex" style={{ width: '7200px' }}>
                        {/* Timeline Markers - Real Dates */}
                        {Array.from({ length: 72 }, (_, i) => {
                          const today = new Date();
                          let date, label;
                          
                          if (timelineView === 'hour') {
                            // Show 72 hours (3 days) - 24 hours past, current day, 24 hours future
                            date = new Date(today.getTime() + (i - 24) * 60 * 60 * 1000);
                            label = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                          } else if (timelineView === 'day') {
                            // Show 72 days - 30 days past, current, 41 days future
                            date = new Date(today.getTime() + (i - 30) * 24 * 60 * 60 * 1000);
                            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else if (timelineView === 'week') {
                            // Show 72 weeks
                            date = new Date(today.getTime() + (i - 30) * 7 * 24 * 60 * 60 * 1000);
                            label = `W${Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
                          } else {
                            // Show 72 months
                            date = new Date(today.getFullYear(), today.getMonth() + (i - 30), 1);
                            label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                          }
                          
                          const isToday = timelineView === 'day' && date.toDateString() === today.toDateString();
                          const isCurrentHour = timelineView === 'hour' && date.getHours() === today.getHours() && date.toDateString() === today.toDateString();
                          const isCurrent = isToday || isCurrentHour;
                          
                          return (
                            <div
                              key={i}
                              className={`w-24 border-r border-[#E3E6F0] dark:border-gray-600 flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                                isCurrent ? 'bg-[#2C7BE5]/10 text-[#2C7BE5] font-bold border-[#2C7BE5]/30' : 'text-[#95AAC9] hover:bg-[#F8F9FC] dark:hover:bg-gray-700'
                              }`}
                            >
                              <span>{label}</span>
                              {isCurrent && <div className="w-1 h-1 bg-[#2C7BE5] rounded-full mt-1"></div>}
                            </div>
                          );
                        })}
                        
                        {/* Current Time Indicator (NOW line) */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#DC3545] to-[#B91C1C] z-20 shadow-sm"
                          style={{ left: `${timelineView === 'hour' ? 24 * 100 : 30 * 100}px` }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#DC3545] to-[#B91C1C] text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                              NOW
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="relative" style={{ width: '7200px' }}>
                      {/* NOW Line for Timeline Rows */}
                      <div 
                        className="absolute top-0 w-0.5 bg-gradient-to-b from-[#DC3545] to-[#B91C1C] z-10 shadow-sm"
                        style={{ left: `${timelineView === 'hour' ? 24 * 100 : 30 * 100}px`, height: '720px' }}
                      />
                      
                      {Array.from({ length: 10 }, (_, machineIndex) => {
                        const machineName = `VMC ${machineIndex + 1}`;
                        return (
                          <div 
                            key={machineName}
                            className="h-18 border-b border-[#E3E6F0] dark:border-gray-700 relative hover:bg-[#F8F9FC]/30 dark:hover:bg-gray-800/30 transition-colors"
                            style={{ width: '7200px' }}
                          >
                            {/* Timeline Grid Lines */}
                            {Array.from({ length: 72 }, (_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-r border-[#F1F3F4] dark:border-gray-700/50 w-24 hover:bg-[#2C7BE5]/5 transition-colors"
                                style={{ left: `${i * 100}px` }}
                              />
                            ))}

                            {/* Sample Tasks for each machine */}
                            {machineIndex < 8 && (
                            <>
                              {/* Task 1 */}
                              <div
                                className="absolute top-2 bottom-2 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 rounded-md overflow-hidden"
                                style={{
                                  left: `${100 + machineIndex * 50}px`,
                                  width: '200px'
                                }}
                                title={`Part PN-${machineIndex + 1}\nBatch B-${machineIndex + 1}\nOperation 1`}
                              >
                                {/* Unified Bar with Setup and Run Sections */}
                                <div className="h-full flex w-full">
                                  {/* Setup Section - Blue */}
                                  <div className="bg-[#2C7BE5] flex items-center justify-center text-white text-xs font-medium px-1 w-1/4">
                                    <span className="font-bold truncate">Setup: A</span>
                                  </div>
                                  
                                  {/* Run Section - Green */}
                                  <div className="bg-[#28A745] flex items-center justify-between text-white text-xs font-medium px-2 flex-1">
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className="font-bold truncate">PN-{machineIndex + 1}</span>
                                      <span className="text-xs opacity-90">Batch B-{machineIndex + 1} | Op1</span>
                                    </div>
                                    <div className="flex flex-col items-end text-right min-w-0">
                                      <span className="text-xs opacity-90">Machining</span>
                                      <span className="text-xs opacity-90">Qty 100</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Task 2 */}
                              <div
                                className="absolute top-2 bottom-2 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 rounded-md overflow-hidden"
                                style={{
                                  left: `${350 + machineIndex * 30}px`,
                                  width: '180px'
                                }}
                                title={`Part PN-${machineIndex + 5}\nBatch B-${machineIndex + 5}\nOperation 2`}
                              >
                                <div className="h-full flex w-full">
                                  <div className="bg-[#2C7BE5] flex items-center justify-center text-white text-xs font-medium px-1 w-1/4">
                                    <span className="font-bold truncate">Setup: B</span>
                                  </div>
                                  <div className="bg-[#FD7E14] flex items-center justify-between text-white text-xs font-medium px-2 flex-1">
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className="font-bold truncate">PN-{machineIndex + 5}</span>
                                      <span className="text-xs opacity-90">Batch B-{machineIndex + 5} | Op2</span>
                                    </div>
                                    <div className="flex flex-col items-end text-right min-w-0">
                                      <span className="text-xs opacity-90">Drilling</span>
                                      <span className="text-xs opacity-90">Qty 75</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#2C7BE5] rounded"></div>
                  <span>Setup Section (Operator)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#28A745] rounded"></div>
                  <span>Run Section (In Progress)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#FD7E14] rounded"></div>
                  <span>Run Section (Scheduled)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-[#95AAC9] rounded"></div>
                  <span>Run Section (Not Started)</span>
                </div>
              </div>
            </ZohoCard>
          </div>
        )}

        {activeTab === 'gantt' && (
          <div className="space-y-6">
            <ZohoCard>
              <div className="text-center py-16">
                <Grid3X3 className="w-16 h-16 text-[#95AAC9] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-2">Gantt Chart</h3>
                <p className="text-[#95AAC9] mb-4">Project timeline and task dependencies visualization</p>
                <ZohoButton variant="primary">
                  Load Gantt Chart
                </ZohoButton>
              </div>
            </ZohoCard>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Production Output */}
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-[#2C7BE5]" />
                  <span className="text-sm text-[#95AAC9]">Production Output</span>
                </div>
                <div className="text-2xl font-bold text-[#12263F] dark:text-white">
                  {metrics.productionOutput.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="w-3 h-3 text-[#28A745]" />
                  <span className="text-xs text-[#28A745]">+12.5%</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-[#2C7BE5]/10 rounded flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#2C7BE5]" />
              </div>
            </div>
          </ZohoCard>

          {/* Efficiency Rate */}
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-[#28A745]" />
                  <span className="text-sm text-[#95AAC9]">Efficiency Rate</span>
                </div>
                <div className="text-2xl font-bold text-[#12263F] dark:text-white">
                  {metrics.efficiencyRate}%
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="w-3 h-3 text-[#28A745]" />
                  <span className="text-xs text-[#28A745]">+5.2%</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-[#28A745]/10 rounded flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#28A745]" />
              </div>
            </div>
          </ZohoCard>

          {/* Quality Score */}
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[#FD7E14]" />
                  <span className="text-sm text-[#95AAC9]">Quality Score</span>
                </div>
                <div className="text-2xl font-bold text-[#12263F] dark:text-white">
                  {metrics.qualityScore}%
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingDown className="w-3 h-3 text-[#DC3545]" />
                  <span className="text-xs text-[#DC3545]">-1.8%</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-[#FD7E14]/10 rounded flex items-center justify-center">
                <Package className="w-4 h-4 text-[#FD7E14]" />
              </div>
            </div>
          </ZohoCard>

          {/* Downtime Hours */}
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#DC3545]" />
                  <span className="text-sm text-[#95AAC9]">Downtime Hours</span>
                </div>
                <div className="text-2xl font-bold text-[#12263F] dark:text-white">
                  {metrics.downtimeHours}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingDown className="w-3 h-3 text-[#28A745]" />
                  <span className="text-xs text-[#28A745]">-15.3%</span>
                </div>
              </div>
              <div className="w-8 h-8 bg-[#DC3545]/10 rounded flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#DC3545]" />
              </div>
            </div>
          </ZohoCard>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Production Timeline */}
          <ZohoCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Production Timeline</h3>
                <p className="text-sm text-[#95AAC9]">Hourly production output</p>
              </div>
              <Filter className="w-4 h-4 text-[#95AAC9]" />
            </div>
            <div className="h-64 flex items-center justify-center bg-[#F8F9FC] dark:bg-gray-800 rounded">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-[#95AAC9] mx-auto mb-2" />
                <p className="text-sm text-[#95AAC9]">Production Chart Visualization</p>
                <p className="text-xs text-[#95AAC9]">Chart component would be integrated here</p>
              </div>
            </div>
          </ZohoCard>

          {/* Efficiency Trends */}
          <ZohoCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Efficiency Trends</h3>
                <p className="text-sm text-[#95AAC9]">Machine efficiency over time</p>
              </div>
              <Calendar className="w-4 h-4 text-[#95AAC9]" />
            </div>
            <div className="h-64 flex items-center justify-center bg-[#F8F9FC] dark:bg-gray-800 rounded">
              <div className="text-center">
                <Activity className="w-12 h-12 text-[#95AAC9] mx-auto mb-2" />
                <p className="text-sm text-[#95AAC9]">Efficiency Chart Visualization</p>
                <p className="text-xs text-[#95AAC9]">Line chart component would be integrated here</p>
              </div>
            </div>
          </ZohoCard>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Orders */}
          <ZohoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-[#2C7BE5]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Active Orders</h3>
                <p className="text-2xl font-bold text-[#2C7BE5]">{metrics.activeOrders}</p>
                <p className="text-sm text-[#95AAC9]">Currently in production</p>
              </div>
            </div>
          </ZohoCard>

          {/* Completed Orders */}
          <ZohoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#28A745]/10 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-[#28A745]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Completed Orders</h3>
                <p className="text-2xl font-bold text-[#28A745]">{metrics.completedOrders}</p>
                <p className="text-sm text-[#95AAC9]">This period</p>
              </div>
            </div>
          </ZohoCard>

          {/* Machine Utilization */}
          <ZohoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FD7E14]/10 rounded-full flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#FD7E14]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Machine Utilization</h3>
                <p className="text-2xl font-bold text-[#FD7E14]">{metrics.machineUtilization}%</p>
                <p className="text-sm text-[#95AAC9]">Average efficiency</p>
              </div>
            </div>
          </ZohoCard>
            </div>
          </div>
        )}
      </div>
    </ZohoLayout>
  )
}
