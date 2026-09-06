import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getDriverLocation } from '../lib/driverLocation';
import { BACKEND_PENDING_MESSAGE, isMissingBackend } from '../lib/offlineQueue';
import { BackButton } from '../components/adminui';
import { colors, radius, spacing } from '../theme';

export default function DriverDepotHandoverScreen() {
  const { session } = useAuth();
  const [run, setRun] = useState<any>(null);
  const [handover, setHandover] = useState<any>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const route = await supabase.from('driver_runs').select('id,route_name,status,depot_id,returning_to_depot_at,depot_arrived_at,handover_completed_at,depot:depots(name,address,latitude,longitude)').eq('driver_id', session.user.id).order('run_date', { ascending: false }).limit(1).maybeSingle();
    setRun(route.data);
    if (route.data) { const record = await supabase.from('depot_handovers').select('*').eq('route_id', route.data.id).maybeSingle(); setHandover(record.data); }
    setLoading(false);
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const call = async (name: string, args: any, success: string) => {
    setBusy(name);
    try { const result = await supabase.rpc(name, args); if (result.error) throw result.error; Alert.alert(success, name === 'complete_driver_depot_handover' ? 'Every expected package has been reconciled and the route is complete.' : 'The route and dispatch view have been updated.'); await load(); }
    catch (e: any) { console.warn('Depot workflow failed', e?.message || e); Alert.alert('Action not completed', isMissingBackend(e) ? BACKEND_PENDING_MESSAGE : /reconciliation incomplete/i.test(e?.message || '') ? e.message : 'Check your connection and package totals, then try again.'); }
    finally { setBusy(null); }
  };
  const scan = async () => {
    if (!code.trim()) return;
    setBusy('scan');
    try { const location = await getDriverLocation().catch(() => ({ point: null })); const result = await supabase.rpc('scan_driver_package', { p_package_code: code.trim(), p_stop_id: null, p_scan_type: 'depot_handover', p_latitude: location.point?.latitude ?? null, p_longitude: location.point?.longitude ?? null, p_override_reason: null }); if (result.error) throw result.error; setCode(''); await load(); }
    catch (e: any) { Alert.alert('Package not accepted', isMissingBackend(e) ? BACKEND_PENDING_MESSAGE : /not assigned|wrong package/i.test(e?.message || '') ? 'This package is not assigned to your route.' : 'Check the package label and try again.'); }
    finally { setBusy(null); }
  };
  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  if (!run) return <SafeAreaView style={styles.center}><Ionicons name="business-outline" size={42} color={colors.textFaint} /><Text style={styles.title}>No route to hand over</Text><Text style={styles.sub}>A collection route will appear here after it is assigned.</Text></SafeAreaView>;
  const depot = Array.isArray(run.depot) ? run.depot[0] : run.depot;
  const started = Boolean(run.returning_to_depot_at);
  const arrived = Boolean(run.depot_arrived_at);
  const done = Boolean(run.handover_completed_at);
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <BackButton style={{ marginBottom: 10 }} /><Text style={styles.eyebrow}>WAREHOUSE RECONCILIATION</Text><Text style={styles.title}>Return to depot</Text><Text style={styles.sub}>{run.route_name || 'Today’s collection route'}</Text>
    <View style={styles.card}><View style={styles.step}><Ionicons name={started ? 'checkmark-circle' : 'navigate-circle-outline'} size={26} color={started ? colors.primary : colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.stepTitle}>1. Return to depot</Text><Text style={styles.stepSub}>{depot?.name || 'Zimbabwe Shipping depot'} · {depot?.address || 'Depot address managed by dispatch'}</Text></View></View>{depot?.address ? <Pressable style={styles.outline} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(depot.address)}&travelmode=driving`)}><Ionicons name="navigate" size={18} color={colors.primary} /><Text style={styles.outlineText}>NAVIGATE TO DEPOT</Text></Pressable> : null}{!started ? <Pressable style={styles.primary} onPress={() => call('start_driver_return_to_depot', { p_route_id: run.id }, 'Return started')}><Text style={styles.primaryText}>START RETURN TO DEPOT</Text></Pressable> : null}</View>
    {started ? <View style={styles.card}><View style={styles.step}><Ionicons name={arrived ? 'checkmark-circle' : 'location-outline'} size={26} color={arrived ? colors.primary : colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.stepTitle}>2. Arrive safely</Text><Text style={styles.stepSub}>Confirm only after the vehicle is parked at the depot.</Text></View></View>{!arrived ? <Pressable style={styles.primary} onPress={async () => { const location = await getDriverLocation().catch(() => ({ point: null })); void call('arrive_driver_depot', { p_route_id: run.id, p_latitude: location.point?.latitude ?? null, p_longitude: location.point?.longitude ?? null }, 'Depot arrival recorded'); }}><Text style={styles.primaryText}>I’VE ARRIVED AT DEPOT</Text></Pressable> : null}</View> : null}
    {arrived && !done ? <View style={styles.card}><Text style={styles.stepTitle}>3. Hand over packages</Text><View style={styles.countRow}><View><Text style={styles.count}>{handover?.expected_count ?? 0}</Text><Text style={styles.countLabel}>EXPECTED</Text></View><Ionicons name="arrow-forward" size={21} color={colors.textFaint} /><View><Text style={styles.count}>{handover?.scanned_count ?? 0}</Text><Text style={styles.countLabel}>SCANNED IN</Text></View></View><View style={styles.inputRow}><TextInput style={styles.input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Scan or enter package ID" placeholderTextColor={colors.textFaint} onSubmitEditing={scan} /><Pressable style={styles.scanButton} onPress={scan} disabled={!code.trim() || busy === 'scan'}>{busy === 'scan' ? <ActivityIndicator color={colors.white} /> : <Ionicons name="scan" size={22} color={colors.white} />}</Pressable></View><Text style={styles.notice}>Handover cannot close until every expected package is scanned. Only authorized warehouse or admin staff can approve a mismatch.</Text><Pressable style={styles.primary} onPress={() => Alert.alert('Complete depot handover?', `Confirm that ${handover?.expected_count ?? 0} expected packages were handed to the depot.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm handover', onPress: () => call('complete_driver_depot_handover', { p_route_id: run.id, p_override_reason: null }, 'Handover complete') }])}><Text style={styles.primaryText}>COMPLETE HANDOVER</Text></Pressable></View> : null}
    {done ? <View style={styles.done}><Ionicons name="shield-checkmark" size={44} color={colors.white} /><Text style={styles.doneTitle}>HANDOVER COMPLETE</Text><Text style={styles.doneSub}>{handover?.scanned_count ?? handover?.expected_count ?? 0} packages received into depot · Route complete</Text></View> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md }, center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 6 }, sub: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }, step: { flexDirection: 'row', alignItems: 'center', gap: 10 }, stepTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, stepSub: { color: colors.textMuted, fontSize: 11.5, lineHeight: 17, marginTop: 2 }, primary: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontWeight: '900', fontSize: 12 }, outline: { minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, outlineText: { color: colors.primary, fontWeight: '900', fontSize: 11 }, countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md }, count: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' }, countLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900' }, inputRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, color: colors.text, fontWeight: '700' }, scanButton: { width: 50, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, notice: { color: colors.amber, backgroundColor: colors.amberSoft, padding: 10, borderRadius: radius.sm, fontSize: 10.5, lineHeight: 15, fontWeight: '700' }, done: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' }, doneTitle: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 10 }, doneSub: { color: '#CDEEE2', fontSize: 11.5, textAlign: 'center', marginTop: 4 },
});
