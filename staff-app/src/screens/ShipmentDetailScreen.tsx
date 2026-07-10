import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import {
  Shipment, STATUS_OPTIONS, STATUS_STEPS, statusStyle, statusProgress, currentStepIndex,
  senderName, senderEmail, senderPhone, receiverName, receiverPhone, pickupAddress, deliveryAddress,
  collectionInfo, paymentAmount, shipmentType,
} from '../lib/shipment';
import type { ShipmentsStackParams } from '../navigation/types';

type Props = NativeStackScreenProps<ShipmentsStackParams, 'ShipmentDetail'>;

export default function ShipmentDetailScreen({ route, navigation }: Props) {
  const [shipment, setShipment] = useState<Shipment>(route.params.shipment);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(shipment.status);
  const [busy, setBusy] = useState(false);

  const st = statusStyle(shipment.status);
  const ci = collectionInfo(shipment);
  const terminal = shipment.status === 'Delivered' || shipment.status === 'Cancelled';

  const updateStatus = async () => {
    if (selected === shipment.status) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: selected, updated_at: new Date().toISOString() })
        .eq('id', shipment.id);
      if (error) throw error;

      // Fire the WhatsApp status notification (best-effort, same as the website).
      try {
        const whatsappNumber = shipment.metadata?.whatsappNumber;
        if (whatsappNumber) {
          await supabase.functions.invoke('notify-shipment-status', {
            body: { phone_number: whatsappNumber, tracking_number: shipment.tracking_number, status: selected },
          });
        }
      } catch (e) { /* non-critical */ }

      setShipment({ ...shipment, status: selected, updated_at: new Date().toISOString() });
      setEditing(false);
      Alert.alert('Status updated', `${shipment.tracking_number} → ${selected}`);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Could not update status');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete shipment',
      'This removes it from the dashboard. Data is preserved in the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            setBusy(true);
            const { error } = await supabase.from('shipments').update({ deleted_at: new Date().toISOString() }).eq('id', shipment.id);
            setBusy(false);
            if (error) { Alert.alert('Delete failed', error.message); return; }
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status + updated */}
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.fg }]}>{shipment.status}</Text>
          </View>
          <Text style={styles.updated}>Updated {new Date(shipment.updated_at).toLocaleDateString()}</Text>
        </View>

        {/* Progress */}
        <View style={styles.section}>
          <View style={styles.progressHead}>
            <Text style={styles.sectionLabel}>Progress</Text>
            <Text style={styles.sectionLabel}>{statusProgress(shipment.status)}%</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${statusProgress(shipment.status)}%` }]} /></View>
          <View style={styles.steps}>
            {STATUS_STEPS.map((step, i) => (
              <Text key={step} style={[styles.step, currentStepIndex(shipment.status) >= i && styles.stepDone]} numberOfLines={1}>
                {step}
              </Text>
            ))}
          </View>
        </View>

        {/* Sender / Receiver */}
        <View style={styles.twoCol}>
          <Card title="Sender">
            <Text style={styles.name}>{senderName(shipment)}</Text>
            <Line>{senderEmail(shipment)}</Line>
            <Line>{senderPhone(shipment)}</Line>
            <Line>{pickupAddress(shipment)}</Line>
          </Card>
          <Card title="Receiver">
            <Text style={styles.name}>{receiverName(shipment)}</Text>
            <Line>{receiverPhone(shipment)}</Line>
            <Line>{deliveryAddress(shipment)}</Line>
          </Card>
        </View>

        {/* Collection / Shipment info */}
        <View style={styles.twoCol}>
          <Card title="Collection">
            <Row k="Route" v={ci.route} />
            <Row k="Date" v={ci.date} />
            <Row k="City" v={ci.city || 'N/A'} />
            <Row k="Postcode" v={ci.postalCode || 'N/A'} />
          </Card>
          <Card title="Shipment">
            <Row k="Type" v={shipmentType(shipment)} />
            <Row k="Origin" v={shipment.origin || 'UK'} />
            <Row k="Destination" v={shipment.destination || 'Zimbabwe'} />
            <Row k="Payment" v={paymentAmount(shipment)} />
          </Card>
        </View>

        {/* Status management */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Status management</Text>
          {editing ? (
            <>
              <View style={styles.optionWrap}>
                {STATUS_OPTIONS.map((s) => {
                  const active = selected === s;
                  const isCurrent = s === shipment.status;
                  return (
                    <Pressable key={s} disabled={isCurrent} onPress={() => setSelected(s)}
                      style={[styles.option, active && styles.optionActive, isCurrent && styles.optionDisabled]}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.actionRow}>
                <Pressable style={[styles.btn, styles.btnPrimary, (busy || selected === shipment.status) && { opacity: 0.5 }]}
                  onPress={updateStatus} disabled={busy || selected === shipment.status}>
                  {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Update Status</Text>}
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => { setEditing(false); setSelected(shipment.status); }}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.actionRow}>
              {!terminal && (
                <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => setEditing(true)}>
                  <Text style={styles.btnOutlineText}>Update Status</Text>
                </Pressable>
              )}
              <Pressable style={[styles.btn, styles.btnDanger, busy && { opacity: 0.5 }]} onPress={confirmDelete} disabled={busy}>
                <Text style={styles.btnDangerText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { flex: 1 }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ gap: 3 }}>{children}</View>
    </View>
  );
}
function Line({ children }: { children: React.ReactNode }) {
  return <Text style={styles.line} numberOfLines={2}>{children}</Text>;
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v} numberOfLines={1}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  updated: { fontSize: 12, color: colors.textMuted },
  section: { gap: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  step: { fontSize: 8, color: colors.textFaint, flex: 1, textAlign: 'center' },
  stepDone: { color: colors.primary, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  line: { fontSize: 12, color: colors.textMuted },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  k: { fontSize: 12, color: colors.textMuted },
  v: { fontSize: 12, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionDisabled: { opacity: 0.4 },
  optionText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  optionTextActive: { color: colors.white },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, paddingVertical: 11, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: colors.primary },
  btnOutlineText: { color: colors.primary, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.textMuted, fontWeight: '700' },
  btnDanger: { borderWidth: 1, borderColor: colors.danger },
  btnDangerText: { color: colors.danger, fontWeight: '700' },
});
