import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Modal, Alert, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { money, shortDate } from '../../lib/format';
import { ScreenHeader, SearchBar, Segmented, Badge, BADGE, SkeletonList, EmptyState, ErrorState, Card } from '../../components/adminui';
import type { MenuStackParams } from '../../navigation/types';

// Quote requests from the customer app, website and Zimmy: search, status
// filters, a full detail sheet with the customer's photos and contact actions,
// and the pricing workflow (approve / request info / reject / expire).

type Props = NativeStackScreenProps<MenuStackParams, 'CustomQuotes'>;

interface Quote {
  id: string;
  user_id: string | null;
  name: string | null;
  phone_number: string;
  email: string | null;
  description: string;
  category: string | null;
  specific_item: string | null;
  image_urls: string[] | null;
  status: string;
  quoted_amount: number | null;
  currency: string | null;
  valid_until: string | null;
  admin_notes: string | null;
  booked_shipment_id: string | null;
  created_at: string;
}

const FILTERS = ['all', 'new', 'quoted', 'accepted', 'expired', 'rejected'] as const;

function isExpired(q: Quote) {
  return q.status === 'approved' && Boolean(q.valid_until) && new Date(q.valid_until!) < new Date(new Date().toDateString());
}
function quoteBadge(q: Quote) {
  if (q.status === 'booked') return { label: 'Accepted', tone: BADGE.blue };
  if (isExpired(q)) return { label: 'Expired', tone: BADGE.purple };
  if (q.status === 'approved') return { label: 'Quoted', tone: BADGE.green };
  if (q.status === 'rejected') return { label: 'Rejected', tone: BADGE.grey };
  if (q.status === 'info_requested') return { label: 'Info needed', tone: BADGE.red };
  return { label: 'New', tone: BADGE.orange };
}

