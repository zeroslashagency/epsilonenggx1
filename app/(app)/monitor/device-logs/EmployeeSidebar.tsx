"use client"

import { Smartphone, Search, Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Employees</h3>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            {onlineCount} online
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                    </div>
                </div>

                {/* All Employees Option */}
                <button
                    onClick={() => onSelectEmployee(null)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${selectedEmployee === null
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Smartphone className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">All Employees</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{employees.length} total</p>
                    </div>
                </button>

                {/* Employee List */}
                <div className="max-h-[500px] overflow-y-auto">
                    {filteredEmployees.map((emp) => (
                        <button
                            key={emp.employee_code}
                            onClick={() => onSelectEmployee(emp.employee_code)}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 transition-colors ${selectedEmployee === emp.employee_code
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            <div className="relative">
                                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {emp.employee_name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <Circle
                                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${emp.isOnline ? 'text-emerald-500 fill-emerald-500' : 'text-slate-300 fill-slate-300'
                                        }`}
                                />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {emp.employee_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {emp.isOnline ? 'Online' : formatTimeAgo(emp.last_active)}
                                </p>
                            </div>
                        </button>
                    ))}
                    {filteredEmployees.length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-400">
                            No employees found
                        </div>
                    )}
                </div>
            </div>
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
