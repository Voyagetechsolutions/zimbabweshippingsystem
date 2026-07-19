import React, { useCallback, useState } from 'react';
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
import type { DriverMoreStackParams, DriverRunStackParams, DriverStopKind } from '../navigation/types';

type RunProps = NativeStackScreenProps<DriverRunStackParams, 'MyRun'>;
type StopStatus = 'planned' | 'en_route' | 'arrived' | 'completed' | 'failed';
type Run = { id: string; status: string; route_name: string | null; run_date: string; vehicle_label: string | null; run_type: DriverStopKind };
type Stop = { id: string; shipment_id: string; stop_order: number; stop_type: DriverStopKind; status: StopStatus; address: string | null; latitude: number | null; longitude: number | null; shipment: Shipment };

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
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
        <Header title="My Run" subtitle={todayLabel()} />
        {!run ? <Empty icon="calendar-outline" title="No run assigned" text="Your route will appear here when dispatch assigns it." /> : <>
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
  const { stop } = route.params; const [row, setRow] = useState<any>(null); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { const result = await supabase.from('driver_run_stops').select('id,address,status,stop_type,shipment:shipments(*)').eq('id', stop.id).maybeSingle(); setRow(result.data); setLoading(false); })(); }, [stop.id]));
  if (loading) return <Loading />;
  const shipment = row?.shipment as Shipment | undefined; const phone = shipment ? (stop.kind === 'collection' ? senderPhone(shipment) : receiverPhone(shipment)) : ''; const address = row?.address || (shipment ? (stop.kind === 'collection' ? pickupAddress(shipment) : deliveryAddress(shipment)) : 'Address unavailable');
  const openMaps = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`);
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Stop Details" subtitle={`${stop.kind === 'collection' ? 'Collection' : 'Delivery'} · ${stop.trackingNumber}`} />
    <View style={styles.detailCard}><View style={styles.detailTop}><View><Text style={styles.detailKind}>{stop.kind.toUpperCase()}</Text><Text style={styles.detailName}>{stop.customerName}</Text></View><View style={styles.contactRow}><Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`tel:${phone}`)}><Ionicons name="call-outline" size={20} color={colors.primary} /></Pressable><Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}><Ionicons name="logo-whatsapp" size={20} color={colors.primary} /></Pressable></View></View><View style={styles.detailDivider} /><Text style={styles.detailLabel}>ADDRESS</Text><Text style={styles.detailAddress}>{address}</Text><Pressable onPress={openMaps}><Text style={styles.mapLink}>View on map</Text></Pressable><View style={styles.detailDivider} /><Text style={styles.detailLabel}>REFERENCE</Text><Text style={styles.detailAddress}>{stop.trackingNumber}</Text></View>
    <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('StopWorkflow', { stop })}><Text style={styles.primaryText}>{stop.kind === 'collection' ? 'Complete collection' : 'Complete delivery'}</Text></Pressable>
    <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('ReportIssue', { stop })}><Ionicons name="warning-outline" size={18} color={colors.danger} /><Text style={[styles.outlineText, { color: colors.danger }]}>Report issue</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

export function DriverReportIssueScreen({ route, navigation }: NativeStackScreenProps<DriverRunStackParams, 'ReportIssue'>) {
  const { stop } = route.params; const [reason, setReason] = useState(''); const [notes, setNotes] = useState(''); const [busy, setBusy] = useState(false);
  const reasons = [['not_home', 'Customer not available'], ['wrong_address', 'Wrong address'], ['access_problem', 'Access problem'], ['damaged_goods', 'Damaged goods'], ['vehicle_problem', 'Vehicle problem'], ['other', 'Other']];
  const submit = async () => { if (!reason) { Alert.alert('Choose an issue', 'Select what stopped you completing this stop.'); return; } setBusy(true); const result = await supabase.rpc('fail_driver_stop', { p_stop_id: stop.id, p_reason: reason, p_note: notes.trim() || null }); setBusy(false); if (result.error) Alert.alert('Report failed', result.error.message); else Alert.alert('Issue reported', 'Dispatch can now replan this stop.', [{ text: 'Done', onPress: () => navigation.popToTop() }]); };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Header title="Report Issue" subtitle={stop.customerName} /><Text style={styles.sectionTitle}>What’s the issue?</Text><View style={styles.listCard}>{reasons.map(([key, label]) => <Pressable key={key} style={styles.menuRow} onPress={() => setReason(key)}><Ionicons name={reason === key ? 'radio-button-on' : 'radio-button-off'} size={19} color={reason === key ? colors.primary : colors.textFaint} /><Text style={styles.menuLabel}>{label}</Text></Pressable>)}</View><Text style={styles.detailLabel}>ADDITIONAL NOTES</Text><TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Tell dispatch more…" placeholderTextColor={colors.textFaint} multiline maxLength={250} /><Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Submit report</Text>}</Pressable></ScrollView></SafeAreaView>;
}

export function DriverMessagesScreen() {
  const { session } = useAuth(); const [events, setEvents] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const runs = await supabase.from('driver_runs').select('id').eq('driver_id', session.user.id).order('run_date', { ascending: false }).limit(5);
    const ids = (runs.data || []).map((row) => row.id); if (!ids.length) { setEvents([]); return; }
    const stops = await supabase.from('driver_run_stops').select('shipment_id').in('run_id', ids);
    const shipmentIds = [...new Set((stops.data || []).map((row) => row.shipment_id))]; if (!shipmentIds.length) { setEvents([]); return; }
    const result = await supabase.from('shipment_events').select('id,event_type,new_status,created_at,details,shipment_id').in('shipment_id', shipmentIds).order('created_at', { ascending: false }).limit(30);
    setEvents(result.data || []);
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { (async () => { await load(); setLoading(false); })(); }, [load]));
  if (loading) return <Loading />;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Messages" subtitle="Dispatch and shipment updates" />
    {!events.length ? <Empty icon="chatbubble-ellipses-outline" title="No updates yet" text="Dispatch and shipment activity for your assigned runs will appear here." /> : <View style={styles.listCard}>{events.map((event) => <View key={event.id} style={styles.messageRow}><View style={styles.messageIcon}><Ionicons name="notifications-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.stopName}>{event.new_status || String(event.event_type).replaceAll('_', ' ')}</Text><Text style={styles.stopSub}>{event.details?.message || 'Assigned shipment update'}</Text></View><Text style={styles.messageTime}>{new Date(event.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text></View>)}</View>}
  </ScrollView></SafeAreaView>;
}

export function DriverMoreScreen() {
  const navigation = useNavigation<any>();
  const { dashboardRole } = useAuth();
  const { clearRole } = useViewRole();
  const items = [
    ['person-outline', 'My Profile', 'Account'], ['document-text-outline', 'Documents', 'Documents'], ['car-outline', 'Vehicle', 'Vehicle'],
    ['stats-chart-outline', 'Performance', 'Performance'], ['settings-outline', 'Settings', 'Settings'], ['help-circle-outline', 'Help & Support', 'Help'],
  ] as const;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="More" subtitle="Driver account and tools" /><View style={styles.listCard}>{items.map(([icon, label, route]) => <Pressable key={label} style={styles.menuRow} onPress={() => route === 'Help' ? Linking.openURL('mailto:voyagetechsolutions@gmaail.com') : navigation.navigate(route)}><Ionicons name={icon} size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>{label}</Text><Ionicons name="chevron-forward" size={17} color={colors.textFaint} /></Pressable>)}</View>{dashboardRole === 'admin' ? <Pressable style={styles.switchDashboard} onPress={clearRole}><Ionicons name="swap-horizontal-outline" size={19} color={colors.primary} /><Text style={styles.switchDashboardText}>Switch Dashboard</Text><Ionicons name="chevron-forward" size={17} color={colors.primary} /></Pressable> : null}</ScrollView></SafeAreaView>;
}

export function DriverVehicleScreen() {
  const { session } = useAuth(); const [run, setRun] = useState<Run | null>(null); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { if (session?.user.id) { const result = await supabase.from('driver_runs').select('id,status,route_name,run_date,vehicle_label,run_type').eq('driver_id', session.user.id).order('run_date', { ascending: false }).limit(1).maybeSingle(); setRun(result.data as Run | null); } setLoading(false); })(); }, [session?.user.id]));
  if (loading) return <Loading />;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Vehicle" subtitle="Current assignment" /><View style={styles.vehicleCard}><Image source={require('../../assets/driver/delivery-van.png')} style={styles.vehicleImage} resizeMode="cover" /><View style={styles.vehicleHeading}><View style={{ flex: 1 }}><Text style={styles.vehicleName}>{run?.vehicle_label || 'No vehicle assigned'}</Text><Text style={styles.vehicleMeta}>{run ? `${run.route_name || 'Route'} · ${run.run_date}` : 'Contact dispatch for an assignment'}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{run?.status || 'unassigned'}</Text></View></View><View style={styles.vehicleFacts}><Period label="Assignment" value={run?.route_name || 'Not assigned'} /><Period label="Run type" value={run?.run_type || '—'} /><Period label="Run date" value={run?.run_date || '—'} /></View></View><Pressable style={styles.outlineButton} onPress={() => Linking.openURL('https://wa.me/27615321107')}><Ionicons name="alert-circle-outline" size={18} color={colors.primary} /><Text style={styles.outlineText}>Report Vehicle Issue</Text></Pressable></ScrollView></SafeAreaView>;
}

export function DriverAccountScreen() {
  const { profile, session, signOut, dashboardRole } = useAuth();
  const { clearRole } = useViewRole();
  const navigation = useNavigation<any>();
  const avatar = session?.user.user_metadata?.avatar_url;
  const initial = (profile?.full_name || session?.user.email || 'D').charAt(0).toUpperCase();
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Account" subtitle="Driver profile" /><View style={styles.driverProfileCard}>{avatar ? <Image source={{ uri: avatar }} style={styles.driverAvatar} /> : <View style={styles.driverAvatarFallback}><Text style={styles.driverAvatarText}>{initial}</Text></View>}<View style={{ flex: 1 }}><Text style={styles.stopName}>{profile?.full_name || 'Driver'}</Text><Text style={styles.activeDriver}>Active Driver</Text><Text style={styles.stopSub}>{session?.user.email}</Text></View></View><View style={styles.listCard}><MenuLink icon="person-outline" label="My Profile" onPress={() => Alert.alert('Driver profile', `${profile?.full_name || 'Driver'}\n${session?.user.email || ''}`)} /><MenuLink icon="document-text-outline" label="Documents" onPress={() => navigation.navigate('Documents')} /><MenuLink icon="car-outline" label="Vehicle" onPress={() => navigation.navigate('Vehicle')} /><MenuLink icon="stats-chart-outline" label="Performance" onPress={() => navigation.navigate('Performance')} /><MenuLink icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} /><MenuLink icon="help-circle-outline" label="Help & Support" onPress={() => Linking.openURL('https://wa.me/27615321107')} /></View>{dashboardRole === 'admin' ? <Pressable style={styles.switchDashboard} onPress={clearRole}><Ionicons name="swap-horizontal-outline" size={19} color={colors.primary} /><Text style={styles.switchDashboardText}>Switch Dashboard</Text><Ionicons name="chevron-forward" size={17} color={colors.primary} /></Pressable> : null}<Pressable style={styles.logoutButton} onPress={signOut}><Ionicons name="log-out-outline" size={18} color={colors.danger} /><Text style={styles.logoutText}>Logout</Text></Pressable></ScrollView></SafeAreaView>;
}

export function DriverDocumentsScreen() {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Documents" subtitle="Driver records" /><View style={styles.listCard}><DocumentRow title="Driver profile" status="Verified" /><DocumentRow title="Licence and identification" status="Managed by dispatch" /><DocumentRow title="Vehicle assignment" status="Available with active run" /></View></ScrollView></SafeAreaView>;
}

export function DriverPerformanceScreen() {
  const { session } = useAuth(); const [runs, setRuns] = useState<any[]>([]); const [stops, setStops] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (async () => { if (!session?.user.id) { setLoading(false); return; } const result = await supabase.from('driver_runs').select('id,status').eq('driver_id', session.user.id); const records = result.data || []; setRuns(records); if (records.length) { const stopResult = await supabase.from('driver_run_stops').select('id,status').in('run_id', records.map((row) => row.id)); setStops(stopResult.data || []); } setLoading(false); })(); }, [session?.user.id]));
  if (loading) return <Loading />; const completed = stops.filter((row) => row.status === 'completed').length; const total = stops.length; const success = total ? Math.round(completed / total * 100) : 0;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Performance" subtitle="Your delivery record" /><View style={styles.metricGrid}><MetricBox value={runs.length} label="Runs" /><MetricBox value={completed} label="Stops" /><MetricBox value={success} label="Success %" /></View><View style={styles.listCard}><Period label="Completed runs" value={String(runs.filter((row) => row.status === 'completed').length)} /><Period label="Completed stops" value={String(completed)} /><Period label="Issues" value={String(stops.filter((row) => row.status === 'failed').length)} /></View></ScrollView></SafeAreaView>;
}

export function DriverSettingsScreen() {
  const [notifications, setNotifications] = useState(true); const [routeAlerts, setRouteAlerts] = useState(true);
  useFocusEffect(useCallback(() => { AsyncStorage.multiGet(['driver_notifications', 'driver_route_alerts']).then((values) => { if (values[0][1] !== null) setNotifications(values[0][1] === 'true'); if (values[1][1] !== null) setRouteAlerts(values[1][1] === 'true'); }); }, []));
  const update = (key: string, value: boolean, setter: (v: boolean) => void) => { setter(value); AsyncStorage.setItem(key, String(value)); };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}><Header title="Settings" subtitle="Driver preferences" /><View style={styles.listCard}><Setting label="Notifications" value={notifications} onChange={(v) => update('driver_notifications', v, setNotifications)} /><Setting label="Route alerts" value={routeAlerts} onChange={(v) => update('driver_route_alerts', v, setRouteAlerts)} /></View><View style={styles.listCard}><View style={styles.menuRow}><Ionicons name="language-outline" size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>Language</Text><Text style={styles.stopSub}>English</Text></View><View style={styles.menuRow}><Ionicons name="information-circle-outline" size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>About</Text><Text style={styles.stopSub}>Zimbabwe Shipping</Text></View></View></ScrollView></SafeAreaView>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) { const navigation = useNavigation<any>(); return <View>{navigation.canGoBack() ? <Pressable style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={21} color={colors.text} /></Pressable> : null}<Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>; }
function MenuLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) { return <Pressable style={styles.menuRow} onPress={onPress}><Ionicons name={icon} size={19} color={colors.textMuted} /><Text style={styles.menuLabel}>{label}</Text><Ionicons name="chevron-forward" size={17} color={colors.textFaint} /></Pressable>; }
function DocumentRow({ title, status }: { title: string; status: string }) { return <View style={styles.menuRow}><Ionicons name="document-text-outline" size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.menuLabel}>{title}</Text><Text style={styles.stopSub}>{status}</Text></View><Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} /></View>; }
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
  listCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadow }, stopRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, order: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, orderText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' }, stopName: { fontSize: 13.5, fontWeight: '800', color: colors.text }, stopSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 }, statusPill: { alignSelf: 'center', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primarySoft }, statusText: { fontSize: 9.5, color: colors.primaryDark, fontWeight: '800', textTransform: 'capitalize' },
  earningsHero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, minHeight: 112, justifyContent: 'center', ...shadow }, earningsValue: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 6 }, periodCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, ...shadow }, periodRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, periodLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' }, rowValue: { fontSize: 13.5, fontWeight: '800', color: colors.text }, summaryIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  messageRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, messageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, messageTime: { fontSize: 10.5, color: colors.textFaint },
  menuRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, menuLabel: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: '700' },
  vehicleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, vehicleImage: { width: '100%', height: 168, borderRadius: radius.md, backgroundColor: '#F4F2EF' }, vehicleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md }, vehicleName: { fontSize: 19, fontWeight: '800', color: colors.text }, vehicleMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 }, vehicleFacts: { marginTop: spacing.sm }, outlineButton: { minHeight: 48, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, outlineText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  driverProfileCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, driverAvatar: { width: 56, height: 56, borderRadius: 28 }, driverAvatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, driverAvatarText: { color: colors.white, fontSize: 21, fontWeight: '800' }, activeDriver: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 3 }, switchDashboard: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm }, switchDashboardText: { flex: 1, color: colors.primary, fontWeight: '800', fontSize: 13 }, logoutButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm }, logoutText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  detailCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow }, detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, detailKind: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: .6 }, detailName: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 4 }, contactRow: { flexDirection: 'row', gap: spacing.sm }, contactButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, detailDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }, detailLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: .6 }, detailAddress: { fontSize: 14, color: colors.text, fontWeight: '700', lineHeight: 20, marginTop: 5 }, mapLink: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: spacing.sm }, primaryButton: { minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontSize: 14, fontWeight: '800' }, notesInput: { minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  summarySuccess: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow }, successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }, metricGrid: { flexDirection: 'row', gap: spacing.sm }, metricBox: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow }, metricBoxValue: { fontSize: 23, fontWeight: '800', color: colors.text }, metricBoxLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 38, ...shadow }, emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.md }, emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center', marginTop: 5 },
});
