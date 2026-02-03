"use client"

import { ChevronDown, Clock, AlertCircle, RefreshCw, Download, Users, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/StatusBadge"
import type { AllTrackData } from '@/app/types'

interface Employee {
    code: string
    name: string
    status?: string
}

interface AllTrackRecordsSectionProps {
    canViewAllRecords: boolean
    dateRange: string
    setDateRange: (value: string) => void
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
    recordsPerPage: string
    setRecordsPerPage: (value: string) => void
    customLimit: string
    setCustomLimit: (value: string) => void
    exportFilter: 'active' | 'all'
    setExportFilter: (value: 'active' | 'all') => void
    canExportRecords: boolean
    onExportExcel: () => void
    showAllTrackRecords: boolean
    setShowAllTrackRecords: (value: boolean) => void
    allTrackData: AllTrackData | null
    allTrackLoading: boolean
    allTrackError: string | null
    setAllTrackError: (value: string | null) => void
    fetchAllTrackRecords: () => void
    getDateRangeLabel: () => string
}

export function AllTrackRecordsSection({
    canViewAllRecords,
    dateRange,
    setDateRange,
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
    recordsPerPage,
    setRecordsPerPage,
    customLimit,
    setCustomLimit,
    exportFilter,
    setExportFilter,
    canExportRecords,
    onExportExcel,
    showAllTrackRecords,
    setShowAllTrackRecords,
    allTrackData,
    allTrackLoading,
    allTrackError,
    setAllTrackError,
    fetchAllTrackRecords,
    getDateRangeLabel
}: AllTrackRecordsSectionProps) {
    if (!canViewAllRecords) {
        return null
    }

    return (
        <Card className="rounded-xl border border-border/50 shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-muted/30">
                <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">All Track Records</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Historical attendance data • {getDateRangeLabel()}
                </p>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Filters Section */}
                <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
                    {/* Date Range */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Date Range</label>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="w-[180px] bg-card">
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
                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-card"
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-card"
                                />
                            </div>
                        )}
                    </div>

                    {/* Employees */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Employees</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-input rounded-md hover:bg-accent transition-colors bg-card text-sm"
                            >
                                <span className="text-sm">
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
                    </div>

                    {/* Records Per Page */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Records per page</label>
                        <div className="flex items-center gap-2">
                            <Select value={recordsPerPage} onValueChange={setRecordsPerPage}>
                                <SelectTrigger className="bg-card">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">No Limit</SelectItem>
                                    <SelectItem value="10">10 records</SelectItem>
                                    <SelectItem value="25">25 records</SelectItem>
                                    <SelectItem value="50">50 records</SelectItem>
                                    <SelectItem value="100">100 records</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                            {recordsPerPage === 'custom' && (
                                <Input
                                    type="number"
                                    placeholder="Enter limit"
                                    value={customLimit}
                                    onChange={(e) => setCustomLimit(e.target.value)}
                                    className="bg-card mt-2"
                                />
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-end gap-2">
                        {canExportRecords && (
                            <div className="flex items-center gap-2">
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
                        <Button
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                            onClick={() => {
                                setShowAllTrackRecords(true)
                                fetchAllTrackRecords()
                            }}
                        >
                            Apply Filters
                        </Button>
                    </div>
                </div>

                {/* Error State */}
                {allTrackError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">Failed to Load Records</h3>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{allTrackError}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setAllTrackError(null)
                                    fetchAllTrackRecords()
                                }}
                                className="border-red-300 text-red-700 hover:bg-red-100"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {showAllTrackRecords && allTrackLoading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-5">
                        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground">Loading records...</p>
                    </div>
                )}

                {/* Data Table */}
                {showAllTrackRecords && !allTrackLoading && !allTrackError && (
                    <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b border-border/50">
                                    <TableHead className="font-bold text-foreground py-4">Employee Code</TableHead>
                                    <TableHead className="font-bold text-foreground">Employee Name</TableHead>
                                    <TableHead className="font-bold text-foreground">Status</TableHead>
                                    <TableHead className="font-bold text-foreground">Date</TableHead>
                                    <TableHead className="font-bold text-foreground">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    const logs = allTrackData?.allLogs || []
                                    const limit = recordsPerPage === 'all' ? logs.length :
                                        recordsPerPage === 'custom' ? parseInt(customLimit) || logs.length :
                                            parseInt(recordsPerPage)
                                    return logs.slice(0, limit).map((record: any, index: number) => (
                                        <TableRow
                                            key={index}
                                            className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                                        >
                                            <TableCell className="font-semibold py-4">{record.employee_code}</TableCell>
                                            <TableCell className="font-medium">{record.employee_name}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={record.punch_direction} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(record.log_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-sm">
                                                {new Date(record.log_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                })()}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Empty State */}
                {!showAllTrackRecords && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-5">
                        <div className="h-24 w-24 rounded-2xl bg-muted/50 dark:bg-gray-800 flex items-center justify-center border border-border/50 dark:border-gray-700">
                            <Clock className="h-12 w-12 text-muted-foreground dark:text-gray-400" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-foreground dark:text-gray-200">No Filter Applied</h3>
                            <p className="text-sm text-muted-foreground dark:text-gray-400 max-w-md">
                                Select date range, employees, and click Apply Filters to view records
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
