import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { ScreenHeader, Avatar, SkeletonList, EmptyState, ErrorState, Badge, BADGE } from '../../components/adminui';

// Vehicles: which vehicle each driver is assigned (profiles.vehicle_label,
// managed through admin_update_staff so every change is audited).

interface DriverVehicle {
  id: string; full_name: string | null; email: string | null;
  vehicle_label: string | null; on_leave: boolean; staff_active: boolean;
}

export default function VehiclesScreen() {
  const [drivers, setDrivers] = useState<DriverVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DriverVehicle | null>(null);
  const [vehicleInput, setVehicleInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id,full_name,email,vehicle_label,on_leave,staff_active')
      .eq('role', 'driver')
      .order('full_name');
    if (loadError) { setError(loadError.message); return; }
    setDrivers((data || []) as DriverVehicle[]);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_update_staff', {
        p_user_id: editing.id, p_patch: { vehicle: vehicleInput.trim() },
      });
      if (rpcError) throw rpcError;
      setEditing(null);
      await load();
    } catch (e: any) { Alert.alert('Could not update', e?.message); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader title="Vehicles" subtitle="Driver vehicle assignments" />
        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading ? <SkeletonList rows={5} /> : drivers.length === 0 ? (
          <EmptyState icon="car-outline" title="No drivers yet" text="Invite drivers from the Staff Control Centre." />
        ) : drivers.map((d) => (
          <Pressable key={d.id} style={styles.row} onPress={() => { setEditing(d); setVehicleInput(d.vehicle_label || ''); }}>
            <Avatar name={d.full_name || d.email} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{d.full_name || d.email}</Text>
              <Text style={styles.meta}>{d.vehicle_label || 'No vehicle assigned'}</Text>
            </View>
            <Badge text={!d.staff_active ? 'Inactive' : d.on_leave ? 'On leave' : 'Active'}
              tone={!d.staff_active ? BADGE.grey : d.on_leave ? BADGE.purple : BADGE.green} />
            <Ionicons name="create-outline" size={17} color={colors.primary} />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.shade} onPress={() => setEditing(null)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>Assign vehicle</Text>
            <Text style={styles.meta}>{editing?.full_name || editing?.email}</Text>
            <TextInput style={styles.input} value={vehicleInput} onChangeText={setVehicleInput}
              placeholder="e.g. Luton van AB12 CDE" placeholderTextColor={colors.textFaint} autoFocus />
            <Pressable style={[styles.save, busy && { opacity: 0.5 }]} disabled={busy} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={() => setEditing(null)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  name: { fontSize: 14, fontWeight: '800', color: colors.text },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  shade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 380, gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14 },
  save: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  cancel: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
