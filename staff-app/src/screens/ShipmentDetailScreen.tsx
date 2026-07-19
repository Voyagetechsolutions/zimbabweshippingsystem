import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Image, Linking, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import {
  Shipment, STATUS_OPTIONS, statusStyle,
  senderName, senderEmail, senderPhone, receiverName, receiverPhone, pickupAddress, deliveryAddress,
  collectionInfo, paymentAmount, shipmentType,
} from '../lib/shipment';
import { buildInvoiceHtml, buildDeliveryNoteHtml, sharePdf } from '../lib/documents';
import type { ShipmentsStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<ShipmentsStackParams, 'ShipmentDetail'>;

interface ProofPhoto { id: string; proof_type: string; captured_at: string; signedUrl?: string; deleted_at?: string | null; }

export default function ShipmentDetailScreen({ route, navigation }: Props) {
  const { dashboardRole } = useAuth();
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

  const st = statusStyle(shipment.status);
  const ci = collectionInfo(shipment);
  const terminal = shipment.status === 'Delivered' || shipment.status === 'Cancelled';
  const meta: any = shipment.metadata || {};
  const invoice = meta.invoice || {};
  const goodsDescription = shipment.goods_description || meta.shipment?.description || '—';
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
    try { await sharePdf(buildInvoiceHtml(shipment), `${invoice.invoiceNumber || invoiceRow?.invoice_number || 'invoice'}.pdf`); }
    catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };
  const downloadNote = async () => {
    setDownloading('note');
    try { await sharePdf(buildDeliveryNoteHtml(shipment, { deliveryNote, proofSummary: { count: photos.length } }), `${deliveryNote?.note_number || 'delivery-note'}.pdf`); }
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

        {/* ── Details ── */}
        <Text style={styles.sectionHeading}>Details</Text>
        <View style={styles.card}>
          <Row k="Sender" v={senderName(shipment)} />
          <Row k="Email" v={senderEmail(shipment) || '—'} />
          <Row k="Phone" v={senderPhone(shipment) || '—'} />
          <Row k="Receiver" v={receiverName(shipment)} />
          <Row k="Receiver phone" v={receiverPhone(shipment) || '—'} />
          <View style={styles.contactRow}>
            <Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Text style={styles.contactText}>📞 Call</Text>
            </Pressable>
            <Pressable style={[styles.contactButton, { backgroundColor: '#dcfce7' }]} onPress={() => phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}>
              <Text style={[styles.contactText, { color: '#15803d' }]}>💬 WhatsApp</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Collection information ── */}
        <Text style={styles.sectionHeading}>Collection information</Text>
        <View style={styles.card}>
          <Row k="Address" v={pickupAddress(shipment)} multiline />
          <Row k="City" v={ci.city || '—'} />
          <Row k="Postcode" v={ci.postalCode || '—'} />
          <Row k="Matched route" v={ci.route} />
          <Row k="Collection date" v={ci.date} />
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
          {Array.isArray(invoice.items) && invoice.items.length > 0 && (
            <>
              <Text style={styles.blockLabel}>PACKAGES / ITEMS</Text>
              {invoice.items.map((it: any, i: number) => (
                <Text key={i} style={styles.blockText}>• {it.quantity} × {it.description}</Text>
              ))}
            </>
          )}
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
