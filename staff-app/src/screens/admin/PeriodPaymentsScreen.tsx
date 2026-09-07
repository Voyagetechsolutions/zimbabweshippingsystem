import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { money, shortDate } from '../../lib/format';
import { senderName, type Shipment } from '../../lib/shipment';
import { getInvoice, getPaymentSummary, invoiceSymbol } from '../../lib/invoice';

/**
 * The money that came in against one collection period.
 *
 * Read from metadata.invoice.payments, which is where a receipt actually
 * lives — the same source behind every "Paid" figure in the app. The payments
 * table looks like the obvious place and is not: its rows are almost entirely
 * `pending`, written at booking time to record how a customer *intends* to
 * pay. Totalling those would show tens of thousands received against a period
 * where a few hundred had arrived, and would contradict the card above it.
 *
 * Grouped by how the money arrived, because that is the question — cash at
 * the door, bank transfer, proof upload — and followed by the proofs still
 * waiting on somebody, which is the only actionable part of the screen.
 */

type Params = { periodId: string; name?: string };

type Receipt = {
  shipmentId: string;
  customer: string;
  reference: string;
  amount: number;
  currency: string;
  method: string;
  date: string | null;
};

export default function PeriodPaymentsScreen() {
  const navigation = useNavigation<any>();
  const { periodId, name } = (useRoute().params || {}) as Params;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error: loadError } = await supabase
        .from('shipments')
        .select('id,tracking_number,customer_reference,status,created_at,metadata')
        .eq('collection_period_id', periodId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (loadError) throw loadError;
      const rows = (data || []) as Shipment[];
      setShipments(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { data: proofRows } = await supabase
          .from('payment_proofs')
          .select('id,shipment_id,amount,currency,status,created_at,file_name')
          .in('shipment_id', ids)
          .order('created_at', { ascending: false });
        setProofs(proofRows || []);
      } else {
        setProofs([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load payments for this period.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Every receipt recorded against a shipment in this period. */
  const receipts = useMemo<Receipt[]>(() => {
    const out: Receipt[] = [];
    for (const shipment of shipments) {
      const invoice = getInvoice(shipment);
      if (invoice.deletedAt) continue;
      for (const entry of invoice.payments || []) {
        const amount = Number(entry.amount) || 0;
        if (amount <= 0) continue;
        out.push({
          shipmentId: shipment.id,
          customer: senderName(shipment),
          reference: invoice.invoiceNumber || shipment.tracking_number || '',
          amount,
          currency: invoice.currency || 'GBP',
          method: String(entry.method || '').trim() || 'Not recorded',
          date: entry.date || null,
        });
      }
    }
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [shipments]);

  /** Received and still owed, per currency — never added together. */
  const report = useMemo(() => {
    const totals = new Map<string, { invoiced: number; received: number }>();
    for (const shipment of shipments) {
      const invoice = getInvoice(shipment);
      if (invoice.deletedAt) continue;
      const { total, paidAmount } = getPaymentSummary(invoice);
      const currency = invoice.currency || 'GBP';
      const bucket = totals.get(currency) || { invoiced: 0, received: 0 };
      bucket.invoiced += total;
      bucket.received += paidAmount;
      totals.set(currency, bucket);
    }
    return [...totals.entries()]
      .filter(([, v]) => v.invoiced > 0 || v.received > 0)
      .map(([currency, v]) => ({
        currency,
        symbol: invoiceSymbol(currency),
        received: v.received,
        outstanding: Math.max(0, v.invoiced - v.received),
      }))
      .sort((a, b) => b.received - a.received);
  }, [shipments]);

  /** By how the money arrived. */
  const byMethod = useMemo(() => {
    const map = new Map<string, Receipt[]>();
    for (const receipt of receipts) {
      (map.get(receipt.method) || map.set(receipt.method, []).get(receipt.method)!).push(receipt);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [receipts]);

  const awaiting = useMemo(
    () => proofs.filter((p) => String(p.status || '').toLowerCase() === 'pending'),
    [proofs],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name || 'Collection period'}</Text>
          <Text style={styles.subtitle}>
            {receipts.length} payment{receipts.length === 1 ? '' : 's'} received
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Proof of payment"
          style={styles.iconButton}
          onPress={() => navigation.navigate('PaymentProofs')}
        >
          <Ionicons name="document-attach-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>MONEY IN THIS PERIOD</Text>
          {report.length === 0 ? (
            <Text style={styles.meta}>Nothing invoiced in this period yet.</Text>
          ) : report.map((line) => (
            <View key={line.currency}>
              {report.length > 1 ? <Text style={styles.currencyLabel}>{line.currency}</Text> : null}
              <View style={styles.figures}>
                <Figure label="Received" value={money(line.received, line.symbol)} tone={colors.primaryDark} />
                <Figure
                  label="Still owed"
                  value={money(line.outstanding, line.symbol)}
                  tone={line.outstanding > 0 ? colors.danger : colors.primaryDark}
                />
              </View>
            </View>
          ))}
          {awaiting.length ? (
            <Text style={styles.meta}>{awaiting.length} proof of payment waiting to be reviewed</Text>
          ) : null}
        </View>

        {awaiting.length > 0 ? (
          <View style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={[styles.groupTitle, { color: colors.amber }]}>AWAITING REVIEW</Text>
              <Text style={styles.groupCount}>{awaiting.length}</Text>
            </View>
            {awaiting.map((proof) => (
              <Pressable
                key={proof.id}
                style={styles.row}
                onPress={() => navigation.navigate('PaymentProofs')}
              >
                <Ionicons name="document-attach-outline" size={18} color={colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{proof.file_name || 'Proof of payment'}</Text>
                  <Text style={styles.meta}>{shortDate(proof.created_at)}</Text>
                </View>
                <Text style={styles.amount}>
                  {money(Number(proof.amount) || 0, invoiceSymbol(proof.currency))}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {byMethod.map(([method, rows]) => (
          <View key={method} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{method.toUpperCase()}</Text>
              <Text style={styles.groupCount}>{rows.length}</Text>
            </View>
            {rows.map((receipt, index) => (
              <Pressable
                key={`${receipt.shipmentId}-${index}`}
                style={styles.row}
                onPress={() => navigation.navigate('Document', {
                  shipmentId: receipt.shipmentId, kind: 'invoice',
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{receipt.customer}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {receipt.reference}{receipt.date ? ` · ${receipt.date}` : ''}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {money(receipt.amount, invoiceSymbol(receipt.currency))}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}

        {receipts.length === 0 && awaiting.length === 0 && !error ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>No payments received in this period yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { padding: 4 },
  iconButton: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 13 },
  reportCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  reportTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.7 },
  currencyLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.6, marginTop: 6 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  group: { gap: 4, marginTop: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  groupTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 },
  groupCount: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  amount: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
});
