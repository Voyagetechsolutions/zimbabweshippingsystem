import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

// Web fallback — react-native-maps is native-only, so Metro bundles this file
// on web and RunMap.native.tsx on iOS/Android.
export type RunMapStop = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  kind: 'collection' | 'delivery';
  color?: string;
  /** Position in the run — drawn inside the pin so the order is readable. */
  order?: number;
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
  onStopPress?: (stop: RunMapStop) => void;
  height?: number;
  /** The stop to centre on and call out — normally the driver's next one. */
  focusStopId?: string | null;
};

export default function RunMap(_props: RunMapProps) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={24} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Route map</Text>
        <Text style={styles.text}>The interactive stop map is available in the mobile app.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  text: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
