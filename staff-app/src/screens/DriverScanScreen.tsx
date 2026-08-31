import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { getDriverLocation } from '../lib/driverLocation';
import { BACKEND_PENDING_MESSAGE, enqueue, flushQueue, isMissingBackend, isNetworkError, queueCount } from '../lib/offlineQueue';
import { colors, radius, shadow, spacing } from '../theme';
import { useDriverCountry } from '../context/DriverCountryContext';

export default function DriverScanScreen() {
  const {country}=useDriverCountry();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [finder, setFinder] = useState('');
  const [finding, setFinding] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => { void queueCount().then(setPending); }, []);

  const sync = async () => {
    setFinding(true);
    try {
      const outcome = await flushQueue();
      setPending(outcome.remaining);
      if (outcome.flushed) Alert.alert('Synced', `${outcome.flushed} saved package action${outcome.flushed === 1 ? '' : 's'} uploaded.`);
    } finally { setFinding(false); }
  };

  const findPackages = async () => {
    const query = finder.trim();
    if (query.length < 2) return;
    setFinding(true); setSearched(true); setResults([]);
    try {
      if(!country){Alert.alert('Choose a country','Open Home and choose the country for this shift before searching packages.');return;}
      const { data, error } = await supabase.rpc('search_driver_packages_for_country', { p_query: query, p_limit: 20, p_country: country });
      if (error) throw error;
      setResults(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert(
        'Search unavailable',
        isMissingBackend(e) ? BACKEND_PENDING_MESSAGE
          : 'We couldn’t search assigned packages. Check your connection and try again.',
      );
      console.warn('Driver package finder failed', e?.message || e);
    } finally { setFinding(false); }
  };

  const scan = async (raw: string) => {
    const code = raw.trim();
    if (!code || busy || locked) return;
    if(!country){Alert.alert('Choose a country','Open Home and choose the country for this shift before scanning packages.');return;}
    setBusy(true); setLocked(true); setLast(null);
    const args = { p_package_code: code, p_stop_id: null, p_country: country, p_scan_type: country==='Zimbabwe'?'delivery':'collection', p_latitude: null as number|null, p_longitude: null as number|null };
    try {
      const location = await getDriverLocation().catch(() => ({ point: null }));
      args.p_latitude=location.point?.latitude??null;args.p_longitude=location.point?.longitude??null;
      const { data, error } = await supabase.rpc('scan_driver_package_for_country', args);
      if (error) throw error;
      setLast(data); setManual('');
    } catch (e: any) {
      if (isNetworkError(e)) {
        await enqueue({ fn: 'scan_driver_package_for_country', stopId: null, args: { ...args, p_latitude:null,p_longitude:null } });
        const count = await queueCount(); setPending(count); setManual('');
        setLast({ packageCode: code, status: 'saved offline', queued: true });
      } else if (isMissingBackend(e)) {
        // Nothing to queue against: an unverified scan must never be recorded
        // as if the label had been checked.
        Alert.alert('Scanning not available', `${BACKEND_PENDING_MESSAGE} Check package labels against the paperwork until then.`);
        console.warn('Package scan backend missing', e?.message || e);
      } else {
        const wrong = /wrong package|not assigned/i.test(e?.message || '');
        Alert.alert(wrong ? 'Wrong package' : 'Package not verified', wrong ? 'This package belongs to another booking or route. Keep it separate and contact dispatch.' : 'We couldn’t verify this label. Check the package code and try again.');
        console.warn('Package scan failed', e?.message || e);
      }
    } finally { setBusy(false); setTimeout(() => setLocked(false), 1200); }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><View><Text style={styles.eyebrow}>PACKAGE CONTROL · {(country||'NO COUNTRY').toUpperCase()}</Text><Text style={styles.title}>Scan package</Text><Text style={styles.subtitle}>Verify every label before it enters your vehicle.</Text></View><View style={styles.headerIcon}><Ionicons name="scan" size={25} color={colors.primary} /></View></View>
    <View style={styles.statusCard}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /><Text style={styles.statusText}>{country?`Only ${country} ${country==='Zimbabwe'?'delivery':'collection'} packages assigned to this driver are accepted.`:'Choose a country from Home before scanning.'}</Text></View>
    {pending ? <Pressable style={styles.offlineCard} onPress={sync} disabled={finding}><Ionicons name="cloud-offline-outline" size={20} color={colors.amber} /><View style={{ flex: 1 }}><Text style={styles.offlineTitle}>OFFLINE · CHANGES SAVED ON DEVICE</Text><Text style={styles.offlineText}>{pending} action{pending === 1 ? '' : 's'} waiting to sync. Tap when connected.</Text></View>{finding ? <ActivityIndicator color={colors.amber} /> : <Ionicons name="sync" size={20} color={colors.amber} />}</Pressable> : null}
    {!permission?.granted ? <View style={styles.permission}><View style={styles.permissionIcon}><Ionicons name="camera-outline" size={36} color={colors.primary} /></View><Text style={styles.permissionTitle}>Camera access required</Text><Text style={styles.permissionText}>Allow camera access to scan QR codes and barcodes on shipment labels.</Text><Pressable style={styles.primary} onPress={requestPermission}><Text style={styles.primaryText}>ALLOW CAMERA</Text></Pressable></View> : <View style={styles.cameraCard}><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] }} onBarcodeScanned={({ data }) => scan(data)}><View style={styles.overlay}><View style={styles.scanFrame}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} /></View><Text style={styles.cameraHint}>{busy ? 'VERIFYING PACKAGE…' : 'ALIGN LABEL INSIDE FRAME'}</Text></View></CameraView></View>}
    <View style={styles.manualCard}><Text style={styles.label}>ENTER PACKAGE ID MANUALLY</Text><View style={styles.manualRow}><TextInput style={styles.input} value={manual} onChangeText={setManual} autoCapitalize="characters" placeholder="e.g. ZS-0826-28382-01" placeholderTextColor={colors.textFaint} onSubmitEditing={() => scan(manual)} /><Pressable style={[styles.verify, (!manual.trim() || busy) && styles.disabled]} disabled={!manual.trim() || busy} onPress={() => scan(manual)}>{busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-forward" size={22} color={colors.white} />}</Pressable></View></View>
    {last ? <View style={styles.success}><View style={styles.successIcon}><Ionicons name={last.queued ? 'cloud-offline-outline' : 'checkmark'} size={28} color={colors.white} /></View><Text style={styles.successTitle}>{last.queued ? 'Scan saved on device' : 'Package verified'}</Text><Text style={styles.packageCode}>{last.packageCode}</Text><Text style={styles.successMeta}>Status: {String(last.status || 'loaded').replace('_', ' ')}</Text>{last.bay || last.shelf ? <View style={styles.location}><Ionicons name="file-tray-stacked-outline" size={18} color={colors.primaryDark} /><Text style={styles.locationText}>{[last.bay && `Bay ${last.bay}`, last.shelf && `Shelf ${last.shelf}`].filter(Boolean).join(' · ')}</Text></View> : null}<Pressable style={styles.scanAnother} onPress={() => { setLast(null); setLocked(false); }}><Text style={styles.scanAnotherText}>SCAN ANOTHER</Text></Pressable></View> : null}
    <View style={styles.finderCard}><View style={styles.finderHead}><View><Text style={styles.label}>PACKAGE FINDER</Text><Text style={styles.helpText}>Search your assigned route only.</Text></View><Ionicons name="search" size={20} color={colors.primary} /></View><View style={styles.manualRow}><TextInput style={styles.input} value={finder} onChangeText={(value) => { setFinder(value); setSearched(false); }} placeholder="Customer, booking, tracking, package or address" placeholderTextColor={colors.textFaint} returnKeyType="search" onSubmitEditing={findPackages} /><Pressable style={[styles.verify, (finder.trim().length < 2 || finding) && styles.disabled]} disabled={finder.trim().length < 2 || finding} onPress={findPackages}>{finding ? <ActivityIndicator color={colors.white} /> : <Ionicons name="search" size={20} color={colors.white} />}</Pressable></View>{searched && !finding && results.length === 0 ? <Text style={styles.emptyText}>No assigned packages match this search.</Text> : results.map((item) => <Pressable key={item.packageId} style={styles.result} onPress={() => { setManual(item.packageCode); setResults([]); }}><View style={styles.resultIcon}><Ionicons name="cube-outline" size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.resultCode}>{item.packageCode}</Text><Text style={styles.resultMeta}>{item.customerName} · {item.reference}</Text><Text style={styles.resultAddress} numberOfLines={1}>{item.address || 'Address unavailable'}</Text></View><View style={styles.position}><Text style={styles.positionText}>{[item.bay && `BAY ${item.bay}`, item.shelf && `SHELF ${item.shelf}`].filter(Boolean).join('\n') || String(item.status || 'expected').toUpperCase()}</Text></View></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 2 }, subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, statusCard: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md }, statusText: { flex: 1, color: colors.primaryDark, fontSize: 11.5, fontWeight: '700' },
  offlineCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: '#F5D48A', borderRadius: radius.md, padding: spacing.md }, offlineTitle: { color: colors.amber, fontWeight: '900', fontSize: 10 }, offlineText: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  cameraCard: { height: 340, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#081722', ...shadow }, camera: { flex: 1 }, overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.18)' }, scanFrame: { width: 260, height: 150, position: 'relative' }, corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.white }, tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4 }, tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4 }, bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4 }, br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4 }, cameraHint: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: spacing.lg, backgroundColor: 'rgba(0,0,0,.55)', paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  permission: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, alignItems: 'center' }, permissionIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, permissionTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginTop: spacing.md }, permissionText: { color: colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 }, primary: { minHeight: 48, backgroundColor: colors.primary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', marginTop: spacing.lg }, primaryText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  manualCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md }, label: { color: colors.textMuted, fontWeight: '900', fontSize: 9.5, letterSpacing: .8 }, manualRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 8 }, input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, color: colors.text, fontSize: 13, fontWeight: '700' }, verify: { width: 50, minHeight: 48, backgroundColor: colors.primary, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .45 },
  success: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, padding: spacing.xl, alignItems: 'center' }, successIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, successTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: '900', marginTop: spacing.md }, packageCode: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: .5, marginTop: 5 }, successMeta: { color: colors.textMuted, fontSize: 11.5, textTransform: 'capitalize', marginTop: 3 }, location: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.primarySoft, padding: 10, borderRadius: radius.sm, marginTop: spacing.md }, locationText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 }, scanAnother: { marginTop: spacing.lg, minHeight: 42, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }, scanAnotherText: { color: colors.primary, fontWeight: '900', fontSize: 11 },
  finderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm }, finderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, helpText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 }, emptyText: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center', paddingVertical: spacing.md }, result: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm }, resultIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, resultCode: { color: colors.text, fontSize: 12.5, fontWeight: '900' }, resultMeta: { color: colors.primaryDark, fontSize: 10.5, fontWeight: '700', marginTop: 1 }, resultAddress: { color: colors.textMuted, fontSize: 10, marginTop: 1 }, position: { maxWidth: 76, backgroundColor: colors.primarySoft, borderRadius: 8, padding: 6 }, positionText: { color: colors.primaryDark, textAlign: 'center', fontSize: 8.5, fontWeight: '900', lineHeight: 12 },
});
