import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import type { DriverStackParams } from '../navigation/types';
import SignaturePad from '../components/SignaturePad';
import { getDriverLocation } from '../lib/driverLocation';
import { getStaffBusinessConfig } from '../lib/businessConfig';
import { calculateTotals, invoiceSymbol } from '../lib/invoice';
import { enqueue, isMissingBackend, isNetworkError } from '../lib/offlineQueue';
import { flushPhotoQueue, queuePhoto } from '../lib/photoQueue';

// React Native bundles local images as numeric module references.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const collectionBoxesImage = require('../../assets/driver/collection-boxes.png');

type Props = NativeStackScreenProps<DriverStackParams, 'StopWorkflow'>;
type ProofType = 'pickup_departure' | 'depot_arrival' | 'depot_departure' | 'delivery_arrival' | 'seal';

interface Proof { id: string; proof_type: ProofType; storage_path: string; signedUrl?: string; }
interface LineItem { description: string; quantity: string; unitPrice: string; }
function qrToken(value:string){const text=value.trim();try{const url=new URL(text);return url.searchParams.get('token')||url.searchParams.get('qr')||url.pathname.split('/').filter(Boolean).pop()||text}catch{return text}}

function base64Bytes(value: string) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function CollectionScannerScreen({ route, navigation }: Props) {
  const { stop } = route.params;
  const { session } = useAuth();
  const pickup = stop.kind === 'collection';
  const [items, setItems] = useState<LineItem[]>([{ description: 'Shipping and collection service', quantity: '1', unitPrice: '' }]);
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('0');
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [qrVerified,setQrVerified]=useState(false);const[manualQr,setManualQr]=useState('');const[permission,requestPermission]=useCameraPermissions();
  // The shipment opens on the scan OR on the six-digit code. A customer with a
  // flat phone, or one who left the parcels with a neighbour and read the code
  // out, must not be an uncollectable job.
  const [codeVerified, setCodeVerified] = useState(false);
  const [openCode, setOpenCode] = useState('');
  const unlocked = qrVerified || codeVerified;
  // Once the driver confirms, the invoice is theirs no longer.
  const [invoiceLocked, setInvoiceLocked] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on collection');
  // Booked shipments carry a server-priced invoice — the driver can correct
  // wording only; quantities, prices, tax and totals are locked.
  const [serverPriced, setServerPriced] = useState(false);
  const [goodsDescription, setGoodsDescription] = useState<string>('');
  const [savedCorrection, setSavedCorrection] = useState<string>('');
  const [correction, setCorrection] = useState('');
  const [sealsRequested, setSealsRequested] = useState(0);
  const [sealsUsed, setSealsUsed] = useState(false);
  const [sealCodes, setSealCodes] = useState<string[]>([]);
  const sealConditions=getStaffBusinessConfig()?.operations.sealConditions||[];
  const [sealCondition, setSealCondition] = useState<string>(sealConditions[0]||'');
  const [sealNotes, setSealNotes] = useState('');
  const [sealsSaved, setSealsSaved] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [recipientName, setRecipientName] = useState(stop.customerName || '');
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [signatureAccepted, setSignatureAccepted] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const draftKey = `driver_handover_draft:${stop.id}`;

  useEffect(() => { navigation.setOptions({ title: pickup ? 'Proof of Collection' : 'Proof of Delivery' }); }, [navigation, pickup]);

  // Anything photographed in a dead zone goes up as soon as this screen opens
  // with signal. Best effort on purpose — a driver mid-collection should never
  // be interrupted by an old photo failing to upload.
  useEffect(() => {
    let cancelled = false;
    flushPhotoQueue()
      .then((result) => { if (!cancelled && result.uploaded > 0) void load(); })
      .catch(() => undefined);
    return () => { cancelled = true; };
    // load is stable enough here; re-running on every load identity change
    // would retry the queue on each refresh for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const [invoiceResult, proofResult, stopResult, shipmentResult, sealResult, signatureResult] = await Promise.all([
      supabase.from('driver_invoices').select('id,currency,line_items,discount,tax,notes').eq('stop_id', stop.id).maybeSingle(),
      supabase.from('driver_proofs').select('id,proof_type,storage_path').eq('stop_id', stop.id).is('deleted_at', null).order('captured_at'),
      supabase.from('driver_run_stops').select('qr_verified_at,code_verified_at').eq('id',stop.id).maybeSingle(),
      supabase.from('shipments').select('goods_description,driver_description_correction,seals_requested,metadata').eq('id', stop.shipmentId).maybeSingle(),
      supabase.from('shipment_seals').select('*').eq('shipment_id', stop.shipmentId).maybeSingle(),
      supabase.from('driver_signatures').select('recipient_name').eq('stop_id', stop.id).maybeSingle(),
    ]);

    const shipment: any = shipmentResult.data || {};
    const metaInvoice = shipment.metadata?.invoice;
    const metaItems = Array.isArray(metaInvoice?.items) ? metaInvoice.items : [];
    setGoodsDescription(shipment.goods_description || shipment.metadata?.shipment?.description || '');
    setSavedCorrection(shipment.driver_description_correction || '');
    setSealsRequested(Number(shipment.seals_requested || shipment.metadata?.sealsRequested || 0));

    if (invoiceResult.data) {
      const inv: any = invoiceResult.data;
      const savedItems = Array.isArray(inv.line_items) ? inv.line_items : [];
      setInvoiceId(inv.id); if (savedItems.length) setItems(savedItems.map((item:any) => ({ description:item.description || '', quantity:String(item.quantity || 1), unitPrice:String(item.unitPrice ?? '') })));
      setDiscount(String(inv.discount || 0)); setCurrency(inv.currency || 'GBP'); setNotes(inv.notes || '');
      setServerPriced(metaItems.length > 0);
    } else if (metaItems.length > 0) {
      setServerPriced(true);
      setItems(metaItems.map((item: any) => ({ description: item.description || '', quantity: String(item.quantity || 1), unitPrice: String(item.unitPrice ?? 0) })));
      setDiscount(String(metaInvoice.discount || 0));
      setTaxRate(String(metaInvoice.taxRate || 0));
      setCurrency(metaInvoice.currency || 'GBP');
    }

    if (sealResult.data) {
      const seal: any = sealResult.data;
      setSealsUsed(Boolean(seal.seals_used));
      setSealCodes(Array.isArray(seal.seal_codes) ? seal.seal_codes : []);
      setSealCondition(sealConditions.includes(seal.condition) ? seal.condition : (sealConditions[0]||''));
      setSealNotes(seal.notes || '');
      setSealsSaved(true);
    } else if (Number(shipment.seals_requested || 0) > 0) {
      setSealsUsed(true);
      setSealCodes((current) => current.length ? current : Array(Number(shipment.seals_requested)).fill(''));
    }

    const rows = (proofResult.data || []) as Proof[];
    const withUrls = await Promise.all(rows.map(async (proof) => {
      const { data } = await supabase.storage.from('driver-proofs').createSignedUrl(proof.storage_path, 3600);
      return { ...proof, signedUrl: data?.signedUrl };
    }));
    setProofs(withUrls);
    setQrVerified(Boolean((stopResult.data as any)?.qr_verified_at));
    setCodeVerified(Boolean((stopResult.data as any)?.code_verified_at));
    setInvoiceLocked(Boolean(metaInvoice?.driverConfirmedAt));
    if (signatureResult.data) { setRecipientName((signatureResult.data as any).recipient_name || stop.customerName); setSignatureSaved(true); setSignatureAccepted(true); }
  }, [stop.id, stop.shipmentId]);

  /** Open the shipment with the customer's six-digit code instead of the scan. */
  const verifyCode = async (value: string) => {
    const digits = value.trim();
    if (digits.length !== 6) {
      Alert.alert('Six digits needed', 'Ask the customer for the six-digit code shown on this shipment in their app.');
      return;
    }
    setBusy('code');
    try {
      const { error } = await supabase.rpc('verify_driver_stop_code', { p_stop_id: stop.id, p_code: digits });
      if (error) throw error;
      setCodeVerified(true);
      setCode(digits);
      Alert.alert('Shipment opened', 'The code matches this shipment. Carry on with the handover.');
    } catch (e: any) {
      Alert.alert('Code did not match', e?.message || 'Check the code on the customer’s shipment and try again.');
    } finally { setBusy(null); }
  };

  const verifyQr=async(value:string)=>{if(!value.trim())return;setBusy('qr');try{const{error}=await supabase.rpc('verify_driver_stop_qr',{p_stop_id:stop.id,p_qr_token:qrToken(value)});if(error)throw error;setQrVerified(true);Alert.alert('Customer signature verified','The shipment QR matches this assigned stop.');}catch(e:any){Alert.alert('QR verification failed',e?.message||'Scan the customer shipment QR code again.');}finally{setBusy(null);}};

  useEffect(() => { (async () => {
    await load();
    const saved = await AsyncStorage.getItem(draftKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (Array.isArray(draft.items) && draft.items.length) setItems(draft.items);
        if (typeof draft.discount === 'string') setDiscount(draft.discount);
        if (typeof draft.taxRate === 'string') setTaxRate(draft.taxRate);
        if (typeof draft.currency === 'string') setCurrency(draft.currency);
        if (typeof draft.notes === 'string') setNotes(draft.notes);
        if (typeof draft.correction === 'string') setCorrection(draft.correction);
        if (typeof draft.sealsUsed === 'boolean') setSealsUsed(draft.sealsUsed);
        if (Array.isArray(draft.sealCodes)) setSealCodes(draft.sealCodes);
        if (sealConditions.includes(draft.sealCondition)) setSealCondition(draft.sealCondition);
        if (typeof draft.sealNotes === 'string') setSealNotes(draft.sealNotes);
      } catch { await AsyncStorage.removeItem(draftKey); }
    }
    setDraftReady(true);
  })(); }, [draftKey, load]);

  useEffect(() => {
    if (!draftReady) return;
    const timer = setTimeout(() => { AsyncStorage.setItem(draftKey, JSON.stringify({ items, discount, taxRate, currency, notes, correction, sealsUsed, sealCodes, sealCondition, sealNotes })); }, 350);
    return () => clearTimeout(timer);
  }, [correction, currency, discount, draftKey, draftReady, items, notes, sealCodes, sealCondition, sealNotes, sealsUsed, taxRate]);

  const saveCorrection = async () => {
    if (!correction.trim()) { Alert.alert('Nothing to save', 'Type the correction or collection note first.'); return; }
    setBusy('correction');
    try {
      const { error } = await supabase.rpc('driver_correct_goods_description', { p_stop_id: stop.id, p_correction: correction.trim() });
      if (error) throw error;
      setSavedCorrection(correction.trim());
      setCorrection('');
      Alert.alert('Correction saved', "Your note is stored alongside the customer's original description — the original is never overwritten.");
    } catch (e: any) { Alert.alert('Could not save correction', e?.message || 'Try again.'); }
    finally { setBusy(null); }
  };

  const saveSeals = async () => {
    const codes = sealCodes.map((c) => c.trim()).filter(Boolean);
    if (sealsUsed && codes.length === 0) { Alert.alert('Seal codes required', 'Enter the code stamped on every seal you fitted.'); return; }
    setBusy('seals');
    try {
      const { error } = await supabase.rpc('record_shipment_seals', {
        p_stop_id: stop.id,
        p_seals_used: sealsUsed,
        p_seal_count: codes.length,
        p_seal_codes: codes,
        p_condition: sealCondition,
        p_notes: sealNotes.trim() || null,
        p_photo_path: proofs.find((p) => p.proof_type === 'seal')?.storage_path || null,
      });
      if (error) throw error;
      setSealsSaved(true);
      Alert.alert('Seals recorded', sealsUsed ? `${codes.length} seal code(s) saved to the shipment, invoice and delivery note.` : 'Recorded: no seals used.');
    } catch (e: any) {
      if (isNetworkError(e) || isMissingBackend(e)) {
        await enqueue({
          fn: 'record_shipment_seals',
          stopId: stop.id,
          args: {
            p_stop_id: stop.id, p_seals_used: sealsUsed, p_seal_count: codes.length,
            p_seal_codes: codes, p_condition: sealCondition, p_notes: sealNotes.trim() || null,
            p_photo_path: proofs.find((p) => p.proof_type === 'seal')?.storage_path || null,
          },
        });
        // Treated as saved: the codes are on the drums either way, and blocking
        // the collection would strand the driver at the door over signal.
        setSealsSaved(true);
        Alert.alert('Seals saved on this phone', 'No signal — the codes will sync by themselves once you are back in coverage.');
      } else {
        Alert.alert('Could not record seals', e?.message || 'Try again.');
      }
    }
    finally { setBusy(null); }
  };

  const saveInvoice = async (confirm = false) => {
    const lineItems = items.map((item) => ({ description:item.description.trim(), quantity:Number(item.quantity), unitPrice:Number(item.unitPrice) }));
    if (lineItems.some((item) => !item.description)) { Alert.alert('Invoice details required', 'Every line needs a description.'); return; }
    if (lineItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) { Alert.alert('Invoice details required', 'Every line needs a description, quantity and valid unit price.'); return; }

    const paid = Number(amountPaid || 0);
    if (amountPaid.trim() && (!Number.isFinite(paid) || paid < 0)) {
      Alert.alert('Check the amount paid', 'Enter what the customer handed over, or leave it blank if they paid nothing.');
      return;
    }

    const send = async () => {
      setBusy('invoice');
      try {
        const { data, error } = await supabase.rpc('create_driver_invoice', {
          p_stop_id: stop.id,
          p_line_items: lineItems,
          p_discount: Number(discount || 0), p_tax_rate: Number(taxRate || 0),
          p_currency: currency, p_notes: notes.trim() || null,
          p_amount_paid: paid > 0 ? paid : null,
          p_payment_method: paid > 0 ? paymentMethod.trim() || null : null,
          p_confirm: confirm,
        });
        if (error) throw error;
        setInvoiceId((data as any)?.id || 'saved');
        if (confirm) setInvoiceLocked(true);
        // Payment is on the invoice now; clearing the box stops a second tap
        // recording the same money twice.
        setAmountPaid('');
        Alert.alert(
          confirm ? 'Invoice confirmed' : 'Invoice saved',
          confirm
            ? 'It has gone to the office and the customer. You can no longer change it here.'
            : 'Saved as a draft. Confirm it when you and the customer agree.',
        );
      } catch (e: any) { Alert.alert('Invoice failed', e?.message || 'Please try again.'); }
      finally { setBusy(null); }
    };

    if (!confirm) { await send(); return; }

    // Confirming is one-way for the driver, so it gets a deliberate second tap.
    Alert.alert(
      'Confirm this invoice?',
      `${invoiceSymbol(currency)}${total.toFixed(2)} total${paid > 0 ? `, ${invoiceSymbol(currency)}${paid.toFixed(2)} paid now` : ', nothing paid yet'}.\n\nOnce confirmed you cannot change it — only the office can.`,
      [{ text: 'Not yet', style: 'cancel' }, { text: 'Confirm', onPress: () => { void send(); } }],
    );
  };

  const takePhoto = async (proofType: ProofType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Camera permission required', 'Allow camera access to record proof of the goods.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.65, base64: true, exif: false });
    if (result.canceled || !result.assets[0]?.base64 || !session?.user.id) return;
    setBusy(proofType);
    // Held outside the try so the offline path can still queue the file.
    const lastUri = result.assets[0]?.uri || null;
    try {
      const asset = result.assets[0];
      const encoded = asset.base64;
      if (!encoded) return;
      const path = `${session.user.id}/${stop.shipmentId}/${stop.id}-${proofType}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('driver-proofs').upload(path, base64Bytes(encoded), { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from('driver_proofs').insert({ shipment_id: stop.shipmentId, stop_id: stop.id, driver_id: session.user.id, proof_type: proofType, storage_path: path });
      if (rowError) throw rowError;
      await load();
    } catch (e: any) {
      // A dead zone is the normal case here, not a failure worth losing the
      // photo over: keep the file and upload it when there is signal.
      if ((isNetworkError(e) || isMissingBackend(e)) && lastUri && session?.user.id) {
        await queuePhoto({
          uri: lastUri, proofType, stopId: stop.id,
          shipmentId: stop.shipmentId, driverId: session.user.id,
        });
        Alert.alert('Photo saved on this phone', 'No signal — it will upload by itself once you are back in coverage.');
      } else {
        Alert.alert('Photo upload failed', e?.message || 'Keep the app open and try again.');
      }
    }
    finally { setBusy(null); }
  };

  const complete = async () => {
    // Scanning the QR already proved which shipment this is, so the six digits
    // are only asked for when nothing was scanned and no code was checked when
    // the shipment was opened.
    if (!unlocked && code.trim().length !== 6) {
      Alert.alert('Customer code required', 'Scan the customer QR code, or ask them for the six-digit code shown in their app.');
      return;
    }
    if (pickup && !invoiceLocked) { Alert.alert('Confirm the invoice first', 'Check the items and what was paid, then confirm the invoice. Once confirmed it is sent to the office and cannot be changed here.'); return; }
    if (pickup && sealsRequested > 0 && !sealsSaved) { Alert.alert('Record the seals first', `The customer paid for ${sealsRequested} metal coded seal(s) — fit them and record every code before completing.`); return; }
    if (!pickup && !signatureSaved) { Alert.alert('Recipient signature required', 'Ask the recipient to sign and save the signature before completing this delivery.'); return; }
    setBusy('complete');
    try {
      const { data, error } = await supabase.rpc('complete_driver_handover', { p_stop_id: stop.id, p_customer_code: code.trim(), p_notes: notes.trim() || null });
      if (error) throw error;
      await AsyncStorage.removeItem(draftKey);
      Alert.alert(pickup ? 'Collection complete' : 'Delivery complete', `${stop.trackingNumber} is now ${(data as any)?.status || 'complete'}.`, [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (e: any) { Alert.alert('Could not complete stop', e?.message || 'Check the required invoice, photos and customer code.'); }
    finally { setBusy(null); }
  };

  const saveSignature = async () => {
    if (!recipientName.trim()) { Alert.alert('Recipient name required', 'Enter the full name of the person receiving the packages.'); return; }
    if (!signatureSvg) { Alert.alert('Signature required', 'Ask the recipient to sign inside the box.'); return; }
    if (!signatureAccepted) { Alert.alert('Confirmation required', 'The recipient must confirm they received the listed packages.'); return; }
    setBusy('signature');
    try {
      const location = await getDriverLocation().catch(() => ({ point: null }));
      const { error } = await supabase.from('driver_signatures').upsert({
        shipment_id: stop.shipmentId, stop_id: stop.id, driver_id: session?.user.id,
        recipient_name: recipientName.trim(), signature_svg: signatureSvg,
        confirmation_accepted: true, latitude: location.point?.latitude ?? null,
        longitude: location.point?.longitude ?? null,
      }, { onConflict: 'stop_id' });
      if (error) throw error;
      setSignatureSaved(true);
      Alert.alert('Signature saved', 'The recipient signature is securely attached to this delivery.');
    } catch (e: any) {
      console.warn('Signature save failed', e?.message || e);
      Alert.alert('Signature not saved', 'Check your connection and try again.');
    } finally { setBusy(null); }
  };

  // Totals computed with the same helper the website, admin and customer use,
  // so the figure the driver reads out at the door is the figure on every
  // other screen rather than a fourth opinion.
  const { subtotal, tax, total } = calculateTotals({
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    })),
    discount: Number(discount) || 0,
    taxRate: Number(taxRate) || 0,
    currency,
  });

  const photoButtons: Array<[ProofType, string]> = pickup
    ? [['pickup_departure', 'Goods leaving pickup'], ['depot_arrival', 'Goods arriving at depot']]
    : [['depot_departure', 'Goods leaving depot'], ['delivery_arrival', 'Goods at drop-off']];

  const sealPhoto = proofs.find((p) => p.proof_type === 'seal');

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.hero}><Text style={styles.stepEyebrow}>{pickup ? 'COLLECTION HANDOVER' : 'DELIVERY HANDOVER'}</Text><Text style={styles.customer}>{stop.customerName}</Text><Text style={styles.ref}>{stop.trackingNumber}</Text><Text style={styles.draftNote}>You are marked as arrived · Progress saves automatically on this device</Text></View>

      <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="qr-code-outline" size={21} color={colors.primary}/><View style={{flex:1}}><Text style={styles.stepEyebrow}>STEP 1 · OPEN SHIPMENT</Text><Text style={styles.sectionTitle}>Verify the customer shipment QR</Text></View></View>
        {unlocked ? <View style={styles.verified}><Ionicons name="shield-checkmark" size={24} color={colors.primary}/><Text style={styles.saved}>{qrVerified ? 'Correct shipment opened by QR — continue with the handover details below' : 'Shipment opened with the customer code — continue with the handover details below'}</Text></View> : <>
          <Text style={styles.help}>Ask the customer to open this shipment in their app and show its QR code. Scan it before handling or recording the goods.</Text>
          {permission?.granted ? <View style={styles.qrCamera}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>busy!=='qr'&&verifyQr(data)}/><View style={styles.qrFrame}/></View> : <Pressable accessibilityRole="button" accessibilityLabel="Allow camera to scan customer QR" style={styles.outline} onPress={requestPermission}><Text style={styles.outlineText}>Allow camera to scan QR</Text></Pressable>}
          <Text style={styles.orText}>OR ENTER THE QR TOKEN MANUALLY</Text>
          <TextInput style={styles.input} value={manualQr} onChangeText={setManualQr} placeholder="Customer shipment QR token"/>
          <Pressable accessibilityRole="button" accessibilityLabel="Verify customer shipment QR" style={[styles.primary, (!manualQr.trim() || busy==='qr') && styles.disabled]} onPress={()=>verifyQr(manualQr)} disabled={!manualQr.trim() || busy==='qr'}>{busy==='qr'?<ActivityIndicator color={colors.white}/>:<Text style={styles.primaryText}>Verify and open shipment</Text>}</Pressable>

          {/* Starting the collection by hand needs the code instead of the
              scan. Scanning already proves which shipment this is, so a driver
              who scanned is never asked for the code as well. */}
          <Text style={styles.orText}>OR START WITH THE CUSTOMER'S SIX-DIGIT CODE</Text>
          <TextInput
            style={styles.input}
            value={openCode}
            onChangeText={(v) => setOpenCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start collection with the customer code"
            style={[styles.outline, (openCode.length !== 6 || busy === 'code') && styles.disabled]}
            onPress={() => verifyCode(openCode)}
            disabled={openCode.length !== 6 || busy === 'code'}
          >
            {busy === 'code'
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={styles.outlineText}>Start collection with code</Text>}
          </Pressable>
        </>}
      </View>

      {!unlocked ? <View style={styles.lockedCard}><Ionicons name="lock-closed-outline" size={24} color={colors.textMuted}/><View style={{flex:1}}><Text style={styles.lockedTitle}>Shipment details are locked</Text><Text style={styles.lockedText}>Scan the customer's shipment QR above, or enter their six-digit code. The goods, invoice, seals and photos will then open.</Text></View></View> : <>

      {pickup ? <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="document-text-outline" size={21} color={colors.primary}/><View style={{flex:1}}><Text style={styles.stepEyebrow}>STEP 2 · CHECK GOODS</Text><Text style={styles.sectionTitle}>Customer's goods description</Text></View></View>
        <Text style={styles.help}>Check the goods against what the customer declared. The original description stays on record — add a correction if anything differs.</Text>
        <View style={styles.descriptionBox}><Text style={styles.descriptionText}>{goodsDescription || 'No description was provided — add a collection note describing the goods.'}</Text></View>
        {savedCorrection ? <View style={styles.correctionBox}><Text style={styles.correctionLabel}>YOUR CORRECTION ON RECORD</Text><Text style={styles.descriptionText}>{savedCorrection}</Text></View> : null}
        <Label text={savedCorrection ? 'Update correction / collection note' : 'Correction or collection note (optional)'} />
        <TextInput style={[styles.input, styles.notes]} value={correction} onChangeText={setCorrection} multiline placeholder="e.g. Actually 3 drums not 2; TV box already dented on arrival…" placeholderTextColor={colors.textFaint} />
        <Pressable style={styles.outline} onPress={saveCorrection} disabled={busy === 'correction'}>{busy === 'correction' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.outlineText}>Save correction</Text>}</Pressable>
      </View> : null}

      {pickup ? <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="receipt-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Collection invoice</Text></View>
        {invoiceLocked ? (
          <View style={styles.verified}>
            <Ionicons name="lock-closed" size={22} color={colors.primary} />
            <Text style={styles.saved}>
              Invoice confirmed and sent — {invoiceSymbol(currency)}{total.toFixed(2)}. Only admin or finance can change it now.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.help}>
              {serverPriced
                ? 'Prices came from the customer’s booking. Correct anything that does not match what you are actually collecting, then record what they paid.'
                : 'Build the invoice from what you are actually collecting, then record what the customer paid.'}
            </Text>

            {items.map((item,index) => <View key={index} style={styles.lineItem}>
              <View style={styles.lineHead}><Text style={styles.lineTitle}>Item {index+1}</Text>{items.length>1?<Pressable accessibilityLabel={`Remove item ${index+1}`} onPress={() => setItems((current)=>current.filter((_,i)=>i!==index))}><Ionicons name="trash-outline" size={18} color={colors.danger}/></Pressable>:null}</View>
              <Label text="Description" /><TextInput style={styles.input} value={item.description} onChangeText={(value)=>setItems((current)=>current.map((row,i)=>i===index?{...row,description:value}:row))} multiline />
              <View style={styles.row}><View style={styles.flex}><Label text="Quantity" /><TextInput style={styles.input} value={item.quantity} onChangeText={(value)=>setItems((current)=>current.map((row,i)=>i===index?{...row,quantity:value}:row))} keyboardType="decimal-pad" /></View><View style={styles.flex}><Label text="Unit price" /><TextInput style={styles.input} value={item.unitPrice} onChangeText={(value)=>setItems((current)=>current.map((row,i)=>i===index?{...row,unitPrice:value}:row))} keyboardType="decimal-pad" placeholder="0.00" /></View></View>
            </View>)}

            <Pressable style={styles.addItem} onPress={()=>setItems((current)=>[...current,{description:'',quantity:'1',unitPrice:''}])}><Ionicons name="add-circle-outline" size={18} color={colors.primary}/><Text style={styles.addItemText}>Add invoice item</Text></Pressable>

            <View style={styles.row}><View style={styles.flex}><Label text="Discount" /><TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" /></View><View style={styles.flex}><Label text="Tax %" /><TextInput style={styles.input} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" /></View><View style={styles.flex}><Label text="Currency" /><TextInput style={styles.input} value={currency} onChangeText={setCurrency} autoCapitalize="characters" /></View></View>

            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Subtotal</Text><Text style={styles.totalsValue}>{invoiceSymbol(currency)}{subtotal.toFixed(2)}</Text></View>
              {Number(discount) > 0 ? <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Discount</Text><Text style={styles.totalsValue}>-{invoiceSymbol(currency)}{Number(discount).toFixed(2)}</Text></View> : null}
              {tax > 0 ? <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Tax</Text><Text style={styles.totalsValue}>{invoiceSymbol(currency)}{tax.toFixed(2)}</Text></View> : null}
              <View style={styles.totalsRow}><Text style={styles.totalsTotal}>Total</Text><Text style={styles.totalsTotal}>{invoiceSymbol(currency)}{total.toFixed(2)}</Text></View>
            </View>

            {/* Money at the door. Left blank when nothing was paid — the
                customer settles later from their own app, and the invoice
                simply stays unpaid. */}
            <View style={styles.row}>
              <View style={styles.flex}><Label text="Paid now (leave blank if nothing)" /><TextInput style={styles.input} value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textFaint} /></View>
              <View style={styles.flex}><Label text="How they paid" /><TextInput style={styles.input} value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Cash on collection" placeholderTextColor={colors.textFaint} /></View>
            </View>

            <Pressable style={styles.outline} onPress={() => saveInvoice(false)} disabled={busy === 'invoice'}>{busy === 'invoice' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.outlineText}>{invoiceId ? 'Save changes' : 'Save draft'}</Text>}</Pressable>
            <Pressable style={[styles.primary, busy === 'invoice' && styles.disabled]} onPress={() => saveInvoice(true)} disabled={busy === 'invoice'}><Text style={styles.primaryText}>Confirm invoice</Text></Pressable>
            <Text style={styles.lockedNote}>Confirming sends the invoice to the office and the customer, and closes it to you.</Text>
          </>
        )}
      </View> : null}

      {pickup ? <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="shield-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Metal coded seals</Text></View>
        {sealsRequested > 0 ? <Text style={styles.helpStrong}>The customer paid for {sealsRequested} seal(s) — fit them and record every code.</Text> : <Text style={styles.help}>Record any metal coded seals fitted to drums, trunks or boxes.</Text>}
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Seals used on this shipment</Text><Switch value={sealsUsed} onValueChange={(v) => { setSealsUsed(v); setSealsSaved(false); if (v && sealCodes.length === 0) setSealCodes(['']); }} trackColor={{ true: colors.primary }} /></View>
        {sealsUsed ? (
          <>
            {sealCodes.map((codeValue, index) => (
              <View key={index} style={styles.row}>
                <View style={styles.flex}>
                  <Label text={`Seal code ${index + 1}`} />
                  <TextInput style={styles.input} value={codeValue} autoCapitalize="characters" placeholder="e.g. ZS-04521"
                    onChangeText={(value) => { setSealsSaved(false); setSealCodes((current) => current.map((c, i) => i === index ? value : c)); }} />
                </View>
                {sealCodes.length > 1 ? <Pressable style={styles.removeSeal} onPress={() => setSealCodes((current) => current.filter((_, i) => i !== index))}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable> : null}
              </View>
            ))}
            <Pressable style={styles.addItem} onPress={() => setSealCodes((current) => [...current, ''])}><Ionicons name="add-circle-outline" size={18} color={colors.primary} /><Text style={styles.addItemText}>Add another seal code</Text></Pressable>
            <Label text="Seal condition" />
            <View style={styles.chipRow}>{sealConditions.map((c) => (
              <Pressable key={c} style={[styles.chip, sealCondition === c && styles.chipActive]} onPress={() => { setSealCondition(c); setSealsSaved(false); }}>
                <Text style={[styles.chipText, sealCondition === c && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}</View>
            <Label text="Seal notes (optional)" />
            <TextInput style={styles.input} value={sealNotes} onChangeText={(v) => { setSealNotes(v); setSealsSaved(false); }} placeholder="Anything unusual about the seals" placeholderTextColor={colors.textFaint} />
            <Pressable style={[styles.photoButton, sealPhoto && styles.photoDone, { minHeight: 90 }]} onPress={() => takePhoto('seal')} disabled={busy === 'seal'}>
              {sealPhoto?.signedUrl ? <Image source={{ uri: sealPhoto.signedUrl }} style={styles.thumbnail} /> : <Ionicons name="camera" size={23} color={colors.textMuted} />}
              <Text style={styles.photoLabel}>{sealPhoto ? 'Retake seal photo' : 'Photograph the fitted seals'}</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable style={styles.primary} onPress={saveSeals} disabled={busy === 'seals'}>{busy === 'seals' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{sealsSaved ? 'Update seal record' : 'Record seals'}</Text>}</Pressable>
        {sealsSaved ? <Text style={styles.saved}>Seal record saved</Text> : null}
      </View> : null}

      <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="camera-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Proof of goods</Text></View>
        <Text style={styles.help}>Photographs are timestamped, linked to this run and stop, visible to admins, and automatically deleted 48 hours after a verified delivery.</Text>
        <Pressable style={styles.proofPreview} onPress={() => takePhoto(photoButtons[0][0])}>
          <Image source={proofs[0]?.signedUrl ? { uri: proofs[0].signedUrl } : collectionBoxesImage} style={styles.proofImage} />
          <View style={styles.cameraBadge}><Ionicons name="camera" size={18} color={colors.white} /></View>
        </Pressable>
        <View style={styles.photoGrid}>{photoButtons.map(([type, label]) => {
          const proof = proofs.find((item) => item.proof_type === type);
          return <Pressable key={type} style={[styles.photoButton, proof && styles.photoDone]} onPress={() => takePhoto(type)} disabled={busy === type}>
            {proof?.signedUrl ? <Image source={{ uri: proof.signedUrl }} style={styles.thumbnail} /> : <Ionicons name="camera" size={25} color={proof ? colors.primary : colors.textMuted} />}
            <Text style={styles.photoLabel}>{proof ? `Retake: ${label}` : label}</Text>
          </Pressable>;
        })}</View>
      </View>

      {!pickup ? <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="create-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Recipient signature</Text></View>
        <Text style={styles.help}>The recipient signs for the packages listed on this delivery. Do not photograph their identity document.</Text>
        <Label text="Received by" />
        <TextInput style={styles.input} value={recipientName} onChangeText={(value) => { setRecipientName(value); setSignatureSaved(false); }} placeholder="Recipient full name" placeholderTextColor={colors.textFaint} />
        {signatureSaved ? <View style={styles.verified}><Ionicons name="shield-checkmark" size={23} color={colors.primary} /><Text style={styles.saved}>Signature captured securely</Text></View> : <SignaturePad onChange={(value) => { setSignatureSvg(value); setSignatureSaved(false); }} />}
        <Pressable style={styles.confirmRow} onPress={() => { setSignatureAccepted((value) => !value); setSignatureSaved(false); }}><Ionicons name={signatureAccepted ? 'checkbox' : 'square-outline'} size={22} color={signatureAccepted ? colors.primary : colors.textMuted} /><Text style={styles.confirmText}>I confirm that I received the packages listed above.</Text></Pressable>
        {!signatureSaved ? <Pressable style={[styles.primary, busy === 'signature' && styles.disabled]} onPress={saveSignature} disabled={busy === 'signature'}>{busy === 'signature' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save recipient signature</Text>}</Pressable> : null}
      </View> : null}

      <View style={styles.card}>
        <View style={styles.sectionHead}><Ionicons name="keypad-outline" size={21} color={colors.primary} /><View style={{flex:1}}><Text style={styles.stepEyebrow}>FINAL STEP · CUSTOMER HANDOVER</Text><Text style={styles.sectionTitle}>Enter the six-digit customer code</Text></View></View>
        <Text style={styles.help}>After the goods and proof are recorded, ask the customer for the six-digit {pickup ? 'collection' : 'delivery'} code displayed in their app. This confirms the handover; it is not their account password.</Text>
        <TextInput style={[styles.input, styles.code]} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" />
        <Label text="Driver notes (optional)" /><TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline />
        <Pressable style={[styles.primary, busy === 'complete' && styles.disabled]} onPress={complete} disabled={busy === 'complete'}>{busy === 'complete' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{pickup ? 'Verify code & mark collected' : 'Verify code & mark delivered'}</Text>}</Pressable>
      </View>
      </>}
    </ScrollView>
  );
}

function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg},content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},hero:{paddingBottom:spacing.sm},stepEyebrow:{fontSize:9.5,fontWeight:'900',color:colors.primary,letterSpacing:.8,marginBottom:3},title:{fontSize:22,fontWeight:'800',color:colors.text},customer:{fontSize:16,fontWeight:'700',color:colors.text,marginTop:4},ref:{fontSize:12,fontWeight:'700',color:colors.primary,marginTop:2},draftNote:{fontSize:10.5,color:colors.textMuted,marginTop:5},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:spacing.sm},lockedCard:{backgroundColor:'#F4F6F8',borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},lockedTitle:{fontSize:14,fontWeight:'800',color:colors.text},lockedText:{fontSize:11.5,lineHeight:17,color:colors.textMuted,marginTop:3},sectionHead:{flexDirection:'row',alignItems:'center',gap:spacing.sm},sectionTitle:{fontSize:16,fontWeight:'800',color:colors.text},help:{fontSize:12,lineHeight:17,color:colors.textMuted,marginBottom:4},helpStrong:{fontSize:12,lineHeight:17,color:colors.amber,fontWeight:'800',marginBottom:4},orText:{fontSize:9.5,fontWeight:'900',letterSpacing:.7,color:colors.textMuted,textAlign:'center',marginTop:4},label:{fontSize:11,fontWeight:'700',color:colors.textMuted,marginTop:4},input:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,backgroundColor:colors.bg,paddingHorizontal:12,paddingVertical:10,color:colors.text,fontSize:14},row:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},primary:{backgroundColor:colors.primary,borderRadius:radius.sm,paddingVertical:13,alignItems:'center',marginTop:4},primaryText:{color:colors.white,fontWeight:'800',fontSize:13},outline:{borderWidth:1.5,borderColor:colors.primary,borderRadius:radius.sm,paddingVertical:11,alignItems:'center',marginTop:4},outlineText:{color:colors.primary,fontWeight:'800',fontSize:13},saved:{textAlign:'center',color:colors.primary,fontWeight:'700',fontSize:12},proofPreview:{height:190,borderRadius:radius.md,overflow:'hidden',position:'relative'},proofImage:{width:'100%',height:'100%'},cameraBadge:{position:'absolute',right:10,bottom:10,width:38,height:38,borderRadius:19,backgroundColor:'rgba(15,23,42,.72)',alignItems:'center',justifyContent:'center'},photoGrid:{flexDirection:'row',gap:spacing.sm},photoButton:{flex:1,minHeight:120,borderWidth:1,borderStyle:'dashed',borderColor:colors.border,borderRadius:radius.md,alignItems:'center',justifyContent:'center',padding:spacing.sm,overflow:'hidden'},photoDone:{borderColor:colors.primary,backgroundColor:colors.primarySoft},thumbnail:{width:'100%',height:72,borderRadius:radius.sm,marginBottom:5},photoLabel:{fontSize:11,fontWeight:'700',color:colors.textMuted,textAlign:'center'},code:{fontSize:26,fontWeight:'800',letterSpacing:8,textAlign:'center'},notes:{minHeight:68,textAlignVertical:'top'},disabled:{opacity:.55},confirmRow:{flexDirection:'row',alignItems:'flex-start',gap:8,paddingVertical:6},confirmText:{flex:1,color:colors.text,fontSize:12,lineHeight:17,fontWeight:'600'},
  lineItem:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.sm,gap:4},lineHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},lineTitle:{fontSize:11,fontWeight:'800',color:colors.textMuted},addItem:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8},addItemText:{fontSize:12,fontWeight:'800',color:colors.primary},
  lockedPrice:{fontSize:12,fontWeight:'800',color:colors.text},lockedRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:2},lockedNote:{flex:1,fontSize:11,color:colors.textMuted,lineHeight:15},
  totalsBox:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border,paddingTop:spacing.sm,gap:4,marginTop:spacing.xs},
  totalsRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  totalsLabel:{fontSize:12,color:colors.textMuted},
  totalsValue:{fontSize:12,color:colors.text,fontWeight:'600'},
  totalsTotal:{fontSize:15,color:colors.text,fontWeight:'800'},
  descriptionBox:{backgroundColor:colors.bg,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md},descriptionText:{fontSize:13,lineHeight:19,color:colors.text},correctionBox:{backgroundColor:'#fffbeb',borderWidth:1,borderColor:'#fcd34d',borderRadius:radius.md,padding:spacing.md},correctionLabel:{fontSize:9.5,fontWeight:'800',color:'#b45309',letterSpacing:.5,marginBottom:3},
  switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md},switchLabel:{fontSize:13,fontWeight:'700',color:colors.text},removeSeal:{alignSelf:'flex-end',padding:10},chipRow:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},chip:{borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:13,paddingVertical:7,backgroundColor:colors.bg},chipActive:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{fontSize:12,fontWeight:'700',color:colors.textMuted,textTransform:'capitalize'},chipTextActive:{color:colors.white},
  qrCamera:{height:220,borderRadius:radius.md,overflow:'hidden',backgroundColor:'#000'},qrFrame:{position:'absolute',width:150,height:150,borderWidth:3,borderColor:'#fff',borderRadius:radius.md,alignSelf:'center',top:35},verified:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:spacing.md},
});
