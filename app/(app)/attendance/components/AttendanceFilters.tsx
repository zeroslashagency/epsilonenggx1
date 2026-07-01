"use client"

import { Calendar, Users, ChevronDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

interface Employee {
    code: string
    name: string
    status?: string
}

interface AttendanceFiltersProps {
    dateRange: string
    setDateRange: (value: string) => void
    employeeFilter: string
    setEmployeeFilter: (value: string) => void
    fromDate: string
    setFromDate: (value: string) => void
    toDate: string
    setToDate: (value: string) => void
    selectedEmployees: string[]
    allEmployees: Employee[]
    showEmployeeDropdown: boolean
    setShowEmployeeDropdown: (value: boolean) => void
    toggleEmployee: (code: string) => void
    toggleAllEmployees: () => void
    exportFilter: 'active' | 'all'
    setExportFilter: (value: 'active' | 'all') => void
    canExportExcel: boolean
    onExportExcel: () => void
}

export function AttendanceFilters({
    dateRange,
    setDateRange,
    employeeFilter,
    setEmployeeFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedEmployees,
    allEmployees,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    toggleEmployee,
    toggleAllEmployees,
    exportFilter,
    setExportFilter,
    canExportExcel,
    onExportExcel
}: AttendanceFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background border-border/50 font-medium shadow-sm text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="prev-week">Previous Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="prev-month">Previous Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="prev-quarter">Previous Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="prev-year">Previous Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Employee Multi-Select */}
            <div className="relative">
                <button
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900 shadow-sm"
                >
                    <Users className="h-4 w-4" />
                    <span className="font-medium text-sm">
                        {selectedEmployees.length === allEmployees.length
                            ? 'All Employees'
                            : `${selectedEmployees.length} Selected`}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                </button>
                {showEmployeeDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-[5]"
                            onClick={() => setShowEmployeeDropdown(false)}
                        />
                        <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 w-64 max-h-96 overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={selectedEmployees.length === allEmployees.length}
                                        onCheckedChange={toggleAllEmployees}
                                    />
                                    <span className="font-medium text-sm">Select All ({allEmployees.length})</span>
                                </div>
                            </div>
                            <div className="p-2">
                                {allEmployees.map((employee) => (
                                    <div
                                        key={employee.code}
                                        className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                    >
                                        <Checkbox
                                            checked={selectedEmployees.includes(employee.code)}
                                            onCheckedChange={() => toggleEmployee(employee.code)}
                                        />
                                        <span className="text-sm font-medium">{employee.name}</span>
                                        <span className="text-xs text-gray-500">({employee.code})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === 'custom' && (
                <>
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-[150px]"
                        placeholder="From Date"
                    />
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-[150px]"
                        placeholder="To Date"
                    />
                    <Button className="gap-2 font-semibold">
                        Apply
                    </Button>
                </>
            )}

            {/* Employee Status Filter */}
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="w-[180px] bg-background border-border/50 font-medium shadow-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="present">Present Today</SelectItem>
                        <SelectItem value="absent">Absent Today</SelectItem>
                        <SelectItem value="late">Late Arrivals</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Export Controls */}
            {canExportExcel && (
                <div className="flex items-center gap-2 ml-auto">
                    <Select value={exportFilter} onValueChange={(val: 'active' | 'all') => setExportFilter(val)}>
                        <SelectTrigger className="w-[180px] bg-background border-border/50 font-medium shadow-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Export: Active Only</SelectItem>
                            <SelectItem value="all">Export: All Employees</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="gap-2 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 shadow-md"
                        onClick={onExportExcel}
                    >
                        <Download className="h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            )}
        </div>
    )
}
