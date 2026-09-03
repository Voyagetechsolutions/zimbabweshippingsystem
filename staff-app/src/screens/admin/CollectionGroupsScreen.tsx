import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import {
  CollectionDriver, CollectionRunRow, STALE_ROUTE, UNASSIGNED_ROUTE, assignRunDriver, daysAway,
  isSyntheticRun, loadCollectionDrivers, loadCollectionRuns, runDateLabel,
} from '../../lib/collectionRuns';
import { Avatar, Badge, BADGE, EmptyState, ErrorState, Loading, SectionLabel } from '../../components/adminui';
import { colors, radius, shadow, spacing } from '../../theme';

/**
 * The dispatcher's way in: every collection grouped by route and date.
 *
 * Before this the board was one flat list of every open booking, sorted by
 * customer name, which is unusable at a couple of hundred shipments — there was
 * no way to say "show me the Northampton run on the 14th" because nothing
 * represented that. Opening a group here hands the route builder only that
 * group's collections.
 *
 * Two rows are not real runs. "Unassigned" is recent bookings whose postcode
 * matched no route and which need a human; "Older than 60 days" is the tail of
 * abandoned bookings, counted so nothing is hidden but kept out of the way.
 */
export default function CollectionGroupsScreen({ navigation }: any) {
  const [rows, setRows] = useState<CollectionRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The group a driver is being chosen for, and the drivers to choose from.
  const [assigning, setAssigning] = useState<CollectionRunRow | null>(null);
  const [drivers, setDrivers] = useState<CollectionDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await loadCollectionRuns());
    } catch (e: any) {
      setError(e?.message || 'Could not load collection groups.');
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`collection-runs-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_runs' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  if (loading) return <Loading />;

  const runs = rows.filter((r) => !isSyntheticRun(r));
  const unassigned = rows.find((r) => isSyntheticRun(r) && r.route === UNASSIGNED_ROUTE);
  const stale = rows.find((r) => isSyntheticRun(r) && r.route === STALE_ROUTE);
  const totalWaiting = runs.reduce((sum, r) => sum + r.shipment_count, 0);

  const openPicker = async (run: CollectionRunRow) => {
    if (!run.run_id) return;
    if (!run.collection_date) {
      Alert.alert('No date yet', `Publish a collection date for ${run.route} before putting a driver on it.`);
      return;
    }
    setAssigning(run);
    setDriversLoading(true);
    try { setDrivers(await loadCollectionDrivers(run.collection_date)); }
    catch (e: any) { Alert.alert('Could not load drivers', e?.message || 'Try again.'); }
    finally { setDriversLoading(false); }
  };

  const assign = async (driverId: string | null, driverName?: string) => {
    if (!assigning?.run_id) return;
    setBusy(true);
    try {
      const result = await assignRunDriver(assigning.run_id, driverId);
      setAssigning(null);
      await load();
      Alert.alert(
        result.assigned ? 'Driver assigned' : 'Driver removed',
        result.assigned
          ? `${driverName || 'The driver'} is on ${result.route}. ${result.stopsAdded} collection${result.stopsAdded === 1 ? '' : 's'} added to their run, ordered by the times customers asked for.`
          : `${assigning.route} is back in the pool.`,
      );
    } catch (e: any) {
      Alert.alert('Could not assign', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const openRun = (run: CollectionRunRow) => {
    if (!run.run_id) return;
    navigation.navigate('BuildRoute', {
      date: run.collection_date || new Date().toISOString().slice(0, 10),
      runId: run.run_id,
      runRoute: run.route,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.eyebrow}>DISPATCH</Text>
        <Text style={styles.title}>Collection groups</Text>
        <Text style={styles.subtitle}>
          {runs.length} route{runs.length === 1 ? '' : 's'} · {totalWaiting} collection{totalWaiting === 1 ? '' : 's'} waiting
        </Text>

        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {runs.length === 0 && !error ? (
          <EmptyState
            icon="calendar-outline"
            title="No collection groups yet"
            text="Groups appear as bookings come in. Publish a date for a route and its bookings gather here."
          />
        ) : null}

        {runs.map((run) => {
          const days = daysAway(run.collection_date);
          const overdue = days != null && days < 0;
          const soon = days != null && days >= 0 && days <= 2;
          return (
            <View key={run.run_id!} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.route}>{run.route}</Text>
                  <Text style={[styles.date, overdue && { color: colors.danger }, soon && { color: colors.primaryDark }]}>
                    {runDateLabel(run.collection_date)}
                    {days == null ? '' : overdue ? ` · ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                      : days === 0 ? ' · today' : days === 1 ? ' · tomorrow' : ` · in ${days} days`}
                  </Text>
                </View>
                {/* Keyed on the run, not the name: a driver whose profile has
                    no name still has the group. */}
                <Badge
                  text={run.driver_run_id ? (run.driver_name?.split(' ')[0] || 'Assigned') : 'No driver'}
                  tone={run.driver_run_id ? BADGE.green : BADGE.orange}
                />
              </View>

              <View style={styles.stats}>
                <Stat value={run.shipment_count} label={run.shipment_count === 1 ? 'collection' : 'collections'} />
                <Stat value={run.slots_chosen} label="times chosen" />
                {run.needs_contact > 0
                  ? <Stat value={run.needs_contact} label="to be told" tone={colors.danger} />
                  : null}
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openPicker(run)}
                  style={({ pressed }) => [
                    styles.action,
                    run.driver_run_id ? styles.actionGhost : styles.actionPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name={run.driver_run_id ? 'swap-horizontal' : 'person-add-outline'}
                    size={15}
                    color={run.driver_run_id ? colors.primaryDark : colors.white}
                  />
                  <Text style={[styles.actionText, { color: run.driver_run_id ? colors.primaryDark : colors.white }]}>
                    {run.driver_run_id ? 'Change driver' : 'Assign driver'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => (run.driver_run_id
                    ? navigation.navigate('RunDetail', { runId: run.driver_run_id! })
                    : openRun(run))}
                  style={({ pressed }) => [styles.action, styles.actionGhost, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons
                    name={run.driver_run_id ? 'map-outline' : 'list-outline'}
                    size={15}
                    color={colors.primaryDark}
                  />
                  <Text style={[styles.actionText, { color: colors.primaryDark }]}>
                    {run.driver_run_id ? 'Open run' : 'Open group'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {(unassigned?.shipment_count || 0) > 0 || (stale?.shipment_count || 0) > 0 ? (
          <SectionLabel text="Not in a group" />
        ) : null}

        {(unassigned?.shipment_count || 0) > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('BuildRoute', { date: new Date().toISOString().slice(0, 10) })}
            style={[styles.card, styles.warnCard]}
          >
            <View style={styles.cardTop}>
              <Ionicons name="help-circle-outline" size={20} color="#8a6d00" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.route, { color: '#8a6d00' }]}>
                  {unassigned!.shipment_count} unassigned
                </Text>
                <Text style={[styles.date, { color: '#8a6d00' }]}>
                  Booked recently, but the collection postcode matched no published route. Open the builder to place them.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8a6d00" />
            </View>
          </Pressable>
        ) : null}

        {(stale?.shipment_count || 0) > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.bg }]}>
            <Text style={styles.staleText}>
              {stale!.shipment_count} older pending bookings are more than 60 days old and are kept out of the working
              set. They are still in the full collections list if you need them.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(assigning)} transparent animationType="slide" onRequestClose={() => setAssigning(null)}>
        <Pressable style={styles.backdrop} onPress={() => !busy && setAssigning(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{assigning?.route}</Text>
            <Text style={styles.sheetSub}>
              {runDateLabel(assigning?.collection_date ?? null)} · {assigning?.shipment_count ?? 0} collection
              {(assigning?.shipment_count ?? 0) === 1 ? '' : 's'}
            </Text>

            {driversLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {drivers.length === 0 ? (
                  <Text style={styles.staleText}>No collection drivers are set up yet.</Text>
                ) : drivers.map((d) => (
                  <Pressable
                    accessibilityRole="button"
                    key={d.id}
                    disabled={busy}
                    onPress={() => assign(d.id, d.full_name || d.email || 'The driver')}
                    style={({ pressed }) => [styles.driverRow, pressed && { backgroundColor: colors.primarySoft }]}
                  >
                    <Avatar name={d.full_name || d.email} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{d.full_name || d.email || 'Driver'}</Text>
                      <Text style={styles.driverMeta}>
                        {d.on_leave ? 'On leave · ' : ''}
                        {d.stops_that_day > 0
                          ? `already ${d.stops_that_day} stop${d.stops_that_day === 1 ? '' : 's'} that day${d.run_route ? ` on ${d.run_route}` : ''}`
                          : 'free that day'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {assigning?.driver_run_id ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => assign(null)}
                style={[styles.action, styles.actionDanger, { marginTop: spacing.sm }]}
              >
                <Ionicons name="person-remove-outline" size={15} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Take the driver off this group</Text>
              </Pressable>
            ) : null}

            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setAssigning(null)} style={styles.sheetCancel}>
              <Text style={styles.sheetCancelText}>{busy ? 'Working…' : 'Cancel'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md, ...shadow,
  },
  warnCard: { backgroundColor: '#FEF6DC', borderColor: '#E8C765' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  route: { color: colors.text, fontSize: 14.5, fontWeight: '900' },
  date: { color: colors.textMuted, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  stats: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  stat: { alignItems: 'flex-start' },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  staleText: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.sm, paddingHorizontal: 12, minHeight: 38, flex: 1,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionGhost: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  actionDanger: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.danger },
  actionText: { fontSize: 11.5, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, paddingBottom: spacing.xl, gap: 4,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sheetSub: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  driverRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  driverName: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  driverMeta: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  sheetCancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  sheetCancelText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '800' },
});
