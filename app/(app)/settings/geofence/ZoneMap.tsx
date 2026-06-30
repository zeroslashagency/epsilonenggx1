"use client"

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface OtherZone {
  id: string
  name: string
  center_lat: number
  center_lng: number
  radius_meters: number
}

interface ZoneMapProps {
  lat: number
  lng: number
  radius: number
  otherZones?: OtherZone[]
  onChange: (lat: number, lng: number) => void
}

/**
 * Interactive geofence map: draggable center marker + radius circle, click to
 * move center, other saved zones drawn in grey. Pure Leaflet (no react-leaflet
 * SSR issues); rendered client-only via next/dynamic from the page.
 */
export default function ZoneMap({ lat, lng, radius, otherZones = [], onChange }: ZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const othersRef = useRef<L.LayerGroup | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Init once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, { center: [lat, lng], zoom: 15 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const icon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#18181b;border:3px solid #fff;box-shadow:0 0 0 2px #18181b;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map)
    const circle = L.circle([lat, lng], { radius, color: '#18181b', fillColor: '#18181b', fillOpacity: 0.12, weight: 2 }).addTo(map)
    const others = L.layerGroup().addTo(map)

    marker.on('drag', () => {
      const p = marker.getLatLng()
      circle.setLatLng(p)
    })
    marker.on('dragend', () => {
      const p = marker.getLatLng()
      onChangeRef.current(p.lat, p.lng)
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      circle.setLatLng(e.latlng)
      onChangeRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapInstance.current = map
    markerRef.current = marker
    circleRef.current = circle
    othersRef.current = others

    // fix tile render in flex/hidden containers
    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync center from props (numeric inputs / use-my-location)
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current || !circleRef.current) return
    const cur = markerRef.current.getLatLng()
    if (Math.abs(cur.lat - lat) > 1e-9 || Math.abs(cur.lng - lng) > 1e-9) {
      markerRef.current.setLatLng([lat, lng])
      circleRef.current.setLatLng([lat, lng])
      mapInstance.current.panTo([lat, lng])
    }
  }, [lat, lng])

  // Sync radius
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(radius)
  }, [radius])

  // Draw other saved zones
  useEffect(() => {
    const layer = othersRef.current
    if (!layer) return
    layer.clearLayers()
    otherZones.forEach((z) => {
      L.circle([z.center_lat, z.center_lng], {
        radius: z.radius_meters,
        color: '#94a3b8',
        fillColor: '#94a3b8',
        fillOpacity: 0.08,
        weight: 1,
        dashArray: '4',
      })
        .bindTooltip(z.name)
        .addTo(layer)
    })
  }, [otherZones])

  return <div ref={mapRef} className="h-72 w-full rounded-lg border border-border" />
}
