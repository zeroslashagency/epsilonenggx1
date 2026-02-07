"use client"

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'

interface LocationMapProps {
    latitude: number
    longitude: number
    accuracy?: number | null
    timestamp?: string | null
}

const markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

export default function LocationMap({ latitude, longitude, accuracy, timestamp }: LocationMapProps) {
    const center: [number, number] = [latitude, longitude]
    const hasAccuracy = typeof accuracy === 'number' && accuracy > 0
    const accuracyRadius = hasAccuracy ? Math.min(accuracy, 1000) : 0

    return (
        <div className="h-56 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/5">
            <MapContainer key={`${latitude}-${longitude}`} center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center} icon={markerIcon}>
                    <Popup>
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-900">Call Location</div>
                            <div className="text-[11px] text-slate-600">{latitude.toFixed(5)}, {longitude.toFixed(5)}</div>
                            {timestamp ? (
                                <div className="text-[11px] text-slate-500">{new Date(timestamp).toLocaleString()}</div>
                            ) : null}
                        </div>
                    </Popup>
                </Marker>
                {hasAccuracy ? (
                    <Circle
                        center={center}
                        radius={accuracyRadius}
                        pathOptions={{ color: '#94a3b8', fillColor: '#cbd5f5', fillOpacity: 0.3 }}
                    />
                ) : null}
            </MapContainer>
        </div>
    )
}
