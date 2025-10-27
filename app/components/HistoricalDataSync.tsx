'use client'

import { useState } from 'react'
import { RefreshCw, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { HistoricalSyncResult } from '@/app/types'
import { ZohoButton, ZohoBadge } from './zoho-ui'

export default function HistoricalDataSync() {
  const [fromDate, setFromDate] = useState('2025-10-14')
  const [toDate, setToDate] = useState('2025-10-20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HistoricalSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔄 Starting historical data sync...')
      console.log('📅 Date Range:', fromDate, 'to', toDate)

      // Call Supabase Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-historical-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            fromDate,
            toDate,
            smartofficeUrl: 'http://localhost:84/api/v2/WebAPI',
            smartofficeApiKey: '344612092518',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync historical data')
      }

      console.log('✅ Sync successful:', data)
      setResult(data)
    } catch (err: any) {
      console.error('❌ Sync failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Sync Historical Data
        </h3>
      </div>

      <p className="text-sm text-gray-600">
        Fill in missing attendance data for offline periods (Oct 14-20 showing 0 punches)
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <ZohoButton
        onClick={handleSync}
        disabled={loading}
        icon={<Download className="w-4 h-4" />}
        className="w-full"
      >
        {loading ? 'Syncing...' : 'Sync Historical Data'}
      </ZohoButton>

      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Sync Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Sync Successful!</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Date Range:</span>
                <ZohoBadge variant="info">
                  {result.dateRange.fromDate} to {result.dateRange.toDate}
                </ZohoBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Fetched from SmartOffice:</span>
                <ZohoBadge variant="success">{result.fetched} records</ZohoBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Cleaned & Validated:</span>
                <ZohoBadge variant="success">{result.cleaned} records</ZohoBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Stored in Database:</span>
                <ZohoBadge variant="success">{result.stored} records</ZohoBadge>
              </div>
              {result.errors > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Errors:</span>
                  <ZohoBadge variant="warning">{result.errors} records</ZohoBadge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Tip:</strong> This will fetch data from your SmartOffice system for the missing days.</p>
        <p>🔒 <strong>Note:</strong> Requires SmartOffice system to be online and accessible.</p>
      </div>
    </div>
  )
}
