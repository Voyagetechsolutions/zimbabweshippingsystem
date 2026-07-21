import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';
import { money } from '../../lib/format';
import { senderName, senderPhone, receiverName, receiverPhone, pickupAddress, type Shipment } from '../../lib/shipment';
import { buildDeliveryNoteHtml, sharePdf } from '../../lib/documents';
import { Badge, BADGE, Card, SectionLabel, Loading, ErrorState } from '../../components/adminui';
import { noteBadge, type DeliveryNoteRow } from './DeliveryNotesScreen';
import type { MenuStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MenuStackParams, 'DeliveryNoteDetail'>;

// Full delivery note: parties, goods, seals, driver, verification, photo
// metadata and exceptions — with the same PDF the website produces.
export default function DeliveryNoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params;
  const { dashboardRole } = useAuth();
  const [note, setNote] = useState<DeliveryNoteRow | null>(null);
  const [driver, setDriver] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [seals, setSeals] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase
      .from('delivery_notes')
      .select('*,shipment:shipments(*)')
      .eq('id', noteId)
      .maybeSingle();
    if (loadError || !data) { setError(loadError?.message || 'Delivery note not found'); return; }
    const row = { ...data, shipment: (data as any).shipment as Shipment | null } as DeliveryNoteRow & { stop_id?: string };
    setNote(row);

    const shipmentId = row.shipment_id;
    const [driverResult, sealResult, proofResult, invoiceResult, stopResult, exceptionResult] = await Promise.all([
      supabase.from('profiles').select('full_name,email,phone_number,vehicle_label').eq('id', row.driver_id).maybeSingle(),
      supabase.from('shipment_seals').select('*').eq('shipment_id', shipmentId).maybeSingle(),
      supabase.from('driver_proofs').select('id,proof_type,captured_at,deleted_at,deletion_reason').eq('shipment_id', shipmentId).order('captured_at'),
      supabase.from('driver_invoices').select('invoice_number,total,currency,status').eq('shipment_id', shipmentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      (row as any).stop_id
        ? supabase.from('driver_run_stops').select('run:driver_runs(route_name,vehicle_label,run_date)').eq('id', (row as any).stop_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from('driver_run_stops').select('failure_reason,failure_note,failed_at').eq('shipment_id', shipmentId).eq('status', 'failed'),
    ]);
    setDriver(driverResult.data || null);
    setSeals(sealResult.data || null);
    setPhotos(proofResult.data || []);
    setInvoice(invoiceResult.data || null);
    setRun((stopResult.data as any)?.run || null);
    setExceptions(exceptionResult.data || []);
  }, [noteId]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const downloadPdf = async () => {
    if (!note?.shipment) { Alert.alert('Missing shipment', 'This note has no linked shipment record.'); return; }
    setDownloading(true);
    try {
      await sharePdf(
        buildDeliveryNoteHtml(note.shipment, {
          deliveryNote: note,
          proofSummary: { count: photos.filter((p) => !p.deleted_at).length },
        }),
        `${note.note_number}.pdf`,
      );
    } catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(false); }
  };

  const markRejected = () => {
    if (dashboardRole !== 'admin') { Alert.alert('Admin only', 'Only admins can reject a delivery note.'); return; }
    Alert.alert('Mark rejected', 'Flag this delivery note for correction? The status becomes an exception.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark rejected', style: 'destructive', onPress: async () => {
          const { error: updateError } = await supabase.from('delivery_notes')
            .update({ status: 'exception', updated_at: new Date().toISOString() }).eq('id', noteId);
          if (updateError) Alert.alert('Could not update', updateError.message); else await load();
        },
      },
    ]);
  };

  if (loading) return <Loading />;
  if (error || !note) return <View style={styles.safe}><ErrorState message={error || 'Not found'} onRetry={load} /></View>;

  const shipment = note.shipment;
  const meta: any = shipment?.metadata || {};
  const badge = noteBadge(note);
  const goodsDescription = (shipment as any)?.goods_description || meta.shipment?.description || '—';
  const correction = (shipment as any)?.driver_description_correction;
  const activePhotos = photos.filter((p) => !p.deleted_at);
  const deletedPhotos = photos.filter((p) => p.deleted_at);
  const invoiceMeta = meta.invoice || {};
  const canSeePayment = dashboardRole === 'admin' || dashboardRole === 'finance';

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
      <Card>
        <View style={styles.rowTop}>
          <Text style={styles.noteNumber}>{note.note_number}</Text>
          <Badge text={badge.label} tone={badge.tone} />
        </View>
        <Text style={styles.reference}>{shipment?.customer_reference || '—'} · {shipment?.tracking_number || 'No tracking'}</Text>
        <View style={styles.actionRow}>
          <Pressable style={[styles.primaryButton, downloading && { opacity: 0.5 }]} disabled={downloading} onPress={downloadPdf}>
            <Ionicons name="download-outline" size={15} color={colors.white} />
            <Text style={styles.primaryText}>{downloading ? 'Preparing…' : 'Download / share PDF'}</Text>
          </Pressable>
        </View>
      </Card>

      <SectionLabel text="Parties" />
      <Card>
        <Block label="SENDER" lines={[shipment ? senderName(shipment) : '—', shipment ? senderPhone(shipment) : '', shipment ? pickupAddress(shipment) : '']} />
        <Block label="RECEIVER" lines={[note.recipient_name || (shipment ? receiverName(shipment) : '—'), shipment ? receiverPhone(shipment) : '', note.delivery_address || shipment?.destination || '']} />
      </Card>

      <SectionLabel text="Goods" />
      <Card>
        <Block label="DETAILED DESCRIPTION" lines={[goodsDescription]} />
        {correction ? <Block label="DRIVER CORRECTION" lines={[correction]} tone="#b45309" /> : null}
        {Array.isArray(invoiceMeta.items) && invoiceMeta.items.length ? (
          <Block label="PACKAGES / DRUMS / TRUNKS" lines={invoiceMeta.items.map((it: any) => `${it.quantity} × ${it.description}`)} />
        ) : null}
        <Block label="METAL CODED SEALS" lines={[
          seals
            ? seals.seals_used
              ? `${seals.seal_count} seal(s) · ${(seals.seal_codes || []).join(', ') || 'codes pending'} · ${seals.condition}${seals.notes ? ` — ${seals.notes}` : ''}`
              : 'No seals used'
            : Number((shipment as any)?.seals_requested || 0) > 0 ? `${(shipment as any).seals_requested} requested` : 'None',
        ]} />
      </Card>

      <SectionLabel text="Transport & verification" />
      <Card>
        <Row k="Driver" v={driver?.full_name || driver?.email || '—'} />
        <Row k="Vehicle" v={run?.vehicle_label || driver?.vehicle_label || '—'} />
        <Row k="Route" v={run?.route_name || meta.collection?.route || '—'} />
        <Row k="Collection date" v={meta.collectionConfirmation?.collectedAt ? new Date(meta.collectionConfirmation.collectedAt).toLocaleString() : meta.collection?.date || '—'} />
        <Row k="Delivery date" v={note.delivered_at ? new Date(note.delivered_at).toLocaleString() : 'Pending'} />
        <Row k="Delivery code" v={note.customer_code_verified ? 'Verified' : 'Not verified'} />
        <Row k="Digital signature" v={note.customer_code_verified ? 'Customer code handover' : '—'} />
        {note.notes ? <Row k="Driver notes" v={note.notes} multiline /> : null}
      </Card>

      {exceptions.length ? (
        <>
          <SectionLabel text="Delivery exceptions" />
          <Card>
            {exceptions.map((ex, i) => (
              <Text key={i} style={styles.exception}>
                {String(ex.failure_reason || 'other').replace(/_/g, ' ')}{ex.failure_note ? ` — ${ex.failure_note}` : ''}
                {ex.failed_at ? ` (${new Date(ex.failed_at).toLocaleString()})` : ''}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel text="Photographs" />
      <Card>
        {activePhotos.length ? activePhotos.map((p) => (
          <Row key={p.id} k={p.proof_type.replace(/_/g, ' ')} v={new Date(p.captured_at).toLocaleString()} />
        )) : <Text style={styles.meta}>No photographs currently on file.</Text>}
        {deletedPhotos.length ? (
          <Text style={styles.meta}>{deletedPhotos.length} photograph(s) removed by the 48-hour retention policy — capture records retained.</Text>
        ) : null}
      </Card>

      {canSeePayment ? (
        <>
          <SectionLabel text="Payment" />
          <Card>
            <Row k="Invoice" v={invoice ? `${invoice.invoice_number} · ${invoice.status}` : invoiceMeta.invoiceNumber || '—'} />
            <Row k="Amount" v={invoice ? money(Number(invoice.total) || 0, invoice.currency === 'EUR' ? '€' : '£')
              : invoiceMeta.items ? money((invoiceMeta.items as any[]).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), invoiceMeta.currency === 'EUR' ? '€' : '£') : '—'} />
            <Row k="Method" v={invoiceMeta.paymentTerms || '—'} />
            <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Invoices')}>
              <Text style={styles.link}>View invoices</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </Card>
        </>
      ) : null}

      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryButton} onPress={() => shipment && (navigation as any).getParent()?.navigate('Shipments', { screen: 'ShipmentDetail', params: { shipment } })}>
          <Text style={styles.secondaryText}>View shipment</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Customers')}>
          <Text style={styles.secondaryText}>View customer</Text>
        </Pressable>
        {note.status !== 'exception' && dashboardRole === 'admin' ? (
          <Pressable style={[styles.secondaryButton, { borderColor: colors.danger }]} onPress={markRejected}>
            <Text style={[styles.secondaryText, { color: colors.danger }]}>Mark rejected</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Block({ label, lines, tone }: { label: string; lines: string[]; tone?: string }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.blockLabel}>{label}</Text>
      {lines.filter(Boolean).map((line, i) => (
        <Text key={i} style={[styles.blockText, tone ? { color: tone } : null]}>{line}</Text>
      ))}
    </View>
  );
}

function Row({ k, v, multiline }: { k: string; v: string; multiline?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v} numberOfLines={multiline ? 4 : 2}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  noteNumber: { fontSize: 17, fontWeight: '800', color: colors.text },
  reference: { fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 2 },
  actionRow: { marginTop: spacing.md },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12 },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 12.5 },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 3 },
  blockText: { fontSize: 12.5, color: colors.text, lineHeight: 18 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 4 },
  k: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  v: { fontSize: 12, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' },
  meta: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  exception: { fontSize: 12.5, color: colors.danger, fontWeight: '700', lineHeight: 18, paddingVertical: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  link: { fontSize: 12, fontWeight: '800', color: colors.primary },
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secondaryButton: { flexGrow: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
});
