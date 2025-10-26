"use client"

import { useState } from 'react'
import { 
  ZohoLayout, 
  ZohoCard, 
  ZohoButton 
} from '../components/zoho-ui'
import { 
  TrendingUp,
  Download,
  FileText,
  BarChart3,
  Activity,
  Package,
  Cpu,
  Clock,
  Users,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [reportType, setReportType] = useState('production')

  return (
    <ZohoLayout breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Analytics' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#2C7BE5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#12263F] dark:text-white">Reports & Analytics</h1>
              <p className="text-[#95AAC9] mt-1">Generate and view production reports</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <ZohoButton
              variant="primary"
              icon={<Download className="w-4 h-4" />}
            >
              Export Report
            </ZohoButton>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="flex items-center gap-2 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setReportType('production')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              reportType === 'production'
                ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm'
                : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Production
          </button>
          <button
            onClick={() => setReportType('efficiency')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              reportType === 'efficiency'
                ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm'
                : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Efficiency
          </button>
          <button
            onClick={() => setReportType('quality')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              reportType === 'quality'
                ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm'
                : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Quality
          </button>
          <button
            onClick={() => setReportType('machine')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              reportType === 'machine'
                ? 'bg-white dark:bg-gray-700 text-[#2C7BE5] shadow-sm'
                : 'text-[#95AAC9] hover:text-[#12263F] hover:bg-white/50'
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            Machine
          </button>
        </div>

        {/* Dynamic Content Based on Report Type */}
        {reportType === 'production' && (
          <>
            {/* Production Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Total Production</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">12,450</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 12.5% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#2C7BE5]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Units Per Hour</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">156</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 8.3% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#28A745]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Completed Orders</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">42</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 15.2% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#FD7E14]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Active Orders</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">15</p>
                    <p className="text-xs text-[#2C7BE5] mt-1">Currently in production</p>
                  </div>
                  <div className="w-12 h-12 bg-[#6F42C1]/10 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#6F42C1]" />
                  </div>
                </div>
              </ZohoCard>
            </div>
          </>
        )}

        {reportType === 'efficiency' && (
          <>
            {/* Efficiency Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Overall Efficiency</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">87.5%</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 5.2% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#28A745]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Machine Utilization</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">82.3%</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 3.8% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-[#2C7BE5]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Labor Efficiency</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">92.5%</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 4.1% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#FD7E14]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Downtime</p>
                    <p className="text-2xl font-bold text-[#DC3545]">2.3h</p>
                    <p className="text-xs text-[#28A745] mt-1">↓ 15.3% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#DC3545]" />
                  </div>
                </div>
              </ZohoCard>
            </div>
          </>
        )}

        {reportType === 'quality' && (
          <>
            {/* Quality Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Quality Score</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">94.2%</p>
                    <p className="text-xs text-[#DC3545] mt-1">↓ 1.8% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#28A745]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Defect Rate</p>
                    <p className="text-2xl font-bold text-[#DC3545]">2.1%</p>
                    <p className="text-xs text-[#28A745] mt-1">↓ 0.5% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#DC3545]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Passed Inspections</p>
                    <p className="text-2xl font-bold text-[#28A745]">1,847</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 12.3% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#28A745]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Rework Rate</p>
                    <p className="text-2xl font-bold text-[#FD7E14]">3.8%</p>
                    <p className="text-xs text-[#28A745] mt-1">↓ 1.2% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#FD7E14]" />
                  </div>
                </div>
              </ZohoCard>
            </div>
          </>
        )}

        {reportType === 'machine' && (
          <>
            {/* Machine Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Machine Uptime</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">96.8%</p>
                    <p className="text-xs text-[#28A745] mt-1">↑ 3.1% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-[#28A745]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Active Machines</p>
                    <p className="text-2xl font-bold text-[#28A745]">8/10</p>
                    <p className="text-xs text-[#2C7BE5] mt-1">80% operational</p>
                  </div>
                  <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#2C7BE5]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Avg Cycle Time</p>
                    <p className="text-2xl font-bold text-[#12263F] dark:text-white">4.2min</p>
                    <p className="text-xs text-[#28A745] mt-1">↓ 8.5% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#FD7E14]" />
                  </div>
                </div>
              </ZohoCard>

              <ZohoCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#95AAC9] mb-1">Maintenance Due</p>
                    <p className="text-2xl font-bold text-[#FD7E14]">2</p>
                    <p className="text-xs text-[#95AAC9] mt-1">Machines need service</p>
                  </div>
                  <div className="w-12 h-12 bg-[#DC3545]/10 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#DC3545]" />
                  </div>
                </div>
              </ZohoCard>
            </div>
          </>
        )}

        {/* Production Report Details */}
        {reportType === 'production' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Production Timeline */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Production Timeline</h3>
                    <p className="text-sm text-[#95AAC9]">Daily production breakdown</p>
                  </div>
                  <ZohoButton variant="ghost" size="sm" icon={<BarChart3 className="w-4 h-4" />} />
                </div>
                <div className="space-y-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => {
                    const value = [1850, 1920, 1780, 2100, 1950][index]
                    const percentage = (value / 2100) * 100
                    return (
                      <div key={day}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-[#95AAC9]">{day}</span>
                          <span className="font-semibold text-[#12263F] dark:text-white">{value} units</span>
                        </div>
                        <div className="w-full bg-[#E3E6F0] dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#2C7BE5] to-[#1E5BB8] h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ZohoCard>

              {/* Top Products */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Top Products</h3>
                    <p className="text-sm text-[#95AAC9]">Most produced items</p>
                  </div>
                  <ZohoButton variant="ghost" size="sm" icon={<Package className="w-4 h-4" />} />
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Part PN-001', qty: 2450, color: '#2C7BE5' },
                    { name: 'Part PN-002', qty: 1890, color: '#28A745' },
                    { name: 'Part PN-003', qty: 1650, color: '#FD7E14' },
                    { name: 'Part PN-004', qty: 1420, color: '#6F42C1' },
                    { name: 'Part PN-005', qty: 1180, color: '#DC3545' },
                  ].map((product) => (
                    <div key={product.name} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.color }}></div>
                        <span className="text-sm font-medium text-[#12263F] dark:text-white">{product.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#2C7BE5]">{product.qty}</span>
                    </div>
                  ))}
                </div>
              </ZohoCard>
            </div>

            {/* Production by Shift */}
            <ZohoCard>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Production by Shift</h3>
                  <p className="text-sm text-[#95AAC9]">Shift-wise production analysis</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { shift: 'Morning Shift', time: '6:00 AM - 2:00 PM', production: 4200, efficiency: 92, color: '#2C7BE5' },
                  { shift: 'Afternoon Shift', time: '2:00 PM - 10:00 PM', production: 4850, efficiency: 95, color: '#28A745' },
                  { shift: 'Night Shift', time: '10:00 PM - 6:00 AM', production: 3400, efficiency: 78, color: '#FD7E14' },
                ].map((shift) => (
                  <div key={shift.shift} className="p-4 border border-[#E3E6F0] dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }}></div>
                      <h4 className="font-semibold text-[#12263F] dark:text-white">{shift.shift}</h4>
                    </div>
                    <p className="text-xs text-[#95AAC9] mb-3">{shift.time}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#95AAC9]">Production</span>
                        <span className="text-lg font-bold" style={{ color: shift.color }}>{shift.production}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#95AAC9]">Efficiency</span>
                        <span className="text-sm font-semibold text-[#12263F] dark:text-white">{shift.efficiency}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ZohoCard>
          </>
        )}

        {/* Efficiency Report Details */}
        {reportType === 'efficiency' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Machine Efficiency */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Machine Efficiency</h3>
                    <p className="text-sm text-[#95AAC9]">Individual machine performance</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { machine: 'VMC 1', efficiency: 95, status: 'Excellent' },
                    { machine: 'VMC 2', efficiency: 87, status: 'Good' },
                    { machine: 'VMC 3', efficiency: 79, status: 'Good' },
                    { machine: 'VMC 4', efficiency: 71, status: 'Average' },
                    { machine: 'VMC 5', efficiency: 63, status: 'Average' },
                  ].map((item) => (
                    <div key={item.machine} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-[#2C7BE5]" />
                        <div>
                          <span className="text-sm font-medium text-[#12263F] dark:text-white block">{item.machine}</span>
                          <span className="text-xs text-[#95AAC9]">{item.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-[#E3E6F0] dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.efficiency >= 80 ? 'bg-[#28A745]' : 
                              item.efficiency >= 60 ? 'bg-[#FD7E14]' : 'bg-[#DC3545]'
                            }`}
                            style={{ width: `${item.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#12263F] dark:text-white w-12 text-right">{item.efficiency}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ZohoCard>

              {/* Operator Performance */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Operator Performance</h3>
                    <p className="text-sm text-[#95AAC9]">Top performing operators</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'John Doe', tasks: 24, efficiency: 96, rating: 5 },
                    { name: 'Jane Smith', tasks: 22, efficiency: 94, rating: 5 },
                    { name: 'Mike Johnson', tasks: 20, efficiency: 91, rating: 4 },
                    { name: 'Sarah Williams', tasks: 19, efficiency: 88, rating: 4 },
                    { name: 'Tom Brown', tasks: 18, efficiency: 85, rating: 4 },
                  ].map((operator) => (
                    <div key={operator.name} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#2C7BE5] to-[#1E5BB8] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {operator.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-[#12263F] dark:text-white block">{operator.name}</span>
                          <span className="text-xs text-[#95AAC9]">{operator.tasks} tasks completed</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#28A745]">{operator.efficiency}%</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: operator.rating }).map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-[#FD7E14] rounded-full"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ZohoCard>
            </div>

            {/* Downtime Analysis */}
            <ZohoCard>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Downtime Analysis</h3>
                  <p className="text-sm text-[#95AAC9]">Breakdown of non-productive time</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { reason: 'Setup Time', duration: '45min', percentage: 32, color: '#2C7BE5' },
                  { reason: 'Maintenance', duration: '38min', percentage: 27, color: '#FD7E14' },
                  { reason: 'Material Wait', duration: '28min', percentage: 20, color: '#6F42C1' },
                  { reason: 'Other', duration: '29min', percentage: 21, color: '#DC3545' },
                ].map((item) => (
                  <div key={item.reason} className="p-4 border border-[#E3E6F0] dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-semibold" style={{ color: item.color }}>{item.percentage}%</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#12263F] dark:text-white mb-1">{item.reason}</h4>
                    <p className="text-xs text-[#95AAC9]">{item.duration} total</p>
                  </div>
                ))}
              </div>
            </ZohoCard>
          </>
        )}

        {/* Quality Report Details */}
        {reportType === 'quality' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Defect Analysis */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Defect Analysis</h3>
                    <p className="text-sm text-[#95AAC9]">Types and frequency of defects</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { type: 'Dimensional Error', count: 12, percentage: 35, color: '#DC3545' },
                    { type: 'Surface Finish', count: 8, percentage: 24, color: '#FD7E14' },
                    { type: 'Material Defect', count: 7, percentage: 21, color: '#6F42C1' },
                    { type: 'Assembly Issue', count: 5, percentage: 15, color: '#2C7BE5' },
                    { type: 'Other', count: 2, percentage: 5, color: '#95AAC9' },
                  ].map((defect) => (
                    <div key={defect.type} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: defect.color }}></div>
                        <span className="text-sm font-medium text-[#12263F] dark:text-white">{defect.type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-[#E3E6F0] dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ width: `${defect.percentage}%`, backgroundColor: defect.color }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#12263F] dark:text-white w-8 text-right">{defect.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ZohoCard>

              {/* Quality by Product */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Quality by Product</h3>
                    <p className="text-sm text-[#95AAC9]">Product-wise quality scores</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { product: 'Part PN-001', score: 98.5, status: 'Excellent' },
                    { product: 'Part PN-002', score: 96.2, status: 'Excellent' },
                    { product: 'Part PN-003', score: 93.8, status: 'Good' },
                    { product: 'Part PN-004', score: 91.5, status: 'Good' },
                    { product: 'Part PN-005', score: 88.3, status: 'Average' },
                  ].map((item) => (
                    <div key={item.product} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-[#12263F] dark:text-white block">{item.product}</span>
                        <span className="text-xs text-[#95AAC9]">{item.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-[#E3E6F0] dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.score >= 95 ? 'bg-[#28A745]' : 
                              item.score >= 90 ? 'bg-[#2C7BE5]' : 'bg-[#FD7E14]'
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#28A745] w-12 text-right">{item.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ZohoCard>
            </div>

            {/* Inspection Results */}
            <ZohoCard>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Inspection Results</h3>
                  <p className="text-sm text-[#95AAC9]">Recent quality inspection outcomes</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { batch: 'Batch #B-2024-001', inspected: 500, passed: 487, failed: 13, passRate: 97.4 },
                  { batch: 'Batch #B-2024-002', inspected: 450, passed: 438, failed: 12, passRate: 97.3 },
                  { batch: 'Batch #B-2024-003', inspected: 520, passed: 495, failed: 25, passRate: 95.2 },
                ].map((batch) => (
                  <div key={batch.batch} className="p-4 border border-[#E3E6F0] dark:border-gray-700 rounded-lg">
                    <h4 className="font-semibold text-[#12263F] dark:text-white mb-3">{batch.batch}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[#95AAC9]">Inspected</span>
                        <span className="font-semibold text-[#12263F] dark:text-white">{batch.inspected}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#95AAC9]">Passed</span>
                        <span className="font-semibold text-[#28A745]">{batch.passed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#95AAC9]">Failed</span>
                        <span className="font-semibold text-[#DC3545]">{batch.failed}</span>
                      </div>
                      <div className="pt-2 border-t border-[#E3E6F0] dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-[#95AAC9]">Pass Rate</span>
                          <span className="text-lg font-bold text-[#28A745]">{batch.passRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ZohoCard>
          </>
        )}

        {/* Machine Report Details */}
        {reportType === 'machine' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Machine Status Overview */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Machine Status</h3>
                    <p className="text-sm text-[#95AAC9]">Current operational status</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { machine: 'VMC 1', status: 'Running', uptime: '8h 45m', utilization: 95, color: '#28A745' },
                    { machine: 'VMC 2', status: 'Running', uptime: '8h 30m', utilization: 87, color: '#28A745' },
                    { machine: 'VMC 3', status: 'Running', uptime: '8h 15m', utilization: 79, color: '#28A745' },
                    { machine: 'VMC 4', status: 'Idle', uptime: '0h 0m', utilization: 0, color: '#FD7E14' },
                    { machine: 'VMC 5', status: 'Running', uptime: '7h 20m', utilization: 63, color: '#28A745' },
                  ].map((machine) => (
                    <div key={machine.machine} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: machine.color }}></div>
                        <div>
                          <span className="text-sm font-medium text-[#12263F] dark:text-white block">{machine.machine}</span>
                          <span className="text-xs text-[#95AAC9]">{machine.status} • {machine.uptime}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#2C7BE5]">{machine.utilization}%</span>
                    </div>
                  ))}
                </div>
              </ZohoCard>

              {/* Maintenance Schedule */}
              <ZohoCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Maintenance Schedule</h3>
                    <p className="text-sm text-[#95AAC9]">Upcoming maintenance tasks</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { machine: 'VMC 9', task: 'Scheduled Maintenance', dueIn: '2 days', priority: 'High' },
                    { machine: 'VMC 7', task: 'Oil Change', dueIn: '5 days', priority: 'Medium' },
                    { machine: 'VMC 10', task: 'Calibration', dueIn: '7 days', priority: 'Medium' },
                    { machine: 'VMC 3', task: 'Belt Replacement', dueIn: '10 days', priority: 'Low' },
                    { machine: 'VMC 1', task: 'General Inspection', dueIn: '14 days', priority: 'Low' },
                  ].map((item) => (
                    <div key={`${item.machine}-${item.task}`} className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-[#12263F] dark:text-white block">{item.machine}</span>
                        <span className="text-xs text-[#95AAC9]">{item.task}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#95AAC9]">{item.dueIn}</span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          item.priority === 'High' ? 'bg-[#DC3545]/10 text-[#DC3545]' :
                          item.priority === 'Medium' ? 'bg-[#FD7E14]/10 text-[#FD7E14]' :
                          'bg-[#2C7BE5]/10 text-[#2C7BE5]'
                        }`}>
                          {item.priority}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ZohoCard>
            </div>

            {/* Performance Trends */}
            <ZohoCard>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Performance Trends</h3>
                  <p className="text-sm text-[#95AAC9]">Machine performance over time</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { metric: 'Avg Uptime', value: '96.8%', trend: 'up', change: '+3.1%' },
                  { metric: 'Cycle Time', value: '4.2min', trend: 'down', change: '-8.5%' },
                  { metric: 'Output Rate', value: '156/hr', trend: 'up', change: '+12.3%' },
                  { metric: 'Error Rate', value: '0.8%', trend: 'down', change: '-2.1%' },
                  { metric: 'Energy Usage', value: '245kWh', trend: 'down', change: '-5.4%' },
                ].map((item) => (
                  <div key={item.metric} className="p-4 border border-[#E3E6F0] dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-[#95AAC9] mb-2">{item.metric}</p>
                    <p className="text-xl font-bold text-[#12263F] dark:text-white mb-1">{item.value}</p>
                    <p className={`text-xs font-medium ${
                      item.trend === 'up' ? 'text-[#28A745]' : 'text-[#DC3545]'
                    }`}>
                      {item.change}
                    </p>
                  </div>
                ))}
              </div>
            </ZohoCard>
          </>
        )}

        {/* Additional Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time-based Analytics */}
          <ZohoCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#2C7BE5]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Time Analysis</h3>
                <p className="text-sm text-[#95AAC9]">Production time breakdown</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Setup Time</span>
                <span className="text-sm font-semibold text-[#2C7BE5]">1.2h avg</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Run Time</span>
                <span className="text-sm font-semibold text-[#28A745]">6.8h avg</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Downtime</span>
                <span className="text-sm font-semibold text-[#DC3545]">2.3h total</span>
              </div>
            </div>
          </ZohoCard>

          {/* Personnel Analytics */}
          <ZohoCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-[#28A745]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#12263F] dark:text-white">Personnel Metrics</h3>
                <p className="text-sm text-[#95AAC9]">Workforce performance</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Active Operators</span>
                <span className="text-sm font-semibold text-[#28A745]">24</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Productivity Score</span>
                <span className="text-sm font-semibold text-[#2C7BE5]">92.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F8F9FC] dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-[#12263F] dark:text-white">Attendance Rate</span>
                <span className="text-sm font-semibold text-[#28A745]">96.8%</span>
              </div>
            </div>
          </ZohoCard>
        </div>
      </div>
    </ZohoLayout>
  )
}
