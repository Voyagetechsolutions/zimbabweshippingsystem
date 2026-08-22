import React, { useCallback, useMemo, useState } from 'react';
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
import { colors, radius, spacing, shadow } from '../theme';
import {
  Shipment, customerRef, senderName, senderPhone, pickupAddress,
  receiverName, receiverPhone, deliveryAddress,
} from '../lib/shipment';
import { greeting, money } from '../lib/format';
import { enqueue, flushQueue, isNetworkError, readQueue } from '../lib/offlineQueue';
import type { DriverStackParams, DriverStopKind } from '../navigation/types';

type Props = NativeStackScreenProps<DriverStackParams, 'TodayRun'>;
type StopStatus = 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';

interface DriverRun {
  id: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  run_date: string;
  vehicle_label: string | null;
  started_at: string | null;
  completed_at: string | null;
  route_name: string | null;
  run_type: 'pickup' | 'delivery';
}

interface Attendance { id: string; clocked_in_at: string; clocked_out_at: string | null; }

interface RunStop {
  id: string;
  run_id: string;
  shipment_id: string;
  stop_order: number;
  stop_type: DriverStopKind;
  status: StopStatus;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  en_route_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  qr_verified_at?: string | null;
  shipment: Shipment;
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function stopName(stop: RunStop) {
  return stop.stop_type === 'collection' ? senderName(stop.shipment) : receiverName(stop.shipment);
}

function stopPhone(stop: RunStop) {
  return stop.stop_type === 'collection' ? senderPhone(stop.shipment) : receiverPhone(stop.shipment);
}

function stopAddress(stop: RunStop) {
  return stop.address || (stop.stop_type === 'collection' ? pickupAddress(stop.shipment) : deliveryAddress(stop.shipment));
}

function stopItemCount(stop: RunStop) {
  const metadata = stop.shipment?.metadata || {};
  const details = metadata.shipmentDetails || metadata.shipment || {};
  const items = metadata.items || {};
  const candidates = [
    details.quantity, details.drums, details.drumQuantity, details.boxQuantity,
    items.quantity, items.drums, metadata.quantity,
  ];
  const count = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0);
  return count || 1;
}

function statusLabel(status: StopStatus, kind: DriverStopKind) {
  if (status === 'planned') return 'Ready';
  if (status === 'en_route') return 'En route';
  if (status === 'arrived') return 'Arrived';
  if (status === 'completed') return kind === 'collection' ? 'Collected' : 'Delivered';
  return 'Exception';
}

function statusColors(status: StopStatus) {
  if (status === 'completed') return { bg: '#d1fae5', fg: '#047857' };
  if (status === 'en_route') return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (status === 'arrived') return { bg: '#fef3c7', fg: '#b45309' };
  if (status === 'failed') return { bg: '#fee2e2', fg: '#b91c1c' };
  return { bg: '#f1f5f9', fg: '#475569' };
}

