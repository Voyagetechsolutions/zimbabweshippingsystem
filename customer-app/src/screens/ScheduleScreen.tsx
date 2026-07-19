import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { FlagStripe, Pill, Button } from '../components/ui';
import { parseCollectionDate, longDate, daysUntil } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { scheduleMatchesPostcode } from '../lib/postcode';
import { useAppTheme } from '../context/ThemeContext';

type Row = {
  id: string;
  route: string;
  pickup_date: string;
  country?: string | null;
  areas?: unknown;
  parsed: Date | null;
  isCustomerArea: boolean;
};

type ScheduleRecord = Omit<Row, 'parsed' | 'isCustomerArea'>;
type ScheduleSection = { title: string; data: Row[] };

// Live collection schedules match the public website: all published routes stay
// visible, while the customer's matching postcode/city is highlighted.
export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<ScheduleSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchesArea, setMatchesArea] = useState(true);
  const { profile } = useAuth();
  const { palette } = useAppTheme();

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('collection_schedules')
      .select('id, route, pickup_date, country, areas')
      .order('route', { ascending: true })
      .limit(200);

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setError(null);
    const hasAreaInfo = Boolean(profile?.postal_code || profile?.pickup_city);
    const rows = ((data || []) as ScheduleRecord[])
      .filter((schedule) => !schedule.route.toUpperCase().includes('SCOTLAND'))
      .map((schedule): Row => ({
        ...schedule,
        parsed: parseCollectionDate(schedule.pickup_date),
        isCustomerArea: hasAreaInfo && scheduleMatchesPostcode(
          schedule.areas,
          profile?.postal_code,
          profile?.pickup_city,
          profile?.country,
        ),
      }))
      .sort((a, b) => {
        if (a.isCustomerArea !== b.isCustomerArea) return a.isCustomerArea ? -1 : 1;
        if (a.parsed && b.parsed) return a.parsed.getTime() - b.parsed.getTime();
        if (a.parsed) return -1;
        if (b.parsed) return 1;
        return a.route.localeCompare(b.route);
      });

    // Do not filter out past records here. The website displays every published
    // route, and hiding stale dates was the reason the app rendered an empty page.
    setMatchesArea(!hasAreaInfo || rows.some((schedule) => schedule.isCustomerArea));

    const uk = rows.filter((schedule) => !String(schedule.country || 'UK').toLowerCase().includes('ireland'));
    const ireland = rows.filter((schedule) => String(schedule.country || '').toLowerCase().includes('ireland'));
    setSections([
      { title: 'United Kingdom', data: uk },
      { title: 'Ireland', data: ireland },
    ].filter((section) => section.data.length > 0));
    setLoading(false);
  }, [profile?.postal_code, profile?.pickup_city, profile?.country]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    const channel = supabase.channel(`customer-schedules-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_schedules' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const routeCount = sections.reduce((total, section) => total + section.data.length, 0);
  const hasAreaInfo = Boolean(profile?.postal_code || profile?.pickup_city);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <SectionList
        sections={sections}
        keyExtractor={(route) => route.id}
        contentContainerStyle={styles.body}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        refreshing={refreshing}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: palette.text }]}>Collection Schedule</Text>
            <Text style={styles.sub}>
              {routeCount > 0
                ? `${routeCount} published collection routes across the UK & Ireland. Tap a route to book.`
                : 'Published collection routes across the UK & Ireland.'}
            </Text>

            {!matchesArea && !loading && !error && (
              <View style={[styles.notice, { backgroundColor: palette.greenSoft }]}>
                <Ionicons name="information-circle-outline" size={16} color={palette.greenDark} />
                <Text style={[styles.noticeText, { color: palette.greenDark }]}>
                  No route matches your saved {String(profile?.country || '').toLowerCase().includes('ireland') ? 'city' : 'postcode'} yet. All published routes are shown instead.
                </Text>
              </View>
            )}

            {matchesArea && hasAreaInfo && !loading && !error && (
              <View style={[styles.notice, { backgroundColor: palette.greenSoft }]}>
                <Ionicons name="location-outline" size={16} color={palette.greenDark} />
                <Text style={[styles.noticeText, { color: palette.greenDark }]}>
                  Your collection area is highlighted. All published routes remain visible.
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.red} />
                <Text style={styles.errorText}>Could not load schedules: {error}</Text>
                <Button
                  title="Try again"
                  onPress={() => {
                    setLoading(true);
                    load();
                  }}
                  style={{ alignSelf: 'stretch', marginTop: spacing.sm }}
                />
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title.toUpperCase()}</Text>}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.green} size="large" />
            </View>
          ) : error ? null : (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={44} color={colors.textFaint} />
              <Text style={styles.emptyText}>
                No collection routes have been published yet. Pull down to refresh or contact support.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const days = item.parsed ? daysUntil(item.parsed) : null;
          const areas = Array.isArray(item.areas) ? item.areas.join(', ') : String(item.areas || '');
          const country = String(item.country || '').toLowerCase().includes('ireland')
            ? 'Ireland'
            : 'United Kingdom';

          return (
            <Pressable
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => navigation.navigate('Book', { prefillCountry: country })}
            >
              <View style={styles.routeDetails}>
                <Text style={[styles.route, { color: palette.text }]}>{item.route}</Text>
                <Text style={styles.date}>
                  {item.parsed ? longDate(item.parsed) : item.pickup_date || 'Date to be confirmed'}
                </Text>
                {Boolean(areas) && <Text style={styles.areas} numberOfLines={2}>{areas}</Text>}
              </View>
              <View style={styles.badges}>
                {item.isCustomerArea && <Pill text="Your area" />}
                {days === null ? (
                  <Pill text="To be confirmed" bg="#fff4cc" fg="#806000" />
                ) : days < 0 ? (
                  <Pill text="Date update due" bg="#fff4cc" fg="#806000" />
                ) : (
                  <Pill text={days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`} />
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: 48, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm, lineHeight: 18 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  errorCard: {
    alignItems: 'center',
    gap: 8,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#fff1f2',
    marginBottom: spacing.sm,
  },
  errorText: { fontSize: 13, color: '#991b1b', textAlign: 'center', lineHeight: 18 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  routeDetails: { flex: 1 },
  route: { fontSize: 15, fontWeight: '800', color: colors.text },
  date: { fontSize: 13, color: colors.greenDark, fontWeight: '600', marginTop: 1 },
  areas: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  badges: { alignItems: 'flex-end', gap: 6 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: spacing.xl },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
