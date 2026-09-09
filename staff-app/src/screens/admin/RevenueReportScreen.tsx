import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors, radius, shadow, spacing } from '../../theme';
import {
  barFractions, fetchOperationsReport, fetchReportPeriods, pieSlices, symbolFor,
  type OperationsReport, type PeriodOption, type RouteRow,
} from '../../lib/operationsReport';

/**
 * What the business made, on a phone.
 *
 * Same figures as the website, from the same `operations_report` function —
 * nothing is recomputed here, so the number an admin quotes from their phone is
 * the number finance sees on the desktop.
 *
 * Charts are drawn with react-native-svg rather than pulling in a charting
 * library: two bar charts and one pie is not worth a dependency in an app that
 * has to build for both stores.
 */

const SLICE_COLOURS = [
  colors.primary, colors.blue, colors.orange, colors.purple,
  colors.cyan, colors.gold, '#be185d', '#15803d',
];

const money = (value: number, currency: string) =>
  `${symbolFor(currency)}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

/** Compact for axis labels, where the pennies are noise. */
const shortMoney = (value: number, currency: string) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) return `${symbolFor(currency)}${(n / 1000).toFixed(1)}k`;
  return `${symbolFor(currency)}${Math.round(n)}`;
};

export default function RevenueReportScreen() {
  const navigation = useNavigation<any>();
  const [report, setReport] = useState<OperationsReport | null>(null);
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which collection period the report covers; '' means every period. */
  const [periodId, setPeriodId] = useState('');
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);

  useEffect(() => { fetchReportPeriods().then(setPeriodOptions).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setError(null);
    const result = await fetchOperationsReport(periodId || null);
    if (!result.ok) setError(result.message);
    else {
      setReport(result.data);
      setCurrency((current) => current || result.data.totals?.[0]?.currency || 'GBP');
    }
    setLoading(false);
    setRefreshing(false);
  }, [periodId]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(
    () => report?.totals?.find((t) => t.currency === currency) || null,
    [report, currency],
  );
  const routes = useMemo(
    () => (report?.routes || []).filter((r) => r.currency === currency && r.invoiced > 0),
    [report, currency],
  );
  const items = useMemo(
    () => (report?.items || []).filter((i) => i.currency === currency && i.quantity > 0).slice(0, 6),
    [report, currency],
  );
  const namedRoutes = useMemo(() => routes.filter((r) => r.route !== 'No route'), [routes]);
  const unrouted = useMemo(() => routes.find((r) => r.route === 'No route') || null, [routes]);

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
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}
          onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Revenue reports</Text>
          <Text style={styles.subtitle}>Issued invoices only</Text>
        </View>
        <View style={styles.currencyRow}>
          {(report?.totals || []).map((t) => (
            <Pressable
              key={t.currency}
              onPress={() => setCurrency(t.currency)}
              style={[styles.currencyChip, t.currency === currency && styles.currencyChipOn]}
            >
              <Text style={[styles.currencyText, t.currency === currency && { color: colors.white }]}>
                {t.currency}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Shipments live under a collection period on every other screen, so the
          report is scoped the same way rather than by a date range. */}
      {periodOptions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // A horizontal ScrollView inside a column will otherwise stretch to
          // fill the screen and squash the chips to a sliver.
          style={styles.periodScroll}
          contentContainerStyle={styles.periodRow}
        >
          <Pressable
            onPress={() => setPeriodId('')}
            style={[styles.periodChip, periodId === '' && styles.periodChipOn]}
          >
            <Text style={[styles.periodText, periodId === '' && { color: colors.white }]}>All periods</Text>
          </Pressable>
          {periodOptions.map((option) => (
            <Pressable
              key={option.periodId}
              onPress={() => setPeriodId(option.periodId)}
              style={[styles.periodChip, periodId === option.periodId && styles.periodChipOn]}
            >
              <Text style={[styles.periodText, periodId === option.periodId && { color: colors.white }]}>
                {option.name} ({option.shipments})
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        {report?.awaitingInvoice ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {report.awaitingInvoice} booking{report.awaitingInvoice === 1 ? '' : 's'} priced but not
              invoiced — not counted below.
            </Text>
          </View>
        ) : null}

        <View style={styles.statGrid}>
          <Stat label="Invoiced" value={money(totals?.invoiced || 0, currency)} />
          <Stat label="Paid" value={money(totals?.paid || 0, currency)} tone={colors.primaryDark} />
          <Stat
            label="Outstanding"
            value={money(totals?.outstanding || 0, currency)}
            tone={(totals?.outstanding || 0) > 0 ? colors.danger : colors.primaryDark}
          />
          <Stat
            label="Per consignment"
            value={money(totals?.per_consignment || 0, currency)}
            hint={`over ${totals?.shipments || 0}`}
          />
        </View>

        <View style={styles.pairRow}>
          <RouteHighlight
            heading="HIGHEST EARNING"
            route={namedRoutes[0] || null}
            currency={currency}
            tone={colors.primaryDark}
            empty="No named route has earned yet."
          />
          <RouteHighlight
            heading="LOWEST EARNING"
            route={namedRoutes.length > 1 ? namedRoutes[namedRoutes.length - 1] : null}
            currency={currency}
            tone={colors.amber}
            empty="Only one route so far."
          />
        </View>

        {unrouted ? (
          <Text style={styles.footnote}>
            {money(unrouted.invoiced, currency)} across {unrouted.shipments} shipment
            {unrouted.shipments === 1 ? '' : 's'} sits on no route at all.
          </Text>
        ) : null}

        <Text style={styles.sectionHeading}>Revenue by route</Text>
        <View style={styles.card}>
          {routes.length === 0 ? (
            <Text style={styles.empty}>Nothing invoiced in {currency} yet.</Text>
          ) : (
            <RouteBars rows={routes} currency={currency} />
          )}
        </View>

        <Text style={styles.sectionHeading}>What people ship most</Text>
        <View style={styles.card}>
          {items.length === 0 ? (
            <Text style={styles.empty}>No invoice lines in {currency} yet.</Text>
          ) : (
            <ItemPie rows={items} currency={currency} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Horizontal bars that grow on mount.
 *
 * The animation runs once. A bar that re-animates whenever the list re-renders
 * makes the numbers harder to read, not livelier.
 */
function RouteBars({ rows, currency }: { rows: RouteRow[]; currency: string }) {
  const grow = useRef(new Animated.Value(0)).current;
  const fractions = useMemo(() => barFractions(rows, (r) => r.invoiced), [rows]);
  const paidFractions = useMemo(() => barFractions(rows, (r) => r.paid), [rows]);

  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      // Width cannot be driven on the native thread, so this one stays on JS.
      useNativeDriver: false,
    }).start();
  }, [grow, rows]);

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row, index) => (
        <View key={`${row.route}-${row.currency}`}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel} numberOfLines={1}>{row.route}</Text>
            <Text style={styles.barValue}>{money(row.invoiced, currency)}</Text>
          </View>
          <View style={styles.barTrack}>
            <Animated.View
              style={[styles.barFill, {
                width: grow.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${Math.round(fractions[index] * 100)}%`],
                }),
              }]}
            />
            <Animated.View
              style={[styles.barPaid, {
                width: grow.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', `${Math.round(paidFractions[index] * 100)}%`],
                }),
              }]}
            />
          </View>
          <Text style={styles.barMeta}>
            {row.shipments} shipment{row.shipments === 1 ? '' : 's'} · {money(row.paid, currency)} paid
            {row.outstanding > 0 ? ` · ${money(row.outstanding, currency)} out` : ''}
          </Text>
        </View>
      ))}
      <View style={styles.legendRow}>
        <Legend colour={colors.primary} label="Invoiced" />
        <Legend colour={colors.blue} label="Paid" />
      </View>
    </View>
  );
}

