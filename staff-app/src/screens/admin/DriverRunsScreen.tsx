import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  id: string; full_name: string | null; email?: string | null; phone_number?: string | null;
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
interface ClaimRow { id: string; shipment_id: string; driver_id: string | null; stop_id: string | null; status: string; claimed_at: string | null; issue_reason: string | null; }
interface DriverLocationRow { driver_id: string; latitude: number; longitude: number; accuracy_m: number | null; recorded_at: string; status?: string | null; }
interface PresenceRow { driver_id: string; status: string | null; current_latitude: number | null; current_longitude: number | null; location_accuracy_m: number | null; last_location_update: string | null; last_seen: string | null; }

/**
 * One position per driver, newest wins.
 *
 * Two write paths report a driver's position: the older run screens call
 * update_driver_live_location, while the operations dashboard and background
 * tracking write driver_presence. A driver is invisible to dispatch if this
 * board reads only one of them, so both are merged here.
 */
function mergeDriverPositions(legacy: DriverLocationRow[], presence: PresenceRow[]): DriverLocationRow[] {
  const byDriver = new Map<string, DriverLocationRow>();
  const consider = (row: DriverLocationRow) => {
    if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) return;
    const existing = byDriver.get(row.driver_id);
    if (!existing || new Date(row.recorded_at).getTime() > new Date(existing.recorded_at).getTime()) byDriver.set(row.driver_id, row);
  };
  legacy.forEach(consider);
  for (const row of presence) {
    if (row.current_latitude == null || row.current_longitude == null) continue;
    consider({
      driver_id: row.driver_id,
      latitude: Number(row.current_latitude),
      longitude: Number(row.current_longitude),
      accuracy_m: row.location_accuracy_m,
      recorded_at: row.last_location_update || row.last_seen || new Date(0).toISOString(),
      status: row.status,
    });
  }
  return [...byDriver.values()];
}

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

