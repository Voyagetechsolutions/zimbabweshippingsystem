import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
// Alert comes from lib/alerts, not react-native: these screens build their
// button lists from data, and a native Android alert shows at most three
// buttons. The 12 configured failed-stop reasons became 2 reachable ones.
import { Alert } from '../lib/alerts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import RunMap from '../components/RunMap';
import { ConfirmSheet } from '../components/OptionSheet';
import { useAuth, type DriverType } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';
import {
  loadDriverOperationsDay, loadPresence, navigationUrls, setPresence,
  type DriverJob, type DriverOperationsDay,
} from '../lib/driverOperations';
import { isIrishAddress, loadCollectionsAhead, type ScheduledDay } from '../lib/collections';
import { BACKEND_PENDING_MESSAGE, isMissingBackend } from '../lib/offlineQueue';
import { COMPANY, COMPANY_WHATSAPP_URL } from '../config/company';
import { startOperationalTracking, stopOperationalTracking } from '../lib/driverBackgroundLocation';
import { useDriverCountry, type DriverCountry } from '../context/DriverCountryContext';

const logo = require('../../assets/staff-icon-v2.png');

type ViewMode = 'map' | 'list';
const COUNTRY_ORDER: DriverCountry[] = ['United Kingdom','Ireland','Zimbabwe'];
// `job.country` is normalised to exactly "Ireland" / "United Kingdom" when the
// day is built, but this stays tolerant of the raw values that reach it from a
// cached day written by an older build.
function jobCountry(job:DriverJob):DriverCountry {
  if (job.kind === 'delivery') return 'Zimbabwe';
  return isIrishAddress(job.country, job.postcode) ? 'Ireland' : 'United Kingdom';
}
function countryWorkLabel(country:DriverCountry){return country==='Zimbabwe'?'Deliveries':'Collections';}

function closed(job: DriverJob) { return job.status === 'completed' || job.status === 'failed'; }
function statusLabel(job: DriverJob) {
  if (job.status === 'completed') return job.kind === 'collection' ? 'Collected' : 'Delivered';
  if (job.status === 'failed') return 'Issue';
  if (job.status === 'en_route') return 'Current';
  if (job.status === 'arrived') return 'Arrived';
  return 'Upcoming';
}
function statusTone(job: DriverJob) {
  if (job.status === 'completed') return { bg: colors.primarySoft, fg: colors.primaryDark };
  if (job.status === 'failed') return { bg: colors.redSoft, fg: colors.danger };
  if (job.status === 'en_route' || job.status === 'arrived') return { bg: colors.blueSoft, fg: colors.blue };
  return { bg: '#F2F4F7', fg: colors.textMuted };
}
function formatTime(iso: string | null) {
  if (!iso) return 'ETA pending';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function normalisePhone(phone: string | null | undefined) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function openDriverContact(kind: 'call' | 'whatsapp', phone: string | null | undefined) {
  const value = normalisePhone(phone);
  if (!value || value.replace(/\D/g, '').length < 7) {
    Alert.alert('Contact unavailable', 'This customer has not provided a valid phone number.');
    return;
  }
  const url = kind === 'call' ? `tel:${value}` : `https://wa.me/${value.replace(/\D/g, '')}`;
  if (Platform.OS === 'web') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) Alert.alert(kind === 'call' ? 'Could not start call' : 'Could not open WhatsApp', 'Your browser blocked the new window. Allow pop-ups and try again.');
    return;
  }
  void Linking.openURL(url).catch(() => Alert.alert(
    kind === 'call' ? 'Could not start call' : 'Could not open WhatsApp',
    kind === 'call' ? 'Check that your device supports phone calls.' : 'Check that WhatsApp is installed or try again in your browser.',
  ));
}

