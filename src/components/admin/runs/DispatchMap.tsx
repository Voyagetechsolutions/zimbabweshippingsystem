import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// The dispatch map: numbered stop pins in each run's colour, a line through
// each run in stop order, and a pin for every driver with a recent position.
// Same OpenStreetMap tiles and pin shape as the Collections Map tab.

export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  color: string;
  label: string;
};

export type MapLine = { id: string; color: string; points: Array<[number, number]> };

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] || c));

export default function DispatchMap({ pins, lines = [], height = 360, emptyNote }: {
  pins: MapPin[];
  lines?: MapLine[];
  height?: number;
  emptyNote?: string;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Refit only when the set of pins changes, so a live refresh (a driver
  // moving, a stop completing) does not yank the view away from where
  // dispatch has zoomed.
  const fittedRef = useRef('');

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: true }).setView([52.3, -1.7], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const resize = window.setTimeout(() => map.invalidateSize(), 0);
    return () => { window.clearTimeout(resize); map.remove(); mapRef.current = null; layerRef.current = null; fittedRef.current = ''; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const line of lines) {
      if (line.points.length > 1) L.polyline(line.points, { color: line.color, weight: 4, opacity: 0.7 }).addTo(layer);
    }
    for (const pin of pins) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${pin.color};border:3px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font:700 11px system-ui">${esc(pin.label)}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
        popupAnchor: [0, -28],
      });
      const destination = encodeURIComponent(`${pin.latitude},${pin.longitude}`);
      const popup = `<div style="min-width:210px;font-family:system-ui"><strong>${esc(pin.title)}</strong>${pin.subtitle ? `<p style="margin:6px 0 10px;color:#475569">${esc(pin.subtitle)}</p>` : '<div style="height:8px"></div>'}<a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="display:block;border-radius:8px;background:#059669;color:white;text-decoration:none;text-align:center;font-weight:700;padding:8px 12px">Open navigation</a></div>`;
      L.marker([pin.latitude, pin.longitude], { icon }).bindPopup(popup).addTo(layer);
    }

    const key = pins.map((p) => p.id).sort().join('|');
    if (key && key !== fittedRef.current) {
      fittedRef.current = key;
      const bounds = pins.map((p) => [p.latitude, p.longitude] as [number, number]);
      if (bounds.length === 1) map.setView(bounds[0], 13);
      else map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 14 });
    }
  }, [pins, lines]);

  return (
    <div className="relative">
      <div ref={elementRef} style={{ height }} className="w-full overflow-hidden rounded-xl border z-0" aria-label="Dispatch map" />
      {!pins.length && emptyNote ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <p className="rounded-md bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-xs text-muted-foreground shadow">{emptyNote}</p>
        </div>
      ) : null}
    </div>
  );
}
