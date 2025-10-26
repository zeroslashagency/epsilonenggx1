"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

interface TrendData {
  date: string
  dayName: string
  present: number
  absent: number
  totalEmployees: number
  fullDate?: string
}

interface AttendanceChartShadcnProps {
  data: TrendData[]
  totalEmployees: number
  onPeriodChange?: (direction: 'prev' | 'next') => void
  currentPeriod?: number
}

const chartConfig = {
  views: {
    label: "Attendance",
  },
  present: {
    label: "Present",
    color: "hsl(var(--chart-1))",
  },
  absent: {
    label: "Absent", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function AttendanceChartShadcn({ 
  data, 
  totalEmployees, 
  onPeriodChange, 
  currentPeriod = 0 
}: AttendanceChartShadcnProps) {
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("present")

  // Transform data to show present vs absent
  const chartData = data.map(day => ({
    date: day.date,
    dayName: day.dayName,
    present: day.present,
    absent: Math.max(0, totalEmployees - day.present),
    fullDate: day.fullDate || new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }))

  const total = React.useMemo(
    () => ({
      present: chartData.reduce((acc, curr) => acc + curr.present, 0),
      absent: chartData.reduce((acc, curr) => acc + curr.absent, 0),
    }),
    [chartData]
  )

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Last 14 Days Attendance</CardTitle>
              <CardDescription>
                Daily attendance tracking - Present vs Absent employees
              </CardDescription>
            </div>
          </div>
        </div>
        <div className="flex">
          {["present", "absent"].map((key) => {
            const chart = key as keyof typeof chartConfig
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  nameKey="attendance"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} employees`,
                    String(name) === 'present' ? 'Present' : 'Absent'
                  ]}
                />
              }
            />
            <Bar 
              dataKey={activeChart} 
              fill={`var(--color-${activeChart})`}
              radius={[4, 4, 0, 0]}
              name={activeChart === 'present' ? 'Present' : 'Absent'}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
