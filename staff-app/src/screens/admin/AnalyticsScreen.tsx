import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import {
  AdminReport, RangeKey, ReportFilters, rangeFor, fetchAdminReport, currencyLine,
  shareReportCsv, shareReportPdf,
} from '../../lib/reports';
import { ScreenHeader, Card, SectionLabel, SkeletonList, ErrorState, LineChart, Donut, LegendRow, TrendChip, Segmented } from '../../components/adminui';

// Analytics: the same server aggregate as Reports, sliced with filters
// (country / route / driver / status / currency) and richer charts.

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
];

const DONUT_COLORS: Record<string, string> = {
  delivered: colors.primary,
  transit: colors.cyan,
  collected: colors.purple,
  pending: colors.orange,
  cancelled: colors.danger,
  other: '#94a3b8',
};

function statusBucket(status: string): keyof typeof DONUT_COLORS {
  const s = status.toLowerCase();
  if (s.includes('deliver') && !s.includes('out for')) return 'delivered';
  if (s.includes('transit') || s.includes('out for') || s.includes('customs') || s.includes('warehouse') || s.includes('processing')) return 'transit';
  if (s.includes('collect')) return 'collected';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('pending') || s.includes('confirm') || s.includes('booking') || s.includes('ready')) return 'pending';
  return 'other';
}

