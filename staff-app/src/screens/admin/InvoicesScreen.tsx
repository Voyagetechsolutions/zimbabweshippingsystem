import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { shortDate } from '../../lib/format';
import { Shipment, senderName } from '../../lib/shipment';
import {
  hasInvoice, getInvoice, getInvoiceStatus, getPaymentSummary, invoiceSymbol,
  INVOICE_STATUS_STYLE, InvoiceData,
} from '../../lib/invoice';

interface Row {
  id: string;
  invoiceNumber: string;
  customer: string;
  issueDate: string;
  currency?: string;
  total: number;
  balance: number;
  status: ReturnType<typeof getInvoiceStatus>;
}

export default function InvoicesScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .is('deleted_at', null)
      .not('metadata->invoice', 'is', null)
      .order('updated_at', { ascending: false });
    if (error) return;
    const list = ((data as Shipment[]) || [])
      .filter(hasInvoice)
      .map((s): Row => {
        const inv: InvoiceData = getInvoice(s);
        const { total, balance } = getPaymentSummary(inv);
        return {
          id: s.id,
          invoiceNumber: inv.invoiceNumber || '—',
          customer: senderName(s),
          issueDate: inv.issueDate || s.created_at,
          currency: inv.currency,
          total,
          balance,
          status: getInvoiceStatus(inv),
        };
      });
    setRows(list);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const summary = useMemo(() => {
    // Dominant currency for the summary symbol.
    const counts: Record<string, number> = {};
    rows.forEach((r) => { const c = r.currency || 'GBP'; counts[c] = (counts[c] || 0) + 1; });
    const currency = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'GBP';
    let outstanding = 0, overdue = 0;
    rows.forEach((r) => {
      if (r.status !== 'paid') outstanding += r.balance;
      if (r.status === 'overdue') overdue += r.balance;
    });
    return { sym: invoiceSymbol(currency), outstanding, overdue };
  }, [rows]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={styles.safe}
      data={rows}
      keyExtractor={(r) => r.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={styles.summaryValue}>{summary.sym}{summary.outstanding.toFixed(2)}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryCount}>{rows.length} invoices</Text>
            {summary.overdue > 0 ? (
              <Text style={styles.overdue}>{summary.sym}{summary.overdue.toFixed(2)} overdue</Text>
            ) : null}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No invoices yet</Text>}
      renderItem={({ item }) => {
        const st = INVOICE_STATUS_STYLE[item.status];
        const sym = invoiceSymbol(item.currency);
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.invNo}>{item.invoiceNumber}</Text>
              <Text style={styles.customer}>{item.customer}</Text>
              <Text style={styles.date}>{shortDate(item.issueDate)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.total}>{sym}{item.total.toFixed(2)}</Text>
              <View style={[styles.pill, { backgroundColor: st.bg }]}>
                <Text style={[styles.pillText, { color: st.fg }]}>{st.label}</Text>
              </View>
              {item.status !== 'paid' && item.balance > 0 ? (
                <Text style={styles.balance}>{sym}{item.balance.toFixed(2)} due</Text>
              ) : null}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  summary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  summaryCount: { fontSize: 12, color: colors.textFaint },
  overdue: { fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  invNo: { fontSize: 14, fontWeight: '700', color: colors.text },
  customer: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  date: { fontSize: 11, color: colors.textFaint, marginTop: 1 },
  total: { fontSize: 15, fontWeight: '700', color: colors.text },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  balance: { fontSize: 11, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
});
