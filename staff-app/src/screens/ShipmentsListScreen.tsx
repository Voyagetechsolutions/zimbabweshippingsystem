import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, shadow, type as typeScale, stageTone } from '../theme';
import { StageDots } from '../components/ui';
import {
  Shipment, senderName, senderPhone, receiverName, receiverPhone,
  customerRef, senderEmail,
} from '../lib/shipment';
import { getInvoice, getInvoiceStatus, hasInvoice, invoiceSymbol, calculateTotals } from '../lib/invoice';
import type { ShipmentsStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<ShipmentsStackParams, 'ShipmentsList'>;

const IN_TRANSIT = ['in transit', 'intransit', 'ontransit', 'zim warehouse', 'out for delivery'];

// Time-and-stage chips instead of raw status values.
const FILTERS = ['All', 'Today', 'This Week', 'Overdue', 'Ready', 'Transit', 'Delivered'];

function matchesFilter(s: Shipment, filter: string): boolean {
  const status = (s.status || '').toLowerCase();
  const created = new Date(s.created_at).getTime();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  switch (filter) {
    case 'Today': return created >= startOfToday.getTime();
    case 'This Week': return created >= startOfToday.getTime() - 6 * 864e5;
    case 'Overdue': return hasInvoice(s) && getInvoiceStatus(getInvoice(s)) === 'overdue';
    case 'Ready': return status.includes('confirm') || status.includes('ready') || status.includes('pending');
    case 'Transit': return IN_TRANSIT.some((t) => status.includes(t));
    case 'Delivered': return status === 'delivered';
    default: return true;
  }
}

export default function ShipmentsListScreen({ navigation }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (!error) setShipments((data as Shipment[]) || []);
  }, []);

  // Refetch whenever the screen regains focus (e.g. after updating a shipment).
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { setLoading(true); await load(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [load]));

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return shipments.filter((s) => {
      const matchesSearch = q === '' ||
        s.tracking_number?.toLowerCase().includes(q) ||
        customerRef(s).toLowerCase().includes(q) ||
        senderName(s).toLowerCase().includes(q) ||
        receiverName(s).toLowerCase().includes(q) ||
        senderPhone(s).toLowerCase().includes(q) ||
        senderEmail(s).toLowerCase().includes(q) ||
        s.origin?.toLowerCase().includes(q) ||
        s.destination?.toLowerCase().includes(q);
      return matchesSearch && matchesFilter(s, filter);
    });
  }, [shipments, query, filter]);

  const stats = useMemo(() => ({
    total: shipments.length,
    transit: shipments.filter((s) => IN_TRANSIT.some((t) => s.status?.toLowerCase().includes(t))).length,
    delivered: shipments.filter((s) => s.status === 'Delivered').length,
    cancelled: shipments.filter((s) => s.status === 'Cancelled').length,
  }), [shipments]);

  const renderItem = ({ item }: { item: Shipment }) => {
    const st = stageTone(item.status);
    const originCity = (item.metadata as any)?.sender?.city || (item.origin || '').split(':').pop()?.split(',')[0]?.trim() || '—';
    const destCity = (item.metadata as any)?.recipient?.city || (item.destination || '').split(',').pop()?.trim() || '—';
    const invoice = hasInvoice(item) ? getInvoice(item) : null;
    const invoiceStatus = invoice ? getInvoiceStatus(invoice) : null;
    const total = invoice ? calculateTotals(invoice).total : 0;
    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('ShipmentDetail', { shipment: item })}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ref}>{customerRef(item)}</Text>
            <Text style={styles.pName} numberOfLines={1}>{senderName(item)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.fg }]}>{item.status}</Text>
            </View>
            {invoice && total > 0 ? (
              <Text style={[styles.paid, { color: invoiceStatus === 'paid' ? colors.primaryDark : invoiceStatus === 'overdue' ? colors.danger : colors.textMuted }]}>
                {invoiceSymbol(invoice.currency)}{total.toFixed(0)} {invoiceStatus === 'paid' ? 'Paid' : invoiceStatus === 'overdue' ? 'Overdue' : 'Due'}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={13} color={colors.orange} />
          <Text style={styles.routeText} numberOfLines={1}>{originCity}</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{destCity}</Text>
          <Text style={styles.pSub} numberOfLines={1}> · {receiverName(item)}</Text>
        </View>
        <StageDots status={item.status} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Shipments</Text>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search ref, tracking, name, phone…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.statsRow}>
          <Stat label="Total" value={stats.total} />
          <Stat label="In transit" value={stats.transit} />
          <Stat label="Delivered" value={stats.delivered} />
          <Stat label="Cancelled" value={stats.cancelled} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>No shipments found</Text></View>}
          ListFooterComponent={<Text style={styles.footer}>Showing {filtered.length} of {shipments.length}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  title: { fontSize: typeScale.heading, fontWeight: '800', color: colors.text },
  searchWrap: {},
  search: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md,
    paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 6, ...shadow },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeText: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1 },
  paid: { fontSize: 12, fontWeight: '800' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 14, fontWeight: '700', color: colors.primary },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  tracking: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  people: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  pLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  pName: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },
  pSub: { fontSize: 12, color: colors.textMuted },
  center: { paddingVertical: 48, alignItems: 'center' },
  empty: { color: colors.textMuted, fontSize: 14 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingVertical: spacing.md },
});
