import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { money, shortDate } from '../../lib/format';
import { ScreenHeader, SearchBar, Segmented, Badge, BADGE, Avatar, SkeletonList, EmptyState, ErrorState } from '../../components/adminui';
import type { MenuStackParams } from '../../navigation/types';

// Unified customer records from admin_customer_records: app + website
// registrations, past bookings, quote requesters and manual bookings — deduped
// by user id, then normalised email/phone.

type Props = NativeStackScreenProps<MenuStackParams, 'Customers'>;

export interface CustomerRecord {
  key: string;
  profileId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  customerReference: string | null;
  pickupAddress: string | null;
  shipmentCount: number;
  quoteCount: number;
  lifetimeValue: number;
  outstanding: number;
  currency: string;
  lastBooking: string | null;
  lastActivity: string | null;
  active: boolean;
}

const FILTERS = ['all', 'active', 'inactive'] as const;

export default function CustomersScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [trackingMatches, setTrackingMatches] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_customer_records');
    if (rpcError) { setError(rpcError.message); return; }
    setError(null);
    setCustomers(((data || []) as CustomerRecord[]).filter((c) => c.fullName || c.email || c.phone));
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  // Tracking-number search: resolve the shipment owner and surface that record.
  useEffect(() => {
    const q = query.trim().toUpperCase();
    if (!/^Z[A-Z]*-?\d{3,}/.test(q) && !q.startsWith('ZIMSHIP')) { setTrackingMatches({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('shipments')
        .select('user_id,customer_reference,tracking_number,metadata')
        .ilike('tracking_number', `%${q}%`)
        .limit(5);
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const row of (data || []) as any[]) {
        const key = row.user_id
          || (row.metadata?.sender?.email || '').toLowerCase()
          || String(row.metadata?.sender?.phone || '').replace(/[^0-9]/g, '');
        if (key) map[key] = row.tracking_number;
      }
      setTrackingMatches(map);
    })();
    return () => { cancelled = true; };
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const digits = q.replace(/[^0-9]/g, '');
    return customers
      .filter((c) => filter === 'all' || (filter === 'active' ? c.active : !c.active))
      .filter((c) => {
        if (q === '') return true;
        if (c.fullName?.toLowerCase().includes(q)) return true;
        if (c.email?.toLowerCase().includes(q)) return true;
        if (c.customerReference?.toLowerCase().includes(q)) return true;
        if (digits.length >= 4 && c.phone?.replace(/[^0-9]/g, '').includes(digits)) return true;
        if (c.profileId && trackingMatches[c.profileId]) return true;
        if (c.email && trackingMatches[c.email.toLowerCase()]) return true;
        if (c.phone && trackingMatches[c.phone.replace(/[^0-9]/g, '')]) return true;
        return false;
      });
  }, [customers, filter, query, trackingMatches]);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.headerBlock}>
        <ScreenHeader title="Customers" subtitle={`${customers.length} unified records`} />
        <SearchBar value={query} onChange={setQuery} placeholder="Name, reference, email, phone or tracking number" />
        <View style={{ marginTop: spacing.sm }}>
          <Segmented options={FILTERS} value={filter} onChange={setFilter} labels={{ all: 'All', active: 'Active', inactive: 'Inactive' }} />
        </View>
      </View>

      {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorState message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} /></View> : null}

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.key}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading
          ? <SkeletonList rows={6} />
          : error ? null
          : <EmptyState icon="people-outline" title="No customers found" text="Adjust the search or filter to see more records." />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('CustomerDetail', { record: item })}>
            <Avatar name={item.fullName || item.email} size={42} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.fullName || 'Unknown customer'}</Text>
                <Badge text={item.active ? 'Active' : 'Inactive'} tone={item.active ? BADGE.green : BADGE.grey} />
              </View>
              {item.customerReference ? <Text style={styles.reference}>{item.customerReference}</Text> : null}
              <Text style={styles.detail} numberOfLines={1}>
                {[item.phone, item.email].filter(Boolean).join(' · ') || 'No contact details'}
              </Text>
              <View style={styles.statRow}>
                <Text style={styles.stat}>{item.shipmentCount} shipment{item.shipmentCount === 1 ? '' : 's'}</Text>
                <Text style={[styles.stat, { color: colors.primaryDark, fontWeight: '800' }]}>
                  {money(item.lifetimeValue, item.currency === 'EUR' ? '€' : '£')} lifetime
                </Text>
                {item.lastBooking ? <Text style={styles.stat}>Last booked {shortDate(item.lastBooking)}</Text> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        )}
        ListFooterComponent={!loading && filtered.length ? <Text style={styles.footer}>{filtered.length} of {customers.length} customers</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBlock: { padding: spacing.lg, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  reference: { fontSize: 10.5, fontWeight: '800', color: colors.primary, marginTop: 1 },
  detail: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 5 },
  stat: { fontSize: 10.5, color: colors.textMuted, fontWeight: '600' },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingVertical: spacing.md },
});
