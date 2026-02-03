/***
 * Excel Export Utility for Attendance Data
 * 
 * Extracted from attendance page to improve code organization and bundle size.
 * All export logic is centralized here for reuse across the application.
 ***/

import * as XLSX from 'xlsx-js-style'
import { calculateDateRange } from '@/lib/utils/date-utils'
import { apiGet } from '@/app/lib/utils/api-client'

export interface ExportOptions {
    dateRange: string
    fromDate?: string
    toDate?: string
    selectedEmployees: string[]
    allEmployees: Array<{ code: string; name: string; status?: string }>
    exportFilter: 'active' | 'all'
    source?: 'today' | 'allTrack'
    allTrackData?: any
}

// Helper function to get week number
const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Month names for calendar display
const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
]

// Helper function to convert column index to Excel column letter
const getExcelColumnLetter = (index: number): string => {
    let letter = ''
    let num = index
    while (num >= 0) {
        letter = String.fromCharCode(65 + (num % 26)) + letter
        num = Math.floor(num / 26) - 1
    }
    return letter
}

/**
 * Generate Excel file from filtered logs
 */
export const generateExcelFile = (
    filteredLogs: any[],
    startDate: Date,
    endDate: Date,
    allEmployees: Array<{ code: string; name: string; status?: string }>
): void => {
    // Group logs by employee
    const employeeGroups: Record<string, any[]> = {}
    filteredLogs.forEach((log: any) => {
        const empCode = log.employee_code
        const employee = allEmployees.find(e => e.code === empCode)
        const employeeName = employee?.name || `Employee ${empCode}`

        if (!employeeGroups[employeeName]) {
            employeeGroups[employeeName] = []
        }
        employeeGroups[employeeName].push(log)
    })

    const wb = XLSX.utils.book_new()

    // Create a sheet for each employee
    Object.entries(employeeGroups)
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .forEach(([employeeName, logs]) => {
            const ws = createEmployeeSheet(employeeName, logs, startDate, endDate)
            const sheetName = employeeName.substring(0, 31)
            XLSX.utils.book_append_sheet(wb, ws, sheetName)
        })

    const fileName = `attendance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
}

/**
 * Create individual employee worksheet
 */
const createEmployeeSheet = (
    employeeName: string,
    logs: any[],
    startDate: Date,
    endDate: Date
): XLSX.WorkSheet => {
    const sheetData: any[] = []

    // Add employee name header
    sheetData.push([employeeName.toUpperCase()])
    sheetData.push([]) // Empty row

    // Generate ALL dates in the range
    const allDates: Date[] = []
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d))
    }

    // Calculate if multi-month
    const firstDate = new Date(startDate)
    const lastDate = new Date(endDate)
    const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        (lastDate.getMonth() - firstDate.getMonth())
    const isMultiMonth = monthsDiff >= 2

    // Build calendar rows for single month
    let calendarRows: any[] = []
    if (!isMultiMonth) {
        const monthName = MONTH_NAMES[firstDate.getMonth()]
        const year = firstDate.getFullYear()
        const firstDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
        const lastDayOfMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0)
        const daysInMonth = lastDayOfMonth.getDate()
        const startDayOfWeek = firstDayOfMonth.getDay()

        calendarRows.push(['', '', `${monthName} ${year} CALENDAR`])
        calendarRows.push(['', '', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])

        let dayCounter = 1
        const weeksNeeded = Math.ceil((startDayOfWeek + daysInMonth) / 7)

        for (let week = 0; week < weeksNeeded; week++) {
            const weekRow = ['', '']
            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day
                if (cellIndex < startDayOfWeek || dayCounter > daysInMonth) {
                    weekRow.push('')
                } else {
                    weekRow.push(dayCounter.toString())
                    dayCounter++
                }
            }
            calendarRows.push(weekRow)
        }
    }

    // Find max punches for this employee
    let employeeMaxPunches = 0
    allDates.forEach(date => {
        const dateLogs = logs.filter(log => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
        })
        if (dateLogs.length > employeeMaxPunches) {
            employeeMaxPunches = dateLogs.length
        }
    })

    // Create header with punch columns
    const header = ['Date']
    for (let i = 1; i <= employeeMaxPunches; i++) {
        header.push(`Punch ${i}`)
    }
    header.push('Status')

    // Add calendar day headers
    if (!isMultiMonth && calendarRows.length > 0) {
        header.push('') // Spacing column
        header.push('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')
    }

    sheetData.push(header)

    // Add data for each date
    allDates.forEach((date, dateIndex) => {
        const dateKey = date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
        })

        const dateLogs = logs.filter(log => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
        })

        const sortedDateLogs = dateLogs.sort((a, b) =>
            new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
        )

        const row = [dateKey]

        // Add each punch in its own column
        sortedDateLogs.forEach(log => {
            const time = new Date(log.log_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
            row.push(time)
        })

        // Fill remaining punch columns
        while (row.length < employeeMaxPunches + 1) {
            row.push('')
        }

        // Add status
        row.push(dateLogs.length > 0 ? 'Present' : 'Absent')

        // Add calendar columns (single month only)
        if (!isMultiMonth && calendarRows.length > 0) {
            row.push('') // Spacing
            if (dateIndex + 2 < calendarRows.length) {
                const calendarRow = calendarRows[dateIndex + 2] || []
                for (let i = 2; i < 9; i++) {
                    row.push(calendarRow[i] || '')
                }
            } else {
                for (let i = 0; i < 7; i++) {
                    row.push('')
                }
            }
        }

        sheetData.push(row)
    })

    // Add attendance summary
    const summaryData = calculateAttendanceSummary(sheetData, allDates, logs, employeeMaxPunches, isMultiMonth)
    summaryData.forEach(row => sheetData.push(row))

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData)

    // Set column widths
    const colWidths = [{ width: 20 }] // Date column
    for (let i = 0; i < employeeMaxPunches; i++) {
        colWidths.push({ width: 12 }) // Punch columns
    }
    colWidths.push({ width: 12 }) // Status column

    if (!isMultiMonth && calendarRows.length > 0) {
        colWidths.push({ width: 3 }) // Spacing
        for (let i = 0; i < 7; i++) {
            colWidths.push({ width: 8 }) // Calendar days
        }
    }

    ws['!cols'] = colWidths

    // Apply styling
    applyExcelStyling(ws, employeeMaxPunches)

    return ws
}

/**
 * Calculate attendance summary statistics
 */
const calculateAttendanceSummary = (
    sheetData: any[],
    allDates: Date[],
    logs: any[],
    employeeMaxPunches: number,
    isMultiMonth: boolean
): any[] => {
    const totalDays = allDates.length
    const dataRows = sheetData.slice(3) // Skip header rows
    const statusColumnIndex = employeeMaxPunches + 1

    const presentDays = dataRows.filter(row => row[statusColumnIndex] === 'Present').length
    const absentDays = totalDays - presentDays
    const attendancePercent = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : '0.00'

    // Calculate punch metrics
    let totalPunches = 0
    let maxPunchesInDay = 0
    let maxPunchesDate = ''
    let minPunchesInDay = Infinity
    let minPunchesDate = ''
    let oddPunchDays = 0

    dataRows.forEach((row) => {
        const status = row[statusColumnIndex]
        if (status === 'Present') {
            let dayPunches = 0
            for (let i = 1; i < statusColumnIndex; i++) {
                if (row[i] && row[i] !== '') {
                    dayPunches++
                }
            }

            totalPunches += dayPunches

            if (dayPunches > maxPunchesInDay) {
                maxPunchesInDay = dayPunches
                maxPunchesDate = row[0]
            }

            if (dayPunches > 0 && dayPunches < minPunchesInDay) {
                minPunchesInDay = dayPunches
                minPunchesDate = row[0]
            }

            if (dayPunches % 2 !== 0) {
                oddPunchDays++
            }
        }
    })

    const avgPunches = presentDays > 0 ? (totalPunches / presentDays).toFixed(2) : '0.00'
    const minPunchesDisplay = minPunchesInDay === Infinity ? 0 : minPunchesInDay

    const summaryRows = [
        [],
        ['ATTENDANCE SUMMARY'],
        ['Total Days in Period', totalDays],
        ['Present Days', presentDays],
        ['Absent Days', absentDays],
        ['Attendance %', `${attendancePercent}%`],
        [],
        [],
        ['PUNCH ANALYSIS'],
        ['Total Punches', totalPunches],
        ['Average Punches/Day', avgPunches],
        ['Highest Punches in a Day', `${maxPunchesInDay} (on ${maxPunchesDate})`],
        ['Lowest Punches in a Day', `${minPunchesDisplay} (on ${minPunchesDate})`],
        ['Days with Odd Punches', `${oddPunchDays} (missing IN/OUT)`]
    ]

    // Add monthly breakdown for multi-month ranges
    if (isMultiMonth) {
        summaryRows.push([])
        summaryRows.push([])
        summaryRows.push(['MONTHLY BREAKDOWN'])
        summaryRows.push(['Month', 'Days', 'Present', 'Absent', 'Attendance %', 'Total Punches', 'Avg Punches/Day'])

        const monthlyStats = calculateMonthlyStats(allDates, logs)
        Object.entries(monthlyStats).forEach(([month, stats]: [string, any]) => {
            const attendPercent = stats.days > 0 ? ((stats.present / stats.days) * 100).toFixed(2) : '0.00'
            const avgPunchesPerDay = stats.present > 0 ? (stats.punches / stats.present).toFixed(2) : '0.00'

            summaryRows.push([
                month,
                stats.days,
                stats.present,
                stats.absent,
                `${attendPercent}%`,
                stats.punches,
                avgPunchesPerDay
            ])
        })
    }

    return summaryRows
}

/**
 * Calculate monthly statistics
 */
const calculateMonthlyStats = (allDates: Date[], logs: any[]): Record<string, any> => {
    const monthlyStats: Record<string, any> = {}

    allDates.forEach(date => {
        const monthKey = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`

        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { days: 0, present: 0, absent: 0, punches: 0 }
        }

        monthlyStats[monthKey].days++

        const dateLogs = logs.filter(log => {
            const logDate = new Date(log.log_date).toDateString()
            return logDate === date.toDateString()
        })

        if (dateLogs.length > 0) {
            monthlyStats[monthKey].present++
            monthlyStats[monthKey].punches += dateLogs.length
        } else {
            monthlyStats[monthKey].absent++
        }
    })

    return monthlyStats
}

