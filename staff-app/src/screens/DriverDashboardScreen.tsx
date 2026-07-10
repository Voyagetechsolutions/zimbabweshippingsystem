import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, Pressable, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import {
  Shipment, customerRef, senderName, senderPhone, pickupAddress,
  receiverName, receiverPhone, deliveryAddress, statusStyle,
} from '../lib/shipment';
import { greeting } from '../lib/format';

const COLLECTION_STATUSES = ['pending', 'confirmed'];
const DELIVERY_STATUSES = ['zim warehouse', 'out for delivery'];

type Job = { shipment: Shipment; kind: 'collection' | 'delivery' };

export default function DriverDashboardScreen() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (!error) setShipments((data as Shipment[]) || []);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { setLoading(true); await load(); if (active) setLoading(false); })();
    return () => { active = false; };
  }, [load]));

  const sections = useMemo(() => {
    const collections = shipments.filter((s) => COLLECTION_STATUSES.includes(s.status?.toLowerCase()));
    const deliveries = shipments.filter((s) => DELIVERY_STATUSES.includes(s.status?.toLowerCase()));
    return [
      { title: `Collections (${collections.length})`, kind: 'collection' as const, data: collections },
      { title: `Deliveries (${deliveries.length})`, kind: 'delivery' as const, data: deliveries },
    ];
  }, [shipments]);

  const advance = async (shipment: Shipment, kind: 'collection' | 'delivery') => {
    const next = kind === 'collection' ? 'Collected' : 'Delivered';
    Alert.alert(
      kind === 'collection' ? 'Mark as collected?' : 'Mark as delivered?',
      `${shipment.tracking_number} will be set to ${next}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            setBusyId(shipment.id);
            try {
              const { error } = await supabase.from('shipments')
                .update({ status: next, updated_at: new Date().toISOString() })
                .eq('id', shipment.id);
              if (error) throw error;
              try {
                const wa = shipment.metadata?.whatsappNumber;
                if (wa) await supabase.functions.invoke('notify-shipment-status', {
                  body: { phone_number: wa, tracking_number: shipment.tracking_number, status: next },
                });
              } catch { /* non-critical */ }
              setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, status: next } : s));
            } catch (e: any) {
              Alert.alert('Update failed', e?.message || 'Could not update');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const call = (phone: string) => {
    if (phone && phone !== 'No Phone') Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={false}
        ListHeaderComponent={
          <View style={styles.head}>
            <Text style={styles.greeting}>{greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
            <Text style={styles.sub}>Your runs for today</Text>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.group}>{section.title}</Text>}
        renderSectionFooter={({ section }) => section.data.length === 0 ? <Text style={styles.emptySection}>Nothing here right now</Text> : null}
        stickySectionHeadersEnabled={false}
        renderItem={({ item, section }) => {
          const kind = (section as any).kind as 'collection' | 'delivery';
          const name = kind === 'collection' ? senderName(item) : receiverName(item);
          const phone = kind === 'collection' ? senderPhone(item) : receiverPhone(item);
          const address = kind === 'collection' ? pickupAddress(item) : deliveryAddress(item);
          const st = statusStyle(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.ref}>{customerRef(item)}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}><Text style={[styles.badgeText, { color: st.fg }]}>{item.status}</Text></View>
              </View>
              <Text style={styles.name}>{name}</Text>
              <View style={styles.line}><Ionicons name="location-outline" size={14} color={colors.textMuted} /><Text style={styles.lineText}>{address}</Text></View>
              <Pressable style={styles.line} onPress={() => call(phone)}>
                <Ionicons name="call-outline" size={14} color={colors.primary} /><Text style={[styles.lineText, { color: colors.primary }]}>{phone}</Text>
              </Pressable>
              <Pressable
                style={[styles.action, busyId === item.id && { opacity: 0.6 }]}
                onPress={() => advance(item, kind)} disabled={busyId === item.id}
              >
                {busyId === item.id
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.actionText}>{kind === 'collection' ? 'Mark Collected' : 'Mark Delivered'}</Text>}
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: 48 },
  head: { marginBottom: spacing.sm },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  group: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptySection: { fontSize: 13, color: colors.textFaint, paddingVertical: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 13, fontWeight: '700', color: colors.primary },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineText: { fontSize: 13, color: colors.textMuted, flex: 1 },
  action: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  actionText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
