import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Image, Linking, Modal, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import {
  Shipment, STATUS_OPTIONS, statusStyle,
  senderName, senderEmail, senderPhone, receiverName, receiverPhone, pickupAddress, deliveryAddress,
  collectionInfo, paymentAmount, shipmentType, shippedItems,
} from '../lib/shipment';
import { buildInvoiceHtml, buildDeliveryNoteHtml, sharePdf } from '../lib/documents';
import {
  collectionDateLabel, loadSchedules, resolveCollection,
  type ResolvedCollection, type ScheduleRow,
} from '../lib/collectionSchedule';
import type { ShipmentsStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<ShipmentsStackParams, 'ShipmentDetail'>;

interface ProofPhoto { id: string; proof_type: string; captured_at: string; signedUrl?: string; deleted_at?: string | null; }

/**
 * The shipping details admin corrects on the phone.
 *
 * Bookings arrive with typos, half addresses and the wrong postcode, and the
 * confirmation call is where that gets fixed. Only fields a customer could
 * have got wrong are editable — pricing, seals and status are not touched
 * here, they have their own paths.
 */
type DetailsForm = {
  senderFirstName: string; senderLastName: string; senderEmail: string; senderPhone: string;
  senderAddress: string; senderCity: string; senderPostcode: string; senderCountry: string;
  receiverName: string; receiverPhone: string; receiverAddress: string; receiverCity: string;
  goodsDescription: string; collectionRoute: string; collectionDate: string;
  /**
   * What is actually being shipped, and what it was charged at.
   *
   * These are the invoice's own lines. Editing them here is the point: a
   * confirmation call is where a customer says "it's three drums, not two" or
   * a price is corrected, and until now admin could fix the address but not the
   * consignment — the one thing the call is for. The same lines drive the
   * contents list, the invoice and the delivery note, so they only have to be
   * right once.
   */
  items: Array<{ description: string; quantity: string; unitPrice: string }>;
  currency: string;
};

const blankForm = (): DetailsForm => ({
  senderFirstName: '', senderLastName: '', senderEmail: '', senderPhone: '',
  senderAddress: '', senderCity: '', senderPostcode: '', senderCountry: '',
  receiverName: '', receiverPhone: '', receiverAddress: '', receiverCity: '',
  goodsDescription: '', collectionRoute: '', collectionDate: '',
  items: [], currency: 'GBP',
});

function formFrom(shipment: Shipment, resolved: ResolvedCollection): DetailsForm {
  const m: any = shipment.metadata || {};
  const sender = m.sender || m.senderDetails || {};
  const recipient = m.recipient || m.recipientDetails || {};
  const [first, ...rest] = String(sender.name || '').trim().split(' ');
  return {
    senderFirstName: sender.firstName || first || '',
    senderLastName: sender.lastName || rest.join(' ') || '',
    senderEmail: sender.email || '',
    senderPhone: sender.phone || '',
    senderAddress: sender.address || '',
    senderCity: sender.city || '',
    senderPostcode: sender.postcode || sender.postalCode || '',
    senderCountry: sender.country || '',
    receiverName: recipient.name || '',
    receiverPhone: recipient.phone || '',
    receiverAddress: recipient.address || '',
    receiverCity: recipient.city || '',
    goodsDescription: shipment.goods_description || m.shipment?.description || '',
    // Prefilled from the schedule when the booking never carried them, so
    // saving during the confirmation call writes the real values onto the
    // shipment instead of leaving the placeholder in place.
    collectionRoute: resolved.route || '',
    collectionDate: resolved.date ? resolved.date.toISOString().slice(0, 10) : '',
    items: ((m.invoice?.items || []) as any[]).map((line) => ({
      description: String(line.description || line.item || ''),
      quantity: String(line.quantity ?? 1),
      unitPrice: String(line.unitPrice ?? 0),
    })),
    currency: String(m.invoice?.currency || m.pricing?.currency || 'GBP'),
  };
}

export default function ShipmentDetailScreen({ route, navigation }: Props) {
  const { dashboardRole, session, profile } = useAuth();
  const [shipment, setShipment] = useState<Shipment>(route.params.shipment);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(route.params.shipment.status);
  const [busy, setBusy] = useState(false);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [runInfo, setRunInfo] = useState<{ status: string; stopStatus: string } | null>(null);
  const [seals, setSeals] = useState<any>(null);
  const [invoiceRow, setInvoiceRow] = useState<any>(null);
  const [deliveryNote, setDeliveryNote] = useState<any>(null);
  const [photos, setPhotos] = useState<ProofPhoto[]>([]);
  const [deletedPhotoCount, setDeletedPhotoCount] = useState(0);
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [editDetails, setEditDetails] = useState(false);
  const [form, setForm] = useState<DetailsForm>(blankForm());

  const load = useCallback(async () => {
    const { data: fresh } = await supabase.from('shipments').select('*').eq('id', route.params.shipment.id).maybeSingle();
    const s = (fresh as Shipment) || route.params.shipment;
    setShipment(s);
    setSelected((cur) => cur || s.status);

    const [sealResult, invoiceResult, noteResult, proofResult, paymentProofResult, stopResult] = await Promise.all([
      supabase.from('shipment_seals').select('*').eq('shipment_id', s.id).maybeSingle(),
      supabase.from('driver_invoices').select('*').eq('shipment_id', s.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('delivery_notes').select('*').eq('shipment_id', s.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('driver_proofs').select('id,proof_type,captured_at,storage_path,deleted_at').eq('shipment_id', s.id).order('captured_at'),
      supabase.from('payment_proofs').select('*').eq('shipment_id', s.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('driver_run_stops').select('status,run:driver_runs(status,driver_id)').eq('shipment_id', s.id).neq('status', 'failed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    setSeals(sealResult.data || null);
    setInvoiceRow(invoiceResult.data || null);
    setDeliveryNote(noteResult.data || null);
    setPaymentProof(paymentProofResult.data || null);

    const stop: any = stopResult.data;
    if (stop?.run) setRunInfo({ status: stop.run.status, stopStatus: stop.status });
    const driverId = s.assigned_driver_id || stop?.run?.driver_id;
    if (driverId) {
      const { data: profile } = await supabase.from('profiles').select('full_name,email').eq('id', driverId).maybeSingle();
      setDriverName((profile as any)?.full_name || (profile as any)?.email || null);
    } else setDriverName(null);

    const proofRows = (proofResult.data || []) as any[];
    setDeletedPhotoCount(proofRows.filter((p) => p.deleted_at).length);
    const active = proofRows.filter((p) => !p.deleted_at);
    const withUrls = await Promise.all(active.map(async (p) => {
      const { data } = await supabase.storage.from('driver-proofs').createSignedUrl(p.storage_path, 3600);
      return { ...p, signedUrl: data?.signedUrl } as ProofPhoto;
    }));
    setPhotos(withUrls);

    if (paymentProofResult.data) {
      const { data } = await supabase.storage.from('payment-proofs').createSignedUrl((paymentProofResult.data as any).storage_path, 3600);
      setProofUri(data?.signedUrl || null);
    } else setProofUri(null);
  }, [route.params.shipment]);

  useEffect(() => { load(); }, [load]);
  // The published schedule is what actually decides a booking's route and
  // date. Loaded once so every shipment can be shown against it.
  useEffect(() => { loadSchedules().then(setSchedules); }, []);

  const st = statusStyle(shipment.status);
  const ci = collectionInfo(shipment);
  const collection: ResolvedCollection = resolveCollection(shipment, schedules);
  // Say where the answer came from, so an inferred route never reads as an
  // agreed one on a confirmation call.
  const collectionNote = collection.source === 'booking' ? ''
    : collection.source === 'schedule' ? ' · from the matched schedule'
    : collection.source === 'route' ? ' · next run on this route'
    : collection.source === 'area' ? ' · route covering this postcode'
    : '';
  const terminal = shipment.status === 'Delivered' || shipment.status === 'Cancelled';
  const meta: any = shipment.metadata || {};
  const invoice = meta.invoice || {};
  const goodsDescription = shipment.goods_description || meta.shipment?.description || '—';
  const contents = shippedItems(shipment);
  const correction = shipment.driver_description_correction || meta.driverDescriptionCorrection?.text;
  const phone = senderPhone(shipment).replace(/[^0-9+]/g, '');
  const canReviewProof = dashboardRole === 'admin' || dashboardRole === 'finance';

  const updateStatus = async () => {
    if (selected === shipment.status) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('shipments').update({ status: selected, updated_at: new Date().toISOString() }).eq('id', shipment.id);
      if (error) throw error;
      try {
        const whatsappNumber = meta.whatsappNumber;
        if (whatsappNumber) {
          await supabase.functions.invoke('notify-shipment-status', {
            body: { phone_number: whatsappNumber, tracking_number: shipment.tracking_number, status: selected },
          });
        }
      } catch { /* non-critical */ }
      setShipment({ ...shipment, status: selected, updated_at: new Date().toISOString() });
      setEditing(false);
      Alert.alert('Status updated', `${shipment.tracking_number} → ${selected}`);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Could not update status');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Confirmed means an admin has been through the booking with the customer
   * on the phone and everything on this screen is now agreed. It locks the
   * shipping details against further edits — from here and, via can_modify,
   * from the customer's own app — so nothing changes silently between the call
   * and the van arriving. An admin can unlock it again to correct a mistake.
   */
  const confirmed = Boolean(meta.confirmation?.confirmedAt);
  // Only the desk that makes the confirmation call can lock a booking.
  const canConfirm = dashboardRole === 'admin';

  const writeMetadata = async (patch: any, extra: Record<string, unknown> = {}) => {
    const metadata = { ...(shipment.metadata || {}), ...patch };
    const { error } = await supabase.from('shipments')
      .update({ metadata, updated_at: new Date().toISOString(), ...extra })
      .eq('id', shipment.id);
    if (error) throw error;
    setShipment({ ...shipment, metadata, ...(extra as any), updated_at: new Date().toISOString() });
    return metadata;
  };

  const saveDetails = async () => {
    if (!form.senderPhone.trim() || !form.senderAddress.trim()) {
      Alert.alert('Missing details', 'A collection address and a sender phone number are required.');
      return;
    }
    if (form.items.some((line) => line.description.trim() && !(Number(line.quantity) > 0))) {
      Alert.alert('Check the quantities', 'Every item needs a quantity of at least one. Remove any line you do not need.');
      return;
    }
    setBusy(true);
    try {
      const existing: any = shipment.metadata || {};
      const sender = {
        ...(existing.sender || existing.senderDetails || {}),
        firstName: form.senderFirstName.trim(),
        lastName: form.senderLastName.trim(),
        name: `${form.senderFirstName} ${form.senderLastName}`.trim(),
        email: form.senderEmail.trim(),
        phone: form.senderPhone.trim(),
        address: form.senderAddress.trim(),
        city: form.senderCity.trim(),
        postcode: form.senderPostcode.trim(),
        country: form.senderCountry.trim(),
      };
      const recipient = {
        ...(existing.recipient || existing.recipientDetails || {}),
        name: form.receiverName.trim(),
        phone: form.receiverPhone.trim(),
        address: form.receiverAddress.trim(),
        city: form.receiverCity.trim(),
      };
      const collectionPatch = {
        ...(existing.collection || {}),
        route: form.collectionRoute.trim() || null,
        date: form.collectionDate.trim() || null,
      };
      // Blank rows are dropped rather than written as empty lines.
      const lines = form.items
        .map((line) => ({
          description: line.description.trim(),
          quantity: Math.max(0, Number(line.quantity) || 0),
          unitPrice: Math.max(0, Number(line.unitPrice) || 0),
        }))
        .filter((line) => line.description.length > 0);
      const invoicePatch = { ...(existing.invoice || {}), currency: form.currency, items: lines };
      const invoiceTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

      await writeMetadata(
        {
          sender, recipient, collection: collectionPatch, invoice: invoicePatch,
          pricing: { ...(existing.pricing || {}), currency: form.currency, finalAmount: invoiceTotal },
          senderDetails: undefined, recipientDetails: undefined,
        },
        {
          origin: [sender.country, `${sender.address}, ${sender.city} ${sender.postcode}`.trim()].filter(Boolean).join(': '),
          destination: [recipient.address, recipient.city].filter(Boolean).join(', '),
          goods_description: form.goodsDescription.trim() || null,
        },
      );
      setShipment((current) => ({ ...current, goods_description: form.goodsDescription.trim() || null }));
      setEditDetails(false);
      Alert.alert('Details saved', 'The collection team and the driver see these straight away.');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'No changes were saved. Check your access and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmShipment = () => {
    Alert.alert(
      'Confirm this shipment',
      'Everything above has been checked with the customer? Confirming locks the shipping details so they cannot change before collection.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Confirm & lock',
          onPress: async () => {
            setBusy(true);
            try {
              await writeMetadata(
                { confirmation: { confirmedAt: new Date().toISOString(), confirmedBy: session?.user.id ?? null, confirmedByName: profile?.full_name || session?.user.email || null } },
                { can_modify: false, ...(shipment.status === 'pending' ? { status: 'Booking Confirmed' } : {}) },
              );
              if (shipment.status === 'pending') setShipment((current) => ({ ...current, status: 'Booking Confirmed' }));
              await supabase.from('audit_logs').insert({
                user_id: session?.user.id, action: 'CONFIRM_SHIPMENT', entity_type: 'SHIPMENT', entity_id: shipment.id,
                details: { tracking_number: shipment.tracking_number },
              });
            } catch (e: any) {
              Alert.alert('Could not confirm', e?.message || 'Nothing was changed. Check your access and try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const unlockShipment = () => {
    Alert.alert('Unlock this shipment', 'Reopen the shipping details for editing? Confirm it again once they are right.', [
      { text: 'Keep locked', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: async () => {
          setBusy(true);
          try {
            await writeMetadata({ confirmation: null }, { can_modify: true });
            await supabase.from('audit_logs').insert({
              user_id: session?.user.id, action: 'UNLOCK_SHIPMENT', entity_type: 'SHIPMENT', entity_id: shipment.id,
              details: { tracking_number: shipment.tracking_number },
            });
          } catch (e: any) {
            Alert.alert('Could not unlock', e?.message || 'Nothing was changed.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const reviewProof = (approved: boolean) => {
    if (!paymentProof) return;
    const run = async (note: string | null) => {
      const { error } = await supabase.rpc('review_payment_proof', { p_proof_id: paymentProof.id, p_approved: approved, p_finance_notes: note });
      if (error) Alert.alert('Review failed', error.message);
      else { Alert.alert('Done', approved ? 'Proof approved and the payment has been recorded.' : 'Proof rejected — the customer has been notified.'); await load(); }
    };
    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        approved ? 'Approve payment proof' : 'Reject payment proof',
        approved ? 'Optional validation note:' : 'Tell the customer why it was rejected:',
        (note) => run(note?.trim() || null),
      );
    } else {
      Alert.alert(
        approved ? 'Approve payment proof' : 'Reject payment proof',
        approved ? 'Record this proof as verified?' : 'Reject this proof? The customer is notified and can upload a new one.',
        [{ text: 'Cancel', style: 'cancel' }, { text: approved ? 'Approve' : 'Reject', style: approved ? 'default' : 'destructive', onPress: () => run(null) }],
      );
    }
  };

  const downloadInvoice = async () => {
    setDownloading('invoice');
    try { await sharePdf(buildInvoiceHtml(shipment, collection), `${invoice.invoiceNumber || invoiceRow?.invoice_number || 'invoice'}.pdf`); }
    catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };
  const downloadNote = async () => {
    setDownloading('note');
    try { await sharePdf(buildDeliveryNoteHtml(shipment, { deliveryNote, proofSummary: { count: photos.length }, collection }), `${deliveryNote?.note_number || 'delivery-note'}.pdf`); }
    catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };

  const confirmDelete = () => {
    Alert.alert('Delete shipment', 'This removes it from the dashboard. Data is preserved in the database.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setBusy(true);
          const { error } = await supabase.from('shipments').update({ deleted_at: new Date().toISOString() }).eq('id', shipment.id);
          setBusy(false);
          if (error) { Alert.alert('Delete failed', error.message); return; }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.fg }]}>{shipment.status}</Text>
          </View>
          <Text style={styles.updated}>Updated {new Date(shipment.updated_at).toLocaleDateString()}</Text>
        </View>

        {/* ── Confirmation ── */}
        <View style={[styles.card, confirmed ? styles.cardConfirmed : styles.cardUnconfirmed]}>
          <View style={styles.confirmHead}>
            <Ionicons
              name={confirmed ? 'lock-closed' : 'call-outline'}
              size={19}
              color={confirmed ? colors.primaryDark : colors.amber}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.confirmTitle, { color: confirmed ? colors.primaryDark : colors.amber }]}>
                {confirmed ? 'Confirmed and locked' : 'Not confirmed yet'}
              </Text>
              <Text style={styles.confirmText}>
                {confirmed
                  ? `Confirmed by ${meta.confirmation?.confirmedByName || 'a member of staff'} on ${new Date(meta.confirmation.confirmedAt).toLocaleString()}. The shipping details below cannot be edited while it is locked.`
                  : 'Call the customer, check everything below is right, correct anything that is not, then confirm to lock it in.'}
              </Text>
            </View>
          </View>
          {/* Both primary actions sit together at the top. Edit used to be a
              small text link beside the "Details" heading further down, which
              is not where anyone looks for it. */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.btn, styles.btnOutline, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => {
                if (confirmed) {
                  Alert.alert(
                    'This shipment is locked',
                    'It was confirmed with the customer. Unlock it to make a change, then confirm it again.',
                    [{ text: 'Cancel', style: 'cancel' }, { text: 'Unlock', onPress: unlockShipment }],
                  );
                  return;
                }
                setForm(formFrom(shipment, collection));
                setEditDetails(true);
              }}
            >
              <Text style={styles.btnOutlineText}>Edit shipment</Text>
            </Pressable>
            {canConfirm ? (
              <Pressable
                style={[styles.btn, confirmed ? styles.btnOutline : styles.btnPrimary, busy && { opacity: 0.5 }]}
                disabled={busy}
                onPress={confirmed ? unlockShipment : confirmShipment}
              >
                <Text style={confirmed ? styles.btnOutlineText : styles.btnPrimaryText}>
                  {confirmed ? 'Unlock' : 'Confirm shipment'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── Details ── */}
        <View style={styles.headingRow}>
          <Text style={styles.sectionHeading}>Details</Text>
          {!editDetails ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                // Hiding Edit on a confirmed shipment left admin with no way to
                // correct one without first realising Unlock was the way in.
                if (confirmed) {
                  Alert.alert(
                    'This shipment is locked',
                    'It was confirmed with the customer. Unlock it to make a change, then confirm it again.',
                    [{ text: 'Cancel', style: 'cancel' }, { text: 'Unlock', onPress: unlockShipment }],
                  );
                  return;
                }
                setForm(formFrom(shipment, collection));
                setEditDetails(true);
              }}
            >
              <Text style={styles.headingAction}>{confirmed ? 'Locked' : 'Edit'}</Text>
            </Pressable>
          ) : null}
        </View>

        {editDetails ? (
          <View style={styles.card}>
            <Text style={styles.blockLabel}>SENDER</Text>
            <FormField label="First name" value={form.senderFirstName} onChange={(v) => setForm({ ...form, senderFirstName: v })} />
            <FormField label="Last name" value={form.senderLastName} onChange={(v) => setForm({ ...form, senderLastName: v })} />
            <FormField label="Email" value={form.senderEmail} onChange={(v) => setForm({ ...form, senderEmail: v })} keyboardType="email-address" />
            <FormField label="Phone" value={form.senderPhone} onChange={(v) => setForm({ ...form, senderPhone: v })} keyboardType="phone-pad" />
            <Text style={styles.blockLabel}>COLLECTION ADDRESS</Text>
            <FormField label="Address" value={form.senderAddress} onChange={(v) => setForm({ ...form, senderAddress: v })} multiline />
            <FormField label="Town / city" value={form.senderCity} onChange={(v) => setForm({ ...form, senderCity: v })} />
            <FormField label="Postcode / Eircode" value={form.senderPostcode} onChange={(v) => setForm({ ...form, senderPostcode: v })} autoCapitalize="characters" />
            <FormField label="Country" value={form.senderCountry} onChange={(v) => setForm({ ...form, senderCountry: v })} />
            <FormField label="Collection route" value={form.collectionRoute} onChange={(v) => setForm({ ...form, collectionRoute: v })} />
            <FormField label="Collection date" value={form.collectionDate} onChange={(v) => setForm({ ...form, collectionDate: v })} />
            <Text style={styles.blockLabel}>RECEIVER IN ZIMBABWE</Text>
            <FormField label="Full name" value={form.receiverName} onChange={(v) => setForm({ ...form, receiverName: v })} />
            <FormField label="Phone" value={form.receiverPhone} onChange={(v) => setForm({ ...form, receiverPhone: v })} keyboardType="phone-pad" />
            <FormField label="Delivery address" value={form.receiverAddress} onChange={(v) => setForm({ ...form, receiverAddress: v })} multiline />
            <FormField label="Town / city" value={form.receiverCity} onChange={(v) => setForm({ ...form, receiverCity: v })} />
            <Text style={styles.blockLabel}>WHAT IS BEING SHIPPED</Text>
            <FormField label="Goods description" value={form.goodsDescription} onChange={(v) => setForm({ ...form, goodsDescription: v })} multiline />

            <Text style={styles.blockLabel}>ITEMS AND PRICES</Text>
            {form.items.map((line, index) => (
              <View key={index} style={styles.lineCard}>
                <FormField
                  label={`Item ${index + 1}`}
                  value={line.description}
                  onChange={(v) => setForm({ ...form, items: form.items.map((row, i) => (i === index ? { ...row, description: v } : row)) })}
                />
                <View style={styles.actionRow}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Qty" keyboardType="number-pad" value={line.quantity}
                      onChange={(v) => setForm({ ...form, items: form.items.map((row, i) => (i === index ? { ...row, quantity: v } : row)) })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label={`Unit price (${form.currency === 'EUR' ? '\u20ac' : '\u00a3'})`} keyboardType="decimal-pad" value={line.unitPrice}
                      onChange={(v) => setForm({ ...form, items: form.items.map((row, i) => (i === index ? { ...row, unitPrice: v } : row)) })}
                    />
                  </View>
                </View>
                <Pressable hitSlop={8} onPress={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>
                  <Text style={styles.removeLine}>Remove item {index + 1}</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={styles.addLine}
              onPress={() => setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unitPrice: '' }] })}
            >
              <Text style={styles.addLineText}>+ ADD AN ITEM</Text>
            </Pressable>
            <View style={styles.editTotal}>
              <Text style={styles.editTotalLabel}>Shipment total</Text>
              <Text style={styles.editTotalValue}>
                {form.currency === 'EUR' ? '\u20ac' : '\u00a3'}
                {form.items.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.5 }]} disabled={busy} onPress={saveDetails}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Save details</Text>}
              </Pressable>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditDetails(false)}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Row k="Sender" v={senderName(shipment)} />
          <Row k="Email" v={senderEmail(shipment) || '—'} />
          <Row k="Phone" v={senderPhone(shipment) || '—'} />
          <Row k="Receiver" v={receiverName(shipment)} />
          <Row k="Receiver phone" v={receiverPhone(shipment) || '—'} />
          {phone ? <View style={styles.contactRow}>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${phone}`)}>
              <Text style={styles.contactText}>📞 Call</Text>
            </Pressable>
            <Pressable style={[styles.contactButton, { backgroundColor: '#dcfce7' }]} onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}>
              <Text style={[styles.contactText, { color: '#15803d' }]}>💬 WhatsApp</Text>
            </Pressable>
          </View> : null}
        </View>

        {/* ── Collection information ── */}
        <Text style={styles.sectionHeading}>Collection information</Text>
        <View style={styles.card}>
          <Row k="Address" v={pickupAddress(shipment)} multiline />
          <Row k="City" v={ci.city || '—'} />
          <Row k="Postcode" v={ci.postalCode || '—'} />
          <Row k="Matched route" v={collection.route ? `${collection.route}${collectionNote}` : 'No route covers this address yet'} multiline />
          <Row k="Collection date" v={collectionDateLabel(collection.date)} />
          <Row k="Assigned driver" v={driverName || 'Not assigned'} />
          <Row k="Run status" v={runInfo ? `${runInfo.status} · stop ${runInfo.stopStatus.replace('_', ' ')}` : '—'} />
        </View>

        {/* ── Shipment information ── */}
        <Text style={styles.sectionHeading}>Shipment information</Text>
        <View style={styles.card}>
          <Row k="Customer ref" v={shipment.customer_reference || meta.customerReference || '—'} />
          <Row k="Tracking" v={shipment.tracking_number || '—'} />
          <Row k="Type" v={shipmentType(shipment)} />
          <Row k="Delivery address" v={deliveryAddress(shipment)} multiline />
          <Text style={styles.blockLabel}>GOODS DESCRIPTION</Text>
          <Text style={styles.blockText}>{goodsDescription}</Text>
          {correction ? (
            <>
              <Text style={[styles.blockLabel, { color: '#b45309' }]}>DRIVER CORRECTION</Text>
              <Text style={styles.blockText}>{correction}</Text>
            </>
          ) : null}
          <Text style={styles.blockLabel}>EVERYTHING BEING SHIPPED</Text>
          {contents.length === 0 ? (
            <Text style={styles.blockText}>Nothing itemised on this booking — the description above is all the customer gave.</Text>
          ) : contents.map((line, i) => (
            <View key={`${line.label}-${i}`} style={styles.itemRow}>
              <View style={styles.itemQty}><Text style={styles.itemQtyText}>{line.quantity ?? '•'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>{line.label}</Text>
                {line.detail ? <Text style={styles.itemDetail}>{line.detail}</Text> : null}
              </View>
              {line.amount ? <Text style={styles.itemAmount}>{line.amount}</Text> : null}
            </View>
          ))}
          <Text style={styles.blockLabel}>METAL CODED SEALS</Text>
          {seals ? (
            <Text style={styles.blockText}>
              {seals.seals_used ? `${seals.seal_count} seal(s) · ${(seals.seal_codes || []).join(', ') || 'no codes'} · ${seals.condition}${seals.notes ? ` — ${seals.notes}` : ''}` : 'No seals used'}
            </Text>
          ) : (
            <Text style={styles.blockText}>{Number(shipment.seals_requested || 0) > 0 ? `${shipment.seals_requested} requested — recorded at collection` : 'None requested'}</Text>
          )}
          <Row k="Collection status" v={(shipment as any).collection_status || meta.collection?.status || '—'} />
          <Row k="Delivery note" v={deliveryNote ? deliveryNote.status : (shipment as any).delivery_note_status || 'Draft'} />
        </View>

        {/* ── Payment ── */}
        <Text style={styles.sectionHeading}>Payment</Text>
        <View style={styles.card}>
          <Row k="Method" v={invoice.paymentTerms || meta.pricing?.paymentMethod || '—'} />
          <Row k="Currency" v={invoice.currency || meta.pricing?.currency || 'GBP'} />
          <Row k="Amount" v={paymentAmount(shipment)} />
          <Row k="Status" v={invoice.paid ? 'Paid' : invoiceRow?.status || 'Payment due'} />
          <Text style={styles.blockLabel}>PROOF OF PAYMENT</Text>
          {paymentProof ? (
            <>
              {proofUri ? (
                <Pressable onPress={() => setViewer(proofUri)}>
                  <Image source={{ uri: proofUri }} style={styles.proofImage} resizeMode="cover" />
                </Pressable>
              ) : null}
              <Row k="Uploaded" v={new Date(paymentProof.created_at).toLocaleString()} />
              <Row k="Declared amount" v={paymentProof.amount ? `${paymentProof.currency === 'EUR' ? '€' : '£'}${paymentProof.amount}` : '—'} />
              <Row k="Validation" v={paymentProof.status === 'verified' ? 'Approved' : paymentProof.status === 'rejected' ? 'Rejected' : 'Pending review'} />
              {paymentProof.finance_notes ? <Row k="Notes" v={paymentProof.finance_notes} multiline /> : null}
              {paymentProof.reviewed_at ? <Row k="Reviewed" v={new Date(paymentProof.reviewed_at).toLocaleString()} /> : null}
              {canReviewProof && paymentProof.status === 'pending' ? (
                <View style={styles.actionRow}>
                  <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => reviewProof(true)}><Text style={styles.btnPrimaryText}>Approve</Text></Pressable>
                  <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => reviewProof(false)}><Text style={styles.btnDangerText}>Reject</Text></Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.blockText}>No proof of payment uploaded yet.</Text>
          )}
        </View>

        {/* ── Documents ── */}
        <Text style={styles.sectionHeading}>Documents</Text>
        <View style={styles.card}>
          {/* Open rather than export. Both documents are readable and editable
              on their own screen, with the download alongside — they used to be
              download-only, so a wrong address meant a trip to the website. */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => navigation.navigate('Document', { shipmentId: shipment.id, kind: 'invoice' })}
            >
              <Text style={styles.btnPrimaryText}>Invoice</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => navigation.navigate('Document', { shipmentId: shipment.id, kind: 'delivery_note' })}
            >
              <Text style={styles.btnPrimaryText}>Delivery note</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={[styles.btn, styles.btnOutline, downloading === 'invoice' && { opacity: 0.5 }]} onPress={downloadInvoice} disabled={downloading === 'invoice'}>
              {downloading === 'invoice' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnOutlineText}>Download invoice</Text>}
            </Pressable>
            <Pressable style={[styles.btn, styles.btnOutline, downloading === 'note' && { opacity: 0.5 }]} onPress={downloadNote} disabled={downloading === 'note'}>
              {downloading === 'note' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnOutlineText}>Download delivery note</Text>}
            </Pressable>
          </View>
          {invoiceRow ? <Row k="Invoice" v={`${invoiceRow.invoice_number} · ${invoiceRow.status}`} /> : <Row k="Invoice" v={invoice.invoiceNumber ? `${invoice.invoiceNumber} (booking)` : 'Not created yet'} />}
          {deliveryNote ? <Row k="Delivery note" v={`${deliveryNote.note_number} · ${deliveryNote.status}`} /> : null}
          <Text style={styles.blockLabel}>DRIVER PHOTOGRAPHS</Text>
          {photos.length ? (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <Pressable key={p.id} onPress={() => p.signedUrl && setViewer(p.signedUrl)} style={styles.photoCell}>
                  {p.signedUrl ? <Image source={{ uri: p.signedUrl }} style={styles.photoThumb} /> : <View style={styles.photoThumb} />}
                  <Text style={styles.photoMeta} numberOfLines={1}>{p.proof_type.replace(/_/g, ' ')}</Text>
                  <Text style={styles.photoMeta}>{new Date(p.captured_at).toLocaleDateString()}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.blockText}>
              {deletedPhotoCount > 0
                ? `${deletedPhotoCount} photograph(s) were removed by the 48-hour post-delivery retention policy. Capture details remain on file.`
                : 'No photographs captured yet.'}
            </Text>
          )}
          {photos.length > 0 && deletedPhotoCount > 0 ? (
            <Text style={styles.blockText}>{deletedPhotoCount} earlier photograph(s) removed by the retention policy.</Text>
          ) : null}
        </View>

        {/* ── Status management ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Status management</Text>
          {editing ? (
            <>
              <View style={styles.optionWrap}>
                {STATUS_OPTIONS.map((s) => {
                  const active = selected === s;
                  const isCurrent = s === shipment.status;
                  return (
                    <Pressable key={s} disabled={isCurrent} onPress={() => setSelected(s)}
                      style={[styles.option, active && styles.optionActive, isCurrent && styles.optionDisabled]}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.actionRow}>
                <Pressable style={[styles.btn, styles.btnPrimary, (busy || selected === shipment.status) && { opacity: 0.5 }]}
                  onPress={updateStatus} disabled={busy || selected === shipment.status}>
                  {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Update Status</Text>}
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => { setEditing(false); setSelected(shipment.status); }}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.actionRow}>
              {!terminal && (
                <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => setEditing(true)}>
                  <Text style={styles.btnOutlineText}>Update Status</Text>
                </Pressable>
              )}
              <Pressable style={[styles.btn, styles.btnDanger, busy && { opacity: 0.5 }]} onPress={confirmDelete} disabled={busy}>
                <Text style={styles.btnDangerText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerShade} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" /> : null}
          <Text style={styles.viewerHint}>Tap to close</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({ label, value, onChange, multiline, keyboardType, autoCapitalize }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
}) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

function Row({ k, v, multiline }: { k: string; v: string; multiline?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v} numberOfLines={multiline ? 4 : 1}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  updated: { fontSize: 12, color: colors.textMuted },
  sectionHeading: { fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingAction: { fontSize: 13, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  lineCard: { marginTop: 10, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg },
  removeLine: { fontSize: 12, fontWeight: '700', color: colors.danger, marginTop: 8 },
  addLine: { marginTop: 10, paddingVertical: 12, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary },
  addLineText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
  editTotal: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTotalLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  editTotalValue: { fontSize: 19, fontWeight: '900', color: colors.primaryDark },
  cardConfirmed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardUnconfirmed: { borderColor: colors.amberBorder, backgroundColor: colors.amberSoft },
  confirmHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  confirmTitle: { fontSize: 14, fontWeight: '800' },
  confirmText: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  fieldLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, color: colors.text, backgroundColor: colors.bg },
  fieldInputMultiline: { minHeight: 68, textAlignVertical: 'top' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemQty: { minWidth: 28, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemQtyText: { fontSize: 11.5, fontWeight: '900', color: colors.primaryDark },
  itemLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemDetail: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  itemAmount: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  k: { fontSize: 12, color: colors.textMuted, minWidth: 96 },
  v: { fontSize: 12, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: 4 },
  blockText: { fontSize: 12.5, color: colors.text, lineHeight: 18 },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  contactButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: '#dbeafe' },
  contactText: { fontSize: 12.5, fontWeight: '800', color: '#1d4ed8' },
  proofImage: { width: '100%', height: 170, borderRadius: radius.sm, backgroundColor: colors.bg },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: { width: '30.5%' },
  photoThumb: { width: '100%', height: 84, borderRadius: radius.sm, backgroundColor: colors.bg },
  photoMeta: { fontSize: 9, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionDisabled: { opacity: 0.4 },
  optionText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  optionTextActive: { color: colors.white },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: colors.primary },
  btnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.textMuted, fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: colors.danger },
  btnDangerText: { color: colors.danger, fontWeight: '700' },
  viewerShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '94%', height: '80%' },
  viewerHint: { color: '#9ca3af', fontSize: 12, marginTop: 10 },
});
