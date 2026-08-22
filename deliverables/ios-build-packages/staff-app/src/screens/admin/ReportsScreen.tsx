import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../../theme';
import {
  AdminReport, RangeKey, rangeFor, fetchAdminReport, currencyLine, percentChange,
  shareReportCsv, shareReportPdf,
} from '../../lib/reports';
import { ScreenHeader, Card, SectionLabel, SkeletonList, ErrorState, LineChart, BarChart, TrendChip } from '../../components/adminui';
import CalendarModal from '../../components/CalendarModal';
import type { MenuStackParams } from '../../navigation/types';

// Reports: server-aggregated operational and financial reporting with
// date-range selection and PDF / CSV export.

type Props = NativeStackScreenProps<MenuStackParams, 'Reports'>;

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
];

export default function ReportsScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 520) - spacing.lg * 2 - spacing.md * 2;
  const [rangeKey, setRangeKey] = useState<RangeKey>('last30');
  const [custom, setCustom] = useState<{ from: string; to: string }>(rangeFor('last30'));
  const [pickingEnd, setPickingEnd] = useState<null | 'from' | 'to'>(null);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const range = rangeKey === 'custom' ? custom : rangeFor(rangeKey);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await fetchAdminReport(range.from, range.to));
    } catch (e: any) {
      setError(e?.message || 'Could not load the report.');
    }
  }, [range.from, range.to]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const doExport = (kind: 'pdf' | 'csv') => {
    if (!report) return;
    setExporting(true);
    (kind === 'pdf' ? shareReportPdf(report, 'Operations Report') : shareReportCsv(report))
      .catch((e: any) => Alert.alert('Export failed', e?.message || 'Try again.'))
      .finally(() => setExporting(false));
  };

  const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const revGbp = Number(report?.revenue.byCurrency?.GBP || 0);
  const revGbpPrev = Number(report?.revenue.prevByCurrency?.GBP || 0);
  const revEur = Number(report?.revenue.byCurrency?.EUR || 0);
  const revEurPrev = Number(report?.revenue.prevByCurrency?.EUR || 0);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader
          title="Reports"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable key={r.key}
              style={[styles.rangeChip, rangeKey === r.key && styles.rangeChipActive]}
              onPress={() => { if (r.key === 'custom') { setCustom(range); setPickingEnd('from'); } setRangeKey(r.key); }}>
              {r.key === 'custom' ? <Ionicons name="calendar-outline" size={13} color={rangeKey === 'custom' ? colors.white : colors.text} /> : null}
              <Text style={[styles.rangeText, rangeKey === r.key && styles.rangeTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
          {rangeKey === 'custom' ? (
            <Pressable style={styles.clearChip} onPress={() => setRangeKey('last30')}>
              <Ionicons name="close-outline" size={14} color={colors.textMuted} /><Text style={styles.rangeText}>Clear</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading || !report ? (error ? null : <SkeletonList rows={6} />) : (
          <>
            {/* Revenue */}
            <Card onPress={() => navigation.navigate('Analytics')}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Revenue</Text>
                <TrendChip current={revGbp + revEur} previous={revGbpPrev + revEurPrev} />
              </View>
              <Text style={styles.bigValue}>{currencyLine(report.revenue.byCurrency)}</Text>
              <Text style={styles.compare}>Previous period: {currencyLine(report.revenue.prevByCurrency)}</Text>
              <LineChart
                width={chartWidth}
                points={report.revenue.series.map((p) => ({ label: dayLabel(p.day), value: Number(p.gbp || 0) + Number(p.eur || 0) }))}
              />
            </Card>

            {/* Shipments */}
            <Card onPress={() => navigation.navigate('Analytics')}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Shipments</Text>
                <TrendChip current={report.shipments.total} previous={report.shipments.prevTotal} />
              </View>
              <Text style={styles.bigValue}>{report.shipments.total}</Text>
              <BarChart
                width={chartWidth}
                points={report.shipments.series.map((p) => ({ label: dayLabel(p.day), value: p.count }))}
              />
              <View style={styles.statusWrap}>
                {Object.entries(report.shipments.byStatus).map(([status, count]) => (
                  <View key={status} style={styles.statusPill}>
                    <Text style={styles.statusText}>{status}: {count}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Collections */}
            <Card>
              <Text style={styles.cardTitle}>Collections</Text>
              <View style={styles.pairRow}>
                <Metric label="Completed" value={String(report.collections.completed)} tone={colors.primaryDark} />
                <Metric label="Failed" value={String(report.collections.failed)} tone={report.collections.failed ? colors.danger : colors.textMuted} />
              </View>
              {report.collections.byRoute.slice(0, 8).map((r) => (
                <BreakdownRow key={r.route} label={r.route} value={`${r.done} done${r.failed ? ` · ${r.failed} failed` : ''}`} />
              ))}
            </Card>

            {/* Delivery success */}
            <Card>
              <Text style={styles.cardTitle}>Delivery success</Text>
              <View style={styles.pairRow}>
                <Metric label="Success rate" value={report.deliveries.successRate != null ? `${report.deliveries.successRate}%` : '—'} tone={colors.primaryDark} />
                <Metric label="Delivered" value={String(report.deliveries.completed)} />
                <Metric label="Failed / rescheduled" value={String(report.deliveries.failed)} tone={report.deliveries.failed ? colors.danger : colors.textMuted} />
              </View>
            </Card>

            <SectionLabel text="Money" />
            <Card>
              <Text style={styles.cardTitle}>Revenue by route</Text>
              {report.revenue.byRoute.length === 0 ? <Text style={styles.compare}>No routed revenue in this range.</Text>
                : report.revenue.byRoute.map((r, i) => (
                  <BreakdownRow key={`${r.route}-${r.currency}-${i}`} label={r.route} value={`${r.currency === 'EUR' ? '€' : '£'}${Number(r.total).toFixed(2)}`} />
                ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Revenue by payment method</Text>
              {report.revenue.byMethod.map((r, i) => (
                <BreakdownRow key={`${r.method}-${r.currency}-${i}`} label={r.method} value={`${r.currency === 'EUR' ? '€' : '£'}${Number(r.total).toFixed(2)}`} />
              ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Outstanding payments</Text>
              <Text style={styles.bigValue}>{currencyLine(report.outstanding.byCurrency)}</Text>
              <Text style={styles.compare}>{report.outstanding.invoices} unpaid invoice{report.outstanding.invoices === 1 ? '' : 's'}</Text>
            </Card>

            <SectionLabel text="Operations" />
            <Card>
              <Text style={styles.cardTitle}>Driver completion</Text>
              {report.driverPerformance.length === 0 ? <Text style={styles.compare}>No driver activity in this range.</Text>
                : report.driverPerformance.map((d) => (
                  <BreakdownRow key={d.driverId} label={d.name}
                    value={`${d.completed} done${d.failed ? ` · ${d.failed} exceptions` : ''}`} />
                ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Quote conversion</Text>
              <View style={styles.pairRow}>
                <Metric label="Requested" value={String(report.quotes.requested)} />
                <Metric label="Approved" value={String(report.quotes.approved)} />
                <Metric label="Booked" value={String(report.quotes.booked)} tone={colors.primaryDark} />
              </View>
              <Text style={styles.compare}>
                Conversion: {report.quotes.requested ? `${Math.round((report.quotes.booked / report.quotes.requested) * 100)}%` : '—'}
              </Text>
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Customer growth</Text>
              <View style={styles.pairRow}>
                <Metric label="New customers" value={String(report.customers.new)} tone={colors.primaryDark} />
                <Metric label="Returning" value={String(report.customers.returning)} />
              </View>
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Delivery exceptions</Text>
              {Object.keys(report.failReasons).length === 0 ? <Text style={styles.compare}>No exceptions in this range.</Text>
                : Object.entries(report.failReasons).map(([reason, count]) => (
                  <BreakdownRow key={reason} label={reason.replace(/_/g, ' ')} value={String(count)} />
                ))}
            </Card>
            <Card>
              <Text style={styles.cardTitle}>Payment-proof approvals</Text>
              <View style={styles.pairRow}>
                <Metric label="Pending" value={String(report.proofs.pending)} tone={report.proofs.pending ? colors.orange : colors.textMuted} />
                <Metric label="Approved" value={String(report.proofs.verified)} tone={colors.primaryDark} />
                <Metric label="Rejected" value={String(report.proofs.rejected)} />
              </View>
              <Text style={styles.compare}>
                Average validation time: {report.proofs.avgValidationHours != null ? `${report.proofs.avgValidationHours}h` : '—'}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      <CalendarModal
        visible={pickingEnd !== null}
        initial={pickingEnd === 'from' ? custom.from : custom.to}
        onClose={() => setPickingEnd(null)}
        onSelect={(d) => {
          if (pickingEnd === 'from') {
            setCustom((c) => ({ from: d, to: c.to < d ? d : c.to }));
            setTimeout(() => setPickingEnd('to'), 250);
          } else {
            setCustom((c) => ({ from: c.from > d ? d : c.from, to: d }));
          }
        }}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.metricValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
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
  rangeRow: { gap: spacing.sm, paddingVertical: 2 },
  rangeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 13, paddingVertical: 8 },
  rangeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontSize: 12, fontWeight: '700', color: colors.text },
  rangeTextActive: { color: colors.white },
  clearChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  bigValue: { fontSize: 21, fontWeight: '900', color: colors.text, marginBottom: 2 },
  compare: { fontSize: 11.5, color: colors.textMuted, marginBottom: 8 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  statusPill: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },
  pairRow: { flexDirection: 'row', gap: spacing.md, marginBottom: 6 },
  metricLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  metricValue: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  breakdownLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.text },
  breakdownValue: { fontSize: 12.5, fontWeight: '800', color: colors.text },
});
