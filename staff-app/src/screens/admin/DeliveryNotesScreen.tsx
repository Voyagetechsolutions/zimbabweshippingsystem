import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { shortDate } from '../../lib/format';
import { senderName, receiverName, type Shipment } from '../../lib/shipment';
import { ScreenHeader, SearchBar, Segmented, Badge, BADGE, SkeletonList, EmptyState, ErrorState } from '../../components/adminui';
import type { MenuStackParams } from '../../navigation/types';

// Delivery notes: searchable register of every delivery note with the
// verification status, opening into the full note + matching PDF.

type Props = NativeStackScreenProps<MenuStackParams, 'DeliveryNotes'>;

export interface DeliveryNoteRow {
  id: string;
  note_number: string;
  shipment_id: string;
  driver_id: string;
  recipient_name: string | null;
  delivery_address: string | null;
  delivered_at: string | null;
  customer_code_verified: boolean;
  proof_count: number;
  notes: string | null;
  status: string;
  created_at: string;
  shipment: Shipment | null;
}

const FILTERS = ['all', 'pending', 'signed', 'rejected', 'completed'] as const;

export function noteBadge(note: DeliveryNoteRow) {
  if (note.status === 'exception' || note.status === 'void') return { label: 'Rejected', tone: BADGE.red };
  if (note.status === 'completed' && note.customer_code_verified) return { label: 'Signed', tone: BADGE.green };
  if (note.status === 'completed') return { label: 'Completed', tone: BADGE.blue };
  return { label: 'Pending', tone: BADGE.orange };
}

export default function DeliveryNotesScreen({ navigation }: Props) {
  const [notes, setNotes] = useState<DeliveryNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const load = useCallback(async () => {
    setError(null);
    const { data, error: loadError } = await supabase
      .from('delivery_notes')
      .select('id,note_number,shipment_id,driver_id,recipient_name,delivery_address,delivered_at,customer_code_verified,proof_count,notes,status,created_at,shipment:shipments(id,tracking_number,customer_reference,status,origin,destination,created_at,updated_at,metadata,goods_description,driver_description_correction)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (loadError) { setError(loadError.message); return; }
    setNotes(((data || []) as any[]).map((row) => ({ ...row, shipment: row.shipment as Shipment | null })) as DeliveryNoteRow[]);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return notes
      .filter((n) => {
        if (filter === 'all') return true;
        const badge = noteBadge(n).label.toLowerCase();
        return badge === filter;
      })
      .filter((n) => {
        if (q === '') return true;
        return n.note_number?.toLowerCase().includes(q)
          || n.shipment?.customer_reference?.toLowerCase().includes(q)
          || n.shipment?.tracking_number?.toLowerCase().includes(q)
          || (n.shipment ? senderName(n.shipment).toLowerCase().includes(q) : false)
          || n.recipient_name?.toLowerCase().includes(q)
          || n.delivery_address?.toLowerCase().includes(q);
      });
  }, [filter, notes, query]);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.headerBlock}>
        <ScreenHeader title="Delivery Notes" subtitle={`${notes.length} notes on record`} />
        <SearchBar value={query} onChange={setQuery} placeholder="Note number, reference, tracking, customer or destination" />
        <View style={{ marginTop: spacing.sm }}>
          <Segmented options={FILTERS} value={filter} onChange={setFilter}
            labels={{ all: 'All', pending: 'Pending', signed: 'Signed', rejected: 'Rejected', completed: 'Completed' }} />
        </View>
      </View>

      {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorState message={error} onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} /></View> : null}

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <SkeletonList rows={6} /> : error ? null
          : <EmptyState icon="document-text-outline" title="No delivery notes" text="Delivery notes are created as drivers complete deliveries." />}
        renderItem={({ item }) => {
          const badge = noteBadge(item);
          return (
            <Pressable style={styles.row} onPress={() => navigation.navigate('DeliveryNoteDetail', { noteId: item.id })}>
              <View style={styles.noteIcon}><Ionicons name="document-text-outline" size={18} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.noteNumber}>{item.note_number}</Text>
                  <Badge text={badge.label} tone={badge.tone} />
                </View>
                <Text style={styles.reference}>
                  {item.shipment?.customer_reference || '—'} · {item.shipment?.tracking_number || 'No tracking'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.shipment ? senderName(item.shipment) : 'Customer'} → {item.recipient_name || (item.shipment ? receiverName(item.shipment) : 'Receiver')}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.delivery_address || item.shipment?.destination || '—'}
                  {item.delivered_at ? ` · delivered ${new Date(item.delivered_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          );
        }}
        ListFooterComponent={!loading && filtered.length ? <Text style={styles.footer}>{filtered.length} of {notes.length} notes</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBlock: { padding: spacing.lg, paddingBottom: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  noteIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  noteNumber: { fontSize: 13.5, fontWeight: '800', color: colors.text, flexShrink: 1 },
  reference: { fontSize: 10.5, fontWeight: '800', color: colors.primary, marginTop: 1 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, paddingVertical: spacing.md },
});
