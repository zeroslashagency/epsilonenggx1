"use client"

import { useState, useEffect, useCallback } from 'react'
import { PageBreadcrumbs } from '@/app/components/zoho-ui/PageBreadcrumbs'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/app/lib/utils/api-client'
import { MapPin, Plus, Trash2, Save, X, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'

const ZoneMap = dynamic(() => import('./ZoneMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">Loading map…</div>
  ),
})

interface Zone {
  id: string
  name: string
  center_lat: number
  center_lng: number
  radius_meters: number
  is_active: boolean
  created_at: string
}
interface ProfileLite {
  id: string
  full_name: string | null
  email: string | null
  employee_code: string | null
  role: string | null
}
interface Assignment {
  id: string
  user_id: string
  zone_id: string
  assigned_at: string
}
interface Punch {
  id: string
  user_id: string
  zone_id: string | null
  direction: 'in' | 'out'
  distance_m: number | null
  is_mocked: boolean
  server_validated: boolean
  employee_code: string | null
  created_at: string
}

const RADIUS_PRESETS = [500, 1000, 2000, 3000]

export default function GeofenceSettingsPage() {
  const { userRole, isLoading } = useAuth()
  const isAdmin = ['Super Admin', 'super_admin', 'Admin', 'Manager'].includes(userRole || '')

  const [tab, setTab] = useState<'zones' | 'assign' | 'punches'>('zones')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="p-6">
        <PageBreadcrumbs items={[{ label: 'Settings' }, { label: 'Geofence Attendance' }]} />
        <p className="mt-6 text-sm text-muted-foreground">
          You need an admin role to manage geofence attendance.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <PageBreadcrumbs items={[{ label: 'Settings' }, { label: 'Geofence Attendance' }]} />
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Geofence Attendance</h1>
      </div>

      <div className="mb-4 flex gap-2 border-b border-border">
        {(['zones', 'assign', 'punches'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'zones' ? 'Zones' : t === 'assign' ? 'Assignments' : 'Punch Monitor'}
          </button>
        ))}
      </div>

      {tab === 'zones' && <ZonesTab />}
      {tab === 'assign' && <AssignTab />}
      {tab === 'punches' && <PunchesTab />}
    </div>
  )
}

