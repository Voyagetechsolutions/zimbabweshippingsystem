import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RunMap from '../components/RunMap';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useViewRole } from '../context/ViewRoleContext';
import { todayLabel } from '../lib/format';
import { customerRef, deliveryAddress, pickupAddress, receiverName, receiverPhone, senderName, senderPhone, type Shipment } from '../lib/shipment';
import { colors, radius, shadow, spacing } from '../theme';
import { claimRouteCollection, loadRouteDay, releaseRouteCollection, sortByProximity, type RouteCollection, type RouteDay } from '../lib/collections';
import { getDriverLocation, describeLocationStatus, type Point } from '../lib/driverLocation';
import type { DriverRunStackParams, DriverStopKind } from '../navigation/types';
import { COMPANY, COMPANY_WHATSAPP_URL } from '../config/company';

// React Native bundles local images as numeric module references.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const deliveryVanImage = require('../../assets/driver/delivery-van.png');

type RunProps = NativeStackScreenProps<DriverRunStackParams, 'MyRun'>;
type StopStatus = 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';
type Run = { id: string; status: string; route_name: string | null; run_date: string; vehicle_label: string | null; run_type: DriverStopKind };
type Stop = { id: string; shipment_id: string; stop_order: number; stop_type: DriverStopKind; status: StopStatus; address: string | null; latitude: number | null; longitude: number | null; shipment: Shipment };

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Today's collection route, its map pins, and how many are left.
 *
 * Shared by the driver home screen and the Collections tab so the two can never
 * disagree about what the day looks like. Collected stops come off the
 * "left to collect" count.
 */
