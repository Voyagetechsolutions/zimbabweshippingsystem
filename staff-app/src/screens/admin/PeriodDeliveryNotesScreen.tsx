import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { money } from '../../lib/format';
import { invoiceSymbol } from '../../lib/invoice';
import { isPlaceholderRoute } from '../../lib/collections';
import { ConfirmSheet } from '../../components/OptionSheet';

/**
 * The delivery notes raised in one collection period, grouped by route.
 *
 * Same shape as the shipments and the invoices, because a period is how this
 * business counts everything: what went out on which round, what is still owed
 * on it, and which ones nobody has raised yet.
 *
 * These are office notes from `delivery_note_records` — the printed document
 * that travels with the goods. The driver's proof at the door is a different
 * record entirely and lives on the run.
 */

type Params = { periodId: string; name?: string };

const UNROUTED = 'No route yet';

export default function PeriodDeliveryNotesScreen() {
  const navigation = useNavigation<any>();
  const { periodId, name } = (useRoute().params || {}) as Params;

  const [notes, setNotes] = useState<any[]>([]);
  const [awaiting, setAwaiting] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState<any | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [noteResult, shipmentResult] = await Promise.all([
        supabase.rpc('period_delivery_notes', { p_period_id: periodId }),
        // Collected shipments still without a note — the work outstanding.
        supabase
          .from('shipments')
          .select('id,tracking_number,customer_reference,status,collected_at,metadata,collection_schedule_id')
          .eq('collection_period_id', periodId)
          .is('deleted_at', null),
      ]);
      if (noteResult.error) throw noteResult.error;
      const rows = Array.isArray(noteResult.data) ? noteResult.data : [];
      if (!Array.isArray(noteResult.data) && (noteResult.data as any)?.error) {
        throw new Error((noteResult.data as any).error);
      }
      setNotes(rows);

      const done = new Set(rows.map((n: any) => String(n.shipmentId)));
      setAwaiting(((shipmentResult.data as any[]) || []).filter((s) => {
        if (done.has(String(s.id))) return false;
        const collected = Boolean(s.collected_at) || [
          'collected', 'at warehouse', 'enroute to zimbabwe', 'in transit',
          'zim warehouse', 'out for delivery', 'delivered',
        ].includes(String(s.status || '').toLowerCase());
        return collected;
      }));
    } catch (err: any) {
      setError(err?.message || 'Could not load the delivery notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Grouped by the round that collected them. */
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const note of notes) {
      const label = isPlaceholderRoute(note.route) ? UNROUTED : String(note.route).trim();
      (map.get(label) || map.set(label, []).get(label)!).push(note);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === UNROUTED ? 1 : b[0] === UNROUTED ? -1 : a[0].localeCompare(b[0]));
  }, [notes]);

  const report = useMemo(() => {
    const totals = new Map<string, number>();
    let paid = 0;
    for (const note of notes) {
      if (note.voidedAt) continue;
      if (note.paid) paid += 1;
      const due = Number(note.balanceDue) || 0;
      if (due > 0) {
        const currency = note.currency || 'GBP';
        totals.set(currency, (totals.get(currency) || 0) + due);
      }
    }
    return {
      paid,
      live: notes.filter((n) => !n.voidedAt).length,
      owing: [...totals.entries()].map(([currency, amount]) => ({
        currency, amount, symbol: invoiceSymbol(currency),
      })),
    };
  }, [notes]);

  const doVoid = useCallback(async () => {
    if (!voiding) return;
    setBusy(true);
    const { error: voidError } = await supabase
      .from('delivery_note_records')
      .update({
        voided_at: new Date().toISOString(),
        void_reason: 'Voided from the collection period',
      })
      .eq('id', voiding.noteId);
    setBusy(false);
    setVoiding(null);
    if (voidError) { setError(voidError.message); return; }
    await load();
  }, [voiding, load]);

  const openShipment = useCallback(async (shipmentId: string) => {
    const { data } = await supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (data) navigation.navigate('ShipmentDetail', { shipment: data });
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name || 'Collection period'}</Text>
          <Text style={styles.subtitle}>
            {report.live} delivery note{report.live === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>DELIVERY NOTES</Text>
          <View style={styles.figures}>
            <Figure label="Raised" value={String(report.live)} />
            <Figure label="Paid" value={String(report.paid)} tone={colors.primaryDark} />
            <Figure
              label="Awaiting"
              value={String(awaiting.length)}
              tone={awaiting.length > 0 ? colors.amber : undefined}
            />
          </View>
          {report.owing.length ? (
            <Text style={styles.reportMeta}>
              Outstanding on notes: {report.owing.map((o) => money(o.amount, o.symbol)).join(' · ')}
            </Text>
          ) : (
            <Text style={styles.reportMeta}>Nothing owed on the notes raised so far.</Text>
          )}
        </View>

        {awaiting.length ? (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingTitle}>
              {awaiting.length} collected shipment{awaiting.length === 1 ? '' : 's'} with no note
            </Text>
            <Text style={styles.waitingText}>
              Open one and press Create delivery note. It fills in from the invoice.
            </Text>
            {awaiting.slice(0, 8).map((s) => (
              <Pressable key={s.id} style={styles.waitingRow} onPress={() => openShipment(s.id)}>
                <Ionicons name="document-outline" size={17} color={colors.amber} />
                <Text style={styles.waitingRowText} numberOfLines={1}>
                  {s.customer_reference || s.tracking_number}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
            {awaiting.length > 8 ? (
              <Text style={styles.waitingText}>…and {awaiting.length - 8} more.</Text>
            ) : null}
          </View>
        ) : null}

        {groups.map(([route, rows]) => (
          <View key={route} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{route}</Text>
              <Text style={styles.groupCount}>{rows.length}</Text>
            </View>
            {rows.map((note) => {
              const symbol = invoiceSymbol(note.currency);
              const due = Number(note.balanceDue) || 0;
              return (
                <Pressable
                  key={note.noteId}
                  style={[styles.row, note.voidedAt && styles.rowGone]}
                  onPress={() => openShipment(note.shipmentId)}
                  onLongPress={() => (note.voidedAt ? undefined : setVoiding(note))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{note.customerName || 'No name'}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {note.reference} · {note.invoiceNumber}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {note.recipientName || 'No receiver'}
                      {note.recipientCity ? ` · ${note.recipientCity}` : ''}
                      {note.deliveryMode === 'self_collection' ? ' · self collection' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowAmount, note.paid ? { color: colors.primaryDark } : null]}>
                      {note.paid ? 'PAID' : money(due, symbol)}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {note.voidedAt ? 'voided' : note.noteDate || ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {notes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>No delivery notes raised in this period yet.</Text>
          </View>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={Boolean(voiding)}
        title={`Void ${voiding?.reference || 'this note'}?`}
        message="A voided note stays on the record, marked void, so the register still shows it was issued. It will not count towards the period."
        confirmLabel="Void note"
        destructive
        busy={busy}
        onConfirm={doVoid}
        onClose={() => setVoiding(null)}
      />
    </SafeAreaView>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { padding: 4 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 13 },
  reportCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  reportTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.7 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
  reportMeta: { fontSize: 12, color: colors.textMuted },
  waitingCard: {
    backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.md, gap: 6,
    borderWidth: 1, borderColor: colors.amberBorder,
  },
  waitingTitle: { fontSize: 13.5, fontWeight: '800', color: colors.amber },
  waitingText: { fontSize: 12, color: colors.text },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  waitingRowText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  group: { gap: 4, marginTop: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  groupTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 },
  groupCount: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  rowGone: { opacity: 0.5 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  rowAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
});
