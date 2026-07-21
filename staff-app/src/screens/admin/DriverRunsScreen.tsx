import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';
import { parseCollectionDate } from '../../lib/format';
import { Shipment, customerRef, pickupAddress, senderName } from '../../lib/shipment';
import { ScreenHeader, StatCard, Badge, BADGE, SectionLabel, Avatar, SkeletonList, ErrorState, EmptyState } from '../../components/adminui';
import RunMap, { RunMapStop, RunMapPolyline } from '../../components/RunMap';
import CalendarModal from '../../components/CalendarModal';
import type { RunsStackParams } from '../../navigation/types';

// Route-based dispatch board: bookings grouped by collection route for the
// selected day, one driver per route, live map of the day's stops.

type Props = NativeStackScreenProps<RunsStackParams, 'DriverRuns'>;

interface Driver {
  id: string; full_name: string | null; email?: string | null;
  driver_type?: 'pickup' | 'delivery' | 'both' | null; role?: string | null;
  is_admin?: boolean | null; on_leave?: boolean | null; staff_active?: boolean | null;
  vehicle_label?: string | null;
}
interface RunRow {
  id: string; driver_id: string; status: string; run_date: string;
  vehicle_label: string | null; route_name: string | null; run_type: 'pickup' | 'delivery';
  scheduled_start: string | null; started_at: string | null;
}
interface StopRow {
  id: string; run_id: string; shipment_id: string; status: string; stop_order: number;
  stop_type: string; latitude: number | null; longitude: number | null; address: string | null;
}
interface Attendance { driver_id: string; clocked_in_at: string; clocked_out_at: string | null; }
interface ScheduleRow { id: string; route: string; pickup_date: string; country?: string | null; }

interface RouteGroup {
  route: string; date: string; shipments: Shipment[]; run: RunRow | null;
  stopTotal: number; stopDone: number;
}

const RUN_COLORS = ['#009B68', '#1d4ed8', '#ea580c', '#7c3aed', '#0891b2', '#a16207'];

function todayIso(days = 0) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  if (iso === todayIso()) return 'Today';
  if (iso === todayIso(1)) return 'Tomorrow';
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
function runStatusBadge(status: string) {
  if (status === 'active') return { label: 'On Route', tone: BADGE.blue };
  if (status === 'completed') return { label: 'Completed', tone: BADGE.green };
  if (status === 'cancelled') return { label: 'Cancelled', tone: BADGE.red };
  return { label: 'Planned', tone: BADGE.orange };
}