export function DriverCollectionsPanel({ compact = false }: { compact?: boolean }) {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const [day, setDay] = useState<RouteDay | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [note, setNote] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [routeDay, location] = await Promise.all([loadRouteDay(), getDriverLocation()]);
      setDay(routeDay);
      setPoint(location.point);
      setNote(describeLocationStatus(location.status));
      if (location.point) {
        // Store one replaceable point (not a location history) so dispatch can
        // see where the driver last opened the collections map.
        void supabase.rpc('update_driver_live_location', {
          p_latitude: location.point.latitude,
          p_longitude: location.point.longitude,
          p_accuracy_m: location.point.accuracyM ?? null,
        });
      }
    } catch (e: any) {
      // A failed load must never read as "no route today" — a driver would sit
      // still believing there was nothing to collect.
      setDay(null);
      setLoadError(e?.message || 'Could not load today’s collections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // This panel renders on both the Home screen and the Collections tab, so two
  // instances can be mounted at once. A channel name keyed only on the user id
  // is therefore not unique: supabase.channel() hands back the *existing*
  // channel, and postgres_changes handlers cannot be added to one that has
  // already subscribed — which threw
  // "cannot add postgres_changes callbacks ... after subscribe()".
  // The suffix makes each mount its own channel, matching how the admin screens
  // in this codebase already name theirs.
  const channelIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  useEffect(() => {
    const channel = supabase
      .channel(`driver-route-${session?.user.id || 'anonymous'}-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_collection_claims' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shipments' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  const stops = day ? sortByProximity(day.collections, point) : [];
  const collected = stops.filter((c) => c.collectionStatus === 'Collected').length;
  const remaining = stops.length - collected;
  const mappable = stops.filter((c) => c.latitude != null && c.longitude != null);
  const next = stops.find((c) => c.collectionStatus !== 'Collected') || null;

  const navigateTo = (c: typeof stops[number]) => {
    const destination = c.latitude != null && c.longitude != null
      ? `${c.latitude},${c.longitude}`
      : encodeURIComponent([c.address, c.city, c.postcode].filter(Boolean).join(', '));
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`).catch(() => {
      Alert.alert('Could not open maps', 'Check that a maps application or browser is available.');
    });
  };

  const openCollection = async (collection: RouteCollection) => {
    if (!session?.user.id) return;
    if (collection.claimedBy && collection.claimedBy !== session.user.id
      && ['claimed', 'en_route', 'arrived'].includes(collection.claimStatus)) {
      Alert.alert('Already claimed', `${collection.claimedByName || 'Another driver'} is already working this collection.`);
      return;
    }
    setClaimingId(collection.shipmentId);
    try {
      const result = collection.claimedBy === session.user.id && collection.stopId
        ? { stopId: collection.stopId }
        : await claimRouteCollection(collection.shipmentId);
      navigation.navigate('StopDetails', { stop: {
        id: result.stopId,
        shipmentId: collection.shipmentId,
        kind: 'collection',
        customerName: collection.customerName || 'Collection',
        trackingNumber: collection.trackingNumber || collection.customerReference || 'Collection',
      } });
      await load();
    } catch (e: any) {
      const setupMissing = e?.code === 'PGRST202' || /could not find the function/i.test(e?.message || '');
      Alert.alert(setupMissing ? 'Collection setup required' : 'Could not claim collection',
        setupMissing ? 'The new collection workflow has not been deployed to the database yet.' : (e?.message || 'Please refresh and try again.'));
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return <View style={styles.panelLoading}><ActivityIndicator color={colors.primary} /></View>;

  if (loadError) {
    return <View style={styles.panelError}>
      <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
      <Text style={styles.panelErrorTitle}>Couldn’t load today’s collections</Text>
      <Text style={styles.panelErrorText}>{loadError}</Text>
      <Pressable style={styles.outlineButton} onPress={() => { setLoading(true); load(); }}>
        <Ionicons name="refresh-outline" size={17} color={colors.primary} />
        <Text style={styles.outlineText}>Try again</Text>
      </Pressable>
    </View>;
  }

  if (!day?.routes?.length) {
    return <Empty icon="calendar-outline" title="No collection route today"
      text="No route is scheduled for today. Admin publishes routes from the collection schedule." />;
  }
  if (stops.length === 0) {
    return <Empty icon="checkmark-done-outline" title="Nothing to collect"
      text="Today’s route has no bookings awaiting collection." />;
  }

  return <View>
    <View style={styles.runHero}>
      <Text style={styles.heroDate}>{day.routes.map((r) => r.route).join(', ')}</Text>
      <View style={styles.runStats}>
        <HeroStat value={remaining} label="Left to collect" />
        <HeroStat value={collected} label="Collected" />
        <HeroStat value={stops.length} label="On route" />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${stops.length ? (collected / stops.length) * 100 : 0}%` }]} />
      </View>
      <Text style={styles.heroMeta}>
        {point ? 'Nearest collection first' : 'Distance sorting unavailable'}
        {mappable.length < stops.length ? ` · ${stops.length - mappable.length} without a map location` : ''}
      </Text>
    </View>

    {Boolean(note) && <Text style={styles.panelNote}>{note}</Text>}

    {mappable.length > 0 ? (
      <RunMap
        height={compact ? 240 : 300}
        focusStopId={next?.shipmentId ?? null}
        stops={[
          ...(point ? [{
            id: 'current-driver-location',
            latitude: point.latitude,
            longitude: point.longitude,
            title: 'You are here',
            description: point.accuracyM ? `Current position · accurate to about ${Math.round(point.accuracyM)} m` : 'Current position',
            kind: 'driver' as const,
            order: 'D',
          }] : []),
          ...mappable.map((c, i) => ({
          id: c.shipmentId,
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          title: `${i + 1}. ${c.customerName || 'Collection'}`,
          description: [c.address, c.city, c.postcode].filter(Boolean).join(', '),
          kind: 'collection' as const,
          order: i + 1,
          done: c.collectionStatus === 'Collected',
          })),
        ]}
        onStopPress={(s) => { const m = stops.find((c) => c.shipmentId === s.id); if (m) navigateTo(m); }}
      />
    ) : null}

    <View style={styles.listCard}>
      {stops.map((c, i) => {
        const done = c.collectionStatus === 'Collected';
        const mine = c.claimedBy === session?.user.id && ['claimed', 'en_route', 'arrived'].includes(c.claimStatus);
        const taken = Boolean(c.claimedBy && c.claimedBy !== session?.user.id && ['claimed', 'en_route', 'arrived'].includes(c.claimStatus));
        return <View key={c.shipmentId} style={styles.stopRow}>
          <View style={[styles.order, { backgroundColor: done ? colors.primarySoft : '#F2F4F7' }]}>
            <Text style={[styles.orderText, done && { color: colors.primaryDark }]}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stopName}>{c.customerName || 'Collection'}</Text>
            <Text style={styles.stopSub} numberOfLines={2}>
              {[c.address, c.city, c.postcode].filter(Boolean).join(', ') || 'Address not recorded'}
              {c.distanceKm != null
                ? ` · ${c.distanceKm < 1 ? `${Math.round(c.distanceKm * 1000)} m` : `${c.distanceKm.toFixed(1)} km`}`
                : ''}
            </Text>
            <Text style={[styles.claimLabel, mine && styles.claimMine, taken && styles.claimTaken]}>
              {mine ? `Your collection · ${c.claimStatus.replace('_', ' ')}` : taken ? `${c.claimedByName || 'Driver'} · ${c.claimStatus.replace('_', ' ')}` : 'Available'}
            </Text>
          </View>
          <Pressable style={styles.rowAction} onPress={() => navigateTo(c)} hitSlop={8}>
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
          </Pressable>
          {c.phone ? (
            <Pressable style={styles.rowAction} onPress={() => Linking.openURL(`tel:${String(c.phone).replace(/\s/g, '')}`)} hitSlop={8}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </Pressable>
          ) : null}
          {!done ? <Pressable style={[styles.claimButton, taken && styles.claimButtonDisabled]}
            onPress={() => openCollection(c)} disabled={taken || claimingId === c.shipmentId}>
            {claimingId === c.shipmentId ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.claimButtonText}>{mine ? 'Continue' : taken ? 'Claimed' : 'Claim'}</Text>}
          </Pressable> : null}
        </View>;
      })}
    </View>
  </View>;
}
function stopName(stop: Stop) { return stop.stop_type === 'collection' ? senderName(stop.shipment) : receiverName(stop.shipment); }
function stopAddress(stop: Stop) { return stop.address || (stop.stop_type === 'collection' ? pickupAddress(stop.shipment) : deliveryAddress(stop.shipment)); }
function statusTone(status: StopStatus) {
  if (status === 'completed') return { bg: colors.primarySoft, fg: colors.primaryDark };
  if (status === 'failed') return { bg: colors.redSoft, fg: colors.danger };
  if (status === 'en_route') return { bg: colors.blueSoft, fg: colors.blue };
  if (status === 'arrived') return { bg: colors.amberSoft, fg: colors.amber };
  return { bg: '#F2F4F7', fg: colors.textMuted };
}

export function DriverRunOverviewScreen({ navigation }: RunProps) {
  const { session } = useAuth();
  const [run, setRun] = useState<Run | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const runResult = await supabase.from('driver_runs').select('id,status,route_name,run_date,vehicle_label,run_type').eq('driver_id', session.user.id).eq('run_date', todayIso()).in('status', ['planned', 'active', 'completed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const active = runResult.data as Run | null;
    setRun(active);
    if (!active) { setStops([]); return; }
    const stopResult = await supabase.from('driver_run_stops').select('id,shipment_id,stop_order,stop_type,status,address,latitude,longitude,shipment:shipments(*)').eq('run_id', active.id).order('stop_order');
    setStops(((stopResult.data || []) as any[]).map((row) => ({ ...row, shipment: row.shipment as Shipment })) as Stop[]);
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { let mounted = true; (async () => { await load(); if (mounted) setLoading(false); })(); return () => { mounted = false; }; }, [load]));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const completed = stops.filter((stop) => stop.status === 'completed').length;
  const remaining = stops.filter((stop) => !['completed', 'failed'].includes(stop.status)).length;
  const mappable = stops.filter((stop) => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)));

  if (loading) return <Loading />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <Header title="Collections" subtitle={todayLabel()} />

        {/* Today's collection route and its pins — shown to any clocked-in
            driver, with no assignment needed. The assigned-run view below only
            appears when dispatch happened to build one. */}
        <DriverCollectionsPanel />

        {!run ? null : <>
          <View style={styles.runHero}>
            <Text style={styles.heroDate}>{run.route_name || 'Today’s route'}</Text>
            <View style={styles.runStats}>
              <HeroStat value={stops.length} label="Stops" />
              <HeroStat value={completed} label="Completed" />
              <HeroStat value={remaining} label="Remaining" />
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${stops.length ? (completed / stops.length) * 100 : 0}%` }]} /></View>
            <Text style={styles.heroMeta}>{run.vehicle_label || 'Vehicle not assigned'} · {run.status}</Text>
            <View style={styles.heroButtons}><Pressable style={styles.heroButton} onPress={() => navigation.navigate('RouteMap')}><Ionicons name="map-outline" size={16} color={colors.white} /><Text style={styles.heroButtonText}>View map</Text></Pressable><Pressable style={styles.heroButton} onPress={() => navigation.navigate('RunSummary')}><Ionicons name="analytics-outline" size={16} color={colors.white} /><Text style={styles.heroButtonText}>Summary</Text></Pressable></View>
          </View>

          {mappable.length ? <RunMap stops={mappable.map((stop) => ({ id: stop.id, latitude: Number(stop.latitude), longitude: Number(stop.longitude), title: `${stop.stop_order}. ${stopName(stop)}`, description: stopAddress(stop), kind: stop.stop_type }))} /> : null}

          <View style={styles.segment}><Text style={styles.segmentActive}>List</Text><Text style={styles.segmentText}>{mappable.length ? 'Map shown above' : 'Map unavailable'}</Text></View>
          <View style={styles.listCard}>
            {stops.map((stop) => {
              const tone = statusTone(stop.status);
              return <Pressable key={stop.id} style={styles.stopRow} onPress={() => navigation.navigate('StopDetails', { stop: { id: stop.id, shipmentId: stop.shipment_id, kind: stop.stop_type, customerName: stopName(stop), trackingNumber: stop.shipment.tracking_number || customerRef(stop.shipment) } })}>
                <View style={[styles.order, { backgroundColor: stop.status === 'completed' ? colors.primarySoft : '#F2F4F7' }]}><Text style={[styles.orderText, stop.status === 'completed' && { color: colors.primaryDark }]}>{stop.stop_order}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.stopName}>{stopName(stop)}</Text><Text style={styles.stopSub} numberOfLines={1}>{stop.stop_type === 'collection' ? 'Collection' : 'Delivery'} · {stopAddress(stop)}</Text></View>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}><Text style={[styles.statusText, { color: tone.fg }]}>{stop.status.replace('_', ' ')}</Text></View>
              </Pressable>;
            })}
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

