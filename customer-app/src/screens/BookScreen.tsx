import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { Card, Button, Field, SectionTitle, FlagStripe } from '../components/ui';
import { Country, currencyFor, priceFor } from '../lib/catalogue';
import { useBusinessConfig } from '../lib/businessConfig';
import { BookingDraft, EMPTY_DRAFT, QuoteCarry, SessionExpiredError, createBooking, draftLines } from '../lib/booking';
import { CustomerAddress, listAddresses, addressSummary, pickupSummary } from '../lib/addresses';
import { parseCollectionDate, longDate, money } from '../lib/format';
import {
  scheduleMatchesPostcode, autocompletePostcode, searchAddresses, lookupUkPostcode,
  coverageForUkPostcode, prettyPostcode, type Coverage,
} from '../lib/postcode';
import { pickNextCollection } from '../lib/collectionSchedule';
import { SuggestField } from '../components/SuggestField';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { useAppTheme, useThemedStyles } from '../context/ThemeContext';

const STEPS = ['Collection', 'Sender', 'Delivery', 'Shipment', 'Payment', 'Review'] as const;
const DRAFT_KEY = 'zim-booking-draft-v2';

type ScheduleRow = { id: string; route: string; pickup_date: string; country?: string | null; areas?: any };
type DepotRow = { id: string; name: string; city: string; address_line1: string; opening_hours: string | null };

