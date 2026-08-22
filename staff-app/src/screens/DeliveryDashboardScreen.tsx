import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import RunMap from '../components/RunMap';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';
import { greeting } from '../lib/format';
import { enqueue, flushQueue, isNetworkError } from '../lib/offlineQueue';
import {
  loadDeliveryDay, verificationLabel, type DeliveryDay, type DeliveryLoadItem,
} from '../lib/deliveries';
import type { DeliveryStackParams } from '../navigation/types';

// The delivery driver's day.
//
// A pickup driver's day is a shared route to pick from. A delivery driver's day
// is a vehicle they loaded themselves at the depot: build the load, wait for
// admin to verify every delivery note, then run the drops.

type Props = NativeStackScreenProps<DeliveryStackParams, 'DeliveryHome'>;
interface Attendance { id: string; clocked_in_at: string; clocked_out_at: string | null; }

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function stopTone(status: DeliveryLoadItem['stopStatus']) {
  if (status === 'completed') return { bg: colors.primarySoft, fg: colors.primaryDark, label: 'Delivered' };
  if (status === 'failed') return { bg: colors.redSoft, fg: colors.danger, label: 'Exception' };
  if (status === 'en_route') return { bg: colors.blueSoft, fg: colors.blue, label: 'En route' };
  if (status === 'arrived') return { bg: colors.amberSoft, fg: colors.amber, label: 'Arrived' };
  return { bg: '#f1f5f9', fg: '#475569', label: 'Ready' };
}

