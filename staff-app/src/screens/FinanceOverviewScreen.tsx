import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { money } from '../lib/format';
import { currencyLine, percentChange } from '../lib/reports';
import { ScreenHeader, Card, SectionLabel, Badge, BADGE, Avatar, SkeletonList, ErrorState, LineChart, TrendChip } from '../components/adminui';

// Finance Overview: server-aggregated cash position, cash flow, reconciliation
// workload and recent transactions with proof review + reconcile actions.

interface Overview {
  collectedByCurrency: Record<string, number>;
  pendingByCurrency: Record<string, number>;
  pendingPaymentCount: number;
  expensesTotal: number;
  incoming30: number; incomingPrev30: number;
  outgoing30: number; outgoingPrev30: number;
  billedByCurrency: Record<string, number>;
  unpaidInvoices: number;
  outstandingByCurrency: Record<string, number>;
  unreconciledPayments: number;
  pendingProofs: number;
  cashflow: Array<{ day: string; inGBP: number; inEUR: number; out: number }>;
  recentTransactions: Array<{
    id: string; amount: number; currency: string; method: string | null; status: string | null;
    reconciled: boolean; createdAt: string; shipmentId: string | null; reference: string | null;
    customer: string; proofId: string | null;
  }>;
}

export default function FinanceOverviewScreen() {
  const navigation = useNavigation<any>();
  const { session, profile, dashboardRole } = useAuth();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);
  const [transaction, setTransaction] = useState<Overview['recentTransactions'][number] | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_finance_overview');
    if (rpcError) { setError(rpcError.message); return; }
    setOverview(data as Overview);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const cashflow = useMemo(() => (overview?.cashflow || []).slice(-period), [overview, period]);
  const netSeries = cashflow.map((d) => ({
    label: new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: Number(d.inGBP) + Number(d.inEUR),
  }));

  const openTransaction = async (t: Overview['recentTransactions'][number]) => {
    setTransaction(t);
    setProofUri(null);
    if (t.proofId) {
      const { data: proof } = await supabase.from('payment_proofs').select('storage_path,status').eq('id', t.proofId).maybeSingle();
      if (proof?.storage_path) {
        const { data: signed } = await supabase.storage.from('payment-proofs').createSignedUrl(proof.storage_path, 600);
        setProofUri(signed?.signedUrl || null);
      }
    }
  };

  const reviewProof = async (approved: boolean) => {
    if (!transaction?.proofId) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('review_payment_proof', {
        p_proof_id: transaction.proofId, p_approved: approved, p_finance_notes: null,
      });
      if (rpcError) throw rpcError;
      Alert.alert('Done', approved ? 'Proof approved.' : 'Proof rejected — the customer has been notified.');
      setTransaction(null);
      await load();
    } catch (e: any) { Alert.alert('Review failed', e?.message); }
    finally { setBusy(false); }
  };

  const reconcile = async () => {
    if (!transaction) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('set_payment_reconciled', {
        p_payment_id: transaction.id, p_reconciled: true, p_notes: null,
      });
      if (rpcError) throw rpcError;
      setTransaction(null);
      await load();
    } catch (e: any) { Alert.alert('Could not reconcile', e?.message); }
    finally { setBusy(false); }
  };

  const incomingChange = overview ? percentChange(overview.incoming30, overview.incomingPrev30) : null;
  const net30 = overview ? overview.incoming30 - overview.outgoing30 : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader
          title="Finance Overview"
          subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          onBell={() => {}}
          right={<Avatar name={profile?.full_name || session?.user.email} size={36} />}
        />

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading || !overview ? (error ? null : <SkeletonList rows={6} />) : (
          <>
            {/* Cash position */}
            <View style={styles.cashCard}>
              <Text style={styles.cashLabel}>CASH POSITION</Text>
              <Text style={styles.cashValue}>{currencyLine(overview.collectedByCurrency)}</Text>
              <View style={styles.cashTrendRow}>
                <TrendChip current={overview.incoming30} previous={overview.incomingPrev30} />
                <Text style={styles.cashCompare}>vs previous 30 days</Text>
              </View>
              <LineChart width={chartWidth} height={72} color={colors.white}
                points={netSeries.slice(-14)} />
            </View>

            {/* Metric cards */}
            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>INCOMING (30D)</Text>
                <Text style={[styles.metricValue, { color: colors.primaryDark }]}>{money(overview.incoming30)}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>OUTGOING (30D)</Text>
                <Text style={[styles.metricValue, { color: colors.danger }]}>{money(overview.outgoing30)}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>NET</Text>
                <Text style={[styles.metricValue, { color: net30 >= 0 ? colors.primaryDark : colors.danger }]}>{money(net30)}</Text>
              </Card>
            </View>

            {/* Awaiting collection — real money not yet marked as received */}
            {overview.pendingPaymentCount > 0 ? (
              <Card onPress={() => navigation.navigate('Payments')} style={{ borderColor: colors.amberBorder, backgroundColor: colors.amberSoft }}>
                <View style={styles.pendingRow}>
                  <Ionicons name="hourglass-outline" size={19} color={colors.amber} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>{currencyLine(overview.pendingByCurrency)} awaiting collection</Text>
                    <Text style={styles.pendingText}>
                      {overview.pendingPaymentCount} payment{overview.pendingPaymentCount === 1 ? '' : 's'} still marked pending — they are excluded from the cash position until marked as paid.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.amber} />
                </View>
              </Card>
            ) : null}

            {/* Financial summary */}
            <SectionLabel text="Financial summary" />
            <Card>
              <SummaryRow label="Total billed" value={currencyLine(overview.billedByCurrency)} />
              <SummaryRow label="Total collected" value={currencyLine(overview.collectedByCurrency)} />
              <SummaryRow label="Awaiting collection" value={`${currencyLine(overview.pendingByCurrency)} (${overview.pendingPaymentCount} pending)`} tone={overview.pendingPaymentCount ? colors.amber : undefined} />
              <SummaryRow label="Outstanding" value={`${currencyLine(overview.outstandingByCurrency)} (${overview.unpaidInvoices} invoices)`} tone={overview.unpaidInvoices ? colors.danger : undefined} />
              <SummaryRow label="Expenses" value={money(overview.expensesTotal)} />
              <SummaryRow label="Incoming change" value={incomingChange != null ? `${incomingChange >= 0 ? '+' : ''}${incomingChange.toFixed(0)}% vs previous period` : '—'} />
            </Card>

            {/* Cash-flow trend */}
            <SectionLabel text="Cash-flow trend" />
            <Card>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Incoming payments</Text>
                <View style={styles.periodRow}>
                  {[7, 30].map((p) => (
                    <Pressable key={p} style={[styles.periodChip, period === p && styles.periodChipActive]} onPress={() => setPeriod(p as 7 | 30)}>
                      <Text style={[styles.periodText, period === p && { color: colors.white }]}>{p}d</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <LineChart width={chartWidth} points={netSeries} />
              <Text style={styles.muted}>Outgoing (expenses) in range: {money(cashflow.reduce((s, d) => s + Number(d.out), 0))}</Text>
            </Card>

            {/* Reconciliation workload */}
            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }} onPress={() => navigation.navigate('Payments')}>
                <Text style={styles.metricLabel}>NEED RECONCILING</Text>
                <Text style={[styles.metricValue, { color: overview.unreconciledPayments ? colors.orange : colors.primaryDark }]}>{overview.unreconciledPayments}</Text>
                <Text style={styles.muted}>payments</Text>
              </Card>
              <Card style={{ flex: 1 }} onPress={() => navigation.navigate('Payments')}>
                <Text style={styles.metricLabel}>PROOFS TO VALIDATE</Text>
                <Text style={[styles.metricValue, { color: overview.pendingProofs ? colors.orange : colors.primaryDark }]}>{overview.pendingProofs}</Text>
                <Text style={styles.muted}>awaiting review</Text>
              </Card>
            </View>

            {/* Recent transactions */}
            <SectionLabel text="Recent transactions" />
            {overview.recentTransactions.length === 0 ? (
              <Card><Text style={styles.muted}>No payments recorded yet.</Text></Card>
            ) : overview.recentTransactions.map((t) => {
              const statusLower = String(t.status || '').toLowerCase();
              const badge = t.reconciled ? { label: 'Reconciled', tone: BADGE.blue }
                : ['completed', 'paid', 'success', 'succeeded'].includes(statusLower) ? { label: 'Paid', tone: BADGE.green }
                : statusLower.includes('reject') || statusLower.includes('fail') ? { label: 'Rejected', tone: BADGE.red }
                : { label: 'Pending', tone: BADGE.orange };
              return (
                <Pressable key={t.id} style={styles.txRow} onPress={() => openTransaction(t)}>
                  <View style={styles.txIcon}><Ionicons name="card-outline" size={17} color={colors.primaryDark} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txCustomer} numberOfLines={1}>{t.customer}</Text>
                    <Text style={styles.muted}>{[t.reference, t.method].filter(Boolean).join(' · ')} · {new Date(t.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={styles.txAmount}>{money(Number(t.amount) || 0, t.currency === 'EUR' ? '€' : '£')}</Text>
                    <Badge text={badge.label} tone={badge.tone} />
                  </View>
                </Pressable>
              );
            })}

            <Pressable style={styles.reportsButton} onPress={() => navigation.navigate('Reports')}>
              <Ionicons name="stats-chart-outline" size={16} color={colors.white} />
              <Text style={styles.reportsText}>Open full reports</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Transaction detail */}
      <Modal visible={Boolean(transaction)} transparent animationType="slide" onRequestClose={() => setTransaction(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView>
              {transaction ? (
                <>
                  <Text style={styles.modalTitle}>{money(Number(transaction.amount) || 0, transaction.currency === 'EUR' ? '€' : '£')}</Text>
                  <Text style={styles.muted}>{transaction.customer} · {transaction.reference || 'No reference'} · {transaction.method || 'Unknown method'}</Text>
                  <Text style={styles.muted}>{new Date(transaction.createdAt).toLocaleString()}</Text>
                  {proofUri ? (
                    <>
                      <Text style={styles.blockLabel}>PROOF OF PAYMENT</Text>
                      <Image source={{ uri: proofUri }} style={styles.proofImage} resizeMode="cover" />
                      <View style={styles.modalRow}>
                        <Pressable style={[styles.modalPrimary, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => reviewProof(true)}>
                          <Text style={styles.modalPrimaryText}>Approve proof</Text>
                        </Pressable>
                        <Pressable style={[styles.modalDangerOutline, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => reviewProof(false)}>
                          <Text style={styles.modalDangerText}>Reject</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : transaction.proofId ? <Text style={styles.muted}>Loading proof…</Text> : <Text style={styles.muted}>No proof of payment attached.</Text>}
                  {!transaction.reconciled ? (
                    <Pressable style={[styles.modalPrimary, busy && { opacity: 0.5 }]} disabled={busy} onPress={reconcile}>
                      <Text style={styles.modalPrimaryText}>Mark reconciled</Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.modalRow}>
                    <Pressable style={styles.modalSecondary} onPress={() => { setTransaction(null); navigation.navigate('Invoices'); }}>
                      <Text style={styles.modalSecondaryText}>View invoices</Text>
                    </Pressable>
                    {dashboardRole === 'admin' ? (
                      <Pressable style={styles.modalSecondary} onPress={() => { setTransaction(null); navigation.navigate('Customers'); }}>
                        <Text style={styles.modalSecondaryText}>View customer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
              <Pressable style={styles.modalCancel} onPress={() => setTransaction(null)}><Text style={styles.modalCancelText}>Close</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone ? { color: tone } : null]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  cashCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  cashLabel: { fontSize: 9.5, fontWeight: '800', color: '#C9F0DF', letterSpacing: 0.6 },
  cashValue: { fontSize: 26, fontWeight: '900', color: colors.white },
  cashTrendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cashCompare: { fontSize: 10.5, color: '#C9F0DF' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: colors.amber },
  pendingText: { fontSize: 11, color: colors.amber, marginTop: 2, lineHeight: 15 },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  metricValue: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 3 },
  muted: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  periodRow: { flexDirection: 'row', gap: 6 },
  periodChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, paddingVertical: 5 },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  summaryLabel: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 12.5, fontWeight: '800', color: colors.text, flexShrink: 1, textAlign: 'right' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  txCustomer: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  txAmount: { fontSize: 14, fontWeight: '900', color: colors.text },
  reportsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, marginTop: spacing.sm },
  reportsText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '88%' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 6 },
  proofImage: { width: '100%', height: 190, borderRadius: radius.sm, backgroundColor: colors.bg },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  modalPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 12.5 },
  modalDangerOutline: { flex: 1, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  modalDangerText: { color: colors.danger, fontWeight: '800', fontSize: 12.5 },
  modalSecondary: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  modalSecondaryText: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
