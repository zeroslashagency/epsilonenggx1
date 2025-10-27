"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '@/app/components/zoho-ui'
import { ListTodo, Clock, CheckCircle2, AlertCircle, CheckCircle, CheckSquare, Plus } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface Task {
  id: string
  task_id: string
  title: string
  order_id: string
  assigned_to: string
  machine: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high'
  due_date: string
  progress: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    const loadTasks = async () => {
      setLoading(true)
      try {
        const data = await apiGet('/api/production/tasks')
        
        if (isMounted && data.success) {
          setTasks(data.data || [])
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching tasks:', error)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadTasks()
    
    return () => {
      isMounted = false
    }
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/production/tasks')
      
      if (data.success) {
        // Transform API data to match UI interface
        const transformedTasks = (data.data || []).map((t: any) => ({
          ...t,
          order_id: t.order?.order_number || 'N/A',
          assigned_to: t.assigned_to?.name || 'Unassigned',
          machine: t.machine?.machine_id || 'N/A'
        }))
        setTasks(transformedTasks)
      } else {
        console.error('Error fetching tasks:', data.error)
        setTasks([])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      blocked: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }
    return config[status as keyof typeof config] || config.pending
  }

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Tasks</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track and manage production tasks</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {['pending', 'in_progress', 'completed', 'blocked'].map((status) => {
              const count = tasks.filter(t => t.status === status).length
              const config = getStatusConfig(status)
              const StatusIcon = config.icon
              return (
                <div key={status} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{status.replace('_', ' ')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                    </div>
                    <StatusIcon className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">Loading tasks...</div>
            ) : (
              tasks.map((task) => {
                const statusConfig = getStatusConfig(task.status)
                const StatusIcon = statusConfig.icon
                
                return (
                  <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{task.task_id} • Order: {task.order_id}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Assigned To</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.assigned_to}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Machine</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.machine}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Due Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(task.due_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{task.progress}%</span>
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