export default function DriverDashboardScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const [run, setRun] = useState<DriverRun | null>(null);
  const [stops, setStops] = useState<RunStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [checks, setChecks] = useState<Record<string, { qr: boolean; invoice: boolean; photos: number; total?: number; currency?: string }>>({});

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    try {
      // Replay any updates made while offline before fetching fresh state.
      const { remaining } = await flushQueue();
      setPendingSync(remaining);
      const attendanceResult = await supabase.from('driver_attendance').select('id,clocked_in_at,clocked_out_at').eq('driver_id', session.user.id).eq('work_date', todayIso()).maybeSingle();
      if (attendanceResult.error) throw attendanceResult.error;
      setAttendance((attendanceResult.data as Attendance | null) || null);
      const { data: runData, error: runError } = await supabase
        .from('driver_runs')
        .select('id,status,run_date,vehicle_label,started_at,completed_at,route_name,run_type')
        .eq('driver_id', session.user.id)
        .eq('run_date', todayIso())
        .in('status', ['planned', 'active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (runError) throw runError;
      const activeRun = (runData as DriverRun | null) || null;
      setRun(activeRun);
      if (!activeRun) {
        setStops([]);
        return;
      }

      const { data: stopData, error: stopError } = await supabase
        .from('driver_run_stops')
        .select('id,run_id,shipment_id,stop_order,stop_type,status,address,latitude,longitude,en_route_at,arrived_at,completed_at,qr_verified_at,shipment:shipments(*)')
        .eq('run_id', activeRun.id)
        .order('stop_order');
      if (stopError) throw stopError;
      const loadedStops = ((stopData as any[]) || []).map((item) => ({ ...item, shipment: item.shipment as Shipment })) as RunStop[];
      setStops(loadedStops);

      // Handover checklist per stop: QR verified / invoice raised / photo count.
      const stopIds = loadedStops.map((stop) => stop.id);
      if (stopIds.length) {
        const [invoiceResult, proofResult] = await Promise.all([
          supabase.from('driver_invoices').select('stop_id,total,currency').in('stop_id', stopIds),
          supabase.from('driver_proofs').select('stop_id').in('stop_id', stopIds),
        ]);
        const photoCounts: Record<string, number> = {};
        for (const proof of (proofResult.data || []) as any[]) {
          photoCounts[proof.stop_id] = (photoCounts[proof.stop_id] || 0) + 1;
        }
        const invoiceByStop: Record<string, { total: number; currency: string }> = {};
        for (const invoice of (invoiceResult.data || []) as any[]) {
          invoiceByStop[invoice.stop_id] = { total: Number(invoice.total) || 0, currency: invoice.currency || 'GBP' };
        }
        setChecks(Object.fromEntries(loadedStops.map((stop: any) => [stop.id, {
          qr: Boolean(stop.qr_verified_at),
          invoice: Boolean(invoiceByStop[stop.id]),
          photos: photoCounts[stop.id] || 0,
          total: invoiceByStop[stop.id]?.total,
          currency: invoiceByStop[stop.id]?.currency,
        }])));
      } else {
        setChecks({});
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load today’s run.');
      setRun(null);
      setStops([]);
    }
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { setLoading(true); await load(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const stats = useMemo(() => ({
    total: stops.length,
    completed: stops.filter((stop) => stop.status === 'completed').length,
    collections: stops.filter((stop) => stop.stop_type === 'collection').length,
    deliveries: stops.filter((stop) => stop.stop_type === 'delivery').length,
    items: stops.reduce((sum, stop) => sum + stopItemCount(stop), 0),
  }), [stops]);

  const mappableStops = useMemo(
    () => stops.filter((stop) => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude))),
    [stops],
  );

  const nextStop = stops.find((stop) => stop.status !== 'completed' && stop.status !== 'failed');

  const startRun = async () => {
    if (!run) return;
    if (!attendance || attendance.clocked_out_at) { Alert.alert('Clock in first', 'You must clock in before starting an assigned route.'); return; }
    setBusyId(run.id);
    try {
      const { error: updateError } = await supabase.rpc('start_driver_run', { p_run_id: run.id });
      if (updateError) throw updateError;
      setRun({ ...run, status: 'active', started_at: new Date().toISOString() });
    } catch (e: any) {
      Alert.alert('Could not start run', e?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const clock = async (action: 'in' | 'out') => {
    setBusyId(`clock-${action}`);
    try {
      const { data, error: clockError } = await supabase.rpc('clock_driver', { p_action: action, p_note: null });
      if (clockError) throw clockError;
      setAttendance(data as Attendance);
    } catch (e: any) { Alert.alert(`Could not clock ${action}`, e?.message || 'Please try again.'); }
    finally { setBusyId(null); }
  };

  const notifyCustomer = async (stop: RunStop, label: string) => {
    const phone = stopPhone(stop);
    if (!phone || phone === 'No Phone') return;
    try {
      await supabase.functions.invoke('notify-shipment-status', {
        body: { phone_number: phone, tracking_number: stop.shipment.tracking_number, status: label },
      });
    } catch {
      // Status changes must still succeed when the optional notification service is unavailable.
    }
  };

  const transition = async (stop: RunStop, next: 'en_route' | 'arrived') => {
    if (run?.status !== 'active') {
      Alert.alert('Start the run first', 'Tap Start run before changing a stop status.');
      return;
    }
    const label = next === 'en_route' ? 'Driver en route' : 'Driver arrived';
    Alert.alert(label, `${stopName(stop)} will be notified.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setBusyId(stop.id);
          try {
            const { error: rpcError } = await supabase.rpc('transition_driver_stop', {
              p_stop_id: stop.id,
              p_next_status: next,
            });
            if (rpcError) throw rpcError;
            await notifyCustomer(stop, label);
            setStops((current) => current.map((item) => item.id === stop.id ? { ...item, status: next } : item));
          } catch (e: any) {
            if (isNetworkError(e)) {
              // No signal: keep working — the update syncs when coverage returns.
              await enqueue({ fn: 'transition_driver_stop', args: { p_stop_id: stop.id, p_next_status: next }, stopId: stop.id });
              setStops((current) => current.map((item) => item.id === stop.id ? { ...item, status: next } : item));
              setPendingSync((count) => count + 1);
            } else {
              Alert.alert('Status update failed', e?.message || 'Please try again.');
            }
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const FAIL_REASONS: Array<{ key: string; label: string }> = [
    { key: 'not_home', label: 'Customer not home' },
    { key: 'goods_not_ready', label: 'Goods not ready' },
    { key: 'payment_issue', label: 'Payment issue' },
    { key: 'access_problem', label: 'Access problem' },
    { key: 'other', label: 'Other' },
  ];

  const failStop = (stop: RunStop) => {
    if (run?.status !== 'active') {
      Alert.alert('Start the run first', 'Tap Start run before recording an exception.');
      return;
    }
    Alert.alert('Can’t complete this stop?', 'Pick what happened — admin is notified immediately so it can be replanned.', [
      ...FAIL_REASONS.map((reason) => ({
        text: reason.label,
        onPress: async () => {
          setBusyId(stop.id);
          try {
            const { error: rpcError } = await supabase.rpc('fail_driver_stop', {
              p_stop_id: stop.id, p_reason: reason.key, p_note: null,
            });
            if (rpcError) throw rpcError;
            setStops((current) => current.map((item) => item.id === stop.id ? { ...item, status: 'failed' as StopStatus } : item));
          } catch (e: any) {
            if (isNetworkError(e)) {
              await enqueue({ fn: 'fail_driver_stop', args: { p_stop_id: stop.id, p_reason: reason.key, p_note: null }, stopId: stop.id });
              setStops((current) => current.map((item) => item.id === stop.id ? { ...item, status: 'failed' as StopStatus } : item));
              setPendingSync((count) => count + 1);
            } else {
              Alert.alert('Could not record the exception', e?.message || 'Please try again.');
            }
          } finally {
            setBusyId(null);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const allStopsClosed = stops.length > 0 && stops.every((stop) => stop.status === 'completed' || stop.status === 'failed');
  const cashTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const stop of stops) {
      const check = checks[stop.id];
      if (check?.invoice && check.total) totals[check.currency || 'GBP'] = (totals[check.currency || 'GBP'] || 0) + check.total;
    }
    return totals;
  }, [stops, checks]);

  const completeRun = async () => {
    if (!run) return;
    Alert.alert('Complete this run?', 'This locks today’s run and sends the summary to admin.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete run', onPress: async () => {
          setBusyId(run.id);
          try {
            const { error: rpcError } = await supabase.rpc('complete_driver_run', { p_run_id: run.id });
            if (rpcError) throw rpcError;
            setRun({ ...run, status: 'completed', completed_at: new Date().toISOString() });
          } catch (e: any) {
            Alert.alert('Could not complete run', e?.message || 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const navigateToStop = async (stop: RunStop) => {
    const destination = encodeURIComponent(stopAddress(stop));
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open maps', 'Check that a maps application or browser is available.');
    }
  };

  const callCustomer = async (stop: RunStop) => {
    const phone = stopPhone(stop);
    if (!phone || phone === 'No Phone') return;
    await Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const scanStop = (stop: RunStop) => {
    navigation.navigate('StopWorkflow', {
      stop: {
        id: stop.id,
        shipmentId: stop.shipment_id,
        kind: stop.stop_type,
        customerName: stopName(stop),
        trackingNumber: stop.shipment.tracking_number || customerRef(stop.shipment),
      },
    });
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.driverName}>{profile?.full_name || 'Driver'}</Text>
            <Text style={styles.sub}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => navigation.getParent<any>()?.navigate('More', { screen: 'Account' })}>
            <Ionicons name="person-outline" size={19} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* Duty hero — the driver's ON DUTY state is the anchor of the day. */}
        {!attendance ? (
          <View style={[styles.dutyCard, { backgroundColor: colors.surface }]}>
            <View style={styles.kickerRow}><Ionicons name="time-outline" size={15} color={colors.amber} /><Text style={styles.dutyKicker}>READY TO WORK</Text></View>
            <Text style={styles.dutyText}>Clock in to start your shift and unlock today’s route.</Text>
            <Pressable style={styles.dutyButton} onPress={() => clock('in')} disabled={busyId === 'clock-in'}>
              {busyId === 'clock-in' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.dutyButtonText}>Clock in</Text>}
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
                  {(() => { const ms = Date.now() - new Date(attendance.clocked_in_at).getTime(); const h = Math.floor(ms / 36e5); const m = Math.floor((ms % 36e5) / 6e4); return `${h}h ${m}m`; })()}
                </Text>
                <Text style={[styles.dutyText, { color: '#d1fae5' }]}>working</Text>
              </View>
              <Pressable style={styles.clockOutLight} onPress={() => clock('out')} disabled={busyId === 'clock-out'}>
                {busyId === 'clock-out' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.clockOutLightText}>Clock out</Text>}
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
            <Ionicons name="cloud-offline-outline" size={18} color="#b45309" />
            <Text style={styles.syncText}>{pendingSync} update{pendingSync > 1 ? 's' : ''} waiting for signal — they’ll sync automatically.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Run unavailable</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        ) : null}

        {!run ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bus-outline" size={46} color={colors.primary} />
            <Text style={styles.emptyTitle}>Enjoy your day!</Text>
            <Text style={styles.emptyText}>No deliveries have been assigned yet. We’ll show your route here the moment the dispatcher creates today’s run.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryLabel}>TODAY’S ROUTE</Text>
                  <Text style={styles.summaryValue}>{stats.completed} / {stats.total} stops</Text>
                  <Text style={styles.routeName}>{run.route_name || 'Route not named'} · {run.run_type === 'pickup' ? 'Pickup route' : 'Delivery route'}</Text>
                </View>
                <Text style={styles.progressPct}>{stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${stats.total ? Math.max(3, (stats.completed / stats.total) * 100) : 0}%` }]} />
              </View>
              <View style={styles.statRow}>
                <RunStat value={stats.collections} label="Collections" color={colors.primary} />
                <RunStat value={stats.deliveries} label="Deliveries" color={colors.orange} />
                <RunStat value={stats.items} label="Items" color={colors.blue} />
              </View>
              {run.vehicle_label ? <View style={styles.vehicleLine}><Ionicons name="car-outline" size={15} color={colors.textMuted} /><Text style={styles.vehicle}>{run.vehicle_label}</Text></View> : null}
              {run.status === 'planned' ? (
                <Pressable style={styles.startButton} onPress={startRun} disabled={busyId === run.id}>
                  {busyId === run.id ? <ActivityIndicator color={colors.white} /> : (
                    <><Ionicons name="play" size={17} color={colors.white} /><Text style={styles.startButtonText}>Start run</Text></>
                  )}
                </Pressable>
              ) : null}
              <Pressable style={styles.viewRunButton} onPress={() => navigation.getParent<any>()?.navigate('My Run')}>
                <Ionicons name="map-outline" size={17} color={colors.primary} />
                <Text style={styles.viewRunText}>View full run</Text>
              </Pressable>
            </View>

            {mappableStops.length > 0 ? (
              <RunMap
                stops={mappableStops.map((stop) => ({
                  id: stop.id,
                  latitude: Number(stop.latitude),
                  longitude: Number(stop.longitude),
                  title: `${stop.stop_order}. ${stopName(stop)}`,
                  description: stopAddress(stop),
                  kind: stop.stop_type,
                }))}
              />
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="map-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFallbackTitle}>Route navigation ready</Text>
                  <Text style={styles.mapFallbackText}>Coordinates have not been saved for these stops yet. Use Navigate to open each address in Google Maps.</Text>
                </View>
              </View>
            )}

            {run.status === 'active' && allStopsClosed ? (
              <View style={styles.endCard}>
                <Text style={styles.endTitle}>End of run</Text>
                <Text style={styles.endLine}>{stops.filter((s) => s.status === 'completed').length} completed · {stops.filter((s) => s.status === 'failed').length} exceptions</Text>
                {Object.entries(cashTotals).map(([currency, total]) => (
                  <Text key={currency} style={styles.endLine}>Invoiced {money(total, currency === 'EUR' ? '€' : '£')}</Text>
                ))}
                <Pressable style={[styles.startButton, busyId === run.id && styles.actionDisabled]} onPress={completeRun} disabled={busyId === run.id}>
                  {busyId === run.id ? <ActivityIndicator color={colors.white} /> : (
                    <><Ionicons name="checkmark-done" size={17} color={colors.white} /><Text style={styles.startButtonText}>Complete run</Text></>
                  )}
                </Pressable>
              </View>
            ) : null}

            {run.status === 'completed' ? (
              <View style={styles.endCard}>
                <Text style={styles.endTitle}>Run completed — great work!</Text>
                <Text style={styles.endLine}>{stops.filter((s) => s.status === 'completed').length} completed · {stops.filter((s) => s.status === 'failed').length} exceptions. Admin has the summary.</Text>
              </View>
            ) : null}

            {nextStop ? (
              <View>
                <Text style={styles.sectionTitle}>Next stop</Text>
                <StopCard
                  stop={nextStop}
                  busy={busyId === nextStop.id}
                  runActive={run.status === 'active'}
                  check={checks[nextStop.id]}
                  onTransition={transition}
                  onNavigate={navigateToStop}
                  onCall={callCustomer}
                  onScan={scanStop}
                  onFail={failStop}
                />
              </View>
            ) : null}

            <View>
              <Text style={styles.sectionTitle}>All stops</Text>
              {stops.length === 0 ? <Text style={styles.emptyText}>No stops have been added to this run.</Text> : null}
              {stops.map((stop) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  busy={busyId === stop.id}
                  runActive={run.status === 'active'}
                  check={checks[stop.id]}
                  onTransition={transition}
                  onNavigate={navigateToStop}
                  onCall={callCustomer}
                  onScan={scanStop}
                  onFail={failStop}
                  compact={nextStop?.id === stop.id}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RunStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ChecklistTick({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.tick}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={done ? colors.primary : colors.textFaint} />
      <Text style={[styles.tickText, done && { color: colors.primaryDark }]}>{label}</Text>
    </View>
  );
}

function StopCard({
  stop, busy, runActive, compact, check, onTransition, onNavigate, onCall, onScan, onFail,
}: {
  stop: RunStop;
  busy: boolean;
  runActive: boolean;
  compact?: boolean;
  check?: { qr: boolean; invoice: boolean; photos: number };
  onTransition: (stop: RunStop, next: 'en_route' | 'arrived') => void;
  onNavigate: (stop: RunStop) => void;
  onCall: (stop: RunStop) => void;
  onScan: (stop: RunStop) => void;
  onFail: (stop: RunStop) => void;
}) {
  if (compact) return null;
  const status = statusColors(stop.status);
  const nextAction = stop.status === 'planned' ? 'En route' : stop.status === 'en_route' ? 'Arrived' : stop.status === 'arrived' ? 'Complete handover' : null;
  return (
    <View style={[styles.stopCard, { borderLeftColor: stop.stop_type === 'collection' ? colors.primary : '#d97706' }]}>
      <View style={styles.stopTop}>
        <View style={styles.orderCircle}><Text style={styles.orderText}>{stop.stop_order}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stopKind}>{stop.stop_type === 'collection' ? 'COLLECTION' : 'DELIVERY'}</Text>
          <Text style={styles.stopName}>{stopName(stop)}</Text>
          <Text style={styles.stopRef}>{stop.shipment.tracking_number || customerRef(stop.shipment)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.fg }]}>{statusLabel(stop.status, stop.stop_type)}</Text>
        </View>
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <Text style={styles.addressText}>{stopAddress(stop)}</Text>
      </View>
      {check && stop.status !== 'planned' ? (
        <View style={styles.tickRow}>
          <ChecklistTick done={check.qr} label="QR signature" />
          <ChecklistTick done={check.invoice} label="Invoice" />
          <ChecklistTick done={check.photos > 0} label={check.photos > 0 ? `${check.photos} photo${check.photos > 1 ? 's' : ''}` : 'Photos'} />
        </View>
      ) : null}
      <View style={styles.secondaryActions}>
        <Pressable style={styles.secondaryButton} onPress={() => onNavigate(stop)}>
          <Ionicons name="navigate-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryText}>Navigate</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => onCall(stop)}>
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryText}>Call</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => {
          const phone = stopPhone(stop).replace(/[^\d+]/g, '').replace(/^00/, '+').replace('+', '');
          if (phone) Linking.openURL(`https://wa.me/${phone}`).catch(() => {});
        }}>
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={[styles.secondaryText, { color: '#128C7E' }]}>WhatsApp</Text>
        </Pressable>
        {stop.status !== 'completed' ? <Pressable style={styles.secondaryButton} onPress={() => onScan(stop)}>
          <Ionicons name="camera-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryText}>Evidence</Text>
        </Pressable> : null}
        {stop.status !== 'completed' && stop.status !== 'failed' ? (
          <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => onFail(stop)}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.secondaryText, { color: colors.danger }]}>Can’t complete</Text>
          </Pressable>
        ) : null}
      </View>
      {nextAction ? (
        <Pressable
          style={[styles.actionButton, (!runActive || busy) && styles.actionDisabled]}
          disabled={!runActive || busy}
          onPress={() => stop.status === 'arrived' ? onScan(stop) : onTransition(stop, stop.status === 'planned' ? 'en_route' : 'arrived')}
        >
          {busy ? <ActivityIndicator color={colors.white} size="small" /> : (
            <>
              <Ionicons name={stop.status === 'arrived' ? 'clipboard-outline' : stop.status === 'planned' ? 'car-outline' : 'location-outline'} size={17} color={colors.white} />
              <Text style={styles.actionText}>{nextAction}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  greeting: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  driverName: { fontSize: 25, fontWeight: '800', color: colors.text, marginTop: 1 },
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
  progressPct: { fontSize: 26, fontWeight: '800', color: colors.primary },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#e6ebe8', overflow: 'hidden', marginVertical: spacing.sm },
  progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  emptyEmoji: { fontSize: 44 },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  runPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  runPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  errorCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.amberBorder, backgroundColor: colors.amberSoft },
  syncText: { flex: 1, fontSize: 12.5, color: colors.amber, fontWeight: '600' },
  endCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  endTitle: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  endLine: { fontSize: 13, color: colors.text, marginTop: 3 },
  tickRow: { flexDirection: 'row', gap: spacing.md, marginTop: 2 },
  tick: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tickText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600' },
  errorTitle: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  errorText: { color: '#991b1b', fontSize: 12, marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: 40, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: spacing.sm },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 21, color: colors.text, fontWeight: '700', marginTop: 2 },
  vehicleLine: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  vehicle: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  statRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 19, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  startButton: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12 },
  startButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  mapCard: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  map: { height: 235 },
  mapLegend: { flexDirection: 'row', gap: spacing.lg, padding: spacing.sm, justifyContent: 'center' },
  legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  mapFallback: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#a7f3d0' },
  mapFallbackTitle: { color: colors.text, fontWeight: '700', fontSize: 13 },
  mapFallbackText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm },
  stopCard: { backgroundColor: colors.surface, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
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
  secondaryActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 9 },
  secondaryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  actionButton: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11 },
  actionDisabled: { opacity: 0.45 },
  actionText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  attendanceCard:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md},
  attendanceLabel:{fontSize:9,fontWeight:'800',letterSpacing:.5,color:colors.textFaint},attendanceValue:{fontSize:14,fontWeight:'700',color:colors.text,marginTop:2},
  clockIn:{backgroundColor:colors.primary,borderRadius:radius.sm,paddingHorizontal:16,paddingVertical:10},clockInText:{color:colors.white,fontWeight:'800',fontSize:12},
  clockOut:{borderWidth:1,borderColor:colors.danger,borderRadius:radius.sm,paddingHorizontal:16,paddingVertical:10},clockOutText:{color:colors.danger,fontWeight:'800',fontSize:12},
  routeName:{fontSize:11,color:colors.textMuted,marginTop:3,textTransform:'capitalize'},
  viewRunButton: { marginTop: spacing.sm, minHeight: 42, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  viewRunText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
});