export default function CustomQuotesScreen({ navigation }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [detail, setDetail] = useState<Quote | null>(null);
  const [responding, setResponding] = useState<Quote | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'GBP' | 'EUR'>('GBP');
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('custom_quotes')
      .select('id, user_id, name, phone_number, email, description, category, specific_item, image_urls, status, quoted_amount, currency, valid_until, admin_notes, booked_shipment_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (loadError) { setError(loadError.message); return; }
    setError(null);
    setQuotes((data as Quote[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`admin-quotes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_quotes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return quotes
      .filter((quote) => {
        if (filter === 'all') return true;
        if (filter === 'new') return quote.status === 'pending' || quote.status === 'info_requested';
        if (filter === 'quoted') return quote.status === 'approved' && !isExpired(quote);
        if (filter === 'accepted') return quote.status === 'booked';
        if (filter === 'expired') return isExpired(quote);
        return quote.status === 'rejected';
      })
      .filter((quote) => q === ''
        || quote.name?.toLowerCase().includes(q)
        || quote.description?.toLowerCase().includes(q)
        || quote.phone_number?.includes(q)
        || quote.email?.toLowerCase().includes(q)
        || quote.id.startsWith(q));
  }, [filter, query, quotes]);

  const openResponder = (quote: Quote) => {
    setDetail(null);
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
      const { error: rpcError } = await supabase.rpc('respond_custom_quote', {
        p_quote_id: responding.id,
        p_action: action,
        p_amount: action === 'approve' ? Number(amount) : null,
        p_currency: currency,
        p_valid_until: action === 'approve' ? validUntil.toISOString().slice(0, 10) : null,
        p_notes: notes.trim() || null,
      });
      if (rpcError) throw rpcError;
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

  const markExpired = (quote: Quote) => {
    Alert.alert('Mark expired', 'The customer will no longer be able to book at this price. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark expired', style: 'destructive', onPress: async () => {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const { error: updateError } = await supabase.from('custom_quotes')
            .update({ valid_until: yesterday, updated_at: new Date().toISOString() }).eq('id', quote.id);
          if (updateError) Alert.alert('Could not update', updateError.message);
          else { setDetail(null); await load(); }
        },
      },
    ]);
  };

  const contact = (quote: Quote, kind: 'call' | 'wa' | 'mail') => {
    const phone = (quote.phone_number || '').replace(/[^0-9+]/g, '');
    if (kind === 'call' && phone) Linking.openURL(`tel:${phone}`);
    if (kind === 'wa' && phone) Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
    if (kind === 'mail' && quote.email) Linking.openURL(`mailto:${quote.email}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.headerBlock}>
        <ScreenHeader title="Quote Requests" subtitle={`${quotes.length} requests`} />
        <SearchBar value={query} onChange={setQuery} placeholder="Search name, phone, email or goods" />
        <View style={{ marginTop: spacing.sm }}>
          <Segmented options={FILTERS} value={filter} onChange={setFilter}
            labels={{ all: 'All', new: 'New', quoted: 'Quoted', accepted: 'Accepted', expired: 'Expired', rejected: 'Rejected' }} />
        </View>
      </View>

      {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorState message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} /></View> : null}

      <FlatList
        data={filtered}
        keyExtractor={(q) => q.id}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <SkeletonList rows={5} /> : error ? null
          : <EmptyState icon="pricetag-outline" title="No quote requests" text="Requests from the customer app, website and Zimmy appear here." />}
        renderItem={({ item }) => {
          const badge = quoteBadge(item);
          return (
            <Pressable style={styles.card} onPress={() => setDetail(item)}>
              <View style={styles.top}>
                <Text style={styles.name}>{item.name || item.phone_number || 'Customer'}</Text>
                <Badge text={badge.label} tone={badge.tone} />
              </View>
              <Text style={styles.reference}>Q-{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.contact}>{item.phone_number}{item.email ? `  ·  ${item.email}` : ''}</Text>
              <Text style={styles.desc} numberOfLines={3}>{item.description?.replace(/^\[[^\]]+\]\s*/, '')}</Text>
              <View style={styles.bottom}>
                <Text style={styles.amount}>
                  {item.quoted_amount != null
                    ? `${money(Number(item.quoted_amount), item.currency === 'EUR' ? '€' : '£')}${item.valid_until ? ` · valid to ${shortDate(item.valid_until)}` : ''}`
                    : 'Not quoted yet'}
                </Text>
                <Text style={styles.date}>{shortDate(item.created_at)}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Quote detail sheet */}
      <Modal visible={Boolean(detail)} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {detail ? (
                <>
                  <View style={styles.top}>
                    <Text style={styles.modalTitle}>{detail.name || 'Quote request'}</Text>
                    <Badge text={quoteBadge(detail).label} tone={quoteBadge(detail).tone} />
                  </View>
                  <Text style={styles.reference}>Q-{detail.id.slice(0, 8).toUpperCase()} · {shortDate(detail.created_at)}</Text>
                  <View style={styles.contactRow}>
                    <ContactButton icon="call-outline" label="Call" onPress={() => contact(detail, 'call')} />
                    <ContactButton icon="logo-whatsapp" label="WhatsApp" onPress={() => contact(detail, 'wa')} />
                    {detail.email ? <ContactButton icon="mail-outline" label="Email" onPress={() => contact(detail, 'mail')} /> : null}
                  </View>

                  <Text style={styles.blockLabel}>DETAILED GOODS DESCRIPTION</Text>
                  <Text style={styles.blockText}>{detail.description?.replace(/^\[([^\]]+)\]\s*/, '')}</Text>
                  {/\[([^\]]+)\]/.test(detail.description || '') ? (
                    <Text style={styles.meta}>Collection: {(detail.description.match(/^\[([^\]]+)\]/) || [])[1]} → Zimbabwe</Text>
                  ) : null}
                  {detail.category ? <Text style={styles.meta}>Category: {detail.category}{detail.specific_item ? ` — ${detail.specific_item}` : ''}</Text> : null}

                  {Array.isArray(detail.image_urls) && detail.image_urls.length ? (
                    <>
                      <Text style={styles.blockLabel}>CUSTOMER PHOTOGRAPHS</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                        {detail.image_urls.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.quoteImage} />
                        ))}
                      </ScrollView>
                    </>
                  ) : null}

                  {detail.quoted_amount != null ? (
                    <>
                      <Text style={styles.blockLabel}>CURRENT QUOTE</Text>
                      <Text style={styles.quoteAmount}>{money(Number(detail.quoted_amount), detail.currency === 'EUR' ? '€' : '£')}</Text>
                      {detail.valid_until ? <Text style={styles.meta}>Valid until {shortDate(detail.valid_until)}</Text> : null}
                    </>
                  ) : null}
                  {detail.admin_notes ? (
                    <>
                      <Text style={styles.blockLabel}>NOTES</Text>
                      <Text style={styles.blockText}>{detail.admin_notes}</Text>
                    </>
                  ) : null}

                  <View style={styles.detailActions}>
                    {!['booked', 'rejected'].includes(detail.status) ? (
                      <Pressable style={styles.primaryButton} onPress={() => openResponder(detail)}>
                        <Text style={styles.primaryText}>{detail.status === 'approved' ? 'Edit quote' : 'Respond with a price'}</Text>
                      </Pressable>
                    ) : null}
                    <View style={styles.detailRow}>
                      {detail.user_id ? (
                        <Pressable style={styles.secondaryButton} onPress={() => { setDetail(null); navigation.navigate('Customers'); }}>
                          <Text style={styles.secondaryText}>View customer</Text>
                        </Pressable>
                      ) : null}
                      {detail.status === 'approved' && !isExpired(detail) ? (
                        <Pressable style={[styles.secondaryButton, { borderColor: colors.purple }]} onPress={() => markExpired(detail)}>
                          <Text style={[styles.secondaryText, { color: colors.purple }]}>Mark expired</Text>
                        </Pressable>
                      ) : null}
                      {detail.booked_shipment_id ? (
                        <Pressable style={styles.secondaryButton} onPress={() => setDetail(null)}>
                          <Text style={styles.secondaryText}>Booked ✓</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </>
              ) : null}
              <Pressable style={styles.modalCancel} onPress={() => setDetail(null)}><Text style={styles.modalCancelText}>Close</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pricing form */}
      <Modal visible={Boolean(responding)} transparent animationType="slide" onRequestClose={() => setResponding(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Respond to quote</Text>
              <Text style={styles.modalDesc} numberOfLines={5}>{responding?.description?.replace(/^\[[^\]]+\]\s*/, '')}</Text>
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
              <Pressable style={[styles.primaryButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('approve')}>
                <Text style={styles.primaryText}>Approve & send price</Text>
              </Pressable>
              <View style={styles.detailRow}>
                <Pressable style={[styles.secondaryButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('request_info')}>
                  <Text style={styles.secondaryText}>Request info</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, { borderColor: colors.danger }, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => respond('reject')}>
                  <Text style={[styles.secondaryText, { color: colors.danger }]}>Reject</Text>
                </Pressable>
              </View>
              <Pressable style={styles.modalCancel} onPress={() => setResponding(null)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ContactButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.contactButton} onPress={onPress}>
      <Ionicons name={icon} size={15} color={colors.primaryDark} />
      <Text style={styles.contactButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBlock: { padding: spacing.lg, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.md, flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  reference: { fontSize: 10, fontWeight: '800', color: colors.primary },
  contact: { fontSize: 12, color: colors.textMuted },
  desc: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 18 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  amount: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, flex: 1 },
  date: { fontSize: 11, color: colors.textFaint },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '90%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalDesc: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  contactButtonText: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 4 },
  blockText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  quoteImage: { width: 110, height: 110, borderRadius: radius.sm, backgroundColor: colors.bg },
  quoteAmount: { fontSize: 22, fontWeight: '900', color: colors.primaryDark },
  detailActions: { marginTop: spacing.lg, gap: spacing.sm },
  detailRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: spacing.sm },
  primaryText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  secondaryButton: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 9, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