export function DriverRouteMapScreen() {
  const { session } = useAuth(); const [stops, setStops] = useState<Stop[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { if (!session?.user.id) return; const runResult = await supabase.from('driver_runs').select('id').eq('driver_id', session.user.id).eq('run_date', todayIso()).limit(1).maybeSingle(); if (runResult.data) { const result = await supabase.from('driver_run_stops').select('id,shipment_id,stop_order,stop_type,status,address,latitude,longitude,shipment:shipments(*)').eq('run_id', runResult.data.id).order('stop_order'); setStops(((result.data || []) as any[]) as Stop[]); } setLoading(false); })(); }, [session?.user.id])); if (loading) return <Loading />;
  const mapped = stops.filter((stop) => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)));
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Route Map" subtitle={`${mapped.length} mapped stops`} />{mapped.length ? <RunMap stops={mapped.map((stop) => ({ id: stop.id, latitude: Number(stop.latitude), longitude: Number(stop.longitude), title: `${stop.stop_order}. ${stopName(stop)}`, description: stopAddress(stop), kind: stop.stop_type }))} /> : <Empty icon="map-outline" title="Map unavailable" text="Dispatch has not saved coordinates for this route. Use the address navigation buttons from stop details." />}{stops.map((stop) => <View key={stop.id} style={styles.stopRow}><View style={styles.order}><Text style={styles.orderText}>{stop.stop_order}</Text></View><View style={{ flex: 1 }}><Text style={styles.stopName}>{stopName(stop)}</Text><Text style={styles.stopSub}>{stopAddress(stop)}</Text></View></View>)}</ScrollView></SafeAreaView>;
}

