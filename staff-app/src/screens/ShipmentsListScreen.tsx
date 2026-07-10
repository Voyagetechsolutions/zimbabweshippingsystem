import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import {
  Shipment, STATUS_OPTIONS, statusStyle, senderName, senderPhone, receiverName, receiverPhone,
  customerRef, senderEmail,
} from '../lib/shipment';
import type { ShipmentsStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<ShipmentsStackParams, 'ShipmentsList'>;

const IN_TRANSIT = ['in transit', 'intransit', 'ontransit', 'zim warehouse', 'out for delivery'];

export default function ShipmentsListScreen({ navigation }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

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
      const matchesStatus = status === 'all' || s.status?.toLowerCase() === status.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [shipments, query, status]);

  const stats = useMemo(() => ({
    total: shipments.length,
    transit: shipments.filter((s) => IN_TRANSIT.some((t) => s.status?.toLowerCase().includes(t))).length,
    delivered: shipments.filter((s) => s.status === 'Delivered').length,
    cancelled: shipments.filter((s) => s.status === 'Cancelled').length,
  }), [shipments]);

  const renderItem = ({ item }: { item: Shipment }) => {
    const st = statusStyle(item.status);
    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('ShipmentDetail', { shipment: item })}>
        <View style={styles.cardTop}>
          <Text style={styles.ref}>{customerRef(item)}</Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.fg }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.tracking}>{item.tracking_number || '—'}</Text>
        <View style={styles.people}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pLabel}>Sender</Text>
            <Text style={styles.pName} numberOfLines={1}>{senderName(item)}</Text>
            <Text style={styles.pSub} numberOfLines={1}>{senderPhone(item)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pLabel}>Receiver</Text>
            <Text style={styles.pName} numberOfLines={1}>{receiverName(item)}</Text>
            <Text style={styles.pSub} numberOfLines={1}>{receiverPhone(item)}</Text>
          </View>
        </View>
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
          {['all', ...STATUS_OPTIONS].map((s) => {
            const active = status.toLowerCase() === s.toLowerCase();
            return (
              <Pressable key={s} onPress={() => setStatus(s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s === 'all' ? 'All' : s}</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
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
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 6 },
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
