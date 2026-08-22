import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RunMap, { type RunMapStop } from '../components/RunMap';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

type RunRow = { id: string; driver_id: string; run_date: string; route_name: string | null; status: string };
type StopRow = { id: string; run_id: string; shipment_id: string; stop_order: number; stop_type: string; status: string; latitude: number; longitude: number; address: string | null };
type ShipmentRow = { id: string; tracking_number: string | null; customer_reference: string | null; pickup_latitude: number | null; pickup_longitude: number | null; metadata: Record<string, any> | null; updated_at: string };
type LocationRow = { driver_id: string; latitude: number; longitude: number; accuracy_m: number | null; recorded_at: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

function shipmentLabel(row: ShipmentRow | undefined) {
  return row?.tracking_number || row?.customer_reference || 'Collection';
}

function collectionAddress(row: ShipmentRow) {
  const metadata = row.metadata || {};
  const sender = metadata.senderDetails || metadata.sender || metadata.sender_details || {};
  return [
    sender.address || metadata.pickupAddress,
    sender.city || metadata.pickupCity,
    sender.postcode || sender.postalCode || metadata.pickupPostcode || metadata.postcode,
  ].filter(Boolean).join(', ') || `${Number(row.pickup_latitude).toFixed(5)}, ${Number(row.pickup_longitude).toFixed(5)}`;
}

export default function MapPreviewScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeLabel, setRouteLabel] = useState('Latest mapped route');
  const [driverStops, setDriverStops] = useState<RunMapStop[]>([]);
  const [adminStops, setAdminStops] = useState<RunMapStop[]>([]);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    try {
      const runResult = await supabase
        .from('driver_runs')
        .select('id,driver_id,run_date,route_name,status')
        .order('run_date', { ascending: false })
        .limit(40);
      if (runResult.error) throw runResult.error;
      const runs = (runResult.data || []) as RunRow[];

      let stops: StopRow[] = [];
      if (runs.length) {
        const stopResult = await supabase
          .from('driver_run_stops')
          .select('id,run_id,shipment_id,stop_order,stop_type,status,latitude,longitude,address')
          .in('run_id', runs.map((run) => run.id))
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('stop_order');
        if (stopResult.error) throw stopResult.error;
        stops = (stopResult.data || []) as StopRow[];
      }

      const shipmentIds = [...new Set(stops.map((stop) => stop.shipment_id))];
      let shipments: ShipmentRow[] = [];
      if (shipmentIds.length) {
        const shipmentResult = await supabase
          .from('shipments')
          .select('id,tracking_number,customer_reference,pickup_latitude,pickup_longitude,metadata,updated_at')
          .in('id', shipmentIds);
        if (shipmentResult.error) throw shipmentResult.error;
        shipments = (shipmentResult.data || []) as ShipmentRow[];
      }

      const selectedRun = runs.find((run) => stops.some((stop) => stop.run_id === run.id));
      let routePins: RunMapStop[] = [];
      if (selectedRun) {
        setRouteLabel(`${selectedRun.route_name || 'Assigned route'} · ${selectedRun.run_date}`);
        routePins = stops
          .filter((stop) => stop.run_id === selectedRun.id)
          .map((stop) => {
            const shipment = shipments.find((row) => row.id === stop.shipment_id);
            return {
              id: stop.id,
              latitude: Number(stop.latitude),
              longitude: Number(stop.longitude),
              title: `${stop.stop_order}. ${shipmentLabel(shipment)}`,
              description: stop.address || 'Address available in stop details',
              kind: stop.stop_type === 'delivery' ? 'delivery' as const : 'collection' as const,
              order: stop.stop_order,
              done: stop.status === 'completed' || stop.status === 'failed',
            };
          });
      } else {
        const fallbackResult = await supabase
          .from('shipments')
          .select('id,tracking_number,customer_reference,pickup_latitude,pickup_longitude,metadata,updated_at')
          .not('pickup_latitude', 'is', null)
          .not('pickup_longitude', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(20);
        if (fallbackResult.error) throw fallbackResult.error;
        shipments = (fallbackResult.data || []) as ShipmentRow[];
        setRouteLabel('Latest mapped collection bookings');
        routePins = shipments.map((shipment, index) => ({
          id: shipment.id,
          latitude: Number(shipment.pickup_latitude),
          longitude: Number(shipment.pickup_longitude),
          title: `${index + 1}. ${shipmentLabel(shipment)}`,
          description: collectionAddress(shipment),
          kind: 'collection' as const,
          order: index + 1,
        }));
      }

      const locationResult = await supabase
        .from('driver_live_locations')
        .select('driver_id,latitude,longitude,accuracy_m,recorded_at')
        .gte('recorded_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());
      const locations = locationResult.error ? [] : ((locationResult.data || []) as LocationRow[]);
      const driverIds = [...new Set(locations.map((location) => location.driver_id))];
      let profiles: ProfileRow[] = [];
      if (driverIds.length) {
        const profileResult = await supabase.from('profiles').select('id,full_name,email').in('id', driverIds);
        profiles = profileResult.error ? [] : ((profileResult.data || []) as ProfileRow[]);
      }
      const driverPins: RunMapStop[] = locations.map((location) => {
        const profile = profiles.find((row) => row.id === location.driver_id);
        return {
          id: `driver-${location.driver_id}`,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          title: location.driver_id === session.user.id ? 'You are here' : (profile?.full_name || profile?.email || 'Driver'),
          description: `Last reported ${new Date(location.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${location.accuracy_m ? ` · ±${Math.round(location.accuracy_m)} m` : ''}`,
          kind: 'driver',
          order: 'D',
        };
      });

      const selectedDriver = selectedRun?.driver_id;
      const routeDriverPins = driverPins.filter((pin) => pin.id === `driver-${selectedDriver}` || pin.id === `driver-${session.user.id}`);
      setDriverStops([...routeDriverPins, ...routePins]);
      setAdminStops([...routePins, ...driverPins]);
    } catch (e: any) {
      setError(e?.message || 'Could not load live map data.');
      setDriverStops([]);
      setAdminStops([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => { load(); }, [load]);
  const mappedCount = useMemo(() => adminStops.filter((stop) => stop.kind !== 'driver').length, [adminStops]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <Text style={styles.eyebrow}>LIVE DATA PREVIEW</Text>
        <Text style={styles.title}>Collections maps</Text>
        <Text style={styles.subtitle}>{routeLabel} · {mappedCount} mapped stop{mappedCount === 1 ? '' : 's'}</Text>

        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.cardText}>Loading live collection coordinates…</Text></View> : null}
        {error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Live map unavailable</Text><Text style={styles.cardText}>{error}</Text><Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
        {!loading && !error && mappedCount === 0 ? <View style={styles.errorCard}><Text style={styles.errorTitle}>No real mapped collections yet</Text><Text style={styles.cardText}>Assign and geocode a driver run, or open Collections on a driver’s phone to resolve collection coordinates. Demo pins are no longer shown.</Text></View> : null}

        {!loading && !error && mappedCount > 0 ? <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver view</Text>
            <Text style={styles.cardText}>The selected live route, with the assigned driver’s latest position when available.</Text>
            <RunMap height={300} stops={driverStops} focusStopId={driverStops.find((stop) => stop.kind !== 'driver' && !stop.done)?.id || null} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin dispatch view</Text>
            <Text style={styles.cardText}>The same real stops plus every driver position reported in the last 12 hours.</Text>
            <RunMap height={340} stops={adminStops} />
          </View>
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: -8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: -10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cardText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  errorTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  retry: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: '800' },
});
