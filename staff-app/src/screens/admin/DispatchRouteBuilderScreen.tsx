import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Avatar, EmptyState, Loading, SearchBar, SectionLabel } from '../../components/adminui';
import {
  CollectionSlot, SLOT_WINDOWS, hhmm, loadSlots, requestedLabel, setDispatchWindow, slotState, windowLabel,
} from '../../lib/collectionSlots';
import { colors, radius, shadow, spacing } from '../../theme';

/**
 * Dispatch builds the day's collection route by hand.
 *
 * The board's "Assign" action can only hand a driver a route that the schedule
 * already matched. This screen is the other half: dispatch picks the individual
 * collections, records the window each customer actually said they would be in,
 * and then names the driver. Everything here is a live booking — nothing is
 * offered that is already collected.
 *
 * The windows are no longer dispatch's guess. Customers are asked two days out
 * to choose a two-hour slot, and that answer is shown against every collection
 * here and pre-filled the moment one is selected — so the default action is to
 * plan around what the customer said. Overriding one is allowed and sometimes
 * unavoidable, but it is called out on the row, it notifies the customer, and
 * it leaves an obligation on the run to actually speak to them.
 */

type Shipment = {
  id: string;
  tracking_number: string | null;
  customer_reference: string | null;
  collection_status: string | null;
  collection_schedule_id: string | null;
  collection_run_id: string | null;
  status: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  metadata: any;
};
type ScheduleRow = { id: string; route: string; country: string | null; pickup_date: string | null };
type Driver = { id: string; full_name: string | null; email: string | null; role: string | null; driver_type: string | null };
type Pick = { from: string; to: string };

const COUNTRY_FILTERS = ['All', 'United Kingdom', 'Ireland'] as const;
type CountryFilter = typeof COUNTRY_FILTERS[number];

const senderOf = (s: Shipment) => s.metadata?.sender || s.metadata?.senderDetails || {};
function customerName(s: Shipment) {
  const p = senderOf(s);
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.name || 'Collection customer';
}
function addressOf(s: Shipment) {
  const p = senderOf(s);
  return [p.address, p.city, p.postcode || p.postalCode].filter(Boolean).join(', ');
}
function countryOf(s: Shipment) {
  const raw = String(senderOf(s).country || s.metadata?.collection?.country || '').toLowerCase();
  if (raw.includes('ireland')) return 'Ireland';
  if (raw) return 'United Kingdom';
  return 'Unknown';
}
const routeOf = (s: Shipment) => String(s.metadata?.collection?.route || '').trim();

