import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Card, SectionTitle } from '../components/ui';
import { colors, radius, spacing, shadow, type as typeScale } from '../theme';
import { money, moneyMap, addToMoneyMap, shortDate, greeting, todayLabel } from '../lib/format';
import { getInvoice, getInvoiceStatus, getPaymentSummary, hasInvoice, invoiceSymbol } from '../lib/invoice';
import type { Shipment } from '../lib/shipment';

interface Payment {
  id: string;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  payment_status: string | null;
  reconciled_at: string | null;
  created_at: string;
}

const COLLECTED = ['completed', 'paid', 'success', 'succeeded'];
const methodLabel: Record<string, string> = {
  standard: 'Card / Bank',
  cashOnCollection: 'Cash on Collection',
  payOnArrival: 'Pay on Arrival',
  agentQuote: 'Agent Quote',
};

const DAY = 864e5;
function startOfDay(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + offset * DAY;
}

function sumBetween(payments: Payment[], from: number, to: number) {
  return payments
    .filter((p) => { const t = new Date(p.created_at).getTime(); return t >= from && t < to; })
    .reduce((map, p) => addToMoneyMap(map, p.amount, p.currency), {} as Record<string, number>);
}

function magnitude(map: Record<string, number>) {
  return Object.values(map).reduce((s, v) => s + v, 0);
}