export default function DriverRunsScreen({ navigation }: Props) {
  const { session, profile, dashboardRole } = useAuth();
  const [date, setDate] = useState(todayIso());
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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [driverResult, runResult, shipmentResult, scheduleResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,driver_type,role,is_admin,on_leave,staff_active,vehicle_label').or('role.eq.driver,role.eq.admin,role.eq.logistics,is_admin.eq.true').order('full_name'),
        supabase.from('driver_runs').select('id,driver_id,status,run_date,vehicle_label,route_name,run_type,scheduled_start,started_at').eq('run_date', date).order('created_at'),
        supabase.from('shipments').select('id,tracking_number,customer_reference,status,driver_status,collection_schedule_id,created_at,updated_at,metadata').is('deleted_at', null).not('status', 'in', '(Delivered,Cancelled)').order('created_at', { ascending: false }).limit(400),
        supabase.from('collection_schedules').select('id,route,pickup_date,country').limit(200),
        supabase.from('driver_attendance').select('driver_id,clocked_in_at,clocked_out_at').eq('work_date', date),
      ]);
      for (const result of [driverResult, runResult, shipmentResult, scheduleResult, attendanceResult]) {
        if ((result as any).error) throw (result as any).error;
      }
      const runRows = (runResult.data || []) as RunRow[];
      let stopRows: StopRow[] = [];
      if (runRows.length) {
        const { data: stopData, error: stopError } = await supabase
          .from('driver_run_stops')
          .select('id,run_id,shipment_id,status,stop_order,stop_type,latitude,longitude,address')
          .in('run_id', runRows.map((r) => r.id));
        if (stopError) throw stopError;
        stopRows = (stopData || []) as StopRow[];
      }
      const loadedDrivers = [...((driverResult.data as Driver[]) || [])];
      if (dashboardRole === 'admin' && session?.user.id && !loadedDrivers.some((d) => d.id === session.user.id)) {
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
  }, [dashboardRole, date, profile?.full_name, session?.user.email, session?.user.id]);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]));

  // Live board: refresh when drivers progress stops or dispatch changes runs.
  useEffect(() => {
    const channel = supabase.channel(`runs-board-${date}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_runs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_run_stops' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [date, load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);

  const groups = useMemo(() => {
    const bucket = new Map<string, RouteGroup>();
    for (const shipment of shipments) {
      const schedule = shipment.collection_schedule_id ? scheduleById.get(shipment.collection_schedule_id) : undefined;
      const route = schedule?.route || (shipment.metadata as any)?.collection?.route;
      if (!route || route === 'To be assigned') continue;
      const parsed = parseCollectionDate(schedule?.pickup_date || (shipment.metadata as any)?.collection?.date);
      if (!parsed) continue;
      const iso = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
      if (iso !== date) continue;
      const existing: RouteGroup = bucket.get(route) || { route, date, shipments: [], run: null, stopTotal: 0, stopDone: 0 };
      existing.shipments.push(shipment);
      bucket.set(route, existing);
    }
    for (const run of runs) {
      if (run.status === 'cancelled') continue;
      const route = run.route_name || 'Assigned route';
      const existing: RouteGroup = bucket.get(route) || { route, date, shipments: [], run: null, stopTotal: 0, stopDone: 0 };
      existing.run = run;
      const runStops = stops.filter((s) => s.run_id === run.id);
      existing.stopTotal = runStops.length;
      existing.stopDone = runStops.filter((s) => s.status === 'completed').length;
      bucket.set(route, existing);
    }
    return [...bucket.values()].sort((a, b) => a.route.localeCompare(b.route));
  }, [date, runs, scheduleById, shipments, stops]);

  const activeRuns = runs.filter((r) => r.status === 'active');
  const completedRuns = runs.filter((r) => r.status === 'completed');
  const availableDrivers = drivers.filter((d) =>
    (d.role === 'driver' || d.driver_type) && d.staff_active !== false && !d.on_leave
    && !runs.some((r) => r.driver_id === d.id && ['planned', 'active'].includes(r.status)));
  const unassignedRoutes = groups.filter((g) => !g.run);

  const mapStops: RunMapStop[] = useMemo(() => stops
    .filter((s) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)))
    .map((s) => {
      const runIndex = runs.findIndex((r) => r.id === s.run_id);
      const shipment = shipments.find((sh) => sh.id === s.shipment_id);
      return {
        id: s.id,
        latitude: Number(s.latitude), longitude: Number(s.longitude),
        title: `${s.stop_order}. ${shipment ? senderName(shipment) : 'Stop'}`,
        description: s.address || '',
        kind: (s.stop_type === 'delivery' ? 'delivery' : 'collection') as 'collection' | 'delivery',
        color: RUN_COLORS[Math.max(0, runIndex) % RUN_COLORS.length],
      };
    }), [runs, shipments, stops]);

  const polylines: RunMapPolyline[] = useMemo(() => runs.map((run, i) => ({
    id: run.id,
    color: RUN_COLORS[i % RUN_COLORS.length],
    coordinates: stops
      .filter((s) => s.run_id === run.id && Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)))
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) })),
  })).filter((line) => line.coordinates.length > 1), [runs, stops]);

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
    setBusyKey(`${group.route}`);
    setPickerFor(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('assign_route_run', {
        p_route: group.route, p_run_date: group.date, p_driver_id: driverId, p_run_type: runType,
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
    setBusyKey(`${group.route}`);
    setPickerFor(null);
    try {
      const { error: rpcError } = await supabase.rpc('reassign_run_driver', { p_run_id: group.run.id, p_driver_id: driverId });
      if (rpcError) throw rpcError;
      await supabase.rpc('assign_route_run', { p_route: group.route, p_run_date: group.date, p_driver_id: driverId, p_run_type: group.run.run_type });
      Alert.alert('Route reassigned', `${group.route} is now with ${driverName(driverId)}.`);
      await load();
    } catch (e: any) {
      Alert.alert('Could not reassign', e?.message || 'Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const estCompletion = (run: RunRow, stopTotal: number) => {
    const base = run.started_at ? new Date(run.started_at)
      : run.scheduled_start ? new Date(`${run.run_date}T${run.scheduled_start}`) : null;
    if (!base || !stopTotal) return null;
    return new Date(base.getTime() + stopTotal * 20 * 60_000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <ScreenHeader title="Driver Runs" subtitle="Route-based dispatch" onBell={() => (navigation as any).getParent()?.navigate('Home')} />

        {/* Date selector */}
        <View style={styles.dateRow}>
          {[todayIso(), todayIso(1), todayIso(2)].map((d) => (
            <Pressable key={d} style={[styles.dateChip, date === d && styles.dateChipActive]} onPress={() => setDate(d)}>
              <Text style={[styles.dateChipText, date === d && styles.dateChipTextActive]}>{dayLabel(d)}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.dateChip, styles.calendarChip, ![todayIso(), todayIso(1), todayIso(2)].includes(date) && styles.dateChipActive]} onPress={() => setCalendarOpen(true)}>
            <Ionicons name="calendar-outline" size={15} color={![todayIso(), todayIso(1), todayIso(2)].includes(date) ? colors.white : colors.text} />
            {![todayIso(), todayIso(1), todayIso(2)].includes(date) ? <Text style={[styles.dateChipText, styles.dateChipTextActive]}>{dayLabel(date)}</Text> : null}
          </Pressable>
        </View>

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading ? <SkeletonList rows={5} /> : (
          <>
            {/* Summary */}
            <View style={styles.statRow}>
              <StatCard label="Active runs" value={activeRuns.length} icon="navigate-outline" tone={colors.blue} toneSoft={colors.blueSoft} />
              <StatCard label="Available drivers" value={availableDrivers.length} icon="people-outline" />
            </View>
            <View style={styles.statRow}>
              <StatCard label="Completed" value={completedRuns.length} icon="checkmark-done-outline" />
              <StatCard label="Unassigned routes" value={unassignedRoutes.length} icon="alert-circle-outline" tone={colors.orange} toneSoft={colors.orangeSoft} />
            </View>

            {/* Map */}
            <SectionLabel text={`${dayLabel(date)}'s routes`} />
            <RunMap
              stops={mapStops}
              polylines={polylines}
              onStopPress={(stop) => {
                const row = stops.find((s) => s.id === stop.id);
                const run = runs.find((r) => r.id === row?.run_id);
                if (run) navigation.navigate('RunDetail', { runId: run.id });
              }}
            />

            {/* Runs */}
            <SectionLabel text="Runs" />
            {runs.filter((r) => r.status !== 'cancelled').length === 0 ? (
              <EmptyState icon="car-outline" title="No runs for this day" text="Assign a route below to create the first run." />
            ) : runs.filter((r) => r.status !== 'cancelled').map((run) => {
              const runStops = stops.filter((s) => s.run_id === run.id);
              const done = runStops.filter((s) => s.status === 'completed').length;
              const badge = runStatusBadge(run.status);
              const eta = estCompletion(run, runStops.length - done);
              return (
                <Pressable key={run.id} style={styles.runCard} onPress={() => navigation.navigate('RunDetail', { runId: run.id })}>
                  <Avatar name={driverName(run.driver_id)} size={42} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.runTop}>
                      <Text style={styles.runDriver}>{driverName(run.driver_id)}</Text>
                      <Badge text={badge.label} tone={badge.tone} />
                    </View>
                    <Text style={styles.runMeta}>{run.route_name || 'Route'} · {run.run_type === 'delivery' ? 'Delivery' : 'Pickup'} · {run.vehicle_label || 'No vehicle'}</Text>
                    <Text style={styles.runMeta}>
                      {runStops.length} stop{runStops.length === 1 ? '' : 's'} · {done} done · {runStops.length - done} remaining
                      {run.scheduled_start ? ` · starts ${String(run.scheduled_start).slice(0, 5)}` : ''}
                      {eta && run.status === 'active' ? ` · est. finish ${eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${runStops.length ? (done / runStops.length) * 100 : 0}%` }]} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
                </Pressable>
              );
            })}

            {/* Routes needing a driver */}
            <SectionLabel text="Routes for this day" />
            {groups.length === 0 ? (
              <EmptyState icon="calendar-clear-outline" title="No routes with bookings" text="Bookings matched to a collection route for this day will appear here." />
            ) : groups.map((group) => (
              <View key={group.route} style={[styles.routeCard, group.run && { borderColor: '#bfdbfe' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{group.route}</Text>
                  <Text style={styles.runMeta}>
                    {group.shipments.length} open booking{group.shipments.length === 1 ? '' : 's'}
                    {group.run ? ` · assigned to ${driverName(group.run.driver_id)} (${driverAttendance(group.run.driver_id)})` : ' · needs a driver'}
                  </Text>
                </View>
                <Pressable
                  style={[styles.assignButton, !group.run && { backgroundColor: colors.primary }, busyKey === group.route && { opacity: 0.5 }]}
                  disabled={busyKey === group.route}
                  onPress={() => { setPickerType(group.run?.run_type || 'pickup'); setPickerFor(group); }}>
                  <Text style={[styles.assignText, !group.run && { color: colors.white }]}>{group.run ? 'Reassign' : 'Assign'}</Text>
                  <Ionicons name="chevron-down" size={13} color={group.run ? colors.text : colors.white} />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <CalendarModal visible={calendarOpen} initial={date} onClose={() => setCalendarOpen(false)} onSelect={setDate} />

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
                .filter((d) => d.staff_active !== false && !d.on_leave)
                .filter((d) => !d.driver_type || d.driver_type === 'both' || d.driver_type === pickerType)
                .map((driver) => (
                  <Pressable key={driver.id} style={styles.driverRow}
                    onPress={() => pickerFor && (pickerFor.run ? reassign(pickerFor, driver.id) : assign(pickerFor, driver.id, pickerType))}>
                    <Avatar name={driver.full_name || driver.email} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverRowName}>{driver.full_name || driver.email || 'Driver'}</Text>
                      <Text style={styles.driverRowMeta}>{driver.driver_type || 'both'} · {driverAttendance(driver.id)}{driver.vehicle_label ? ` · ${driver.vehicle_label}` : ''}</Text>
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
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  dateChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8 },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  dateChipTextActive: { color: colors.white },
  calendarChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  runCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  runTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  runDriver: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  runMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  progressTrack: { height: 5, borderRadius: radius.pill, backgroundColor: '#EDF1F3', marginTop: 7, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: radius.pill, backgroundColor: colors.primary },
  routeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  routeName: { fontSize: 14, fontWeight: '800', color: colors.text },
  assignButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.surface },
  assignText: { fontSize: 12, fontWeight: '800', color: colors.text },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 12, color: colors.textMuted },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, backgroundColor: colors.bg },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  typeTextActive: { color: colors.white },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverRowName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  driverRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1, textTransform: 'capitalize' },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
