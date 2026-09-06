import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { senderName, type Shipment } from '../../lib/shipment';
import { BackButton, ErrorState, SkeletonList } from '../../components/adminui';

/**
 * Every proof of payment, each one tied to the shipment it belongs to.
 *
 * The finance dashboard shows the handful most recently uploaded; this is the
 * whole list, which is what you need when chasing a specific customer or
 * working through a backlog. Both read the same rows and review through the
 * same routine.
 *
 * The shipment link matters as much as the customer's name: a proof that
 * cannot be attributed to a consignment cannot be reconciled against what was
 * actually charged for it.
 */

type Filter = 'pending' | 'verified' | 'rejected' | 'all';

type ProofRow = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  storage_path: string;
  customer_notes: string | null;
  finance_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  shipmentId: string | null;
  customer: string;
  contact: string;
  reference: string;
  route: string;
};

const TONE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#fef3c7', fg: '#b45309', label: 'Awaiting review' },
  verified: { bg: '#d1fae5', fg: '#047857', label: 'Approved' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
};

export default function PaymentProofsScreen() {
  const navigation = useNavigation<any>();
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [open, setOpen] = useState<ProofRow | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const result = await supabase.from('payment_proofs')
      .select('id,user_id,shipment_id,amount,currency,status,storage_path,customer_notes,finance_notes,created_at,reviewed_at')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(300);
    // A failed read is not an empty one — saying "no proofs" when the query
    // broke would tell finance there is nothing to do.
    if (result.error) {
      setError('Proofs of payment could not be loaded. Check your access and try again.');
      setProofs([]);
      return;
    }
    const rows = result.data || [];
    const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];
    const shipmentIds = [...new Set(rows.map((r: any) => r.shipment_id).filter(Boolean))];
    const [profiles, shipments] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id,full_name,email,phone_number').in('id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      shipmentIds.length
        ? supabase.from('shipments').select('id,customer_reference,tracking_number,metadata').in('id', shipmentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byUser = new Map((profiles.data || []).map((r: any) => [r.id, r]));
    const byShipment = new Map((shipments.data || []).map((r: any) => [r.id, r]));
    setProofs(rows.map((row: any) => {
      const profile: any = byUser.get(row.user_id);
      const shipment: any = byShipment.get(row.shipment_id);
      const fromShipment = shipment ? senderName(shipment as Shipment) : '';
      const collection = shipment?.metadata?.collection || {};
      return {
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        storage_path: row.storage_path,
        customer_notes: row.customer_notes,
        finance_notes: row.finance_notes,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        shipmentId: row.shipment_id,
        customer: profile?.full_name
          || (fromShipment && fromShipment !== 'No Name' ? fromShipment : '')
          || profile?.email
          || 'Customer not matched',
        contact: profile?.email || profile?.phone_number || '',
        reference: shipment?.customer_reference || shipment?.tracking_number || 'No shipment linked',
        route: [collection.route, shipment?.destination].filter(Boolean).join(' → '),
      } satisfies ProofRow;
    }));
  }, []);

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]));

  const counts = useMemo(() => ({
    pending: proofs.filter((p) => p.status === 'pending').length,
    verified: proofs.filter((p) => p.status === 'verified').length,
    rejected: proofs.filter((p) => p.status === 'rejected').length,
    all: proofs.length,
  }), [proofs]);

  const shown = useMemo(
    () => (filter === 'all' ? proofs : proofs.filter((p) => p.status === filter)),
    [proofs, filter]);

  const openProof = async (proof: ProofRow) => {
    setOpen(proof);
    setUri(null);
    setNote('');
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 600);
    setUri(data?.signedUrl || null);
  };

  const review = async (approved: boolean) => {
    if (!open) return;
    if (!approved && !note.trim()) {
      Alert.alert('Say why', 'A rejected proof goes back to the customer, so tell them what was wrong with it.');
      return;
    }
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('review_payment_proof', {
        p_proof_id: open.id, p_approved: approved, p_finance_notes: note.trim() || null,
      });
      if (rpcError) throw rpcError;
      setOpen(null);
      await load();
    } catch (e: any) {
      Alert.alert('Could not save the review', e?.message || 'Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const symbolFor = (currency: string | null) =>
    String(currency || 'GBP').toUpperCase() === 'EUR' ? '€' : '£';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Proof of payment</Text>
            <Text style={styles.subtitle}>Every slip a customer or staff member has uploaded, with its shipment</Text>
          </View>
        </View>

        <View style={styles.filters}>
          {(['pending', 'verified', 'rejected', 'all'] as Filter[]).map((key) => (
            <Pressable key={key} style={[styles.filter, filter === key && styles.filterOn]} onPress={() => setFilter(key)}>
              <Text style={[styles.filterText, filter === key && styles.filterTextOn]}>
                {key[0].toUpperCase() + key.slice(1)} {counts[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {loading ? <SkeletonList rows={4} /> : shown.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={30} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              {filter === 'pending' ? 'Nothing waiting on review.' : 'No proofs in this filter.'}
            </Text>
          </View>
        ) : shown.map((proof) => {
          const tone = TONE[proof.status] || TONE.pending;
          return (
            <Pressable key={proof.id} style={styles.row} onPress={() => openProof(proof)}>
              <View style={styles.icon}><Ionicons name="document-attach-outline" size={19} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customer} numberOfLines={1}>{proof.customer}</Text>
                <Text style={styles.meta} numberOfLines={1}>{proof.reference}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {new Date(proof.created_at).toLocaleDateString('en-GB')}{proof.route ? ` · ${proof.route}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.amount}>
                  {proof.amount != null ? `${symbolFor(proof.currency)}${Number(proof.amount).toFixed(2)}` : '—'}
                </Text>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={{ color: tone.fg, fontSize: 9, fontWeight: '900' }}>{tone.label.toUpperCase()}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(open)} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.shade}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {open ? (
                <>
                  <Text style={styles.sheetTitle}>{open.customer}</Text>
                  <Text style={styles.meta}>{open.contact || 'No contact on file'}</Text>
                  <Pressable
                    style={styles.shipmentLink}
                    disabled={!open.shipmentId}
                    onPress={() => {
                      const id = open.shipmentId;
                      setOpen(null);
                      if (id) navigation.navigate('Document', { shipmentId: id, kind: 'invoice' });
                    }}
                  >
                    <Ionicons name="cube-outline" size={17} color={colors.primaryDark} />
                    <Text style={styles.shipmentLinkText}>{open.reference}</Text>
                    {open.shipmentId ? <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} /> : null}
                  </Pressable>
                  <Text style={styles.sheetAmount}>
                    {open.amount != null ? `${symbolFor(open.currency)}${Number(open.amount).toFixed(2)}` : 'Amount not stated'}
                  </Text>
                  <Text style={styles.meta}>Uploaded {new Date(open.created_at).toLocaleString('en-GB')}</Text>
                  {open.customer_notes ? (
                    <><Text style={styles.blockLabel}>WHAT THE CUSTOMER SAID</Text><Text style={styles.body}>{open.customer_notes}</Text></>
                  ) : null}

                  <Text style={styles.blockLabel}>THE SLIP</Text>
                  {uri ? (
                    <Image source={{ uri }} style={styles.image} resizeMode="contain" />
                  ) : (
                    <View style={styles.imagePlaceholder}><ActivityIndicator color={colors.primary} /></View>
                  )}

                  {open.status === 'pending' ? (
                    <>
                      <Text style={styles.blockLabel}>NOTE (REQUIRED TO REJECT)</Text>
                      <TextInput
                        style={styles.input} value={note} onChangeText={setNote} multiline
                        placeholder="What you checked, or what was wrong with it"
                        placeholderTextColor={colors.textFaint}
                      />
                      <View style={styles.actions}>
                        <Pressable style={[styles.approve, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => review(true)}>
                          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.approveText}>Approve</Text>}
                        </Pressable>
                        <Pressable style={[styles.reject, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => review(false)}>
                          <Text style={styles.rejectText}>Reject</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.blockLabel}>REVIEWED</Text>
                      <Text style={styles.body}>
                        {open.reviewed_at ? new Date(open.reviewed_at).toLocaleString('en-GB') : 'Already reviewed'}
                        {open.finance_notes ? ` — ${open.finance_notes}` : ''}
                      </Text>
                    </>
                  )}
                  <Pressable style={styles.close} onPress={() => setOpen(null)}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  filters: { flexDirection: 'row', gap: 6 },
  filter: { flex: 1, minWidth: 0, borderRadius: radius.pill, backgroundColor: '#F2F4F7', paddingVertical: 8, alignItems: 'center' },
  filterOn: { backgroundColor: colors.primaryDark },
  filterText: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted },
  filterTextOn: { color: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 82, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  customer: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
  amount: { fontSize: 14, fontWeight: '900', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  empty: { alignItems: 'center', gap: 8, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
  shade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  sheetTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  shipmentLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  shipmentLinkText: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  sheetAmount: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: spacing.sm },
  blockLabel: { fontSize: 9.5, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 5 },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  image: { width: '100%', height: 300, borderRadius: radius.md, backgroundColor: colors.bg },
  imagePlaceholder: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, fontSize: 13, color: colors.text, backgroundColor: colors.bg, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  approve: { flex: 1, minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  reject: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: colors.danger, fontWeight: '900', fontSize: 13 },
  close: { alignItems: 'center', paddingVertical: 14, marginTop: spacing.sm },
  closeText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
