export interface DashboardKPIs {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  efficiency: number
  utilization: number
  onTimeDelivery: number
}

export interface Schedule {
  id: string
  order_id: string
  machine_id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed'
  priority: 'high' | 'medium' | 'low'
}

export interface Machine {
  id: string
  machine_id: string
  name: string
  status: 'running' | 'idle' | 'maintenance' | 'offline'
  current_order?: string
  utilization: number
}

export interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: string
  severity: 'high' | 'medium' | 'low'
}

export interface DashboardData {
  kpis: DashboardKPIs
  schedules: Schedule[]
  machines: Machine[]
  alerts: Alert[]
  lastUpdated?: string
  chartData?: any
}
