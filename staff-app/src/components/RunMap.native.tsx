import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import type { RunMapProps, RunMapStop } from './RunMap';

// react-native-maps isn't available in every runtime (notably Expo Go on some
// setups). Load it defensively so a missing native module can never crash the
// whole app at startup — we just fall back to a route card.
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch {
  MapView = null;
}

function FallbackCard({ count }: { count: number }) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={24} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fallbackTitle}>Route map</Text>
        <Text style={styles.fallbackText}>
          {count ? `${count} mapped stop${count === 1 ? '' : 's'}. Use Navigate on each stop for turn-by-turn directions.` : 'No mapped coordinates for this selection yet — the route list below stays fully usable.'}
        </Text>
      </View>
    </View>
  );
}

// Wraps the native map so a render failure (missing native view) degrades to
// the fallback card instead of taking down the screen.
class MapErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function RunMap({ stops, polylines = [], onStopPress, height = 220, focusStopId }: RunMapProps) {
  const mapRef = useRef<any>(null);

  const first = stops[0] || { latitude: polylines[0]?.coordinates[0]?.latitude ?? 52.5, longitude: polylines[0]?.coordinates[0]?.longitude ?? -1.5 };
  const lats = stops.map((s) => s.latitude);
  const lngs = stops.map((s) => s.longitude);
  const latDelta = lats.length > 1 ? Math.max(0.12, (Math.max(...lats) - Math.min(...lats)) * 1.6) : 0.35;
  const lngDelta = lngs.length > 1 ? Math.max(0.12, (Math.max(...lngs) - Math.min(...lngs)) * 1.6) : 0.35;

  // Frame the whole run once the pins are known, then lean in on the next stop.
  // A collection run and its Zimbabwe deliveries can be continents apart, so a
  // fixed zoom is never right for both.
  const focusStop = focusStopId ? stops.find((stop) => stop.id === focusStopId) : null;
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;
    const timer = setTimeout(() => {
      try {
        if (focusStop) {
          mapRef.current?.animateToRegion?.({
            latitude: focusStop.latitude,
            longitude: focusStop.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }, 600);
        } else if (stops.length > 1) {
          mapRef.current?.fitToCoordinates?.(
            stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
            { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
          );
        }
      } catch {
        // Camera moves are cosmetic — a failure must not break the screen.
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [stops.length, focusStop?.id, focusStop?.latitude, focusStop?.longitude]);

  if (!stops.length && !polylines.length) return <FallbackCard count={0} />;
  if (!MapView) return <FallbackCard count={stops.length} />;

  const remaining = stops.filter((stop) => !stop.done).length;

  return (
    <MapErrorBoundary fallback={<FallbackCard count={stops.length} />}>
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={{ height, width: '100%' }}
          initialRegion={{
            latitude: (lats.length ? (Math.max(...lats) + Math.min(...lats)) / 2 : first.latitude),
            longitude: (lngs.length ? (Math.max(...lngs) + Math.min(...lngs)) / 2 : first.longitude),
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          }}
        >
          {polylines.map((line) => (
            <Polyline key={line.id} coordinates={line.coordinates} strokeColor={line.color} strokeWidth={3} />
          ))}
          {stops.map((stop: RunMapStop) => {
            const isFocus = stop.id === focusStopId;
            const tone = stop.color || (stop.kind === 'collection' ? colors.primary : '#d97706');
            return (
              <Marker
                key={stop.id}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                title={stop.title}
                description={stop.description}
                onCalloutPress={() => onStopPress?.(stop)}
                // A numbered pin is what makes a list of drops read as a route.
                // zIndex keeps the next stop on top of any neighbours.
                zIndex={isFocus ? 99 : undefined}
              >
                <View
                  style={[
                    styles.pin,
                    { backgroundColor: tone, borderColor: isFocus ? colors.white : 'rgba(255,255,255,.75)' },
                    stop.done && styles.pinDone,
                    isFocus && styles.pinFocus,
                  ]}
                >
                  <Text style={styles.pinText}>{stop.order ?? '•'}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Collection</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d97706' }]} /><Text style={styles.legendText}>Delivery</Text></View>
          <Text style={styles.legendText}>{remaining} to go</Text>
        </View>
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  mapCard: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mapLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  fallback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  fallbackTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  fallbackText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pin: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 5,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinFocus: { minWidth: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  pinDone: { opacity: 0.45 },
  pinText: { color: colors.white, fontSize: 12, fontWeight: '800' },
});
