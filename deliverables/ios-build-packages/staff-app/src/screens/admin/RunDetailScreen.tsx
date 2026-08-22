import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { Shipment, customerRef, senderName, senderPhone } from '../../lib/shipment';
import { Badge, BADGE, Avatar, Card, SectionLabel, Loading, ErrorState } from '../../components/adminui';
import RunMap from '../../components/RunMap';
import type { RunsStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<RunsStackParams, 'RunDetail'>;

interface StopRow {
  id: string; shipment_id: string; status: string; stop_order: number; stop_type: string;
  address: string | null; latitude: number | null; longitude: number | null;
  completed_at: string | null; failure_reason: string | null; failure_note: string | null;
  shipment: Shipment;
}

function stopBadge(status: string) {
  if (status === 'completed') return { label: 'Completed', tone: BADGE.green };
  if (status === 'failed') return { label: 'Exception', tone: BADGE.red };
  if (status === 'arrived') return { label: 'Arrived', tone: BADGE.orange };
  if (status === 'en_route') return { label: 'En route', tone: BADGE.blue };
  return { label: 'Planned', tone: BADGE.grey };
}

export default function RunDetailScreen({ route, navigation }: Props) {
  const { runId } = route.params;
  const [run, setRun] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data: runRow, error: runError } = await supabase.from('driver_runs').select('*').eq('id', runId).maybeSingle();
    if (runError || !runRow) { setError(runError?.message || 'Run not found'); return; }
    setRun(runRow);
    const [driverResult, stopResult, driversResult] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,phone_number,vehicle_label,driver_type').eq('id', runRow.driver_id).maybeSingle(),
      supabase.from('driver_run_stops').select('id,shipment_id,status,stop_order,stop_type,address,latitude,longitude,completed_at,failure_reason,failure_note,shipment:shipments(*)').eq('run_id', runId).order('stop_order'),
      supabase.from('profiles').select('id,full_name,email,driver_type,on_leave,staff_active').or('role.eq.driver,role.eq.admin,is_admin.eq.true').order('full_name'),
    ]);
    setDriver(driverResult.data || null);
    setStops(((stopResult.data || []) as any[]).map((row) => ({ ...row, shipment: row.shipment as Shipment })) as StopRow[]);
    setDrivers(driversResult.data || []);
  }, [runId]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`run-detail-${runId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_run_stops', filter: `run_id=eq.${runId}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_runs', filter: `id=eq.${runId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, runId]);

  const reassign = async (driverId: string) => {
    setPickerOpen(false);
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('reassign_run_driver', { p_run_id: runId, p_driver_id: driverId });
      if (rpcError) throw rpcError;
      Alert.alert('Run reassigned', 'The new driver can now see this route.');
      await load();
    } catch (e: any) { Alert.alert('Could not reassign', e?.message); }
    finally { setBusy(false); }
  };

  const moveStop = async (stop: StopRow, direction: 'up' | 'down') => {
    const { data, error: rpcError } = await supabase.rpc('reorder_run_stop', { p_stop_id: stop.id, p_direction: direction });
    if (rpcError) { Alert.alert('Could not reorder', rpcError.message); return; }
    if ((data as any)?.moved === false) return;
    await load();
  };

  const removeStop = (stop: StopRow) => {
    Alert.alert('Remove stop', `Take ${senderName(stop.shipment)} off this run?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const { error: rpcError } = await supabase.rpc('remove_run_stop', { p_stop_id: stop.id });
          if (rpcError) Alert.alert('Could not remove stop', rpcError.message); else await load();
        },
      },
    ]);
  };

  const cancelRun = () => {
    Alert.alert('Cancel run', 'This cancels the whole run and releases its open stops for replanning. Continue?', [
      { text: 'Keep run', style: 'cancel' },
      {
        text: 'Cancel run', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            const open = stops.filter((s) => !['completed', 'failed'].includes(s.status));
            for (const stop of open) {
              await supabase.rpc('remove_run_stop', { p_stop_id: stop.id });
            }
            const { error: updateError } = await supabase.from('driver_runs')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', runId);
            if (updateError) throw updateError;
            Alert.alert('Run cancelled', 'Open stops are back in the unassigned pool.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
          } catch (e: any) { Alert.alert('Could not cancel run', e?.message); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  if (loading) return <Loading />;
  if (error || !run) return <View style={styles.safe}><ErrorState message={error || 'Run not found'} onRetry={load} /></View>;

  const done = stops.filter((s) => s.status === 'completed').length;
  const failed = stops.filter((s) => s.status === 'failed').length;
  const phone = (driver?.phone_number || '').replace(/[^0-9+]/g, '');
  const mapStops = stops
    .filter((s) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)))
    .map((s) => ({
      id: s.id, latitude: Number(s.latitude), longitude: Number(s.longitude),
      title: `${s.stop_order}. ${senderName(s.shipment)}`, description: s.address || '',
      kind: (s.stop_type === 'delivery' ? 'delivery' : 'collection') as 'collection' | 'delivery',
    }));
  const badge = run.status === 'active' ? BADGE.blue : run.status === 'completed' ? BADGE.green : run.status === 'cancelled' ? BADGE.red : BADGE.orange;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
      <Card>
        <View style={styles.driverRow}>
          <Avatar name={driver?.full_name || driver?.email} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{driver?.full_name || driver?.email || 'Driver'}</Text>
            <Text style={styles.meta}>{run.route_name || 'Route'} · {run.run_type === 'delivery' ? 'Delivery' : 'Pickup'} run · {run.run_date}</Text>
            <Text style={styles.meta}>{run.vehicle_label || driver?.vehicle_label || 'No vehicle assigned'}</Text>
          </View>
          <Badge text={run.status} tone={badge} />
        </View>
        <View style={styles.contactRow}>
          <Pressable style={styles.contactButton} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
            <Ionicons name="call-outline" size={16} color={colors.blue} /><Text style={[styles.contactText, { color: colors.blue }]}>Call</Text>
          </Pressable>
          <Pressable style={[styles.contactButton, { backgroundColor: colors.primarySoft }]} onPress={() => phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}>
            <Ionicons name="logo-whatsapp" size={16} color={colors.primaryDark} /><Text style={[styles.contactText, { color: colors.primaryDark }]}>Message</Text>
          </Pressable>
        </View>
      </Card>

      <RunMap stops={mapStops} height={200} />

      <SectionLabel text={`Stops (${done}/${stops.length} completed${failed ? `, ${failed} exceptions` : ''})`} />
      {stops.map((stop) => {
        const b = stopBadge(stop.status);
        const shipment = stop.shipment;
        const description = (shipment as any)?.goods_description || shipment?.metadata?.shipment?.description;
        return (
          <View key={stop.id} style={styles.stopCard}>
            <View style={[styles.order, stop.status === 'completed' && { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.orderText, stop.status === 'completed' && { color: colors.primaryDark }]}>{stop.stop_order}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stopTop}>
                <Text style={styles.stopRef}>{shipment?.customer_reference || shipment?.tracking_number || customerRef(shipment)}</Text>
                <Badge text={b.label} tone={b.tone} />
              </View>
              <Text style={styles.stopName}>{senderName(shipment)}</Text>
              <Text style={styles.meta} numberOfLines={2}>{stop.address || '—'}</Text>
              <Text style={styles.meta}>{stop.stop_type === 'delivery' ? 'Delivery' : 'Collection'}{stop.completed_at ? ` · done ${new Date(stop.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>
              {description ? <Text style={styles.goods} numberOfLines={3}>{description}</Text> : null}
              {stop.status === 'failed' ? (
                <Text style={styles.exception}>Exception: {String(stop.failure_reason || 'other').replace(/_/g, ' ')}{stop.failure_note ? ` — ${stop.failure_note}` : ''}</Text>
              ) : null}
            </View>
            {!['completed', 'failed'].includes(stop.status) && run.status !== 'completed' ? (
              <View style={styles.stopActions}>
                <Pressable onPress={() => moveStop(stop, 'up')} hitSlop={6}>
                  <Ionicons name="chevron-up-circle-outline" size={20} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => moveStop(stop, 'down')} hitSlop={6}>
                  <Ionicons name="chevron-down-circle-outline" size={20} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => removeStop(stop)} hitSlop={6}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <SectionLabel text="Run summary" />
      <Card>
        <Row k="Total stops" v={String(stops.length)} />
        <Row k="Completed" v={String(done)} />
        <Row k="Exceptions" v={String(failed)} />
        <Row k="Remaining" v={String(stops.length - done - failed)} />
        <Row k="Started" v={run.started_at ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not started'} />
        <Row k="Completed at" v={run.completed_at ? new Date(run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
      </Card>

      {run.status !== 'completed' && run.status !== 'cancelled' ? (
        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, styles.primaryAction, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => setPickerOpen(true)}>
            <Text style={styles.primaryActionText}>Reassign driver</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.dangerAction, busy && { opacity: 0.5 }]} disabled={busy} onPress={cancelRun}>
            <Text style={styles.dangerActionText}>Cancel run</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalShade} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Reassign run</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {drivers.filter((d) => d.staff_active !== false && !d.on_leave).map((d) => (
                <Pressable key={d.id} style={styles.driverPick} onPress={() => reassign(d.id)}>
                  <Avatar name={d.full_name || d.email} size={34} />
                  <Text style={styles.driverPickName}>{d.full_name || d.email}</Text>
                  {d.id === run.driver_id ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setPickerOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  driverName: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.blueSoft, borderRadius: radius.sm, paddingVertical: 10 },
  contactText: { fontSize: 12.5, fontWeight: '800' },
  stopCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  order: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  orderText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  stopActions: { justifyContent: 'center', gap: 6 },
  stopTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stopRef: { fontSize: 12, fontWeight: '800', color: colors.primary },
  stopName: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  goods: { fontSize: 11.5, color: colors.text, marginTop: 4, lineHeight: 16, backgroundColor: colors.bg, borderRadius: radius.sm, padding: 8 },
  exception: { fontSize: 11.5, color: colors.danger, fontWeight: '700', marginTop: 4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  k: { fontSize: 12.5, color: colors.textMuted },
  v: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionButton: { flex: 1, alignItems: 'center', borderRadius: radius.sm, paddingVertical: 13 },
  primaryAction: { backgroundColor: colors.primary },
  primaryActionText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  dangerAction: { borderWidth: 1.5, borderColor: colors.danger },
  dangerActionText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  driverPick: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverPickName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.text },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
