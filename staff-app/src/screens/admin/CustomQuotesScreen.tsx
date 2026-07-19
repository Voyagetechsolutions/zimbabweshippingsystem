import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

// Quote requests from the customer app, website and Zimmy. The admin enters a
// price, currency, validity and notes; approving notifies the customer, who
// can then book the shipment at the locked amount.

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
  currency: string | null;
  valid_until: string | null;
  admin_notes: string | null;
  booked_shipment_id: string | null;
  created_at: string;
}

function statusColors(status: string): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return { bg: '#fef3c7', fg: '#b45309' };
  if (s === 'info_requested') return { bg: '#fee2e2', fg: '#b91c1c' };
  if (s === 'approved' || s.includes('quote')) return { bg: '#dbeafe', fg: '#1d4ed8' };
  if (s === 'booked' || s.includes('accept') || s.includes('complete')) return { bg: '#d1fae5', fg: '#047857' };
  if (s.includes('reject') || s.includes('cancel')) return { bg: '#f1f5f9', fg: '#475569' };
  return { bg: '#f1f5f9', fg: '#475569' };
}

export default function CustomQuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<Quote | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'GBP' | 'EUR'>('GBP');
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_quotes')
      .select('id, name, phone_number, email, description, category, specific_item, status, quoted_amount, currency, valid_until, admin_notes, booked_shipment_id, created_at')
      .order('created_at', { ascending: false });
    if (!error) setQuotes((data as Quote[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`admin-quotes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_quotes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const openResponder = (quote: Quote) => {
    setResponding(quote);
    setAmount(quote.quoted_amount != null ? String(quote.quoted_amount) : '');
    setCurrency(quote.currency === 'EUR' ? 'EUR' : 'GBP');
    setValidDays('30');
    setNotes(quote.admin_notes || '');
  };

  const respond = async (action: 'approve' | 'reject' | 'request_info') => {
    if (!responding) return;
    if (action === 'approve' && !(Number(amount) > 0)) { Alert.alert('Price required', 'Enter the quoted amount before approving.'); return; }
    setBusy(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + Math.max(1, Number(validDays) || 30));
      const { error } = await supabase.rpc('respond_custom_quote', {
        p_quote_id: responding.id,
        p_action: action,
        p_amount: action === 'approve' ? Number(amount) : null,
        p_currency: currency,
        p_valid_until: action === 'approve' ? validUntil.toISOString().slice(0, 10) : null,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      setResponding(null);
      await load();
      Alert.alert('Quote updated', action === 'approve'
        ? 'The customer has been notified and can now book at this price.'
        : action === 'reject' ? 'The customer has been notified.' : 'The customer has been asked for more information.');
    } catch (e: any) {
      Alert.alert('Could not update quote', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <>
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
          const actionable = !['booked', 'rejected'].includes(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.name}>{item.name || item.phone_number || 'Customer'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.fg }]}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.contact}>{item.phone_number}{item.email ? `  ·  ${item.email}` : ''}</Text>
              {item.category ? <Text style={styles.meta}>Category: {item.category}{item.specific_item ? ` — ${item.specific_item}` : ''}</Text> : null}
              <Text style={styles.desc} numberOfLines={4}>{item.description}</Text>
              <View style={styles.bottom}>
                <Text style={styles.amount}>
                  {item.quoted_amount != null
                    ? `Quoted: ${item.currency === 'EUR' ? '€' : '£'}${item.quoted_amount}${item.valid_until ? ` · valid to ${new Date(item.valid_until).toLocaleDateString()}` : ''}`
                    : 'Not quoted yet'}
                </Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              {item.admin_notes ? <Text style={styles.notes}>Notes: {item.admin_notes}</Text> : null}
              {actionable ? (
                <Pressable style={styles.respondButton} onPress={() => openResponder(item)}>
                  <Ionicons name="create-outline" size={15} color={colors.white} />
                  <Text style={styles.respondText}>{item.status === 'approved' ? 'Update quote' : 'Respond'}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={Boolean(responding)} transparent animationType="slide" onRequestClose={() => setResponding(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Respond to quote</Text>
              <Text style={styles.modalDesc} numberOfLines={5}>{responding?.description}</Text>
              <Text style={styles.label}>Quoted price</Text>
              <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textFaint} />
              <Text style={styles.label}>Currency</Text>
              <View style={styles.chipRow}>
                {(['GBP', 'EUR'] as const).map((c) => (
                  <Pressable key={c} style={[styles.chip, currency === c && styles.chipActive]} onPress={() => setCurrency(c)}>
                    <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c === 'GBP' ? '£ GBP' : '€ EUR'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Valid for (days)</Text>
              <TextInput style={styles.input} value={validDays} onChangeText={setValidDays} keyboardType="number-pad" />
              <Text style={styles.label}>Notes to the customer (optional)</Text>
              <TextInput style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline placeholder="Included services, conditions, what extra info you need…" placeholderTextColor={colors.textFaint} />
              <Pressable style={[styles.modalPrimary, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('approve')}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.modalPrimaryText}>Approve & send price</Text>}
              </Pressable>
              <View style={styles.modalRow}>
                <Pressable style={[styles.modalSecondary, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('request_info')}>
                  <Text style={styles.modalSecondaryText}>Request info</Text>
                </Pressable>
                <Pressable style={[styles.modalSecondary, { borderColor: colors.danger }, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('reject')}>
                  <Text style={[styles.modalSecondaryText, { color: colors.danger }]}>Reject</Text>
                </Pressable>
              </View>
              <Pressable style={styles.modalCancel} onPress={() => setResponding(null)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  desc: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 18 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  amount: { fontSize: 12, fontWeight: '600', color: colors.primary, flex: 1 },
  date: { fontSize: 11, color: colors.textFaint },
  notes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  respondButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, marginTop: 6 },
  respondText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '88%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 9, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  modalPrimary: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  modalPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalSecondary: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  modalSecondaryText: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
