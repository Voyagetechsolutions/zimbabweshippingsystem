import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { money } from '../../lib/format';

interface Payment {
  id: string;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  payment_status: string | null;
  transaction_id: string | null;
  created_at: string;
}

const COLLECTED = ['completed', 'paid', 'success', 'succeeded'];
const methodLabel: Record<string, string> = {
  standard: 'Card / Bank', cashOnCollection: 'Cash on Collection',
  payOnArrival: 'Pay on Arrival', agentQuote: 'Agent Quote',
};

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, currency, payment_method, payment_status, transaction_id, created_at')
      .order('created_at', { ascending: false });
    if (!error) setPayments((data as Payment[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const total = useMemo(() => payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [payments]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={styles.safe}
      data={payments}
      keyExtractor={(p) => p.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total billed</Text>
          <Text style={styles.summaryValue}>{money(total)}</Text>
          <Text style={styles.summaryCount}>{payments.length} payments</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No payments yet</Text>}
      renderItem={({ item }) => {
        const collected = COLLECTED.includes((item.payment_status || '').toLowerCase());
        const sym = item.currency === 'EUR' ? '€' : '£';
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.amount}>{money(Number(item.amount) || 0, sym)}</Text>
              <Text style={styles.method}>{methodLabel[item.payment_method || ''] || item.payment_method || '—'}</Text>
              {item.transaction_id ? <Text style={styles.tx}>{item.transaction_id}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.pill, { backgroundColor: collected ? '#d1fae5' : '#fef3c7' }]}>
                <Text style={[styles.pillText, { color: collected ? '#047857' : '#b45309' }]}>{collected ? 'Collected' : 'Pending'}</Text>
              </View>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
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
  summaryCount: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  method: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tx: { fontSize: 10, color: colors.textFaint, marginTop: 1 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, color: colors.textFaint },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
});