export default function AnalyticsScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2;
  const [rangeKey, setRangeKey] = useState<RangeKey>('last30');
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [routes, setRoutes] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const range = rangeFor(rangeKey);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await fetchAdminReport(range.from, range.to, filters));
    } catch (e: any) {
      setError(e?.message || 'Could not load analytics.');
    }
  }, [filters, range.from, range.to]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  useEffect(() => {
    (async () => {
      const [scheduleResult, driverResult] = await Promise.all([
        supabase.from('collection_schedules').select('route').limit(200),
        supabase.from('profiles').select('id,full_name,email').eq('role', 'driver'),
      ]);
      setRoutes([...new Set(((scheduleResult.data || []) as any[]).map((r) => r.route).filter(Boolean))].sort());
      setDrivers(((driverResult.data || []) as any[]).map((d) => ({ id: d.id, name: d.full_name || d.email || 'Driver' })));
    })();
  }, []);

  const shipmentSeries = useMemo(() => {
    if (!report) return [];
    const points = report.shipments.series.map((p) => ({
      label: new Date(`${p.day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: p.count,
      day: p.day,
    }));
    if (mode === 'daily') return points;
    // Weekly rollup.
    const weeks = new Map<string, { label: string; value: number; day: string }>();
    for (const p of points) {
      const d = new Date(`${p.day}T12:00:00`);
      const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const existing = weeks.get(key) || { label: `w/c ${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`, value: 0, day: key };
      existing.value += p.value;
      weeks.set(key, existing);
    }
    return [...weeks.values()];
  }, [mode, report]);

  const donutSlices = useMemo(() => {
    if (!report) return [];
    const buckets = new Map<string, number>();
    for (const [status, count] of Object.entries(report.shipments.byStatus)) {
      const bucket = statusBucket(status);
      buckets.set(bucket, (buckets.get(bucket) || 0) + Number(count));
    }
    const order = ['delivered', 'transit', 'collected', 'pending', 'cancelled', 'other'];
    return order.filter((b) => buckets.get(b)).map((b) => ({
      label: b === 'transit' ? 'In Transit' : b.charAt(0).toUpperCase() + b.slice(1),
      value: buckets.get(b)!,
      color: DONUT_COLORS[b],
    }));
  }, [report]);
  const donutTotal = donutSlices.reduce((s, x) => s + x.value, 0);

  const setFilter = (key: keyof ReportFilters, value: string | undefined) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }));

  const doExport = (kind: 'pdf' | 'csv') => {
    if (!report) return;
    setExporting(true);
    (kind === 'pdf' ? shareReportPdf(report, 'Analytics Report') : shareReportCsv(report))
      .catch((e: any) => Alert.alert('Export failed', e?.message || 'Try again.'))
      .finally(() => setExporting(false));
  };

  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader
          title="Analytics"
          subtitle={`${range.from} — ${range.to}`}
          right={
            <View style={styles.exportRow}>
              <Pressable style={[styles.exportButton, exporting && { opacity: 0.5 }]} disabled={exporting || !report} onPress={() => doExport('pdf')}>
                <Ionicons name="document-outline" size={15} color={colors.primaryDark} /><Text style={styles.exportText}>PDF</Text>
              </Pressable>
              <Pressable style={[styles.exportButton, exporting && { opacity: 0.5 }]} disabled={exporting || !report} onPress={() => doExport('csv')}>
                <Ionicons name="share-outline" size={15} color={colors.primaryDark} /><Text style={styles.exportText}>CSV</Text>
              </Pressable>
            </View>
          }
        />

        <Segmented options={['week', 'month', 'last30'] as const} value={rangeKey as any} onChange={(v) => setRangeKey(v)}
          labels={{ week: 'This week', month: 'This month', last30: 'Last 30 days' }} />

        {/* Filters */}
        <SectionLabel text="Filters" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['United Kingdom', 'Ireland'] as const).map((c) => (
            <FilterChip key={c} label={c === 'United Kingdom' ? 'UK' : 'Ireland'} active={filters.country === c} onPress={() => setFilter('country', c)} />
          ))}
          {(['GBP', 'EUR'] as const).map((c) => (
            <FilterChip key={c} label={c} active={filters.currency === c} onPress={() => setFilter('currency', c)} />
          ))}
          {routes.slice(0, 12).map((r) => (
            <FilterChip key={r} label={r.replace(' ROUTE', '')} active={filters.route === r} onPress={() => setFilter('route', r)} />
          ))}
          {drivers.slice(0, 10).map((d) => (
            <FilterChip key={d.id} label={d.name.split(' ')[0]} active={filters.driver === d.id} onPress={() => setFilter('driver', d.id)} />
          ))}
        </ScrollView>
        {activeFilters.length ? (
          <Pressable style={styles.clearFilters} onPress={() => setFilters({})}>
            <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
            <Text style={styles.clearFiltersText}>Clear {activeFilters.length} filter{activeFilters.length === 1 ? '' : 's'}</Text>
          </Pressable>
        ) : null}

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading || !report ? (error ? null : <SkeletonList rows={5} />) : (
          <>
            {/* Top metrics */}
            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>TOTAL SHIPMENTS</Text>
                <Text style={styles.metricValue}>{report.shipments.total}</Text>
                <TrendChip current={report.shipments.total} previous={report.shipments.prevTotal} />
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>TOTAL REVENUE</Text>
                <Text style={styles.metricValueSmall}>{currencyLine(report.revenue.byCurrency)}</Text>
                <TrendChip
                  current={Object.values(report.revenue.byCurrency).reduce((s, v) => s + Number(v), 0)}
                  previous={Object.values(report.revenue.prevByCurrency).reduce((s, v) => s + Number(v), 0)} />
              </Card>
            </View>

            {/* Shipments over time */}
            <Card>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Shipments over time</Text>
                <Segmented options={['daily', 'weekly'] as const} value={mode} onChange={setMode} />
              </View>
              <LineChart width={chartWidth} points={shipmentSeries} />
              <View style={styles.pointRow}>
                {shipmentSeries.map((p) => (
                  <Pressable key={p.day} style={[styles.pointChip, selectedPoint === p.day && styles.pointChipActive]}
                    onPress={() => setSelectedPoint(selectedPoint === p.day ? null : p.day)}>
                    <Text style={[styles.pointText, selectedPoint === p.day && { color: colors.white }]}>{p.label}: {p.value}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Status donut */}
            <Card>
              <Text style={styles.cardTitle}>Shipments by status</Text>
              <View style={styles.donutRow}>
                <Donut slices={donutSlices} />
                <View style={{ flex: 1 }}>
                  {donutSlices.map((s) => (
                    <LegendRow key={s.label} color={s.color} label={s.label} value={s.value} percent={donutTotal ? (s.value / donutTotal) * 100 : 0} />
                  ))}
                </View>
              </View>
            </Card>

            <SectionLabel text="Breakdowns" />
            <Card>
              <Text style={styles.cardTitle}>Shipments by route</Text>
              {report.shipments.byRoute.map((r) => (
                <BreakdownRow key={r.route} label={r.route} value={String(r.count)} />
              ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Revenue by route</Text>
              {report.revenue.byRoute.length === 0 ? <Text style={styles.muted}>No routed revenue in this range.</Text>
                : report.revenue.byRoute.map((r, i) => (
                  <BreakdownRow key={`${r.route}-${i}`} label={r.route} value={`${r.currency === 'EUR' ? '€' : '£'}${Number(r.total).toFixed(2)}`} />
                ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Collections by route</Text>
              {report.collections.byRoute.map((r) => (
                <BreakdownRow key={r.route} label={r.route} value={`${r.done} done${r.failed ? ` · ${r.failed} failed` : ''}`} />
              ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Driver performance</Text>
              {report.driverPerformance.map((d) => (
                <BreakdownRow key={d.driverId} label={d.name} value={`${d.completed} done${d.failed ? ` · ${d.failed} failed` : ''}`} />
              ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Payment methods</Text>
              {report.revenue.byMethod.map((r, i) => (
                <BreakdownRow key={`${r.method}-${i}`} label={r.method} value={`${r.currency === 'EUR' ? '€' : '£'}${Number(r.total).toFixed(2)}`} />
              ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Failed-stop reasons</Text>
              {Object.keys(report.failReasons).length === 0 ? <Text style={styles.muted}>No exceptions in this range.</Text>
                : Object.entries(report.failReasons).map(([reason, count]) => (
                  <BreakdownRow key={reason} label={reason.replace(/_/g, ' ')} value={String(count)} />
                ))}
            </Card>
            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>QUOTE CONVERSION</Text>
                <Text style={styles.metricValue}>{report.quotes.requested ? `${Math.round((report.quotes.booked / report.quotes.requested) * 100)}%` : '—'}</Text>
                <Text style={styles.muted}>{report.quotes.booked}/{report.quotes.requested} booked</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>CUSTOMER GROWTH</Text>
                <Text style={styles.metricValue}>{report.customers.new}</Text>
                <Text style={styles.muted}>{report.customers.returning} returning</Text>
              </Card>
            </View>
            <View style={styles.metricRow}>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>DELIVERY SUCCESS</Text>
                <Text style={styles.metricValue}>{report.deliveries.successRate != null ? `${report.deliveries.successRate}%` : '—'}</Text>
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>PROOF VALIDATION</Text>
                <Text style={styles.metricValue}>{report.proofs.avgValidationHours != null ? `${report.proofs.avgValidationHours}h` : '—'}</Text>
                <Text style={styles.muted}>{report.proofs.pending} pending</Text>
              </Card>
            </View>
            <Card>
              <Text style={styles.cardTitle}>Outstanding payments</Text>
              <Text style={styles.metricValueSmall}>{currencyLine(report.outstanding.byCurrency)}</Text>
              <Text style={styles.muted}>{report.outstanding.invoices} unpaid invoice{report.outstanding.invoices === 1 ? '' : 's'}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 11, paddingVertical: 8 },
  exportText: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  filterRow: { gap: spacing.sm, paddingVertical: 2 },
  filterChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 11.5, fontWeight: '700', color: colors.text },
  clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  clearFiltersText: { fontSize: 11.5, fontWeight: '800', color: colors.danger },
  metricRow: { flexDirection: 'row', gap: spacing.sm },
  metricLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  metricValue: { fontSize: 22, fontWeight: '900', color: colors.text, marginVertical: 3 },
  metricValueSmall: { fontSize: 15, fontWeight: '900', color: colors.text, marginVertical: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  muted: { fontSize: 11.5, color: colors.textMuted },
  pointRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  pointChip: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  pointChipActive: { backgroundColor: colors.primary },
  pointText: { fontSize: 9.5, fontWeight: '700', color: colors.textMuted },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  breakdownLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.text },
  breakdownValue: { fontSize: 12.5, fontWeight: '800', color: colors.text },
});
