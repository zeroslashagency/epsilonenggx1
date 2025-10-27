"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '@/app/components/zoho-ui'
import { AlertCircle, CheckCircle2, Clock, Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { apiGet, apiPatch } from '@/app/lib/utils/api-client'

interface Alert {
  id: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  source: string
  timestamp: string
  acknowledged: boolean
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    
    const loadAlerts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('limit', pageSize.toString())
        
        const data = await apiGet(`/api/monitoring/alerts?${params.toString()}`)
        
        if (isMounted && data.success) {
          const transformedAlerts = (data.data || []).map((a: any) => ({
            ...a,
            timestamp: a.created_at
          }))
          setAlerts(transformedAlerts)
          
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1)
            setTotalCount(data.pagination.totalCount || 0)
          }
        } else if (isMounted) {
          console.error('Error fetching alerts:', data.error)
          setAlerts([])
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching alerts:', error)
          setAlerts([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadAlerts()
    
    return () => {
      isMounted = false
    }
  }, [page, pageSize])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/monitoring/alerts')
      
      if (data.success) {
        // Transform API data - rename created_at to timestamp for UI
        const transformedAlerts = (data.data || []).map((a: any) => ({
          ...a,
          timestamp: a.created_at
        }))
        setAlerts(transformedAlerts)
      } else {
        console.error('Error fetching alerts:', data.error)
        setAlerts([])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const getSeverityConfig = (severity: string) => {
    const config = {
      critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, iconColor: 'text-red-600' },
      warning: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle, iconColor: 'text-yellow-600' },
      info: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle, iconColor: 'text-blue-600' }
    }
    return config[severity as keyof typeof config] || config.info
  }

  const handleAcknowledge = async (id: string) => {
    try {
      const data = await apiPatch('/api/monitoring/alerts', { id })
      
      if (data.success) {
        // Update local state
        setAlerts(alerts.map(alert => 
          alert.id === id ? { ...alert, acknowledged: true } : alert
        ))
      } else {
        console.error('Error acknowledging alert:', data.error)
        alert('Failed to acknowledge alert')
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      alert('Failed to acknowledge alert')
    }
  }

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Alerts</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and manage system alerts</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Info</p>
                  <p className="text-2xl font-bold text-blue-600">{alerts.filter(a => a.severity === 'info' && !a.acknowledged).length}</p>
                </div>
                <Info className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} alerts
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              >
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">No alerts</div>
            ) : (
              alerts.map((alert) => {
                const config = getSeverityConfig(alert.severity)
                const SeverityIcon = config.icon
                
                return (
                  <div 
                    key={alert.id} 
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${
                      alert.acknowledged ? 'opacity-60' : ''
                    } ${config.color.includes('red') ? 'border-red-500' : config.color.includes('yellow') ? 'border-yellow-500' : 'border-blue-500'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <SeverityIcon className={`w-6 h-6 ${config.iconColor} mt-1`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{alert.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                              {alert.severity}
                            </span>
                            {alert.acknowledged && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Acknowledged
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>Source: {alert.source}</span>
                            <span>•</span>
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-4 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">First</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <input type="number" min="1" max={totalPages} value={page} onChange={(e) => { const newPage = parseInt(e.target.value); if (newPage >= 1 && newPage <= totalPages) setPage(newPage); }} className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800" />
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">Last</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ZohoLayout>
  )
}
