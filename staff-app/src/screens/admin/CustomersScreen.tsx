import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { money, shortDate } from '../../lib/format';

// Unified customer records from the admin_customer_records RPC: app + website
// registrations, past bookings, quote requesters and manual bookings — deduped
// by user id, then normalised email/phone.

interface CustomerRecord {
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
  outstanding: number;
  currency: string;
  lastActivity: string | null;
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_customer_records');
    if (rpcError) { setError(rpcError.message); return; }
    setError(null);
    setCustomers(((data || []) as CustomerRecord[]).filter((c) => c.fullName || c.email || c.phone));
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return customers.filter((c) =>
      q === ''
      || c.fullName?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.phone?.includes(q.replace(/[^0-9]/g, '') || q)
      || c.customerReference?.toLowerCase().includes(q),
    );
  }, [customers, query]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TextInput
          style={styles.search} placeholder="Search name, email, phone or reference" placeholderTextColor={colors.textFaint}
          value={query} onChangeText={setQuery} autoCapitalize="none"
        />
      </View>
      {error ? <Text style={styles.error}>Could not load customers: {error}</Text> : null}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.key}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No customers found</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.fullName || item.email || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.fullName || 'Unknown customer'}</Text>
                {item.customerReference ? <Text style={styles.ref}>{item.customerReference}</Text> : null}
              </View>
              {item.email ? <Text style={styles.detail} numberOfLines={1}>{item.email}</Text> : null}
              {item.phone ? <Text style={styles.detail} numberOfLines={1}>{item.phone}</Text> : null}
              {item.pickupAddress ? <Text style={styles.detail} numberOfLines={1}>{item.pickupAddress}{item.country ? ` · ${item.country}` : ''}</Text> : null}
              <View style={styles.statRow}>
                <Text style={styles.stat}>{item.shipmentCount} shipment{item.shipmentCount === 1 ? '' : 's'}</Text>
                <Text style={styles.stat}>{item.quoteCount} quote{item.quoteCount === 1 ? '' : 's'}</Text>
                {item.outstanding > 0 ? (
                  <Text style={[styles.stat, { color: colors.danger, fontWeight: '800' }]}>
                    {money(item.outstanding, item.currency === 'EUR' ? '€' : '£')} due
                  </Text>
                ) : (
                  <Text style={[styles.stat, { color: colors.primary }]}>Settled</Text>
                )}
                {item.lastActivity ? <Text style={styles.stat}>Active {shortDate(item.lastActivity)}</Text> : null}
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={<Text style={styles.footer}>{filtered.length} of {customers.length} customers</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: 0 },
  search: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md,
    paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  error: { color: '#991b1b', fontSize: 12, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
  ref: { fontSize: 10.5, fontWeight: '800', color: colors.primary },
  detail: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 6 },
  stat: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingVertical: spacing.md },
});
