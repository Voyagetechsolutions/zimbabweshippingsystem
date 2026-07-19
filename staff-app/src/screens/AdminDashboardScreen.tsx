import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card, SectionTitle, StatusBadge, CountryChips } from '../components/ui';
import { colors, radius, spacing, shadow, type as typeScale } from '../theme';
import {
  money, moneyMap, addToMoneyMap, shortDate, greeting, todayLabel, matchesCountry, customerName, type CountryFilter,
} from '../lib/format';

interface Shipment {
  id: string;
  tracking_number: string | null;
  customer_reference?: string | null;
  status: string | null;
  created_at: string;
  metadata: any;
}

// One search box that answers "where is...?" — matches name, phone, tracking
// number, customer reference/code, city or destination.
function matchesQuery(shipment: Shipment, needle: string): boolean {
  const meta = shipment.metadata || {};
  const sender = meta.sender || meta.senderDetails || {};
  const recipient = meta.recipient || meta.recipientDetails || {};
  const haystack = [
    shipment.tracking_number, shipment.customer_reference, meta.customerReference,
    sender.name, `${sender.firstName || ''} ${sender.lastName || ''}`, sender.phone, sender.email, sender.city, sender.postalCode,
    recipient.name, recipient.phone, recipient.city, recipient.address,
  ].map((value) => String(value || '').toLowerCase()).join(' | ');
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

const PENDING = ['Booking Confirmed', 'Ready for Pickup', 'pending'];
const ACTIVE = ['Processing in UK Warehouse', 'Customs Clearance', 'Processing in ZW Warehouse', 'Out for Delivery'];

const EVENT_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  driver_en_route: { label: 'Driver en route', icon: 'car', color: colors.blue },
  driver_arrived: { label: 'Driver arrived', icon: 'location', color: colors.orange },
  driver_stop_failed: { label: 'Stop failed', icon: 'alert-circle', color: colors.danger },
  collection_scan: { label: 'Collection scanned', icon: 'qr-code', color: colors.primary },
  status_change: { label: 'Status updated', icon: 'swap-horizontal', color: colors.purple },
};

function todayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function AttentionRow({ count, title, description, icon, tone, onPress }: {
  count: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.attentionRow} onPress={onPress} disabled={!onPress}>
      <View style={[styles.attentionIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.attentionTitle}>{count} {title}</Text>
        <Text style={styles.attentionDescription} numberOfLines={1}>{description}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryFilter>('all');
  const [query, setQuery] = useState('');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [revenueToday, setRevenueToday] = useState<Record<string, number>>({});
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [quoteValue, setQuoteValue] = useState(0);
  const [runsToday, setRunsToday] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [attention, setAttention] = useState({ requests: 0, flaggedReviews: 0, failedStops: 0, pendingProofs: 0, pendingExpenses: 0, unreconciled: 0 });

  const load = useCallback(async () => {
    setError(null);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const [ship, pay, quotes, requests, reviews, failedStops, proofs, expenses, runs, eventRows] = await Promise.all([
        supabase.from('shipments').select('id, tracking_number, customer_reference, status, created_at, metadata').order('created_at', { ascending: false }),
        supabase.from('payments').select('amount, currency, created_at, reconciled_at'),
        supabase.from('custom_quotes').select('id, quoted_amount').eq('status', 'pending'),
        supabase.from('customer_requests').select('id', { count: 'exact', head: true }).eq('status', 'New'),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
        supabase.from('driver_run_stops').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', startOfToday.toISOString()),
        supabase.from('payment_proofs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('finance_expenses').select('id', { count: 'exact', head: true }).in('status', ['recorded', 'draft']),
        supabase.from('driver_runs').select('id', { count: 'exact', head: true }).eq('run_date', todayIso()),
        supabase.from('shipment_events').select('event_type, new_status, created_at, details').order('created_at', { ascending: false }).limit(6),
      ]);
      if (ship.error) throw ship.error;
      setShipments((ship.data as Shipment[]) || []);
      const payments = (pay.data || []) as any[];
      setRevenue(payments.reduce((map: Record<string, number>, p: any) => addToMoneyMap(map, p.amount, p.currency), {}));
      setRevenueToday(payments
        .filter((p) => new Date(p.created_at).getTime() >= startOfToday.getTime())
        .reduce((map: Record<string, number>, p: any) => addToMoneyMap(map, p.amount, p.currency), {}));
      setPendingQuotes(quotes.data?.length || 0);
      setQuoteValue((quotes.data || []).reduce((sum: number, q: any) => sum + (Number(q.quoted_amount) || 0), 0));
      setRunsToday(runs.count || 0);
      setEvents(eventRows.error ? [] : (eventRows.data || []));
      setAttention({
        requests: requests.count || 0,
        flaggedReviews: reviews.count || 0,
        failedStops: failedStops.count || 0,
        pendingProofs: proofs.count || 0,
        pendingExpenses: expenses.count || 0,
        unreconciled: payments.filter((p) => !p.reconciled_at).length,
      });
    } catch (e: any) {
      console.error('Dashboard load failed:', e);
      setError(e?.message || 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => shipments.filter((s) => matchesCountry(s.metadata, country)), [shipments, country]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return shipments.filter((s) => matchesQuery(s, needle)).slice(0, 8);
  }, [shipments, query]);

  const openShipment = (shipment: Shipment) => {
    setQuery('');
    navigation.navigate('Shipments', { screen: 'ShipmentDetail', params: { shipment } });
  };

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((s) => s.status && PENDING.includes(s.status)).length,
    active: filtered.filter((s) => s.status && ACTIVE.includes(s.status)).length,
    outForDelivery: filtered.filter((s) => s.status === 'Out for Delivery').length,
    delivered: filtered.filter((s) => s.status === 'Delivered').length,
  }), [filtered]);

  // Operations score: start at 100 and lose points for things needing humans.
  const opsScore = useMemo(() => {
    const penalty = attention.failedStops * 8 + attention.requests * 3 + attention.pendingProofs * 2 +
      attention.flaggedReviews * 2 + Math.min(20, stats.pending);
    return Math.max(40, 100 - penalty);
  }, [attention, stats.pending]);

  const recent = useMemo(() => filtered.slice(0, 6), [filtered]);

  const quickActions = [
    { icon: 'add-circle' as const, label: 'Booking', onPress: () => navigation.navigate('Menu', { screen: 'ManualBooking' }) },
    { icon: 'cube' as const, label: 'Shipments', onPress: () => navigation.navigate('Shipments') },
    { icon: 'car' as const, label: 'Driver Run', onPress: () => navigation.navigate('Runs') },
    { icon: 'person' as const, label: 'Customer', onPress: () => navigation.navigate('Menu', { screen: 'Customers' }) },
    { icon: 'cash' as const, label: 'Payment', onPress: () => navigation.navigate('Menu', { screen: 'Payments' }) },
  ];

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
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.operatorName}>{profile?.full_name || 'Admin'}</Text>
            <Text style={styles.date}>{todayLabel()}</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="person-outline" size={19} color={colors.primaryDark} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, phone, tracking, reference…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {query.trim().length >= 2 && (
          <Card style={{ padding: 0 }}>
            {searchResults.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No matches for “{query.trim()}”</Text></View>
            ) : searchResults.map((s, i) => (
              <Pressable key={s.id} style={[styles.row, i < searchResults.length - 1 && styles.rowDivider]} onPress={() => openShipment(s)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tracking}>{s.customer_reference || s.tracking_number || '—'}</Text>
                  <Text style={styles.customer} numberOfLines={1}>{customerName(s.metadata)}</Text>
                </View>
                <StatusBadge status={s.status} />
              </Pressable>
            ))}
          </Card>
        )}

        {error ? (
          <Card><Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text></Card>
        ) : null}

        <Card style={styles.scoreCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreKicker}>OPERATIONS SCORE</Text>
            <Text style={styles.scoreValue}>{opsScore}%</Text>
            <Text style={styles.scoreText}>
              {opsScore >= 90 ? 'Everything running smoothly' : opsScore >= 70 ? 'A few items need your attention' : 'Operations need attention now'}
            </Text>
          </View>
          <View style={styles.scoreRing}>
            <Ionicons name={opsScore >= 90 ? 'flame' : opsScore >= 70 ? 'pulse' : 'warning'} size={26} color={colors.white} />
          </View>
        </Card>

        <View>
          <SectionTitle>Today’s activity</SectionTitle>
          <View style={styles.activityGrid}>
            {[
              { value: stats.pending, label: 'Pickups queued', color: colors.orange },
              { value: stats.outForDelivery, label: 'Out for delivery', color: colors.cyan },
              { value: runsToday, label: 'Driver runs', color: colors.blue },
              { value: attention.pendingProofs + attention.unreconciled, label: 'Payments waiting', color: colors.purple },
            ].map((item) => (
              <Card key={item.label} style={styles.activityCard}>
                <Text style={[styles.activityValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.activityLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        <View>
          <SectionTitle>Needs attention</SectionTitle>
          <View style={styles.stack}>
            {attention.failedStops > 0 && (
              <AttentionRow count={attention.failedStops} title="failed stops" description="Replan today's exceptions" icon="alert-circle" tone={colors.danger} onPress={() => navigation.navigate('Runs')} />
            )}
            {attention.requests > 0 && (
              <AttentionRow count={attention.requests} title="new leads" description="Customers waiting for a response" icon="person-add" tone={colors.orange} />
            )}
            {stats.pending > 0 && (
              <AttentionRow count={stats.pending} title="pending collections" description="Shipments waiting to be picked up" icon="cube" tone={colors.blue} onPress={() => navigation.navigate('Runs')} />
            )}
            {pendingQuotes > 0 && (
              <AttentionRow count={pendingQuotes} title="quote requests" description={quoteValue > 0 ? `Potential revenue ${money(quoteValue)}` : 'Awaiting your response'} icon="pricetag" tone={colors.purple} onPress={() => navigation.navigate('Menu', { screen: 'CustomQuotes' })} />
            )}
            {attention.pendingProofs > 0 && (
              <AttentionRow count={attention.pendingProofs} title="payment proofs" description="Uploaded by customers for verification" icon="receipt" tone={colors.primary} onPress={() => navigation.navigate('Menu', { screen: 'Payments' })} />
            )}
            {attention.flaggedReviews > 0 && (
              <AttentionRow count={attention.flaggedReviews} title="flagged reviews" description="Held for an admin decision" icon="star-half" tone={colors.gold} />
            )}
            {!attention.failedStops && !attention.requests && !stats.pending && !pendingQuotes && !attention.pendingProofs && !attention.flaggedReviews ? (
              <AttentionRow count={0} title="items need attention" description="Everything is running smoothly" icon="checkmark-circle" tone={colors.primary} />
            ) : null}
          </View>
        </View>

        <Card style={styles.revenueCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.revenueKicker}>REVENUE TODAY</Text>
            <Text style={styles.revenueValue}>{moneyMap(revenueToday)}</Text>
            <Text style={styles.revenueTotal}>All time {moneyMap(revenue)}</Text>
          </View>
          <View style={styles.revenueIcon}><Ionicons name="trending-up" size={22} color={colors.primary} /></View>
        </Card>

        <View>
          <SectionTitle>Quick actions</SectionTitle>
          <View style={styles.quickRow}>
            {quickActions.map((action) => (
              <Pressable key={action.label} style={styles.quickItem} onPress={action.onPress}>
                <View style={styles.quickIcon}><Ionicons name={action.icon} size={21} color={colors.primary} /></View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {events.length > 0 && (
          <View>
            <SectionTitle>Live activity</SectionTitle>
            <Card style={{ padding: 0 }}>
              {events.map((event, i) => {
                const meta = EVENT_LABELS[event.event_type] || { label: event.new_status || event.event_type, icon: 'ellipse' as const, color: colors.textMuted };
                return (
                  <View key={`${event.created_at}-${i}`} style={[styles.row, i < events.length - 1 && styles.rowDivider]}>
                    <View style={[styles.eventDot, { backgroundColor: `${meta.color}18` }]}>
                      <Ionicons name={meta.icon} size={14} color={meta.color} />
                    </View>
                    <Text style={styles.eventLabel}>{meta.label}</Text>
                    <Text style={styles.rowDate}>{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        <View>
          <View style={styles.recentHeader}>
            <SectionTitle>Recent shipments</SectionTitle>
            <CountryChips value={country} onChange={setCountry} />
          </View>
          <Card style={{ padding: 0 }}>
            {recent.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyText}>No shipments yet</Text></View>
            ) : (
              recent.map((s, i) => (
                <Pressable key={s.id} style={[styles.row, i < recent.length - 1 && styles.rowDivider]} onPress={() => openShipment(s)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tracking}>{s.customer_reference || s.tracking_number || '—'}</Text>
                    <Text style={styles.customer} numberOfLines={1}>{customerName(s.metadata)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge status={s.status} />
                    <Text style={styles.rowDate}>{shortDate(s.created_at)}</Text>
                  </View>
                </Pressable>
              ))
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 96 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  greeting: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  operatorName: { fontSize: typeScale.heading, fontWeight: '800', color: colors.text, marginTop: 1 },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, ...shadow },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: colors.text },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary, paddingVertical: 18 },
  scoreKicker: { fontSize: 10.5, fontWeight: '800', color: '#D1FAE5', letterSpacing: 0.8 },
  scoreValue: { fontSize: 36, fontWeight: '800', color: colors.white, marginVertical: 1 },
  scoreText: { fontSize: 12.5, color: '#D1FAE5' },
  scoreRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 6, borderColor: '#A7F3D0', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  activityGrid: { flexDirection: 'row', gap: 6 },
  activityCard: { flex: 1, paddingHorizontal: 5, paddingVertical: 12, alignItems: 'center' },
  activityValue: { fontSize: 20, fontWeight: '800' },
  activityLabel: { fontSize: 9.5, color: colors.textMuted, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  stack: { gap: 0, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadow },
  attentionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  attentionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  attentionDescription: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  revenueCard: { flexDirection: 'row', alignItems: 'center' },
  revenueKicker: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },
  revenueValue: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 3 },
  revenueTotal: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  revenueIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickItem: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, ...shadow },
  quickIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700', color: colors.text },
  eventDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tracking: { fontSize: 13.5, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  customer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDate: { fontSize: 11, color: colors.textFaint },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
