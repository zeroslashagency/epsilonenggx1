"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Activity } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface AttendanceLog {
  log_date: string
  punch_direction: string
  employee_code: string
}

interface AttendanceTodayChartProps {
  data: AttendanceLog[]
  loading?: boolean
}

const chartConfig = {
  checkIn: {
    label: "Check In",
    color: "hsl(221.2 83.2% 53.3%)", // Blue color matching shadcn
  },
} satisfies ChartConfig

export function AttendanceTodayChart({ data, loading }: AttendanceTodayChartProps) {
  // Process data into hourly buckets with employee details
  const chartData = React.useMemo(() => {
    // Create 24-hour buckets
    const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => {
      // Format hour for display
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      
      return {
        hour: `${displayHour} ${period}`,
        hourValue: hour,
        checkIn: 0,
        employees: [] as Array<{
          name: string
          code: string
          time: string
        }>
      }
    })

    // Count check-ins per hour and store employee details
    data.forEach(log => {
      if (log.punch_direction === 'in') {
        const logDate = new Date(log.log_date)
        const logHour = logDate.getHours()
        
        hourlyBuckets[logHour].checkIn++
        hourlyBuckets[logHour].employees.push({
          name: (log as any).employee_name || log.employee_code,
          code: log.employee_code,
          time: logDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
        })
      }
    })

    // Get current hour to show line up to now
    const now = new Date()
    const currentHour = now.getHours()

    // Set checkIn to null for hours AFTER current time
    // This shows the line up to current hour with 0 values, then stops
    for (let i = currentHour + 1; i < 24; i++) {
      hourlyBuckets[i].checkIn = null as any
    }

    return hourlyBuckets
  }, [data])

  // Calculate total check-ins and max value
  const { totalCheckIns, maxCheckIns } = React.useMemo(() => {
    let total = 0
    let max = 0
    chartData.forEach(item => {
      if (item.checkIn !== null && item.checkIn > 0) {
        total += item.checkIn
        if (item.checkIn > max) {
          max = item.checkIn
        }
      }
    })
    return { totalCheckIns: total, maxCheckIns: max }
  }, [chartData])

  if (loading) {
    return (
      <Card className="shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="p-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">Today's Activity Pattern</CardTitle>
              <CardDescription className="text-sm font-medium">
                Hourly check-in distribution for {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </CardDescription>
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 sm:border-t-0 sm:border-l sm:px-8 sm:py-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <span className="text-xs uppercase font-semibold text-blue-700 dark:text-blue-300">
              Total Check Ins
            </span>
            <span className="text-3xl font-bold leading-none text-blue-900 dark:text-blue-100 sm:text-4xl">
              {totalCheckIns.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 16,
              right: 16,
              top: 16,
              bottom: 8,
            }}
          >
            <CartesianGrid 
              vertical={false} 
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={40}
              className="text-xs font-medium"
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="text-xs font-medium"
              width={40}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                
                const data = payload[0].payload
                if (data.checkIn === null || data.checkIn === 0) return null
                
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[250px]">
                    <div className="mb-2 border-b pb-2">
                      <p className="font-semibold text-sm">{data.hour}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.checkIn} check-in{data.checkIn > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {data.employees.map((emp: any, idx: number) => (
                        <div key={idx} className="text-xs border-l-2 border-blue-500 pl-2 py-1">
                          <p className="font-medium text-foreground">{emp.name}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {emp.code} • {emp.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }}
            />
            <Line
              dataKey="checkIn"
              type="monotone"
              stroke="var(--color-checkIn)"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                // Get current hour
                const now = new Date()
                const currentHour = now.getHours()
                const period = currentHour >= 12 ? 'PM' : 'AM'
                const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour
                const currentHourLabel = `${displayHour} ${period}`
                
                // Only show dot at current hour (end of line)
                if (payload.hour === currentHourLabel) {
                  return (
                    <g key={`dot-${payload.hour}`}>
                      {/* Outer glow */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="var(--color-checkIn)"
                        opacity={0.2}
                        className="animate-pulse"
                      />
                      {/* Inner dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="var(--color-checkIn)"
                        stroke="white"
                        strokeWidth={2}
                      />
                    </g>
                  )
                }
                return <g key={`empty-${payload.hour}`} />
              }}
              activeDot={{
                r: 6,
              }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
