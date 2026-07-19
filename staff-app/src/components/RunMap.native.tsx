import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import type { RunMapStop } from './RunMap';

// react-native-maps isn't available in every runtime (notably Expo Go on some
// setups). Load it defensively so a missing native module can never crash the
// whole app at startup — we just fall back to a route card.
let MapView: any = null;
let Marker: any = null;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  MapView = null;
}

function FallbackCard({ count }: { count: number }) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={24} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fallbackTitle}>Route map</Text>
        <Text style={styles.fallbackText}>{count} mapped stop{count === 1 ? '' : 's'}. Use Navigate on each stop for turn-by-turn directions.</Text>
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

export default function RunMap({ stops }: { stops: RunMapStop[] }) {
  if (!stops.length) return null;
  if (!MapView) return <FallbackCard count={stops.length} />;

  return (
    <MapErrorBoundary fallback={<FallbackCard count={stops.length} />}>
      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: stops[0].latitude,
            longitude: stops[0].longitude,
            latitudeDelta: 0.35,
            longitudeDelta: 0.35,
          }}
        >
          {stops.map((stop) => (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              pinColor={stop.kind === 'collection' ? colors.primary : '#d97706'}
              title={stop.title}
              description={stop.description}
            />
          ))}
        </MapView>
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Collection</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d97706' }]} /><Text style={styles.legendText}>Delivery</Text></View>
        </View>
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  mapCard: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  map: { height: 220, width: '100%' },
  mapLegend: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  fallback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  fallbackTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  fallbackText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
