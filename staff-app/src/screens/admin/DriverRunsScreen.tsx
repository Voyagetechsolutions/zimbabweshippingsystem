import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';
import { parseCollectionDate } from '../../lib/format';
import { Shipment, customerRef, pickupAddress, senderName } from '../../lib/shipment';

// Route-based assignment: bookings are grouped by collection route and date,
// and one driver takes a whole route. Individual stops can still be removed
// from a run when replanning.

interface Driver {
  id: string;
  full_name: string | null;
  email?: string | null;
  driver_type?: 'pickup' | 'delivery' | 'both' | null;
  role?: string | null;
  is_admin?: boolean | null;
}
interface RunRow {
  id: string; driver_id: string; status: string; run_date: string;
  vehicle_label: string | null; route_name: string | null; run_type: 'pickup' | 'delivery';
}
interface StopRow { id: string; run_id: string; shipment_id: string; status: string; }
interface Attendance { driver_id: string; clocked_in_at: string; clocked_out_at: string | null; }
interface ScheduleRow { id: string; route: string; pickup_date: string; country?: string | null; }

interface RouteGroup {
  route: string;
  date: string; // ISO day
  shipments: Shipment[];
  run: RunRow | null;
  stopTotal: number;
  stopDone: number;
}

function todayIso(days = 0) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  if (iso === todayIso()) return 'Today';
  if (iso === todayIso(1)) return 'Tomorrow';
  if (iso === todayIso(2)) return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
  return iso;
}

