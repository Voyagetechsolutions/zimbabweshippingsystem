import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow, spacing } from '../../theme';
import {
  type Shipment, receiverName, receiverPhone, senderName, senderPhone, deliveryAddress, pickupAddress,
} from '../../lib/shipment';
import {
  calculateTotals, getInvoice, getInvoiceStatus, getPaymentSummary, INVOICE_STATUS_STYLE,
  invoiceSymbol, type InvoiceData, type InvoiceLineItem,
} from '../../lib/invoice';
import { buildDeliveryNoteHtml, buildInvoiceHtml, sharePdf } from '../../lib/documents';
import { collectionDateLabel, loadSchedules, resolveCollection, type ScheduleRow } from '../../lib/collectionSchedule';
import { BackButton } from '../../components/adminui';

/**
 * The invoice and the delivery note, on screen and editable.
 *
 * Both were download-only: a button that produced a PDF and nothing else. Staff
 * could not read a document without exporting it, and could not correct a wrong
 * address or a missing line without going to the website — which is where the
 * delivery-note editor lived, and only there.
 *
 * So both are rendered natively here, in the same order as the PDF, and both
 * are editable in place. The invoice edits `metadata.invoice`, which is the
 * same record the website's billing generator reads. The delivery note edits
 * `metadata.deliveryNoteOverrides`, the shape the website's note editor has
 * always written, so a note corrected on either side reads the same on both.
 */

type Kind = 'invoice' | 'delivery_note';

