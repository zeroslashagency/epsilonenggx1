"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '@/app/components/zoho-ui'
import { Wrench, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface MaintenanceRecord {
  id: string
  machine_id: string
  machine_name: string
  type: 'scheduled' | 'preventive' | 'corrective'
  status: 'completed' | 'in_progress' | 'scheduled' | 'overdue'
  technician: string
  scheduled_date: string
  completed_date: string | null
  notes: string
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaintenanceRecords()
  }, [])

  const fetchMaintenanceRecords = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/monitoring/maintenance')
      
      if (data.success) {
        // Transform API data to match UI interface
        const transformedRecords = (data.data || []).map((r: any) => ({
          ...r,
          machine_id: r.machine?.machine_id || 'N/A',
          machine_name: r.machine?.name || 'Unknown Machine',
          technician: r.technician_name
        }))
        setRecords(transformedRecords)
      } else {
        console.error('Error fetching maintenance records:', data.error)
        setRecords([])
      }
    } catch (error) {
      console.error('Error fetching maintenance records:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      scheduled: { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    return config[status as keyof typeof config] || config.scheduled
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      preventive: 'bg-green-100 text-green-800',
      corrective: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track machine maintenance and repairs</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{records.filter(r => r.status === 'completed').length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{records.filter(r => r.status === 'in_progress').length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                  <p className="text-2xl font-bold text-yellow-600">{records.filter(r => r.status === 'scheduled').length}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{records.filter(r => r.status === 'overdue').length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">Loading maintenance records...</div>
            ) : (
              records.map((record) => {
                const statusConfig = getStatusBadge(record.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <div key={record.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{record.machine_name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {record.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadge(record.type)}`}>
                            {record.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{record.machine_id}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Technician</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{record.technician}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Scheduled Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(record.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Completed Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.completed_date ? new Date(record.completed_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Type</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{record.type}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-gray-900 dark:text-white">{record.notes}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