export function DriverRunSummaryScreen() {
  const { session } = useAuth(); const [run, setRun] = useState<any>(null); const [stops, setStops] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { if (!session?.user.id) return; const r = await supabase.from('driver_runs').select('*').eq('driver_id', session.user.id).eq('run_date', todayIso()).limit(1).maybeSingle(); setRun(r.data); if (r.data) { const s = await supabase.from('driver_run_stops').select('id,status,stop_type,completed_at').eq('run_id', r.data.id); setStops(s.data || []); } setLoading(false); })(); }, [session?.user.id])); if (loading) return <Loading />;
  const completed = stops.filter((s) => s.status === 'completed').length; const failed = stops.filter((s) => s.status === 'failed').length;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Run Summary" subtitle={run?.route_name || todayLabel()} /><View style={styles.summarySuccess}><View style={styles.successCircle}><Ionicons name="checkmark" size={38} color={colors.white} /></View><Text style={styles.emptyTitle}>{run?.status === 'completed' ? 'Great job today!' : 'Run in progress'}</Text><Text style={styles.emptyText}>{completed} of {stops.length} stops completed</Text></View><View style={styles.metricGrid}><MetricBox value={stops.length} label="Total stops" /><MetricBox value={completed} label="Completed" /><MetricBox value={failed} label="Issues" /></View><View style={styles.listCard}><Period label="Collections" value={String(stops.filter((s) => s.stop_type === 'collection').length)} /><Period label="Deliveries" value={String(stops.filter((s) => s.stop_type === 'delivery').length)} /><Period label="Vehicle" value={run?.vehicle_label || '—'} /><Period label="Status" value={run?.status || '—'} /></View></ScrollView></SafeAreaView>;
}

