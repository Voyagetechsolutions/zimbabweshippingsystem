import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, SectionTitle, StatCard, AttentionCard, StatusBadge, CountryChips } from '../components/ui';
import { colors, spacing } from '../theme';
import {
  money, shortDate, greeting, todayLabel, matchesCountry, customerName, type CountryFilter,
} from '../lib/format';

interface Shipment {
  id: string;
  tracking_number: string | null;
  status: string | null;
  created_at: string;
  metadata: any;
}

const PENDING = ['Booking Confirmed', 'Ready for Pickup', 'pending'];
const ACTIVE = ['Processing in UK Warehouse', 'Customs Clearance', 'Processing in ZW Warehouse', 'Out for Delivery'];

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryFilter>('all');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ship, pay, quotes] = await Promise.all([
        supabase.from('shipments').select('id, tracking_number, status, created_at, metadata').order('created_at', { ascending: false }),
        supabase.from('payments').select('amount'),
        supabase.from('custom_quotes').select('id').eq('status', 'pending'),
      ]);
      if (ship.error) throw ship.error;
      setShipments((ship.data as Shipment[]) || []);
      setRevenue((pay.data || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0));
      setPendingQuotes(quotes.data?.length || 0);
    } catch (e: any) {
      console.error('Dashboard load failed:', e);
      setError(e?.message || 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => shipments.filter((s) => matchesCountry(s.metadata, country)), [shipments, country]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((s) => s.status && PENDING.includes(s.status)).length,
    active: filtered.filter((s) => s.status && ACTIVE.includes(s.status)).length,
    delivered: filtered.filter((s) => s.status === 'Delivered').length,
  }), [filtered]);

  const recent = useMemo(() => filtered.slice(0, 6), [filtered]);

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
        <View>
          <Text style={styles.greeting}>{greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.date}>{todayLabel()}</Text>
        </View>

        <CountryChips value={country} onChange={setCountry} />

        {error ? (
          <Card style={{ borderColor: colors.danger }}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>
          </Card>
        ) : null}

        {(stats.pending > 0 || pendingQuotes > 0) && (
          <View>
            <SectionTitle>Needs attention</SectionTitle>
            <View style={styles.stack}>
              {stats.pending > 0 && (
                <AttentionCard count={stats.pending} title="pending collection" description="Shipments waiting to be picked up" />
              )}
              {pendingQuotes > 0 && (
                <AttentionCard count={pendingQuotes} title="quote requests" description="Awaiting your response" />
              )}
            </View>
          </View>
        )}

        <View>
          <SectionTitle>At a glance</SectionTitle>
          <View style={styles.grid}>
            <StatCard label="Total shipments" value={stats.total.toLocaleString()} />
            <StatCard label="In transit" value={stats.active.toLocaleString()} accent />
            <StatCard label="Delivered" value={stats.delivered.toLocaleString()} />
            <StatCard label="Total revenue" value={money(revenue)} />
          </View>
        </View>

        <View>
          <SectionTitle>Recent shipments</SectionTitle>
          <Card style={{ padding: 0 }}>
            {recent.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No shipments yet</Text></View>
            ) : (
              recent.map((s, i) => (
                <View key={s.id} style={[styles.row, i < recent.length - 1 && styles.rowDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tracking}>{s.tracking_number || '—'}</Text>
                    <Text style={styles.customer} numberOfLines={1}>{customerName(s.metadata)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge status={s.status} />
                    <Text style={styles.rowDate}>{shortDate(s.created_at)}</Text>
                  </View>
                </View>
              ))
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
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  stack: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tracking: { fontSize: 13, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  customer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDate: { fontSize: 11, color: colors.textFaint },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
