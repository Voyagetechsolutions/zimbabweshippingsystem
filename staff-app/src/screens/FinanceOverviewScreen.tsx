import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { hasBeenCollected, type Shipment, senderName } from '../lib/shipment';
import {
  getInvoice, getInvoiceStatus, getPaymentSummary, hasInvoice, INVOICE_STATUS_STYLE, invoiceSymbol,
} from '../lib/invoice';
import { ScreenHeader, Avatar, SkeletonList, ErrorState } from '../components/adminui';

const RECEIVED_PAYMENT_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded', 'verified']);

/**
 * A proof of payment, with the customer who sent it attached.
 *
 * `payment_proofs.user_id` points at an auth user, not at `profiles`, so
 * PostgREST cannot join the two for us — the name is resolved separately and
 * folded in here. A proof that cannot be tied to a named customer is the one
 * thing finance cannot act on, so the shipment's own sender name is used as the
 * fallback before giving up and saying so.
 */
type ProofRow = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: 'pending' | 'verified' | 'rejected' | string;
  storage_path: string;
  customer_notes: string | null;
  finance_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  customer: string;
  contact: string;
  reference: string;
};

const PROOF_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#fef3c7', fg: '#b45309', label: 'Awaiting review' },
  verified: { bg: '#d1fae5', fg: '#047857', label: 'Approved' },
  rejected: { bg: '#fee2e2', fg: '#b91c1c', label: 'Rejected' },
};


/**
 * Finance, deliberately small.
 *
 * This screen used to carry a cash position, incoming/outgoing/net metrics, a
 * financial summary, a cash-flow chart, reconciliation counters and a
 * transaction feed. None of it was what finance actually does here day to day,
 * which is: raise an invoice, correct one, remove one, and pull the month's
 * numbers. So that is all this is — the four things, the live collection and
 * payment totals, plus the invoices you most recently touched.
 */
