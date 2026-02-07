"use client"

import { Smartphone, Search, Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

interface Employee {
    employee_code: string
    employee_name: string
    device_id: string
    last_active: string
    isOnline: boolean
}

interface EmployeeSidebarProps {
    employees: Employee[]
    selectedEmployee: string | null
    onSelectEmployee: (code: string | null) => void
}

export function EmployeeSidebar({ employees, selectedEmployee, onSelectEmployee }: EmployeeSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredEmployees = employees.filter(emp =>
        emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const onlineCount = employees.filter(e => e.isOnline).length

    return (
        <div className="w-full lg:w-72 shrink-0">
            <Card className="overflow-hidden border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <CardHeader className="border-b border-slate-200/70 px-4 pb-4 pt-4 dark:border-slate-800/80">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-base text-slate-900 dark:text-white">Employees</CardTitle>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Online {onlineCount} / {employees.length}
                            </p>
                        </div>
                        <Badge className="border-emerald-200/60 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                            {onlineCount} online
                        </Badge>
                    </div>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                    </div>
                </CardHeader>

                <CardContent className="px-0">
                    <button
                        onClick={() => onSelectEmployee(null)}
                        className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors dark:border-slate-800/60 ${selectedEmployee === null
                            ? 'bg-slate-100/70 dark:bg-slate-800/60'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
                                <Smartphone className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">All Employees</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{employees.length} total devices</p>
                            </div>
                        </div>
                    </button>

                    <div className="max-h-[520px] overflow-y-auto">
                        {filteredEmployees.map((emp) => (
                            <button
                                key={emp.employee_code}
                                onClick={() => onSelectEmployee(emp.employee_code)}
                                className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors dark:border-slate-800/60 ${selectedEmployee === emp.employee_code
                                    ? 'bg-slate-100/70 dark:bg-slate-800/60'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-sm font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                            {emp.employee_name.charAt(0).toUpperCase()}
                                        </div>
                                        <Circle
                                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${emp.isOnline
                                                ? 'text-emerald-500 fill-emerald-500'
                                                : 'text-slate-300 fill-slate-300 dark:text-slate-600 dark:fill-slate-600'
                                                }`}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{emp.employee_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {emp.isOnline ? 'Online now' : formatTimeAgo(emp.last_active)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <div className="p-6 text-center text-sm text-slate-400">No employees found</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function formatTimeAgo(dateStr: string | null): string {
    if (!dateStr) return 'No activity'

    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
}
