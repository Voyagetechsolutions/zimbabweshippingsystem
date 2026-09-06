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
  shortDate, greeting, todayLabel, matchesCountry, customerName, type CountryFilter,
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
const PAID_STATUSES = new Set(['completed', 'paid', 'success', 'succeeded']);

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

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryFilter>('all');
  const [query, setQuery] = useState('');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [runsToday, setRunsToday] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  // Only what "Today's activity" still needs. The scoring, the attention list
  // and the collected-today total were removed, and their queries with them.
  const [paymentsWaiting, setPaymentsWaiting] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [ship, pay, proofs, runs, eventRows] = await Promise.all([
        supabase.from('shipments').select('id, tracking_number, customer_reference, status, created_at, metadata').order('created_at', { ascending: false }),
        supabase.from('payments').select('amount, currency, payment_status, reconciled_at'),
        supabase.from('payment_proofs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('driver_runs').select('id', { count: 'exact', head: true }).eq('run_date', todayIso()),
        supabase.from('shipment_events').select('event_type, new_status, created_at, details').order('created_at', { ascending: false }).limit(6),
      ]);
      if (ship.error) throw ship.error;
      setShipments((ship.data as Shipment[]) || []);
      const unreconciled = ((pay.data || []) as any[])
        .filter((p) => PAID_STATUSES.has(String(p.payment_status || '').toLowerCase()))
        .filter((p) => !p.reconciled_at).length;
      setPaymentsWaiting((proofs.count || 0) + unreconciled);
      setRunsToday(runs.count || 0);
      setEvents(eventRows.error ? [] : (eventRows.data || []));
    } catch (e: any) {
      console.error('Dashboard load failed:', e);
      setError(e?.message || 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('staff-admin-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_proofs' }, load)
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
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
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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

        <View>
          <SectionTitle>Today’s activity</SectionTitle>
          <View style={styles.activityGrid}>
            {[
              { value: stats.pending, label: 'Pickups queued', color: colors.orange },
              { value: stats.outForDelivery, label: 'Out for delivery', color: colors.cyan },
              { value: runsToday, label: 'Driver runs', color: colors.blue },
              { value: paymentsWaiting, label: 'Payments waiting', color: colors.purple },
            ].map((item) => (
              <Card key={item.label} style={styles.activityCard}>
                <Text style={[styles.activityValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.activityLabel}>{item.label}</Text>
              </Card>
            ))}
          </View>
        </View>

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
  activityGrid: { flexDirection: 'row', gap: 6 },
  activityCard: { flex: 1, paddingHorizontal: 5, paddingVertical: 12, alignItems: 'center' },
  activityValue: { fontSize: 20, fontWeight: '800' },
  activityLabel: { fontSize: 9.5, color: colors.textMuted, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  stack: { gap: 0, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadow },
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