export default function FinanceOverviewScreen() {
  const navigation = useNavigation<any>();
  const { session, profile } = useAuth();
  const [recent, setRecent] = useState<Shipment[]>([]);
  const [collectionTotals, setCollectionTotals] = useState({ count: 0, money: {} as Record<string, number> });
  const [proofs, setProofs] = useState<ProofRow[]>([]);
  const [proofsError, setProofsError] = useState<string | null>(null);
  const [openProof, setOpenProof] = useState<ProofRow | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [shipmentResult, collectionResult, paymentResult, proofResult] = await Promise.all([
      supabase.from('shipments').select('*').is('deleted_at', null).order('updated_at', { ascending: false }).limit(200),
      supabase.from('shipments').select('status,collection_status').is('deleted_at', null),
      supabase.from('payments').select('amount,currency,payment_status'),
      // Pending first. Ordering purely by date meant that once forty proofs
      // had been reviewed, a new one needing action could sit below the cut and
      // never be seen.
      supabase.from('payment_proofs')
        .select('id,user_id,shipment_id,amount,currency,status,storage_path,customer_notes,finance_notes,created_at,reviewed_at')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    // Reported separately: these are independent queries, and letting one
    // failure return early hid the proofs behind an invoice problem.
    if (shipmentResult.error) setError('Invoices are unavailable. Check your access and try again.');
    const shipments = (shipmentResult.data as Shipment[]) || [];
    const collectionShipments = (collectionResult.data as Array<{ status: string | null; collection_status: string | null }>) || [];
    const moneyByCurrency: Record<string, number> = {};
    for (const payment of paymentResult.data || []) {
      if (!RECEIVED_PAYMENT_STATUSES.has(String(payment.payment_status || '').toLowerCase())) continue;
      const currency = String(payment.currency || 'GBP').toUpperCase();
      moneyByCurrency[currency] = (moneyByCurrency[currency] || 0) + (Number(payment.amount) || 0);
    }
    setCollectionTotals({
      count: collectionShipments.filter(hasBeenCollected).length,
      money: moneyByCurrency,
    });
    setRecent(shipments
      .filter((s) => hasInvoice(s) && !getInvoice(s).deletedAt)
      .slice(0, 6));

    // Attach the customer. Two lookups rather than a join, because
    // payment_proofs references auth.users and PostgREST cannot reach profiles
    // from there. A missing profile falls back to the shipment's own sender.
    // A failed query is not an empty one. Reporting "no proofs" when the read
    // actually broke tells finance there is nothing to do, which is the one
    // wrong answer this screen must never give.
    if (proofResult.error) {
      setProofsError('Proof of payment could not be loaded. Check your access and try again.');
      setProofs([]);
      return;
    }
    setProofsError(null);
    const proofRows = (proofResult.data as any[]) || [];
    if (proofRows.length) {
      const userIds = [...new Set(proofRows.map((row) => row.user_id).filter(Boolean))];
      const shipmentIds = [...new Set(proofRows.map((row) => row.shipment_id).filter(Boolean))];
      const [profileResult, proofShipments] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id,full_name,email,phone_number').in('id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        shipmentIds.length
          ? supabase.from('shipments').select('id,customer_reference,tracking_number,metadata').in('id', shipmentIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const byUser = new Map((profileResult.data || []).map((row: any) => [row.id, row]));
      const byShipment = new Map((proofShipments.data || []).map((row: any) => [row.id, row]));
      setProofs(proofRows.map((row) => {
        const profileRow: any = byUser.get(row.user_id);
        const shipmentRow: any = byShipment.get(row.shipment_id);
        const fromShipment = shipmentRow ? senderName(shipmentRow as Shipment) : '';
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
          customer: profileRow?.full_name
            || (fromShipment && fromShipment !== 'No Name' ? fromShipment : '')
            || profileRow?.email
            || 'Customer not matched',
          contact: profileRow?.email || profileRow?.phone_number || '',
          reference: shipmentRow?.customer_reference || shipmentRow?.tracking_number || 'No shipment linked',
        } satisfies ProofRow;
      }));
    } else {
      setProofs([]);
    }
  }, []);

  /** Open one proof and fetch a short-lived link to the image behind it. */
  const viewProof = async (proof: ProofRow) => {
    setOpenProof(proof);
    setProofUri(null);
    setReviewNote('');
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 600);
    setProofUri(data?.signedUrl || null);
  };

  const review = async (approved: boolean) => {
    if (!openProof) return;
    if (!approved && !reviewNote.trim()) {
      Alert.alert('Say why', 'A rejected proof is sent back to the customer, so tell them what was wrong with it.');
      return;
    }
    setReviewing(true);
    try {
      const { error: rpcError } = await supabase.rpc('review_payment_proof', {
        p_proof_id: openProof.id,
        p_approved: approved,
        p_finance_notes: reviewNote.trim() || null,
      });
      if (rpcError) throw rpcError;
      setOpenProof(null);
      await load();
      Alert.alert(approved ? 'Proof approved' : 'Proof rejected',
        approved
          ? 'The payment is recorded against the customer.'
          : 'The customer has been told and can upload another.');
    } catch (e: any) {
      Alert.alert('Could not save the review', e?.message || 'Nothing was changed. Check your access and try again.');
    } finally {
      setReviewing(false);
    }
  };

  useFocusEffect(useCallback(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]));

  const pendingProofs = useMemo(() => proofs.filter((proof) => proof.status === 'pending').length, [proofs]);

  const receivedMoney = useMemo(() => {
    const currencies = ['GBP', 'EUR'];
    return currencies.map((currency) => {
      const symbol = currency === 'EUR' ? '€' : '£';
      return `${symbol}${(collectionTotals.money[currency] || 0).toFixed(2)}`;
    }).join('  ·  ');
  }, [collectionTotals.money]);

  const actions: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void; primary?: boolean }> = [
    {
      icon: 'add-circle-outline',
      title: 'Create invoice',
      text: 'Raise a new invoice for a customer',
      onPress: () => navigation.navigate('Invoices', { create: true }),
      primary: true,
    },
    {
      icon: 'receipt-outline',
      title: 'Invoices',
      text: 'Open, edit or delete any invoice',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      icon: 'card-outline',
      title: 'Payments',
      text: 'Verification and allocation',
      onPress: () => navigation.navigate('Payments'),
    },
    {
      icon: 'bar-chart-outline',
      title: 'Monthly report',
      text: 'This month’s numbers, with PDF and CSV export',
      onPress: () => navigation.navigate('Reports', { range: 'month' }),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <ScreenHeader
          title="Finance"
          subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          right={<Avatar name={profile?.full_name || session?.user.email} size={36} />}
        />

        {actions.map((action) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            style={[styles.action, action.primary && styles.actionPrimary]}
            onPress={action.onPress}
          >
            <View style={[styles.actionIcon, action.primary && styles.actionIconPrimary]}>
              <Ionicons name={action.icon} size={22} color={action.primary ? colors.white : colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, action.primary && styles.actionTitlePrimary]}>{action.title}</Text>
              <Text style={[styles.actionText, action.primary && styles.actionTextPrimary]}>{action.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={action.primary ? colors.white : colors.textFaint} />
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>COLLECTION & PAYMENT TOTALS</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalCard}>
            <Ionicons name="cube-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.totalValue}>{collectionTotals.count}</Text>
            <Text style={styles.totalLabel}>Shipments collected</Text>
          </View>
          <View style={styles.totalCard}>
            <Ionicons name="cash-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>{receivedMoney}</Text>
            <Text style={styles.totalLabel}>Money received</Text>
          </View>
        </View>

        {error ? <ErrorState message={error} onRetry={load} /> : null}

        {/* Proof of payment, with the customer who sent it. Finance cannot act
            on a slip it cannot attribute, so the name leads each row. */}
        <View style={styles.proofHead}>
          <Text style={styles.sectionLabel}>PROOF OF PAYMENT</Text>
          {pendingProofs > 0 ? (
            <View style={styles.pendingPill}><Text style={styles.pendingPillText}>{pendingProofs} to review</Text></View>
          ) : null}
        </View>
        {loading ? <SkeletonList rows={2} /> : proofsError ? (
          <ErrorState message={proofsError} onRetry={load} />
        ) : proofs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>No customer has uploaded a proof of payment yet.</Text>
          </View>
        ) : proofs.slice(0, 6).map((proof) => {
          const tone = PROOF_TONE[proof.status] || PROOF_TONE.pending;
          const symbol = String(proof.currency || 'GBP').toUpperCase() === 'EUR' ? '\u20ac' : '\u00a3';
          return (
            <Pressable key={proof.id} style={styles.row} onPress={() => viewProof(proof)}>
              <View style={styles.proofIcon}><Ionicons name="document-attach-outline" size={19} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customer} numberOfLines={1}>{proof.customer}</Text>
                <Text style={styles.proofMeta} numberOfLines={1}>
                  {proof.reference} · {new Date(proof.created_at).toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.amount}>{proof.amount != null ? `${symbol}${Number(proof.amount).toFixed(2)}` : '\u2014'}</Text>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={{ color: tone.fg, fontSize: 9, fontWeight: '900' }}>{tone.label.toUpperCase()}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>RECENT INVOICES</Text>
        {loading ? <SkeletonList rows={4} /> : recent.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={30} color={colors.textFaint} />
            <Text style={styles.emptyText}>No invoices yet. Create the first one above.</Text>
          </View>
        ) : recent.map((s) => {
          const invoice = getInvoice(s);
          const summary = getPaymentSummary(invoice);
          const tone = INVOICE_STATUS_STYLE[getInvoiceStatus(invoice)];
          // Straight to the document. This opened the invoices list and left
          // you to find the one you had just tapped.
          return (
            <Pressable key={s.id} style={styles.row} onPress={() => navigation.navigate('Document', { shipmentId: s.id, kind: 'invoice' })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.number}>{invoice.invoiceNumber || '—'}</Text>
                <Text style={styles.customer} numberOfLines={1}>{senderName(s)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.amount}>{invoiceSymbol(invoice.currency)}{summary.total.toFixed(2)}</Text>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={{ color: tone.fg, fontSize: 9, fontWeight: '900' }}>{tone.label.toUpperCase()}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(openProof)} transparent animationType="slide" onRequestClose={() => setOpenProof(null)}>
        <View style={styles.shade}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {openProof ? (() => {
                const symbol = String(openProof.currency || 'GBP').toUpperCase() === 'EUR' ? '\u20ac' : '\u00a3';
                const tone = PROOF_TONE[openProof.status] || PROOF_TONE.pending;
                return (
                  <>
                    <Text style={styles.sheetTitle}>{openProof.customer}</Text>
                    <Text style={styles.proofMeta}>
                      {openProof.contact || 'No contact on file'} · {openProof.reference}
                    </Text>
                    <View style={styles.sheetAmountRow}>
                      <Text style={styles.sheetAmount}>
                        {openProof.amount != null ? `${symbol}${Number(openProof.amount).toFixed(2)}` : 'Amount not stated'}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={{ color: tone.fg, fontSize: 9, fontWeight: '900' }}>{tone.label.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.proofMeta}>
                      Uploaded {new Date(openProof.created_at).toLocaleString('en-GB')}
                    </Text>
                    {openProof.customer_notes ? (
                      <><Text style={styles.blockLabel}>WHAT THE CUSTOMER SAID</Text><Text style={styles.body}>{openProof.customer_notes}</Text></>
                    ) : null}

                    <Text style={styles.blockLabel}>THE SLIP</Text>
                    {proofUri ? (
                      <Image source={{ uri: proofUri }} style={styles.proofImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.proofImagePlaceholder}><ActivityIndicator color={colors.primary} /></View>
                    )}

                    {openProof.status === 'pending' ? (
                      <>
                        <Text style={styles.blockLabel}>NOTE (REQUIRED TO REJECT)</Text>
                        <TextInput
                          style={styles.input}
                          value={reviewNote}
                          onChangeText={setReviewNote}
                          multiline
                          placeholder="What you checked, or what was wrong with it"
                          placeholderTextColor={colors.textFaint}
                        />
                        <View style={styles.sheetActions}>
                          <Pressable style={[styles.approve, reviewing && { opacity: 0.5 }]} disabled={reviewing} onPress={() => review(true)}>
                            {reviewing ? <ActivityIndicator color={colors.white} /> : <Text style={styles.approveText}>Approve</Text>}
                          </Pressable>
                          <Pressable style={[styles.reject, reviewing && { opacity: 0.5 }]} disabled={reviewing} onPress={() => review(false)}>
                            <Text style={styles.rejectText}>Reject</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.blockLabel}>REVIEWED</Text>
                        <Text style={styles.body}>
                          {openProof.reviewed_at ? new Date(openProof.reviewed_at).toLocaleString('en-GB') : 'Already reviewed'}
                          {openProof.finance_notes ? ` \u2014 ${openProof.finance_notes}` : ''}
                        </Text>
                      </>
                    )}
                    <Pressable style={styles.close} onPress={() => setOpenProof(null)}>
                      <Text style={styles.closeText}>Close</Text>
                    </Pressable>
                  </>
                );
              })() : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  proofHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingPill: { backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amberBorder, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, marginTop: spacing.md },
  pendingPillText: { fontSize: 10, fontWeight: '900', color: colors.amber },
  proofIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  proofMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
  shade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  sheetTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  sheetAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sheetAmount: { fontSize: 24, fontWeight: '900', color: colors.text },
  blockLabel: { fontSize: 9.5, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 5 },
  body: { fontSize: 13, color: colors.text, lineHeight: 19 },
  proofImage: { width: '100%', height: 300, borderRadius: radius.md, backgroundColor: colors.bg },
  proofImagePlaceholder: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 11, fontSize: 13, color: colors.text, backgroundColor: colors.bg, textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  approve: { flex: 1, minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  reject: { flex: 1, minHeight: 48, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: colors.danger, fontWeight: '900', fontSize: 13 },
  close: { alignItems: 'center', paddingVertical: 14, marginTop: spacing.sm },
  closeText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60, gap: spacing.sm },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 76,
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
  actionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  actionTitlePrimary: { color: colors.white },
  actionText: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  actionTextPrimary: { color: '#D6F2E5' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: colors.textMuted, marginTop: spacing.md },
  totalRow: { flexDirection: 'row', gap: spacing.sm },
  totalCard: { flex: 1, minHeight: 106, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  totalValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 9 },
  totalLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 68, padding: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
  },
  number: { fontSize: 13.5, fontWeight: '900', color: colors.primaryDark },
  customer: { fontSize: 12.5, fontWeight: '700', color: colors.text, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '900', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  empty: { alignItems: 'center', gap: 8, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
});