type NoteOverrides = {
  refNumber?: string;
  date?: string;
  deliveryDate?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  tracking?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function DocumentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const { shipmentId, kind } = (route.params || {}) as { shipmentId: string; kind: Kind };

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [deliveryNote, setDeliveryNote] = useState<any>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceData>({});
  const [noteDraft, setNoteDraft] = useState<NoteOverrides>({});

  const load = useCallback(async () => {
    const [shipmentResult, noteResult, scheduleRows] = await Promise.all([
      supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle(),
      supabase.from('delivery_notes').select('*').eq('shipment_id', shipmentId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      loadSchedules(),
    ]);
    setShipment((shipmentResult.data as Shipment) || null);
    setDeliveryNote(noteResult.data || null);
    setSchedules(scheduleRows);
    setLoading(false);
  }, [shipmentId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const invoice = shipment ? getInvoice(shipment) : {};
  const totals = useMemo(() => calculateTotals(editing && kind === 'invoice' ? invoiceDraft : invoice),
    [invoice, invoiceDraft, editing, kind]);
  const summary = useMemo(() => getPaymentSummary(editing && kind === 'invoice' ? invoiceDraft : invoice),
    [invoice, invoiceDraft, editing, kind]);
  const collection = useMemo(
    () => (shipment ? resolveCollection(shipment, schedules) : { route: null, date: null, source: null }),
    [shipment, schedules]);
  const overrides: NoteOverrides = (shipment?.metadata as any)?.deliveryNoteOverrides || {};

  const startEdit = () => {
    if (!shipment) return;
    if (kind === 'invoice') {
      const current = getInvoice(shipment);
      setInvoiceDraft({
        ...current,
        invoiceNumber: current.invoiceNumber || `INV-${shipment.customer_reference || shipment.tracking_number || ''}`,
        issueDate: current.issueDate || today(),
        currency: current.currency || 'GBP',
        items: (current.items || []).map((item) => ({ ...item })),
      });
    } else {
      setNoteDraft({
        refNumber: overrides.refNumber || deliveryNote?.note_number || `DN-${shipment.customer_reference || shipment.tracking_number || ''}`,
        date: overrides.date || today(),
        deliveryDate: overrides.deliveryDate || '',
        senderName: overrides.senderName || senderName(shipment),
        senderPhone: overrides.senderPhone || (senderPhone(shipment) === 'No Phone' ? '' : senderPhone(shipment)),
        senderAddress: overrides.senderAddress || pickupAddress(shipment),
        recipientName: overrides.recipientName || receiverName(shipment),
        recipientPhone: overrides.recipientPhone || (receiverPhone(shipment) === 'No Phone' ? '' : receiverPhone(shipment)),
        recipientAddress: overrides.recipientAddress || deliveryAddress(shipment),
        tracking: overrides.tracking || shipment.tracking_number || '',
      });
    }
    setEditing(true);
  };

  const save = async () => {
    if (!shipment) return;
    if (kind === 'invoice') {
      const items = invoiceDraft.items || [];
      if (!invoiceDraft.invoiceNumber?.trim()) {
        Alert.alert('Invoice number required', 'Give the invoice a number before saving.');
        return;
      }
      if (!items.length || items.some((item) => !String(item.description || '').trim())) {
        Alert.alert('Describe every line', 'Each invoice line needs a description. Remove any line you do not need.');
        return;
      }
    } else if (!noteDraft.refNumber?.trim()) {
      Alert.alert('Reference required', 'Give the delivery note a reference before saving.');
      return;
    }

    setBusy(true);
    try {
      const metadata = kind === 'invoice'
        ? { ...(shipment.metadata || {}), invoice: { ...getInvoice(shipment), ...invoiceDraft } }
        : { ...(shipment.metadata || {}), deliveryNoteOverrides: { ...overrides, ...noteDraft } };
      const { error } = await supabase.from('shipments')
        .update({ metadata, updated_at: new Date().toISOString() }).eq('id', shipment.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: session?.user.id,
        action: kind === 'invoice' ? 'EDIT_INVOICE' : 'EDIT_DELIVERY_NOTE',
        entity_type: 'SHIPMENT', entity_id: shipment.id,
        details: { tracking_number: shipment.tracking_number },
      });
      setShipment({ ...shipment, metadata });
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'No changes were saved. Check your access and try again.');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!shipment) return;
    setBusy(true);
    try {
      const html = kind === 'invoice'
        ? buildInvoiceHtml(shipment, collection)
        : buildDeliveryNoteHtml(shipment, { deliveryNote, collection });
      const name = kind === 'invoice'
        ? `${invoice.invoiceNumber || shipment.customer_reference || 'invoice'}.pdf`
        : `${overrides.refNumber || deliveryNote?.note_number || shipment.customer_reference || 'delivery-note'}.pdf`;
      await sharePdf(html, name);
    } catch (e: any) {
      Alert.alert('Could not produce the document', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><ActivityIndicator style={{ marginTop: 90 }} size="large" color={colors.primary} /></SafeAreaView>;
  }
  if (!shipment) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><BackButton /><Text style={styles.title}>Not found</Text></View>
        <Text style={styles.muted}>This shipment could not be loaded.</Text>
      </SafeAreaView>
    );
  }

  const symbol = invoiceSymbol(invoice.currency);
  const statusTone = INVOICE_STATUS_STYLE[getInvoiceStatus(invoice)];
  const patchItem = (index: number, patch: Partial<InvoiceLineItem>) =>
    setInvoiceDraft((draft) => ({
      ...draft,
      items: (draft.items || []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{kind === 'invoice' ? 'INVOICE' : 'DELIVERY NOTE'}</Text>
            <Text style={styles.title}>
              {kind === 'invoice'
                ? invoice.invoiceNumber || `INV-${shipment.customer_reference || ''}`
                : overrides.refNumber || deliveryNote?.note_number || `DN-${shipment.customer_reference || ''}`}
            </Text>
            <Text style={styles.muted}>{senderName(shipment)} · {shipment.tracking_number}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {!editing ? (
            <Pressable style={[styles.action, styles.actionPrimary]} onPress={startEdit}>
              <Ionicons name="create-outline" size={17} color={colors.white} />
              <Text style={styles.actionPrimaryText}>Edit</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.action, busy && { opacity: 0.5 }]} disabled={busy} onPress={download}>
            <Ionicons name="download-outline" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Download</Text>
          </Pressable>
        </View>

        {editing ? (
          <View style={styles.card}>
            {kind === 'invoice' ? (
              <>
                <Field label="Invoice number" value={invoiceDraft.invoiceNumber || ''} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, invoiceNumber: v })} />
                <View style={styles.row}>
                  <Field style={{ flex: 1 }} label="Issue date (YYYY-MM-DD)" value={invoiceDraft.issueDate || ''} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, issueDate: v })} />
                  <Field style={{ flex: 1 }} label="Due date (YYYY-MM-DD)" value={invoiceDraft.dueDate || ''} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, dueDate: v })} />
                </View>
                <Text style={styles.blockLabel}>CURRENCY</Text>
                <View style={styles.row}>
                  {['GBP', 'EUR', 'USD'].map((code) => (
                    <Pressable key={code} style={[styles.chip, invoiceDraft.currency === code && styles.chipOn]} onPress={() => setInvoiceDraft({ ...invoiceDraft, currency: code })}>
                      <Text style={[styles.chipText, invoiceDraft.currency === code && { color: colors.white }]}>{code}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.blockLabel}>LINES</Text>
                {(invoiceDraft.items || []).map((item, index) => (
                  <View key={index} style={styles.lineCard}>
                    <Field label={`Line ${index + 1} description`} value={String(item.description || '')} onChange={(v) => patchItem(index, { description: v })} />
                    <View style={styles.row}>
                      <Field style={{ flex: 1 }} label="Qty" keyboard="number-pad" value={String(item.quantity ?? '')} onChange={(v) => patchItem(index, { quantity: Number(v) || 0 })} />
                      <Field style={{ flex: 1 }} label={`Unit price (${invoiceSymbol(invoiceDraft.currency)})`} keyboard="decimal-pad" value={String(item.unitPrice ?? '')} onChange={(v) => patchItem(index, { unitPrice: Number(v) || 0 })} />
                    </View>
                    {(invoiceDraft.items || []).length > 1 ? (
                      <Pressable hitSlop={8} onPress={() => setInvoiceDraft({ ...invoiceDraft, items: (invoiceDraft.items || []).filter((_, i) => i !== index) })}>
                        <Text style={styles.remove}>Remove line {index + 1}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable style={styles.addLine} onPress={() => setInvoiceDraft({ ...invoiceDraft, items: [...(invoiceDraft.items || []), { item: '', description: '', quantity: 1, unitPrice: 0 }] })}>
                  <Text style={styles.addLineText}>+ ADD A LINE</Text>
                </Pressable>

                <View style={styles.row}>
                  <Field style={{ flex: 1 }} label="Discount" keyboard="decimal-pad" value={String(invoiceDraft.discount ?? '')} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, discount: Number(v) || 0 })} />
                  <Field style={{ flex: 1 }} label="Tax rate %" keyboard="decimal-pad" value={String(invoiceDraft.taxRate ?? '')} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, taxRate: Number(v) || 0 })} />
                </View>
                <Field label="Payment terms" value={invoiceDraft.paymentTerms || ''} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, paymentTerms: v })} />
                <Field label="Notes" multiline value={invoiceDraft.notes || ''} onChange={(v) => setInvoiceDraft({ ...invoiceDraft, notes: v })} />
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Invoice total</Text>
                  <Text style={styles.totalValue}>{invoiceSymbol(invoiceDraft.currency)}{totals.total.toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <>
                <Field label="Delivery note reference" value={noteDraft.refNumber || ''} onChange={(v) => setNoteDraft({ ...noteDraft, refNumber: v })} />
                <View style={styles.row}>
                  <Field style={{ flex: 1 }} label="Note date (YYYY-MM-DD)" value={noteDraft.date || ''} onChange={(v) => setNoteDraft({ ...noteDraft, date: v })} />
                  <Field style={{ flex: 1 }} label="Delivery date (optional)" value={noteDraft.deliveryDate || ''} onChange={(v) => setNoteDraft({ ...noteDraft, deliveryDate: v })} />
                </View>
                <Field label="Tracking number" value={noteDraft.tracking || ''} onChange={(v) => setNoteDraft({ ...noteDraft, tracking: v })} />
                <Text style={styles.blockLabel}>SHIPPER</Text>
                <Field label="Name" value={noteDraft.senderName || ''} onChange={(v) => setNoteDraft({ ...noteDraft, senderName: v })} />
                <Field label="Phone" keyboard="phone-pad" value={noteDraft.senderPhone || ''} onChange={(v) => setNoteDraft({ ...noteDraft, senderPhone: v })} />
                <Field label="Address" multiline value={noteDraft.senderAddress || ''} onChange={(v) => setNoteDraft({ ...noteDraft, senderAddress: v })} />
                <Text style={styles.blockLabel}>RECIPIENT</Text>
                <Field label="Name" value={noteDraft.recipientName || ''} onChange={(v) => setNoteDraft({ ...noteDraft, recipientName: v })} />
                <Field label="Phone" keyboard="phone-pad" value={noteDraft.recipientPhone || ''} onChange={(v) => setNoteDraft({ ...noteDraft, recipientPhone: v })} />
                <Field label="Address" multiline value={noteDraft.recipientAddress || ''} onChange={(v) => setNoteDraft({ ...noteDraft, recipientAddress: v })} />
                <Text style={styles.muted}>
                  Items and seals come from the shipment itself, so they stay correct on every document.
                  Change those on the shipment rather than here.
                </Text>
              </>
            )}

            <View style={styles.row}>
              <Pressable style={[styles.action, styles.actionPrimary, { flex: 1 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={save}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionPrimaryText}>Save changes</Text>}
              </Pressable>
              <Pressable style={[styles.action, { flex: 1 }]} onPress={() => setEditing(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            {/* Same order as the PDF, so what is checked here is what prints. */}
            <Row k="Customer ref" v={shipment.customer_reference || '—'} />
            <Row k="Tracking" v={overrides.tracking || shipment.tracking_number || '—'} />
            <Row k="Collection" v={`${collection.route || 'No route yet'} · ${collectionDateLabel(collection.date)}`} multiline />
            {kind === 'invoice' ? (
              <>
                <Row k="Issue date" v={invoice.issueDate || '—'} />
                <Row k="Due date" v={invoice.dueDate || '—'} />
                <Row k="Status" v={statusTone.label} />
                <Text style={styles.blockLabel}>BILL TO</Text>
                <Text style={styles.body}>{senderName(shipment)}</Text>
                <Text style={styles.body}>{pickupAddress(shipment)}</Text>
                <Text style={styles.blockLabel}>LINES</Text>
                {(invoice.items || []).length === 0 ? (
                  <Text style={styles.muted}>No lines on this invoice yet. Tap Edit to add them.</Text>
                ) : (invoice.items || []).map((item, index) => (
                  <View key={index} style={styles.lineRow}>
                    <View style={styles.lineQty}><Text style={styles.lineQtyText}>{item.quantity ?? 1}</Text></View>
                    <Text style={styles.lineName}>{item.description || item.item || 'Item'}</Text>
                    <Text style={styles.lineAmount}>{symbol}{((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}</Text>
                  </View>
                ))}
                <Row k="Subtotal" v={`${symbol}${totals.subtotal.toFixed(2)}`} />
                {totals.discount > 0 ? <Row k="Discount" v={`− ${symbol}${totals.discount.toFixed(2)}`} /> : null}
                {totals.tax > 0 ? <Row k="Tax" v={`${symbol}${totals.tax.toFixed(2)}`} /> : null}
                <Row k="Total" v={`${symbol}${totals.total.toFixed(2)}`} />
                <Row k="Paid" v={`${symbol}${summary.paidAmount.toFixed(2)}`} />
                <Row k="Balance due" v={`${symbol}${summary.balance.toFixed(2)}`} />
                {invoice.paymentTerms ? <><Text style={styles.blockLabel}>PAYMENT TERMS</Text><Text style={styles.body}>{invoice.paymentTerms}</Text></> : null}
                {invoice.notes ? <><Text style={styles.blockLabel}>NOTES</Text><Text style={styles.body}>{invoice.notes}</Text></> : null}
              </>
            ) : (
              <>
                <Row k="Note date" v={overrides.date || today()} />
                {overrides.deliveryDate ? <Row k="Delivery date" v={overrides.deliveryDate} /> : null}
                <Row k="Note status" v={deliveryNote?.status || (shipment as any).delivery_note_status || 'Draft'} />
                <Text style={styles.blockLabel}>SHIPPER</Text>
                <Text style={styles.body}>{overrides.senderName || senderName(shipment)}</Text>
                <Text style={styles.body}>{overrides.senderPhone || senderPhone(shipment)}</Text>
                <Text style={styles.body}>{overrides.senderAddress || pickupAddress(shipment)}</Text>
                <Text style={styles.blockLabel}>RECIPIENT</Text>
                <Text style={styles.body}>{overrides.recipientName || receiverName(shipment)}</Text>
                <Text style={styles.body}>{overrides.recipientPhone || receiverPhone(shipment)}</Text>
                <Text style={styles.body}>{overrides.recipientAddress || deliveryAddress(shipment)}</Text>
                <Text style={styles.blockLabel}>GOODS</Text>
                {(invoice.items || []).length === 0 ? (
                  <Text style={styles.body}>{shipment.goods_description || 'Not itemised'}</Text>
                ) : (invoice.items || []).map((item, index) => (
                  <View key={index} style={styles.lineRow}>
                    <View style={styles.lineQty}><Text style={styles.lineQtyText}>{item.quantity ?? 1}</Text></View>
                    <Text style={styles.lineName}>{item.description || item.item || 'Item'}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v, multiline }: { k: string; v: string; multiline?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v} numberOfLines={multiline ? 3 : 1}>{v}</Text>
    </View>
  );
}

function Field({ label, value, onChange, multiline, keyboard, style }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean;
  keyboard?: 'default' | 'number-pad' | 'decimal-pad' | 'phone-pad'; style?: object;
}) {
  return (
    <View style={[{ marginTop: 10 }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboard || 'default'}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 70, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9, color: colors.primary },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface,
  },
  actionText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionPrimaryText: { fontSize: 13, fontWeight: '800', color: colors.white },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 2, ...shadow },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  k: { fontSize: 12, color: colors.textMuted, minWidth: 96 },
  v: { fontSize: 12.5, color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  blockLabel: { fontSize: 9.5, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 4 },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  lineQty: { minWidth: 28, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  lineQtyText: { fontSize: 11.5, fontWeight: '900', color: colors.primaryDark },
  lineName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  lineAmount: { fontSize: 13, fontWeight: '800', color: colors.text },
  lineCard: { marginTop: 10, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg },
  fieldLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  input: { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, color: colors.text, backgroundColor: colors.bg },
  inputMultiline: { minHeight: 68, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  remove: { fontSize: 12, fontWeight: '700', color: colors.danger, marginTop: 10 },
  addLine: { marginTop: 10, paddingVertical: 12, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.primary },
  addLineText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
  totalBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  totalValue: { fontSize: 19, fontWeight: '900', color: colors.primaryDark },
});
