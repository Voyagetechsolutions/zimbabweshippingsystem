import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

interface Quote {
  id: string;
  name: string | null;
  phone_number: string;
  email: string | null;
  description: string;
  category: string | null;
  specific_item: string | null;
  status: string;
  quoted_amount: number | null;
  admin_notes: string | null;
  created_at: string;
}

function statusColors(status: string): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return { bg: '#fef3c7', fg: '#b45309' };
  if (s.includes('quote') || s.includes('respond')) return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (s.includes('accept') || s.includes('complete') || s.includes('closed')) return { bg: '#d1fae5', fg: '#047857' };
  if (s.includes('reject') || s.includes('cancel')) return { bg: '#fee2e2', fg: '#b91c1c' };
  return { bg: '#f1f5f9', fg: '#475569' };
}

export default function CustomQuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_quotes')
      .select('id, name, phone_number, email, description, category, specific_item, status, quoted_amount, admin_notes, created_at')
      .order('created_at', { ascending: false });
    if (!error) setQuotes((data as Quote[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={styles.safe}
      data={quotes}
      keyExtractor={(q) => q.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No quote requests</Text>}
      renderItem={({ item }) => {
        const st = statusColors(item.status);
        return (
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{item.name || 'No name'}</Text>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.fg }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.contact}>{item.phone_number}{item.email ? `  ·  ${item.email}` : ''}</Text>
            {item.category ? <Text style={styles.meta}>Category: {item.category}{item.specific_item ? ` — ${item.specific_item}` : ''}</Text> : null}
            <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>
            <View style={styles.bottom}>
              <Text style={styles.amount}>{item.quoted_amount != null ? `Quoted: £${item.quoted_amount}` : 'Not quoted yet'}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            {item.admin_notes ? <Text style={styles.notes}>Notes: {item.admin_notes}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  contact: { fontSize: 12, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted },
  desc: { fontSize: 13, color: colors.text, marginTop: 2 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  amount: { fontSize: 12, fontWeight: '600', color: colors.primary },
  date: { fontSize: 11, color: colors.textFaint },
  notes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
});
