'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendData {
  date: string
  dayName: string
  present: number
  absent: number
  totalEmployees: number
}

interface AttendanceTrendChartProps {
  data: TrendData[]
  totalEmployees: number
}

export default function AttendanceTrendChart({ data, totalEmployees }: AttendanceTrendChartProps) {
  // Transform data to show present vs absent
  const chartData = data.map(day => ({
    ...day,
    absent: Math.max(0, totalEmployees - day.present),
    attendanceRate: totalEmployees > 0 ? Math.round((day.present / totalEmployees) * 100) : 0
  }))

  return (
    <div className="w-full h-[320px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Last 7 Days Attendance</h3>
        <p className="text-sm text-gray-600">Daily attendance ratio - Present vs Absent employees</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="dayName" 
            stroke="#64748b"
            style={{ fontSize: '12px', fontWeight: '500' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontSize: '14px'
            }}
            formatter={(value: any, name: string) => [
              `${value} employees`,
              name === 'present' ? 'Present' : 'Absent'
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend 
            wrapperStyle={{ fontSize: '13px', fontWeight: '500' }}
            iconType="circle"
          />
          <Bar 
            dataKey="present" 
            fill="#22c55e" 
            name="Present"
            radius={[4, 4, 0, 0]}
            strokeWidth={0}
          />
          <Bar 
            dataKey="absent" 
            fill="#ef4444" 
            name="Absent"
            radius={[4, 4, 0, 0]}
            strokeWidth={0}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