export default function DriverRunsScreen() {
  const { session, profile, dashboardRole } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<RouteGroup | null>(null);
  const [pickerType, setPickerType] = useState<'pickup' | 'delivery'>('pickup');
  const [expanded, setExpanded] = useState<string | null>(null);

  const dates = useMemo(() => [todayIso(), todayIso(1), todayIso(2)], []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [driverResult, runResult, shipmentResult, scheduleResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,driver_type,role,is_admin').or('role.eq.driver,role.eq.admin,role.eq.logistics,is_admin.eq.true').order('full_name'),
        supabase.from('driver_runs').select('id,driver_id,status,run_date,vehicle_label,route_name,run_type').in('run_date', dates).order('created_at'),
        supabase.from('shipments').select('id,tracking_number,customer_reference,status,driver_status,collection_schedule_id,created_at,updated_at,metadata').is('deleted_at', null).not('status', 'in', '(Delivered,Cancelled)').order('created_at', { ascending: false }).limit(400),
        supabase.from('collection_schedules').select('id,route,pickup_date,country').limit(200),
        supabase.from('driver_attendance').select('driver_id,clocked_in_at,clocked_out_at').in('work_date', dates),
      ]);
      for (const result of [driverResult, runResult, shipmentResult, scheduleResult, attendanceResult]) {
        if ((result as any).error) throw (result as any).error;
      }
      const runRows = (runResult.data || []) as RunRow[];
      let stopRows: StopRow[] = [];
      if (runRows.length) {
        const { data: stopData, error: stopError } = await supabase.from('driver_run_stops').select('id,run_id,shipment_id,status').in('run_id', runRows.map((r) => r.id));
        if (stopError) throw stopError;
        stopRows = (stopData || []) as StopRow[];
      }

      const loadedDrivers = [...((driverResult.data as Driver[]) || [])];
      if (dashboardRole === 'admin' && session?.user.id && !loadedDrivers.some((driver) => driver.id === session.user.id)) {
        loadedDrivers.unshift({ id: session.user.id, full_name: profile?.full_name || null, email: session.user.email || null, driver_type: 'both', role: 'admin', is_admin: true });
      }
      setDrivers(loadedDrivers);
      setRuns(runRows);
      setStops(stopRows);
      setShipments((shipmentResult.data as Shipment[]) || []);
      setSchedules((scheduleResult.data as ScheduleRow[]) || []);
      setAttendance((attendanceResult.data as Attendance[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load driver runs.');
    }
  }, [dashboardRole, dates, profile?.full_name, session?.user.email, session?.user.id]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const scheduleById = useMemo(() => {
    const map = new Map<string, ScheduleRow>();
    for (const s of schedules) map.set(s.id, s);
    return map;
  }, [schedules]);

  // Group bookings by route + collection day for the next three days.
  const groupsByDate = useMemo(() => {
    const buckets = new Map<string, Map<string, RouteGroup>>();
    for (const date of dates) buckets.set(date, new Map());

    for (const shipment of shipments) {
      const schedule = shipment.collection_schedule_id ? scheduleById.get(shipment.collection_schedule_id) : undefined;
      const route = schedule?.route || (shipment.metadata as any)?.collection?.route;
      if (!route || route === 'To be assigned') continue;
      const rawDate = schedule?.pickup_date || (shipment.metadata as any)?.collection?.date;
      const parsed = parseCollectionDate(rawDate);
      if (!parsed) continue;
      const iso = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
      const bucket = buckets.get(iso);
      if (!bucket) continue;
      const existing: RouteGroup = bucket.get(route) || { route, date: iso, shipments: [], run: null, stopTotal: 0, stopDone: 0 };
      existing.shipments.push(shipment);
      bucket.set(route, existing);
    }

    // Attach runs (and run-only routes with no open shipments left).
    for (const run of runs) {
      const bucket = buckets.get(run.run_date);
      if (!bucket) continue;
      const route = run.route_name || 'Assigned route';
      const existing: RouteGroup = bucket.get(route) || { route, date: run.run_date, shipments: [], run: null, stopTotal: 0, stopDone: 0 };
      existing.run = run;
      const runStops = stops.filter((s) => s.run_id === run.id);
      existing.stopTotal = runStops.length;
      existing.stopDone = runStops.filter((s) => s.status === 'completed').length;
      bucket.set(route, existing);
    }

    return dates.map((date) => ({
      date,
      groups: [...(buckets.get(date)?.values() || [])].sort((a, b) => a.route.localeCompare(b.route)),
    }));
  }, [dates, runs, scheduleById, shipments, stops]);

  const driverName = (id: string | null | undefined) => {
    const d = drivers.find((x) => x.id === id);
    return d?.full_name || d?.email || 'Unknown driver';
  };
  const driverAttendance = (id: string) => {
    const row = attendance.find((a) => a.driver_id === id);
    if (!row) return 'Not clocked in';
    return row.clocked_out_at ? 'Clocked out' : 'Clocked in';
  };

  const assign = async (group: RouteGroup, driverId: string, runType: 'pickup' | 'delivery') => {
    setBusyKey(`${group.route}-${group.date}`);
    setPickerFor(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('assign_route_run', {
        p_route: group.route,
        p_run_date: group.date,
        p_driver_id: driverId,
        p_run_type: runType,
      });
      if (rpcError) throw rpcError;
      const result = data as any;
      Alert.alert('Route assigned', `${group.route} → ${driverName(driverId)}: ${result?.added ?? 0} stop(s) added${result?.alreadyAssigned ? `, ${result.alreadyAssigned} already on a run` : ''}.`);
      await load();
    } catch (e: any) {
      Alert.alert('Could not assign route', e?.message || 'Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const reassign = async (group: RouteGroup, driverId: string) => {
    if (!group.run) return;
    setBusyKey(`${group.route}-${group.date}`);
    setPickerFor(null);
    try {
      const { error: rpcError } = await supabase.rpc('reassign_run_driver', { p_run_id: group.run.id, p_driver_id: driverId });
      if (rpcError) throw rpcError;
      // Pick up any still-unassigned bookings on the route as well.
      await supabase.rpc('assign_route_run', { p_route: group.route, p_run_date: group.date, p_driver_id: driverId, p_run_type: group.run.run_type });
      Alert.alert('Route reassigned', `${group.route} is now with ${driverName(driverId)}.`);
      await load();
    } catch (e: any) {
      Alert.alert('Could not reassign', e?.message || 'Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const removeStop = (group: RouteGroup, shipment: Shipment) => {
    const stop = stops.find((s) => s.run_id === group.run?.id && s.shipment_id === shipment.id);
    if (!stop) { Alert.alert('Not on the run', 'This booking has not been added to the run yet.'); return; }
    Alert.alert('Remove stop', `Take ${senderName(shipment)} off ${group.route}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const { error: rpcError } = await supabase.rpc('remove_run_stop', { p_stop_id: stop.id });
          if (rpcError) Alert.alert('Could not remove stop', rpcError.message); else await load();
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <Text style={styles.title}>Driver runs</Text>
        <Text style={styles.subtitle}>Assign one driver to each collection route. Bookings are grouped automatically by route and day.</Text>

        {error ? (
          <View style={styles.errorCard}><Ionicons name="alert-circle-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        {groupsByDate.map(({ date, groups }) => (
          <View key={date} style={{ gap: spacing.sm }}>
            <View style={styles.dayHead}>
              <Text style={styles.dayTitle}>{dayLabel(date)}</Text>
              <Text style={styles.dayDate}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
            </View>

            {groups.length === 0 ? (
              <View style={styles.emptyCard}><Ionicons name="calendar-clear-outline" size={26} color={colors.textFaint} /><Text style={styles.emptyText}>No routes with bookings for this day.</Text></View>
            ) : groups.map((group) => {
              const key = `${group.route}-${group.date}`;
              const busy = busyKey === key;
              const run = group.run;
              const open = expanded === key;
              const remaining = run ? group.stopTotal - group.stopDone : group.shipments.length;
              return (
                <View key={key} style={[styles.routeCard, run && { borderColor: run.status === 'completed' ? colors.primary : '#93c5fd' }]}>
                  <View style={styles.routeTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeName}>{group.route}</Text>
                      <Text style={styles.routeMeta}>
                        {group.shipments.length} booking{group.shipments.length === 1 ? '' : 's'}
                        {run ? ` · ${group.stopTotal} stop${group.stopTotal === 1 ? '' : 's'}` : ''}
                        {' · '}{(run?.run_type || 'pickup') === 'pickup' ? 'Pickup' : 'Delivery'}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: run ? (run.status === 'active' ? '#dbeafe' : run.status === 'completed' ? '#d1fae5' : '#f1f5f9') : '#fef3c7' }]}>
                      <Text style={[styles.statusText, { color: run ? (run.status === 'active' ? '#1d4ed8' : run.status === 'completed' ? '#047857' : colors.textMuted) : '#b45309' }]}>
                        {run ? run.status : 'unassigned'}
                      </Text>
                    </View>
                  </View>

                  {run ? (
                    <View style={styles.assignedRow}>
                      <Ionicons name="person-circle-outline" size={19} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignedDriver}>{driverName(run.driver_id)}</Text>
                        <Text style={styles.assignedMeta}>{driverAttendance(run.driver_id)} · {run.vehicle_label || 'Vehicle not set'} · {group.stopDone}/{group.stopTotal} done, {remaining} remaining</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.assignButton, busy && styles.disabled]}
                      disabled={busy}
                      onPress={() => { setPickerType(run?.run_type || 'pickup'); setPickerFor(group); }}>
                      {busy ? <ActivityIndicator size="small" color={colors.white} /> : (
                        <>
                          <Text style={styles.assignText}>{run ? 'Reassign driver' : 'Assign driver'}</Text>
                          <Ionicons name="chevron-down" size={14} color={colors.white} />
                        </>
                      )}
                    </Pressable>
                    <Pressable style={styles.viewButton} onPress={() => setExpanded(open ? null : key)}>
                      <Text style={styles.viewText}>{open ? 'Hide shipments' : 'View shipments'}</Text>
                    </Pressable>
                  </View>

                  {open ? (
                    <View style={styles.shipmentList}>
                      {group.shipments.length === 0 ? <Text style={styles.emptyText}>All bookings on this route are on the run.</Text> : null}
                      {group.shipments.map((shipment) => (
                        <View key={shipment.id} style={styles.shipmentRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.shipmentRef}>{shipment.customer_reference || shipment.tracking_number || customerRef(shipment)}</Text>
                            <Text style={styles.shipmentCustomer}>{senderName(shipment)}</Text>
                            <Text style={styles.shipmentAddress} numberOfLines={2}>{pickupAddress(shipment)}</Text>
                          </View>
                          {run && stops.some((s) => s.run_id === run.id && s.shipment_id === shipment.id) ? (
                            <Pressable onPress={() => removeStop(group, shipment)} hitSlop={8}>
                              <Ionicons name="close-circle-outline" size={21} color={colors.danger} />
                            </Pressable>
                          ) : (
                            <Ionicons name="time-outline" size={19} color={colors.textFaint} />
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Driver dropdown */}
      <Modal visible={Boolean(pickerFor)} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalShade} onPress={() => setPickerFor(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{pickerFor?.run ? 'Reassign' : 'Assign'} {pickerFor?.route}</Text>
            <Text style={styles.modalSub}>{pickerFor ? dayLabel(pickerFor.date) : ''} · choose run type and driver</Text>
            <View style={styles.typeRow}>
              {(['pickup', 'delivery'] as const).map((type) => (
                <Pressable key={type} style={[styles.typeChip, pickerType === type && styles.typeChipActive]} onPress={() => setPickerType(type)}>
                  <Text style={[styles.typeText, pickerType === type && styles.typeTextActive]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {drivers
                .filter((d) => !d.driver_type || d.driver_type === 'both' || d.driver_type === pickerType)
                .map((driver) => (
                  <Pressable key={driver.id} style={styles.driverRow}
                    onPress={() => pickerFor && (pickerFor.run ? reassign(pickerFor, driver.id) : assign(pickerFor, driver.id, pickerType))}>
                    <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverRowName}>{driver.full_name || driver.email || 'Driver'}</Text>
                      <Text style={styles.driverRowMeta}>{driver.driver_type || 'both'} · {driverAttendance(driver.id)}</Text>
                    </View>
                    {pickerFor?.run?.driver_id === driver.id ? <Ionicons name="checkmark-circle" size={19} color={colors.primary} /> : <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setPickerFor(null)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  errorCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, backgroundColor: '#fff1f2', borderRadius: radius.md, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#991b1b', fontSize: 12, flex: 1 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
  dayTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  dayDate: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  routeCard: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeName: { fontSize: 15, fontWeight: '800', color: colors.text },
  routeMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm },
  assignedDriver: { fontSize: 13, fontWeight: '800', color: colors.text },
  assignedMeta: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  assignButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11 },
  assignText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  viewButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11 },
  viewText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  shipmentList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: spacing.sm },
  shipmentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shipmentRef: { fontSize: 12, color: colors.primary, fontWeight: '800' },
  shipmentCustomer: { fontSize: 13, color: colors.text, fontWeight: '700', marginTop: 1 },
  shipmentAddress: { fontSize: 11, color: colors.textMuted, lineHeight: 15, marginTop: 1 },
  emptyCard: { alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: 6 },
  emptyText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 12, color: colors.textMuted },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, backgroundColor: colors.bg },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  typeTextActive: { color: colors.white },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverRowName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  driverRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1, textTransform: 'capitalize' },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
