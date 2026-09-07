import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import { money } from '../../lib/format';
import { isMissingBackend } from '../../lib/offlineQueue';

/**
 * Shipments, by the collection period they belong to.
 *
 * A period is how this business actually runs: bookings open, they fill, the
 * container goes. One endless list of every shipment ever booked answers no
 * question anybody asks — "how is September doing", "who has not paid",
 * "is it ready to go" — where a period does.
 *
 * Each card is a small report, so the answer is on the front of it and staff
 * only open the one they are working on.
 */

export type PeriodSummary = {
  periodId: string;
  name: string | null;
  month: string | null;
  year: number | null;
  status: string | null;
  routes: string[];
  firstCollection: string | null;
  lastCollection: string | null;
  shipments: number;
  collected: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  cleared: number;
  unpaid: number;
  currency: string;
  /** Totals per currency; a period may hold both UK and Irish collections. */
  byCurrency?: Array<{ currency: string; invoiced: number; paid: number; outstanding: number }>;
};

const symbolFor = (currency: string) => (currency === 'EUR' ? '€' : '£');

/**
 * The same cards serve shipments and invoices.
 *
 * A period's numbers are the same question either way — what it is worth, what
 * has been paid, what is still out — so only the title and where a tap goes
 * differ. Two copies of this would drift apart within a month.
 */
export default function ShipmentPeriodsScreen() {
  const navigation = useNavigation<any>();
  const mode = ((useRoute().params || {}) as { mode?: 'shipments' | 'invoices' }).mode ?? 'shipments';
  const target = mode === 'invoices' ? 'PeriodInvoices' : 'PeriodShipments';
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('collection_period_summary');
    if (rpcError) {
      setError(isMissingBackend(rpcError)
        ? 'This app is newer than the database. Ask the office to run the setup.'
        : rpcError.message);
    } else if ((data as any)?.error) {
      setError(String((data as any).error));
    } else {
      setPeriods(Array.isArray(data) ? (data as PeriodSummary[]) : []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Periods with nothing booked are noise on a screen about work in progress,
  // but they still matter when opening a new period, so they are kept last
  // rather than hidden.
  const [live, empty] = useMemo(() => [
    periods.filter((p) => p.shipments > 0),
    periods.filter((p) => p.shipments === 0),
  ], [periods]);

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
        <Text style={styles.title}>{mode === 'invoices' ? 'Invoices' : 'Shipments'}</Text>
        <Text style={styles.subtitle}>
          {live.length} collection period{live.length === 1 ? '' : 's'} with bookings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        {live.map((period) => {
          const settled = period.shipments > 0 ? period.cleared / period.shipments : 0;
          return (
            <Pressable
              key={period.periodId}
              style={styles.card}
              onPress={() => navigation.navigate(target, {
                periodId: period.periodId,
                name: period.name || `${period.month || ''} ${period.year || ''}`.trim(),
              })}
            >
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {period.name || `${period.month || ''} ${period.year || ''}`.trim() || 'Untitled period'}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {period.routes.length
                      ? period.routes.join(' · ')
                      : 'No routes published yet'}
                  </Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countValue}>{period.shipments}</Text>
                  <Text style={styles.countLabel}>{mode === 'invoices' ? 'INVOICES' : 'SHIPMENTS'}</Text>
                </View>
              </View>

              {/* Pounds and euros are never added together — see byCurrency. */}
              {(period.byCurrency?.length ? period.byCurrency : [{
                currency: period.currency, invoiced: period.invoiced,
                paid: period.paid, outstanding: period.outstanding,
              }]).map((line) => (
                <View key={line.currency}>
                  {(period.byCurrency?.length || 0) > 1 ? (
                    <Text style={styles.currencyLabel}>{line.currency}</Text>
                  ) : null}
                  <View style={styles.figures}>
                    <Figure label="Invoiced" value={money(line.invoiced, symbolFor(line.currency))} />
                    <Figure label="Paid" value={money(line.paid, symbolFor(line.currency))} tone={colors.primaryDark} />
                    <Figure
                      label="Outstanding"
                      value={money(line.outstanding, symbolFor(line.currency))}
                      tone={line.outstanding > 0 ? colors.danger : colors.primaryDark}
                    />
                  </View>
                </View>
              ))}

              {/* One bar for "how much of this period is settled", because that
                  is the question a period card exists to answer. */}
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(settled * 100)}%` }]} />
              </View>
              <Text style={styles.cardMeta}>
                {period.cleared} paid in full · {period.unpaid} not paid at all · {period.collected} collected
              </Text>
            </Pressable>
          );
        })}

        {empty.length ? (
          <>
            <Text style={styles.groupLabel}>NOTHING BOOKED YET</Text>
            {empty.map((period) => (
              <Pressable
                key={period.periodId}
                style={[styles.card, styles.cardQuiet]}
                onPress={() => navigation.navigate(target, {
                  periodId: period.periodId,
                  name: period.name || '',
                })}
              >
                <Text style={styles.cardTitle}>{period.name || 'Untitled period'}</Text>
                <Text style={styles.cardMeta}>
                  {period.routes.length ? period.routes.join(' · ') : 'No routes published'}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {!error && periods.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={38} color={colors.textMuted} />
            <Text style={styles.emptyText}>No collection periods yet.</Text>
          </View>
        ) : null}
      </ScrollView>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, ...shadow },
  cardQuiet: { opacity: 0.72 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { fontSize: 16.5, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  countPill: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  countValue: { fontSize: 19, fontWeight: '900', color: colors.primary },
  countLabel: { fontSize: 8.5, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  currencyLabel: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.6, marginTop: 6 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 1 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  groupLabel: { fontSize: 10.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },
});
