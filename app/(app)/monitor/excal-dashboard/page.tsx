'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import { formatDateForApi } from '@/app/lib/features/excal/date'
import { applyFilters, DEFAULT_FILTERS } from '@/app/lib/features/excal/filters'
import { FILTER_SESSION_KEY } from '@/app/lib/features/excal/constants'
import { exportWorkbookToFile } from '@/app/lib/features/excal/excel'
import { exportToPDF } from '@/app/lib/features/excal/pdf'
import type { ExcalFilters, ExcalPipelineOutput } from '@/app/lib/features/excal/types'
import { apiGet } from '@/app/lib/utils/api-client'

interface ApiResponse {
  success: boolean
  data?: ExcalPipelineOutput
  error?: string
}

function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true'
}

function parseFiltersFromSearch(search: URLSearchParams): ExcalFilters {
  const mode = search.get('mode')
  const validMode = mode === 'GOOD_ONLY' || mode === 'GOOD_WARNING' || mode === 'ALL' ? mode : DEFAULT_FILTERS.mode

  return {
    mode: validMode,
    includeUnknown: parseBoolean(search.get('unknown')),
    includeBreakExtensions: parseBoolean(search.get('breaks')),
  }
}

export default function ExcalDashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const exportContainerRef = useRef<HTMLDivElement | null>(null)

  const [devices, setDevices] = useState<Array<{ id: string; name: string }>>([])
  const [deviceId, setDeviceId] = useState('')

  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return toDateTimeLocal(now)
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date()
    now.setHours(23, 59, 0, 0)
    return toDateTimeLocal(now)
  })

  const [filters, setFilters] = useState<ExcalFilters>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ExcalPipelineOutput | null>(null)

  useEffect(() => {
    const loadDevices = async () => {
      const result = await apiGet('/api/excal-dashboard/devices')
      if (result?.success && Array.isArray(result.data)) {
        setDevices(result.data)
        if (!deviceId && result.data[0]) {
          setDeviceId(result.data[0].id)
        }
      }
    }

    loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const searchFilters = parseFiltersFromSearch(searchParams)

    if (searchParams.has('mode') || searchParams.has('unknown') || searchParams.has('breaks')) {
      setFilters(searchFilters)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(FILTER_SESSION_KEY, JSON.stringify(searchFilters))
      }
      return
    }

    if (typeof window !== 'undefined') {
      const raw = window.sessionStorage.getItem(FILTER_SESSION_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ExcalFilters
          if (parsed.mode === 'GOOD_ONLY' || parsed.mode === 'GOOD_WARNING' || parsed.mode === 'ALL') {
            setFilters({
              mode: parsed.mode,
              includeUnknown: Boolean(parsed.includeUnknown),
              includeBreakExtensions: Boolean(parsed.includeBreakExtensions),
            })
          }
        } catch {
          setFilters(DEFAULT_FILTERS)
        }
      }
    }
  }, [searchParams])

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('mode', filters.mode)
    next.set('unknown', filters.includeUnknown ? '1' : '0')
    next.set('breaks', filters.includeBreakExtensions ? '1' : '0')
    const target = `${pathname}?${next.toString()}`
    const current = `${pathname}?${searchParams.toString()}`
    if (target !== current) {
      router.replace(target)
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(FILTER_SESSION_KEY, JSON.stringify(filters))
    }
  }, [filters, pathname, router, searchParams])

  const filteredRows = useMemo(() => {
    if (!payload) return []
    return applyFilters(payload.rows, filters)
  }, [payload, filters])

  const fetchDashboard = async () => {
    if (!deviceId) {
      setError('Select a device first')
      return
    }

    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('device_id', deviceId)
    params.set('start_date', formatDateForApi(new Date(startDate)))
    params.set('end_date', formatDateForApi(new Date(endDate)))

    const result = (await apiGet(`/api/excal-dashboard?${params.toString()}`)) as ApiResponse

    if (result.success && result.data) {
      setPayload(result.data)
    } else {
      setPayload(null)
      setError(result.error || 'Failed to load Excal dashboard')
    }

    setLoading(false)
  }

  const handleExcelExport = () => {
    if (!payload) return
    exportWorkbookToFile(
      {
        ...payload,
        rows: filteredRows,
      },
      `excal-dashboard-${Date.now()}.xlsx`
    )
  }

  const handlePdfExport = async () => {
    if (!exportContainerRef.current) return
    setPdfLoading(true)
    setError(null)

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      })

      await exportToPDF({
        canvas,
        fileName: `excal-dashboard-${Date.now()}.pdf`,
        contentWidthMm: 200,
        contentHeightMm: 120,
      })
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : 'PDF export failed')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <PageBreadcrumbs
        items={[
          { label: 'Monitor', href: '/monitor/device-logs' },
          { label: 'Excal Dashboard' },
        ]}
      />

      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <h1 className="text-xl font-semibold">Excal Dashboard</h1>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Device</p>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Start</p>
              <Input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">End</p>
              <Input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>

            <div className="flex items-end">
              <Button onClick={fetchDashboard} disabled={loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Load
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Mode</p>
              <Select
                value={filters.mode}
                onValueChange={(value: ExcalFilters['mode']) => setFilters((prev) => ({ ...prev, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD_ONLY">GOOD_ONLY</SelectItem>
                  <SelectItem value="GOOD_WARNING">GOOD_WARNING</SelectItem>
                  <SelectItem value="ALL">ALL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 pt-7 text-sm">
              <Checkbox
                checked={filters.includeUnknown}
                onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, includeUnknown: checked === true }))}
              />
              Include unknown
            </label>

            <label className="flex items-center gap-2 pt-7 text-sm">
              <Checkbox
                checked={filters.includeBreakExtensions}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, includeBreakExtensions: checked === true }))
                }
              />
              Include break extensions
            </label>
          </div>

          {payload && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Cycles</p>
                <p className="text-lg font-semibold">{payload.kpis.totalCycles}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">GOOD</p>
                <p className="text-lg font-semibold text-emerald-700">{payload.kpis.goodCycles}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">WARNING</p>
                <p className="text-lg font-semibold text-amber-700">{payload.kpis.warningCycles}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">BAD</p>
                <p className="text-lg font-semibold text-red-700">{payload.kpis.badCycles}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">GOOD %</p>
                <p className="text-lg font-semibold">{payload.kpis.goodRatePct}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExcelExport} disabled={!payload}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handlePdfExport} disabled={!payload || pdfLoading}>
              {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              PDF
            </Button>
            <Button variant="secondary" onClick={fetchDashboard} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div ref={exportContainerRef} className="rounded-lg border bg-white p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">S.No</th>
                <th className="p-2">Log Time</th>
                <th className="p-2">Action</th>
                <th className="p-2">Class</th>
                <th className="p-2">Reason</th>
                <th className="p-2">Job Tag</th>
                <th className="p-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.rowId} className="border-b align-top">
                  <td className="p-2">{row.sNo ?? ''}</td>
                  <td className="p-2 whitespace-nowrap">{new Date(row.logTimeIso).toLocaleString()}</td>
                  <td className="p-2">{row.action}</td>
                  <td className="p-2">{row.classification}</td>
                  <td className="p-2">{row.classificationReason}</td>
                  <td className="p-2">{row.jobTag}</td>
                  <td className="p-2">{[row.summary, row.notes].filter(Boolean).join(' | ')}</td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={7}>
                    No rows available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
