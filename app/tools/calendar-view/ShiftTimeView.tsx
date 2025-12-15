"use client"

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Clock, MoreHorizontal, CheckCircle2, Circle } from 'lucide-react'
import { TimelineEmployee, TimelineShift } from './TimelineView'

interface ShiftTimeViewProps {
    employees: TimelineEmployee[]
    currentDate: Date
    onDateChange: (date: Date) => void
    isLoading: boolean
}

// Helper to determine shift type
function getShiftType(startTime: string) {
    const hour = parseInt(startTime.split(':')[0], 10)
    if (hour >= 5 && hour < 14) return 'morning'
    if (hour >= 14 && hour < 22) return 'evening'
    return 'night'
}

// Section Configuration (Theme Colors)
const SECTIONS = {
    morning: {
        title: 'Morning Shifts',
        icon: Sun,
        primary: 'amber',
        borderColor: 'border-amber-500/30',
        titleColor: 'text-amber-400',
        glowColor: 'shadow-amber-500/20',
        headerGradient: 'from-amber-500/10 to-transparent',
        progressBar: 'bg-amber-500'
    },
    evening: {
        title: 'Evening Shifts',
        icon: Sunset,
        primary: 'orange',
        borderColor: 'border-orange-500/30',
        titleColor: 'text-orange-400',
        glowColor: 'shadow-orange-500/20',
        headerGradient: 'from-orange-500/10 to-transparent',
        progressBar: 'bg-orange-500'
    },
    night: {
        title: 'Night Shifts',
        icon: Moon,
        primary: 'indigo',
        borderColor: 'border-indigo-500/30',
        titleColor: 'text-indigo-400',
        glowColor: 'shadow-indigo-500/20',
        headerGradient: 'from-indigo-500/10 to-transparent',
        progressBar: 'bg-indigo-500'
    }
}

export function ShiftTimeView({ employees, currentDate, onDateChange, isLoading }: ShiftTimeViewProps) {
    // 1. Filter Data for the Selected Date ONLY
    const dailyShifts = useMemo(() => {
        const morning: { emp: TimelineEmployee, shift: TimelineShift }[] = []
        const evening: { emp: TimelineEmployee, shift: TimelineShift }[] = []
        const night: { emp: TimelineEmployee, shift: TimelineShift }[] = []

        const dateStr = currentDate.toISOString().split('T')[0]

        employees.forEach(emp => {
            // Find shift for THIS day
            const shift = emp.shifts.find(s => s.date === dateStr)
            if (shift) {
                const type = getShiftType(shift.startTime)
                const item = { emp, shift }

                if (type === 'morning') morning.push(item)
                else if (type === 'evening') evening.push(item)
                else night.push(item)
            }
        })

        return { morning, evening, night }
    }, [employees, currentDate])

    // Helper to render a column
    const renderColumn = (
        type: 'morning' | 'evening' | 'night',
        items: { emp: TimelineEmployee, shift: TimelineShift }[]
    ) => {
        const config = SECTIONS[type]
        const Icon = config.icon

        return (
            <div className={`flex flex-col h-full bg-gray-900/40 rounded-2xl border ${config.borderColor} overflow-hidden backdrop-blur-sm shadow-xl`}>
                {/* Column Header */}
                <div className={`p-5 border-b ${config.borderColor} bg-gradient-to-b ${config.headerGradient}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gray-950/50 border border-${config.primary}-500/20`}>
                                <Icon className={`w-5 h-5 ${config.titleColor}`} />
                            </div>
                            <h3 className={`text-lg font-bold tracking-tight ${config.titleColor}`}>{config.title}</h3>
                        </div>
                        <span className="text-xs font-mono px-2 py-1 rounded bg-gray-950/50 text-gray-400 border border-gray-800">
                            {items.length} Active
                        </span>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {items.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-gray-600 space-y-2 border-2 border-dashed border-gray-800/50 rounded-xl m-2">
                            <div className="p-3 rounded-full bg-gray-800/20">
                                <Icon className="w-5 h-5 opacity-20" />
                            </div>
                            <span className="text-sm">No shifts scheduled</span>
                        </div>
                    ) : (
                        items.map(({ emp, shift }) => (
                            <ShiftCard key={shift.id} emp={emp} shift={shift} config={config} />
                        ))
                    )}
                </div>
            </div>
        )
    }

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
    }

    return (
        <div className="flex flex-col h-full bg-black/95 p-6 space-y-6">

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between sticky top-0 z-10 p-1">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                                Daily Overview
                            </span>
                        </h2>
                        <p className="text-sm text-gray-400 font-medium ml-0.5">
                            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-900/80 p-1.5 rounded-xl border border-gray-800 shadow-lg backdrop-blur-md">
                    <button
                        onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); onDateChange(d) }}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <button
                        onClick={() => onDateChange(new Date())}
                        className="px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-sm font-semibold rounded-md border border-blue-500/30 transition-all uppercase tracking-wide"
                    >
                        Today
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <button
                        onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); onDateChange(d) }}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 3-Column Grid Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {renderColumn('morning', dailyShifts.morning)}
                {renderColumn('evening', dailyShifts.evening)}
                {renderColumn('night', dailyShifts.night)}
            </div>

        </div>
    )
}

// ------ Sub-Component: Detailed Employee Card ------
function ShiftCard({ emp, shift, config }: { emp: TimelineEmployee, shift: TimelineShift, config: any }) {
    // Mock Logic for Progress/Status
    // In a real app with HH:mm strings, we'd parse them against new Date().
    // Assuming strict strings "HH:mm"

    const calculateProgress = () => {
        // Simplified mock progress for visual flair
        // Randomish but stable based on name length to vary UI
        const seed = emp.name.length * shift.startTime.length
        return Math.min(Math.max((seed % 100), 20), 90)
    }

    const progress = calculateProgress()

    return (
        <div className={`group relative p-4 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/80 hover:border-${config.primary}-500/50 transition-all duration-300 hover:shadow-lg ${config.glowColor}`}>

            {/* Glow Effect on Hover */}
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-${config.primary}-500/0 via-${config.primary}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

            <div className="relative flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 p-0.5 border border-gray-600 group-hover:border-${config.primary}-500/50 transition-colors`}>
                        <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-300">
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold tracking-wide">{emp.name}</h4>
                        <p className="text-xs text-gray-400 font-medium">{emp.department || 'Staff Member'}</p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border bg-gray-900/50 ${config.titleColor} border-${config.primary}-500/20`}>
                    Active
                </div>
            </div>

            <div className="relative space-y-3">
                {/* Time Info */}
                <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-950/30 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        <span className="font-mono text-gray-300">{shift.startTime} - {shift.endTime}</span>
                    </div>
                    <span className={`text-${config.primary}-400/80 font-medium`}>{progress}% Elapsed</span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${config.progressBar} shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    )
}
