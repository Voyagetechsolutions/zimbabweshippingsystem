import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { parseCollectionDate } from '../../lib/format';
import { ScreenHeader, Badge, BADGE, SkeletonList, EmptyState, ErrorState, SectionLabel } from '../../components/adminui';
import RunMap from '../../components/RunMap';
import type { MenuStackParams } from '../../navigation/types';

// Pickup zones are real records seeded from (and connected to) the live
// collection routes: every zone maps to a route, its areas drive postcode/city
// matching, and the stats come from live shipments, runs and schedules.

type Props = NativeStackScreenProps<MenuStackParams, 'PickupZones'>;

interface Zone {
  id: string; name: string; country: string; areas: string[]; route: string | null;
  color: string; active: boolean; latitude: number | null; longitude: number | null;
}
interface ZoneStats {
  zoneId: string;
  pendingCollections: number;
  activeDrivers: Array<{ id: string; name: string }>;
  completedCollections: number;
  scheduleDates: string[];
}

const EMPTY_FORM = { name: '', country: 'United Kingdom', areas: '', route: '', latitude: '', longitude: '' };

export default function PickupZonesScreen({ navigation }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [stats, setStats] = useState<Record<string, ZoneStats>>({});
  const [routes, setRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Zone | null>(null);
  const [editing, setEditing] = useState<null | 'new' | string>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const [zoneResult, statResult, scheduleResult] = await Promise.all([
      supabase.from('pickup_zones').select('*').order('name'),
      supabase.rpc('admin_zone_stats'),
      supabase.from('collection_schedules').select('route').limit(200),
    ]);
    if (zoneResult.error) { setError(zoneResult.error.message); return; }
    setZones((zoneResult.data || []) as Zone[]);
    if (!statResult.error) {
      const map: Record<string, ZoneStats> = {};
      for (const row of (statResult.data || []) as ZoneStats[]) map[row.zoneId] = row;
      setStats(map);
    }
    setRoutes([...new Set(((scheduleResult.data || []) as any[]).map((r) => r.route).filter(Boolean))].sort());
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const nextCollection = (zone: Zone): { label: string; date: Date | null } => {
    const dates = (stats[zone.id]?.scheduleDates || [])
      .map((d) => parseCollectionDate(d))
      .filter((d): d is Date => Boolean(d && d.getTime() >= Date.now() - 86400000))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!dates.length) return { label: 'No upcoming date', date: null };
    return { label: dates[0].toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), date: dates[0] };
  };

  const mapStops = useMemo(() => zones
    .filter((z) => Number.isFinite(Number(z.latitude)) && Number.isFinite(Number(z.longitude)))
    .map((z) => ({
      id: z.id,
      latitude: Number(z.latitude), longitude: Number(z.longitude),
      title: z.name,
      description: `${stats[z.id]?.pendingCollections ?? 0} waiting · ${z.active ? 'active' : 'inactive'}`,
      kind: 'collection' as const,
      color: z.active ? z.color : '#94a3b8',
    })), [stats, zones]);

  const openEditor = (zone?: Zone) => {
    if (zone) {
      setForm({
        name: zone.name, country: zone.country, areas: (zone.areas || []).join(', '),
        route: zone.route || '', latitude: zone.latitude != null ? String(zone.latitude) : '',
        longitude: zone.longitude != null ? String(zone.longitude) : '',
      });
      setEditing(zone.id);
    } else {
      setForm(EMPTY_FORM);
      setEditing('new');
    }
    setDetail(null);
  };

  const saveZone = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Give the zone a name.'); return; }
    setBusy(true);
    try {
      const record = {
        name: form.name.trim(),
        country: form.country.trim() || 'United Kingdom',
        areas: form.areas.split(/[,\n]/).map((a) => a.trim()).filter(Boolean),
        route: form.route.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };
      const query = editing === 'new'
        ? supabase.from('pickup_zones').insert(record)
        : supabase.from('pickup_zones').update(record).eq('id', editing!);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditing(null);
      await load();
    } catch (e: any) {
      Alert.alert('Could not save zone', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (zone: Zone) => {
    const { error: updateError } = await supabase.from('pickup_zones').update({ active: !zone.active }).eq('id', zone.id);
    if (updateError) Alert.alert('Could not update', updateError.message);
    else { setDetail((d) => d && d.id === zone.id ? { ...d, active: !zone.active } : d); await load(); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader title="Pickup Zones" subtitle={`${zones.filter((z) => z.active).length} active zones`}
          right={
            <Pressable style={styles.addButton} onPress={() => openEditor()}>
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.addText}>Add Zone</Text>
            </Pressable>
          } />

        <RunMap stops={mapStops} height={230}
          onStopPress={(stop) => { const zone = zones.find((z) => z.id === stop.id); if (zone) setDetail(zone); }} />

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading ? <SkeletonList rows={5} /> : zones.length === 0 ? (
          <EmptyState icon="location-outline" title="No zones yet" text="Zones are seeded from the collection routes — add one to get started." />
        ) : (
          <>
            <SectionLabel text="Zones" />
            {zones.map((zone) => {
              const zoneStats = stats[zone.id];
              const next = nextCollection(zone);
              return (
                <Pressable key={zone.id} style={styles.zoneCard} onPress={() => setDetail(zone)}>
                  <View style={[styles.zoneDot, { backgroundColor: zone.active ? zone.color : '#94a3b8' }]} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      <Badge text={zone.active ? 'Active' : 'Inactive'} tone={zone.active ? BADGE.green : BADGE.grey} />
                    </View>
                    <Text style={styles.zoneMeta}>
                      {zoneStats?.activeDrivers?.length ?? 0} driver{(zoneStats?.activeDrivers?.length ?? 0) === 1 ? '' : 's'} ·
                      {' '}{zoneStats?.pendingCollections ?? 0} pending collection{(zoneStats?.pendingCollections ?? 0) === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.zoneMeta}>Next collection: {next.label} · {zone.route || 'No route linked'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Zone detail */}
      <Modal visible={Boolean(detail)} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView>
              {detail ? (
                <>
                  <View style={styles.rowTop}>
                    <Text style={styles.detailName}>{detail.name}</Text>
                    <Badge text={detail.active ? 'Active' : 'Inactive'} tone={detail.active ? BADGE.green : BADGE.grey} />
                  </View>
                  <Text style={styles.zoneMeta}>{detail.country} · {detail.route || 'No route linked'}</Text>

                  <Text style={styles.blockLabel}>COVERED AREAS</Text>
                  <View style={styles.areaWrap}>
                    {(detail.areas || []).length ? detail.areas.map((a, i) => (
                      <View key={i} style={styles.areaChip}><Text style={styles.areaText}>{a}</Text></View>
                    )) : <Text style={styles.zoneMeta}>No areas recorded</Text>}
                  </View>

                  <Text style={styles.blockLabel}>SCHEDULE</Text>
                  {(stats[detail.id]?.scheduleDates || []).length === 0 ? <Text style={styles.zoneMeta}>No published collection dates for this route.</Text> : (
                    (stats[detail.id]?.scheduleDates || []).slice(0, 6).map((d, i) => {
                      const parsed = parseCollectionDate(d);
                      return <Text key={i} style={styles.scheduleRow}>{parsed ? parsed.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : d}</Text>;
                    })
                  )}

                  <Text style={styles.blockLabel}>ASSIGNED DRIVERS</Text>
                  {(stats[detail.id]?.activeDrivers || []).length === 0 ? <Text style={styles.zoneMeta}>No drivers on this route today or upcoming.</Text> : (
                    (stats[detail.id]?.activeDrivers || []).map((d) => (
                      <Text key={d.id} style={styles.scheduleRow}>{d.name}</Text>
                    ))
                  )}

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{stats[detail.id]?.pendingCollections ?? 0}</Text>
                      <Text style={styles.statLabel}>WAITING</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{stats[detail.id]?.completedCollections ?? 0}</Text>
                      <Text style={styles.statLabel}>COLLECTED</Text>
                    </View>
                  </View>

                  <View style={styles.actionGrid}>
                    <ActionChip icon="create-outline" label="Edit zone" onPress={() => openEditor(detail)} />
                    <ActionChip icon={detail.active ? 'pause-outline' : 'play-outline'} label={detail.active ? 'Deactivate' : 'Activate'} danger={detail.active} onPress={() => toggleActive(detail)} />
                    <ActionChip icon="cube-outline" label="Waiting shipments" onPress={() => { setDetail(null); (navigation as any).getParent()?.navigate('Shipments'); }} />
                  </View>
                </>
              ) : null}
              <Pressable style={styles.modalCancel} onPress={() => setDetail(null)}><Text style={styles.modalCancelText}>Close</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Zone editor */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.detailName}>{editing === 'new' ? 'Add zone' : 'Edit zone'}</Text>
              <Text style={styles.blockLabel}>ZONE NAME</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. LONDON ROUTE" placeholderTextColor={colors.textFaint} />
              <Text style={styles.blockLabel}>COUNTRY</Text>
              <View style={styles.areaWrap}>
                {['United Kingdom', 'Ireland'].map((c) => (
                  <Pressable key={c} style={[styles.areaChip, form.country === c && { backgroundColor: colors.primary }]} onPress={() => setForm((f) => ({ ...f, country: c }))}>
                    <Text style={[styles.areaText, form.country === c && { color: colors.white }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.blockLabel}>COVERED CITIES / TOWNS / POSTCODES (comma-separated)</Text>
              <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} multiline value={form.areas} onChangeText={(v) => setForm((f) => ({ ...f, areas: v }))} placeholder="LUTON, BEDFORD, MILTON KEYNES" placeholderTextColor={colors.textFaint} />
              <Text style={styles.blockLabel}>LINKED COLLECTION ROUTE</Text>
              <View style={styles.areaWrap}>
                {routes.map((r) => (
                  <Pressable key={r} style={[styles.areaChip, form.route === r && { backgroundColor: colors.primary }]} onPress={() => setForm((f) => ({ ...f, route: f.route === r ? '' : r }))}>
                    <Text style={[styles.areaText, form.route === r && { color: colors.white }]}>{r.replace(' ROUTE', '')}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.blockLabel}>MAP CENTRE (OPTIONAL)</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={form.latitude} onChangeText={(v) => setForm((f) => ({ ...f, latitude: v }))} placeholder="Latitude" keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textFaint} />
                <TextInput style={[styles.input, { flex: 1 }]} value={form.longitude} onChangeText={(v) => setForm((f) => ({ ...f, longitude: v }))} placeholder="Longitude" keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textFaint} />
              </View>
              <Pressable style={[styles.saveButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={saveZone}>
                <Text style={styles.saveText}>{editing === 'new' ? 'Create zone' : 'Save changes'}</Text>
              </Pressable>
              <Pressable style={styles.modalCancel} onPress={() => setEditing(null)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionChip({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={[styles.action, danger && { backgroundColor: colors.redSoft }]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  addText: { fontSize: 11.5, fontWeight: '800', color: colors.white },
  zoneCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  zoneDot: { width: 12, height: 12, borderRadius: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  zoneName: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  zoneMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '90%' },
  detailName: { fontSize: 17, fontWeight: '800', color: colors.text },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 6 },
  areaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaChip: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  areaText: { fontSize: 10.5, fontWeight: '700', color: colors.text },
  scheduleRow: { fontSize: 12.5, color: colors.text, paddingVertical: 3, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, marginTop: 2 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  actionLabel: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13.5 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
