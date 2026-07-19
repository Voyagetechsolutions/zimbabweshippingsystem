import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { addToMoneyMap, money, moneyMap } from '../lib/format';
import { colors, radius, shadow, spacing } from '../theme';

type Payment = { amount: number; currency: string | null; payment_method: string | null; payment_status: string | null; reconciled_at: string | null; created_at: string };
type Expense = { amount: number; currency: string | null; status: string | null; expense_date: string };

function useFinanceData() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [paymentResult, expenseResult, anomalyResult] = await Promise.all([
      supabase.from('payments').select('amount,currency,payment_method,payment_status,reconciled_at,created_at').order('created_at', { ascending: false }),
      supabase.from('finance_expenses').select('amount,currency,status,expense_date').order('expense_date', { ascending: false }),
      supabase.from('finance_anomalies').select('id,title,description,amount,severity,status,detected_at').in('status', ['open', 'reviewing']).order('detected_at', { ascending: false }),
    ]);
    setPayments((paymentResult.data || []) as Payment[]);
    setExpenses((expenseResult.data || []) as Expense[]);
    setAnomalies(anomalyResult.data || []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return { payments, expenses, anomalies, loading, refreshing, refresh, load };
}

export function ZimmyFinanceScreen() {
  const { payments, anomalies, loading, refreshing, refresh } = useFinanceData();
  const insights = useMemo(() => {
    if (anomalies.length) return anomalies.slice(0, 4).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      amount: row.amount ? money(Number(row.amount)) : undefined,
      severity: row.severity,
    }));
    const pending = payments.filter((row) => !['paid', 'completed', 'success', 'succeeded'].includes(String(row.payment_status || '').toLowerCase()));
    const unreconciled = payments.filter((row) => !row.reconciled_at);
    const pendingValue = pending.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return [
      { id: 'pending', title: `${pending.length} payments pending`, description: 'Payments still waiting to be completed.', amount: money(pendingValue), severity: 'medium' },
      { id: 'reconcile', title: `${unreconciled.length} payments need reconciliation`, description: 'Match these payments to the finance records.', severity: 'medium' },
      { id: 'healthy', title: 'Finance monitor is active', description: 'Zimmy is checking payment and expense activity.', severity: 'low' },
    ];
  }, [anomalies, payments]);
  if (loading) return <Loading />;

  return <Page refreshing={refreshing} onRefresh={refresh}>
    <View style={styles.zimmyHeader}>
      <View style={styles.bot}><Ionicons name="sparkles" size={25} color={colors.white} /></View>
      <View><Text style={styles.title}>Zimmy AI</Text><Text style={styles.subtitle}>Your financial assistant</Text></View>
    </View>
    <View style={styles.briefCard}>
      <Text style={styles.briefTitle}>Morning Brief</Text>
      <Text style={styles.briefIntro}>Good morning! Here’s what you need to know today.</Text>
      <View style={styles.insightList}>
        {insights.map((item, index) => {
          const danger = item.severity === 'high' || item.severity === 'critical';
          const tone = danger ? { bg: colors.redSoft, fg: colors.danger, icon: 'alert-circle' as const } : index === 2 ? { bg: colors.primarySoft, fg: colors.primary, icon: 'cash' as const } : { bg: colors.amberSoft, fg: colors.amber, icon: 'time' as const };
          return <View key={item.id} style={styles.insightRow}>
            <View style={[styles.insightIcon, { backgroundColor: tone.bg }]}><Ionicons name={tone.icon} size={19} color={tone.fg} /></View>
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSub}>{item.description}</Text>{item.amount ? <Text style={styles.insightAmount}>{item.amount}</Text> : null}</View>
          </View>;
        })}
      </View>
    </View>
    <Pressable style={styles.primary} onPress={refresh}><Text style={styles.primaryText}>View All Insights</Text></Pressable>
  </Page>;
}