/** A donut, drawn as arc paths so it needs no charting library. */
function ItemPie({ rows, currency }: { rows: Array<{ item: string; quantity: number; revenue: number }>; currency: string }) {
  const size = 190;
  const centre = size / 2;
  const outer = 88;
  const inner = 48;
  const slices = useMemo(() => pieSlices(rows, (r) => r.quantity), [rows]);
  const total = rows.reduce((sum, r) => sum + r.quantity, 0);

  const arc = (start: number, end: number) => {
    // A full circle cannot be expressed as a single arc — its start and end
    // points are identical, so the path collapses to nothing. Two halves.
    if (end - start >= 0.9999) {
      return [
        `M ${centre} ${centre - outer}`,
        `A ${outer} ${outer} 0 1 1 ${centre} ${centre + outer}`,
        `A ${outer} ${outer} 0 1 1 ${centre} ${centre - outer}`,
        `M ${centre} ${centre - inner}`,
        `A ${inner} ${inner} 0 1 0 ${centre} ${centre + inner}`,
        `A ${inner} ${inner} 0 1 0 ${centre} ${centre - inner}`,
        'Z',
      ].join(' ');
    }
    const a0 = start * 2 * Math.PI - Math.PI / 2;
    const a1 = end * 2 * Math.PI - Math.PI / 2;
    const large = end - start > 0.5 ? 1 : 0;
    const x0 = centre + outer * Math.cos(a0);
    const y0 = centre + outer * Math.sin(a0);
    const x1 = centre + outer * Math.cos(a1);
    const y1 = centre + outer * Math.sin(a1);
    const xi1 = centre + inner * Math.cos(a1);
    const yi1 = centre + inner * Math.sin(a1);
    const xi0 = centre + inner * Math.cos(a0);
    const yi0 = centre + inner * Math.sin(a0);
    return [
      `M ${x0} ${y0}`,
      `A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi1} ${yi1}`,
      `A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0}`,
      'Z',
    ].join(' ');
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <Svg width={size} height={size}>
        <G>
          {rows.map((row, index) => {
            const slice = slices[index];
            if (!slice || slice.end <= slice.start) return null;
            return (
              <Path
                key={row.item}
                d={arc(slice.start, slice.end)}
                fill={SLICE_COLOURS[index % SLICE_COLOURS.length]}
              />
            );
          })}
          {total <= 0 ? <Circle cx={centre} cy={centre} r={outer} fill={colors.border} /> : null}
        </G>
      </Svg>
      <View style={{ alignSelf: 'stretch', gap: 6 }}>
        {rows.map((row, index) => (
          <View key={row.item} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: SLICE_COLOURS[index % SLICE_COLOURS.length] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{row.item}</Text>
            <Text style={styles.legendValue}>×{row.quantity}</Text>
            <Text style={styles.legendMoney}>{shortMoney(row.revenue, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function RouteHighlight({ heading, route, currency, tone, empty }: {
  heading: string; route: RouteRow | null; currency: string; tone: string; empty: string;
}) {
  return (
    <View style={[styles.card, { flex: 1 }]}>
      <Text style={styles.cardHeading}>{heading}</Text>
      {route ? (
        <>
          <Text style={styles.routeName} numberOfLines={2}>{route.route}</Text>
          <Text style={[styles.routeMoney, { color: tone }]}>{money(route.invoiced, currency)}</Text>
          <Text style={styles.barMeta}>
            {route.shipments} · {money(route.per_consignment, currency)} each
          </Text>
        </>
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
    </View>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.dot, { backgroundColor: colour }]} />
      <Text style={styles.legendLabel}>{label}</Text>
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
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  currencyChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyText: { fontSize: 11, fontWeight: '900', color: colors.textMuted },
  periodScroll: { flexGrow: 0, flexShrink: 0 },
  periodRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 6, alignItems: 'center' },
  periodChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  periodChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 60 },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 12.5 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: '46%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow },
  statLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  statHint: { fontSize: 10.5, color: colors.textFaint, marginTop: 1 },
  pairRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 6, ...shadow },
  cardHeading: { fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 },
  routeName: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 2 },
  routeMoney: { fontSize: 18, fontWeight: '900', marginTop: 1 },
  sectionHeading: { fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 2 },
  footnote: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  barLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  barValue: { fontSize: 13, fontWeight: '800', color: colors.text },
  barTrack: { height: 16, borderRadius: 8, backgroundColor: colors.bg, marginTop: 5, overflow: 'hidden', justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, height: 16, borderRadius: 8, backgroundColor: colors.primary },
  barPaid: { position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: colors.blue, marginLeft: 0 },
  barMeta: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12, color: colors.text },
  legendValue: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  legendMoney: { fontSize: 12, fontWeight: '800', color: colors.text, minWidth: 54, textAlign: 'right' },
});
