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
import { customerRef, senderName, statusChoices, type Shipment } from '../../lib/shipment';
import { getInvoice, getPaymentSummary, invoiceSymbol, isIssued } from '../../lib/invoice';
import { isPlaceholderRoute } from '../../lib/collections';
import { bulkUpdateShipments, setRecordsDeleted } from '../../lib/records';
import { ConfirmSheet, OptionSheet, type SheetOption } from '../../components/OptionSheet';

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
  /** Which picker is open. Sheets, not alerts — see components/OptionSheet. */
  const [sheet, setSheet] = useState<null | 'status' | 'route' | 'period'>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Ids of the last delete, so it can be taken back without hunting for it. */
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const shipmentQuery = supabase
        .from('shipments')
        .select('id,tracking_number,customer_reference,status,created_at,metadata,collection_schedule_id,deleted_at')
        .eq('collection_period_id', periodId)
        .order('created_at', { ascending: false });

      const [shipmentResult, scheduleResult, periodResult] = await Promise.all([
        showDeleted ? shipmentQuery : shipmentQuery.is('deleted_at', null),
        // Schedules are looked up by the period's month and year rather than
        // its id: live data has two "September 2026" periods differing only by
        // capitalisation, one holding every booking and the other every route.
        // Matching on the id alone leaves a full period with no routes to
        // assign work to.
        supabase.rpc('period_schedules', { p_period_id: periodId }),
        // Every other period, so a shipment can be pushed to the next month.
        supabase
          .from('collection_periods')
          .select('id,name,month,year,status')
          .is('deleted_at', null)
          .order('year', { ascending: false })
          .order('name'),
      ]);
      if (shipmentResult.error) throw shipmentResult.error;
      setShipments((shipmentResult.data || []) as Shipment[]);
      setSchedules(scheduleResult.data || []);
      setPeriods(periodResult.data || []);
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
    let cleared = 0; let unpaid = 0; let partPaid = 0; let awaiting = 0;

    for (const shipment of shipments) {
      if (shipment.deleted_at) continue;
      const invoice = getInvoice(shipment);
      // Priced by the booking is not invoiced. Counting it here would make this
      // report disagree with the period card that led the user to it.
      if (!isIssued(invoice)) { awaiting += 1; continue; }
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
      awaiting,
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

  /**
   * Grouped by the route that collects them; unrouted work is shown, never hidden.
   *
   * A booking that nobody has routed yet carries the literal string
   * "To be assigned" — 23 of the 44 September 2026 shipments do. That is a
   * placeholder, not a route, and listing it as one invents a collection round
   * that does not exist. `isPlaceholderRoute` already knows every spelling of
   * it; this screen simply was not asking.
   */
  const groups = useMemo(() => {
    const map = new Map<string, Shipment[]>();
    for (const shipment of shipments) {
      const fromSchedule = shipment.collection_schedule_id
        ? scheduleRoute.get(shipment.collection_schedule_id)
        : null;
      const fromBooking = (shipment.metadata as any)?.collection?.route;
      const label = !isPlaceholderRoute(fromSchedule)
        ? String(fromSchedule)
        : !isPlaceholderRoute(fromBooking)
          ? String(fromBooking).trim()
          : UNROUTED;
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
  const countLabel = `${ids.length} shipment${ids.length === 1 ? '' : 's'}`;

  /** Run one bulk change, then clear the selection and reload. */
  const applyBulk = useCallback(async (patch: Parameters<typeof bulkUpdateShipments>[1]) => {
    setBusy(true);
    const result = await bulkUpdateShipments(ids, patch);
    setBusy(false);
    setSheet(null);
    if (!result.ok) { setError(result.message); return; }
    setSelected(new Set());
    await load();
  }, [ids, load]);

  /** Every stage, including the one these shipments are already in. */
  const statusOptions = useMemo<SheetOption[]>(
    () => statusChoices(shipments.map((s) => s.status)).map((status) => ({
      key: status,
      label: status,
      icon: 'ellipse-outline',
    })),
    [shipments],
  );

  /**
   * Every published route in the period, and the way back off one.
   *
   * Previously capped at eight and then cut to three by Android's alert. All of
   * them are listed now — September 2026 publishes ten.
   */
  const routeOptions = useMemo<SheetOption[]>(() => [
    ...schedules.map((schedule: any) => ({
      key: String(schedule.id),
      label: String(schedule.route || 'Unnamed route'),
      detail: schedule.pickup_on ? `Collecting ${schedule.pickup_on}` : undefined,
      icon: 'git-branch-outline' as const,
    })),
    { key: 'none', label: 'Take off its route', detail: 'Back to “No route yet”', icon: 'close-circle-outline' },
  ], [schedules]);

  /**
   * The other periods, so work can be pushed to the following month.
   *
   * Moving period clears the route as well: routes are published per period, so
   * a September round means nothing on an October shipment.
   */
  const periodOptions = useMemo<SheetOption[]>(
    () => periods
      .filter((p: any) => p.id !== periodId)
      .map((p: any) => ({
        key: String(p.id),
        label: String(p.name || `${p.month || ''} ${p.year || ''}`.trim() || 'Unnamed period'),
        detail: p.status ? String(p.status) : undefined,
        icon: 'calendar-outline' as const,
      })),
    [periods, periodId],
  );

  const doDelete = useCallback(async () => {
    const label = ids.length === 1 ? 'shipment' : `${ids.length} shipments`;
    setBusy(true);
    const result = await setRecordsDeleted('shipments', ids, true);
    setBusy(false);
    setConfirmingDelete(false);
    if (!result.ok) { setError(result.message); return; }
    setUndo({ ids, label });
    setSelected(new Set());
    await load();
  }, [ids, load]);

  const doUndo = useCallback(async () => {
    if (!undo) return;
    setBusy(true);
    const result = await setRecordsDeleted('shipments', undo.ids, false);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setUndo(null);
    await load();
  }, [undo, load]);

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
          {report.awaiting > 0 ? (
            <Text style={styles.reportWaiting}>
              {report.awaiting} priced but not invoiced yet — open one and press Create invoice
            </Text>
          ) : null}
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
              const issued = isIssued(invoice);
              const on = selected.has(shipment.id);
              const gone = Boolean(shipment.deleted_at);
              return (
                <Pressable
                  key={shipment.id}
                  style={[styles.row, on && styles.rowOn, gone && styles.rowGone]}
                  // Tapping a shipment opens it. Selecting is the checkbox, or
                  // a long press — the reverse of what this screen used to do,
                  // where the only way in was a long press nobody discovered.
                  onPress={() => (gone ? undefined : navigation.navigate('ShipmentDetail', { shipment }))}
                  onLongPress={() => (gone ? undefined : toggle(shipment.id))}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Select ${senderName(shipment)}`}
                    hitSlop={10}
                    style={styles.tick}
                    onPress={() => (gone ? undefined : toggle(shipment.id))}
                  >
                    <Ionicons
                      name={gone ? 'trash-outline' : on ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={gone ? colors.textFaint : on ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>{senderName(shipment)}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {shipment.customer_reference || customerRef(shipment)} · {shipment.status || 'No status'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmount}>{money(total, symbol)}</Text>
                    {/* The amount is what the booking priced; the label says
                        whether anyone has actually billed it. Calling a
                        priced-but-unraised booking "unpaid" contradicts the
                        report directly above it. */}
                    <Text style={[
                      styles.rowMeta,
                      !issued ? { color: colors.amber, fontWeight: '700' } : null,
                      issued && paidAmount >= total - 0.005 && total > 0 ? { color: colors.primaryDark } : null,
                    ]}>
                      {!issued ? 'not invoiced'
                        : total <= 0 ? 'no invoice'
                        : paidAmount <= 0.005 ? 'unpaid'
                        : paidAmount >= total - 0.005 ? 'paid'
                        : `${money(total - paidAmount, symbol)} left`}
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

      {undo && ids.length === 0 ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Deleted {undo.label}</Text>
          <Pressable onPress={doUndo} disabled={busy} hitSlop={8}>
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
          <Pressable onPress={() => setUndo(null)} hitSlop={8}>
            <Ionicons name="close" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {ids.length > 0 ? (
        <View style={styles.actionBar}>
          <Pressable onPress={() => setSelected(new Set())} hitSlop={8} style={{ flex: 1 }}>
            <Text style={styles.actionCount}>{ids.length} selected</Text>
            <Text style={styles.actionClear}>Tap to clear</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => setSheet('status')} disabled={busy}>
            <Ionicons name="swap-horizontal" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Status</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => setSheet('route')} disabled={busy}>
            <Ionicons name="git-branch-outline" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Route</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => setSheet('period')} disabled={busy}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
            <Text style={styles.actionText}>Period</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.actionDanger]}
            disabled={busy}
            onPress={() => setConfirmingDelete(true)}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      <OptionSheet
        visible={sheet === 'status'}
        title="Move to status"
        subtitle={countLabel}
        options={statusOptions}
        busy={busy}
        onSelect={(status) => applyBulk({ status })}
        onClose={() => setSheet(null)}
      />

      <OptionSheet
        visible={sheet === 'route'}
        title="Move to route"
        subtitle={countLabel}
        options={routeOptions}
        busy={busy}
        emptyText="No collection routes are published for this period yet."
        onSelect={(id) => (id === 'none'
          ? applyBulk({ clearSchedule: true })
          : applyBulk({ collectionScheduleId: id }))}
        onClose={() => setSheet(null)}
      />

      <OptionSheet
        visible={sheet === 'period'}
        title="Move to another period"
        subtitle={`${countLabel} · this also takes them off their route`}
        options={periodOptions}
        busy={busy}
        emptyText="There is no other collection period to move these to."
        onSelect={(id) => applyBulk({ collectionPeriodId: id, clearSchedule: true })}
        onClose={() => setSheet(null)}
      />

      <ConfirmSheet
        visible={confirmingDelete}
        title={`Delete ${ids.length === 1 ? 'this shipment' : `${ids.length} shipments`}?`}
        message="They will be hidden from the app and from the customer. You can undo this straight away, or restore them later with the eye button."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={doDelete}
        onClose={() => setConfirmingDelete(false)}
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
  reportWaiting: { fontSize: 12, fontWeight: '700', color: colors.amber },
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
  actionCount: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  actionClear: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  tick: { paddingVertical: 2, paddingRight: 2 },
  undoBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  undoText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  undoAction: { fontSize: 13, fontWeight: '900', color: colors.primary, letterSpacing: 0.3 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 42, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  actionDanger: { backgroundColor: colors.redSoft },
  actionText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
});