export default function BookScreen() {
  const navigation = useNavigation<any>();
  const { session, profile, ensureSession } = useAuth();
  // Checked on focus rather than only at submit: a session that lapsed in the
  // background leaves every screen looking signed in, so without an explicit
  // check the customer only finds out six steps later.
  const [signedOut, setSignedOut] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [pickupAddresses, setPickupAddresses] = useState<CustomerAddress[]>([]);
  const [pickupAddressId, setPickupAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [otherPaymentsOpen, setOtherPaymentsOpen] = useState(false);
  const { palette } = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  // Android draws its gesture/three-button bar over the app on edge-to-edge
  // windows, so a footer pinned to the bottom of the screen sits underneath it
  // and Continue cannot be tapped. Lift it clear by the device's own inset.
  const insets = useSafeAreaInsets();
  const { config: business, loading: configLoading, error: configError, reload: reloadConfig } = useBusinessConfig();
  const catalogue = business.catalogue;
  const paymentMethods = business.payments.methods;

  // Coordinates of the resolved collection postcode — biases address search to
  // the customer's own area rather than the whole country.
  const [postcodePoint, setPostcodePoint] = useState<{ latitude: number; longitude: number } | null>(null);
  // Whether the customer has taken ownership of the town field, by typing in it
  // or by picking an address. Their town is never overwritten by a later
  // postcode lookup; only a blank or previously auto-filled one is.
  const cityTouchedRef = useRef(false);
  // The draft is only persisted once it has been restored, so the empty first
  // render cannot overwrite a saved booking.
  const draftReadyRef = useRef(false);

  // Door delivery keeps its per-address fee; self-collection is free and the
  // receiver picks the goods up from a depot.
  const [deliveryMethod, setDeliveryMethod] = useState<'door' | 'self_collection'>('door');
  const [depots, setDepots] = useState<DepotRow[]>([]);
  const [depotId, setDepotId] = useState<string | null>(null);

  const routeParams = (useRoute<any>().params || {}) as { quote?: QuoteCarry; prefillItems?: Record<string, number>; prefillCountry?: Country; freshToken?: number };

  // Resume an unfinished booking; pre-fill from the profile and any quote.
  useEffect(() => {
    (async () => {
      let base = EMPTY_DRAFT;
      let resumed = false;
      try {
        const saved = routeParams.freshToken ? null : await AsyncStorage.getItem(DRAFT_KEY);
        if (saved) { base = { ...EMPTY_DRAFT, ...JSON.parse(saved) }; resumed = true; }
      } catch { /* fresh draft */ }
      if (!resumed && profile?.full_name) {
        const [firstName, ...rest] = profile.full_name.split(' ');
        base = {
          ...base,
          sender: { ...base.sender, firstName, lastName: rest.join(' '), email: profile.email || '', phone: profile.phone_number || '' },
          collectionAddress: profile.pickup_address || base.collectionAddress,
          collectionCity: profile.pickup_city || base.collectionCity,
          collectionPostcode: profile.postal_code || base.collectionPostcode,
          country: (profile.country === 'Ireland' ? 'Ireland' : 'United Kingdom'),
        };
      }
      if (routeParams.prefillItems) {
        base = { ...base, items: { ...base.items, ...routeParams.prefillItems }, country: routeParams.prefillCountry || base.country };
      }
      if (routeParams.quote) {
        base = {
          ...base,
          quote: routeParams.quote,
          country: routeParams.quote.currency === 'EUR' ? 'Ireland' : 'United Kingdom',
        };
      }
      cityTouchedRef.current = Boolean(base.collectionCity.trim());
      setDraft(base);
      // Book stays mounted in the stack, so starting a new booking used to
      // drop the customer back on whatever step they last left — step 5 with
      // an empty draft, most confusingly.
      if (routeParams.freshToken) setStep(0);
      draftReadyRef.current = true;
    })();
  }, [profile?.id, routeParams.freshToken, routeParams.quote?.id]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft]);

  useEffect(() => {
    supabase.from('collection_schedules').select('id, route, pickup_date, country, areas').limit(200)
      .then(({ data }) => setSchedules((data as ScheduleRow[]) || []));
  }, []);

  // Zimbabwe collection points for self-collection. Absent until the depot
  // migration is applied, which the UI copes with.
  useEffect(() => {
    supabase.from('delivery_depots').select('id, name, city, address_line1, opening_hours')
      .eq('active', true).order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        const rows = (data as DepotRow[]) || [];
        setDepots(rows);
        if (rows.length === 1) setDepotId((current) => current ?? rows[0].id);
      });
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!session?.user.id) return;
    try { setAddresses(await listAddresses(session.user.id, 'delivery')); } catch { /* shown as empty */ }
    try { setPickupAddresses(await listAddresses(session.user.id, 'pickup')); } catch { /* shown as empty */ }
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    ensureSession().then((live) => { if (!cancelled) setSignedOut(!live); });
    return () => { cancelled = true; };
  }, [ensureSession]));

  // Every published route covering this customer, with its date parsed once.
  //
  // Nothing resolves until they have actually said where they are. An empty
  // postcode matches every route in `scheduleMatchesPostcode` — which is right
  // for browsing the schedule and quite wrong here, where it would promise a
  // Northampton date to somebody who has typed nothing at all.
  const hasLocation = draft.collectionPostcode.replace(/\s/g, '').length >= 3
    || draft.collectionCity.trim().length >= 3;

  const myRoutes = useMemo(() => {
    if (!hasLocation) return [];
    const wantIreland = draft.country === 'Ireland';
    return schedules
      .filter((s) => {
        const c = String(s.country || 'UK').toLowerCase();
        return wantIreland ? c.includes('ireland') : !c.includes('ireland');
      })
      .filter((s) => scheduleMatchesPostcode(s.areas, draft.collectionPostcode, draft.collectionCity, draft.country))
      .map((s) => ({ ...s, parsed: parseCollectionDate(s.pickup_date) }));
  }, [hasLocation, schedules, draft.country, draft.collectionPostcode, draft.collectionCity]);

  const upcoming = useMemo(() => myRoutes
    .filter((s) => s.parsed && s.parsed.getTime() >= Date.now() - 86400000)
    .sort((a, b) => (a.parsed as Date).getTime() - (b.parsed as Date).getTime())
    .slice(0, 12), [myRoutes]);

  /**
   * The collection date, which the customer does not choose.
   *
   * The postcode decides the route and the route carries the date, so as soon
   * as a serviceable postcode is typed the answer is already known — there is
   * nothing to pick. The soonest published date on a covering route wins.
   */
  const resolvedCollection = useMemo(() => upcoming[0] ?? null, [upcoming]);

  /**
   * Routes that cover this customer but whose published date has already gone.
   *
   * Offering one would book a collection into the past, so they stay
   * unselectable — but hiding them altogether is what made a customer in an
   * area awaiting a new date see no route at all and assume we do not come to
   * them. Naming the route and saying a new date is due is the honest version.
   */
  const awaitingNewDate = useMemo(() => myRoutes
    .filter((s) => !s.parsed || s.parsed.getTime() < Date.now() - 86400000)
    .sort((a, b) => a.route.localeCompare(b.route)), [myRoutes]);

  /**
   * The date to put in front of the customer when their own route has none.
   *
   * Same answer the website's hero gives: the soonest published date for the
   * country they are collecting from. It is shown as the date we are working
   * towards rather than written into the booking — the office still confirms
   * which route picks them up — but a real date is always on screen.
   */
  const nextPublished = useMemo(() => {
    const wantIreland = draft.country === 'Ireland';
    const forCountry = schedules.filter((s) => {
      const c = String(s.country || 'UK').toLowerCase();
      return wantIreland ? c.includes('ireland') : !c.includes('ireland');
    });
    return pickNextCollection(forCountry, {
      postcode: draft.collectionPostcode,
      city: draft.collectionCity,
      country: draft.country,
    });
  }, [schedules, draft.country, draft.collectionPostcode, draft.collectionCity]);

  /** What the collection cards actually render — the matched route, else the published next date. */
  const shownCollection = useMemo(() => (resolvedCollection
    ? {
      route: resolvedCollection.route,
      label: resolvedCollection.parsed ? longDate(resolvedCollection.parsed) : resolvedCollection.pickup_date,
      confirmed: true,
    }
    : nextPublished
      ? { route: nextPublished.route, label: longDate(nextPublished.date), confirmed: false }
      : null), [resolvedCollection, nextPublished]);

  const { lines, estimate, hasCustom, symbol } = draftLines(draft, business, deliveryMethod);
  const set = (patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const isIrelandPickup = draft.country === 'Ireland';
  // The postcode is the coverage decision, so it is evaluated on every keystroke
  // and shown immediately. Ireland routes by city instead.
  const coverage: Coverage = isIrelandPickup
    ? { status: 'unknown', route: null, message: '' }
    : coverageForUkPostcode(draft.collectionPostcode);

  // Resolve the typed postcode to a town and coordinates (debounced).
  useEffect(() => {
    if (isIrelandPickup) { setPostcodePoint(null); return; }
    if (draft.collectionPostcode.replace(/\s/g, '').length < 5) { setPostcodePoint(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const place = await lookupUkPostcode(draft.collectionPostcode);
      if (cancelled) return;
      setPostcodePoint(place && place.latitude != null && place.longitude != null
        ? { latitude: place.latitude, longitude: place.longitude }
        : null);
      if (place?.city) {
        setDraft((d) => {
          // The customer's own town wins. This used to be decided by a piece of
          // state that the effect itself then set, which re-ran the effect with
          // the flag flipped and let the second pass replace the town the
          // customer had just typed a beat after they typed it.
          if (cityTouchedRef.current && d.collectionCity.trim()) return d;
          if (d.collectionCity === place.city) return d;
          return { ...d, collectionCity: place.city };
        });
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draft.collectionPostcode, isIrelandPickup]);

  // Keep the draft in step with whatever the postcode resolved to. Guarded on
  // the values themselves so it settles immediately instead of re-running.
  useEffect(() => {
    // Nothing is resolvable until the schedules arrive, and clearing a restored
    // draft's date in that window would blank the review for a beat.
    if (!schedules.length) return;
    const id = resolvedCollection?.id ?? null;
    const route = resolvedCollection?.route ?? null;
    const date = resolvedCollection?.pickup_date ?? null;
    setDraft((d) => (d.scheduleId === id && d.route === route && d.collectionDate === date
      ? d
      : { ...d, scheduleId: id, route, collectionDate: date }));
  }, [resolvedCollection, schedules.length]);

  // Door delivery needs somewhere to drive to. Self-collection only needs to
  // know who is collecting and from where — there is no street address.
  const hasDelivery = deliveryMethod === 'self_collection'
    ? Boolean(draft.recipient.name.trim() && draft.recipient.phone.trim())
    : draft.deliveryAddressIds.length > 0
      || Boolean(draft.recipient.name.trim() && draft.recipient.phone.trim() && draft.recipient.address.trim() && draft.recipient.city.trim());

  const stepValid = () => {
    switch (step) {
      case 0:
        // A postcode we don't run a route to stops the booking here rather than
        // six steps later.
        if (coverage.status === 'not_covered') return false;
        return draft.collectionAddress.trim().length > 3
          && draft.collectionCity.trim().length > 1
          && (isIrelandPickup || draft.collectionPostcode.replace(/\s/g, '').length >= 3);
      case 1: return Boolean(draft.sender.firstName.trim() && draft.sender.lastName.trim() && draft.sender.phone.trim());
      case 2: return hasDelivery;
      case 3: return lines.some((line) =>
        !line.label.startsWith('Zimbabwe door delivery') && !line.label.endsWith('purchased from us'));
      default: return true;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const created = await createBooking(draft, business, deliveryMethod);

      // Record which delivery option was chosen. Pricing is already correct —
      // self-collection selects no paid addresses — so this only annotates the
      // shipment for the warehouse and driver. Best effort: a booking must not
      // fail because the annotation did.
      try {
        await supabase.rpc('set_booking_delivery_method', {
          p_shipment_id: created.id,
          p_method: deliveryMethod,
          p_depot_id: deliveryMethod === 'self_collection' ? depotId : null,
        });
      } catch (e) {
        console.warn('Could not record the delivery method', e);
      }

      await AsyncStorage.removeItem(DRAFT_KEY);
      navigation.replace('ShipmentDetail', { id: created.id, celebrate: true });
    } catch (e: any) {
      // The database raises the same thing when the JWT does not reach it, so
      // both the local and the server-side version of "you are not signed in"
      // land here and get an offer to sign in rather than a dead end. The draft
      // stays in storage, so nothing typed is lost.
      const lapsed = e instanceof SessionExpiredError || /sign in to book/i.test(e?.message || '');
      if (lapsed) {
        setSignedOut(true);
        Alert.alert(
          'Please sign in again',
          'Your session has expired. Sign in and your booking details will be waiting for you.',
          [{ text: 'Not now', style: 'cancel' }, { text: 'Sign in', onPress: () => navigation.navigate('Auth') }],
        );
      } else {
        Alert.alert('Booking failed', e?.message || 'Please try again, or ask Zimmy to book for you.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const qty = (id: string) => draft.items[id] || 0;
  const bump = (id: string, delta: number) => {
    const next = Math.max(0, qty(id) + delta);
    set({ items: { ...draft.items, [id]: next } });
  };
  const toggleAddress = (id: string) => {
    set({
      deliveryAddressIds: draft.deliveryAddressIds.includes(id)
        ? draft.deliveryAddressIds.filter((x) => x !== id)
        : [...draft.deliveryAddressIds, id],
    });
  };

  if (configLoading || configError || !catalogue.length) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
        <FlagStripe />
        <View style={[styles.body, { flex: 1, justifyContent: 'center' }]}>
          <Text style={[styles.headerTitle, { color: palette.text, textAlign: 'center' }]}>
            {configLoading ? 'Loading current shipping options…' : 'Shipping options are temporarily unavailable'}
          </Text>
          {configError ? <Text style={[styles.hint, { color: palette.textMuted, textAlign: 'center' }]}>{configError}</Text> : null}
          {!configLoading ? <Button title="Try again" onPress={reloadConfig} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Book a Shipment</Text>
        <Text style={[styles.headerStep, { color: palette.textMuted }]}>{step + 1}/{STEPS.length}</Text>
      </View>
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <View style={[styles.stepLine, i <= step && { backgroundColor: colors.green }]} />}
            <View style={[styles.stepCircle, { backgroundColor: palette.surface, borderColor: palette.border }, i < step && { backgroundColor: colors.green, borderColor: colors.green }, i === step && { borderColor: colors.green }]}>
              {i < step
                ? <Ionicons name="checkmark" size={13} color={colors.white} />
                : <Text style={[styles.stepNum, { color: palette.textFaint }, i === step && { color: colors.green }]}>{i + 1}</Text>}
            </View>
          </React.Fragment>
        ))}
      </View>
      <Text style={[styles.stepCaption, { color: palette.textMuted }]}>{STEPS[step]}</Text>

      <View style={{ flex: 1 }}>
        <KeyboardAwareScroll contentContainerStyle={styles.body}>
          {signedOut && (
            <Pressable
              onPress={() => navigation.navigate('Auth')}
              style={[styles.signedOut, { backgroundColor: palette.yellowSoft, borderColor: colors.yellow }]}
            >
              <Ionicons name="lock-closed-outline" size={16} color="#8a6d00" />
              <Text style={[styles.signedOutText, { color: '#8a6d00' }]}>
                You are not signed in. Tap here to sign in — we will keep everything you have filled in so far.
              </Text>
            </Pressable>
          )}
          {draft.quote && (
            <View style={[styles.quoteBanner, { backgroundColor: palette.greenSoft, borderColor: colors.green }]}>
              <Ionicons name="pricetag" size={16} color={palette.greenDark} />
              <Text style={[styles.quoteBannerText, { color: palette.greenDark }]}>
                Booking your approved quote — {money(draft.quote.amount, draft.quote.currency === 'EUR' ? '€' : '£')} (price locked)
              </Text>
            </View>
          )}

          {step === 0 && (
            <>
              <SectionTitle text="Where are we collecting from?" />
              <View style={styles.toggleRow}>
                {(['United Kingdom', 'Ireland'] as Country[]).map((c) => {
                  const locked = Boolean(draft.quote) && (draft.quote!.currency === 'EUR' ? 'Ireland' : 'United Kingdom') !== c;
                  return (
                    <Pressable key={c} disabled={locked}
                      onPress={() => set({ country: c, scheduleId: null, route: null, collectionDate: null })}
                      style={[styles.toggle, { backgroundColor: palette.surface }, draft.country === c && styles.toggleOn, locked && { opacity: 0.4 }]}>
                      <Text style={[styles.toggleText, { color: palette.green }, draft.country === c && { color: colors.white }]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {pickupAddresses.length > 0 && (
                <>
                  <SectionTitle text="Saved pickup addresses" />
                  {pickupAddresses.map((a) => {
                    const selected = pickupAddressId === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => {
                          setPickupAddressId(selected ? null : a.id);
                          if (selected) return;
                          // An explicit pick owns all three fields, so the
                          // postcode lookup must not overwrite the town.
                          cityTouchedRef.current = Boolean(a.city.trim());
                          set({
                            collectionAddress: [a.address_line1, a.address_line2].filter(Boolean).join(', '),
                            collectionCity: a.city,
                            collectionPostcode: a.postal_code || '',
                            country: a.country === 'Ireland' ? 'Ireland' : 'United Kingdom',
                          });
                        }}
                        style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, selected && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemLabel, { color: palette.text }]}>{a.recipient_name}{a.is_default ? '  ★' : ''}</Text>
                          <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{pickupSummary(a)}</Text>
                        </View>
                        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.green : palette.textFaint} />
                      </Pressable>
                    );
                  })}
                  <Text style={[styles.hint, { color: palette.textMuted }]}>Or type a one-off address below.</Text>
                </>
              )}

              <SuggestField
                label="Collection address"
                value={draft.collectionAddress}
                onChangeText={(v) => set({ collectionAddress: v })}
                placeholder="Start typing, e.g. 24 King Street"
                hint="Search for your address, or type it in full."
                fetcher={async (query) => {
                  const results = await searchAddresses(query, postcodePoint);
                  return results.map((r) => ({ key: r.label, primary: r.line1, secondary: [r.town, r.postcode].filter(Boolean).join(' · ') }));
                }}
                onPick={(suggestion) => {
                  const [town, postcode] = String(suggestion.secondary || '').split(' · ');
                  // An explicit pick is authoritative: take its town and
                  // postcode too, so the three fields can't disagree — and hold
                  // that town against the postcode lookup that the new postcode
                  // is about to kick off.
                  if (town) cityTouchedRef.current = true;
                  // Photon often matches the street without the number, and
                  // taking its line verbatim then quietly deleted the house
                  // number the customer had already typed. Keep theirs when the
                  // suggestion has none of its own.
                  const typedNumber = draft.collectionAddress.trim().match(/^([0-9]+[A-Za-z]?)\b/)?.[1];
                  const picked = /^[0-9]/.test(suggestion.primary) || !typedNumber
                    ? suggestion.primary
                    : `${typedNumber} ${suggestion.primary}`;
                  set({
                    collectionAddress: picked,
                    ...(town ? { collectionCity: town } : {}),
                    ...(postcode && !isIrelandPickup ? { collectionPostcode: postcode } : {}),
                  });
                }}
              />

              <Field
                label="Town / city"
                value={draft.collectionCity}
                onChangeText={(v) => { cityTouchedRef.current = Boolean(v.trim()); set({ collectionCity: v }); }}
                placeholder={draft.country === 'Ireland' ? 'Dublin' : 'Luton'}
              />

              {isIrelandPickup ? (
                <Field
                  label="Eircode (optional)"
                  value={draft.collectionPostcode}
                  onChangeText={(v) => set({ collectionPostcode: v })}
                  autoCapitalize="none"
                />
              ) : (
                <>
                  <SuggestField
                    label="Postcode"
                    icon="mail-outline"
                    minChars={2}
                    debounceMs={350}
                    autoCapitalize="characters"
                    value={draft.collectionPostcode}
                    onChangeText={(v) => set({ collectionPostcode: v })}
                    placeholder="LU1 1AA"
                    hint="Your postcode decides which collection route covers you."
                    fetcher={async (query) => {
                      const options = await autocompletePostcode(query);
                      return options.map((option) => ({ key: option, primary: option }));
                    }}
                    onPick={(suggestion) => set({ collectionPostcode: prettyPostcode(suggestion.primary) })}
                  />

                  <Button
                    title={pickupAddresses.length ? 'Manage saved pickup addresses' : 'Save this address for next time'}
                    variant="outline"
                    onPress={() => navigation.navigate('Addresses')}
                    style={{ marginBottom: spacing.md }}
                  />

                  {coverage.status !== 'unknown' && (
                    <View style={[
                      styles.coverage,
                      coverage.status === 'covered' && { backgroundColor: palette.greenSoft, borderColor: colors.green },
                      coverage.status === 'not_covered' && { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
                      coverage.status === 'needs_confirmation' && { backgroundColor: palette.yellowSoft, borderColor: colors.yellow },
                    ]}>
                      <Ionicons
                        name={coverage.status === 'covered' ? 'checkmark-circle' : coverage.status === 'not_covered' ? 'alert-circle' : 'information-circle'}
                        size={16}
                        color={coverage.status === 'covered' ? palette.greenDark : coverage.status === 'not_covered' ? '#b91c1c' : '#8a6d00'}
                      />
                      <Text style={[
                        styles.coverageText,
                        { color: coverage.status === 'covered' ? palette.greenDark : coverage.status === 'not_covered' ? '#991b1b' : '#8a6d00' },
                      ]}>
                        {coverage.message}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* The date follows the location, so it belongs after both the
                  UK postcode and the Irish town — Ireland routes by city. */}
              {shownCollection ? (
                <View style={[
                  styles.coverage,
                  shownCollection.confirmed
                    ? { backgroundColor: palette.greenSoft, borderColor: colors.green }
                    : { backgroundColor: palette.yellowSoft, borderColor: colors.yellow },
                ]}>
                  <Ionicons
                    name={shownCollection.confirmed ? 'calendar' : 'time-outline'}
                    size={16}
                    color={shownCollection.confirmed ? palette.greenDark : '#8a6d00'}
                  />
                  <Text style={[styles.coverageText, { color: shownCollection.confirmed ? palette.greenDark : '#8a6d00' }]}>
                    {shownCollection.confirmed ? 'Your collection date: ' : 'Next collection: '}{shownCollection.label}
                    {'\n'}{shownCollection.route}
                    {shownCollection.confirmed
                      ? ''
                      : `\n${awaitingNewDate.length ? `${awaitingNewDate[0].route} covers you and its new date is due — book` : 'Book'} and we will confirm your own date.`}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {step === 1 && (
            <>
              <SectionTitle text="Your details (sender)" />
              <Field label="First name" value={draft.sender.firstName} onChangeText={(v) => set({ sender: { ...draft.sender, firstName: v } })} autoCapitalize="words" />
              <Field label="Last name" value={draft.sender.lastName} onChangeText={(v) => set({ sender: { ...draft.sender, lastName: v } })} autoCapitalize="words" />
              <Field label="WhatsApp / phone number" value={draft.sender.phone} onChangeText={(v) => set({ sender: { ...draft.sender, phone: v } })} keyboardType="phone-pad" placeholder="+44 7..." />
              <Field label="Email (optional)" value={draft.sender.email} onChangeText={(v) => set({ sender: { ...draft.sender, email: v } })} keyboardType="email-address" autoCapitalize="none" />
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle text="How should the receiver get the goods?" />
              <View style={styles.methodRow}>
                {([
                  { value: 'door' as const, title: 'Door delivery', note: `${symbol}${business.fees.doorDeliveryPerAddress} per address`, icon: 'car-outline' as const },
                  { value: 'self_collection' as const, title: 'Self-collection', note: 'Free', icon: 'storefront-outline' as const },
                ]).map((option) => {
                  const active = deliveryMethod === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setDeliveryMethod(option.value);
                        // Switching to self-collection drops the paid door
                        // addresses so the total can never carry both.
                        if (option.value === 'self_collection') set({ deliveryAddressIds: [] });
                      }}
                      style={[
                        styles.method,
                        { backgroundColor: palette.surface, borderColor: palette.border },
                        active && { borderColor: colors.green, backgroundColor: palette.greenSoft },
                      ]}
                    >
                      <Ionicons name={option.icon} size={19} color={active ? palette.greenDark : palette.textFaint} />
                      <Text style={[styles.methodTitle, { color: palette.text }]}>{option.title}</Text>
                      <Text style={[styles.methodNote, { color: active ? palette.greenDark : palette.textMuted }]}>{option.note}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {deliveryMethod === 'self_collection' ? (
                <>
                  <Text style={[styles.hint, { color: palette.textMuted }]}>
                    We hold the goods at a depot and call the receiver when they have cleared. No delivery fee.
                  </Text>
                  {depots.length > 0 ? depots.map((depot) => {
                    const selected = depotId === depot.id;
                    return (
                      <Pressable key={depot.id} onPress={() => setDepotId(depot.id)}
                        style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, selected && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemLabel, { color: palette.text }]}>{depot.name}</Text>
                          <Text style={[styles.itemPrice, { color: palette.textMuted }]}>
                            {[depot.address_line1, depot.city].filter(Boolean).join(', ')}
                            {depot.opening_hours ? ` · ${depot.opening_hours}` : ''}
                          </Text>
                        </View>
                        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.green : palette.textFaint} />
                      </Pressable>
                    );
                  }) : (
                    <Text style={[styles.hint, { color: palette.textMuted }]}>
                      We'll confirm your nearest collection point after booking.
                    </Text>
                  )}
                  <SectionTitle text="Who is collecting?" />
                  <Field label="Full name" value={draft.recipient.name} onChangeText={(v) => set({ recipient: { ...draft.recipient, name: v } })} autoCapitalize="words" />
                  <Field label="Phone number" value={draft.recipient.phone} onChangeText={(v) => set({ recipient: { ...draft.recipient, phone: v } })} keyboardType="phone-pad" placeholder="+263 7..." />
                  <Field label="City / town" value={draft.recipient.city} onChangeText={(v) => set({ recipient: { ...draft.recipient, city: v } })} autoCapitalize="words" placeholder="Bulawayo" />
                </>
              ) : (
              <>
              <SectionTitle text="Deliver to (Zimbabwe)" />
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                Select one or more saved delivery addresses — door delivery is {symbol}{business.fees.doorDeliveryPerAddress} per address, added to your total.
              </Text>
              {addresses.map((a) => {
                const selected = draft.deliveryAddressIds.includes(a.id);
                return (
                  <Pressable key={a.id} onPress={() => toggleAddress(a.id)}
                    style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, selected && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemLabel, { color: palette.text }]}>{a.recipient_name}{a.is_default ? '  ★' : ''}</Text>
                      <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{addressSummary(a)} · {a.recipient_phone}</Text>
                    </View>
                    <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={selected ? colors.green : palette.textFaint} />
                  </Pressable>
                );
              })}
              <Button title="+ Manage saved addresses" variant="outline" onPress={() => navigation.navigate('Addresses')} style={{ marginBottom: spacing.md }} />

              {draft.deliveryAddressIds.length === 0 && (
                <>
                  <SectionTitle text="…or enter the receiver directly" />
                  <Field label="Full name" value={draft.recipient.name} onChangeText={(v) => set({ recipient: { ...draft.recipient, name: v } })} autoCapitalize="words" />
                  <Field label="Phone number" value={draft.recipient.phone} onChangeText={(v) => set({ recipient: { ...draft.recipient, phone: v } })} keyboardType="phone-pad" placeholder="+263 7..." />
                  <Field label="Delivery address" value={draft.recipient.address} onChangeText={(v) => set({ recipient: { ...draft.recipient, address: v } })} multiline />
                  <Field label="City / town" value={draft.recipient.city} onChangeText={(v) => set({ recipient: { ...draft.recipient, city: v } })} autoCapitalize="words" placeholder="Harare, Bulawayo, Gweru…" />
                </>
              )}
              <Text style={[styles.hint, { color: palette.textMuted }]}>We deliver to all major cities and towns. For rural areas your receiver collects from the nearest covered town — free at our Harare, Bulawayo and Mutare depots.</Text>
              </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              {!draft.quote && (
                <>
                  <SectionTitle text="What are you shipping?" />
                  {catalogue.filter((c) => c.id !== 'seal').map((item) => {
                    const price = priceFor(item, draft.country);
                    return (
                      <View key={item.id} style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemLabel, { color: palette.text }]}>{item.label}</Text>
                          <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{price != null ? `${symbol}${price}` : item.note || 'Custom quote'}</Text>
                          <Text style={[styles.itemDescription, { color: palette.textMuted }]}>{item.description}</Text>
                        </View>
                        <View style={styles.qtyRow}>
                          <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, -1)}><Text style={styles.qtyBtnText}>−</Text></Pressable>
                          <Text style={styles.qtyText}>{qty(item.id)}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
              <SectionTitle text="Buy drums from us" />
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                Need something to pack into? We can bring drums to your collection. This is the drum itself — the
                shipping price above is separate.
              </Text>
              <View style={styles.drumRow}>
                {([
                  { value: 'metal' as const, label: 'Metal Drum', price: business.fees.metalDrumPurchase },
                  { value: 'plastic' as const, label: 'Plastic Barrel', price: business.fees.plasticDrumPurchase },
                ]).map((option) => {
                  const active = draft.purchaseDrums?.type === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => set({
                        purchaseDrums: active
                          ? null
                          : { type: option.value, quantity: Math.max(1, draft.purchaseDrums?.quantity || 1) },
                      })}
                      style={[
                        styles.drum,
                        { backgroundColor: palette.surface, borderColor: palette.border },
                        active && { borderColor: colors.green, backgroundColor: palette.greenSoft },
                      ]}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={19}
                        color={active ? colors.green : palette.textFaint}
                      />
                      <Text style={[styles.itemLabel, { color: palette.text }]}>{option.label}</Text>
                      <Text style={[styles.drumPrice, { color: active ? palette.greenDark : palette.textMuted }]}>
                        {symbol}{option.price ?? 0} each
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {draft.purchaseDrums && (
                <View style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: palette.text }]}>How many to buy?</Text>
                    <Text style={[styles.itemPrice, { color: palette.greenDark }]}>
                      Total {money(draft.purchaseDrums.quantity * ((draft.purchaseDrums.type === 'metal' ? business.fees.metalDrumPurchase : business.fees.plasticDrumPurchase) || 0), symbol)}
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => set({
                        purchaseDrums: draft.purchaseDrums!.quantity <= 1
                          ? null
                          : { ...draft.purchaseDrums!, quantity: draft.purchaseDrums!.quantity - 1 },
                      })}
                    ><Text style={styles.qtyBtnText}>−</Text></Pressable>
                    <Text style={styles.qtyText}>{draft.purchaseDrums.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => set({ purchaseDrums: { ...draft.purchaseDrums!, quantity: draft.purchaseDrums!.quantity + 1 } })}
                    ><Text style={styles.qtyBtnText}>+</Text></Pressable>
                  </View>
                </View>
              )}

              {draft.quote && (
                <Card>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Approved quote</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted }]} numberOfLines={3}>{draft.quote.description}</Text>
                  <Text style={[styles.quoteAmount, { color: palette.greenDark }]}>{money(draft.quote.amount, draft.quote.currency === 'EUR' ? '€' : '£')}</Text>
                  <Text style={[styles.hint, { color: palette.textMuted }]}>This price was set item by item by our team and can't be changed here. You can still add drums, trunks and seals below.</Text>
                </Card>
              )}

              <SectionTitle text="Metal coded seals (optional)" />
              <View style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Metal coded seal</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted }]}>
                    {symbol}{priceFor(catalogue.find((c) => c.id === 'seal')!, draft.country)} each — the driver seals your drums/trunks and records every code
                  </Text>
                </View>
                <View style={styles.qtyRow}>
                  <Pressable style={styles.qtyBtn} onPress={() => set({ sealsRequested: Math.max(0, draft.sealsRequested - 1) })}><Text style={styles.qtyBtnText}>−</Text></Pressable>
                  <Text style={styles.qtyText}>{draft.sealsRequested}</Text>
                  <Pressable style={styles.qtyBtn} onPress={() => set({ sealsRequested: draft.sealsRequested + 1 })}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                </View>
              </View>

              {draft.quote && (
                <>
                  <SectionTitle text="Add fixed-price extras (optional)" />
                  {catalogue.filter((c) => c.id !== 'seal' && priceFor(c, draft.country) != null).map((item) => (
                    <View key={item.id} style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemLabel, { color: palette.text }]}>{item.label}</Text>
                        <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{symbol}{priceFor(item, draft.country)}</Text>
                      </View>
                      <View style={styles.qtyRow}>
                        <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, -1)}><Text style={styles.qtyBtnText}>−</Text></Pressable>
                        <Text style={styles.qtyText}>{qty(item.id)}</Text>
                        <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Field label="Referred by (optional)" value={draft.referredBy} onChangeText={(v) => set({ referredBy: v })} placeholder={`Friend's name — they get £${business.fees.referralDiscount}/€${business.fees.referralDiscount} off`} autoCapitalize="words" />
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle text="Your collection date" />
              {shownCollection ? (
                <View style={[
                  styles.dateCard,
                  shownCollection.confirmed
                    ? { backgroundColor: palette.greenSoft, borderColor: colors.green }
                    : { backgroundColor: palette.surface, borderColor: colors.yellow },
                ]}>
                  <Ionicons
                    name={shownCollection.confirmed ? 'calendar' : 'time-outline'}
                    size={20}
                    color={shownCollection.confirmed ? palette.greenDark : colors.yellow}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.itemLabel, { color: palette.text }]}>{shownCollection.label}</Text>
                    <Text style={[styles.itemPrice, { color: shownCollection.confirmed ? palette.greenDark : '#8a6d00' }]}>
                      {shownCollection.route}
                      {shownCollection.confirmed ? '' : ' — we will confirm your own date after booking'}
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                Your postcode sets your collection route, and the route sets the date — so there is nothing to choose
                here. If the date needs to move, message us and we will sort it.
              </Text>

              <SectionTitle text="Choose payment method" />
              {paymentMethods.filter((m) => m.id !== 'other_payment').map((m) => (
                <Pressable key={m.id} onPress={() => set({ paymentMethod: m.label })}
                  style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, draft.paymentMethod === m.label && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                  <View style={[styles.payIcon, { backgroundColor: palette.greenSoft }]}>
                    <Ionicons name={(m.icon || 'wallet-outline') as keyof typeof Ionicons.glyphMap} size={17} color={palette.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: palette.text }]}>{m.label}</Text>
                    {m.note ? <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{m.note}</Text> : null}
                  </View>
                  <Ionicons name={draft.paymentMethod === m.label ? 'radio-button-on' : 'radio-button-off'} size={21} color={draft.paymentMethod === m.label ? colors.green : palette.textFaint} />
                </Pressable>
              ))}
              <Pressable onPress={() => setOtherPaymentsOpen((open) => !open)}
                style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.payIcon, { backgroundColor: palette.greenSoft }]}><Ionicons name="apps-outline" size={17} color={palette.green} /></View>
                <View style={{ flex: 1 }}><Text style={[styles.itemLabel, { color: palette.text }]}>Other payments</Text><Text style={[styles.itemPrice, { color: palette.textMuted }]}>{business.payments.otherProviders.map((p) => p.label).join(', ')}</Text></View>
                <Ionicons name={otherPaymentsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textFaint} />
              </Pressable>
              {otherPaymentsOpen && (
                <Card>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Send to: {business.payments.otherPaymentInstructions?.sendTo}</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted, marginBottom: spacing.sm }]}>Reference: {business.payments.otherPaymentInstructions?.reference}</Text>
                  {business.payments.otherProviders.map((method) => (
                    <Pressable key={method.id} onPress={() => set({ paymentMethod: method.label })} style={styles.otherPaymentRow}>
                      <Ionicons name={draft.paymentMethod === method.label ? 'radio-button-on' : 'radio-button-off'} size={20} color={draft.paymentMethod === method.label ? colors.green : palette.textFaint} />
                      <Text style={[styles.itemLabel, { color: palette.text, flex: 1 }]}>{method.label}</Text>
                    </Pressable>
                  ))}
                </Card>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <SectionTitle text="Review your booking" />
              <Card>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Collection: </Text>{draft.collectionAddress}, {draft.collectionCity} ({draft.country})</Text>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Sender: </Text>{draft.sender.firstName} {draft.sender.lastName} · {draft.sender.phone}</Text>
                {deliveryMethod === 'self_collection' ? (
                  <Text style={[styles.reviewLine, { color: palette.text }]}>
                    <Text style={styles.reviewKey}>Self-collection (free): </Text>
                    {draft.recipient.name} collects from {depots.find((d) => d.id === depotId)?.name || 'a depot we will confirm'}
                  </Text>
                ) : draft.deliveryAddressIds.length > 0 ? (
                  addresses.filter((a) => draft.deliveryAddressIds.includes(a.id)).map((a) => (
                    <Text key={a.id} style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Deliver to: </Text>{a.recipient_name} · {a.city}</Text>
                  ))
                ) : (
                  <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Receiver: </Text>{draft.recipient.name} · {draft.recipient.city}</Text>
                )}
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Items: </Text>{lines.filter((line) => !line.label.startsWith('Zimbabwe door delivery') && !line.label.endsWith('purchased from us')).map((line) => `${line.qty} × ${line.label}`).join(', ')}</Text>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Date: </Text>{shownCollection ? `${shownCollection.route} — ${shownCollection.label}${shownCollection.confirmed ? '' : ' (we will confirm)'}` : 'We will confirm your date'}</Text>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Payment: </Text>{draft.paymentMethod}</Text>
                {Boolean(draft.referredBy.trim()) && <Text style={styles.reviewLine}>✓ Referred by {draft.referredBy}</Text>}
              </Card>
              <Card>
                {lines.map((l, i) => (
                  <View key={i} style={styles.rowBetween}>
                    <Text style={[styles.reviewLine, { color: palette.text, flex: 1 }]}>{l.qty > 1 ? `${l.qty} × ` : ''}{l.label}</Text>
                    <Text style={[styles.reviewKey, { color: palette.text }]}>{l.unit != null ? money(l.qty * l.unit, symbol) : 'Quote'}</Text>
                  </View>
                ))}
                <View style={[styles.rowBetween, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.totalText, { color: palette.text }]}>Estimated total</Text>
                  <Text style={[styles.totalText, { color: palette.text }]}>{money(estimate, symbol)}{hasCustom ? ' + quote' : ''}</Text>
                </View>
                <Text style={styles.hint}>Includes collection, tracking, customs & declarations. The final total is confirmed and validated by our team{hasCustom ? ', including your custom items' : ''}.</Text>
              </Card>
              <Pressable onPress={() => setAgreed(!agreed)} style={styles.agreeRow} hitSlop={6}>
                <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={22} color={agreed ? colors.green : palette.textFaint} />
                <Text style={[styles.agreeText, { color: palette.text }]}>I agree to the Terms & Conditions and confirm I have read the Privacy Notice</Text>
              </Pressable>
              <View style={styles.legalLinks}>
                <Text accessibilityRole="link" onPress={() => Linking.openURL(`${business.company.website || ''}/terms-and-conditions`)} style={styles.legalLink}>Read Terms & Conditions</Text>
                <Text accessibilityRole="link" onPress={() => Linking.openURL(`${business.company.website || ''}/privacy-policy`)} style={styles.legalLink}>Read Privacy Notice</Text>
              </View>
            </>
          )}
        </KeyboardAwareScroll>

        <View style={[styles.footer, { backgroundColor: palette.surface, borderTopColor: palette.border, paddingBottom: spacing.lg + insets.bottom }]}>
          {step < STEPS.length - 1
            ? <Button title="Continue" onPress={() => setStep(step + 1)} disabled={!stepValid()} />
            : <Button title="CONFIRM BOOKING" onPress={submit} busy={submitting} disabled={!agreed} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  headerStep: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  stepCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 12, fontWeight: '800' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 3 },
  stepCaption: { fontSize: 12, fontWeight: '700', paddingHorizontal: spacing.lg, marginTop: 6 },
  payIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  body: { padding: spacing.lg, paddingBottom: 24 },
  signedOut: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  signedOutText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  drumRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  drum: { flex: 1, alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md },
  drumPrice: { fontSize: 15, fontWeight: '800' },
  toggle: { flex: 1, borderWidth: 1.5, borderColor: colors.green, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.white },
  toggleOn: { backgroundColor: colors.green },
  toggleText: { fontWeight: '700', color: colors.green, fontSize: 14 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm, lineHeight: 17 },
  coverage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  coverageText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  methodTitle: { fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  methodNote: { fontSize: 11.5, fontWeight: '700' },
  guidance: { flexDirection: 'row', gap: 8, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  guidanceText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  quoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  quoteBannerText: { flex: 1, fontSize: 12.5, fontWeight: '800', lineHeight: 17 },
  quoteAmount: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  itemLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemPrice: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  itemDescription: { fontSize: 11.5, lineHeight: 16, marginTop: 5, paddingRight: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: colors.greenDark },
  qtyText: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, marginTop: spacing.sm },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
  reviewLine: { fontSize: 13, color: colors.text, marginBottom: 4, flexShrink: 1 },
  reviewKey: { fontWeight: '700', color: colors.text, fontSize: 13 },
  totalText: { fontSize: 15, fontWeight: '800', color: colors.text },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  agreeText: { fontSize: 13 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginLeft: 30, marginTop: 4 },
  legalLink: { color: colors.green, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  otherPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8 },
});