export default function DriverOperationsHomeScreen() {
  const navigation = useNavigation<any>();
  const { session, profile, driverType } = useAuth();
  const {country:selectedCountry,chooseCountry:setSelectedCountry,clearCountry}=useDriverCountry();
  const [day, setDay] = useState<DriverOperationsDay | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [unread, setUnread] = useState(0);
  const [week, setWeek] = useState<ScheduledDay[]>([]);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  // The location notice shown before a shift starts. An in-app sheet rather
  // than Alert/window.confirm: RN Web turns Alert into a no-op and a browser
  // confirm can be suppressed or dismissed by the browser, in which case the
  // clock-in silently did nothing and the driver was left off shift with no
  // explanation. This cannot fail quietly.
  const [confirmClockIn, setConfirmClockIn] = useState(false);
  const channelKey = useRef(`driver-home-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const load = useCallback(async () => {
    if (!session?.user.id) { setDay(null); return; }
    setError(null);
    try {
      const operationsRequest = loadDriverOperationsDay(driverType as DriverType);
      const operationsRequestWithTimeout = Promise.race([
        operationsRequest,
        new Promise<DriverOperationsDay>((_, reject) => setTimeout(() => reject(new Error('Route lookup timed out')), 12000)),
      ]);
      const [operationsResult, attendance] = await Promise.allSettled([
        operationsRequestWithTimeout,
        supabase.from('driver_attendance').select('clocked_out_at').eq('driver_id', session.user.id)
          .eq('work_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      ]);
      // Attendance remains readable even if the collection feed fails.
      if (attendance.status === 'fulfilled' && !attendance.value.error) {
        setOnline(Boolean(attendance.value.data && !attendance.value.data.clocked_out_at));
      } else setError('Could not verify your clock-in status. Please refresh.');
      if (operationsResult.status === 'rejected') throw operationsResult.reason;
      setDay(operationsResult.value);
    } catch (e: any) {
      setError(e?.message || 'We couldn’t load today’s work. Check your connection and try again.');
      console.warn('Driver dashboard load failed', e?.message || e);
    }
  }, [driverType, session?.user.id]);

  const loadWeek = useCallback(async () => {
    if (driverType === 'delivery') return;
    try { setWeek(await loadCollectionsAhead(7)); setWeekError(null); }
    catch (e: any) { setWeekError(e?.message || 'Could not load this week.'); }
  }, [driverType]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([load(), loadWeek()]).finally(() => { if (active) setLoading(false); });
    const timer = setInterval(() => { void load(); void loadWeek(); }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [load, loadWeek]));
  // Two subscriptions rather than one: a channel fails as a whole if any table
  // in it is missing, and presence/notifications ship in a later migration than
  // the runs they annotate. Route changes must keep arriving regardless.
  useEffect(() => {
    if (!session?.user.id) return;
    const filter = `driver_id=eq.${session.user.id}`;
    const runs = supabase.channel(`${channelKey.current}-runs`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_runs', filter }, load)
      .subscribe();
    const status = supabase.channel(`${channelKey.current}-status`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence', filter }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_notifications', filter }, load)
      .subscribe();
    return () => { supabase.removeChannel(runs); supabase.removeChannel(status); };
  }, [load, session?.user.id]);
  useEffect(() => {
    if (!online || !session?.user.id) return;
    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted || permission.status !== 'granted') return;
      subscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60_000,
        distanceInterval: 100,
      }, (location) => {
        // Move the driver's own pin locally as well as reporting it. Waiting
        // for a refresh would leave them watching a stale dot on their map.
        setDay((current) => (current ? { ...current, point: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracyM: location.coords.accuracy ?? null,
        } } : current));
        void supabase.rpc('update_driver_operational_location', {
          p_latitude: location.coords.latitude,
          p_longitude: location.coords.longitude,
          p_accuracy_m: location.coords.accuracy ?? null,
          p_speed_mps: location.coords.speed ?? null,
          p_route_id: day?.route.id || null,
        }).then(({ error }) => {
          if (!error) return;
          // Nothing to retry against, so stop watching rather than push a
          // rejected position every minute for the rest of the shift.
          if (isMissingBackend(error)) { subscription?.remove(); subscription = null; return; }
          console.warn('Live location update failed', error.message);
        });
      });
    })();
    return () => { mounted = false; subscription?.remove(); };
  }, [day?.route.id, online, session?.user.id]);

  const allJobs = day?.jobs || [];
  const countryOptions=COUNTRY_ORDER.map(country=>{const assigned=allJobs.filter(job=>jobCountry(job)===country);const times=assigned.map(j=>j.eta).filter(Boolean).map(value=>new Date(value as string).getTime()).filter(Number.isFinite).sort((a,b)=>a-b);return{country,jobs:assigned.length,packages:assigned.reduce((sum,j)=>sum+j.packageCount,0),shift:times.length?`${formatTime(new Date(times[0]).toISOString())}–${formatTime(new Date(times[times.length-1]).toISOString())}`:'Shift set by dispatch'};});
  const jobs = (selectedCountry ? allJobs.filter(job=>jobCountry(job)===selectedCountry) : allJobs).map((job,index)=>({...job,sequence:index+1}));
  const completed = jobs.filter((job) => job.status === 'completed').length;
  const failed = jobs.filter((job) => job.status === 'failed').length;
  const remaining = jobs.filter((job) => !closed(job)).length;
  const collections = jobs.filter((job) => job.kind === 'collection').length;
  const deliveries = jobs.filter((job) => job.kind === 'delivery').length;
  const packages = jobs.reduce((sum, job) => sum + job.packageCount, 0);
  const progress = jobs.length ? Math.round((completed / jobs.length) * 100) : 0;
  const current = jobs.find((job) => job.status === 'en_route' || job.status === 'arrived') || jobs.find((job) => !closed(job)) || null;
  const mapped = jobs.filter((job) => job.latitude != null && job.longitude != null);
  const firstName = (profile?.full_name || 'Driver').split(' ')[0];
  const selectedRunId=jobs.find(job=>job.runId)?.runId||(selectedCountry==='Zimbabwe'?day?.route.id:null);
  const delayMinutes=current?.eta?Math.max(0,Math.round((Date.now()-new Date(current.eta).getTime())/60000)):0;
  const behind=delayMinutes>=10;

  const applyOnlineStatus = async (next: boolean) => {
    if (!session?.user.id) return;
    setBusy('presence');
    try {
      // The attendance clock is what records the shift, so it is the only step
      // allowed to fail the toggle. Presence and tracking are dispatch extras.
      const { error: clockError } = await supabase.rpc('clock_driver', { p_action: next ? 'in' : 'out', p_note: 'Driver app status toggle' });
      if (clockError) throw clockError;
      setOnline(next);
      const presence = await setPresence(next, day?.point ?? null, day?.route.id).catch(() => 'unavailable' as const);
      if (presence === 'updated') {
        if (next) void startOperationalTracking(day?.route.id ?? null).catch(() => setError('Clocked in. Background location is unavailable; you can still work from the list.'));
      }
      if (!next) await stopOperationalTracking().catch(() => setError('Clocked out, but tracking could not be stopped. Close the app and contact the office.'));
      await Promise.all([load(), loadWeek()]);
    } catch (e: any) {
      setError(e?.message || 'Clock status was not changed. Please retry.');
      Alert.alert('Status not changed', next
        ? 'We couldn’t put you online. Check your connection and try again.'
        : 'We couldn’t put you offline. Make sure active work is completed and try again.');
      console.warn('Driver presence update failed', e?.message || e);
    } finally { setBusy(null); }
  };

  const toggleOnline = () => {
    // Clocking out needs no notice; clocking in explains the location sharing.
    if (online) { void applyOnlineStatus(false); return; }
    setConfirmClockIn(true);
  };

  const startOrContinue = async () => {
    if (!online) { Alert.alert('Go online first', 'You must be online before starting a route.'); return; }
    if (day?.route.id && day.route.status === 'planned') {
      setBusy('route');
      const result = await supabase.rpc('start_driver_run', { p_run_id: day.route.id });
      setBusy(null);
      if (result.error) { Alert.alert('Route not started', 'We couldn’t start this route. Check its assignment and try again.'); return; }
      await load();
    }
    navigation.navigate('Route');
  };

  const reoptimise=async()=>{
    if(!selectedRunId){Alert.alert('Route not ready','Dispatch must assign these bookings to a run before the route can be re-optimised.');return;}
    setBusy('optimise');
    try{const result=await supabase.rpc('driver_reoptimise_route',{p_run_id:selectedRunId,p_reason:behind?'driver_delay_recovery':'driver_requested'});if(result.error)throw result.error;await load();Alert.alert('Route updated','Remaining stops were reordered from your current position. Review the new sequence before continuing.');}
    catch(e:any){Alert.alert('Could not re-optimise',isMissingBackend(e)?BACKEND_PENDING_MESSAGE:(e?.message||'Ask dispatch to enable route re-optimisation.'));}
    finally{setBusy(null);}
  };

  const chooseNavigation = (job: DriverJob) => {
    const options = navigationUrls(job);
    if (!options.length) {
      Alert.alert('Address unavailable', 'This stop does not have enough address information to open navigation.');
      return;
    }
    // Expo Linking can resolve tel/app schemes on native, but on web it may
    // silently do nothing for a new tab. Open the HTTPS maps URL directly.
    if (Platform.OS === 'web') {
      const url = options.find((option) => option.label === 'Google Maps')?.url || options[0].url;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) Alert.alert('Could not open navigation', 'Your browser blocked the maps window. Allow pop-ups and try again.');
      return;
    }
    Alert.alert('Navigate with', job.address, [
      ...options.map((option) => ({ text: option.label, onPress: () => { void Linking.openURL(option.url).catch(() => Alert.alert('Could not open navigation', 'Check that a maps application or browser is available.')); } })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // A live collection from the shared route can exist before a driver has
  // claimed it, so its id is the shipment id rather than a run-stop id. The
  // stop details screen handles both forms and turns the first action into a
  // real, server-confirmed collection claim.
  const openShipment = (job: DriverJob) => {
    if (!online) { setError('Clock in to start working through your collections.'); return; }
    navigation.navigate('Route', {
      screen: 'StopDetails',
      // Keep the run screen underneath, or Back from a stop has nowhere to go.
      initial: false,
      params: {
        stop: {
          id: job.id,
          shipmentId: job.shipmentId,
          kind: job.kind,
          customerName: job.customer,
          trackingNumber: job.reference,
        },
      },
    });
  };

  const quickAction = (target: string) => {
    if (target === 'dispatch') { Linking.openURL(COMPANY_WHATSAPP_URL); return; }
    navigation.navigate(target);
  };

  const weekDays = week.map(item => ({ ...item, collections: item.collections.filter(c =>
    !selectedCountry || (isIrishAddress(c.country, c.postcode) ? 'Ireland' : 'United Kingdom') === selectedCountry) }))
    .filter(item => item.collections.length);
  const refresh = async () => { setRefreshing(true); await Promise.all([load(), loadWeek()]); setRefreshing(false); };
  const openAhead = (c: ScheduledDay['collections'][number]) => navigation.navigate('Route', {
    screen: 'StopDetails', initial: false, params: { stop: {
      id: c.stopId || c.shipmentId, shipmentId: c.shipmentId, kind: 'collection',
      customerName: c.customerName, trackingNumber: c.customerReference || c.trackingNumber || 'Collection',
    } },
  });

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>DRIVER WORKSPACE</Text><Text style={styles.countryTitle}>Hi, {firstName}</Text></View>
        <View style={[styles.connection, online && styles.connectionOnline]}><View style={[styles.connectionDot, online && styles.connectionDotOnline]}/><Text style={styles.connectionText}>{online ? 'CLOCKED IN' : 'OFF SHIFT'}</Text></View>
      </View>
      <View style={styles.nextCard}>
        <Text style={styles.nextName}>{online ? 'Your shift is underway' : 'Ready for your collections?'}</Text>
        <Text style={styles.emptyText}>{online ? 'Open a customer, arrive, check the goods, then mark collected.' : 'Clock in to start. Today and the next seven days are below. GPS and customer QR codes are optional for pickups.'}</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={toggleOnline} disabled={busy === 'presence'}>
          {busy === 'presence' ? <ActivityIndicator color={colors.white}/> : <><Ionicons name="time-outline" size={21} color={colors.white}/><Text style={styles.primaryButtonText}>{online ? 'CLOCK OUT' : 'CLOCK IN & START'}</Text></>}
        </Pressable>
      </View>
      {error ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={[styles.errorText,{flex:1}]}>{error}</Text><Pressable onPress={refresh}><Text style={styles.outlineButtonText}>RETRY</Text></Pressable></View> : null}
      {day?.warnings?.map(warning => <Text key={warning} accessibilityRole="alert" style={styles.errorText}>{warning}</Text>)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{flexDirection:'row',gap:8}}>
          {(['All',...COUNTRY_ORDER] as const).map(country => <Pressable key={country} onPress={() => country === 'All' ? clearCountry() : setSelectedCountry(country)} style={[styles.segmentButton, (country === (selectedCountry || 'All')) && styles.segmentActive]}>
            <Text style={[styles.segmentText, country === (selectedCountry || 'All') && styles.segmentTextActive]}>{country}</Text>
          </Pressable>)}
        </View>
      </ScrollView>
      <View style={styles.sectionRow}>
        <View style={styles.segment}>{(['today','week'] as const).map(value => <Pressable key={value} style={[styles.segmentButton,period === value && styles.segmentActive]} onPress={() => setPeriod(value)}><Text style={[styles.segmentText,period === value && styles.segmentTextActive]}>{value === 'today' ? 'Today' : 'This week'}</Text></Pressable>)}</View>
        <Pressable style={styles.segmentButton} onPress={() => navigation.navigate('Route',{screen:'FindShipment',initial:false})}><Ionicons name="search" size={18} color={colors.primary}/><Text style={styles.segmentText}>Find shipment</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary}/> : null}
      {period === 'week' ? <>
        <Text style={styles.sectionTitle}>Next seven days · {weekDays.reduce((n,d) => n+d.collections.length,0)} collections</Text>
        {weekError ? <Text accessibilityRole="alert" style={styles.errorText}>{weekError}</Text> : null}
        {!loading && !weekError && !weekDays.length ? <Text style={styles.emptyText}>No upcoming collections in this country. Try All or refresh.</Text> : null}
        {weekDays.map(item => <View key={item.date} style={styles.nextCard}>
          <Text style={styles.sectionTitle}>{new Date(item.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</Text>
          {item.collections.map(c => <Pressable key={c.shipmentId} style={styles.stopRow} onPress={() => openAhead(c)}>
            <View style={{flex:1}}><Text style={styles.stopName}>{c.customerName}</Text><Text style={styles.stopAddress}>{[c.address,c.city,c.postcode].filter(Boolean).join(', ')}</Text><Text style={styles.stopMeta}>{c.customerReference || c.trackingNumber}{c.claimedBy ? ' · Assigned' : ' · Available'}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.primary}/>
          </Pressable>)}
        </View>)}
      </> : <>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{remaining} remaining · {completed} collected / delivered</Text><Pressable onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} style={styles.segmentButton}><Text style={styles.segmentText}>{viewMode === 'map' ? 'List' : 'Map'}</Text></Pressable></View>
        {viewMode === 'map' ? <RunMap height={340} focusStopId={current?.id || null} emptyCenter={day?.point ?? null} emptyNote="No mapped stops yet. Addresses remain available in the list." stops={[
          ...(day?.point ? [{id:'driver',latitude:day.point.latitude,longitude:day.point.longitude,title:'Your position',description:'Live location',kind:'driver' as const,order:'D'}] : []),
          ...mapped.map(j => ({id:j.id,latitude:Number(j.latitude),longitude:Number(j.longitude),title:j.customer,description:j.address,kind:j.kind,order:j.sequence,done:closed(j)})),
        ]} onStopPress={pin => { const job=jobs.find(j=>j.id===pin.id); if(job) openShipment(job); }}/> : null}
        {current ? <View style={styles.nextCard}>
          <Text style={styles.eyebrow}>{current.status === 'arrived' ? 'AT THE CUSTOMER' : 'NEXT COLLECTION / DELIVERY'}</Text><Text style={styles.nextName}>{current.customer}</Text><Text style={styles.nextMeta}>{current.reference}</Text><Text style={styles.nextAddress}>{current.address}</Text>
          {current.instructions ? <Text style={styles.instructionsText}>{current.instructions}</Text> : null}
          <View style={styles.nextActions}><Pressable style={styles.smallAction} onPress={()=>openDriverContact('call',current.phone)}><Ionicons name="call-outline" size={21} color={colors.primary}/><Text>Call</Text></Pressable><Pressable style={styles.navigateButton} onPress={()=>chooseNavigation(current)}><Ionicons name="navigate" size={20} color="white"/><Text style={styles.navigateText}>NAVIGATE</Text></Pressable></View>
          <Pressable style={styles.primaryButton} onPress={()=>openShipment(current)}><Text style={styles.primaryButtonText}>{current.status === 'arrived' ? 'VERIFY & COLLECT' : 'OPEN SHIPMENT'}</Text><Ionicons name="arrow-forward" size={19} color="white"/></Pressable>
        </View> : !loading && !error ? <View style={styles.empty}><Text style={styles.emptyTitle}>No remaining stops today</Text><Text style={styles.emptyText}>Check this week for upcoming bookings, or choose All to view other countries.</Text><Pressable style={styles.outlineButton} onPress={()=>setPeriod('week')}><Text style={styles.outlineButtonText}>SEE THIS WEEK</Text></Pressable></View> : null}
        {jobs.length ? <View style={styles.stopList}>{jobs.map(job=><StopRow key={job.id} job={job} current={job.id===current?.id} onPress={()=>openShipment(job)}/>)}</View> : null}
      </>}
      <Text style={styles.assignmentNote}>Navigation opens your maps app for spoken, turn-by-turn directions. Stops without a map pin can still be opened and collected.</Text>
      <Pressable style={styles.outlineButton} onPress={()=>quickAction('dispatch')}><Ionicons name="headset-outline" size={20} color={colors.primary}/><Text style={styles.outlineButtonText}>CONTACT THE OFFICE</Text></Pressable>
    </ScrollView>
    <ConfirmSheet
      visible={confirmClockIn}
      title="Start your shift"
      message={'Your route location is shared with the office while you are clocked in, and stops when you clock out. Your phone may ask for background location permission. You can still see and collect your stops without it.'}
      confirmLabel="Clock in"
      busy={busy === 'presence'}
      onConfirm={() => { setConfirmClockIn(false); void applyOnlineStatus(true); }}
      onClose={() => setConfirmClockIn(false)}
    />
  </SafeAreaView>;
}

function Metric({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: keyof typeof Ionicons.glyphMap; tone: string }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${tone}16` }]}><Ionicons name={icon} size={18} color={tone} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricSub}>{sub}</Text></View>;
}
function RouteFact({ value, label }: { value: string; label: string }) { return <View style={styles.routeFact}><Text style={styles.routeFactValue}>{value}</Text><Text style={styles.routeFactLabel}>{label}</Text></View>; }
function Quick({ icon, label, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) { return <Pressable style={styles.quick} onPress={onPress}><View style={[styles.quickIcon, danger && { backgroundColor: colors.redSoft }]}><Ionicons name={icon} size={21} color={danger ? colors.danger : colors.primary} /></View><Text style={[styles.quickText, danger && { color: colors.danger }]}>{label}</Text></Pressable>; }
function StopRow({ job, current, onPress }: { job: DriverJob; current: boolean; onPress: () => void }) {
  const tone = statusTone(job);
  const region = job.kind === 'delivery' ? 'ZIMBABWE DELIVERY' : `${job.country === 'Ireland' ? 'IRELAND' : 'UK'} PICKUP`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open shipment ${job.reference}`} style={[styles.stopRow, current && styles.stopRowCurrent]} onPress={onPress}>
    <View style={[styles.stopNumber, { backgroundColor: closed(job) ? colors.primarySoft : current ? colors.blue : '#F2F4F7' }]}>{closed(job) && job.status === 'completed' ? <Ionicons name="checkmark" size={17} color={colors.primaryDark} /> : <Text style={[styles.stopNumberText, current && { color: colors.white }]}>{job.sequence}</Text>}</View>
    <View style={{ flex: 1 }}><Text style={styles.stopName}>{job.customer}</Text><Text style={styles.stopAddress} numberOfLines={1}>{job.city || job.address}</Text><Text style={styles.stopMeta}>{region} · {job.packageCount} PACKAGE{job.packageCount === 1 ? '' : 'S'} · {formatTime(job.eta)}</Text></View>
    {job.priority !== 'normal' ? <Ionicons name="flash" size={15} color={job.priority === 'urgent' ? colors.danger : colors.amber} /> : null}<View style={[styles.statusPill, { backgroundColor: tone.bg }]}><Text style={[styles.statusPillText, { color: tone.fg }]}>{statusLabel(job)}</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, loadingText: { color: colors.textMuted, fontWeight: '600' },
  countryContent:{padding:spacing.lg,paddingBottom:80,gap:spacing.lg},countryHero:{paddingTop:20},countryTitle:{fontSize:29,fontWeight:'900',color:colors.text,marginTop:5},countrySubtitle:{fontSize:13,color:colors.textMuted,lineHeight:19,marginTop:8},countryList:{gap:10},countryCard:{minHeight:96,flexDirection:'row',alignItems:'center',gap:13,padding:15,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,...shadow},countryMetaEmpty:{color:colors.textFaint},flagBox:{width:48,height:48,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},countryName:{fontSize:17,fontWeight:'900',color:colors.text},countryKind:{fontSize:11.5,fontWeight:'700',color:colors.primaryDark,marginTop:3},countryMeta:{fontSize:10.5,color:colors.textMuted,marginTop:4},assignmentNote:{fontSize:11,color:colors.textMuted,lineHeight:17,textAlign:'center',paddingHorizontal:16},changeCountry:{minHeight:43,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,borderRadius:radius.md,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#B7E4D4'},changeCountryText:{fontSize:10.5,fontWeight:'900',color:colors.primaryDark,letterSpacing:.3},
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logo: { width: 38, height: 38, borderRadius: 10 }, company: { color: colors.text, fontWeight: '900', fontSize: 14 }, date: { color: colors.textMuted, fontSize: 11.5, marginTop: 1 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 }, iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', top: -2, right: -1, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }, badgeText: { color: colors.white, fontSize: 8, fontWeight: '900' }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3 }, eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' }, hello: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 }, connection: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#EEF1F4' }, connectionOnline: { backgroundColor: colors.primarySoft }, connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint }, connectionDotOnline: { backgroundColor: colors.primary }, connectionText: { fontSize: 9, fontWeight: '900', color: colors.textMuted, letterSpacing: .7 }, connectionTextOnline: { color: colors.primaryDark },
  onlineCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow }, onlineCardActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }, onlineCopy: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' }, statusIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, statusIconActive: { backgroundColor: 'rgba(255,255,255,.16)' }, onlineTitle: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: .4 }, onlineTitleActive: { color: colors.white }, onlineSub: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, marginTop: 2 }, onlineSubActive: { color: '#CDEEE2' }, onlineButton: { marginTop: spacing.md, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, onlineButtonActive: { backgroundColor: colors.white }, onlineButtonText: { color: colors.white, fontWeight: '900', fontSize: 13, letterSpacing: .5 }, onlineButtonTextActive: { color: colors.primaryDark },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 4 }, summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metric: { width: '48.7%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow }, metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, metricValue: { color: colors.text, fontWeight: '900', fontSize: 24 }, metricLabel: { color: colors.text, fontWeight: '900', fontSize: 9.5, letterSpacing: .7 }, metricSub: { color: colors.textMuted, fontSize: 10.5, marginTop: 3 },
  delayAdvice:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:radius.md,backgroundColor:colors.amberSoft,borderWidth:1,borderColor:'#F5D48A'},delayTitle:{fontSize:12.5,fontWeight:'900',color:colors.amber},delayText:{fontSize:10.5,color:colors.textMuted,lineHeight:15,marginTop:2},optimiseSmall:{paddingHorizontal:10,paddingVertical:8,borderRadius:8,backgroundColor:colors.amber},optimiseSmallText:{fontSize:9,fontWeight:'900',color:colors.white},
  routeCard: { backgroundColor: '#102A43', borderRadius: radius.lg, padding: spacing.lg, ...shadow }, routeTop: { flexDirection: 'row', alignItems: 'center' }, routeKicker: { color: '#8EDCC1', fontSize: 9.5, fontWeight: '900', letterSpacing: 1 }, routeName: { color: colors.white, fontWeight: '900', fontSize: 19, marginTop: 4, textTransform: 'capitalize' }, routeCode: { color: '#B8C8D9', fontSize: 11, marginTop: 4 }, progressRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, progressNumber: { color: colors.white, fontWeight: '900', fontSize: 13 }, progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 5, overflow: 'hidden', marginTop: spacing.lg }, progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 }, routeFacts: { flexDirection: 'row', marginTop: spacing.lg }, routeFact: { flex: 1 }, routeFactValue: { color: colors.white, fontSize: 16, fontWeight: '900' }, routeFactLabel: { color: '#9DB1C4', fontSize: 9.5, marginTop: 2 }, routeEndpoints: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg }, endpointText: { color: '#C8D5E2', fontSize: 10.5, maxWidth: '35%' }, endpointLine: { flex: 1, height: 1, backgroundColor: '#426079' }, primaryButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm }, primaryButtonText: { color: colors.white, fontWeight: '900', fontSize: 13, letterSpacing: .5 },
  optimiseButton:{minHeight:46,borderRadius:radius.md,borderWidth:1,borderColor:'#5C7891',marginTop:9,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7},optimiseButtonText:{color:colors.white,fontSize:10.5,fontWeight:'900',letterSpacing:.3},
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, segment: { flexDirection: 'row', borderRadius: radius.sm, backgroundColor: '#E9EEF1', padding: 3 }, segmentButton: { minHeight: 32, paddingHorizontal: 11, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, segmentActive: { backgroundColor: colors.primaryDark }, segmentText: { color: colors.textMuted, fontSize: 9.5, fontWeight: '900' }, segmentTextActive: { color: colors.white }, stopList: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, stopRowCurrent: { backgroundColor: colors.blueSoft }, stopNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, stopNumberText: { fontSize: 11, fontWeight: '900', color: colors.textMuted }, stopName: { fontWeight: '800', color: colors.text, fontSize: 13 }, stopAddress: { color: colors.textMuted, fontSize: 11, marginTop: 1 }, stopMeta: { color: colors.textFaint, fontSize: 9, fontWeight: '700', marginTop: 3 }, statusPill: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 7 }, statusPillText: { fontSize: 8.5, fontWeight: '900' },
  nextCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.blue, ...shadow }, nextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, currentPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.blueSoft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill }, pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue }, currentPillText: { color: colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: .5 }, nextSequence: { color: colors.textMuted, fontWeight: '800', fontSize: 11 }, nextName: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: spacing.md }, nextMeta: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: .4, marginTop: 3 }, addressRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md }, nextAddress: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 }, nextEta: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 3 }, instructions: { marginTop: spacing.md, flexDirection: 'row', gap: 7, backgroundColor: colors.amberSoft, borderRadius: radius.sm, padding: 10 }, instructionsText: { flex: 1, color: colors.amber, fontSize: 11.5, lineHeight: 16, fontWeight: '600' }, shipmentButton:{minHeight:46,marginTop:spacing.md,borderRadius:radius.sm,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#B7E4D4',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7},shipmentButtonText:{flex:1,color:colors.primaryDark,fontSize:10.5,fontWeight:'900',letterSpacing:.2}, nextActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }, smallAction: { width: 66, minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 2 }, smallActionText: { color: colors.primaryDark, fontSize: 8.5, fontWeight: '900' }, navigateButton: { flex: 1, minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, navigateText: { color: colors.white, fontWeight: '900', fontSize: 12 }, 
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, quick: { width: '31.7%', minHeight: 90, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center', justifyContent: 'center', ...shadow }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, quickText: { marginTop: 7, color: colors.text, fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.redSoft, borderRadius: radius.md, borderWidth: 1, borderColor: '#FECACA', padding: spacing.md }, errorTitle: { color: colors.danger, fontWeight: '800', fontSize: 12 }, errorText: { color: '#991B1B', fontSize: 10.5, marginTop: 2 }, empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border }, emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { marginTop: spacing.md, color: colors.text, fontSize: 18, fontWeight: '900' }, emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 }, outlineButton: { minHeight: 44, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 24, marginTop: spacing.lg }, outlineButtonText: { color: colors.primary, fontWeight: '900', fontSize: 11 },
});
