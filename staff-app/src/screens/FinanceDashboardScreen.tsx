import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Card, SectionTitle, StatCard } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { money, shortDate } from '../lib/format';

interface Payment {
  id: string;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
}

const COLLECTED = ['completed', 'paid', 'success', 'succeeded'];
const methodLabel: Record<string, string> = {
  standard: 'Card / Bank',
  cashOnCollection: 'Cash on Collection',
  payOnArrival: 'Pay on Arrival',
  agentQuote: 'Agent Quote',
};

export default function FinanceDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, currency, payment_method, payment_status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments((data as Payment[]) || []);
    } catch (e: any) {
      console.error('Finance load failed:', e);
      setError(e?.message || 'Failed to load finance data');
    }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const stats = useMemo(() => {
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const collected = payments.filter((p) => COLLECTED.includes((p.payment_status || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = total - collected;
    const cutoff = Date.now() - 30 * 864e5;
    const last30 = payments.filter((p) => new Date(p.created_at).getTime() >= cutoff).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { total, collected, outstanding, last30, count: payments.length };
  }, [payments]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) {
      const key = p.payment_method || 'other';
      m[key] = (m[key] || 0) + (Number(p.amount) || 0);
    }
    const max = Math.max(1, ...Object.values(m));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: methodLabel[k] || k, value: v, pct: v / max }));
  }, [payments]);

  const recent = useMemo(() => payments.slice(0, 8), [payments]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>Finance</Text>

        {error ? (
          <Card style={{ borderColor: colors.danger }}><Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text></Card>
        ) : null}

        <View style={styles.grid}>
          <StatCard label="Total billed" value={money(stats.total)} />
          <StatCard label="Collected" value={money(stats.collected)} accent />
          <StatCard label="Outstanding" value={money(stats.outstanding)} />
          <StatCard label="Last 30 days" value={money(stats.last30)} />
        </View>

        <View>
          <SectionTitle>Revenue by payment method</SectionTitle>
          <Card>
            {byMethod.length === 0 ? (
              <Text style={styles.emptyText}>No payments yet</Text>
            ) : (
              byMethod.map((m) => (
                <View key={m.key} style={styles.barRow}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>{m.label}</Text>
                    <Text style={styles.barValue}>{money(m.value)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(4, m.pct * 100)}%` }]} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        <View>
          <SectionTitle>Recent payments</SectionTitle>
          <Card style={{ padding: 0 }}>
            {recent.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No payments yet</Text></View>
            ) : (
              recent.map((p, i) => {
                const collected = COLLECTED.includes((p.payment_status || '').toLowerCase());
                return (
                  <View key={p.id} style={[styles.row, i < recent.length - 1 && styles.rowDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.amount}>{money(Number(p.amount) || 0, p.currency === 'EUR' ? '€' : '£')}</Text>
                      <Text style={styles.method}>{methodLabel[p.payment_method || ''] || p.payment_method || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.pill, { backgroundColor: collected ? '#d1fae5' : '#fef3c7' }]}>
                        <Text style={[styles.pillText, { color: collected ? '#047857' : '#b45309' }]}>
                          {collected ? 'Collected' : 'Pending'}
                        </Text>
                      </View>
                      <Text style={styles.rowDate}>{shortDate(p.created_at)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  barRow: { marginBottom: spacing.md },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  barValue: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  method: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  rowDate: { fontSize: 11, color: colors.textFaint },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, padding: spacing.md },
});
