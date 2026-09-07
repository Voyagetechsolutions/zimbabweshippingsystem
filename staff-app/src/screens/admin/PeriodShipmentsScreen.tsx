import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { money } from '../../lib/format';
import { customerRef, senderName, type Shipment } from '../../lib/shipment';
import { getInvoice, getPaymentSummary, invoiceSymbol } from '../../lib/invoice';
import { routeKey } from '../../lib/collections';
import { bulkUpdateShipments, confirmDelete, setRecordsDeleted } from '../../lib/records';

/**
 * One collection period: what is in it, grouped by the route that collects it.
 *
 * The report sits at the top because it is the reason to open a period at all
 * — what it is worth, what has been paid, what is still out. Below it the
 * shipments are grouped by route, since that is the unit a day's work is
 * planned in.
 *
 * Selection turns the list into a worklist: tick several and move them all to
 * another period, mark them collected, or delete them. Every delete is soft
 * and offers Undo.
 */

type Params = { periodId: string; name?: string };

const UNROUTED = 'No route yet';

export default function PeriodShipmentsScreen() {
  const navigation = useNavigation<any>();
  const { periodId, name } = (useRoute().params || {}) as Params;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const shipmentQuery = supabase
        .from('shipments')
        .select('id,tracking_number,customer_reference,status,created_at,metadata,collection_schedule_id,deleted_at')
        .eq('collection_period_id', periodId)
        .order('created_at', { ascending: false });

      const [shipmentResult, scheduleResult] = await Promise.all([
        showDeleted ? shipmentQuery : shipmentQuery.is('deleted_at', null),
        // Schedules are looked up by the period's month and year rather than
        // its id: live data has two "September 2026" periods differing only by
        // capitalisation, one holding every booking and the other every route.
        // Matching on the id alone leaves a full period with no routes to
        // assign work to.
        supabase.rpc('period_schedules', { p_period_id: periodId }),
      ]);
      if (shipmentResult.error) throw shipmentResult.error;
      setShipments((shipmentResult.data || []) as Shipment[]);
      setSchedules(scheduleResult.data || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load this period.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodId, showDeleted]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const scheduleRoute = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schedules) if (s.id && s.route) map.set(s.id, s.route);
    return map;
  }, [schedules]);

  /**
   * Money for the period, kept apart by currency.
   *
   * A period routinely holds UK and Irish collections together, and adding
   * pounds to euros gives a total that is not money in any currency. They are
   * summed separately and shown separately, however many there are.
   */
  const report = useMemo(() => {
    const totals = new Map<string, { invoiced: number; paid: number }>();
    let cleared = 0; let unpaid = 0; let partPaid = 0;

    for (const shipment of shipments) {
      if (shipment.deleted_at) continue;
      const invoice = getInvoice(shipment);
      const { total, paidAmount } = getPaymentSummary(invoice);
      const currency = invoice.currency || 'GBP';
      const bucket = totals.get(currency) || { invoiced: 0, paid: 0 };
      bucket.invoiced += total;
      bucket.paid += paidAmount;
      totals.set(currency, bucket);

      if (total > 0) {
        if (paidAmount >= total - 0.005) cleared += 1;
        else if (paidAmount <= 0.005) unpaid += 1;
        else partPaid += 1;
      }
    }

    return {
      cleared,
      unpaid,
      partPaid,
      byCurrency: [...totals.entries()]
        .filter(([, v]) => v.invoiced > 0 || v.paid > 0)
        .map(([currency, v]) => ({
          currency,
          symbol: invoiceSymbol(currency),
          invoiced: v.invoiced,
          paid: v.paid,
          outstanding: Math.max(0, v.invoiced - v.paid),
        }))
        .sort((a, b) => b.invoiced - a.invoiced),
    };
  }, [shipments]);

  /** Grouped by the route that collects them; unrouted work is shown, never hidden. */
  const groups = useMemo(() => {
    const map = new Map<string, Shipment[]>();
    for (const shipment of shipments) {
      const fromSchedule = shipment.collection_schedule_id
        ? scheduleRoute.get(shipment.collection_schedule_id)
        : null;
      const fromBooking = (shipment.metadata as any)?.collection?.route;
      const label = fromSchedule || (fromBooking && routeKey(fromBooking) ? String(fromBooking) : UNROUTED);
      (map.get(label) || map.set(label, []).get(label)!).push(shipment);
    }
    return [...map.entries()].sort((a, b) =>
      a[0] === UNROUTED ? 1 : b[0] === UNROUTED ? -1 : a[0].localeCompare(b[0]));
  }, [shipments, scheduleRoute]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAllIn = (rows: Shipment[]) => setSelected((current) => {
    const next = new Set(current);
    const live = rows.filter((r) => !r.deleted_at).map((r) => r.id);
    const allOn = live.every((id) => next.has(id));
    for (const id of live) { if (allOn) next.delete(id); else next.add(id); }
    return next;
  });

  const ids = useMemo(() => [...selected], [selected]);

  const doBulkStatus = () => {
    const options = ['Booking Confirmed', 'Collected', 'At Warehouse', 'Enroute to Zimbabwe', 'Delivered'];
    Alert.alert('Move to status', `${ids.length} shipment${ids.length === 1 ? '' : 's'}`, [
      ...options.map((status) => ({
        text: status,
        onPress: async () => {
          setBusy(true);
          const result = await bulkUpdateShipments(ids, { status });
          setBusy(false);
          if (!result.ok) { Alert.alert('Could not update', result.message); return; }
          setSelected(new Set());
          await load();
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const doBulkRoute = () => {
    if (!schedules.length) {
      Alert.alert('No routes in this period', 'Publish a collection schedule first.');
      return;
    }
    Alert.alert('Move to route', `${ids.length} shipment${ids.length === 1 ? '' : 's'}`, [
      ...schedules.slice(0, 8).map((schedule: any) => ({
        text: `${schedule.route}${schedule.pickup_on ? ` · ${schedule.pickup_on}` : ''}`,
        onPress: async () => {
          setBusy(true);
          const result = await bulkUpdateShipments(ids, { collectionScheduleId: schedule.id });
          setBusy(false);
          if (!result.ok) { Alert.alert('Could not update', result.message); return; }
          setSelected(new Set());
          await load();
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const liveCount = shipments.filter((s) => !s.deleted_at).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{name || 'Collection period'}</Text>
          <Text style={styles.subtitle}>{liveCount} shipment{liveCount === 1 ? '' : 's'}</Text>
        </View>
        <Pressable onPress={() => setShowDeleted((v) => !v)} hitSlop={10} style={styles.iconButton}>
          <Ionicons name={showDeleted ? 'eye' : 'eye-off-outline'} size={19} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>PERIOD REPORT</Text>
          {report.byCurrency.length === 0 ? (
            <Text style={styles.reportMeta}>Nothing invoiced in this period yet.</Text>
          ) : report.byCurrency.map((line) => (
            <View key={line.currency}>
              {report.byCurrency.length > 1 ? (
                <Text style={styles.currencyLabel}>{line.currency}</Text>
              ) : null}
              <View style={styles.figures}>
                <Figure label="Invoiced" value={money(line.invoiced, line.symbol)} />
                <Figure label="Paid" value={money(line.paid, line.symbol)} tone={colors.primaryDark} />
                <Figure
                  label="Outstanding"
                  value={money(line.outstanding, line.symbol)}
                  tone={line.outstanding > 0 ? colors.danger : colors.primaryDark}
                />
              </View>
            </View>
          ))}
          <Text style={styles.reportMeta}>
            {report.cleared} paid in full · {report.unpaid} not paid at all · {report.partPaid} part paid
          </Text>
        </View>

        {groups.map(([route, rows]) => (
          <View key={route} style={styles.group}>
            <Pressable style={styles.groupHead} onPress={() => selectAllIn(rows)}>
              <Text style={styles.groupTitle}>{route}</Text>
              <Text style={styles.groupCount}>{rows.filter((r) => !r.deleted_at).length}</Text>
            </Pressable>

            {rows.map((shipment) => {
              const invoice = getInvoice(shipment);
              const { total, paidAmount } = getPaymentSummary(invoice);
              const symbol = invoiceSymbol(invoice.currency);
              const on = selected.has(shipment.id);
              const gone = Boolean(shipment.deleted_at);
              return (
                <Pressable
                  key={shipment.id}
                  style={[styles.row, on && styles.rowOn, gone && styles.rowGone]}
                  onPress={() => (gone ? undefined : toggle(shipment.id))}
                  onLongPress={() => navigation.navigate('ShipmentDetail', { shipment })}
                >
                  <Ionicons
                    name={gone ? 'trash-outline' : on ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={gone ? colors.textFaint : on ? colors.primary : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{senderName(shipment)}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {shipment.customer_reference || customerRef(shipment)} · {shipment.status || 'No status'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmount}>{money(total, symbol)}</Text>
                    <Text style={[styles.rowMeta, paidAmount >= total - 0.005 && total > 0 ? { color: colors.primaryDark } : null]}>
                      {total <= 0 ? 'no invoice' : paidAmount <= 0.005 ? 'unpaid' : paidAmount >= total - 0.005 ? 'paid' : `${money(total - paidAmount, symbol)} left`}
                    </Text>
                  </View>
                  {gone ? (
                    <Pressable
                      hitSlop={8}
                      onPress={async () => {
                        const result = await setRecordsDeleted('shipments', [shipment.id], false);
                        if (!result.ok) Alert.alert('Could not restore', result.message);
                        else await load();
                      }}
                    >
                      <Text style={styles.restore}>Restore</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        {shipments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nothing booked into this period yet.</Text>
          </View>
        ) : null}
      </ScrollView>

      {ids.length > 0 ? (
        <View style={styles.actionBar}>
          <Text style={styles.actionCount}>{ids.length} selected</Text>
          <Pressable style={styles.action} onPress={doBulkStatus} disabled={busy}>
            <Ionicons name="swap-horizontal" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Status</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={doBulkRoute} disabled={busy}>
            <Ionicons name="git-branch-outline" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Route</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.actionDanger]}
            disabled={busy}
            onPress={() => confirmDelete({
              table: 'shipments',
              ids,
              noun: 'shipment',
              onDone: async () => { setSelected(new Set()); await load(); },
            })}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
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
  iconButton: { padding: 6 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 13 },
  reportCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  reportTitle: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.7 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
  currencyLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.6, marginTop: 6 },
  reportMeta: { fontSize: 12, color: colors.textMuted },
  group: { gap: 4, marginTop: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  groupTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 },
  groupCount: { fontSize: 11, fontWeight: '800', color: colors.textFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  rowOn: { borderWidth: 1.5, borderColor: colors.primary },
  rowGone: { opacity: 0.55 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  rowAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
  restore: { fontSize: 12, fontWeight: '800', color: colors.primary, paddingHorizontal: 6 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
  actionBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  actionCount: { flex: 1, fontSize: 12.5, fontWeight: '800', color: colors.text },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 42, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  actionDanger: { backgroundColor: colors.redSoft },
  actionText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
});
