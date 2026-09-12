import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
// Alert comes from lib/alerts, not react-native: these screens build their
// button lists from data, and a native Android alert shows at most three
// buttons. The 12 configured failed-stop reasons became 2 reachable ones.
import { Alert } from '../lib/alerts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';
import { isPlaceholderRoute, loadRouteDay, routeKey, type RouteCollection } from '../lib/collections';
import { moveStop } from '../lib/routeOptimiser';
import { multiStopGoogleMapsUrl, navigationOptions } from '../lib/navigationLinks';
import {
  isStopLocationDoubtful, isStopOutstanding, loadRun, planRoute, saveStopOrder, startRoute,
  type DriverRun,
} from '../lib/routePlan';
import { isNetworkError } from '../lib/offlineQueue';

/**
 * One route, in the order the driver will actually drive it.
 *
 * Before the run starts this is a plan the driver owns: the optimiser proposes
 * an order from where they are standing, and they can move anything anywhere
 * before committing. "Start route" turns that plan into a run, which is what
 * every existing stop transition, scan and proof-of-collection hangs off.
 *
 * Reordering is buttons rather than drag-and-drop on purpose. A driver does
 * this in a van, often in the wet with one hand — "move to top" is one sure
 * tap, where a long-press drag on a scrolling list is a fight. It also avoids
 * a native gesture dependency for the sake of a gesture nobody asked for.
 */

type Params = { routeName?: string | null; date?: string | null };

