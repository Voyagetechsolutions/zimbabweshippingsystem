import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { money } from '../../lib/format';
import { senderName, type Shipment } from '../../lib/shipment';
import {
  INVOICE_STATUS_STYLE, getInvoice, getInvoiceStatus, getPaymentSummary,
  hasIssuedInvoice, invoiceSymbol,
} from '../../lib/invoice';

/**
 * The invoices raised in one collection period.
 *
 * Grouped by what is owed rather than by route, unlike the shipment view.
 * The question asked of a period's invoices is always "who still has to pay",
 * and a driver's route is no help in answering it — the unpaid work is spread
 * across every route in the period.
 *
 * Every figure comes from metadata.invoice, the same place the invoice
 * document, the customer's app and the website read, so a period cannot
 * disagree with the paperwork inside it.
 */

type Params = { periodId: string; name?: string };

const GROUPS = [
  { key: 'unpaid', label: 'NOT PAID' },
  { key: 'partial', label: 'PART PAID' },
  { key: 'paid', label: 'PAID IN FULL' },
] as const;

export default function PeriodInvoicesScreen() {
  const navigation = useNavigation<any>();
  const { periodId, name } = (useRoute().params || {}) as Params;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase
      .from('shipments')
      .select('id,tracking_number,customer_reference,status,created_at,metadata')
      .eq('collection_period_id', periodId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (loadError) setError(loadError.message);
    else setShipments((data || []) as Shipment[]);
    setLoading(false);
    setRefreshing(false);
  }, [periodId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Only shipments that actually carry a live invoice. */
  const invoiced = useMemo(
    () => shipments.filter((s) => hasIssuedInvoice(s)),
    [shipments],
  );

  const report = useMemo(() => {
    const totals = new Map<string, { invoiced: number; paid: number }>();
    for (const shipment of invoiced) {
      const invoice = getInvoice(shipment);
      const { total, paidAmount } = getPaymentSummary(invoice);
      const currency = invoice.currency || 'GBP';
      const bucket = totals.get(currency) || { invoiced: 0, paid: 0 };
      bucket.invoiced += total;
      bucket.paid += paidAmount;
      totals.set(currency, bucket);
    }
    // Currencies are never added together: a period holds UK and Irish work,
    // and pounds plus euros is a number that is not money in either.
    return [...totals.entries()].map(([currency, v]) => ({
      currency,
      symbol: invoiceSymbol(currency),
      invoiced: v.invoiced,
      paid: v.paid,
      outstanding: Math.max(0, v.invoiced - v.paid),
    })).sort((a, b) => b.invoiced - a.invoiced);
  }, [invoiced]);

  const grouped = useMemo(() => {
    const buckets: Record<string, Shipment[]> = { unpaid: [], partial: [], paid: [] };
    for (const shipment of invoiced) {
      const invoice = getInvoice(shipment);
      const { total, paidAmount } = getPaymentSummary(invoice);
      if (total > 0 && paidAmount >= total - 0.005) buckets.paid.push(shipment);
      else if (paidAmount > 0.005) buckets.partial.push(shipment);
      else buckets.unpaid.push(shipment);
    }
    // Biggest debt first inside each group — that is the order somebody
    // chasing payment would work in.
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => {
        const left = getPaymentSummary(getInvoice(a));
        const right = getPaymentSummary(getInvoice(b));
        return (right.total - right.paidAmount) - (left.total - left.paidAmount);
      });
    }
    return buckets;
  }, [invoiced]);

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
            {invoiced.length} invoice{invoiced.length === 1 ? '' : 's'}
          </Text>
        </View>
        {/* Creating an invoice still belongs to the invoice list, which owns
            that form — this is the way through to it, so nothing is lost by
            entering invoices through a period. */}
        <Pressable
          style={styles.create}
          onPress={() => navigation.navigate('Invoices', { create: true })}
        >
          <Ionicons name="add" size={17} color="#fff" />
          <Text style={styles.createText}>Create</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>INVOICED THIS PERIOD</Text>
          {report.length === 0 ? (
            <Text style={styles.meta}>Nothing invoiced in this period yet.</Text>
          ) : report.map((line) => (
            <View key={line.currency}>
              {report.length > 1 ? <Text style={styles.currencyLabel}>{line.currency}</Text> : null}
              <View style={styles.figures}>
                <Figure label="Invoiced" value={money(line.invoiced, line.symbol)} />
                <Figure label="Paid" value={money(line.paid, line.symbol)} tone={colors.primaryDark} />
                <Figure
                  label="Outstanding"
                  value={money(line.outstanding, line.symbol)}
                  tone={line.outstanding > 0 ? colors.danger : colors.primaryDark}
                />
              </View>
            </View>
          ))}
        </View>

        {GROUPS.map(({ key, label }) => {
          const rows = grouped[key];
          if (!rows.length) return null;
          return (
            <View key={key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{label}</Text>
                <Text style={styles.groupCount}>{rows.length}</Text>
              </View>
              {rows.map((shipment) => {
                const invoice = getInvoice(shipment);
                const { total, paidAmount, balance } = getPaymentSummary(invoice);
                const symbol = invoiceSymbol(invoice.currency);
                const tone = INVOICE_STATUS_STYLE[getInvoiceStatus(invoice)];
                return (
                  <Pressable
                    key={shipment.id}
                    style={styles.row}
                    onPress={() => navigation.navigate('Document', {
                      shipmentId: shipment.id, kind: 'invoice',
                    })}
                    onLongPress={() => navigation.navigate('ShipmentDetail', { shipment })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.number}>{invoice.invoiceNumber || 'No number'}</Text>
                      <Text style={styles.customer} numberOfLines={1}>{senderName(shipment)}</Text>
                      <Text style={styles.meta}>
                        {invoice.issueDate || '—'}
                        {paidAmount > 0 && balance > 0 ? ` · ${money(paidAmount, symbol)} paid` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.amount}>{money(total, symbol)}</Text>
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={{ color: tone.fg, fontSize: 9, fontWeight: '900' }}>
                          {tone.label.toUpperCase()}
                        </Text>
                      </View>
                      {balance > 0 && paidAmount > 0 ? (
                        <Text style={styles.owed}>{money(balance, symbol)} left</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {invoiced.length === 0 && !error ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>No invoices in this period.</Text>
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
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  create: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 38, borderRadius: radius.sm, backgroundColor: colors.primary },
  createText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 13 },
  reportCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  reportTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.7 },
  currencyLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.6, marginTop: 6 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
  group: { gap: 4, marginTop: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  groupTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 },
  groupCount: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  number: { fontSize: 14, fontWeight: '800', color: colors.text },
  customer: { fontSize: 13, color: colors.text, marginTop: 1 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  amount: { fontSize: 15, fontWeight: '800', color: colors.text },
  owed: { fontSize: 10.5, color: colors.danger, fontWeight: '700' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
});
