import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  is_admin: boolean | null;
  created_at: string;
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (!error) setCustomers((data as Customer[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter((c) =>
      q === '' || c.email?.toLowerCase().includes(q) || c.full_name?.toLowerCase().includes(q),
    );
  }, [customers, query]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TextInput
          style={styles.search} placeholder="Search name or email" placeholderTextColor={colors.textFaint}
          value={query} onChangeText={setQuery} autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No customers found</Text>}
        renderItem={({ item }) => {
          const badge = item.is_admin ? 'admin' : (item.role || 'customer');
          return (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.full_name || item.email || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.full_name || 'No name'}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
              </View>
              <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
            </View>
          );
        }}
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
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted },
  badge: { borderRadius: radius.pill, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingVertical: spacing.md },
});