/**
 * Apply Excel styling to worksheet
 */
const applyExcelStyling = (ws: XLSX.WorkSheet, employeeMaxPunches: number): void => {
    const columnLetters: string[] = []
    const totalCols = employeeMaxPunches + 2

    for (let i = 0; i < totalCols; i++) {
        columnLetters.push(getExcelColumnLetter(i))
    }

    // Style employee name header (Row 1)
    columnLetters.forEach((col) => {
        const cellRef = `${col}1`
        if (ws[cellRef]) {
            ws[cellRef].s = {
                fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } },
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            }
        }
    })

    // Style column headers (Row 3)
    columnLetters.forEach((col) => {
        const cellRef = `${col}3`
        if (ws[cellRef]) {
            ws[cellRef].s = {
                fill: { patternType: "solid", fgColor: { rgb: "4472C4" } },
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            }
        }
    })
}

/**
 * Main export function - handles fetching data and generating Excel
 */
export const exportAttendanceToExcel = async (options: ExportOptions): Promise<void> => {
    const {
        dateRange,
        fromDate,
        toDate,
        selectedEmployees,
        allEmployees,
        exportFilter,
        source = 'today',
        allTrackData
    } = options

    const { fromDate: fromDateParam, toDate: toDateParam } = calculateDateRange(dateRange, fromDate, toDate)

    if (source === 'today') {
        // Fetch fresh data for export
        const params = new URLSearchParams()
        params.append('fromDate', fromDateParam)
        params.append('toDate', toDateParam)

        if (selectedEmployees.length > 0 && selectedEmployees.length < allEmployees.length) {
            params.append('employeeCodes', selectedEmployees.join(','))
        }

        const response = await apiGet(`/api/get-attendance?${params.toString()}`)
        if (!response.success || !response.data?.allLogs || response.data.allLogs.length === 0) {
            throw new Error('No attendance data found for the selected date range and employees.')
        }

        let filteredLogs = response.data.allLogs

        if (exportFilter === 'active') {
            filteredLogs = filteredLogs.filter((log: any) => {
                const emp = allEmployees.find(e => e.code === log.employee_code)
                return emp?.status?.toLowerCase() === 'active'
            })
        }

        if (filteredLogs.length === 0) {
            throw new Error('No logs found for Active employees.')
        }

        const startDate = new Date(fromDateParam)
        const endDate = new Date(toDateParam)
        generateExcelFile(filteredLogs, startDate, endDate, allEmployees)
        return
    }

    // For allTrack source
    if (!allTrackData?.allLogs) {
        throw new Error('No data to export. Please load data first.')
    }

    let filteredLogs = allTrackData.allLogs.filter((log: any) =>
        selectedEmployees.length === 0 ||
        selectedEmployees.length === allEmployees.length ||
        selectedEmployees.includes(log.employee_code)
    )

    if (exportFilter === 'active') {
        filteredLogs = filteredLogs.filter((log: any) => {
            const emp = allEmployees.find(e => e.code === log.employee_code)
            return emp?.status?.toLowerCase() === 'active'
        })
    }

    if (filteredLogs.length === 0) {
        throw new Error('No attendance data found matching criteria.')
    }

    const startDate = new Date(fromDateParam)
    const endDate = new Date(toDateParam)
    generateExcelFile(filteredLogs, startDate, endDate, allEmployees)
}
