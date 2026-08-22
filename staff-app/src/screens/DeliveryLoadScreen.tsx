import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';
import { todayLabel } from '../lib/format';
import {
  addDeliveryLoadItem, loadDeliveryDay, lookupDeliveryShipment, removeDeliveryLoadItem,
  sealStatusLabel, verificationLabel,
  type DeliveryDay, type DeliveryLookup, type SealStatus, type VerificationStatus,
} from '../lib/deliveries';

// Building the load.
//
// The driver types the customer reference off the label and the code stamped on
// the metal seal. The lookup answers two questions at once: which customer this
// is, and whether the seal in their hand is the seal that was fitted at
// collection. What that customer declared they are shipping is shown next to it
// so the goods can be checked before anything goes on the vehicle.

function base64Bytes(value: string) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function sealTone(status: SealStatus) {
  if (status === 'matched') return { bg: colors.primarySoft, fg: colors.primaryDark, icon: 'shield-checkmark' as const };
  if (status === 'mismatch') return { bg: colors.redSoft, fg: colors.danger, icon: 'alert-circle' as const };
  if (status === 'not_entered') return { bg: colors.amberSoft, fg: colors.amber, icon: 'help-circle-outline' as const };
  return { bg: '#f1f5f9', fg: '#475569', icon: 'remove-circle-outline' as const };
}

function verificationTone(status: VerificationStatus) {
  if (status === 'verified') return { bg: colors.primarySoft, fg: colors.primaryDark };
  if (status === 'rejected') return { bg: colors.redSoft, fg: colors.danger };
  return { bg: colors.amberSoft, fg: colors.amber };
}

