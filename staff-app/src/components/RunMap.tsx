import React, { useEffect, useRef } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
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
  /**
   * Where to point the map before any coordinates exist — normally the
   * driver's own position. The map is always drawn, so it always needs a view.
   */
  emptyCenter?: { latitude: number; longitude: number } | null;
  /** Replaces the default "waiting for coordinates" note over an empty map. */
  emptyNote?: string;
};

// Wide enough to take in the UK and Ireland collection area at a glance. Only
// used when nothing else says where to look.
const DEFAULT_CENTER: [number, number] = [53.4, -3.6];
const DEFAULT_ZOOM = 5;
const GOOGLE_MAPS_API_KEY = (process.env as any).EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleMapsLoader: Promise<any> | null = null;
let googleMapsAuthFailed = false;
function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps requires a browser'));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google.maps);
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    // Google still creates a map object when the key is invalid, but paints a
    // blocking "can't load Google Maps correctly" dialog over it. Capture that
    // callback so the driver can fall back to the working route map instead of
    // presenting an apparently broken map.
    (window as any).gm_authFailure = () => {
      googleMapsAuthFailed = true;
      window.dispatchEvent(new Event('zs-google-maps-auth-failure'));
    };
    const finish = () => {
      const maps = (window as any).google?.maps;
      if (maps) {
        resolve(maps);
      } else reject(new Error('Google Maps loaded without the maps namespace'));
    };
    const existing = document.querySelector('script[data-zs-google-maps]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.dataset.zsGoogleMaps = 'true';
    // Use the script load event as the single completion signal. Supplying a
    // callback as well creates a race with Google's async loader: its load
    // event can fire first, the callback is removed, and Google then throws
    // "__zsGoogleMapsReady is not a function" on an otherwise recoverable
    // billing/referrer failure.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&loading=async`;
    script.async = true; script.defer = true;
    script.onload = finish;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}

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
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  if (Platform.OS === 'web') { window.open(url, '_blank', 'noopener,noreferrer'); return; }
  void Linking.openURL(url).catch(() => undefined);
}

// Web map. Leaflet owns both tiles and markers, so pins remain attached to
// their real coordinates through zooming and panning instead of floating over
// an unrelated iframe viewport.
export default function RunMap({ stops, polylines = [], onStopPress, height = 220, focusStopId, emptyCenter = null, emptyNote }: RunMapProps) {
  if (GOOGLE_MAPS_API_KEY) return <GoogleRunMap stops={stops} polylines={polylines} onStopPress={onStopPress} height={height} focusStopId={focusStopId} emptyCenter={emptyCenter} emptyNote={emptyNote} />;
  return <LeafletRunMap stops={stops} polylines={polylines} onStopPress={onStopPress} height={height} focusStopId={focusStopId} emptyCenter={emptyCenter} emptyNote={emptyNote} />;
}

// Web fallback. Leaflet owns both tiles and markers, so pins remain attached
// to their real coordinates if Google rejects a key or is unavailable.
function LeafletRunMap({ stops, polylines = [], onStopPress, height = 220, focusStopId, emptyCenter = null, emptyNote }: RunMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = mapElementRef.current;
    const valid = stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));
    const linePoints = polylines.flatMap((line) => line.coordinates)
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (!element) return;

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
    // Nothing plotted yet — still show the driver where they are, or the
    // working area, rather than an uninitialised grey box.
    else if (emptyCenter && Number.isFinite(emptyCenter.latitude) && Number.isFinite(emptyCenter.longitude)) {
      map.setView([emptyCenter.latitude, emptyCenter.longitude], 12);
    } else map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // The card can animate into view after navigation; this keeps Leaflet from
    // measuring the pre-animation width and drawing only part of the tiles.
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [emptyCenter?.latitude, emptyCenter?.longitude, focusStopId, onStopPress, polylines, stops]);

  const validCount = stops.filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)).length;
  const nothingPlotted = !validCount && !polylines.some((line) => line.coordinates.length);

  const remaining = stops.filter((stop) => !stop.done && stop.kind !== 'driver').length;
  const includesDrivers = stops.some((stop) => stop.kind === 'driver');
  const includesDeliveries = stops.some((stop) => stop.kind === 'delivery');
  return (
    <View style={styles.mapCard}>
      {React.createElement('div', { ref: mapElementRef, style: { width: '100%', height } })}
      {nothingPlotted ? (
        <View style={styles.emptyNote} pointerEvents="none">
          <Ionicons name="location-outline" size={15} color={colors.primaryDark} />
          <Text style={styles.emptyNoteText}>{emptyNote || 'Waiting for stop coordinates'}</Text>
        </View>
      ) : null}
      <View style={styles.mapLegend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Collection</Text></View>
        {includesDeliveries ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d97706' }]} /><Text style={styles.legendText}>Delivery</Text></View> : null}
        {includesDrivers ? <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} /><Text style={styles.legendText}>Driver</Text></View> : null}
        <Text style={styles.legendText}>{remaining} to go</Text>
      </View>
    </View>
  );
}