export function DriverStopDetailsScreen({ route, navigation }: NativeStackScreenProps<DriverRunStackParams, 'StopDetails'>) {
  const { stop } = route.params; const [row, setRow] = useState<any>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const loadStop = useCallback(async () => { const result = await supabase.from('driver_run_stops').select('id,address,status,stop_type,shipment:shipments(*)').eq('id', stop.id).maybeSingle(); setRow(result.data); setLoading(false); }, [stop.id]);
  useFocusEffect(useCallback(() => { loadStop(); }, [loadStop]));
  if (loading) return <Loading />;
  const shipment = row?.shipment as Shipment | undefined; const phone = shipment ? (stop.kind === 'collection' ? senderPhone(shipment) : receiverPhone(shipment)) : ''; const address = row?.address || (shipment ? (stop.kind === 'collection' ? pickupAddress(shipment) : deliveryAddress(shipment)) : 'Address unavailable');
  const openMaps = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`);
  const advance = async () => {
    if (row?.status === 'arrived') { navigation.navigate('StopWorkflow', { stop }); return; }
    const nextStatus = row?.status === 'planned' ? 'en_route' : row?.status === 'en_route' ? 'arrived' : null;
    if (!nextStatus) return;
    setBusy(true);
    const result = await supabase.rpc('transition_driver_stop', { p_stop_id: stop.id, p_next_status: nextStatus });
    setBusy(false);
    if (result.error) Alert.alert('Could not update collection', result.error.message); else await loadStop();
  };
  const release = () => Alert.alert('Release this collection?', 'It will return to the available route so another driver can claim it.', [
    { text: 'Keep collection', style: 'cancel' },
    { text: 'Release', style: 'destructive', onPress: async () => { setBusy(true); try { await releaseRouteCollection(stop.shipmentId, 'Released by driver'); navigation.popToTop(); } catch (e: any) { Alert.alert('Could not release collection', e?.message || 'Please try again.'); } finally { setBusy(false); } } },
  ]);
  const actionLabel = row?.status === 'planned' ? 'Start journey' : row?.status === 'en_route' ? 'Mark arrived' : row?.status === 'arrived' ? (stop.kind === 'collection' ? 'Complete collection' : 'Complete delivery') : 'Completed';
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Stop Details" subtitle={`${stop.kind === 'collection' ? 'Collection' : 'Delivery'} · ${stop.trackingNumber}`} />
    <View style={styles.detailCard}><View style={styles.detailTop}><View><Text style={styles.detailKind}>{stop.kind.toUpperCase()} · {String(row?.status || 'planned').replace('_', ' ').toUpperCase()}</Text><Text style={styles.detailName}>{stop.customerName}</Text></View><View style={styles.contactRow}><Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`tel:${phone}`)}><Ionicons name="call-outline" size={20} color={colors.primary} /></Pressable><Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}><Ionicons name="logo-whatsapp" size={20} color={colors.primary} /></Pressable></View></View><View style={styles.detailDivider} /><Text style={styles.detailLabel}>ADDRESS</Text><Text style={styles.detailAddress}>{address}</Text><Pressable onPress={openMaps}><Text style={styles.mapLink}>View on map</Text></Pressable><View style={styles.detailDivider} /><Text style={styles.detailLabel}>REFERENCE</Text><Text style={styles.detailAddress}>{stop.trackingNumber}</Text></View>
    <Pressable style={[styles.primaryButton, (busy || row?.status === 'completed') && { opacity: .55 }]} onPress={advance} disabled={busy || row?.status === 'completed'}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{actionLabel}</Text>}</Pressable>
    {['planned', 'en_route'].includes(row?.status) ? <Pressable style={styles.outlineButton} onPress={release} disabled={busy}><Ionicons name="return-down-back-outline" size={18} color={colors.textMuted} /><Text style={[styles.outlineText, { color: colors.textMuted }]}>Release collection</Text></Pressable> : null}
    <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('ReportIssue', { stop })}><Ionicons name="warning-outline" size={18} color={colors.danger} /><Text style={[styles.outlineText, { color: colors.danger }]}>Report issue</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

export function DriverReportIssueScreen({ route, navigation }: NativeStackScreenProps<DriverRunStackParams, 'ReportIssue'>) {
  const { stop } = route.params; const [reason, setReason] = useState(''); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false);
  const reasons = [['not_home', 'Customer not available'], ['wrong_address', 'Wrong address'], ['access_problem', 'Access problem'], ['damaged_goods', 'Damaged goods'], ['vehicle_problem', 'Vehicle problem'], ['other', 'Other']];
  const submit = async () => { if (!reason) { Alert.alert('Choose an issue', 'Select what stopped you completing this stop.'); return; } setBusy(true); const result = await supabase.rpc('fail_driver_stop', { p_stop_id: stop.id, p_reason: reason, p_note: notes.trim() || null }); setBusy(false); if (result.error) Alert.alert('Report failed', result.error.message); else Alert.alert('Issue reported', 'Dispatch can now replan this stop.', [{ text: 'Done', onPress: () => navigation.popToTop() }]); };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets><Header title="Report Issue" subtitle={stop.customerName} /><Text style={styles.sectionTitle}>What’s the issue?</Text><View style={styles.listCard}>{reasons.map(([key, label]) => <Pressable key={key} style={styles.menuRow} onPress={() => setReason(key)}><Ionicons name={reason === key ? 'radio-button-on' : 'radio-button-off'} size={19} color={reason === key ? colors.primary : colors.textFaint} /><Text style={styles.menuLabel}>{label}</Text></Pressable>)}</View><Text style={styles.detailLabel}>ADDITIONAL NOTES</Text><TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Tell dispatch more…" placeholderTextColor={colors.textFaint} multiline maxLength={250} /><Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Submit report</Text>}</Pressable></ScrollView></SafeAreaView>;
}

// Friendly labels for raw shipment_event status codes. Anything already written
// as a human status (e.g. "Booking Confirmed") is kept as-is; unknown codes are
// title-cased so nothing renders as raw snake_case like "en_route".
const STATUS_LABELS: Record<string, string> = {
  en_route: 'En route', arrived: 'Arrived', planned: 'Planned',
  completed: 'Completed', failed: 'Failed', collected: 'Collected', pending: 'Pending',
};
function eventTitle(event: { new_status?: string | null; event_type?: string | null }): string {
  const s = event.new_status;
  if (s) {
    if (STATUS_LABELS[s]) return STATUS_LABELS[s];
    if (/[A-Z ]/.test(s)) return s; // already a human label
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const t = event.event_type;
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Update';
}

export function DriverMessagesScreen() {
  const { session } = useAuth(); const [events, setEvents] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [usingDispatch, setUsingDispatch] = useState(false);
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const messages = await supabase.from('staff_messages').select('id,subject,body,priority,created_at,sender_id,recipient_id,shipment_id,read_at').order('created_at', { ascending: false }).limit(50);
    if (!messages.error) {
      setUsingDispatch(true);
      setEvents((messages.data || []).map((message: any) => ({ ...message, _message: true })));
      const unread = (messages.data || []).filter((message: any) => message.recipient_id === session.user.id && !message.read_at).map((message: any) => message.id);
      if (unread.length) await supabase.from('staff_messages').update({ read_at: new Date().toISOString() }).in('id', unread);
      return;
    }
    const runs = await supabase.from('driver_runs').select('id').eq('driver_id', session.user.id).order('run_date', { ascending: false }).limit(5);
    const ids = (runs.data || []).map((row) => row.id); if (!ids.length) { setEvents([]); return; }
    const stops = await supabase.from('driver_run_stops').select('shipment_id').in('run_id', ids);
    const shipmentIds = [...new Set((stops.data || []).map((row) => row.shipment_id))]; if (!shipmentIds.length) { setEvents([]); return; }
    const result = await supabase.from('shipment_events').select('id,event_type,new_status,created_at,details,shipment_id').in('shipment_id', shipmentIds).order('created_at', { ascending: false }).limit(30);
    setEvents(result.data || []);
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { (async () => { await load(); setLoading(false); })(); }, [load]));
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase.channel(`driver-messages-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'staff_messages' }, () => load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);
  const send = async () => {
    if (!draft.trim() || !session?.user.id) return;
    setSending(true);
    const result = await supabase.from('staff_messages').insert({ sender_id: session.user.id, recipient_id: null, audience_role: 'dispatch', subject: 'Driver message', body: draft.trim(), priority: 'normal' });
    setSending(false);
    if (result.error) Alert.alert('Could not send message', /staff_messages/i.test(result.error.message || '') ? 'Messaging is waiting for the database update to be deployed.' : result.error.message);
    else { setDraft(''); await load(); }
  };
  if (loading) return <Loading />;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Messages" subtitle="Dispatch and shipment updates" />
    {usingDispatch ? <View style={styles.messageComposer}><TextInput style={styles.messageInput} value={draft} onChangeText={setDraft} placeholder="Message dispatch…" placeholderTextColor={colors.textFaint} multiline maxLength={2000} /><Pressable style={[styles.sendButton, (!draft.trim() || sending) && { opacity: .5 }]} onPress={send} disabled={!draft.trim() || sending}>{sending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}</Pressable></View> : null}
    {!events.length ? <Empty icon="chatbubble-ellipses-outline" title="No messages yet" text="Dispatch announcements and replies will appear here." /> : <View style={styles.listCard}>{events.map((event) => <View key={event.id} style={styles.messageRow}><View style={[styles.messageIcon, event.priority === 'urgent' && { backgroundColor: colors.redSoft }]}><Ionicons name={event._message ? 'chatbubble-ellipses-outline' : 'notifications-outline'} size={18} color={event.priority === 'urgent' ? colors.danger : colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.stopName}>{event._message ? (event.subject || (event.sender_id === session?.user.id ? 'You to dispatch' : 'Dispatch')) : eventTitle(event)}</Text><Text style={styles.stopSub}>{event._message ? event.body : (event.details?.message || 'Assigned shipment update')}</Text></View><Text style={styles.messageTime}>{new Date(event.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text></View>)}</View>}
  </ScrollView></SafeAreaView>;
}

/**
 * The driver's own record: who they are and the ID admin knows them by.
 *
 * The driver ID is the first eight characters of the profile id, which is
 * created when an admin invites the driver. That is the same identifier the
 * Staff Control Centre shows, so a driver reading it out over the phone and an
 * admin searching for it are talking about the same thing.
 */
export function DriverProfileScreen() {
  const { profile, session } = useAuth();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!session?.user.id) { setLoading(false); return; }
      const result = await supabase
        .from('profiles')
        .select('id,full_name,first_name,last_name,email,phone_number,role,driver_type,vehicle_label,on_leave,staff_active,created_at')
        .eq('id', session.user.id)
        .maybeSingle();
      setRecord(result.data);
      setLoading(false);
    })();
  }, [session?.user.id]));

  if (loading) return <Loading />;

  const source = record || profile || {};
  const parts = String(source.full_name || '').trim().split(/\s+/);
  const firstName = source.first_name || parts[0] || '—';
  const surname = source.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : '—');
  const driverId = session?.user.id ? session.user.id.slice(0, 8).toUpperCase() : '—';
  const joined = source.created_at ? new Date(source.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const status = source.staff_active === false ? 'Inactive' : source.on_leave ? 'On leave' : 'Active driver';

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <Header title="My Profile" subtitle="Your driver record" />
    <View style={styles.listCard}>
      <Period label="First name" value={firstName} />
      <Period label="Surname" value={surname} />
      <Period label="Driver ID" value={driverId} />
      <Period label="Status" value={status} />
    </View>
    <View style={styles.listCard}>
      <Period label="Email" value={source.email || session?.user.email || '—'} />
      <Period label="Phone" value={source.phone_number || '—'} />
      <Period label="Driver type" value={source.driver_type || 'Both pickups and deliveries'} />
      <Period label="Vehicle" value={source.vehicle_label || 'Not assigned'} />
      <Period label="Joined" value={joined} />
    </View>
    <Text style={styles.profileNote}>
      Your name, driver type and vehicle are maintained by admin in the Staff Control Centre. Contact
      dispatch if any of it is wrong.
    </Text>
  </ScrollView></SafeAreaView>;
}

