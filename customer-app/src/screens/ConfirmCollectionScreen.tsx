import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { Card, Button, FlagStripe, SectionTitle } from '../components/ui';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { longDate, parseCollectionDate } from '../lib/format';
import { loadNextCollection, type NextCollection } from '../lib/collectionSchedule';
import {
  CollectionSlot, SLOT_WINDOWS, confirmSlot, effectiveWindow, hhmm, loadSlot, slotState, windowLabel,
} from '../lib/collectionSlots';
import { useAppTheme } from '../context/ThemeContext';

/**
 * The customer picks the two-hour window they will be in on collection day.
 *
 * Reached from the 48-hour reminder, from the home card, and from the shipment
 * itself. Choosing again later is deliberately allowed right up to collection —
 * plans change, and a customer quietly re-picking is far better for the driver
 * than a failed doorstep.
 *
 * The whole thing is optional. A customer who never answers is not blocked, not
 * chased twice, and not treated as a problem: dispatch simply sees "no time
 * chosen" and plans the round however suits, exactly as it did before any of
 * this existed. Saying so plainly on the screen matters, because a screen that
 * looks compulsory gets answered carelessly, and a careless window is worse for
 * the driver than no window at all.
 */
export default function ConfirmCollectionScreen() {
  const navigation = useNavigation<any>();
  const { id } = (useRoute<any>().params || {}) as { id: string };
  const { palette } = useAppTheme();
  // Keep the last action clear of Android's system navigation bar.
  const insets = useSafeAreaInsets();

  const [slot, setSlot] = useState<CollectionSlot | null>(null);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // The date the route is published for, used when this booking has not been
  // given one of its own yet — the same date the website is showing.
  const [published, setPublished] = useState<NextCollection | null>(null);

  const load = useCallback(async () => {
    const [{ data: shipment }, current] = await Promise.all([
      supabase.from('shipments').select('customer_reference,tracking_number,metadata,collection_schedule_id').eq('id', id).maybeSingle(),
      loadSlot(id),
    ]);
    setReference((shipment as any)?.customer_reference || (shipment as any)?.tracking_number || '');
    // The row is created by the reminder job. A customer who gets here first —
    // straight after booking, say — sees the date off the booking instead.
    setSlot(current ?? {
      shipment_id: id,
      collection_date: null,
      route: (shipment as any)?.metadata?.collection?.route ?? null,
      requested_start: null, requested_end: null, requested_flexible: false, requested_at: null,
      dispatch_start: null, dispatch_end: null, dispatch_set_at: null,
      change_reason: null, customer_informed_at: null, reminder_sent_at: null,
    });
    if (!current) {
      const raw = (shipment as any)?.metadata?.collection?.date;
      const parsed = parseCollectionDate(raw);
      if (parsed) setSlot((s) => (s ? { ...s, collection_date: parsed.toISOString().slice(0, 10) } : s));
    }
    const meta = (shipment as any)?.metadata || {};
    const sender = meta.sender || meta.senderDetails || {};
    setPublished(await loadNextCollection({
      postcode: sender.postcode || sender.postalCode,
      city: sender.city,
      country: sender.country || meta.collection?.country,
    }).catch(() => null));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const choose = async (choice: { start: string; end: string } | 'flexible') => {
    setSaving(choice === 'flexible' ? 'flexible' : choice.start);
    try {
      const saved = await confirmSlot(id, choice);
      setSlot(saved);
      Alert.alert(
        'Collection time saved',
        choice === 'flexible'
          ? 'We will collect any time on the day and call ahead.'
          : `We will aim to collect between ${windowLabel(choice.start, choice.end)}. If anything changes we will message or call you.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Could not save your time', e?.message || 'Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const state = slotState(slot);
  const ownDate = slot?.collection_date ? parseCollectionDate(slot.collection_date) : null;
  const collectionDate = ownDate || published?.date || null;
  const pickedStart = hhmm(slot?.requested_start);
  const isPicked = (start: string, end: string) =>
    !slot?.requested_flexible && pickedStart === start && hhmm(slot?.requested_end) === end;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Collection time</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.green} size="large" /></View>
      ) : (
        <KeyboardAwareScroll contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}>
          <Card>
            <Text style={[styles.reference, { color: palette.green }]}>{reference}</Text>
            {collectionDate ? (
              <Text style={[styles.date, { color: palette.text }]}>{longDate(collectionDate)}</Text>
            ) : null}
            {Boolean(slot?.route || published?.route) && (
              <Text style={[styles.route, { color: palette.textMuted }]}>
                {slot?.route || published?.route}
                {!ownDate && collectionDate ? ' · next published date, we will confirm yours' : ''}
              </Text>
            )}
          </Card>

          {state === 'dispatch_moved_untold' || state === 'dispatch_moved_told' ? (
            <View style={[styles.notice, { backgroundColor: palette.yellowSoft, borderColor: colors.yellow }]}>
              <Ionicons name="swap-horizontal" size={17} color="#8a6d00" />
              <Text style={[styles.noticeText, { color: '#8a6d00' }]}>
                We had to move your collection to {effectiveWindow(slot)}.
                {slot?.change_reason ? ` ${slot.change_reason}` : ''} Pick a different window below if that does not work and we will call you back.
              </Text>
            </View>
          ) : state === 'scheduled' ? (
            <View style={[styles.notice, { backgroundColor: palette.greenSoft, borderColor: colors.green }]}>
              <Ionicons name="checkmark-circle" size={17} color={palette.greenDark} />
              <Text style={[styles.noticeText, { color: palette.greenDark }]}>
                Confirmed for {effectiveWindow(slot)}. Our driver will call ahead on the day.
              </Text>
            </View>
          ) : null}

          <SectionTitle text="When will you be in? (optional)" />
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Choose a two-hour window if it helps. We plan the day's route around the answers we get, so the closer
            this is to reality the less waiting around for you — but you do not have to pick one. Skip it and the
            driver will simply call ahead on the day.
          </Text>

          <View style={styles.grid}>
            {SLOT_WINDOWS.map((slotWindow) => {
              const picked = isPicked(slotWindow.start, slotWindow.end);
              return (
                <Pressable
                  key={slotWindow.start}
                  disabled={Boolean(saving)}
                  onPress={() => choose(slotWindow)}
                  style={[
                    styles.slot,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                    picked && { borderColor: colors.green, backgroundColor: palette.greenSoft },
                    Boolean(saving) && { opacity: 0.6 },
                  ]}
                >
                  {saving === slotWindow.start
                    ? <ActivityIndicator size="small" color={colors.green} />
                    : (
                      <>
                        <Text style={[styles.slotText, { color: picked ? palette.greenDark : palette.text }]}>
                          {windowLabel(slotWindow.start, slotWindow.end)}
                        </Text>
                        {picked && <Ionicons name="checkmark-circle" size={15} color={colors.green} />}
                      </>
                    )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={Boolean(saving)}
            onPress={() => choose('flexible')}
            style={[
              styles.flexible,
              { backgroundColor: palette.surface, borderColor: palette.border },
              slot?.requested_flexible && { borderColor: colors.green, backgroundColor: palette.greenSoft },
              Boolean(saving) && { opacity: 0.6 },
            ]}
          >
            {saving === 'flexible'
              ? <ActivityIndicator size="small" color={colors.green} />
              : (
                <>
                  <Ionicons
                    name={slot?.requested_flexible ? 'checkmark-circle' : 'time-outline'}
                    size={18}
                    color={slot?.requested_flexible ? colors.green : palette.textFaint}
                  />
                  <Text style={[styles.flexibleText, { color: slot?.requested_flexible ? palette.greenDark : palette.text }]}>
                    Any time — I'm flexible
                  </Text>
                </>
              )}
          </Pressable>

          <Text style={[styles.hint, { color: palette.textMuted, marginTop: spacing.md }]}>
            You can change this any time before collection day. If we have to move you, we will message or call you
            rather than leave you guessing.
          </Text>

          <Button
            title={state === 'awaiting_customer' ? 'Skip for now' : 'Back to my shipment'}
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.md }}
          />
        </KeyboardAwareScroll>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, paddingBottom: 40 },
  reference: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  date: { fontSize: 18, fontWeight: '800', marginTop: 3 },
  route: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },
  hint: { fontSize: 12.5, lineHeight: 18, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '47.8%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 15,
  },
  slotText: { fontSize: 14.5, fontWeight: '800' },
  flexible: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 15, marginTop: spacing.sm,
  },
  flexibleText: { fontSize: 14.5, fontWeight: '800' },
});
