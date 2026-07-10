import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, SectionList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

interface ScheduleRow {
  id: string;
  route: string;
  pickup_date: string;
  country: string | null;
  areas: string[];
}

export default function ScheduleScreen() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('id, route, pickup_date, country, areas')
      .order('country')
      .order('route');
    if (!error) setRows((data as ScheduleRow[]) || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const sections = useMemo(() => {
    const byCountry = new Map<string, ScheduleRow[]>();
    for (const r of rows) {
      const key = r.country || 'Other';
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(r);
    }
    return Array.from(byCountry.entries()).map(([title, data]) => ({ title, data }));
  }, [rows]);

  const saveDate = async (row: ScheduleRow) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .update({ pickup_date: dateValue.trim() || 'Not set', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      setRows(rows.map((r) => (r.id === row.id ? { ...r, pickup_date: dateValue.trim() || 'Not set' } : r)));
      setEditingId(null);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not update the date');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SectionList
      style={styles.safe}
      sections={sections}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => <Text style={styles.group}>{section.title}</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No collection schedules</Text>}
      stickySectionHeadersEnabled={false}
      renderItem={({ item }) => {
        const editing = editingId === item.id;
        return (
          <View style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.route}>{item.route}</Text>
              {!editing && (
                <Pressable onPress={() => { setEditingId(item.id); setDateValue(item.pickup_date === 'Not set' ? '' : item.pickup_date); }}>
                  <Text style={styles.editLink}>Edit date</Text>
                </Pressable>
              )}
            </View>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input} value={dateValue} onChangeText={setDateValue}
                  placeholder="e.g. 15 August 2026" placeholderTextColor={colors.textFaint} autoFocus
                />
                <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={() => saveDate(item)} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveText}>Save</Text>}
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.date}>
                Next collection: <Text style={styles.dateValue}>{item.pickup_date || 'Not set'}</Text>
              </Text>
            )}
            {item.areas?.length ? <Text style={styles.areas} numberOfLines={2}>Areas: {item.areas.join(', ')}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: 48 },
  group: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: 4,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 14, fontWeight: '700', color: colors.text },
  editLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  date: { fontSize: 13, color: colors.textMuted },
  dateValue: { color: colors.text, fontWeight: '600' },
  areas: { fontSize: 12, color: colors.textFaint },
  editRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 13, color: colors.text, backgroundColor: colors.bg,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 9 },
  saveText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  cancelBtn: { paddingHorizontal: 6 },
  cancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
});