export function DriverVehicleScreen() {
  const { session } = useAuth(); const [run, setRun] = useState<Run | null>(null); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { if (session?.user.id) { const result = await supabase.from('driver_runs').select('id,status,route_name,run_date,vehicle_label,run_type').eq('driver_id', session.user.id).order('run_date', { ascending: false }).limit(1).maybeSingle(); setRun(result.data as Run | null); } setLoading(false); })(); }, [session?.user.id]));
  if (loading) return <Loading />;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Vehicle" subtitle="Current assignment" /><View style={styles.vehicleCard}><Image source={deliveryVanImage} style={styles.vehicleImage} resizeMode="cover" /><View style={styles.vehicleHeading}><View style={{ flex: 1 }}><Text style={styles.vehicleName}>{run?.vehicle_label || 'No vehicle assigned'}</Text><Text style={styles.vehicleMeta}>{run ? `${run.route_name || 'Route'} · ${run.run_date}` : 'Contact dispatch for an assignment'}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{run?.status || 'unassigned'}</Text></View></View><View style={styles.vehicleFacts}><Period label="Assignment" value={run?.route_name || 'Not assigned'} /><Period label="Run type" value={run?.run_type || '—'} /><Period label="Run date" value={run?.run_date || '—'} /></View></View><Pressable style={styles.outlineButton} onPress={() => Linking.openURL(COMPANY_WHATSAPP_URL)}><Ionicons name="alert-circle-outline" size={18} color={colors.primary} /><Text style={styles.outlineText}>Report Vehicle Issue</Text></Pressable></ScrollView></SafeAreaView>;
}

