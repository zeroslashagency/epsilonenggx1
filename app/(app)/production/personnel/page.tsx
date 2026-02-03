"use client"

import { useState, useEffect } from 'react'
import { Users, UserCheck, UserX, Briefcase, Plus, Award } from 'lucide-react'
import { apiGet } from '@/app/lib/utils/api-client'

interface Personnel {
  id: string
  employee_id: string
  name: string
  role: string
  shift: 'morning' | 'afternoon' | 'night'
  status: 'active' | 'on_leave' | 'absent'
  assigned_machine: string | null
  efficiency_score: number
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    const loadPersonnel = async () => {
      setLoading(true)
      try {
        const data = await apiGet('/api/production/personnel')
        
        if (isMounted && data.success) {
          setPersonnel(data.data || [])
        }
      } catch (error) {
        if (isMounted) {
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadPersonnel()
    
    return () => {
      isMounted = false
    }
  }, [])

  const fetchPersonnel = async () => {
    setLoading(true)
    try {
      const data = await apiGet('/api/production/personnel')
      
      if (data.success) {
        // Transform API data to match UI interface
        const transformedPersonnel = (data.data || []).map((p: any) => ({
          ...p,
          assigned_machine: p.assigned_machine?.machine_id || null
        }))
        setPersonnel(transformedPersonnel)
      } else {
        setPersonnel([])
      }
    } catch (error) {
      setPersonnel([])
    } finally {
      setLoading(false)
    }
  }

  return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Personnel</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage production floor staff</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Plus className="w-4 h-4" />
              Add Personnel
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-600">{personnel.filter(p => p.status === 'active').length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">On Leave</p>
                  <p className="text-2xl font-bold text-yellow-600">{personnel.filter(p => p.status === 'on_leave').length}</p>
                </div>
                <UserX className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Efficiency</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {personnel.length > 0 ? Math.round(personnel.reduce((sum, p) => sum + p.efficiency_score, 0) / personnel.length) : 0}%
                  </p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading personnel...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shift</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Assigned Machine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {personnel.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{person.employee_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{person.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{person.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{person.shift}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {person.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{person.assigned_machine || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{person.efficiency_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      )
}
