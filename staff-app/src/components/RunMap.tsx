import React, { useEffect, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors, radius, spacing } from '../theme';

export type RunMapStop = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  kind: 'collection' | 'delivery' | 'driver';
  color?: string;
  /** Position in the run — drawn inside the pin so the order is readable. */
  order?: number | string;
  /** Completed and failed stops are dimmed so the remaining work stands out. */
  done?: boolean;
};

export type RunMapPolyline = {
  id: string;
  color: string;
  coordinates: Array<{ latitude: number; longitude: number }>;
};

export type RunMapProps = {
  stops: RunMapStop[];
  polylines?: RunMapPolyline[];
  /** Called only after the user chooses Open navigation in a pin popup. */
  onStopPress?: (stop: RunMapStop) => void;
  height?: number;
  /** The stop to centre on and call out — normally the driver's next one. */
  focusStopId?: string | null;
};

function pinColor(stop: RunMapStop) {
  if (stop.color) return stop.color;
  if (stop.kind === 'driver') return '#2563eb';
  return stop.kind === 'collection' ? colors.primary : '#d97706';
}

function openNavigation(stop: RunMapStop, callback?: (selected: RunMapStop) => void) {
  if (callback) {
    callback(stop);
    return;
  }
  const destination = encodeURIComponent(`${stop.latitude},${stop.longitude}`);
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`);
}

// Web map. Leaflet owns both tiles and markers, so pins remain attached to
// their real coordinates through zooming and panning instead of floating over
// an unrelated iframe viewport.
export default function RunMap({ stops, polylines = [], onStopPress, height = 220, focusStopId }: RunMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = mapElementRef.current;
    const valid = stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));
    const linePoints = polylines.flatMap((line) => line.coordinates)
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (!element || (!valid.length && !linePoints.length)) return;

    const map = L.map(element, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    for (const line of polylines) {
      const coordinates = line.coordinates.map((point) => [point.latitude, point.longitude] as [number, number]);
      if (coordinates.length > 1) L.polyline(coordinates, { color: line.color, weight: 4, opacity: 0.78 }).addTo(map);
    }

    for (const stop of valid) {
      const focused = stop.id === focusStopId;
      const size = focused ? 38 : 30;
      const label = String(stop.order ?? (stop.kind === 'driver' ? 'D' : '•'));
      const icon = L.divIcon({
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${pinColor(stop)};color:#fff;border:${focused ? 3 : 2}px solid #fff;font:800 12px system-ui;box-shadow:0 3px 9px rgba(15,23,42,.35);opacity:${stop.done ? .48 : 1}">${label}</div>`,
      });
      const marker = L.marker([stop.latitude, stop.longitude], { icon, zIndexOffset: focused ? 1000 : stop.kind === 'driver' ? 500 : 0 }).addTo(map);

      const popup = document.createElement('div');
      popup.style.minWidth = '210px';
      popup.style.fontFamily = 'system-ui, sans-serif';
      const title = document.createElement('div');
      title.textContent = stop.title;
      title.style.fontWeight = '800';
      title.style.fontSize = '14px';
      title.style.color = '#101828';
      const address = document.createElement('div');
      address.textContent = stop.description || `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`;
      address.style.marginTop = '5px';
      address.style.fontSize = '12px';
      address.style.lineHeight = '17px';
      address.style.color = '#475467';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = stop.kind === 'driver' ? 'Open driver location' : 'Open navigation';
      button.style.marginTop = '10px';
      button.style.width = '100%';
      button.style.border = '0';
      button.style.borderRadius = '8px';
      button.style.padding = '9px 12px';
      button.style.background = pinColor(stop);
      button.style.color = '#fff';
      button.style.fontWeight = '800';
      button.style.cursor = 'pointer';
      button.addEventListener('click', () => openNavigation(stop, onStopPress));
      popup.append(title, address, button);
      marker.bindPopup(popup, { closeButton: true, maxWidth: 280 });
    }

    const bounds = L.latLngBounds([
      ...valid.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
      ...linePoints.map((point) => [point.latitude, point.longitude] as [number, number]),
    ]);
    const focus = focusStopId ? valid.find((stop) => stop.id === focusStopId) : null;
    if (focus) map.setView([focus.latitude, focus.longitude], 14);
    else if (bounds.isValid()) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });

    // The card can animate into view after navigation; this keeps Leaflet from
    // measuring the pre-animation width and drawing only part of the tiles.
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [focusStopId, onStopPress, polylines, stops]);

  const validCount = stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)).length;
  if (!validCount && !polylines.some((line) => line.coordinates.length)) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Collections map</Text>
          <Text style={styles.text}>No collection coordinates are available for this selection yet.</Text>
        </View>
      </View>
    );
  }

  const remaining = stops.filter((stop) => !stop.done && stop.kind !== 'driver').length;
  const includesDrivers = stops.some((stop) => stop.kind === 'driver');
  const includesDeliveries = stops.some((stop) => stop.kind === 'delivery');
  return (
    <View style={styles.mapCard}>
      {React.createElement('div', { ref: mapElementRef, style: { width: '100%', height } })}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Collection</Text></View>
        {includesDeliveries ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d97706' }]} /><Text style={styles.legendText}>Delivery</Text></View> : null}
        {includesDrivers ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} /><Text style={styles.legendText}>Driver</Text></View> : null}
        <Text style={styles.legendText}>{remaining} to go</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mapLegend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  fallback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  text: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