function ZonesTab() {
  const [zones, setZones] = useState<Zone[]>([])
  const [sel, setSel] = useState<Zone | null>(null)
  const [name, setName] = useState('')
  const [lat, setLat] = useState(13.0827)
  const [lng, setLng] = useState(80.2707)
  const [radius, setRadius] = useState(2000)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiGet('/api/geofence/zones')
    if (res.success) setZones(res.data || [])
    else setMsg(res.error || 'Failed to load zones')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function edit(z: Zone) {
    setSel(z); setName(z.name); setLat(z.center_lat); setLng(z.center_lng); setRadius(z.radius_meters); setMsg(null)
  }
  function reset() { setSel(null); setName(''); setRadius(2000); setMsg(null) }

  async function save() {
    setMsg(null)
    if (!name.trim()) return setMsg('Name is required')
    const payload = { name: name.trim(), center_lat: lat, center_lng: lng, radius_meters: radius }
    const res = sel
      ? await apiPatch('/api/geofence/zones', { id: sel.id, ...payload })
      : await apiPost('/api/geofence/zones', payload)
    if (!res.success) return setMsg(res.error || 'Save failed')
    setMsg(sel ? 'Zone updated' : 'Zone created'); reset(); load()
  }
  async function toggleActive(z: Zone) {
    await apiPatch('/api/geofence/zones', { id: z.id, is_active: !z.is_active }); load()
  }
  async function remove(z: Zone) {
    if (!confirm(`Delete zone "${z.name}"? This also removes its assignments.`)) return
    await apiDelete(`/api/geofence/zones?id=${z.id}`)
    if (sel?.id === z.id) reset()
    load()
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude) },
      (e) => setMsg(e.message)
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-foreground">{sel ? 'Edit zone' : 'New zone'}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Zone name / tag</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="HQ — 2 km"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Latitude</label>
              <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Longitude</label>
              <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Radius: {radius} m</label>
            <input type="range" min={100} max={10000} step={50} value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))} className="w-full" />
            <div className="mt-1 flex gap-1">
              {RADIUS_PRESETS.map((r) => (
                <button key={r} onClick={() => setRadius(r)}
                  className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          </div>
          <button onClick={useMyLocation}
            className="text-xs text-primary hover:underline">Use my browser location</button>
          <div className="flex gap-2 pt-2">
            <button onClick={save}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              <Save className="h-4 w-4" />{sel ? 'Update' : 'Create'}
            </button>
            {sel && (
              <button onClick={reset}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground">
                <X className="h-4 w-4" />Cancel
              </button>
            )}
          </div>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </div>

      <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Map</h3>
          <span className="text-xs text-muted-foreground">Click the map or drag the marker to set the center</span>
        </div>
        <ZoneMap
          lat={lat}
          lng={lng}
          radius={radius}
          otherZones={zones.filter((z) => z.id !== sel?.id).map((z) => ({ id: z.id, name: z.name, center_lat: z.center_lat, center_lng: z.center_lng, radius_meters: z.radius_meters }))}
          onChange={(la, ln) => { setLat(la); setLng(ln) }}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Zones</h3>
          <button onClick={load} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {zones.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No zones yet. Create one on the left.</p>
        ) : (
          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{z.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      z.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>{z.is_active ? 'active' : 'inactive'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {z.center_lat.toFixed(5)}, {z.center_lng.toFixed(5)} · {z.radius_meters} m
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => edit(z)} className="rounded border border-border px-2 py-1 text-xs text-foreground">Edit</button>
                  <button onClick={() => toggleActive(z)} className="rounded border border-border px-2 py-1 text-xs text-foreground">
                    {z.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => remove(z)} className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function AssignTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [userId, setUserId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [aRes, zRes] = await Promise.all([
      apiGet('/api/geofence/assignments'),
      apiGet('/api/geofence/zones'),
    ])
    if (aRes.success) { setAssignments(aRes.data.assignments || []); setProfiles(aRes.data.profiles || []) }
    if (zRes.success) setZones(zRes.data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const nameFor = (uid: string) => {
    const p = profiles.find((x) => x.id === uid)
    return p ? (p.full_name || p.email || p.employee_code || uid) : uid
  }
  const zoneName = (zid: string) => zones.find((z) => z.id === zid)?.name || zid

  async function assign() {
    setMsg(null)
    if (!userId || !zoneId) return setMsg('Pick a user and a zone')
    const res = await apiPost('/api/geofence/assignments', { user_id: userId, zone_id: zoneId })
    if (!res.success) return setMsg(res.error || 'Assign failed')
    setUserId(''); setZoneId(''); load()
  }
  async function unassign(id: string) {
    await apiDelete(`/api/geofence/assignments?id=${id}`); load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-foreground">Assign user to zone</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="">Select user…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.email || p.employee_code || p.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Zone</label>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground">
              <option value="">Select zone…</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button onClick={assign}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" />Assign
          </button>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold text-foreground">Current assignments</h3>
        {assignments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2">User</th><th className="py-2">Zone</th><th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{nameFor(a.user_id)}</td>
                  <td className="py-2 text-foreground">{zoneName(a.zone_id)}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => unassign(a.id)} className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PunchesTab() {
  const [rows, setRows] = useState<Punch[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiGet('/api/geofence/punches')
    if (res.success) setRows(res.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Recent punches</h3>
        <button onClick={load} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No punches recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2">Time</th><th className="py-2">Emp</th><th className="py-2">Dir</th>
              <th className="py-2">Dist (m)</th><th className="py-2">Mock</th><th className="py-2">Validated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2 text-foreground">{new Date(r.created_at).toLocaleTimeString()}</td>
                <td className="py-2 text-foreground">{r.employee_code ?? '—'}</td>
                <td className="py-2 text-foreground">{r.direction}</td>
                <td className="py-2 text-foreground">{r.distance_m != null ? r.distance_m.toFixed(0) : '—'}</td>
                <td className="py-2">{r.is_mocked ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">mock</span> : '—'}</td>
                <td className="py-2">{r.server_validated
                  ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">ok</span>
                  : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">no</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