export function FinanceReportsScreen() {
  const { payments, expenses, loading, refreshing, refresh } = useFinanceData();
  const summary = useMemo(() => buildSummary(payments, expenses), [payments, expenses]);
  if (loading) return <Loading />;
  return <Page refreshing={refreshing} onRefresh={refresh}>
    <ScreenHeader title="Reports" />
    <View style={styles.dateChip}><Ionicons name="calendar-outline" size={14} color={colors.textMuted} /><Text style={styles.dateText}>Last 7 days</Text></View>
    <View style={styles.reportCard}>
      <Text style={styles.kicker}>Revenue</Text>
      <View style={styles.amountLine}><Text style={styles.bigAmount}>{moneyMap(summary.income)}</Text><Text style={[styles.change, { color: summary.change >= 0 ? colors.primary : colors.danger }]}>{summary.change >= 0 ? '+' : ''}{summary.change.toFixed(0)}%</Text></View>
      <Text style={styles.rowSub}>Compared with the previous seven days</Text>
      <BarChart values={summary.daily.map((day) => ({ label: day.label, value: day.income }))} />
    </View>
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>Top Payment Methods</Text>
      {summary.methods.length ? summary.methods.map(([label, value], index) => <View key={label} style={styles.methodRow}><View style={[styles.methodDot, { backgroundColor: [colors.primary, colors.purple, colors.amber, colors.blue][index] }]} /><Text style={styles.methodLabel}>{label}</Text><Text style={styles.methodValue}>{money(value)}</Text></View>) : <Text style={styles.rowSub}>No payment records yet.</Text>}
    </View>
  </Page>;
}

export function FinanceCashFlowScreen() {
  const { payments, expenses, loading, refreshing, refresh } = useFinanceData();
  const summary = useMemo(() => buildSummary(payments, expenses), [payments, expenses]);
  if (loading) return <Loading />;
  return <Page refreshing={refreshing} onRefresh={refresh}>
    <ScreenHeader title="Cash Flow" />
    <View style={styles.dateChip}><Text style={styles.dateText}>This Month</Text><Ionicons name="chevron-down" size={14} color={colors.textMuted} /></View>
    <View style={styles.cashCard}>
      <Text style={styles.kicker}>Cash Position</Text><Text style={[styles.bigAmount, { color: colors.primary }]}>{moneyMap(summary.net)}</Text>
      <View style={styles.cashRows}>
        <DataRow label="Opening Balance" value={moneyMap(summary.opening)} />
        <DataRow label="Incoming" value={moneyMap(summary.income)} />
        <DataRow label="Outgoing" value={`-${moneyMap(summary.outgoing)}`} />
        <DataRow label="Closing Balance" value={moneyMap(summary.net)} last />
      </View>
    </View>
    <View style={styles.reportCard}>
      <Text style={styles.cardTitle}>Cash Flow Trend</Text>
      <BarChart values={summary.daily.map((day) => ({ label: day.label, value: day.income - day.outgoing }))} />
    </View>
  </Page>;
}

