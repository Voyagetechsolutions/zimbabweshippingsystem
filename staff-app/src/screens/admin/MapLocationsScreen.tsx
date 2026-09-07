import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import {
  geocodeAllShipments, loadLocationCoverage,
  type GeocodeMiss, type GeocodeProgress, type LocationCoverage,
} from '../../lib/geocodeBackfill';

/**
 * Where the shipments are, and filling in the ones we do not know.
 *
 * Nothing in the driver app works without this: no coordinates means no map,
 * no route ordering and no navigation, and a driver looking at a day's work
 * with no pins has nothing to plan from.
 *
 * The addresses that cannot be placed are listed rather than counted, because
 * that is the queue somebody has to work through by hand — roughly 40% of
 * bookings carry a postcode, and Irish addresses carry no Eircode at all.
 */
export default function MapLocationsScreen() {
  const navigation = useNavigation<any>();
  const [coverage, setCoverage] = useState<LocationCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<GeocodeProgress | null>(null);
  const [misses, setMisses] = useState<GeocodeMiss[]>([]);

  const load = useCallback(async () => {
    try {
      setCoverage(await loadLocationCoverage());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = useCallback(async () => {
    setRunning(true);
    setProgress(null);
    setMisses([]);
    try {
      const result = await geocodeAllShipments(setProgress);
      if (!result.ok) {
        Alert.alert('Could not finish', result.message);
        await load();
        return;
      }
      setMisses(result.misses);
      await load();
      Alert.alert(
        'Finished',
        [
          `${result.resolved} placed on the map.`,
          result.approximate ? `${result.approximate} only to a town centre.` : '',
          result.failed ? `${result.failed} could not be placed — they need a pin by hand.` : '',
          result.hitCap ? 'Stopped at the batch limit; run it again to continue.' : '',
        ].filter(Boolean).join('\n'),
      );
    } finally {
      setRunning(false);
    }
  }, [load]);

  const openShipment = async (id: string) => {
    const { data } = await supabase.from('shipments').select('*').eq('id', id).maybeSingle();
    if (data) navigation.navigate('ShipmentDetail', { shipment: data });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const done = coverage && coverage.total > 0 ? coverage.located / coverage.total : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Map locations</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {coverage?.located ?? 0} of {coverage?.total ?? 0} shipments are on the map
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.round(done * 100)}%` }]} />
          </View>
          <Text style={styles.meta}>
            {coverage?.missing ?? 0} with no location · {coverage?.approximate ?? 0} town centre only ·{' '}
            {coverage?.failed ?? 0} could not be placed · {coverage?.verified ?? 0} verified
          </Text>
          <Text style={styles.help}>
            Drivers cannot map, order or navigate a collection without a location. Addresses that
            cannot be found need a pin placing by hand on the shipment.
          </Text>

          <Pressable
            style={[styles.primary, running && styles.disabled]}
            onPress={run}
            disabled={running}
          >
            {running
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>Find missing locations</Text>}
          </Pressable>

          {running || progress ? (
            <Text style={styles.meta}>
              {progress
                ? `Batch ${progress.batches} · ${progress.resolved} placed · ${progress.failed} could not be placed`
                : 'Starting…'}
            </Text>
          ) : null}
          {running ? (
            <Text style={styles.help}>
              This takes a while on purpose — the free map services allow about one lookup a
              second. Leave the screen open.
            </Text>
          ) : null}
        </View>

        {misses.length > 0 ? (
          <>
            <Text style={styles.groupLabel}>COULD NOT BE PLACED — TAP TO ADD A PIN</Text>
            {misses.map((miss) => (
              <Pressable key={miss.id} style={styles.row} onPress={() => openShipment(miss.id)}>
                <Ionicons name="location-outline" size={18} color={colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{miss.reference || 'Shipment'}</Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    {miss.tried ? `Searched for: ${miss.tried}` : 'No address to search'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  meta: { fontSize: 12, color: colors.textMuted },
  help: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  primary: { height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
  groupLabel: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
});
