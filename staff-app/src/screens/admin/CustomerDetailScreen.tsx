import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { getInvoice, getInvoiceStatus, getPaymentSummary, hasInvoice } from '../../lib/invoice';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, stageTone } from '../../theme';
import { money, shortDate } from '../../lib/format';
import { Badge, BADGE, Avatar, Card, SectionLabel, Loading } from '../../components/adminui';
import type { MenuStackParams } from '../../navigation/types';
import type { CustomerRecord } from './CustomersScreen';

type Props = NativeStackScreenProps<MenuStackParams, 'CustomerDetail'>;

function base64Bytes(value: string) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Full customer file: identity, addresses, shipments, quotes, invoices,
// payments, proofs and notifications — with call/WhatsApp/email actions and
// audited enable/disable.
export default function CustomerDetailScreen({ route, navigation }: Props) {
  const record = route.params.record as CustomerRecord;
  const preferredShipmentId = (route.params as any).shipmentId as string | undefined;
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [pendingProof, setPendingProof] = useState<any>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofPreviewUri, setProofPreviewUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const digits = (record.phone || '').replace(/[^0-9]/g, '');
    const shipmentQuery = record.profileId
      ? supabase.from('shipments').select('id,user_id,tracking_number,customer_reference,status,created_at,metadata').eq('user_id', record.profileId)
      : record.email
        ? supabase.from('shipments').select('id,user_id,tracking_number,customer_reference,status,created_at,metadata').ilike('metadata->sender->>email', record.email)
        : supabase.from('shipments').select('id,user_id,tracking_number,customer_reference,status,created_at,metadata').ilike('metadata->>whatsappNumber', `%${digits.slice(-9)}%`);

    const [profileResult, shipmentResult] = await Promise.all([
      record.profileId
        ? supabase.from('profiles').select('*').eq('id', record.profileId).maybeSingle()
        : Promise.resolve({ data: null } as any),
      shipmentQuery.is('deleted_at', null).order('created_at', { ascending: false }).limit(40),
    ]);
    setProfile(profileResult.data || null);
    setDisabled(profileResult.data ? profileResult.data.staff_active === false : false);
    const ships = (shipmentResult.data || []) as any[];
    setShipments(ships);

    const shipmentIds = ships.map((s) => s.id);
    const [addressResult, quoteResult, invoiceResult, paymentResult, proofResult, notificationResult] = await Promise.all([
      record.profileId ? supabase.from('customer_addresses').select('*').eq('user_id', record.profileId) : Promise.resolve({ data: [] } as any),
      record.profileId
        ? supabase.from('custom_quotes').select('id,status,description,quoted_amount,currency,created_at').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(20)
        : digits
          ? supabase.from('custom_quotes').select('id,status,description,quoted_amount,currency,created_at').ilike('phone_number', `%${digits.slice(-9)}%`).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] } as any),
      // Driver invoices are a different document — the driver's own collection
      // invoice. A customer's invoice lives on their shipment as
      // metadata.invoice, which is why this section always read zero.
      Promise.resolve({ data: [] } as any),
      shipmentIds.length ? supabase.from('payments').select('id,amount,currency,payment_method,payment_status,created_at,shipment_id').in('shipment_id', shipmentIds).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] } as any),
      record.profileId ? supabase.from('payment_proofs').select('id,user_id,shipment_id,billing_month,amount,currency,status,created_at,storage_path,file_name,customer_notes').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] } as any),
      record.profileId ? supabase.from('notifications').select('id,title,message,type,created_at').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(12) : Promise.resolve({ data: [] } as any),
    ]);
    setAddresses(addressResult.data || []);
    setQuotes(quoteResult.data || []);
    // One row per shipment that carries an invoice, priced from its own lines.
    setInvoices(ships
      .filter((shipment) => hasInvoice(shipment) && !getInvoice(shipment).deletedAt)
      .map((shipment) => {
        const invoice = getInvoice(shipment);
        const { total } = getPaymentSummary(invoice);
        return {
          id: shipment.id,
          shipmentId: shipment.id,
          invoice_number: invoice.invoiceNumber || `INV-${shipment.customer_reference || shipment.tracking_number || ''}`,
          issue_date: invoice.issueDate || shipment.created_at,
          total,
          currency: invoice.currency || 'GBP',
          status: getInvoiceStatus(invoice),
        };
      }));
    setPayments(paymentResult.data || []);
    // Proofs are attached to both the signed-in customer and the shipment. The
    // shipment lookup also keeps a guest/legacy customer's proof in their file.
    const shipmentProofResult = shipmentIds.length
      ? await supabase.from('payment_proofs').select('id,user_id,shipment_id,billing_month,amount,currency,status,created_at,storage_path,file_name,customer_notes').in('shipment_id', shipmentIds).order('created_at', { ascending: false }).limit(20)
      : { data: [] as any[] };
    const proofById = new Map<string, any>();
    [...(proofResult.data || []), ...(shipmentProofResult.data || [])].forEach((proof: any) => proofById.set(proof.id, proof));
    setProofs(Array.from(proofById.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setNotifications(notificationResult.data || []);
  }, [record]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const phone = (record.phone || profile?.phone_number || '').replace(/[^0-9+]/g, '');
  const email = record.email || profile?.email;

  const uploadProof = async () => {
    const shipment = shipments.find((item) => item.id === preferredShipmentId) || shipments[0];
    const customerId = record.profileId || shipment?.user_id;
    if (!customerId || !shipment) {
      Alert.alert('Customer account needed', 'A proof must be attached to a customer account and one of their shipments.');
      return;
    }
    const image = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (image.canceled || !image.assets[0]?.base64) return;
    setUploadingProof(true);
    try {
      const sourcePayment = payments.find((payment) => payment.shipment_id === shipment.id) || payments[0];
      const path = `${customerId}/staff-proof-${Date.now()}.jpg`;
      const { error: storageError } = await supabase.storage.from('payment-proofs').upload(path, base64Bytes(image.assets[0].base64), { contentType: 'image/jpeg' });
      if (storageError) throw storageError;
      const { error } = await supabase.from('payment_proofs').insert({
        user_id: customerId, shipment_id: shipment.id, billing_month: new Date().toISOString().slice(0, 7) + '-01',
        amount: sourcePayment?.amount ? Number(sourcePayment.amount) : null, currency: sourcePayment?.currency || record.currency || 'GBP',
        storage_path: path, file_name: `staff-proof-${Date.now()}.jpg`, customer_notes: 'Uploaded by staff',
      });
      if (error) throw error;
      await load();
      Alert.alert('Proof uploaded', 'It is linked to this customer and shipment and is ready for Finance review.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Please try again.');
    } finally { setUploadingProof(false); }
  };

  const reviewProof = (proof: any, approved: boolean) => {
    const send = async (note: string | null) => {
      if (!approved && !note?.trim()) {
        Alert.alert('Say why', 'A rejected proof goes back to the customer, so tell them what was wrong with it.');
        return;
      }
      const { error } = await supabase.rpc('review_payment_proof', {
        p_proof_id: proof.id, p_approved: approved, p_finance_notes: note?.trim() || null,
      });
      if (error) { Alert.alert(approved ? 'Could not approve' : 'Could not reject', error.message); return; }
      setProofPreviewUri(null);
      await load();
      Alert.alert(approved ? 'Proof approved' : 'Proof rejected',
        approved ? 'The payment is recorded against this customer.' : 'The customer has been told and can upload another.');
    };
    // Alert.prompt is iOS-only, so elsewhere a rejection is sent with the
    // standard reason rather than silently offering no way to reject at all.
    if (!approved && Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt('Reject payment proof', 'Tell the customer why:', (note) => send(note));
      return;
    }
    Alert.alert(
      approved ? 'Approve payment proof' : 'Reject payment proof',
      approved
        ? 'Record this proof as verified and post the payment?'
        : 'Reject this proof? The customer is notified and can upload a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approved ? 'Approve' : 'Reject',
          style: approved ? 'default' : 'destructive',
          onPress: () => send(approved ? null : 'Could not be verified — please upload a clearer proof.'),
        },
      ],
    );
  };

  const viewProof = async (proof: any) => {
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 300);
    if (error || !data?.signedUrl) { Alert.alert('Could not open proof', error?.message || 'Please try again.'); return; }
    setProofPreviewUri(data.signedUrl);
    if (proof.status === 'pending') setPendingProof(proof); else setPendingProof(null);
  };

  const openShipment = (shipment: any) => {
    const routes = (navigation.getState()?.routeNames || []) as string[];
    if (routes.includes('ShipmentDetail')) (navigation as any).navigate('ShipmentDetail', { shipment });
    else (navigation as any).getParent()?.navigate('Shipments', { screen: 'ShipmentDetail', params: { shipment } });
  };

  const goToDocument = (shipmentId: string) =>
    (navigation as any).navigate('Document', { shipmentId, kind: 'invoice' });

  const openContact = async (url: string, label: string) => {
    try {
      // No `canOpenURL` gate. Android 11 hides other apps from that check
      // unless the scheme is declared in the manifest's <queries>, so it
      // answers false for tel:, mailto: and wa.me on a device that handles all
      // three perfectly well — and the button then refused to do anything.
      // Ask the system to open it and report only a real failure.
      await Linking.openURL(url);
    } catch {
      Alert.alert(`${label} could not open`, `Please try again, or use the contact details shown above.`);
    }
  };

  if (loading) return <Loading />;

  const outstandingInvoices = invoices.filter((i) => ['sent', 'partial', 'overdue', 'draft'].includes(i.status));
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
      <Card>
        <View style={styles.identityRow}>
          <Avatar name={record.fullName || email} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{record.fullName || 'Unknown customer'}</Text>
            {record.customerReference ? <Text style={styles.reference}>{record.customerReference}</Text> : null}
            <Text style={styles.meta}>{[email, record.phone].filter(Boolean).join(' · ') || 'No contact details'}</Text>
            <Text style={styles.meta}>{record.pickupAddress || 'No collection address'}{record.country ? ` · ${record.country}` : ''}</Text>
          </View>
          <Badge text={disabled ? 'Disabled' : record.active ? 'Active' : 'Inactive'} tone={disabled ? BADGE.red : record.active ? BADGE.green : BADGE.grey} />
        </View>
        <View style={styles.actionGrid}>
          {phone ? <ActionButton icon="call-outline" label="Call" onPress={() => openContact(`tel:${phone}`, 'Call')} /> : null}
          {phone ? <ActionButton icon="logo-whatsapp" label="WhatsApp" onPress={() => openContact(`https://wa.me/${phone.replace(/\D/g, '')}`, 'WhatsApp')} /> : null}
          {email ? <ActionButton icon="mail-outline" label="Email" onPress={() => openContact(`mailto:${email}`, 'Email')} /> : null}
          <ActionButton icon="cloud-upload-outline" label={uploadingProof ? 'Uploading\u2026' : 'Upload proof'} onPress={uploadingProof ? () => {} : uploadProof} />
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <Summary label="Shipments" value={String(record.shipmentCount)} />
        <Summary label="Quotes" value={String(record.quoteCount)} />
        <Summary label="Lifetime" value={money(record.lifetimeValue, record.currency === 'EUR' ? '€' : '£')} />
        <Summary label="Outstanding" value={money(record.outstanding, record.currency === 'EUR' ? '€' : '£')} tone={record.outstanding > 0 ? colors.danger : colors.primaryDark} />
      </View>

      <SectionLabel text={`Quotes (${quotes.length})`} />
      {quotes.length === 0 ? <Card><Text style={styles.meta}>No quote requests.</Text></Card> : (
        <Card>
          {quotes.map((q) => (
            <View key={q.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{q.description?.replace(/^\[[^\]]+\]\s*/, '')}</Text>
                <Text style={styles.meta}>{shortDate(q.created_at)}{q.quoted_amount ? ` · ${money(Number(q.quoted_amount), q.currency === 'EUR' ? '€' : '£')}` : ''}</Text>
              </View>
              <Badge text={q.status.replace('_', ' ')} tone={q.status === 'approved' ? BADGE.green : q.status === 'booked' ? BADGE.blue : q.status === 'rejected' ? BADGE.grey : BADGE.orange} />
            </View>
          ))}
        </Card>
      )}

      <SectionLabel text={`Invoices (${invoices.length})${outstandingInvoices.length ? ` — ${outstandingInvoices.length} open` : ''}`} />
      {invoices.length === 0 ? <Card><Text style={styles.meta}>No invoices on record.</Text></Card> : (
        <Card>
          {invoices.map((i) => (
            <Pressable key={i.id} style={styles.listRow} onPress={() => goToDocument(i.shipmentId)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{i.invoice_number}</Text>
                <Text style={styles.meta}>{shortDate(i.issue_date)}</Text>
              </View>
              <Text style={styles.rowValue}>{money(Number(i.total) || 0, i.currency === 'EUR' ? '\u20ac' : '\u00a3')}</Text>
              <Badge text={i.status} tone={i.status === 'paid' ? BADGE.green : i.status === 'overdue' ? BADGE.red : BADGE.orange} />
            </Pressable>
          ))}
        </Card>
      )}

      <SectionLabel text={`Payments (${payments.length})`} />
      {payments.length === 0 ? <Card><Text style={styles.meta}>No payments recorded.</Text></Card> : (
        <Card>
          {payments.map((p) => (
            <View key={p.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.payment_method || 'Payment'}</Text>
                <Text style={styles.meta}>{shortDate(p.created_at)}</Text>
              </View>
              <Text style={styles.rowValue}>{money(Number(p.amount) || 0, p.currency === 'EUR' ? '€' : '£')}</Text>
            </View>
          ))}
        </Card>
      )}

      {proofs.length ? (
        <>
          <SectionLabel text={`Payment proofs (${proofs.length})`} />
          <Card>
            {proofs.map((p) => (
              <Pressable key={p.id} style={styles.listRow} onPress={() => viewProof(p)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{new Date(p.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}{p.shipment_id ? ' · linked shipment' : ''}</Text>
                  <Text style={styles.meta}>{shortDate(p.created_at)}{p.amount ? ` · ${money(Number(p.amount), p.currency === 'EUR' ? '€' : '£')}` : ''}{p.customer_notes ? ` · ${p.customer_notes}` : ''}</Text>
                </View>
                <Ionicons name="eye-outline" size={17} color={colors.primaryDark} />
                <Badge text={p.status} tone={p.status === 'verified' ? BADGE.green : p.status === 'rejected' ? BADGE.red : BADGE.orange} />
              </Pressable>
            ))}
            {/* Reviewable here, not just readable. This list showed a status
                badge and nothing else, so a proof opened from a customer's
                file could be looked at but never approved or rejected. */}
            {proofs.some((p) => p.status === 'pending') ? (
              <Text style={styles.meta}>Tap a pending proof to approve or reject it.</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {notifications.length ? (
        <>
          <SectionLabel text="Recent notifications" />
          <Card>
            {notifications.map((n) => (
              <View key={n.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.meta} numberOfLines={2}>{n.message}</Text>
                </View>
                <Text style={styles.meta}>{shortDate(n.created_at)}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <Modal visible={Boolean(proofPreviewUri)} transparent animationType="fade" onRequestClose={() => setProofPreviewUri(null)}>
        <Pressable style={styles.proofViewer} onPress={() => setProofPreviewUri(null)}>
          {proofPreviewUri ? <Image source={{ uri: proofPreviewUri }} style={styles.proofPreview} resizeMode="contain" /> : null}
          <Text style={styles.proofViewerHint}>Tap to close</Text>
        </Pressable>
                {pendingProof ? (
            <View style={styles.proofActions}>
              <Pressable style={styles.proofApprove} onPress={() => reviewProof(pendingProof, true)}>
                <Text style={styles.proofApproveText}>Approve</Text>
              </Pressable>
              <Pressable style={styles.proofReject} onPress={() => reviewProof(pendingProof, false)}>
                <Text style={styles.proofRejectText}>Reject</Text>
              </Pressable>
            </View>
          ) : null}
        </Modal>
    </ScrollView>
  );
}

function ActionButton({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" style={[styles.action, danger && { backgroundColor: colors.redSoft }]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  reference: { fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 1 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  actionLabel: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summary: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, gap: 3 },
  summaryLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  summaryValue: { fontSize: 13, fontWeight: '800', color: colors.text },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowValue: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  proofActions:{flexDirection:'row',gap:spacing.sm,padding:spacing.lg},
  proofApprove:{flex:1,minHeight:48,borderRadius:radius.sm,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  proofApproveText:{color:colors.white,fontWeight:'900',fontSize:13},
  proofReject:{flex:1,minHeight:48,borderRadius:radius.sm,borderWidth:1.5,borderColor:colors.danger,alignItems:'center',justifyContent:'center'},
  proofRejectText:{color:colors.danger,fontWeight:'900',fontSize:13},
  proofViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  proofPreview: { width: '100%', height: '85%' },
  proofViewerHint: { color: '#D1D5DB', fontSize: 12, marginTop: spacing.md },
});