function buildSummary(payments: Payment[], expenses: Expense[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousWeekStart = new Date(); previousWeekStart.setDate(now.getDate() - 13); previousWeekStart.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(); currentWeekStart.setDate(now.getDate() - 6); currentWeekStart.setHours(0, 0, 0, 0);
  const paid = payments.filter((row) => ['paid', 'completed', 'success', 'succeeded'].includes(String(row.payment_status || '').toLowerCase()));
  const monthPayments = paid.filter((row) => new Date(row.created_at) >= monthStart);
  const monthExpenses = expenses.filter((row) => row.status !== 'rejected' && new Date(row.expense_date) >= monthStart);
  const income: Record<string, number> = {}; const outgoing: Record<string, number> = {}; const opening: Record<string, number> = {};
  monthPayments.forEach((row) => addToMoneyMap(income, row.amount, row.currency));
  monthExpenses.forEach((row) => addToMoneyMap(outgoing, row.amount, row.currency));
  paid.filter((row) => new Date(row.created_at) < monthStart).forEach((row) => addToMoneyMap(opening, row.amount, row.currency));
  expenses.filter((row) => row.status !== 'rejected' && new Date(row.expense_date) < monthStart).forEach((row) => addToMoneyMap(opening, -Number(row.amount || 0), row.currency));
  const net = { ...opening }; Object.entries(income).forEach(([key, value]) => { net[key] = (net[key] || 0) + value; }); Object.entries(outgoing).forEach(([key, value]) => { net[key] = (net[key] || 0) - value; });
  const daily = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(now.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10); return { label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), income: paid.filter((row) => row.created_at.slice(0, 10) === key).reduce((sum, row) => sum + Number(row.amount || 0), 0), outgoing: expenses.filter((row) => row.status !== 'rejected' && row.expense_date.slice(0, 10) === key).reduce((sum, row) => sum + Number(row.amount || 0), 0) }; });
  const current = paid.filter((row) => new Date(row.created_at) >= currentWeekStart).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const previous = paid.filter((row) => { const date = new Date(row.created_at); return date >= previousWeekStart && date < currentWeekStart; }).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const methodTotals: Record<string, number> = {}; paid.forEach((row) => { const label = row.payment_method || 'Other'; methodTotals[label] = (methodTotals[label] || 0) + Number(row.amount || 0); });
  return { income, outgoing, opening, net, daily, change: previous ? ((current - previous) / previous) * 100 : current ? 100 : 0, methods: Object.entries(methodTotals).sort((a, b) => b[1] - a[1]).slice(0, 4) };
}

function Page({ children, refreshing, onRefresh }: { children: React.ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>{children}</ScrollView></SafeAreaView>;
}
function ScreenHeader({ title }: { title: string }) { const navigation = useNavigation<any>(); return <View style={styles.screenHeader}>{navigation.canGoBack() ? <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.text} /></Pressable> : null}<Text style={styles.title}>{title}</Text></View>; }
function Loading() { return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>; }
function DataRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) { return <View style={[styles.dataRow, last && { borderBottomWidth: 0 }]}><Text style={styles.dataLabel}>{label}</Text><Text style={styles.dataValue}>{value}</Text></View>; }
function BarChart({ values }: { values: { label: string; value: number }[] }) { const max = Math.max(1, ...values.map((item) => Math.abs(item.value))); return <View style={styles.chart}>{values.map((item) => <View key={item.label} style={styles.barColumn}><View style={[styles.bar, { height: Math.max(5, Math.abs(item.value) / max * 91), backgroundColor: item.value < 0 ? colors.danger : colors.primary }]} /><Text style={styles.barLabel}>{item.label}</Text></View>)}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text }, subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 }, back: { width: 35, height: 35, justifyContent: 'center' },
  zimmyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, bot: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purple },
  briefCard: { padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow }, briefTitle: { fontSize: 15, fontWeight: '800', color: colors.text }, briefIntro: { fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 5, marginBottom: spacing.sm }, insightList: { gap: 2 }, insightRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, insightAmount: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, rowSub: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 }, primary: { minHeight: 49, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  dateChip: { alignSelf: 'flex-end', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }, dateText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  reportCard: { padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow }, kicker: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700' }, amountLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, bigAmount: { color: colors.text, fontSize: 28, fontWeight: '800' }, change: { fontSize: 12, fontWeight: '800' }, cardTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: spacing.sm },
  chart: { height: 125, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: spacing.lg }, barColumn: { flex: 1, height: 117, justifyContent: 'flex-end', alignItems: 'center', gap: 7 }, bar: { width: '58%', minWidth: 11, borderRadius: 4 }, barLabel: { fontSize: 9.5, color: colors.textMuted },
  methodRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, methodDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm }, methodLabel: { flex: 1, fontSize: 12, color: colors.textMuted }, methodValue: { fontSize: 12, fontWeight: '800', color: colors.text },
  cashCard: { padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow }, cashRows: { marginTop: spacing.md }, dataRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, dataLabel: { fontSize: 11.5, color: colors.textMuted }, dataValue: { fontSize: 12, fontWeight: '800', color: colors.text },
});
