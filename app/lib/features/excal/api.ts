import { API_BASE_PATH, API_ORIGIN } from './constants'
import type { PipelineRequest, RawDeviceLog, WorkOrderDetails } from './types'
import { ensureApiDateFormat } from './date'
import { toInteger, toNonNegativeInteger, toPositiveNumber } from './utils'

interface DeviceLogPage {
  logs: RawDeviceLog[]
  totalPages: number
  currentPage: number
}

interface FetchLogsResult {
  logs: RawDeviceLog[]
  fetchedPages: number
}

function resolveToken(): string {
  const token = process.env.EPSILON_TOKEN || process.env.VITE_API_TOKEN
  return token ? token.trim() : ''
}

function buildApiUrl(path: string): string {
  return `${API_ORIGIN}${API_BASE_PATH}${path}`
}

async function fetchUpstream<T>(path: string): Promise<T> {
  const token = resolveToken()
  if (!token) {
    throw new Error('Missing API token. Set EPSILON_TOKEN or VITE_API_TOKEN.')
  }

  const response = await fetch(buildApiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const bodyText = await response.text()

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status}): ${bodyText || 'No body'}`)
  }

  try {
    return JSON.parse(bodyText) as T
  } catch {
    throw new Error(`Invalid JSON from upstream for ${path}`)
  }
}

function parseDeviceLogPage(payload: unknown, fallbackPage: number): DeviceLogPage {
  const data = payload as any

  const logs: RawDeviceLog[] =
    (Array.isArray(data?.result?.logs) && data.result.logs) ||
    (Array.isArray(data?.data?.logs) && data.data.logs) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.logs) && data.logs) ||
    []

  const pagination = data?.result?.pagination ?? data?.data?.pagination ?? data?.pagination ?? {}
  const currentPage = toNonNegativeInteger(pagination?.current_page) ?? fallbackPage
  const totalItems = toNonNegativeInteger(pagination?.total_items)
  const totalPagesByField = toNonNegativeInteger(pagination?.total_pages)

  let totalPages = totalPagesByField ?? 1
  if (!totalPagesByField && totalItems !== null && logs.length > 0) {
    totalPages = Math.max(1, Math.ceil(totalItems / logs.length))
  }

  return {
    logs,
    currentPage,
    totalPages,
  }
}

export async function fetchAllDeviceLogs(input: PipelineRequest): Promise<FetchLogsResult> {
  const startDate = ensureApiDateFormat(input.startDate)
  const endDate = ensureApiDateFormat(input.endDate)

  let page = 1
  let totalPages = 1
  const allLogs: RawDeviceLog[] = []
  let fetchedPages = 0

  while (page <= totalPages) {
    const params = new URLSearchParams()
    params.set('start_date', startDate)
    params.set('end_date', endDate)
    params.set('device_id', input.deviceId)
    params.set('page', String(page))

    const rawPage = await fetchUpstream<unknown>(`/device-log?${params.toString()}`)
    const parsed = parseDeviceLogPage(rawPage, page)

    allLogs.push(...parsed.logs)
    fetchedPages += 1

    totalPages = Math.max(1, parsed.totalPages)
    page += 1
  }

  return {
    logs: allLogs,
    fetchedPages,
  }
}

function parseWoPayload(payload: unknown, woId: number): WorkOrderDetails {
  const data = payload as any
  const source = data?.result ?? data?.data ?? data ?? {}

  return {
    ...source,
    id: toInteger(source.id) ?? woId,
    wo_id: toInteger(source.wo_id) ?? woId,
    wo_no: typeof source.wo_no === 'string' ? source.wo_no : null,
    part_no: typeof source.part_no === 'string' ? source.part_no : null,
    operator: typeof source.operator === 'string' ? source.operator : null,
    device_name: typeof source.device_name === 'string' ? source.device_name : null,
    device_id: toInteger(source.device_id),
    job_type: toInteger(source.job_type),
    target_duration: toPositiveNumber(source.target_duration),
    pcl: toPositiveNumber(source.pcl),
    alloted_qty: toNonNegativeInteger(source.alloted_qty),
    ok_qty: toNonNegativeInteger(source.ok_qty),
    reject_qty: toNonNegativeInteger(source.reject_qty),
    comments: typeof source.comments === 'string' ? source.comments : null,
  }
}

export async function fetchWorkOrders(woIds: number[]): Promise<Map<number, WorkOrderDetails>> {
  const uniqueIds = Array.from(new Set(woIds.filter((id) => Number.isFinite(id) && id > 0)))
  const woMap = new Map<number, WorkOrderDetails>()

  const batchSize = 3
  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    const batch = uniqueIds.slice(index, index + batchSize)

    const results = await Promise.all(
      batch.map(async (woId) => {
        try {
          const payload = await fetchUpstream<unknown>(`/wo/${woId}`)
          return [woId, parseWoPayload(payload, woId)] as const
        } catch {
          return [woId, { id: woId, wo_id: woId }] as const
        }
      })
    )

    for (const [woId, wo] of results) {
      woMap.set(woId, wo)
    }
  }

  return woMap
}

export async function fetchDevices(): Promise<Array<{ id: string; name: string }>> {
  const payload = await fetchUpstream<any>('/devices')
  const source: unknown[] =
    (Array.isArray(payload?.result?.devices) && payload.result.devices) ||
    (Array.isArray(payload?.data?.devices) && payload.data.devices) ||
    (Array.isArray(payload?.data) && payload.data) ||
    (Array.isArray(payload?.devices) && payload.devices) ||
    []

  return source
    .map((item: any) => {
      const id = item?.id ?? item?.device_id ?? item?.deviceId
      const name = item?.name ?? item?.device_name ?? item?.label
      if (id === undefined || id === null) return null
      return {
        id: String(id),
        name: typeof name === 'string' && name.trim() ? name.trim() : `Device ${id}`,
      }
    })
    .filter((item): item is { id: string; name: string } => item !== null)
}