function FinanceMetric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'blue' }) {
  const palette = tone === 'green'
    ? { bg: colors.primarySoft, fg: colors.primaryDark }
    : tone === 'red'
      ? { bg: colors.redSoft, fg: colors.danger }
      : { bg: colors.blueSoft, fg: colors.blue };
  return (
    <View style={[styles.metricCard, { backgroundColor: palette.bg }]}>
      <Text style={[styles.metricLabel, { color: palette.fg }]}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function SummaryRow({ icon, label, value, detail, tone }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      </View>
      <Text style={[styles.summaryDetail, { color: tone }]}>{detail}</Text>
    </View>
  );
}

export default function FinanceDashboardScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pendingProofs, setPendingProofs] = useState(0);
  const [expenses, setExpenses] = useState<Array<{ amount: number; currency: string; expense_date: string; category: string | null }>>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [paymentResult, shipmentResult, proofResult, expenseResult] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, currency, payment_method, payment_status, reconciled_at, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('shipments')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('payment_proofs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('finance_expenses').select('amount, currency, expense_date, category').limit(500),
      ]);
      if (paymentResult.error) throw paymentResult.error;
      setPayments((paymentResult.data as Payment[]) || []);
      setShipments(shipmentResult.error ? [] : ((shipmentResult.data as Shipment[]) || []));
      setPendingProofs(proofResult.count || 0);
      setExpenses(expenseResult.error ? [] : ((expenseResult.data as any[]) || []).map((e) => ({
        amount: Number(e.amount) || 0, currency: e.currency || 'GBP', expense_date: e.expense_date, category: e.category,
      })));
    } catch (e: any) {
      console.error('Finance load failed:', e);
      setError(e?.message || 'Failed to load finance data');
    }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  // Unpaid invoices past their due date, oldest debt first — the chase list.
  const overdue = useMemo(() => {
    const now = Date.now();
    return shipments
      .filter((s) => hasInvoice(s) && getInvoiceStatus(getInvoice(s)) === 'overdue')
      .map((s) => {
        const invoice = getInvoice(s);
        const { balance } = getPaymentSummary(invoice);
        const sender = (s.metadata as any)?.sender || {};
        const dueTime = invoice.dueDate ? new Date(invoice.dueDate).getTime() : now;
        return {
          id: s.id,
          name: sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Customer',
          phone: String(sender.phone || (s.metadata as any)?.whatsappNumber || ''),
          reference: (s as any).customer_reference || s.tracking_number || '—',
          balance,
          symbol: invoiceSymbol(invoice.currency),
          daysOverdue: Math.max(1, Math.round((now - dueTime) / DAY)),
        };
      })
      .filter((item) => item.balance > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [shipments]);

  const remind = (item: { name: string; phone: string; reference: string; balance: number; symbol: string }) => {
    const digits = item.phone.replace(/[^\d+]/g, '').replace(/^00/, '+');
    const message = encodeURIComponent(
      `Hello ${item.name.split(' ')[0]}, this is Zimbabwe Shipping. A friendly reminder that ${item.symbol}${item.balance.toFixed(2)} is outstanding on shipment ${item.reference}. Please reply here or call us on +44 7584 100552 to arrange payment. Thank you!`,
    );
    Linking.openURL(`https://wa.me/${digits.replace('+', '')}?text=${message}`).catch(() => {});
  };

  // All totals are per-currency: adding GBP and EUR together produces a
  // number that means nothing to finance.
  const stats = useMemo(() => {
    const total: Record<string, number> = {};
    const collected: Record<string, number> = {};
    const outstanding: Record<string, number> = {};
    let outstandingCount = 0;
    let unreconciled = 0;
    for (const p of payments) {
      addToMoneyMap(total, p.amount, p.currency);
      if (COLLECTED.includes((p.payment_status || '').toLowerCase())) addToMoneyMap(collected, p.amount, p.currency);
      else { addToMoneyMap(outstanding, p.amount, p.currency); outstandingCount += 1; }
      if (!p.reconciled_at) unreconciled += 1;
    }
    const collectedPct = magnitude(total) > 0 ? Math.round((magnitude(collected) / magnitude(total)) * 100) : 0;
    return { total, collected, outstanding, outstandingCount, unreconciled, collectedPct };
  }, [payments]);

  // Time slices for the hero + timeline.
  const timeline = useMemo(() => {
    const now = new Date();
    const startOfWeek = startOfDay(-((now.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const today = sumBetween(payments, startOfDay(0), startOfDay(1));
    const yesterday = sumBetween(payments, startOfDay(-1), startOfDay(0));
    const todayMag = magnitude(today);
    const yesterdayMag = magnitude(yesterday);
    const deltaPct = yesterdayMag > 0 ? Math.round(((todayMag - yesterdayMag) / yesterdayMag) * 100) : null;
    return {
      today, yesterday, deltaPct,
      week: sumBetween(payments, startOfWeek, startOfDay(1)),
      month: sumBetween(payments, startOfMonth, startOfDay(1)),
      year: sumBetween(payments, startOfYear, startOfDay(1)),
    };
  }, [payments]);

  // Last 7 days for the mini bar chart.
  const week = useMemo(() => {
    const days = [] as Array<{ label: string; value: number }>;
    for (let i = 6; i >= 0; i -= 1) {
      const from = startOfDay(-i);
      days.push({
        label: new Date(from).toLocaleDateString(undefined, { weekday: 'narrow' }),
        value: magnitude(sumBetween(payments, from, from + DAY)),
      });
    }
    const max = Math.max(1, ...days.map((d) => d.value));
    return { days, max };
  }, [payments]);

  const expenseStats = useMemo(() => {
    const total: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const thisWeekStart = startOfDay(-6);
    let thisWeek = 0;
    let allWeeksTotal = 0;
    let earliest = Date.now();
    for (const e of expenses) {
      addToMoneyMap(total, e.amount, e.currency);
      byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + e.amount;
      const t = new Date(e.expense_date).getTime();
      if (Number.isFinite(t)) { earliest = Math.min(earliest, t); allWeeksTotal += e.amount; if (t >= thisWeekStart) thisWeek += e.amount; }
    }
    const weeks = Math.max(1, Math.round((Date.now() - earliest) / (7 * DAY)));
    const weeklyAverage = allWeeksTotal / weeks;
    return { total, byCategory, thisWeek, weeklyAverage };
  }, [expenses]);

  const cashPosition = useMemo(() => {
    const position = { ...stats.collected };
    Object.entries(expenseStats.total).forEach(([currency, amount]) => {
      position[currency] = (position[currency] || 0) - amount;
    });
    return position;
  }, [stats.collected, expenseStats.total]);

  // Zimmy tells the story instead of raw alerts.
  const insights = useMemo(() => {
    const items: string[] = [];
    if (overdue.length) {
      const atRisk = overdue.reduce((s, o) => s + o.balance, 0);
      items.push(`${overdue.length} invoice${overdue.length > 1 ? 's are' : ' is'} overdue — about ${money(atRisk)} at risk. ${overdue[0].name} owes the most (${money(overdue[0].balance, overdue[0].symbol)}, ${overdue[0].daysOverdue} days).`);
    }
    if (pendingProofs) items.push(`${pendingProofs} customer payment proof${pendingProofs > 1 ? 's are' : ' is'} waiting for verification in Payments.`);
    if (stats.unreconciled) items.push(`${stats.unreconciled} payment${stats.unreconciled > 1 ? 's' : ''} still need${stats.unreconciled > 1 ? '' : 's'} reconciliation.`);
    if (expenseStats.thisWeek > expenseStats.weeklyAverage * 1.2 && expenseStats.weeklyAverage > 0) {
      items.push(`Expenses this week (${money(expenseStats.thisWeek)}) are ${Math.round(((expenseStats.thisWeek - expenseStats.weeklyAverage) / expenseStats.weeklyAverage) * 100)}% above your weekly average.`);
    }
    if (timeline.deltaPct !== null && timeline.deltaPct > 0) items.push(`Revenue is up ${timeline.deltaPct}% on yesterday — keep it going.`);
    if (!items.length) items.push('Everything looks healthy. No overdue invoices, nothing waiting for review.');
    return items;
  }, [overdue, pendingProofs, stats.unreconciled, expenseStats, timeline.deltaPct]);

  const byMethod = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    const mag: Record<string, number> = {};
    let all = 0;
    for (const p of payments) {
      const key = p.payment_method || 'other';
      m[key] = addToMoneyMap(m[key] || {}, p.amount, p.currency);
      mag[key] = (mag[key] || 0) + (Number(p.amount) || 0);
      all += Number(p.amount) || 0;
    }
    return Object.entries(m)
      .sort((a, b) => (mag[b[0]] || 0) - (mag[a[0]] || 0))
      .map(([k, v]) => ({ key: k, label: methodLabel[k] || k, value: v, pct: all > 0 ? (mag[k] || 0) / all : 0 }));
  }, [payments]);

  const recent = useMemo(() => payments.slice(0, 6), [payments]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View>
          <Text style={styles.title}>Finance Overview</Text>
          <Text style={styles.date}>{todayLabel()} · {greeting().toLowerCase()}</Text>
        </View>

        {error ? <Card><Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text></Card> : null}

        <Card style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>NET POSITION</Text>
              <Text style={styles.heroValue}>{moneyMap(cashPosition)}</Text>
              {timeline.deltaPct !== null && (
                <View style={styles.trendRow}>
                  <Ionicons name={timeline.deltaPct >= 0 ? 'trending-up' : 'trending-down'} size={14} color={colors.white} />
                  <Text style={[styles.trendText, { color: colors.white }]}>
                    {timeline.deltaPct >= 0 ? '+' : ''}{timeline.deltaPct}% vs yesterday
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.heroSparkline}>
              {week.days.map((day, index) => (
                <View
                  key={`${day.label}-${index}`}
                  style={[styles.heroSparkBar, { height: `${Math.max(18, (day.value / week.max) * 100)}%` }]}
                />
              ))}
            </View>
          </View>
        </Card>

        <View style={styles.metricRow}>
          <FinanceMetric label="Incoming" value={moneyMap(stats.collected)} tone="green" />
          <FinanceMetric label="Outgoing" value={moneyMap(expenseStats.total)} tone="red" />
          <FinanceMetric label="Net cash flow" value={moneyMap(cashPosition)} tone="blue" />
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <SectionTitle>Financial summary</SectionTitle>
            <Text style={styles.periodLabel}>This month</Text>
          </View>
          <Card style={styles.summaryCard}>
            <SummaryRow icon="receipt-outline" label="Total billed" value={moneyMap(stats.total)} detail={`${payments.length} payments`} tone={colors.primary} />
            <SummaryRow icon="checkmark-circle-outline" label="Collected" value={moneyMap(stats.collected)} detail={`${stats.collectedPct}%`} tone={colors.primary} />
            <SummaryRow icon="alert-circle-outline" label="Outstanding" value={moneyMap(stats.outstanding)} detail={`${stats.outstandingCount} due`} tone={colors.danger} />
            <SummaryRow icon="wallet-outline" label="Expenses" value={moneyMap(expenseStats.total)} detail={`${stats.unreconciled} unreconciled`} tone={colors.textMuted} />
          </Card>
        </View>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('Reports')}><Ionicons name="bar-chart-outline" size={19} color={colors.primary} /><Text style={styles.quickText}>Reports</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('CashFlow')}><Ionicons name="trending-up-outline" size={19} color={colors.primary} /><Text style={styles.quickText}>Cash Flow</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.navigate('Zimmy')}><Ionicons name="sparkles-outline" size={19} color={colors.purple} /><Text style={styles.quickText}>Zimmy AI</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={() => navigation.getParent()?.navigate('Payments', { screen: 'Reconciliation' })}><Ionicons name="git-compare-outline" size={19} color={colors.orange} /><Text style={styles.quickText}>Reconcile</Text></Pressable>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <SectionTitle>Cash flow trend</SectionTitle>
            <Text style={styles.periodLabel}>This week</Text>
          </View>
          <Card>
            <View style={styles.chart}>
              {week.days.map((d, i) => (
                <View key={i} style={styles.chartCol}>
                  <View style={styles.chartBarTrack}>
                    <View style={[styles.chartBar, { height: `${Math.max(4, (d.value / week.max) * 100)}%` }, i === 6 && { backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.chartLabel, i === 6 && { color: colors.primaryDark, fontWeight: '800' }]}>{d.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <Card style={styles.zimmyCard}>
          <View style={styles.zimmyHeader}>
            <View style={styles.zimmyBadge}><Ionicons name="sparkles" size={14} color={colors.white} /></View>
            <Text style={styles.zimmyTitle}>Zimmy · today’s insights</Text>
          </View>
          {insights.map((line, i) => (
            <View key={i} style={styles.zimmyLine}>
              <View style={styles.zimmyDot} />
              <Text style={styles.zimmyText}>{line}</Text>
            </View>
          ))}
        </Card>

        {overdue.length > 0 && (
          <View>
            <SectionTitle>Overdue invoices — chase list</SectionTitle>
            <Card style={{ padding: 0 }}>
              {overdue.slice(0, 10).map((item, i) => (
                <View key={item.id} style={[styles.row, i < Math.min(overdue.length, 10) - 1 && styles.rowDivider]}>
                  <View style={[styles.urgencyDot, { backgroundColor: item.daysOverdue > 7 ? colors.danger : item.daysOverdue > 3 ? colors.orange : colors.amber }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amount}>{money(item.balance, item.symbol)} · {item.name}</Text>
                    <Text style={styles.method}>{item.reference} · {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'} overdue</Text>
                  </View>
                  {item.phone ? (
                    <Pressable style={styles.chaseButton} onPress={() => remind(item)}>
                      <Text style={styles.chaseText}>Remind</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        )}

        <View>
          <SectionTitle>Revenue sources</SectionTitle>
          <Card>
            {byMethod.length === 0 ? (
              <Text style={styles.emptyText}>No payments yet</Text>
            ) : (
              byMethod.map((m) => (
                <View key={m.key} style={styles.barRow}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>{m.label}</Text>
                    <Text style={styles.barValue}>{Math.round(m.pct * 100)}% · {moneyMap(m.value)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(3, m.pct * 100)}%` }]} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        <View>
          <SectionTitle>Recent payments</SectionTitle>
          <Card style={{ padding: 0 }}>
            {recent.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No payments yet</Text></View>
            ) : (
              recent.map((p, i) => {
                const collected = COLLECTED.includes((p.payment_status || '').toLowerCase());
                return (
                  <View key={p.id} style={[styles.row, i < recent.length - 1 && styles.rowDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.amount}>{money(Number(p.amount) || 0, p.currency === 'EUR' ? '€' : '£')}</Text>
                      <Text style={styles.method}>{methodLabel[p.payment_method || ''] || p.payment_method || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.pill, { backgroundColor: collected ? colors.primarySoft : colors.orangeSoft }]}>
                        <Text style={[styles.pillText, { color: collected ? colors.primaryDark : colors.orange }]}>
                          {collected ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                      <Text style={styles.rowDate}>{shortDate(p.created_at)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: 18, paddingBottom: 48 },
  title: { fontSize: typeScale.heading, fontWeight: '800', color: colors.text },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  hero: { backgroundColor: colors.primary, paddingVertical: 18, minHeight: 116 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroKicker: { fontSize: 10.5, fontWeight: '800', color: '#D1FAE5', letterSpacing: 0.8 },
  heroValue: { fontSize: 32, fontWeight: '800', color: colors.white, marginTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12.5, fontWeight: '700' },
  healthRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: '#A7F3D0', backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  healthValue: { fontSize: 18, fontWeight: '800', color: colors.white },
  healthLabel: { fontSize: 9, color: '#D1FAE5', fontWeight: '700', textTransform: 'uppercase' },
  heroSparkline: { width: 104, height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 5, opacity: 0.9 },
  heroSparkBar: { flex: 1, minHeight: 8, borderRadius: 4, backgroundColor: '#A7F3D0' },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricCard: { flex: 1, minWidth: 0, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 12 },
  metricLabel: { fontSize: 9.5, fontWeight: '700' },
  metricValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  periodLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
  summaryCard: { padding: 0, overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 66, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  summaryIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 14.5, color: colors.text, fontWeight: '800', marginTop: 2 },
  summaryDetail: { fontSize: 11, fontWeight: '800', textAlign: 'right' },
  quickRow: { flexDirection: 'row', gap: 7 }, quickAction: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, ...shadow }, quickText: { fontSize: 9.5, color: colors.text, fontWeight: '800', textAlign: 'center' },
  zimmyCard: { backgroundColor: colors.purpleSoft, gap: spacing.sm },
  zimmyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zimmyBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  zimmyTitle: { fontSize: 13, fontWeight: '800', color: colors.purple },
  zimmyLine: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  zimmyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.purple, marginTop: 7 },
  zimmyText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  chart: { flexDirection: 'row', height: 132, gap: spacing.sm, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', gap: 5, height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: '#a7d9c3' },
  chartLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  urgencyDot: { width: 9, height: 9, borderRadius: 5 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  method: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },
  rowDate: { fontSize: 11, color: colors.textFaint },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, padding: spacing.md },
  barRow: { marginBottom: spacing.md },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  barValue: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: '#eef1f4', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  chaseButton: { backgroundColor: '#25D366', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  chaseText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
