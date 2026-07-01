"use client"

import { Activity, UserCheck, AlertCircle, UserX, Clock } from "lucide-react"
import { StatsCard } from "@/components/StatsCard"

interface AttendanceSummaryCardsProps {
    activePunches: number
    activeUsers: number
    lateArrivals: number
    holidayEmployees: number
    totalEmployees: number
}

export function AttendanceSummaryCards({
    activePunches,
    activeUsers,
    lateArrivals,
    holidayEmployees,
    totalEmployees
}: AttendanceSummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard
                title="Today Active Punches"
                value={activePunches}
                description="All punch activities today"
                icon={Activity}
                variant="purple"
            />
            <StatsCard
                title="Today Active Users"
                value={activeUsers}
                description="Employees who came today"
                icon={UserCheck}
                variant="green"
            />
            <StatsCard
                title="Delay Employee"
                value={lateArrivals}
                description="Late arrivals today"
                icon={AlertCircle}
                variant="orange"
            />
            <StatsCard
                title="Holiday Employee"
                value={holidayEmployees}
                description="Employees on holiday"
                icon={Clock}
                variant="orange"
            />
            <StatsCard
                title="Total Employees"
                value={totalEmployees}
                description="Registered employees"
                icon={UserX}
                variant="blue"
            />
        </div>
    )
}
