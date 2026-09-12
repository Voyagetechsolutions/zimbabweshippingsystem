import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// Alert via lib/alerts: identical to the native dialog for three buttons or
// fewer, but visible on web and scrollable when Android would drop the rest.
import { Alert } from '../lib/alerts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';
import { customerRef, senderName, pickupAddress, collectionInfo, type Shipment } from '../lib/shipment';
import { collectionDateText } from '../lib/collectionSchedule';
import { searchShipments } from '../lib/shipmentSearch';
import { startRoute } from '../lib/routePlan';
import { isNetworkError } from '../lib/offlineQueue';

/**
 * Find any shipment, whatever day it was booked for.
 *
 * The rest of the driver app is scoped to a day, which is right for working a
 * route and useless the moment reality departs from the plan: a customer with
 * a parcel booked for next week who is going away, a reference read out over
 * the phone, a box that was missed on Tuesday. This screen answers "where is
 * this one?" with no date, route or assignment filter at all.
 *
 * Finding it is only half of it — a shipment the driver can see but cannot
 * collect is a dead end — so anything not already on today's run can be added
 * to it from here.
 */
export default function DriverSearchScreen() {
  const navigation = useNavigation<any>();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Shipment[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  // Only the newest search may write results: typing fast otherwise lets a
  // slow earlier request land last and overwrite the right answer.
  const runId = useRef(0);

  const run = useCallback(async (value: string) => {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]); setSearched(false); setError(null);
      return;
    }
    const mine = ++runId.current;
    setSearching(true);
    setError(null);
    try {
      const found = await searchShipments(query);
      if (mine !== runId.current) return;
      setResults(found.shipments);
      setTruncated(found.truncated && found.shipments.length === 0);
      setSearched(true);
    } catch (err: any) {
      if (mine !== runId.current) return;
      setError(isNetworkError(err)
        ? 'No signal — search needs a connection.'
        : err?.message || 'Could not search.');
    } finally {
      if (mine === runId.current) setSearching(false);
    }
  }, []);

  const addToToday = useCallback(async (shipment: Shipment) => {
    setAdding(shipment.id);
    try {
      const result = await startRoute(null, [{ shipmentId: shipment.id }]);
      if (!result.ok) {
        Alert.alert('Could not add it', result.message);
        return;
      }
      Alert.alert(
        result.added > 0 ? 'Added to today' : 'Already on today',
        result.added > 0
          ? 'It is on your run now, at the end. Reorder it from the route screen.'
          : 'This shipment was already on your run.',
      );
    } finally {
      setAdding(null);
    }
  }, []);

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
        <Text style={styles.title}>Find a shipment</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={term}
          onChangeText={(value) => { setTerm(value); run(value); }}
          placeholder="Reference, tracking number, name or phone"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => run(term)}
        />
        {term ? (
          <Pressable onPress={() => { setTerm(''); setResults([]); setSearched(false); }} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Any shipment, on today's route or not. Add one to today if you are collecting it now.
        </Text>

        {searching ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} /> : null}
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        {!searching && searched && results.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={34} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nothing matches “{term.trim()}”.</Text>
            {truncated ? (
              <Text style={styles.emptyHint}>
                Only the most recent bookings were searched. Try the tracking number, or ask the office.
              </Text>
            ) : (
              <Text style={styles.emptyHint}>Check the reference, or try the customer's surname or phone.</Text>
            )}
          </View>
        ) : null}

        {results.map((shipment) => {
          const collection = collectionInfo(shipment);
          return (
            <View key={shipment.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{senderName(shipment)}</Text>
                <Text style={styles.ref}>
                  {shipment.customer_reference || customerRef(shipment)}
                  {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ''}
                </Text>
                <Text style={styles.where} numberOfLines={2}>{pickupAddress(shipment)}</Text>
                <Text style={styles.meta}>
                  {shipment.status || 'No status'}
                  {collection.route ? ` · ${collection.route}` : ''}
                  {collectionDateText(collection.date) ? ` · ${collectionDateText(collection.date)}` : ' · no collection date'}
                </Text>
              </View>
              <Pressable
                style={[styles.add, adding === shipment.id && styles.disabled]}
                disabled={adding === shipment.id}
                onPress={() => addToToday(shipment)}
              >
                {adding === shipment.id
                  ? <ActivityIndicator color={colors.primary} />
                  : <><Ionicons name="add" size={16} color={colors.primary} /><Text style={styles.addText}>Today</Text></>}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, ...shadow,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { fontSize: 13, color: colors.amber },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyText: { color: colors.text, fontWeight: '700' },
  emptyHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  ref: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 1 },
  where: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  add: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: spacing.sm, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  addText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  disabled: { opacity: 0.6 },
});
