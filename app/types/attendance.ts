export interface AttendanceLog {
  id: string
  employee_code: string
  employee_name: string
  log_date: string
  punch_direction: 'IN' | 'OUT' | string
  device_id?: string
  created_at?: string
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
  summary?: AttendanceSummary[]
  lastSync?: string
}

export interface AllTrackData {
  logs: AttendanceLog[]
  totalRecords: number
  fromDate: string
  toDate: string
  employees?: string[]
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
