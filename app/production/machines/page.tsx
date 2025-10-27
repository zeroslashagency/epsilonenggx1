"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '@/app/components/zoho-ui'
import { Cpu, Activity, AlertCircle, CheckCircle2, Clock, CheckCircle, Plus, Search } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface Machine {
  id: string
  machine_id: string
  name: string
  type: string
  status: 'running' | 'idle' | 'maintenance' | 'offline'
  efficiency: number
  current_order: string | null
  last_maintenance: string
  next_maintenance: string
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    let isMounted = true
    
    const loadMachines = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') params.append('status', statusFilter)
        
        const data = await apiGet(`/api/production/machines?${params.toString()}`)
        
        if (isMounted && data.success) {
          // Transform API data to match UI interface
          const transformedMachines = (data.data || []).map((m: any) => ({
            ...m,
            current_order: m.current_order?.order_number || null
          }))
          setMachines(transformedMachines)
        } else {
          console.error('Error fetching machines:', data.error)
          setMachines([])
        }
      } catch (error) {
        console.error('Error fetching machines:', error)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const data = await apiGet(`/api/production/machines?${params.toString()}`)
      
      if (data.success) {
        // Transform API data to match UI interface
        const transformedMachines = (data.data || []).map((m: any) => ({
          ...m,
          current_order: m.current_order?.order_number || null
        }))
        setMachines(transformedMachines)
      } else {
        console.error('Error fetching machines:', data.error)
        setMachines([])
      }
    } catch (error) {
      console.error('Error fetching machines:', error)
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      running: { color: 'bg-green-100 text-green-800', icon: Activity },
      idle: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      maintenance: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      offline: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    return config[status as keyof typeof config] || config.offline
  }

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Machines</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor and manage production machines</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Machine
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Running</p>
                  <p className="text-2xl font-bold text-green-600">{machines.filter(m => m.status === 'running').length}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Idle</p>
                  <p className="text-2xl font-bold text-yellow-600">{machines.filter(m => m.status === 'idle').length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
                  <p className="text-2xl font-bold text-orange-600">{machines.filter(m => m.status === 'maintenance').length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Efficiency</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {machines.length > 0 ? Math.round(machines.reduce((sum, m) => sum + m.efficiency, 0) / machines.length) : 0}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center text-gray-500 py-8">Loading machines...</div>
            ) : filteredMachines.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">No machines found</div>
            ) : (
              filteredMachines.map((machine) => {
                const statusConfig = getStatusBadge(machine.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <div key={machine.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{machine.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{machine.machine_id}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {machine.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Type</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{machine.type}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Efficiency</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${machine.efficiency}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{machine.efficiency}%</span>
                        </div>
                      </div>
                      
                      {machine.current_order && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Current Order</p>
                          <p className="text-sm font-medium text-blue-600">{machine.current_order}</p>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Last Maintenance</span>
                          <span className="text-gray-900 dark:text-white">{new Date(machine.last_maintenance).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Next Maintenance</span>
                          <span className="text-gray-900 dark:text-white">{new Date(machine.next_maintenance).toLocaleDateString()}</span>
                        </div>
                      </div>
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
