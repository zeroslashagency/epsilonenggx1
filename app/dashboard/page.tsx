"use client"

import { ZohoLayout } from '../components/zoho-ui/ZohoLayout'
import { 
  Users, 
  Calendar,
  TrendingUp,
  Factory
} from 'lucide-react'

export default function DashboardPage() {
  return (
    <ZohoLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-[#95AAC9] mt-1">
            Welcome back, mr1398463@gmail.com
          </p>
        </div>

        {/* Stat Cards - Clean Zoho Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Orders */}
          <div className="bg-[#E3EBFA] dark:bg-blue-900/20 border border-[#2C7BE5]/20 rounded-[4px] p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-[#2C7BE5]" />
            </div>
            <div className="text-3xl font-bold text-[#12263F] dark:text-white mb-1">0</div>
            <div className="text-sm text-[#2C7BE5] font-medium">Active Orders</div>
            <div className="text-xs text-[#95AAC9] mt-1">Active orders from scheduling</div>
          </div>

          {/* Machines Running */}
          <div className="bg-[#D4EDDA] dark:bg-green-900/20 border border-[#28A745]/20 rounded-[4px] p-6">
            <div className="flex items-center justify-between mb-2">
              <Factory className="w-8 h-8 text-[#28A745]" />
            </div>
            <div className="text-3xl font-bold text-[#12263F] dark:text-white mb-1">0/10</div>
            <div className="text-sm text-[#28A745] font-medium">Machines Running</div>
            <div className="text-xs text-[#95AAC9] mt-1">0% utilization rate</div>
          </div>

          {/* Total Employees */}
          <div className="bg-white dark:bg-gray-800 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-[#6F42C1]" />
            </div>
            <div className="text-3xl font-bold text-[#12263F] dark:text-white mb-1">156</div>
            <div className="text-sm text-[#12263F] dark:text-white font-medium">Total Employees</div>
            <div className="text-xs text-[#28A745] mt-1">+12 this month</div>
          </div>

          {/* Present Today */}
          <div className="bg-white dark:bg-gray-800 border border-[#E3E6F0] dark:border-gray-700 rounded-[4px] p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-[#FD7E14]" />
            </div>
            <div className="text-3xl font-bold text-[#12263F] dark:text-white mb-1">142</div>
            <div className="text-sm text-[#12263F] dark:text-white font-medium">Present Today</div>
            <div className="text-xs text-[#28A745] mt-1">91.0% attendance</div>
          </div>
        </div>

        {/* Production Timeline */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Production Timeline
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time view of machine scheduling and operations
            </p>
          </div>

          {/* Timeline Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Order ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Part Number
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No active orders
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Utilization */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Machine Utilization
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Current machine capacity usage
            </p>
          </div>

          <div className="space-y-4">
            {[
              { name: 'VMC 1', utilization: 65 },
              { name: 'VMC 2', utilization: 77 },
              { name: 'VMC 3', utilization: 91 },
              { name: 'VMC 4', utilization: 90 },
              { name: 'VMC 5', utilization: 89 }
            ].map((machine) => (
              <div key={machine.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {machine.name}
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {machine.utilization}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${machine.utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