export default function DeliveryLoadScreen() {
  const { session } = useAuth();
  const [reference, setReference] = useState('');
  const [sealCode, setSealCode] = useState('');
  const [found, setFound] = useState<DeliveryLookup | null>(null);
  const [discrepancy, setDiscrepancy] = useState('');
  const [photo, setPhoto] = useState<{ path: string; uri: string } | null>(null);
  const [day, setDay] = useState<DeliveryDay | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setDay(await loadDeliveryDay());
      setError(null);
    } catch (e: any) {
      setDay(null);
      setError(e?.message || 'Could not load your vehicle.');
    }
  }, []);

  useFocusEffect(useCallback(() => { (async () => { await load(); setLoading(false); })(); }, [load]));

  useEffect(() => {
    const channel = supabase
      .channel(`delivery-load-${session?.user.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_notes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  const reset = () => { setFound(null); setDiscrepancy(''); setPhoto(null); setSealCode(''); setReference(''); };

  const find = async () => {
    if (reference.trim().length < 3) {
      Alert.alert('Customer reference needed', 'Type the reference printed on the label or delivery note.');
      return;
    }
    setBusy('find');
    try {
      const result = await lookupDeliveryShipment(reference, sealCode);
      setFound(result);
      setDiscrepancy('');
      setPhoto(null);
    } catch (e: any) {
      setFound(null);
      Alert.alert('Consignment not found', e?.message || 'Check the reference and try again.');
    } finally {
      setBusy(null);
    }
  };

  // The photo is taken before the item joins the load, so it is uploaded to
  // storage first and attached to the stop once the stop exists.
  const takePhoto = async () => {
    if (!session?.user.id) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to photograph the goods being loaded.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.65, base64: true, exif: false });
    if (result.canceled || !result.assets[0]?.base64) return;
    setBusy('photo');
    try {
      const path = `${session.user.id}/${found?.shipmentId || 'load'}/load-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('driver-proofs')
        .upload(path, base64Bytes(result.assets[0].base64), { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      setPhoto({ path, uri: result.assets[0].uri });
    } catch (e: any) {
      Alert.alert('Photo upload failed', e?.message || 'Try again with a signal.');
    } finally {
      setBusy(null);
    }
  };

  const addToLoad = async () => {
    if (!found) return;
    if (!photo) { Alert.alert('Photograph the goods', 'A photo of the consignment being loaded is required.'); return; }
    if (found.sealStatus === 'mismatch' && !discrepancy.trim()) {
      Alert.alert('Record what you found',
        'The seal does not match the one recorded at collection. Check the goods against what this customer is shipping, then write down what you found — admin sees it before verifying the note.');
      return;
    }
    setBusy('add');
    try {
      const result = await addDeliveryLoadItem({
        shipmentId: found.shipmentId,
        enteredReference: reference || found.customerReference || '',
        sealCode,
        discrepancyNote: discrepancy,
        photoPath: photo.path,
      });
      // Attach the photo to the stop that now exists so it lands in the proof
      // trail (and the 48-hour retention sweep) with every other run photo.
      await supabase.from('driver_proofs').insert({
        shipment_id: found.shipmentId,
        stop_id: result.stopId,
        driver_id: session?.user.id,
        proof_type: 'delivery_load',
        storage_path: photo.path,
      });
      reset();
      await load();
      Alert.alert('Added to the load',
        `${result.deliveryNote.noteNumber} is now with admin for verification. You can start the run once every note is verified.`);
    } catch (e: any) {
      Alert.alert('Could not load this consignment', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const removeItem = (stopId: string, label: string) => {
    Alert.alert('Take this off the vehicle?', `${label} goes back to the warehouse and its draft delivery note is withdrawn.`, [
      { text: 'Keep it loaded', style: 'cancel' },
      {
        text: 'Unload', style: 'destructive', onPress: async () => {
          setBusy(stopId);
          try { await removeDeliveryLoadItem(stopId, 'Unloaded by driver'); await load(); }
          catch (e: any) { Alert.alert('Could not unload', e?.message || 'Please try again.'); }
          finally { setBusy(null); }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  const items = day?.items || [];
  const verified = items.filter((item) => item.verificationStatus === 'verified').length;
  const rejected = items.filter((item) => item.verificationStatus === 'rejected').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <View>
          <Text style={styles.title}>Load the vehicle</Text>
          <Text style={styles.subtitle}>{todayLabel()} · {items.length} consignment{items.length === 1 ? '' : 's'} on board</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1 — identify the consignment */}
        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="search-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Find the consignment</Text>
          </View>
          <Text style={styles.help}>
            Type the customer reference from the label, and the code stamped on the metal seal. The seal is checked
            against the one fitted when the goods were collected.
          </Text>
          <Text style={styles.label}>Customer reference</Text>
          <TextInput style={styles.input} value={reference} onChangeText={setReference} autoCapitalize="characters"
            placeholder="e.g. JOH-4567 or ZS123456" placeholderTextColor={colors.textFaint} />
          <Text style={styles.label}>Metal seal code (if the consignment is sealed)</Text>
          <TextInput style={styles.input} value={sealCode} onChangeText={setSealCode} autoCapitalize="characters"
            placeholder="e.g. ZS-04521" placeholderTextColor={colors.textFaint} />
          <Pressable style={styles.primary} onPress={find} disabled={busy === 'find'}>
            {busy === 'find' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Find consignment</Text>}
          </Pressable>
        </View>

        {/* 2 — verify it against what the customer is shipping */}
        {found ? (
          <View style={styles.card}>
            <View style={styles.sectionHead}>
              <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Verify before loading</Text>
            </View>

            <Text style={styles.foundRef}>{found.customerReference || '—'} · {found.trackingNumber || 'No tracking'}</Text>
            <Text style={styles.foundName}>{found.receiverName || 'Recipient not named'}</Text>
            <Text style={styles.foundLine}>{found.deliveryAddress || 'Delivery address not recorded'}</Text>
            {found.receiverPhone ? <Text style={styles.foundLine}>{found.receiverPhone}</Text> : null}
            <Text style={styles.foundMeta}>From {found.senderName || 'sender'} · {found.status || 'status unknown'}</Text>

            <View style={[styles.sealBanner, { backgroundColor: sealTone(found.sealStatus).bg }]}>
              <Ionicons name={sealTone(found.sealStatus).icon} size={19} color={sealTone(found.sealStatus).fg} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sealTitle, { color: sealTone(found.sealStatus).fg }]}>{sealStatusLabel(found.sealStatus)}</Text>
                <Text style={styles.sealDetail}>
                  {found.recordedSealCodes.length
                    ? `Recorded at collection: ${found.recordedSealCodes.join(', ')}${found.sealCondition ? ` · ${found.sealCondition}` : ''}`
                    : found.sealsRequested > 0
                      ? `${found.sealsRequested} seal(s) were paid for but no codes were recorded at collection.`
                      : 'This customer did not buy metal seals — the reference alone identifies the goods.'}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>What this customer is shipping</Text>
            <View style={styles.declaredBox}>
              <Text style={styles.declaredText}>{found.goodsDescription || 'No description was recorded for this consignment.'}</Text>
              {found.driverCorrection ? (
                <Text style={styles.correction}>Collection driver’s correction: {found.driverCorrection}</Text>
              ) : null}
              {found.items.length ? found.items.map((item, index) => (
                <Text key={index} style={styles.declaredItem}>• {item.quantity ?? 1} × {item.description || 'Item'}</Text>
              )) : null}
            </View>

            {found.sealStatus === 'mismatch' ? (
              <>
                <View style={styles.warnBox}>
                  <Text style={styles.warnText}>
                    This seal is not the one recorded at collection. Compare the goods in front of you with the list
                    above before loading, and write down exactly what you found — admin reads this before verifying
                    the delivery note.
                  </Text>
                </View>
                <Text style={styles.label}>What did you find? (required)</Text>
                <TextInput style={[styles.input, styles.notes]} value={discrepancy} onChangeText={setDiscrepancy} multiline
                  placeholder="e.g. Seal ZS-04600 fitted, original cut. 2 drums and 1 trunk present, matches the booking."
                  placeholderTextColor={colors.textFaint} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Loading note (optional)</Text>
                <TextInput style={[styles.input, styles.notes]} value={discrepancy} onChangeText={setDiscrepancy} multiline
                  placeholder="Anything worth recording about the condition of the goods"
                  placeholderTextColor={colors.textFaint} />
              </>
            )}

            <Text style={styles.label}>Photograph of the goods (required)</Text>
            <Pressable style={[styles.photoButton, photo && styles.photoDone]} onPress={takePhoto} disabled={busy === 'photo'}>
              {busy === 'photo' ? <ActivityIndicator color={colors.primary} />
                : photo ? <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                  : <Ionicons name="camera" size={26} color={colors.textMuted} />}
              <Text style={styles.photoLabel}>{photo ? 'Retake photo of the goods' : 'Photograph the goods being loaded'}</Text>
            </Pressable>

            {found.alreadyLoaded && !found.loadedByMe ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>{found.loadedByName || 'Another driver'} already has this consignment on their vehicle.</Text>
              </View>
            ) : null}

            <Pressable style={[styles.primary, busy === 'add' && styles.disabled]} onPress={addToLoad} disabled={busy === 'add'}>
              {busy === 'add' ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.primaryText}>{found.loadedByMe ? 'Update this load entry' : 'Add to the load'}</Text>}
            </Pressable>
            <Pressable style={styles.outline} onPress={reset}><Text style={styles.outlineText}>Clear</Text></Pressable>
          </View>
        ) : null}

        {/* 3 — what is already on the vehicle */}
        <View>
          <Text style={styles.sectionLabel}>ON THE VEHICLE</Text>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={36} color={colors.primary} />
              <Text style={styles.emptyTitle}>Nothing loaded yet</Text>
              <Text style={styles.emptyText}>Find a consignment above to start building today’s delivery run.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.progressLine}>
                {verified} of {items.length} delivery note{items.length === 1 ? '' : 's'} verified
                {rejected > 0 ? ` · ${rejected} rejected` : ''}
              </Text>
              {items.map((item) => {
                const tone = verificationTone(item.verificationStatus);
                return (
                  <View key={item.stopId} style={styles.loadRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loadRef}>{item.customerReference || item.trackingNumber || '—'}</Text>
                      <Text style={styles.loadName}>{item.receiverName || 'Recipient not named'}</Text>
                      <Text style={styles.loadLine} numberOfLines={2}>{item.address || 'Address not recorded'}</Text>
                      <View style={styles.chipRow}>
                        <View style={[styles.chip, { backgroundColor: sealTone(item.sealStatus).bg }]}>
                          <Text style={[styles.chipText, { color: sealTone(item.sealStatus).fg }]}>
                            {item.sealStatus === 'matched' ? `Seal ${item.enteredSealCode}`
                              : item.sealStatus === 'mismatch' ? `Seal mismatch: ${item.enteredSealCode}`
                                : 'No seal'}
                          </Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.chipText, { color: tone.fg }]}>{verificationLabel(item.verificationStatus)}</Text>
                        </View>
                      </View>
                      {item.discrepancyNote ? <Text style={styles.discrepancy}>{item.discrepancyNote}</Text> : null}
                      {item.verificationStatus === 'rejected' && item.verificationNotes ? (
                        <Text style={styles.rejectNote}>Admin: {item.verificationNotes}</Text>
                      ) : null}
                    </View>
                    {item.stopStatus === 'planned' ? (
                      <Pressable style={styles.removeButton} hitSlop={8} disabled={busy === item.stopId}
                        onPress={() => removeItem(item.stopId, item.customerReference || item.receiverName)}>
                        {busy === item.stopId ? <ActivityIndicator size="small" color={colors.danger} />
                          : <Ionicons name="trash-outline" size={18} color={colors.danger} />}
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 88 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: spacing.sm },
  help: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  primary: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  outline: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  outlineText: { color: colors.textMuted, fontWeight: '800', fontSize: 12.5 },
  disabled: { opacity: 0.55 },
  foundRef: { fontSize: 11.5, fontWeight: '800', color: colors.primary },
  foundName: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  foundLine: { fontSize: 12.5, color: colors.text, lineHeight: 18 },
  foundMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  sealBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  sealTitle: { fontSize: 13, fontWeight: '800' },
  sealDetail: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  declaredBox: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 3 },
  declaredText: { fontSize: 13, lineHeight: 19, color: colors.text },
  declaredItem: { fontSize: 12.5, color: colors.text, lineHeight: 18 },
  correction: { fontSize: 12, color: colors.amber, lineHeight: 17, marginTop: 2 },
  warnBox: { backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#fecaca', borderRadius: radius.md, padding: spacing.md },
  warnText: { fontSize: 12, color: '#991b1b', lineHeight: 17 },
  photoButton: { minHeight: 118, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, overflow: 'hidden' },
  photoDone: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  thumbnail: { width: '100%', height: 76, borderRadius: radius.sm, marginBottom: 5 },
  photoLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  errorCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.redSoft },
  errorText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 17 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 34, ...shadow },
  emptyTitle: { fontSize: 15.5, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  progressLine: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  loadRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  loadRef: { fontSize: 10.5, fontWeight: '800', color: colors.primary },
  loadName: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 1 },
  loadLine: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 9.5, fontWeight: '800' },
  discrepancy: { fontSize: 11, color: colors.amber, lineHeight: 16, marginTop: 5 },
  rejectNote: { fontSize: 11, color: colors.danger, fontWeight: '700', lineHeight: 16, marginTop: 3 },
  removeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redSoft },
});