export default function DriverRouteScreen() {
  const navigation = useNavigation<any>();
  const params = (useRoute().params || {}) as Params;
  const routeName = params.routeName ?? null;
  const date = params.date ?? undefined;

  const [collections, setCollections] = useState<RouteCollection[]>([]);
  const [run, setRun] = useState<DriverRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [day, existing] = await Promise.all([
        loadRouteDay(date),
        loadRun(date).catch(() => null),
      ]);

      // Match on the normalised key, not the raw string: the published
      // schedule says "NORTHAMPTON ROUTE" and the bookings on it say
      // "NORTHAMPTON", so comparing them literally finds nothing at all.
      const wanted = routeKey(routeName);
      const dayRoutes = (day.routes || []).map((r: any) => (typeof r === 'string' ? r : r?.route)).filter(Boolean);
      const onlyOneRoute = dayRoutes.filter((r) => !isPlaceholderRoute(r)).length <= 1;

      const forRoute = (day.collections || []).filter((c) => {
        if (!wanted) return true;
        if (routeKey(c.route) === wanted) return true;
        // A booking nobody has assigned a route to yet still has to be
        // collected. On a day running a single route it plainly belongs to it;
        // where the day runs several, guessing would put it on the wrong van,
        // so it is left for the office to assign.
        return onlyOneRoute && isPlaceholderRoute(c.route);
      });

      setCollections(forRoute);
      setRun(existing);
    } catch (err: any) {
      setError(isNetworkError(err)
        ? 'No signal. Pull down to try again when you are back in coverage.'
        : err?.message || 'Could not load this route.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeName, date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Stops already on the run take over from the planning list once it starts.
  const started = Boolean(run?.runId && (run?.stops?.length ?? 0) > 0);
  const outstanding = useMemo(() => (run?.stops || []).filter(isStopOutstanding), [run]);
  const worked = useMemo(
    () => (run?.stops || []).filter((s) => !isStopOutstanding(s)),
    [run],
  );

  const optimise = useCallback(async () => {
    setBusy(true);
    try {
      const plan = await planRoute(collections);
      setCollections([...plan.ordered, ...plan.unplaceable]);
      const parts: string[] = [];
      if (!plan.usedDriverLocation) parts.push('ordered from the first stop — no location fix');
      if (plan.unplaceable.length) {
        parts.push(`${plan.unplaceable.length} without a map pin, listed last`);
      }
      parts.push(`about ${plan.straightLineKm.toFixed(0)} km in straight lines`);
      setPlanNote(parts.join(' · '));
    } finally {
      setBusy(false);
    }
  }, [collections]);

  const begin = useCallback(async () => {
    setBusy(true);
    try {
      const result = await startRoute(routeName, collections, date);
      if (!result.ok) {
        Alert.alert('Could not start the route', result.message);
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }, [routeName, collections, date, load]);

  /** Reorder before the run exists — nothing to persist yet. */
  const movePlanned = useCallback((from: number, to: number) => {
    setCollections((current) => moveStop(current, from, to));
    setPlanNote(null);
  }, []);

  /** Reorder outstanding stops on a live run, then persist the new sequence. */
  const moveStopOnRun = useCallback(async (from: number, to: number) => {
    if (!run) return;
    const reordered = moveStop(outstanding, from, to);
    setRun({ ...run, stops: [...worked, ...reordered] });
    const saved = await saveStopOrder(run.runId, reordered.map((s) => s.stopId)).catch(() => false);
    if (!saved) {
      setPlanNote('New order saved on this phone only — it will sync when you have signal.');
    }
  }, [run, outstanding, worked]);

  const navigateTo = useCallback((target: {
    latitude?: number | null; longitude?: number | null; address?: string | null;
  }) => {
    const options = navigationOptions(target, Platform.OS);
    if (!options.length) {
      Alert.alert(
        'No location for this stop',
        'This address has never been placed on the map. Call the customer, or ask the office to check the address.',
      );
      return;
    }
    Alert.alert('Navigate with', undefined, [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => { Linking.openURL(option.url).catch(() => undefined); },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, []);

  const openWholeRoute = useCallback(() => {
    const stops = started
      ? outstanding.map((s) => ({ latitude: s.latitude, longitude: s.longitude, address: s.address }))
      : collections.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
        address: [c.address, c.city, c.postcode].filter(Boolean).join(', '),
      }));
    const link = multiStopGoogleMapsUrl(null, stops);
    if (!link) {
      Alert.alert('Nothing to map', 'None of these stops has a location yet.');
      return;
    }
    const total = stops.length;
    const open = () => { Linking.openURL(link.url).catch(() => undefined); };
    if (link.covered < total) {
      // Google drops waypoints past its limit without saying so; better the
      // driver hears it from us than loses a collection.
      Alert.alert(
        'Only the first stops fit',
        `Google Maps takes ${link.covered} of your ${total} stops in one go. Open those, then come back for the rest.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open', onPress: open }],
      );
      return;
    }
    open();
  }, [started, outstanding, collections]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{routeName || 'Collections'}</Text>
          <Text style={styles.subtitle}>
            {started
              ? `${outstanding.length} to go${worked.length ? ` · ${worked.length} done` : ''}`
              : `${collections.length} collection${collections.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        {/* A parcel that is not on today's list still has to be findable. */}
        <Pressable onPress={() => navigation.navigate('FindShipment')} hitSlop={10} style={styles.mapAll}>
          <Ionicons name="search" size={20} color={colors.primary} />
        </Pressable>
        {(started ? outstanding.length : collections.length) > 1 && (
          <Pressable onPress={openWholeRoute} hitSlop={10} style={styles.mapAll}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        {error && (
          <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View>
        )}
        {planNote && (
          <View style={styles.notice}><Text style={styles.noticeText}>{planNote}</Text></View>
        )}

        {!started && collections.length === 0 && !error && (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No collections on this route.</Text>
          </View>
        )}

        {!started && collections.map((collection, index) => (
          <PlanRow
            key={collection.shipmentId}
            index={index}
            total={collections.length}
            name={collection.customerName}
            reference={collection.customerReference || collection.trackingNumber}
            where={[collection.address, collection.city, collection.postcode].filter(Boolean).join(', ')}
            hasPoint={collection.latitude != null && collection.longitude != null}
            doubtful={collection.latitude == null || collection.longitude == null}
            onMoveTop={() => movePlanned(index, 0)}
            onMoveUp={() => movePlanned(index, index - 1)}
            onNavigate={() => navigateTo({
              latitude: collection.latitude,
              longitude: collection.longitude,
              address: [collection.address, collection.city, collection.postcode].filter(Boolean).join(', '),
            })}
          />
        ))}

        {started && outstanding.map((stop, index) => (
          <PlanRow
            key={stop.stopId}
            index={index}
            total={outstanding.length}
            name={stop.customerName || 'Collection'}
            reference={stop.customerReference || stop.trackingNumber}
            where={stop.address}
            hasPoint={stop.latitude != null && stop.longitude != null}
            doubtful={isStopLocationDoubtful(stop)}
            onMoveTop={() => moveStopOnRun(index, 0)}
            onMoveUp={() => moveStopOnRun(index, index - 1)}
            onNavigate={() => navigateTo(stop)}
            onOpen={() => navigation.navigate('StopWorkflow', {
              stop: {
                id: stop.stopId,
                shipmentId: stop.shipmentId,
                kind: 'collection' as const,
                customerName: stop.customerName || '',
                trackingNumber: stop.trackingNumber || '',
              },
            })}
          />
        ))}

        {started && worked.length > 0 && (
          <>
            <Text style={styles.doneLabel}>Done</Text>
            {worked.map((stop) => (
              <View key={stop.stopId} style={[styles.row, styles.rowDone]}>
                <Ionicons
                  name={stop.status === 'failed' ? 'close-circle' : 'checkmark-circle'}
                  size={20}
                  color={stop.status === 'failed' ? colors.danger : colors.primary}
                />
                <Text style={styles.doneText} numberOfLines={1}>
                  {stop.customerName || stop.customerReference || 'Collection'}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {!started && collections.length > 0 && (
        <View style={styles.footer}>
          <Pressable style={[styles.secondary, busy && styles.disabled]} onPress={optimise} disabled={busy}>
            <Ionicons name="shuffle" size={18} color={colors.primary} />
            <Text style={styles.secondaryText}>Best order</Text>
          </Pressable>
          <Pressable style={[styles.primary, busy && styles.disabled]} onPress={begin} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>Start route</Text>}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function PlanRow({
  index, total, name, reference, where, hasPoint, doubtful, onMoveTop, onMoveUp, onNavigate, onOpen,
}: {
  index: number; total: number;
  name: string; reference: string | null; where: string | null;
  hasPoint: boolean; doubtful: boolean;
  onMoveTop: () => void; onMoveUp: () => void; onNavigate: () => void; onOpen?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.position} onPress={onMoveTop} disabled={index === 0} hitSlop={6}>
        <Text style={styles.positionText}>{index + 1}</Text>
        {index > 0 && <Text style={styles.positionHint}>to top</Text>}
      </Pressable>

      <Pressable style={styles.rowBody} onPress={onOpen} disabled={!onOpen}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!reference && <Text style={styles.reference}>{reference}</Text>}
        <Text style={styles.where} numberOfLines={2}>{where || 'No address'}</Text>
        {doubtful && (
          <View style={styles.warn}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.amber} />
            <Text style={styles.warnText}>
              {hasPoint ? 'Address not confirmed — check before you set off' : 'Not on the map — call the customer'}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        {index > 0 && total > 1 && (
          <Pressable onPress={onMoveUp} hitSlop={8} style={styles.action}>
            <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        <Pressable onPress={onNavigate} hitSlop={8} style={styles.action}>
          <Ionicons name="navigate" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  back: { padding: 4 },
  mapAll: { padding: 6 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  body: { padding: spacing.md, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xl },
  notice: {
    backgroundColor: colors.primarySoft, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.xs,
  },
  noticeText: { fontSize: 13, color: colors.text },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.sm, ...shadow,
  },
  rowDone: { opacity: 0.6 },
  position: {
    width: 44, height: 44, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft,
  },
  positionText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  positionHint: { fontSize: 9, color: colors.primary },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  reference: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  where: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  warnText: { fontSize: 11, color: colors.amber, flex: 1 },
  actions: { alignItems: 'center', gap: spacing.xs },
  action: { padding: 6 },
  doneLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    marginTop: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  doneText: { flex: 1, color: colors.textMuted, fontSize: 14 },
  footer: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: spacing.md, height: 48, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  primary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: radius.md, backgroundColor: colors.primary,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
