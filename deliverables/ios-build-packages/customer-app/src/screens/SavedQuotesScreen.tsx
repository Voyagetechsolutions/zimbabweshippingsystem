import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { Button, FlagStripe, Pill } from '../components/ui';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import type { QuoteCarry } from '../lib/booking';

type QuoteRow = {
  id: string;
  status: string;
  description: string;
  quoted_amount: number | null;
  currency: string | null;
  valid_until: string | null;
  admin_notes: string | null;
  booked_shipment_id: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Awaiting price', bg: '#fff8e0', fg: '#8a6d00' },
  info_requested: { label: 'Info needed', bg: '#fde8e8', fg: '#b91c1c' },
  approved: { label: 'Quote ready', bg: '#e8f5ee', fg: '#06622F' },
  quoted: { label: 'Quote ready', bg: '#e8f5ee', fg: '#06622F' },
  rejected: { label: 'Not available', bg: '#f1f5f9', fg: '#475569' },
  booked: { label: 'Booked', bg: '#eff6ff', fg: '#1d4ed8' },
};

// Live quote requests: pending → priced by the admin team → book directly.
export default function SavedQuotesScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { palette } = useAppTheme();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) { setQuotes([]); setLoading(false); return; }
    const { data, error: loadError } = await supabase
      .from('custom_quotes')
      .select('id,status,description,quoted_amount,currency,valid_until,admin_notes,booked_shipment_id,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (loadError) setError(loadError.message);
    else { setError(null); setQuotes((data || []) as QuoteRow[]); }
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase.channel(`customer-quotes-${session.user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_quotes', filter: `user_id=eq.${session.user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  const book = (q: QuoteRow) => {
    const quote: QuoteCarry = {
      id: q.id,
      amount: Number(q.quoted_amount || 0),
      currency: q.currency === 'EUR' ? 'EUR' : 'GBP',
      description: q.description.replace(/^\[[^\]]+\]\s*/, ''),
    };
    navigation.navigate('Book', { quote });
  };

  const expired = (q: QuoteRow) => Boolean(q.valid_until && new Date(q.valid_until) < new Date(new Date().toDateString()));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>My Quotes</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.green} />}
      >
        {loading && <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />}
        {!loading && error && (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.red} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Could not load your quotes: {error}</Text>
            <Button title="Try again" onPress={load} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
          </View>
        )}
        {!loading && !error && quotes.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={40} color={palette.textFaint} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No quote requests yet.</Text>
            <Button title="Get a Quote" onPress={() => navigation.navigate('Quote')} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
          </View>
        )}
        {quotes.map((q) => {
          const tone = STATUS_LABEL[q.status] || STATUS_LABEL.pending;
          const bookable = q.status === 'approved' && !expired(q);
          const symbol = q.currency === 'EUR' ? '€' : '£';
          return (
            <View key={q.id} style={[styles.row, { backgroundColor: palette.surface, borderColor: bookable ? colors.green : palette.border }]}>
              <View style={styles.rowTop}>
                <Pill text={expired(q) && q.status === 'approved' ? 'Expired' : tone.label} bg={tone.bg} fg={tone.fg} />
                <Text style={[styles.rowMeta, { color: palette.textFaint }]}>{shortDate(q.created_at)}</Text>
              </View>
              <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={3}>{q.description.replace(/^\[[^\]]+\]\s*/, '')}</Text>
              {q.quoted_amount != null && (
                <Text style={[styles.amount, { color: palette.greenDark }]}>
                  {money(Number(q.quoted_amount), symbol)}
                  {q.valid_until ? <Text style={[styles.rowMeta, { color: palette.textMuted }]}>  · valid until {shortDate(q.valid_until)}</Text> : null}
                </Text>
              )}
              {Boolean(q.admin_notes) && <Text style={[styles.notes, { color: palette.textMuted }]}>Team note: {q.admin_notes}</Text>}
              {bookable && <Button title="BOOK SHIPMENT" onPress={() => book(q)} style={{ marginTop: spacing.sm }} />}
              {q.status === 'booked' && q.booked_shipment_id && (
                <Button title="View shipment" variant="outline" onPress={() => navigation.navigate('ShipmentDetail', { id: q.booked_shipment_id })} style={{ marginTop: spacing.sm }} />
              )}
              {q.status === 'info_requested' && (
                <Button title="Add details via Zimmy" variant="outline"
                  onPress={() => navigation.navigate('Tabs', { screen: 'Zimmy', params: { prefill: `About my quote request: ${q.description.slice(0, 120)} — here are the extra details: ` } })}
                  style={{ marginTop: spacing.sm }} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  body: { padding: spacing.lg, paddingTop: 0, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: spacing.lg },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  row: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowTitle: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  rowMeta: { fontSize: 11 },
  amount: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  notes: { fontSize: 12, marginTop: 4, lineHeight: 17 },
});