function GoogleRunMap({ stops, polylines = [], onStopPress, height = 220, focusStopId, emptyCenter = null, emptyNote }: RunMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = React.useState(false);
  useEffect(() => {
    let disposed = false;
    let markers: any[] = [];
    let lines: any[] = [];
    const authFailure = () => setMapError(true);
    window.addEventListener('zs-google-maps-auth-failure', authFailure);
    if (googleMapsAuthFailed) setMapError(true);
    // Some Google Maps responses surface the billing/referrer failure as a
    // DOM dialog without invoking gm_authFailure. Watch briefly for that
    // dialog so the route can switch to the usable Leaflet fallback.
    const warningTimer = window.setInterval(() => {
      if (/This page can't load Google Maps correctly/i.test(document.body?.innerText || '')) {
        googleMapsAuthFailed = true;
        setMapError(true);
        window.clearInterval(warningTimer);
      }
    }, 500);
    loadGoogleMaps().then((maps) => {
      if (disposed || !elementRef.current || googleMapsAuthFailed) return;
      const valid = stops.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
      const focus = focusStopId ? valid.find((s) => s.id === focusStopId) : null;
      const source = focus || valid[0] || emptyCenter || { latitude: 53.4, longitude: -3.6 };
      const center = { lat: source.latitude, lng: source.longitude };
      const map = new maps.Map(elementRef.current, { center, zoom: focus ? 14 : valid.length ? 7 : 5, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      mapRef.current = map;
      const bounds = new maps.LatLngBounds();
      valid.forEach((stop) => {
        const marker = new maps.Marker({ map, position: { lat: stop.latitude, lng: stop.longitude }, label: String(stop.order ?? (stop.kind === 'driver' ? 'D' : '•')), opacity: stop.done ? .48 : 1 });
        const info = new maps.InfoWindow({ content: `<div style="min-width:190px"><strong>${String(stop.title).replace(/[<>]/g, '')}</strong><div style="margin-top:5px;color:#475467">${String(stop.description || '').replace(/[<>]/g, '')}</div></div>` });
        marker.addListener('click', () => { info.open({ map, anchor: marker }); if (onStopPress) onStopPress(stop); });
        markers.push(marker); bounds.extend(marker.getPosition());
      });
      polylines.forEach((line) => { const path = line.coordinates.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).map((p) => ({ lat: p.latitude, lng: p.longitude })); if (path.length > 1) lines.push(new maps.Polyline({ map, path, strokeColor: line.color, strokeOpacity: .8, strokeWeight: 4 })); });
      if (!focus && valid.length > 1) map.fitBounds(bounds, 45);
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => {
      disposed = true;
      window.clearInterval(warningTimer);
      window.removeEventListener('zs-google-maps-auth-failure', authFailure);
      markers.forEach((m) => m.setMap(null));
      lines.forEach((l) => l.setMap(null));
      mapRef.current = null;
    };
  }, [stops, polylines, onStopPress, focusStopId, emptyCenter?.latitude, emptyCenter?.longitude]);
  const validCount = stops.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)).length;
  if (mapError) return <LeafletRunMap stops={stops} polylines={polylines} onStopPress={onStopPress} height={height} focusStopId={focusStopId} emptyCenter={emptyCenter} emptyNote={emptyNote} />;
  return <View style={styles.mapCard}>{React.createElement('div', { ref: elementRef as any, style: { width: '100%', height } })}{mapError ? <View style={styles.emptyNote}><Ionicons name="warning-outline" size={15} color={colors.danger} /><Text style={styles.emptyNoteText}>Google Maps could not load. Check the API key restrictions or use Navigate on a stop.</Text></View> : !validCount ? <View style={styles.emptyNote} pointerEvents="none"><Ionicons name="location-outline" size={15} color={colors.primaryDark} /><Text style={styles.emptyNoteText}>{emptyNote || 'Waiting for stop coordinates'}</Text></View> : null}<View style={styles.mapLegend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Collection</Text></View><Text style={styles.legendText}>{stops.filter((s) => !s.done && s.kind !== 'driver').length} to go</Text></View></View>;
}

const styles = StyleSheet.create({
  mapCard: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyNote: {
    position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 7, paddingHorizontal: 10,
  },
  emptyNoteText: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, flex: 1 },
  mapLegend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  fallback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  text: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
