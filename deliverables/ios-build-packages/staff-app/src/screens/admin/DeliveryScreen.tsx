import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import {
  Shipment, statusStyle, customerRef, receiverName, receiverPhone, deliveryAddress, paymentAmount,
} from '../../lib/shipment';

// Delivery-phase statuses, ordered so the most actionable appear first.
const DELIVERY_STATUSES = ['Out for Delivery', 'Zim Warehouse', 'Delivered'];

export default function DeliveryScreen() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .is('deleted_at', null)
      .in('status', DELIVERY_STATUSES)
      .order('updated_at', { ascending: false });
    if (!error) setShipments((data as Shipment[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const sections = useMemo(() => {
    return DELIVERY_STATUSES
      .map((status) => ({ title: status, data: shipments.filter((s) => s.status === status) }))
      .filter((sec) => sec.data.length > 0);
  }, [shipments]);

  const active = shipments.filter((s) => s.status !== 'Delivered').length;

  const call = (phone: string) => {
    const digits = (phone || '').replace(/[^\d+]/g, '');
    if (digits) Linking.openURL(`tel:${digits}`);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SectionList
      style={styles.safe}
      sections={sections}
      keyExtractor={(s) => s.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>In delivery</Text>
          <Text style={styles.summaryValue}>{active}</Text>
          <Text style={styles.summaryCount}>{shipments.length} total in delivery phase</Text>
        </View>
      }
      renderSectionHeader={({ section }) => {
        const st = statusStyle(section.title);
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.countPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.countPillText, { color: st.fg }]}>{section.data.length}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>Nothing in the delivery phase right now</Text>}
      stickySectionHeadersEnabled={false}
      renderItem={({ item }) => {
        const st = statusStyle(item.status);
        const phone = receiverPhone(item);
        const hasPhone = phone && phone !== 'No Phone';
        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.ref}>{customerRef(item)}</Text>
                <View style={[styles.pill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.pillText, { color: st.fg }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.receiver}>{receiverName(item)}</Text>
              <Text style={styles.address} numberOfLines={2}>{deliveryAddress(item)}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.tracking}>{item.tracking_number || '—'}</Text>
                <Text style={styles.amount}>{paymentAmount(item)}</Text>
              </View>
            </View>
            {hasPhone ? (
              <Pressable style={styles.callBtn} onPress={() => call(phone)} hitSlop={8}>
                <Ionicons name="call" size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm },
  summary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 2 },
  summaryCount: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  countPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  countPillText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ref: { fontSize: 14, fontWeight: '700', color: colors.text },
  receiver: { fontSize: 13, color: colors.text, marginTop: 3 },
  address: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  tracking: { fontSize: 11, color: colors.textFaint },
  amount: { fontSize: 12, fontWeight: '600', color: colors.text },
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
});
