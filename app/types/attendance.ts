export interface AttendanceLog {
  id: string
  employee_code: string
  employee_name: string
  log_date: string
  punch_direction: 'IN' | 'OUT' | string
  device_id?: string
  created_at?: string
  sync_time?: string
}

export interface AttendanceSummary {
  date: string
  present: number
  absent: number
  percentage: number
}

export interface TodayAttendanceData {
  totalPresent: number
  totalAbsent: number
  attendancePercentage: number
  logs: AttendanceLog[]
  summary?: AttendanceSummary[] | {
    totalEmployees: number
    present: number
    absent: number
    lateArrivals: number
    earlyDepartures: number
  }
  lastSync?: string
  allLogs?: AttendanceLog[]
  todayStatus?: any
}

export interface AllTrackData {
  logs: AttendanceLog[]
  totalRecords: number
  fromDate: string
  toDate: string
  employees?: string[]
  allLogs?: AttendanceLog[]
}

export interface AttendanceAnalytics {
  dailyTrends: Array<{
    date: string
    present: number
    absent: number
    percentage: number
  }>
  departmentStats: Array<{
    department: string
    count: number
  }>
  genderStats: Array<{
    gender: string
    count: number
  }>
  timeDistribution: Array<{
    timeSlot: string
    count: number
  }>
  topPerformers: Array<{
    name: string
    attendanceRate: number
    onTimeRate: number
  }>
  averageAttendanceRate: number
  onTimeRate: number
  averageCheckInTime: string
}