export default function DeliveryDashboardScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const [day, setDay] = useState<DeliveryDay | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [geocoding, setGeocoding] = useState(false);
  const geocodeAttemptedRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    try {
      const { remaining } = await flushQueue();
      setPendingSync(remaining);
      const attendanceResult = await supabase.from('driver_attendance')
        .select('id,clocked_in_at,clocked_out_at')
        .eq('driver_id', session.user.id).eq('work_date', todayIso()).maybeSingle();
      if (attendanceResult.error) throw attendanceResult.error;
      setAttendance((attendanceResult.data as Attendance | null) || null);
      setDay(await loadDeliveryDay());
    } catch (e: any) {
      setDay(null);
      setError(e?.message || 'Could not load today’s deliveries.');
    }
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { await load(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [load]));

  useEffect(() => {
    if (!attendance || attendance.clocked_out_at) return;
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [attendance]);

  // Admin verification arrives while the driver is standing at the vehicle, so
  // the screen listens rather than making them pull to refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`delivery-home-${session?.user.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_notes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  const items = useMemo(() => day?.items || [], [day]);
  const run = day?.run || null;
  const onDuty = Boolean(attendance && !attendance.clocked_out_at);
  const verified = items.filter((item) => item.verificationStatus === 'verified').length;
  const rejected = items.filter((item) => item.verificationStatus === 'rejected').length;
  const pending = items.length - verified - rejected;
  const delivered = items.filter((item) => item.stopStatus === 'completed').length;
  const open = items.filter((item) => !['completed', 'failed'].includes(item.stopStatus));
  const nextStop = open[0] || null;
  const mappable = items.filter((item) => item.latitude != null && item.longitude != null);
  const unmapped = items.length - mappable.length;
  const allClosed = items.length > 0 && open.length === 0;

  // Delivery addresses in Zimbabwe rarely carry coordinates, so the same
  // server-side geocoder the collection runs use fills them in once per run.
  const fillCoordinates = useCallback(async (runId: string, silent: boolean) => {
    setGeocoding(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('geocode-stops', { body: { runId } });
      if (fnError) throw fnError;
      if (Number((data as any)?.resolved) > 0) await load();
      else if (!silent) Alert.alert('No coordinates found', 'These addresses could not be placed on a map. Navigate still works from each drop.');
    } catch (e: any) {
      if (!silent) Alert.alert('Could not update the map', e?.message || 'Please try again.');
    } finally {
      setGeocoding(false);
    }
  }, [load]);

  useEffect(() => {
    if (!run || unmapped === 0) return;
    if (geocodeAttemptedRef.current === run.id) return;
    geocodeAttemptedRef.current = run.id;
    fillCoordinates(run.id, true);
  }, [run, unmapped, fillCoordinates]);

  const clock = async (action: 'in' | 'out') => {
    if (action === 'out' && pendingSync > 0) {
      Alert.alert('Sync before clocking out', `${pendingSync} update${pendingSync === 1 ? '' : 's'} still need a connection.`);
      return;
    }
    setBusy(`clock-${action}`);
    try {
      const { data, error: clockError } = await supabase.rpc('clock_driver', { p_action: action, p_note: null });
      if (clockError) throw clockError;
      setAttendance(data as Attendance);
    } catch (e: any) { Alert.alert(`Could not clock ${action}`, e?.message || 'Please try again.'); }
    finally { setBusy(null); }
  };

  const startRun = async () => {
    if (!run) return;
    setBusy(run.id);
    try {
      const { error: rpcError } = await supabase.rpc('start_driver_run', { p_run_id: run.id });
      if (rpcError) throw rpcError;
      await load();
    } catch (e: any) {
      Alert.alert('Could not start the delivery run', e?.message || 'Please try again.');
    } finally { setBusy(null); }
  };

  const completeRun = () => {
    if (!run) return;
    Alert.alert('Complete this run?', 'This closes today’s deliveries and sends the summary to admin.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete run', onPress: async () => {
          setBusy(run.id);
          try {
            const { error: rpcError } = await supabase.rpc('complete_driver_run', { p_run_id: run.id });
            if (rpcError) throw rpcError;
            await load();
          } catch (e: any) { Alert.alert('Could not complete run', e?.message || 'Please try again.'); }
          finally { setBusy(null); }
        },
      },
    ]);
  };

  const transition = async (item: DeliveryLoadItem, next: 'en_route' | 'arrived') => {
    if (run?.status !== 'active') { Alert.alert('Start the run first', 'Tap Start delivery run before changing a drop.'); return; }
    setBusy(item.stopId);
    try {
      const { error: rpcError } = await supabase.rpc('transition_driver_stop', { p_stop_id: item.stopId, p_next_status: next });
      if (rpcError) throw rpcError;
      await load();
    } catch (e: any) {
      if (isNetworkError(e)) {
        await enqueue({ fn: 'transition_driver_stop', args: { p_stop_id: item.stopId, p_next_status: next }, stopId: item.stopId });
        setPendingSync((count) => count + 1);
        setDay((current) => current ? { ...current, items: current.items.map((row) => row.stopId === item.stopId ? { ...row, stopStatus: next } : row) } : current);
      } else {
        Alert.alert('Status update failed', e?.message || 'Please try again.');
      }
    } finally { setBusy(null); }
  };

  const openHandover = (item: DeliveryLoadItem) => {
    navigation.navigate('StopWorkflow', {
      stop: {
        id: item.stopId,
        shipmentId: item.shipmentId,
        kind: 'delivery',
        customerName: item.receiverName || 'Recipient',
        trackingNumber: item.trackingNumber || item.customerReference || 'Delivery',
      },
    });
  };

  const navigateTo = (item: DeliveryLoadItem) => {
    const destination = item.latitude != null && item.longitude != null
      ? `${item.latitude},${item.longitude}`
      : encodeURIComponent(item.address || '');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`)
      .catch(() => Alert.alert('Could not open maps', 'Check that a maps application or browser is available.'));
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.driverName}>{profile?.full_name || 'Driver'}</Text>
            <Text style={styles.sub}>Delivery driver · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => navigation.getParent<any>()?.navigate('My Account', { screen: 'Account' })}>
            <Ionicons name="person-outline" size={19} color={colors.primaryDark} />
          </Pressable>
        </View>

        {!attendance ? (
          <View style={[styles.dutyCard, { backgroundColor: colors.surface }]}>
            <View style={styles.kickerRow}><Ionicons name="time-outline" size={15} color={colors.amber} /><Text style={styles.dutyKicker}>READY TO WORK</Text></View>
            <Text style={styles.dutyText}>Clock in to start your shift and load the vehicle.</Text>
            <Pressable style={styles.dutyButton} onPress={() => clock('in')} disabled={busy === 'clock-in'}>
              {busy === 'clock-in' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.dutyButtonText}>Clock in</Text>}
            </Pressable>
          </View>
        ) : !attendance.clocked_out_at ? (
          <View style={[styles.dutyCard, { backgroundColor: colors.primary }]}>
            <View style={styles.kickerRow}><Ionicons name="checkmark-circle-outline" size={15} color="#bbf7d0" /><Text style={[styles.dutyKicker, { color: '#bbf7d0' }]}>ON DUTY</Text></View>
            <View style={styles.dutyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dutyBig}>{new Date(attendance.clocked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.dutyText, { color: '#d1fae5' }]}>started</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dutyBig}>
                  {(() => { const ms = clockNow - new Date(attendance.clocked_in_at).getTime(); const h = Math.floor(ms / 36e5); const m = Math.floor((ms % 36e5) / 6e4); return `${h}h ${m}m`; })()}
                </Text>
                <Text style={[styles.dutyText, { color: '#d1fae5' }]}>working</Text>
              </View>
              <Pressable style={styles.clockOutLight} onPress={() => clock('out')} disabled={busy === 'clock-out'}>
                {busy === 'clock-out' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.clockOutLightText}>Clock out</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.dutyCard, { backgroundColor: colors.surface }]}>
            <View style={styles.kickerRow}><Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} /><Text style={styles.dutyKicker}>SHIFT COMPLETED</Text></View>
            <Text style={styles.dutyText}>Great work today — see you tomorrow.</Text>
          </View>
        )}

        {pendingSync > 0 ? (
          <View style={styles.syncBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.amber} />
            <Text style={styles.syncText}>{pendingSync} update{pendingSync > 1 ? 's' : ''} waiting for signal — they’ll sync automatically.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!onDuty ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={42} color={colors.primary} />
            <Text style={styles.emptyTitle}>Clock in to start</Text>
            <Text style={styles.emptyText}>Once you are on duty you can load the vehicle and today’s drops appear here.</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={42} color={colors.primary} />
            <Text style={styles.emptyTitle}>Vehicle is empty</Text>
            <Text style={styles.emptyText}>
              Add the consignments going out today. Each one is found by customer reference and checked against the
              metal seal fitted at collection.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => navigation.navigate('DeliveryLoad')}>
              <Ionicons name="add-circle-outline" size={17} color={colors.white} />
              <Text style={styles.emptyButtonText}>Load the vehicle</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Verification gate — the run cannot start until admin has checked
                every delivery note on the vehicle. */}
            <View style={[styles.gateCard, rejected > 0 ? styles.gateBad : pending > 0 ? styles.gateWait : styles.gateGood]}>
              <Ionicons
                name={rejected > 0 ? 'close-circle' : pending > 0 ? 'hourglass-outline' : 'shield-checkmark'}
                size={22}
                color={rejected > 0 ? colors.danger : pending > 0 ? colors.amber : colors.primaryDark}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.gateTitle}>
                  {rejected > 0 ? `${rejected} delivery note${rejected === 1 ? '' : 's'} rejected`
                    : pending > 0 ? `${pending} delivery note${pending === 1 ? '' : 's'} awaiting admin`
                      : 'All delivery notes verified'}
                </Text>
                <Text style={styles.gateText}>
                  {rejected > 0
                    ? 'Take the rejected consignments off the vehicle, or fix what admin flagged, before starting the run.'
                    : pending > 0
                      ? `${verified} of ${items.length} verified. Admin verifies each note before it can travel — you will see them tick over here.`
                      : 'Every note on this vehicle has been checked by the office. You can download them and start the run.'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>TODAY’S DELIVERIES</Text>
                  <Text style={styles.summaryValue}>{delivered} / {items.length} delivered</Text>
                  <Text style={styles.routeName}>{run?.route_name || 'Delivery route'} · {run?.status || 'planned'}</Text>
                </View>
                <Text style={styles.progressPct}>{items.length ? Math.round((delivered / items.length) * 100) : 0}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${items.length ? Math.max(3, (delivered / items.length) * 100) : 0}%` }]} />
              </View>
              <View style={styles.statRow}>
                <Stat value={items.length} label="On board" color={colors.primary} />
                <Stat value={verified} label="Verified" color={colors.blue} />
                <Stat value={open.length} label="Remaining" color={colors.orange} />
              </View>

              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('DeliveryLoad')}>
                  <Ionicons name="cube-outline" size={16} color={colors.primary} />
                  <Text style={styles.secondaryText}>Load</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('DeliveryNotes')}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  <Text style={styles.secondaryText}>Notes</Text>
                </Pressable>
              </View>

              {run?.status === 'planned' ? (
                <Pressable style={[styles.startButton, (pending > 0 || rejected > 0) && styles.disabled]}
                  onPress={startRun} disabled={busy === run.id || pending > 0 || rejected > 0}>
                  {busy === run.id ? <ActivityIndicator color={colors.white} /> : (
                    <><Ionicons name="play" size={17} color={colors.white} /><Text style={styles.startButtonText}>Start delivery run</Text></>
                  )}
                </Pressable>
              ) : null}

              {run?.status === 'active' && allClosed ? (
                <Pressable style={styles.startButton} onPress={completeRun} disabled={busy === run.id}>
                  {busy === run.id ? <ActivityIndicator color={colors.white} /> : (
                    <><Ionicons name="checkmark-done" size={17} color={colors.white} /><Text style={styles.startButtonText}>Complete run</Text></>
                  )}
                </Pressable>
              ) : null}
            </View>

            {mappable.length > 0 ? (
              <RunMap
                height={280}
                focusStopId={nextStop?.stopId ?? null}
                stops={mappable.map((item, index) => ({
                  id: item.stopId,
                  latitude: Number(item.latitude),
                  longitude: Number(item.longitude),
                  title: `${index + 1}. ${item.receiverName || 'Delivery'}`,
                  description: item.address,
                  kind: 'delivery' as const,
                  order: index + 1,
                  done: item.stopStatus === 'completed' || item.stopStatus === 'failed',
                }))}
                onStopPress={(mapStop) => {
                  const match = items.find((item) => item.stopId === mapStop.id);
                  if (match) navigateTo(match);
                }}
              />
            ) : (
              <View style={styles.mapFallback}>
                {geocoding ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="map-outline" size={22} color={colors.primary} />}
                <Text style={styles.mapFallbackText}>
                  {geocoding ? 'Placing today’s drops on the map…'
                    : 'These delivery addresses could not be mapped. Use Navigate on each drop for directions.'}
                </Text>
              </View>
            )}

            <View>
              <Text style={styles.sectionLabel}>DROPS</Text>
              {items.map((item, index) => {
                const tone = stopTone(item.stopStatus);
                const blocked = item.verificationStatus !== 'verified';
                const action = item.stopStatus === 'planned' ? 'En route'
                  : item.stopStatus === 'en_route' ? 'Arrived'
                    : item.stopStatus === 'arrived' ? 'Complete delivery' : null;
                return (
                  <View key={item.stopId} style={styles.stopCard}>
                    <View style={styles.stopTop}>
                      <View style={styles.orderCircle}><Text style={styles.orderText}>{index + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopKind}>DELIVERY</Text>
                        <Text style={styles.stopName}>{item.receiverName || 'Recipient not named'}</Text>
                        <Text style={styles.stopRef}>{item.customerReference || item.trackingNumber || '—'}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.statusText, { color: tone.fg }]}>{tone.label}</Text>
                      </View>
                    </View>
                    <View style={styles.addressRow}>
                      <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.addressText}>{item.address || 'Address not recorded'}</Text>
                    </View>
                    {blocked ? (
                      <Text style={styles.blockedNote}>{verificationLabel(item.verificationStatus)} — this drop cannot be completed yet.</Text>
                    ) : null}
                    <View style={styles.actions}>
                      <Pressable style={styles.action} onPress={() => navigateTo(item)}>
                        <Ionicons name="navigate-outline" size={15} color={colors.primary} />
                        <Text style={styles.actionText}>Navigate</Text>
                      </Pressable>
                      {item.receiverPhone ? (
                        <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${item.receiverPhone.replace(/\s/g, '')}`)}>
                          <Ionicons name="call-outline" size={15} color={colors.primary} />
                          <Text style={styles.actionText}>Call</Text>
                        </Pressable>
                      ) : null}
                      {item.stopStatus !== 'completed' ? (
                        <Pressable style={styles.action} onPress={() => navigation.navigate('ReportIssue', {
                          stop: {
                            id: item.stopId, shipmentId: item.shipmentId, kind: 'delivery',
                            customerName: item.receiverName || 'Recipient',
                            trackingNumber: item.trackingNumber || item.customerReference || 'Delivery',
                          },
                        })}>
                          <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                          <Text style={[styles.actionText, { color: colors.danger }]}>Can’t deliver</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {action ? (
                      <Pressable
                        style={[styles.actionButton, (run?.status !== 'active' || blocked || busy === item.stopId) && styles.disabled]}
                        disabled={run?.status !== 'active' || blocked || busy === item.stopId}
                        onPress={() => item.stopStatus === 'arrived' ? openHandover(item) : transition(item, item.stopStatus === 'planned' ? 'en_route' : 'arrived')}>
                        {busy === item.stopId ? <ActivityIndicator color={colors.white} size="small" /> : (
                          <Text style={styles.actionButtonText}>{action}</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 88, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  greeting: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  driverName: { fontSize: 25, fontWeight: '800', color: colors.text, marginTop: 1 },
  sub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dutyCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...shadow },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dutyKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: colors.amber },
  dutyText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  dutyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dutyBig: { fontSize: 24, fontWeight: '800', color: colors.white },
  dutyButton: { marginTop: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' },
  dutyButtonText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  clockOutLight: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  clockOutLightText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.amberBorder, backgroundColor: colors.amberSoft },
  syncText: { flex: 1, fontSize: 12.5, color: colors.amber, fontWeight: '600' },
  errorCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.redSoft },
  errorText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 17 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 34, ...shadow },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center', marginTop: 5 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  gateCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  gateGood: { backgroundColor: colors.primarySoft, borderColor: '#a7f3d0' },
  gateWait: { backgroundColor: colors.amberSoft, borderColor: colors.amberBorder },
  gateBad: { backgroundColor: colors.redSoft, borderColor: '#fecaca' },
  gateTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  gateText: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 21, color: colors.text, fontWeight: '700', marginTop: 2 },
  routeName: { fontSize: 11, color: colors.textMuted, marginTop: 3, textTransform: 'capitalize' },
  progressPct: { fontSize: 26, fontWeight: '800', color: colors.primary },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#e6ebe8', overflow: 'hidden', marginVertical: spacing.sm },
  progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  statRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 19, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11 },
  secondaryText: { color: colors.primary, fontSize: 12.5, fontWeight: '800' },
  startButton: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12 },
  startButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  mapFallback: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#a7f3d0' },
  mapFallbackText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  stopCard: { backgroundColor: colors.surface, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.border, borderLeftColor: colors.orange, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  stopTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  orderCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text },
  orderText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  stopKind: { color: colors.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  stopName: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 1 },
  stopRef: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 1 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.sm },
  addressText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  blockedNote: { fontSize: 11, fontWeight: '700', color: colors.amber, marginTop: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 9 },
  actionText: { color: colors.primary, fontSize: 11.5, fontWeight: '700' },
  actionButton: { marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11 },
  actionButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