/** "09:00" or "9" or "930" → minutes past midnight, or null if unusable. */
function parseTime(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const m = text.match(/^(\d{1,2})[:.]?(\d{2})?$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = m[2] ? Number(m[2]) : 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** A local wall-clock time on the run date, as the timestamptz the column wants. */
function windowStamp(runDate: string, value: string): string | null {
  const minutes = parseTime(value);
  if (minutes == null) return null;
  const [y, m, d] = runDate.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
}

export default function DispatchRouteBuilderScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const runDate: string = route?.params?.date || new Date().toISOString().slice(0, 10);
  // Opened from a collection group: work only that group. Opened from the
  // dispatch board with no group, every open collection is offered — which is
  // how an unassigned booking gets placed onto a route by hand.
  const runId: string | undefined = route?.params?.runId;
  const runRoute: string | undefined = route?.params?.runRoute;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [slots, setSlots] = useState<Record<string, CollectionSlot>>({});

  const [routeName, setRouteName] = useState(runRoute || '');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [country, setCountry] = useState<CountryFilter>('All');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Record<string, Pick>>({});
  // Shown to any customer whose chosen window dispatch cannot honour.
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [shipmentResult, scheduleResult, driverResult] = await Promise.all([
        supabase.from('shipments')
          .select('id,tracking_number,customer_reference,collection_status,collection_schedule_id,collection_run_id,status,pickup_latitude,pickup_longitude,metadata')
          .is('deleted_at', null).limit(1000),
        supabase.from('collection_schedules').select('id,route,country,pickup_date').limit(300),
        supabase.from('profiles').select('id,full_name,email,role,driver_type')
          .or('role.eq.driver,role.eq.admin,role.eq.logistics,is_admin.eq.true').order('full_name'),
      ]);
      if (shipmentResult.error) throw shipmentResult.error;
      // `collection_status` is stale across this data — plenty of shipments it
      // still calls uncollected are already In Transit or Delivered — so the
      // real status is what decides whether something is route material.
      const pending = ((shipmentResult.data as Shipment[]) || [])
        .filter((s) => String(s.collection_status || 'Awaiting Collection') !== 'Collected')
        .filter((s) => ['booking confirmed', 'confirmed', 'pending'].includes(String(s.status || '').toLowerCase()));
      setShipments(runId ? pending.filter((s) => s.collection_run_id === runId) : pending);
      setSchedules(scheduleResult.error ? [] : ((scheduleResult.data as ScheduleRow[]) || []));
      setDrivers(driverResult.error ? [] : ((driverResult.data as Driver[]) || []));

      const open = ((shipmentResult.data as Shipment[]) || [])
        .filter((s) => String(s.collection_status || 'Awaiting Collection') !== 'Collected');
      setSlots(await loadSlots(open.map((s) => s.id)).catch(() => ({})));
    } catch (e: any) {
      setError(e?.message || 'Could not load open collections.');
    }
  }, [runId]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const routeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of schedules) if (s.route) names.add(s.route.trim());
    for (const s of shipments) { const r = routeOf(s); if (r && r !== 'To be assigned') names.add(r); }
    return [...names].sort();
  }, [schedules, shipments]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return shipments
      .filter((s) => country === 'All' || countryOf(s) === country)
      .filter((s) => {
        if (!text) return true;
        return [customerName(s), addressOf(s), s.customer_reference, s.tracking_number, routeOf(s)]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(text));
      })
      .sort((a, b) => customerName(a).localeCompare(customerName(b)))
      .slice(0, 120);
  }, [country, query, shipments]);

  const pickedIds = Object.keys(picked);
  const toggle = (id: string) => setPicked((current) => {
    if (current[id]) { const next = { ...current }; delete next[id]; return next; }
    // Start from what the customer asked for; a flexible customer starts blank
    // because any window suits and dispatch should pick whatever routes best.
    const slot = slots[id];
    const adopt = slot && slot.requested_at && !slot.requested_flexible
      ? { from: hhmm(slot.requested_start), to: hhmm(slot.requested_end) }
      : { from: '', to: '' };
    return { ...current, [id]: adopt };
  });
  const setWindow = (id: string, part: keyof Pick, value: string) =>
    setPicked((current) => ({ ...current, [id]: { ...current[id], [part]: value } }));

  const create = async () => {
    if (!routeName.trim()) { Alert.alert('Name the route', 'Give this route a name so drivers and the board can identify it.'); return; }
    if (!driverId) { Alert.alert('Choose a driver', 'A route needs the driver who will work it.'); return; }
    if (!pickedIds.length) { Alert.alert('Add collections', 'Select at least one collection to put on the route.'); return; }

    // A half-entered window is worse than none: it would tell a driver to
    // arrive inside a range dispatch never actually agreed with the customer.
    for (const id of pickedIds) {
      const { from, to } = picked[id];
      if (from.trim() && parseTime(from) == null) { Alert.alert('Check the times', 'Use 24-hour times such as 09:00 or 14:30.'); return; }
      if (to.trim() && parseTime(to) == null) { Alert.alert('Check the times', 'Use 24-hour times such as 09:00 or 14:30.'); return; }
      const a = parseTime(from); const b = parseTime(to);
      if (a != null && b != null && b <= a) { Alert.alert('Check the times', 'Each availability window must end after it starts.'); return; }
    }

    setSaving(true);
    try {
      // One run per driver per day is a database rule, so an existing run for
      // this driver is extended rather than duplicated.
      const existing = await supabase.from('driver_runs')
        .select('id').eq('driver_id', driverId).eq('run_date', runDate).maybeSingle();
      let driverRunId = existing.data?.id as string | undefined;
      if (!driverRunId) {
        const created = await supabase.from('driver_runs').insert({
          driver_id: driverId,
          run_date: runDate,
          status: 'planned',
          // driver_runs.run_type is ('pickup','delivery') - a collection run
          // is a pickup run. Stops carry the 'collection' stop_type.
          run_type: 'pickup',
          route_name: routeName.trim(),
          created_by: session?.user.id ?? null,
        }).select('id').single();
        if (created.error) throw created.error;
        driverRunId = created.data.id as string;
      } else {
        await supabase.from('driver_runs').update({ route_name: routeName.trim() }).eq('id', driverRunId);
      }

      // Tie the driver's run back to the collection group, so the groups board
      // shows who is on it instead of "No driver" forever.
      if (runId) {
        await supabase.from('collection_runs')
          .update({ driver_run_id: driverRunId, status: 'active' }).eq('id', runId);
      }

      const current = await supabase.from('driver_run_stops')
        .select('shipment_id,stop_order').eq('run_id', driverRunId);
      if (current.error) throw current.error;
      const already = new Set((current.data || []).map((r: any) => r.shipment_id));
      let order = (current.data || []).reduce((max: number, r: any) => Math.max(max, Number(r.stop_order) || 0), 0);

      const rows = pickedIds.filter((id) => !already.has(id)).map((id) => {
        const shipment = shipments.find((s) => s.id === id)!;
        const win = picked[id];
        order += 1;
        return {
          run_id: driverRunId,
          shipment_id: id,
          stop_order: order,
          stop_type: 'collection',
          status: 'planned',
          address: addressOf(shipment) || null,
          latitude: shipment.pickup_latitude,
          longitude: shipment.pickup_longitude,
          recipient_name: customerName(shipment),
          time_window_start: windowStamp(runDate, win.from),
          time_window_end: windowStamp(runDate, win.to),
        };
      });

      const skipped = pickedIds.length - rows.length;
      if (rows.length) {
        const inserted = await supabase.from('driver_run_stops').insert(rows);
        if (inserted.error) throw inserted.error;
      }

      // The stop carries the window for the driver; the slot carries it for the
      // customer. Writing the slot is what notifies anyone being moved off the
      // time they chose, and what puts the "call them" obligation on the run.
      const moved: string[] = [];
      for (const id of pickedIds) {
        const win = picked[id];
        if (!win.from.trim() || !win.to.trim()) continue;
        try {
          const result = await setDispatchWindow(id, win.from.trim(), win.to.trim(), reason.trim() || undefined);
          if (result?.moved) moved.push(customerName(shipments.find((s) => s.id === id)!));
        } catch (e) {
          // A slot that will not save must not lose dispatch the route it just
          // built — the run is already sound, the customer just has not been
          // told, and the run screen will keep showing that.
          console.warn('Could not record the collection window', e);
        }
      }

      Alert.alert(
        'Route created',
        `${rows.length} collection${rows.length === 1 ? '' : 's'} added to ${routeName.trim()}.`
          + (skipped ? ` ${skipped} were already on this driver's run.` : '')
          + (moved.length
            ? `

${moved.length} customer${moved.length === 1 ? ' was' : 's were'} moved off the time they chose: ${moved.join(', ')}. `
              + 'They have been notified in the app — WhatsApp or ring them from the run screen and mark it done.'
            : ''),
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      const denied = /row-level security|permission denied/i.test(e?.message || '');
      Alert.alert('Route not created', denied
        ? 'This account is not allowed to build routes. Dispatch accounts need operations permission before they can assign work.'
        : e?.message || 'Check your connection and try again.');
    } finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>DISPATCH</Text>
            <Text style={styles.title}>{runRoute || 'Build a route'}</Text>
            <Text style={styles.subtitle}>
              {new Date(`${runDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {runId ? ` · this group only` : ' · all open collections'}
            </Text>
          </View>
        </View>

        {error ? <EmptyState icon="cloud-offline-outline" title="Could not load collections" text={error} /> : null}

        <SectionLabel text="Route name" />
        <TextInput
          style={styles.input} value={routeName} onChangeText={setRouteName}
          placeholder="e.g. DUBLIN CITY" placeholderTextColor={colors.textFaint} autoCapitalize="characters"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {routeOptions.map((name) => (
            <Pressable accessibilityRole="button" key={name} style={[styles.chip, routeName === name && styles.chipActive]} onPress={() => setRouteName(name)}>
              <Text style={[styles.chipText, routeName === name && styles.chipTextActive]}>{name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionLabel text="Driver" />
        <View style={styles.driverList}>
          {drivers.length === 0 ? <EmptyState icon="person-outline" title="No drivers" text="Add a driver account before building a route." /> : drivers.map((d) => (
            <Pressable accessibilityRole="button" key={d.id} style={[styles.driverRow, driverId === d.id && styles.driverRowActive]} onPress={() => setDriverId(d.id)}>
              <Avatar name={d.full_name || d.email} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{d.full_name || d.email || 'Driver'}</Text>
                <Text style={styles.driverMeta}>{(d.driver_type || 'both') === 'delivery' ? 'Delivery driver' : 'Collection driver'}</Text>
              </View>
              <Ionicons name={driverId === d.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={driverId === d.id ? colors.primary : colors.textFaint} />
            </Pressable>
          ))}
        </View>

        <SectionLabel text={`Collections${pickedIds.length ? ` · ${pickedIds.length} selected` : ''}`} />
        <View style={styles.filterRow}>
          {COUNTRY_FILTERS.map((option) => (
            <Pressable accessibilityRole="button" key={option} style={[styles.filter, country === option && styles.filterActive]} onPress={() => setCountry(option)}>
              <Text style={[styles.filterText, country === option && styles.filterTextActive]}>{option === 'United Kingdom' ? 'UK' : option.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <SearchBar value={query} onChange={setQuery} placeholder="Customer, reference, address or route" />

        {visible.length === 0 ? (
          <EmptyState icon="cube-outline" title="No open collections" text="Every booking matching this filter has already been collected." />
        ) : visible.map((s) => {
          const selected = Boolean(picked[s.id]);
          const slot = slots[s.id];
          const asked = Boolean(slot?.requested_at) && !slot.requested_flexible;
          // Called out only while it is still true, so it reads as a live
          // warning rather than decoration sitting on every row.
          const overriding = Boolean(selected && asked
            && (picked[s.id].from.trim() || picked[s.id].to.trim())
            && (picked[s.id].from.trim() !== hhmm(slot.requested_start)
              || picked[s.id].to.trim() !== hhmm(slot.requested_end)));
          return (
            <View key={s.id} style={[styles.collection, selected && styles.collectionActive]}>
              <Pressable accessibilityRole="button" style={styles.collectionTop} onPress={() => toggle(s.id)}>
                <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={selected ? colors.primary : colors.textFaint} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.collectionName}>{customerName(s)}</Text>
                  <Text style={styles.collectionMeta}>{s.customer_reference || s.tracking_number || '—'} · {countryOf(s)}{routeOf(s) ? ` · ${routeOf(s)}` : ''}</Text>
                  <Text style={styles.collectionAddress} numberOfLines={2}>{addressOf(s) || 'No address recorded'}</Text>
                  <View style={styles.askedRow}>
                    <Ionicons
                      name={asked ? 'time' : slot?.requested_flexible ? 'infinite' : 'help-circle-outline'}
                      size={13}
                      color={asked || slot?.requested_flexible ? colors.primaryDark : colors.textFaint}
                    />
                    <Text style={[styles.askedText, (asked || slot?.requested_flexible) && { color: colors.primaryDark }]}>
                      {slot?.requested_at ? `Customer asked for ${requestedLabel(slot)}` : 'No time chosen yet'}
                    </Text>
                  </View>
                </View>
              </Pressable>
              {selected ? (
                <>
                  <View style={styles.windowRow}>
                    <Text style={styles.windowLabel}>COLLECT</Text>
                    <TextInput
                      style={styles.timeInput} value={picked[s.id].from} onChangeText={(v) => setWindow(s.id, 'from', v)}
                      placeholder="09:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5}
                    />
                    <Text style={styles.windowDash}>to</Text>
                    <TextInput
                      style={styles.timeInput} value={picked[s.id].to} onChangeText={(v) => setWindow(s.id, 'to', v)}
                      placeholder="12:00" placeholderTextColor={colors.textFaint} keyboardType="numbers-and-punctuation" maxLength={5}
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {SLOT_WINDOWS.map((w) => {
                      const active = picked[s.id].from.trim() === w.start && picked[s.id].to.trim() === w.end;
                      const theirs = asked && hhmm(slot.requested_start) === w.start && hhmm(slot.requested_end) === w.end;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={w.start}
                          onPress={() => setPicked((c) => ({ ...c, [s.id]: { from: w.start, to: w.end } }))}
                          style={[styles.slotChip, theirs && styles.slotChipTheirs, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, theirs && { color: colors.primaryDark }, active && styles.chipTextActive]}>
                            {theirs ? '★ ' : ''}{windowLabel(w.start, w.end)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {overriding ? (
                    <View style={styles.overrideRow}>
                      <Ionicons name="warning-outline" size={14} color="#8a6d00" />
                      <Text style={styles.overrideText}>
                        Moving {customerName(s)} off {requestedLabel(slot)}. They are notified in the app — you still owe them a WhatsApp or a call.
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          );
        })}
        {pickedIds.some((id) => {
          const slot = slots[id];
          return slot?.requested_at && !slot.requested_flexible
            && (picked[id].from.trim() !== hhmm(slot.requested_start) || picked[id].to.trim() !== hhmm(slot.requested_end));
        }) ? (
          <>
            <SectionLabel text="Why the change?" />
            <TextInput
              style={styles.input} value={reason} onChangeText={setReason}
              placeholder="e.g. van is coming from Luton first" placeholderTextColor={colors.textFaint}
            />
            <Text style={styles.reasonHint}>Sent to every customer you moved. A reason turns a broken promise into a heads-up.</Text>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerCount}>{pickedIds.length} collection{pickedIds.length === 1 ? '' : 's'} selected</Text>
        <Pressable accessibilityRole="button" style={[styles.create, saving && { opacity: 0.6 }]} onPress={create} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <>
            <Ionicons name="add-circle-outline" size={19} color={colors.white} />
            <Text style={styles.createText}>CREATE ROUTE</Text>
          </>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 140, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 13, minHeight: 46, color: colors.text, fontWeight: '700' },
  chipRow: { gap: 7, paddingVertical: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  driverList: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  driverRowActive: { backgroundColor: colors.primarySoft },
  driverName: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  driverMeta: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, backgroundColor: '#E9EEF1', padding: 3, borderRadius: radius.sm },
  filter: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  filterActive: { backgroundColor: colors.primaryDark },
  filterText: { fontSize: 10, fontWeight: '900', color: colors.textMuted },
  filterTextActive: { color: colors.white },
  collection: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
  collectionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  collectionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  collectionName: { color: colors.text, fontSize: 13.5, fontWeight: '800' },
  collectionMeta: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  collectionAddress: { color: colors.textMuted, fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  windowLabel: { fontSize: 9, fontWeight: '900', color: colors.primaryDark, letterSpacing: 0.8 },
  timeInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, minHeight: 40, paddingHorizontal: 11, color: colors.text, fontWeight: '800', textAlign: 'center' },
  windowDash: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  askedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  askedText: { fontSize: 10.5, fontWeight: '800', color: colors.textFaint },
  slotChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  slotChipTheirs: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  overrideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, backgroundColor: '#FEF6DC', borderRadius: radius.sm, padding: 9 },
  overrideText: { flex: 1, fontSize: 10.5, fontWeight: '700', color: '#8a6d00', lineHeight: 15 },
  reasonHint: { fontSize: 10.5, color: colors.textMuted, marginTop: 5, lineHeight: 15 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  footerCount: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textAlign: 'center' },
  create: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: radius.sm, backgroundColor: colors.primary },
  createText: { color: colors.white, fontWeight: '900', fontSize: 13, letterSpacing: 0.6 },
});