export function DriverAccountScreen() {
  const { profile, session, signOut, canSwitchDashboards } = useAuth();
  const { clearRole } = useViewRole();
  const navigation = useNavigation<any>();
  const avatar = session?.user.user_metadata?.avatar_url;
  const initial = (profile?.full_name || session?.user.email || 'D').charAt(0).toUpperCase();
  const profileRecord = profile as any;
  const status = profileRecord?.staff_active === false ? 'Inactive' : profileRecord?.on_leave ? 'On leave' : 'Active driver';
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Account" subtitle="Driver profile" /><View style={styles.driverProfileCard}>{avatar ? <Image source={{ uri: avatar }} style={styles.driverAvatar} /> : <View style={styles.driverAvatarFallback}><Text style={styles.driverAvatarText}>{initial}</Text></View>}<View style={{ flex: 1 }}><Text style={styles.stopName}>{profile?.full_name || 'Driver'}</Text><Text style={styles.activeDriver}>{status}</Text><Text style={styles.stopSub}>{COMPANY.name} driver account</Text></View></View><View style={styles.listCard}><MenuLink icon="person-outline" label="My Profile" onPress={() => navigation.navigate('Profile')} /><MenuLink icon="car-outline" label="Vehicle" onPress={() => navigation.navigate('Vehicle')} /><MenuLink icon="stats-chart-outline" label="Performance" onPress={() => navigation.navigate('Performance')} /><MenuLink icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} /><MenuLink icon="help-circle-outline" label="Help & Support" onPress={() => Linking.openURL(COMPANY_WHATSAPP_URL)} /></View>{canSwitchDashboards ? <Pressable style={styles.switchDashboard} onPress={clearRole}><Ionicons name="swap-horizontal-outline" size={19} color={colors.primary} /><Text style={styles.switchDashboardText}>Switch Dashboard</Text><Ionicons name="chevron-forward" size={17} color={colors.primary} /></Pressable> : null}<Pressable style={styles.logoutButton} onPress={signOut}><Ionicons name="log-out-outline" size={18} color={colors.danger} /><Text style={styles.logoutText}>Logout</Text></Pressable></ScrollView></SafeAreaView>;
}

// DriverDocumentsScreen was removed. It listed three hardcoded rows ("Verified",
// "Managed by dispatch") with no records behind them, so it told the driver
// nothing true.

export function DriverPerformanceScreen() {
  const { session } = useAuth(); const [summary, setSummary] = useState<any>(null); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => {
    if (!session?.user.id) { setLoading(false); return; }
    const result = await supabase.rpc('driver_performance_summary', { p_driver_id: null, p_days: 30 });
    if (!result.error) setSummary(result.data);
    else {
      const runs = await supabase.from('driver_runs').select('id').eq('driver_id', session.user.id);
      const ids = (runs.data || []).map((row) => row.id);
      const stops = ids.length ? await supabase.from('driver_run_stops').select('status').in('run_id', ids) : { data: [] as any[] };
      const rows = stops.data || []; const completed = rows.filter((row: any) => row.status === 'completed').length; const closed = rows.filter((row: any) => ['completed', 'failed'].includes(row.status)).length;
      setSummary({ claimed: rows.length, completed, issues: rows.filter((row: any) => row.status === 'failed').length, active: rows.filter((row: any) => ['planned', 'en_route', 'arrived'].includes(row.status)).length, successRate: closed ? Math.round(completed / closed * 100) : 0, averageMinutes: 0, daysWorked: 0 });
    }
    setLoading(false);
  })(); }, [session?.user.id]));
  if (loading) return <Loading />; const data = summary || {};
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Performance" subtitle="Last 30 days" /><View style={styles.metricGrid}><MetricBox value={Number(data.completed || 0)} label="Collections" /><MetricBox value={Number(data.successRate || 0)} label="Success %" /><MetricBox value={Number(data.daysWorked || 0)} label="Days worked" /></View><View style={styles.listCard}><Period label="Collections claimed" value={String(data.claimed || 0)} /><Period label="Currently active" value={String(data.active || 0)} /><Period label="Issues reported" value={String(data.issues || 0)} /><Period label="Average collection time" value={Number(data.averageMinutes || 0) ? `${data.averageMinutes} min` : '—'} /></View><Text style={styles.profileNote}>Performance is calculated from the same collection activity visible to dispatch, so driver and admin totals stay aligned.</Text></ScrollView></SafeAreaView>;
}