function openDriverContact(kind: 'call' | 'whatsapp', phone: string | null | undefined) {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  if (!value || value.replace(/\D/g, '').length < 7) {
    Alert.alert('Contact unavailable', 'This driver has no valid phone number on their staff profile.');
    return;
  }
  const url = kind === 'call' ? `tel:${value}` : `https://wa.me/${value.replace(/\D/g, '')}`;
  void Linking.openURL(url).catch(() => Alert.alert(
    kind === 'call' ? 'Could not start call' : 'Could not open WhatsApp',
    kind === 'call' ? 'Check that your device supports phone calls.' : 'Check that WhatsApp is installed or try again in your browser.',
  ));
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
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [liveLocations, setLiveLocations] = useState<DriverLocationRow[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
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
      const [driverResult, runResult, shipmentResult, scheduleResult, attendanceResult, claimResult, locationResult, presenceResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,phone_number,driver_type,role,is_admin,on_leave,staff_active,vehicle_label').or('role.eq.driver,role.eq.admin,role.eq.logistics,is_admin.eq.true').order('full_name'),
        supabase.from('driver_runs').select('id,driver_id,status,run_date,vehicle_label,route_name,run_type,scheduled_start,started_at').eq('run_date', date).order('created_at'),
        supabase.from('shipments').select('id,tracking_number,customer_reference,status,driver_status,collection_status,collection_schedule_id,created_at,updated_at,metadata').is('deleted_at', null).not('status', 'in', '(Delivered,Cancelled)').order('created_at', { ascending: false }).limit(400),
        supabase.from('collection_schedules').select('id,route,pickup_date,country').limit(200),
        supabase.from('driver_attendance').select('driver_id,clocked_in_at,clocked_out_at').eq('work_date', date),
        supabase.from('route_collection_claims').select('id,shipment_id,driver_id,stop_id,status,claimed_at,issue_reason').eq('claim_date', date),
        supabase.from('driver_live_locations').select('driver_id,latitude,longitude,accuracy_m,recorded_at')
          .gte('recorded_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()),
        supabase.from('driver_presence')
          .select('driver_id,status,current_latitude,current_longitude,location_accuracy_m,last_location_update,last_seen')
          .neq('status', 'offline'),
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
        loadedDrivers.unshift({ id: session.user.id, full_name: profile?.full_name || null, email: session.user.email || null, phone_number: null, driver_type: 'both', role: 'admin', is_admin: true });
      }
      setDrivers(loadedDrivers);
      setRuns(runRows);
      setStops(stopRows);
      setShipments((shipmentResult.data as unknown as Shipment[]) || []);
      setSchedules((scheduleResult.data as ScheduleRow[]) || []);
      setAttendance((attendanceResult.data as Attendance[]) || []);
      setClaims(claimResult.error ? [] : ((claimResult.data as ClaimRow[]) || []));
      setLiveLocations(mergeDriverPositions(
        locationResult.error ? [] : ((locationResult.data as DriverLocationRow[]) || []),
        presenceResult.error ? [] : ((presenceResult.data as PresenceRow[]) || []),
      ));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_collection_claims' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_live_locations' }, () => load())
      .subscribe();
    // Separate channel: presence ships in a later migration than the rest of
    // this board, and a missing table would otherwise kill every subscription
    // above it.
    const presenceChannel = supabase.channel(`runs-presence-${date}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(presenceChannel); };
  }, [date, load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);

  const groups = useMemo(() => {
    const bucket = new Map<string, RouteGroup>();
    // A route runs on the day its SCHEDULE says, not the day each booking
    // happens to have stored. Most website bookings carry no collection date at
    // all (or "To be confirmed"), so keying off the shipment dropped every one
    // of them and the board read "No routes with bookings" while the drivers'
    // Collections screen listed them. This mirrors driver_route_collections.
    const routeKey = (name: unknown) =>
      String(name || '').toUpperCase().replace(/\s+ROUTE$/, '').trim();

    const routesToday = schedules.filter((s) => {
      const parsed = parseCollectionDate(s.pickup_date);
      if (!parsed) return false;
      const iso = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
      return iso === date;
    });
    const todayByKey = new Map(routesToday.map((s) => [routeKey(s.route), s]));

    for (const shipment of shipments) {
      const schedule = shipment.collection_schedule_id ? scheduleById.get(shipment.collection_schedule_id) : undefined;
      const rawRoute = schedule?.route || (shipment.metadata as any)?.collection?.route;
      if (!rawRoute || rawRoute === 'To be assigned') continue;

      // Linked schedule wins; otherwise match the route name against the routes
      // scheduled for this day, with and without the " ROUTE" suffix.
      // A booking that names this day is authoritative even when its schedule
      // row still carries an old pickup_date — schedule rows drift when a route
      // is re-run, and dispatch must not lose sight of live collections because
      // of it.
      const bookedThisDay = (() => {
        const raw = (shipment.metadata as any)?.collection?.date || (shipment.metadata as any)?.collectionDate;
        const parsed = parseCollectionDate(raw);
        if (!parsed) return false;
        return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 10) === date;
      })();
      const scheduledToday = schedule
        ? routesToday.some((s) => s.id === schedule.id)
        : todayByKey.has(routeKey(rawRoute));
      if (!scheduledToday && !bookedThisDay) continue;

      // Already-collected bookings are no longer work for this day.
      if ((shipment as any).collection_status === 'Collected') continue;

      const route = todayByKey.get(routeKey(rawRoute))?.route || rawRoute;
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
  }, [date, runs, scheduleById, schedules, shipments, stops]);

  const activeRuns = runs.filter((r) => r.status === 'active');
  const completedRuns = runs.filter((r) => r.status === 'completed');
  // "Available drivers" counts only real drivers (role = 'driver'), not admins
  // who happen to be able to drive — so it matches the Vehicles/Staff headcount.
  // Admins can still be assigned to runs; they're just not counted here.
  const availableDrivers = drivers.filter((d) =>
    d.role === 'driver' && d.staff_active !== false && !d.on_leave
    && !runs.some((r) => r.driver_id === d.id && ['planned', 'active'].includes(r.status)));
  const unassignedRoutes = groups.filter((g) => !g.run);
  const activeClaims = claims.filter((c) => ['claimed', 'en_route', 'arrived'].includes(c.status));
  const issueClaims = claims.filter((c) => c.status === 'failed');

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !session?.user.id) return;
    setSendingAnnouncement(true);
    const result = await supabase.from('staff_messages').insert({ sender_id: session.user.id, recipient_id: null, audience_role: 'driver', subject: 'Dispatch announcement', body: announcement.trim(), priority: 'normal' });
    setSendingAnnouncement(false);
    if (result.error) Alert.alert('Could not send announcement', /staff_messages/i.test(result.error.message || '') ? 'Messaging is waiting for the database migration.' : result.error.message);
    else { setAnnouncement(''); Alert.alert('Announcement sent', 'Every driver will see it in Messages.'); }
  };

  const mapStops: RunMapStop[] = useMemo(() => {
    const stopPins = stops
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
      });
    const driverPins: RunMapStop[] = liveLocations.map((location) => {
      const driver = drivers.find((row) => row.id === location.driver_id);
      const seen = new Date(location.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        id: `driver-${location.driver_id}`,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        title: driver?.full_name || driver?.email || 'Driver',
        description: `Driver position · last seen ${seen}${location.accuracy_m ? ` · ±${Math.round(location.accuracy_m)} m` : ''}`,
        kind: 'driver',
        color: '#2563eb',
        order: 'D',
      };
    });
    return [...stopPins, ...driverPins];
  }, [drivers, liveLocations, runs, shipments, stops]);

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

  /**
   * Who dispatch needs eyes on today.
   *
   * Role alone is too narrow: an admin or logistics account covering a route
   * still has to be visible on the board. Anyone with a run, a live position
   * or a clock-in for the day counts as on duty regardless of their role.
   */
  const onDutyToday = (driver: Driver) => String(driver.role || '').toLowerCase() === 'driver'
    || runs.some((run) => run.driver_id === driver.id)
    || liveLocations.some((row) => row.driver_id === driver.id)
    || attendance.some((row) => row.driver_id === driver.id);

  const estCompletion = (run: RunRow, stopTotal: number) => {
    const base = run.started_at ? new Date(run.started_at)
      : run.scheduled_start ? new Date(`${run.run_date}T${run.scheduled_start}`) : null;
    if (!base || !stopTotal) return null;
    return new Date(base.getTime() + stopTotal * 20 * 60_000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <ScreenHeader title="Dispatch control" subtitle="Live drivers, routes and completion" />

        {/* The usual way in: work a route's collections as one group rather
            than picking them out of a flat list of every open booking. */}
        <Pressable accessibilityRole="button" style={styles.buildRouteButton} onPress={() => navigation.navigate('CollectionGroups')}>
          <Ionicons name="albums-outline" size={19} color={colors.white} />
          <Text style={styles.buildRouteText}>COLLECTION GROUPS</Text>
        </Pressable>

        {/* Build a route by hand when the schedule has not matched one, or
            when dispatch wants to choose the stops and the customer windows. */}
        <Pressable accessibilityRole="button" style={[styles.buildRouteButton, styles.buildRouteSecondary]} onPress={() => navigation.navigate('BuildRoute', { date })}>
          <Ionicons name="add-circle-outline" size={19} color={colors.primaryDark} />
          <Text style={[styles.buildRouteText, { color: colors.primaryDark }]}>CREATE ROUTE BY HAND</Text>
        </Pressable>

        <View style={styles.announcementCard}>
          <View style={{ flex: 1 }}><Text style={styles.announcementTitle}>Message all drivers</Text><TextInput style={styles.announcementInput} value={announcement} onChangeText={setAnnouncement} placeholder="Route change, depot notice, urgent instruction…" placeholderTextColor={colors.textFaint} multiline maxLength={2000} /></View>
          <Pressable style={[styles.announcementButton, (!announcement.trim() || sendingAnnouncement) && { opacity: .5 }]} disabled={!announcement.trim() || sendingAnnouncement} onPress={sendAnnouncement}><Ionicons name="send" size={17} color={colors.white} /></Pressable>
        </View>

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
              <StatCard label="Active collections" value={activeClaims.length} icon="navigate-outline" tone={colors.blue} toneSoft={colors.blueSoft} />
              <StatCard label="Collection issues" value={issueClaims.length} icon="alert-circle-outline" tone={colors.orange} toneSoft={colors.orangeSoft} />
            </View>

            <SectionLabel text="Driver live status" />
            <View style={styles.driverStatusList}>{drivers.filter(onDutyToday).map(driver=>{const driverRuns=runs.filter(run=>run.driver_id===driver.id);const driverStops=stops.filter(stop=>driverRuns.some(run=>run.id===stop.run_id));const collections=driverStops.filter(stop=>stop.stop_type==='collection');const deliveries=driverStops.filter(stop=>stop.stop_type==='delivery');const location=liveLocations.find(row=>row.driver_id===driver.id);const working=driverRuns.some(run=>run.status==='active');return <View key={driver.id} style={styles.driverStatusRow}><Avatar name={driver.full_name||driver.email} size={38}/><View style={{flex:1}}><View style={styles.runTop}><Text style={styles.runDriver}>{driver.full_name||driver.email||'Driver'}</Text><Badge text={working?'On route':driverAttendance(driver.id)} tone={working?BADGE.blue:BADGE.grey}/></View><Text style={styles.runMeta}>{collections.filter(s=>s.status==='completed').length}/{collections.length} collections · {deliveries.filter(s=>s.status==='completed').length}/{deliveries.length} deliveries</Text><Text style={styles.runMeta}>{location?`${location.status?`${String(location.status).replace(/_/g,' ')} · `:''}${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)} · ${new Date(location.recorded_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'No live location today'}</Text></View><View style={styles.driverContactActions}><Pressable accessibilityLabel={`Call ${driver.full_name||'driver'}`} style={styles.driverContactButton} onPress={()=>openDriverContact('call',driver.phone_number)}><Ionicons name="call-outline" size={17} color={colors.primary}/></Pressable><Pressable accessibilityLabel={`WhatsApp ${driver.full_name||'driver'}`} style={styles.driverContactButton} onPress={()=>openDriverContact('whatsapp',driver.phone_number)}><Ionicons name="logo-whatsapp" size={17} color={colors.primary}/></Pressable></View></View>})}</View>

            {/* Map */}
            <SectionLabel text={`${dayLabel(date)}'s routes`} />
            <RunMap
              stops={mapStops}
              polylines={polylines}
              height={300}
              emptyNote="No stops or driver positions reported yet for this day."
              onStopPress={(stop) => {
                const destination = encodeURIComponent(`${stop.latitude},${stop.longitude}`);
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
                if (Platform.OS === 'web') { const opened = window.open(url, '_blank', 'noopener,noreferrer'); if (!opened) Alert.alert('Could not open navigation', 'Your browser blocked the maps window. Allow pop-ups and try again.'); }
                else void Linking.openURL(url).catch(() => Alert.alert('Could not open navigation', 'Check that a maps application or browser is available.'));
              }}
            />

            {/* Runs */}
            <SectionLabel text="Runs" />
            {runs.filter((r) => r.status !== 'cancelled').length === 0 ? (
              <EmptyState icon="car-outline" title="No runs for this day" text="Assign a route below to create the first run." />
            ) : runs.filter((r) => r.status !== 'cancelled').map((run) => {
              const runStops = stops.filter((s) => s.run_id === run.id);
              const done = runStops.filter((s) => s.status === 'completed').length;
              const collectionStops=runStops.filter(s=>s.stop_type==='collection');
              const deliveryStops=runStops.filter(s=>s.stop_type==='delivery');
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
                    <Text style={styles.runMeta}>{collectionStops.filter(s=>s.status==='completed').length}/{collectionStops.length} collections · {deliveryStops.filter(s=>s.status==='completed').length}/{deliveryStops.length} deliveries</Text>
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
  buildRouteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.primary, marginBottom: spacing.md },
  buildRouteText: { color: colors.white, fontWeight: '900', fontSize: 12.5, letterSpacing: 0.6 },
  buildRouteSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  announcementCard: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  announcementTitle: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 6 },
  announcementInput: { minHeight: 42, maxHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, color: colors.text, textAlignVertical: 'top' },
  announcementButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  dateChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8 },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  dateChipTextActive: { color: colors.white },
  calendarChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  driverStatusList:{gap:8},driverStatusRow:{flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},driverContactActions:{flexDirection:'row',gap:6},driverContactButton:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#B7E4D4'},
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
