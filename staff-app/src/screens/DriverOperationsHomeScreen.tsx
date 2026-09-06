import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import RunMap from '../components/RunMap';
import { useAuth, type DriverType } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../theme';
import {
  loadDriverOperationsDay, loadPresence, navigationUrls, setPresence,
  type DriverJob, type DriverOperationsDay,
} from '../lib/driverOperations';
import { isIrishAddress } from '../lib/collections';
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
  const channelKey = useRef(`driver-home-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const load = useCallback(async () => {
    if (!session?.user.id) { setDay(null); return; }
    setError(null);
    try {
      const operationsRequest = loadDriverOperationsDay(driverType as DriverType);
      const operations = await Promise.race([
        operationsRequest,
        new Promise<DriverOperationsDay>((_, reject) => setTimeout(() => reject(new Error('Route lookup timed out')), 12000)),
      ]);
      const [presence, notificationResult, attendanceResult] = await Promise.all([
        loadPresence(session.user.id).catch(() => null),
        supabase.from('driver_notifications').select('id', { count: 'exact', head: true }).eq('driver_id', session.user.id).is('read_at', null),
        supabase.from('driver_attendance').select('clocked_out_at').eq('driver_id', session.user.id)
          .eq('work_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      ]);
      setDay(operations);
      setOnline(presence ? presence.status !== 'offline' : Boolean(attendanceResult.data && !attendanceResult.data.clocked_out_at));
      setUnread(notificationResult.count || 0);
    } catch (e: any) {
      setDay(null);
      setError(/timed out/i.test(e?.message || '') ? 'Route lookup took too long. You can retry now or continue when dispatch is online.' : 'We couldn’t load today’s work. Check your connection and try again.');
      console.warn('Driver dashboard load failed', e?.message || e);
    }
  }, [driverType, session?.user.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
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
    if (!session?.user.id || !day) return;
    setBusy('presence');
    try {
      // The attendance clock is what records the shift, so it is the only step
      // allowed to fail the toggle. Presence and tracking are dispatch extras.
      const { error: clockError } = await supabase.rpc('clock_driver', { p_action: next ? 'in' : 'out', p_note: 'Driver app status toggle' });
      if (clockError && !/already|clock/i.test(clockError.message || '')) throw clockError;
      const presence = await setPresence(next, day.point, day.route.id).catch(() => 'unavailable' as const);
      if (presence === 'updated') {
        if (next) await startOperationalTracking(day.route.id); else await stopOperationalTracking();
      }
      setOnline(next);
    } catch (e: any) {
      Alert.alert('Status not changed', next
        ? 'We couldn’t put you online. Check your connection and try again.'
        : 'We couldn’t put you offline. Make sure active work is completed and try again.');
      console.warn('Driver presence update failed', e?.message || e);
    } finally { setBusy(null); }
  };

  const toggleOnline = () => {
    if (online) { void applyOnlineStatus(false); return; }
    Alert.alert('Location while you are online', 'Zimbabwe Shipping shares your route location with dispatch while you are online and working. Tracking stops when you go offline. Your phone may ask for background location permission.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => { void applyOnlineStatus(true); } },
    ]);
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
    navigation.navigate('Route', {
      screen: 'StopDetails',
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

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Preparing today’s route…</Text></View></SafeAreaView>;

  if(!selectedCountry)return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.countryContent} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false);}}/>}><View style={styles.header}><View style={styles.brand}><Image source={logo} style={styles.logo}/><View><Text style={styles.company}>{COMPANY.name}</Text><Text style={styles.date}>Driver operations</Text></View></View><View style={[styles.connection,online&&styles.connectionOnline]}><View style={[styles.connectionDot,online&&styles.connectionDotOnline]}/><Text style={[styles.connectionText,online&&styles.connectionTextOnline]}>{online?'ONLINE':'OFFLINE'}</Text></View></View><View style={styles.countryHero}><Text style={styles.eyebrow}>TODAY’S ASSIGNMENT</Text><Text style={styles.countryTitle}>Choose your country</Text><Text style={styles.countrySubtitle}>Only live bookings assigned to this driver and today’s shift are shown. Choose a country to view its collections or deliveries.</Text></View>{error?<View style={styles.errorCard}><Ionicons name="cloud-offline-outline" size={22} color={colors.danger}/><View style={{flex:1}}><Text style={styles.errorTitle}>Driver dashboard unavailable</Text><Text style={styles.errorText}>{error}</Text></View><Pressable onPress={load}><Ionicons name="refresh" size={21} color={colors.primary}/></Pressable></View>:null}<View style={styles.countryList}>{countryOptions.map(option=>{const empty=option.jobs===0;return <Pressable accessibilityRole="button" key={option.country} onPress={()=>setSelectedCountry(option.country)} style={styles.countryCard}><View style={styles.flagBox}><Ionicons name={option.country==='Zimbabwe'?'home-outline':'airplane-outline'} size={24} color={colors.primaryDark}/></View><View style={{flex:1}}><Text style={styles.countryName}>{option.country}</Text><Text style={styles.countryKind}>{countryWorkLabel(option.country)} · {option.shift}</Text><Text style={[styles.countryMeta,empty&&styles.countryMetaEmpty]}>{empty?`No ${countryWorkLabel(option.country).toLowerCase()} assigned today`:`${option.jobs} live job${option.jobs===1?'':'s'} · ${option.packages} package${option.packages===1?'':'s'}`}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.primary}/></Pressable>})}</View><Text style={styles.assignmentNote}>{'Today’s jobs are the ones assigned to you. Use “Collections ahead” to see what is booked on the dates coming up and plan your own route.'}</Text></ScrollView></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <View style={styles.header}>
        <View style={styles.brand}><Image source={logo} style={styles.logo} /><View><Text style={styles.company}>{COMPANY.name}</Text><Text style={styles.date}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text></View></View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => quickAction('Messages')}><Ionicons name="notifications-outline" size={21} color={colors.text} />{unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unread, 9)}</Text></View> : null}</Pressable>
          <Pressable style={styles.avatar} onPress={() => quickAction('Profile')}><Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text></Pressable>
        </View>
      </View>

      <View style={styles.welcome}><View><Text style={styles.eyebrow}>DRIVER OPERATIONS · {selectedCountry.toUpperCase()}</Text><Text style={styles.hello}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}</Text></View><View style={[styles.connection, online && styles.connectionOnline]}><View style={[styles.connectionDot, online && styles.connectionDotOnline]} /><Text style={[styles.connectionText, online && styles.connectionTextOnline]}>{online ? 'ONLINE' : 'OFFLINE'}</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Change country" style={styles.changeCountry} onPress={clearCountry}><Ionicons name="globe-outline" size={17} color={colors.primaryDark}/><Text style={styles.changeCountryText}>CHANGE COUNTRY · {selectedCountry}</Text><Ionicons name="chevron-down" size={16} color={colors.primaryDark}/></Pressable>

      <View style={[styles.onlineCard, online && styles.onlineCardActive]}>
        <View style={styles.onlineCopy}><View style={[styles.statusIcon, online && styles.statusIconActive]}><Ionicons name={online ? 'radio' : 'power-outline'} size={22} color={online ? colors.white : colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={[styles.onlineTitle, online && styles.onlineTitleActive]}>{online ? "YOU’RE ONLINE" : 'READY TO WORK?'}</Text><Text style={[styles.onlineSub, online && styles.onlineSubActive]}>{online ? 'Dispatch can see your availability and route progress.' : 'Go online to receive work and start today’s route.'}</Text></View></View>
        <Pressable style={[styles.onlineButton, online && styles.onlineButtonActive]} onPress={toggleOnline} disabled={busy === 'presence'}>{busy === 'presence' ? <ActivityIndicator color={online ? colors.primary : colors.white} /> : <Text style={[styles.onlineButtonText, online && styles.onlineButtonTextActive]}>{online ? 'GO OFFLINE' : 'GO ONLINE'}</Text>}</Pressable>
      </View>

      {error ? <View style={styles.errorCard}><Ionicons name="cloud-offline-outline" size={22} color={colors.danger} /><View style={{ flex: 1 }}><Text style={styles.errorTitle}>Today’s work is unavailable</Text><Text style={styles.errorText}>{error}</Text></View><Pressable onPress={load}><Ionicons name="refresh" size={21} color={colors.primary} /></Pressable></View> : null}

      <Text style={styles.sectionTitle}>Today’s work</Text>
      <View style={styles.summaryGrid}>
        <Metric label="TOTAL JOBS" value={jobs.length} sub={`${collections} collections · ${deliveries} deliveries`} icon="briefcase-outline" tone={colors.blue} />
        <Metric label="COMPLETED" value={completed} sub={`${remaining} remaining`} icon="checkmark-circle-outline" tone={colors.primary} />
        <Metric label="ISSUES" value={failed} sub={failed ? 'Dispatch notified' : 'No problems'} icon="alert-circle-outline" tone={failed ? colors.danger : colors.textMuted} />
        <Metric label="PACKAGES" value={packages} sub="Across today’s jobs" icon="cube-outline" tone={colors.orange} />
      </View>
      {behind?<View style={styles.delayAdvice}><Ionicons name="warning-outline" size={21} color={colors.amber}/><View style={{flex:1}}><Text style={styles.delayTitle}>You are about {delayMinutes} minutes behind</Text><Text style={styles.delayText}>Re-optimise the remaining stops from your current location to protect time windows.</Text></View><Pressable style={styles.optimiseSmall} onPress={reoptimise} disabled={busy==='optimise'}><Text style={styles.optimiseSmallText}>RE-ROUTE</Text></Pressable></View>:null}

      {!day || jobs.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="map-outline" size={32} color={colors.primary} /></View><Text style={styles.emptyTitle}>No route assigned</Text><Text style={styles.emptyText}>You don’t currently have work assigned for today. Keep the app online or refresh when dispatch publishes a route.</Text><Pressable style={styles.outlineButton} onPress={load}><Ionicons name="refresh" size={17} color={colors.primary} /><Text style={styles.outlineButtonText}>REFRESH</Text></Pressable></View> : 
        <View style={styles.routeCard}>
          <View style={styles.routeTop}><View style={{ flex: 1 }}><Text style={styles.routeKicker}>{selectedCountry.toUpperCase()} · {countryWorkLabel(selectedCountry).toUpperCase()}</Text><Text style={styles.routeName}>{day.route.name}</Text><Text style={styles.routeCode}>{day.route.code} · {day.route.vehicle}</Text></View><View style={styles.progressRing}><Text style={styles.progressNumber}>{progress}%</Text></View></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(progress, 2)}%` }]} /></View>
          <View style={styles.routeFacts}><RouteFact value={`${completed}`} label="Completed" /><RouteFact value={`${remaining}`} label="Remaining" /><RouteFact value={day.route.distanceKm ? `${day.route.distanceKm} km` : '— km'} label="Distance" /><RouteFact value={day.route.estimatedFinish ? formatTime(day.route.estimatedFinish) : '—'} label="Finish" /></View>
          <View style={styles.routeEndpoints}><Ionicons name="radio-button-on" size={14} color={colors.primary} /><Text style={styles.endpointText}>{day.route.startLocation}</Text><View style={styles.endpointLine} /><Ionicons name="location" size={15} color={colors.orange} /><Text style={styles.endpointText}>{day.route.endLocation}</Text></View>
          <Pressable style={styles.primaryButton} onPress={startOrContinue} disabled={busy === 'route'}>{busy === 'route' ? <ActivityIndicator color={colors.white} /> : <><Ionicons name={day.route.status === 'planned' ? 'play' : 'navigate'} size={19} color={colors.white} /><Text style={styles.primaryButtonText}>{day.route.status === 'planned' ? 'START ROUTE' : 'CONTINUE ROUTE'}</Text></>}</Pressable>
          <Pressable style={styles.optimiseButton} onPress={reoptimise} disabled={busy==='optimise'}>{busy==='optimise'?<ActivityIndicator color={colors.white}/>:<><Ionicons name="git-compare-outline" size={18} color={colors.white}/><Text style={styles.optimiseButtonText}>RE-OPTIMISE REMAINING STOPS</Text></>}</Pressable>
        </View>}

        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Today’s route</Text><View style={styles.segment}><Pressable style={[styles.segmentButton, viewMode === 'map' && styles.segmentActive]} onPress={() => setViewMode('map')}><Ionicons name="map-outline" size={15} color={viewMode === 'map' ? colors.white : colors.textMuted} /><Text style={[styles.segmentText, viewMode === 'map' && styles.segmentTextActive]}>MAP</Text></Pressable><Pressable style={[styles.segmentButton, viewMode === 'list' && styles.segmentActive]} onPress={() => setViewMode('list')}><Ionicons name="list-outline" size={16} color={viewMode === 'list' ? colors.white : colors.textMuted} /><Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>LIST</Text></Pressable></View></View>
        {viewMode === 'map' ? <RunMap height={330} focusStopId={current?.id || null} emptyCenter={day?.point ?? null} emptyNote={`No ${countryWorkLabel(selectedCountry).toLowerCase()} plotted in ${selectedCountry} yet — your position is shown live.`} stops={[...(day?.point ? [{ id: 'driver', latitude: day.point.latitude, longitude: day.point.longitude, title: 'Your live position', description: 'Driver location', kind: 'driver' as const, order: 'D' }] : []), ...mapped.map((job) => ({ id: job.id, latitude: Number(job.latitude), longitude: Number(job.longitude), title: `${job.sequence}. ${job.customer}`, description: job.address, kind: job.kind, order: job.sequence, done: closed(job), color: job.status === 'failed' ? colors.danger : job.status === 'en_route' || job.status === 'arrived' ? colors.blue : undefined }))]} onStopPress={(pin) => { const job = jobs.find((item) => item.id === pin.id); if (job) openShipment(job); }} /> : <View style={styles.stopList}>{jobs.map((job) => <StopRow key={job.id} job={job} current={job.id === current?.id} onPress={() => openShipment(job)} />)}</View>}

      {current ? <View style={styles.nextCard}><View style={styles.nextHeader}><View style={styles.currentPill}><View style={styles.pulse} /><Text style={styles.currentPillText}>{current.status === 'arrived' ? 'AT CURRENT STOP' : 'NEXT STOP'}</Text></View><Text style={styles.nextSequence}>{current.sequence} / {jobs.length}</Text></View><Text style={styles.nextName}>{current.customer}</Text><Text style={styles.nextMeta}>{current.kind.toUpperCase()} · {current.packageCount} PACKAGE{current.packageCount === 1 ? '' : 'S'} · {current.reference}</Text><View style={styles.addressRow}><Ionicons name="location-outline" size={18} color={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.nextAddress}>{current.address || 'Address unavailable'}</Text><Text style={styles.nextEta}>{formatTime(current.eta)}{current.priority !== 'normal' ? ` · ${current.priority.toUpperCase()} PRIORITY` : ''}</Text></View></View>{current.instructions ? <View style={styles.instructions}><Ionicons name="information-circle-outline" size={17} color={colors.amber} /><Text style={styles.instructionsText}>{current.instructions}</Text></View> : null}<Pressable style={styles.shipmentButton} onPress={() => openShipment(current)}><Ionicons name="cube-outline" size={18} color={colors.primaryDark} /><Text style={styles.shipmentButtonText}>OPEN SHIPMENT DETAILS</Text><Ionicons name="chevron-forward" size={17} color={colors.primaryDark} /></Pressable><View style={styles.nextActions}><Pressable accessibilityRole="button" accessibilityLabel="Call customer" style={styles.smallAction} onPress={() => openDriverContact('call', current.phone)}><Ionicons name="call-outline" size={19} color={colors.primary} /><Text style={styles.smallActionText}>CALL</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Message customer on WhatsApp" style={styles.smallAction} onPress={() => openDriverContact('whatsapp', current.phone)}><Ionicons name="logo-whatsapp" size={19} color={colors.primary} /><Text style={styles.smallActionText}>MESSAGE</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Navigate to customer address" style={styles.navigateButton} onPress={() => chooseNavigation(current)}><Ionicons name="navigate" size={19} color={colors.white} /><Text style={styles.navigateText}>NAVIGATE</Text></Pressable></View></View> : null}
      

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickGrid}><Quick icon="map-outline" label="View route" onPress={() => quickAction('Route')} />{selectedCountry === 'Zimbabwe' ? null : <Quick icon="calendar-outline" label="Collections ahead" onPress={() => navigation.navigate('Route', { screen: 'CollectionsAhead' })} />}<Quick icon="alert-circle-outline" label="Report issue" onPress={() => quickAction('Messages')} danger /><Quick icon="headset-outline" label="Contact dispatch" onPress={() => quickAction('dispatch')} /></View>
    </ScrollView>
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