export function DriverSettingsScreen() {
  const [notifications, setNotifications] = useState(true); const [routeAlerts, setRouteAlerts] = useState(true);
  useFocusEffect(useCallback(() => { AsyncStorage.multiGet(['driver_notifications', 'driver_route_alerts']).then((values) => { if (values[0][1] !== null) setNotifications(values[0][1] === 'true'); if (values[1][1] !== null) setRouteAlerts(values[1][1] === 'true'); }); }, []));
  const update = (key: string, value: boolean, setter: (v: boolean) => void) => { setter(value); AsyncStorage.setItem(key, String(value)); };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Settings" subtitle="Driver preferences" /><View style={styles.listCard}><Setting label="Notifications" value={notifications} onChange={(v) => update('driver_notifications', v, setNotifications)} /><Setting label="Route alerts" value={routeAlerts} onChange={(v) => update('driver_route_alerts', v, setRouteAlerts)} /></View><View style={styles.listCard}><View style={styles.menuRow}><Ionicons name="language-outline" size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>Language</Text><Text style={styles.stopSub}>English</Text></View><View style={styles.menuRow}><Ionicons name="information-circle-outline" size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>About</Text><Text style={styles.stopSub}>Zimbabwe Shipping</Text></View></View></ScrollView></SafeAreaView>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) { const navigation = useNavigation<any>(); return <View>{navigation.canGoBack() ? <Pressable style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={21} color={colors.text} /></Pressable> : null}<Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>; }
function MenuLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <Pressable style={styles.menuRow} onPress={onPress}><Ionicons name={icon} size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>{label}</Text><Ionicons name="chevron-forward" size={17} color={colors.textFaint} /></Pressable>; }
function Loading() { return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>; }
function HeroStat({ value, label }: { value: number; label: string }) { return <View style={{ flex: 1 }}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>; }
function Period({ label, value }: { label: string; value: string }) { return <View style={styles.periodRow}><Text style={styles.periodLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
function MetricBox({ value, label }: { value: number; label: string }) { return <View style={styles.metricBox}><Text style={styles.metricBoxValue}>{value}</Text><Text style={styles.metricBoxLabel}>{label}</Text></View>; }
function Setting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.menuRow}><Text style={styles.menuLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primarySoft }} thumbColor={value ? colors.primary : '#D0D5DD'} /></View>; }
function Empty({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) { return <View style={styles.empty}><Ionicons name={icon} size={38} color={colors.primary} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 88 },
  backButton: { width: 36, height: 34, justifyContent: 'center', marginBottom: 3 }, title: { fontSize: 25, fontWeight: '800', color: colors.text }, subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 }, sectionTitle: { fontSize: 12, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .6 },
  runHero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, heroDate: { color: '#D1FAE5', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, runStats: { flexDirection: 'row', marginTop: spacing.md }, heroStatValue: { color: colors.white, fontSize: 24, fontWeight: '800' }, heroStatLabel: { color: '#D1FAE5', fontSize: 10.5, marginTop: 2 }, heroMeta: { color: '#D1FAE5', fontSize: 11.5, marginTop: spacing.sm, textTransform: 'capitalize' },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,.25)', marginTop: spacing.md, overflow: 'hidden' }, progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.white },
  heroButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, heroButton: { flex: 1, minHeight: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,.55)', borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, heroButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  segment: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4 }, segmentActive: { color: colors.primary, fontWeight: '800', fontSize: 13, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 9 }, segmentText: { color: colors.textMuted, fontSize: 11, paddingTop: 2 },
  panelLoading: { paddingVertical: spacing.xl, alignItems: 'center' },
  panelError: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  panelErrorTitle: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  panelErrorText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  panelNote: { fontSize: 11.5, color: colors.amber, marginBottom: spacing.sm, lineHeight: 16 },
  profileNote: { fontSize: 11.5, color: colors.textMuted, lineHeight: 17, marginTop: spacing.md },
  rowAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  claimLabel: { marginTop: 4, fontSize: 10, fontWeight: '800', color: colors.primary },
  claimMine: { color: colors.blue },
  claimTaken: { color: colors.amber },
  claimButton: { minWidth: 62, minHeight: 34, paddingHorizontal: 9, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  claimButtonDisabled: { backgroundColor: colors.textFaint },
  claimButtonText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadow }, stopRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, order: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, orderText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' }, stopName: { fontSize: 13.5, fontWeight: '800', color: colors.text }, stopSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 }, statusPill: { alignSelf: 'center', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primarySoft }, statusText: { fontSize: 9.5, color: colors.primaryDark, fontWeight: '800', textTransform: 'capitalize' },
  earningsHero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 112, justifyContent: 'center', ...shadow }, earningsValue: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 6 }, periodCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, ...shadow }, periodRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, periodLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' }, rowValue: { fontSize: 13.5, fontWeight: '800', color: colors.text }, summaryIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  messageRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, messageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, messageTime: { fontSize: 10.5, color: colors.textFaint },
  messageComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  messageInput: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, textAlignVertical: 'top' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  menuRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, menuLabel: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: '700' },
  vehicleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, vehicleImage: { width: '100%', height: 168, borderRadius: radius.md, backgroundColor: '#F4F2EF' }, vehicleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md }, vehicleName: { fontSize: 19, fontWeight: '800', color: colors.text }, vehicleMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 }, vehicleFacts: { marginTop: spacing.sm }, outlineButton: { minHeight: 48, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, outlineText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  driverProfileCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, driverAvatar: { width: 56, height: 56, borderRadius: 28 }, driverAvatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, driverAvatarText: { color: colors.white, fontSize: 21, fontWeight: '800' }, activeDriver: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 3 }, switchDashboard: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm }, switchDashboardText: { flex: 1, color: colors.primary, fontWeight: '800', fontSize: 13 }, logoutButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm }, logoutText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  detailCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, detailKind: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: .6 }, detailName: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 4 }, contactRow: { flexDirection: 'row', gap: spacing.sm }, contactButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, detailDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }, detailLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: .6 }, detailAddress: { fontSize: 14, color: colors.text, fontWeight: '700', lineHeight: 20, marginTop: 5 }, mapLink: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: spacing.sm }, primaryButton: { minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' }, notesInput: { minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  summarySuccess: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow }, successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }, metricGrid: { flexDirection: 'row', gap: spacing.sm }, metricBox: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow }, metricBoxValue: { fontSize: 23, fontWeight: '800', color: colors.text }, metricBoxLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 38, ...shadow }, emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.md }, emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center', marginTop: 5 },
});
