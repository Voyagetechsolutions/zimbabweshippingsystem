import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';
import { loadCollectionsAhead, sortByProximity, type RouteCollection, type ScheduledDay } from '../lib/collections';
import { getDriverLocation, type Point } from '../lib/driverLocation';
import { isNetworkError } from '../lib/offlineQueue';

/**
 * What is coming, and where — so the driver can plan their own route.
 *
 * This replaces the dispatch board. Nothing here claims a job or changes a
 * booking: it is the forward view a driver needs the night before, listing
 * every collection due on each published date with its town, so they can
 * decide their own order and their own day. Claiming still happens on the day,
 * from the route screen, exactly as before.
 */

function dayLabel(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T12:00:00`);
  const days = Math.round((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return target.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function daysAway(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86400000);
}

/** One map link for a whole day, with every stop as a waypoint. */
function planDayUrl(collections: RouteCollection[]): string | null {
  const points = collections
    .map((c) => (c.latitude != null && c.longitude != null
      ? `${c.latitude},${c.longitude}`
      : [c.address, c.city, c.postcode].filter(Boolean).join(', ')))
    .filter(Boolean)
    .slice(0, 10);
  if (!points.length) return null;
  const destination = encodeURIComponent(points[points.length - 1]);
  const waypoints = points.slice(0, -1).map(encodeURIComponent).join('%7C');
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}` +
    (waypoints ? `&waypoints=${waypoints}` : '') + '&travelmode=driving';
}

export default function CollectionsAheadScreen() {
  const navigation = useNavigation<any>();
  const [days, setDays] = useState<ScheduledDay[]>([]);
  const [point, setPoint] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ahead, location] = await Promise.all([
        loadCollectionsAhead(21),
        // Ordering by distance is a convenience; never hold the list for it.
        Promise.race([
          getDriverLocation(),
          new Promise<{ point: Point | null }>((resolve) => setTimeout(() => resolve({ point: null }), 2500)),
        ]).catch(() => ({ point: null as Point | null })),
      ]);
      setDays(ahead);
      setPoint(location.point);
      setOpenDate((current) => current ?? ahead[0]?.date ?? null);
    } catch (e: any) {
      setError(isNetworkError(e)
        ? 'You appear to be offline. Upcoming collections will load when you have signal.'
        : 'Upcoming collections are unavailable right now. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const totals = useMemo(() => ({
    dates: days.length,
    collections: days.reduce((sum, day) => sum + day.collections.length, 0),
  }), [days]);

  const openMap = (url: string) => {
    if (Platform.OS === 'web') {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) Alert.alert('Could not open navigation', 'Your browser blocked the maps window. Allow pop-ups and try again.');
      return;
    }
    void Linking.openURL(url).catch(() =>
      Alert.alert('Could not open navigation', 'Check that a maps application or browser is available.'));
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><ActivityIndicator style={{ marginTop: 90 }} size="large" color={colors.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.header}>
          {navigation.canGoBack() ? (
            <Pressable accessibilityLabel="Back" style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>NEXT THREE WEEKS</Text>
            <Text style={styles.title}>Collections ahead</Text>
            <Text style={styles.subtitle}>
              {totals.collections} collection{totals.collections === 1 ? '' : 's'} across {totals.dates} date{totals.dates === 1 ? '' : 's'} — plan your own order and your own day.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={21} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!error && days.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={30} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
            <Text style={styles.emptyText}>
              No collections are booked onto a published date in the next three weeks. Pull down to refresh.
            </Text>
          </View>
        ) : null}

        {days.map((day) => {
          const open = openDate === day.date;
          const away = daysAway(day.date);
          const ordered = sortByProximity(day.collections, point);
          const mapUrl = planDayUrl(ordered);
          return (
            <View key={day.date} style={styles.dayCard}>
              <Pressable style={styles.dayHead} onPress={() => setOpenDate(open ? null : day.date)}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeValue}>{day.collections.length}</Text>
                  <Text style={styles.dayBadgeLabel}>STOPS</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>{dayLabel(day.date)}</Text>
                  <Text style={styles.dayMeta} numberOfLines={2}>
                    {day.routes.length ? day.routes.join(' · ') : 'Route not named'}
                  </Text>
                  <Text style={styles.dayMeta}>{away === 0 ? 'Today' : away === 1 ? 'In 1 day' : `In ${away} days`}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={colors.textFaint} />
              </Pressable>

              {open ? (
                <>
                  {mapUrl ? (
                    <Pressable style={styles.planButton} onPress={() => openMap(mapUrl)}>
                      <Ionicons name="navigate-outline" size={17} color={colors.white} />
                      <Text style={styles.planText}>PLAN THIS DAY IN MAPS</Text>
                    </Pressable>
                  ) : null}
                  {ordered.map((collection, index) => (
                    <View key={collection.shipmentId} style={styles.stopRow}>
                      <View style={styles.order}><Text style={styles.orderText}>{index + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopName}>{collection.customerName || 'Collection customer'}</Text>
                        <Text style={styles.stopSub} numberOfLines={2}>
                          {[collection.address, collection.city, collection.postcode].filter(Boolean).join(', ') || 'Address to follow'}
                        </Text>
                        <Text style={styles.stopSub}>
                          {collection.customerReference || collection.trackingNumber || '—'}
                          {collection.distanceKm != null ? ` · ${collection.distanceKm.toFixed(1)} km away` : ''}
                          {collection.claimStatus !== 'available' ? ` · ${String(collection.claimStatus).replace(/_/g, ' ')}` : ''}
                        </Text>
                      </View>
                      {collection.phone ? (
                        <Pressable
                          accessibilityLabel={`Call ${collection.customerName || 'customer'}`}
                          style={styles.rowAction}
                          onPress={() => Linking.openURL(`tel:${collection.phone}`).catch(() => Alert.alert('Could not start call', 'Check that your device supports phone calls.'))}
                        >
                          <Ionicons name="call-outline" size={17} color={colors.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  <Text style={styles.note}>
                    Claiming a collection still happens on the day, from your route. This list is for planning.
                  </Text>
                </>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9, color: colors.primary },
  title: { fontSize: 25, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  errorCard: { flexDirection: 'row', gap: 9, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, fontSize: 12.5, color: colors.danger, lineHeight: 18, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 9, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  dayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  dayBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dayBadgeValue: { fontSize: 18, fontWeight: '900', color: colors.primaryDark },
  dayBadgeLabel: { fontSize: 7.5, fontWeight: '900', color: colors.primaryDark, letterSpacing: 0.5 },
  dayTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  dayMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  planButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginHorizontal: spacing.md, marginBottom: spacing.sm, minHeight: 44, borderRadius: radius.sm, backgroundColor: colors.primary },
  planText: { color: colors.white, fontSize: 11.5, fontWeight: '900' },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  order: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted },
  stopName: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  stopSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  rowAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  note: { fontSize: 11, color: colors.textMuted, lineHeight: 16, padding: spacing.md, paddingTop: spacing.sm },
});
