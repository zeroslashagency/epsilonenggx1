"use client"

import { useState, useEffect } from 'react'
import { ZohoLayout } from '@/app/components/zoho-ui'
import { Shield, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react'

interface QualityCheck {
  id: string
  order_id: string
  product: string
  inspector: string
  result: 'passed' | 'failed' | 'pending'
  defects: number
  timestamp: string
}

export default function QualityControlPage() {
  const [checks, setChecks] = useState<QualityCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQualityChecks()
  }, [])

  const fetchQualityChecks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/monitoring/quality')
      const data = await response.json()
      
      if (data.success) {
        // Transform API data to match UI interface
        const transformedChecks = (data.data || []).map((c: any) => ({
          ...c,
          order_id: c.order?.order_number || 'N/A',
          inspector: c.inspector_name,
          timestamp: c.created_at
        }))
        setChecks(transformedChecks)
      } else {
        console.error('Error fetching quality checks:', data.error)
        setChecks([])
      }
    } catch (error) {
      console.error('Error fetching quality checks:', error)
      setChecks([])
    } finally {
      setLoading(false)
    }
  }

  const passRate = checks.length > 0 
    ? Math.round((checks.filter(c => c.result === 'passed').length / checks.filter(c => c.result !== 'pending').length) * 100) 
    : 0

  const getResultBadge = (result: string) => {
    const config = {
      passed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
    }
    return config[result as keyof typeof config] || config.pending
  }

  return (
    <ZohoLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quality Control</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor product quality and inspections</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">{passRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{checks.filter(c => c.result === 'passed').length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{checks.filter(c => c.result === 'failed').length}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{checks.filter(c => c.result === 'pending').length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading quality checks...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Inspector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Defects</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {checks.map((check) => {
                    const resultConfig = getResultBadge(check.result)
                    const ResultIcon = resultConfig.icon
                    
                    return (
                      <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{check.order_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{check.product}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{check.inspector}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${resultConfig.color}`}>
                            <ResultIcon className="w-3 h-3" />
                            {check.result}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {check.defects > 0 ? (
                            <span className="text-red-600 font-medium">{check.defects}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {new Date(check.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
