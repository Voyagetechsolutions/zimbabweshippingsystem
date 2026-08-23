import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Switch, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { Card, Button, Field, SectionTitle, FlagStripe } from '../components/ui';
import { CATALOGUE, Country, currencyFor, priceFor, DELIVERY_FEE } from '../lib/catalogue';
import { BookingDraft, EMPTY_DRAFT, QuoteCarry, createBooking, draftLines, DESCRIPTION_GUIDANCE } from '../lib/booking';
import { CustomerAddress, listAddresses, addressSummary } from '../lib/addresses';
import { parseCollectionDate, longDate, money } from '../lib/format';
import {
  scheduleMatchesPostcode, autocompletePostcode, searchAddresses, lookupUkPostcode,
  coverageForUkPostcode, prettyPostcode, type Coverage,
} from '../lib/postcode';
import { SuggestField } from '../components/SuggestField';
import { useAppTheme } from '../context/ThemeContext';

const STEPS = ['Collection', 'Sender', 'Goods', 'Delivery', 'Extras', 'Date', 'Review'] as const;
const DRAFT_KEY = 'zim-booking-draft-v2';

// Payment is settled offline (bank transfer / remittance / cash) — the choice
// here is recorded on the invoice so the finance team knows what to expect.
const PAYMENT_METHODS: Array<{ value: string; icon: keyof typeof Ionicons.glyphMap; note?: string }> = [
  { value: 'Bank Transfer', icon: 'business-outline', note: 'Details shared after booking' },
  { value: 'Cash on Collection', icon: 'cash-outline', note: 'Pay the driver at your door' },
  { value: 'Pay on Arrival (+20%)', icon: 'time-outline', note: 'Pay when goods reach Zimbabwe' },
  { value: 'WorldRemit', icon: 'globe-outline' },
  { value: 'Western Union', icon: 'swap-horizontal-outline' },
  { value: 'Mukuru', icon: 'send-outline' },
  { value: 'Ria Money Transfer', icon: 'paper-plane-outline' },
  { value: 'Remitly', icon: 'wallet-outline' },
];

type ScheduleRow = { id: string; route: string; pickup_date: string; country?: string | null; areas?: any };
type DepotRow = { id: string; name: string; city: string; address_line1: string; opening_hours: string | null };

export default function BookScreen() {
  const navigation = useNavigation<any>();
  const { session, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { palette } = useAppTheme();

  // Coordinates of the resolved collection postcode — biases address search to
  // the customer's own area rather than the whole country.
  const [postcodePoint, setPostcodePoint] = useState<{ latitude: number; longitude: number } | null>(null);
  // Whether the town was filled in for the customer. An auto-filled town follows
  // the postcode; one they typed themselves is left alone.
  const [cityAutoFilled, setCityAutoFilled] = useState(false);

  // Door delivery keeps its per-address fee; self-collection is free and the
  // receiver picks the goods up from a depot.
  const [deliveryMethod, setDeliveryMethod] = useState<'door' | 'self_collection'>('door');
  const [depots, setDepots] = useState<DepotRow[]>([]);
  const [depotId, setDepotId] = useState<string | null>(null);

  const routeParams = (useRoute<any>().params || {}) as { quote?: QuoteCarry; prefillItems?: Record<string, number>; prefillCountry?: Country };

  // Resume an unfinished booking; pre-fill from the profile and any quote.
  useEffect(() => {
    (async () => {
      let base = EMPTY_DRAFT;
      let resumed = false;
      try {
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
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
          goodsDescription: base.goodsDescription || routeParams.quote.description,
        };
      }
      setDraft(base);
    })();
  }, [profile?.id]);

  useEffect(() => {
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
    try { setAddresses(await listAddresses(session.user.id)); } catch { /* shown as empty */ }
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const upcoming = useMemo(() => {
    const wantIreland = draft.country === 'Ireland';
    return schedules
      .filter((s) => s.route !== 'SCOTLAND ROUTE')
      .filter((s) => {
        const c = String(s.country || 'UK').toLowerCase();
        return wantIreland ? c.includes('ireland') : !c.includes('ireland');
      })
      .filter((s) => scheduleMatchesPostcode(s.areas, draft.collectionPostcode, draft.collectionCity, draft.country))
      .map((s) => ({ ...s, parsed: parseCollectionDate(s.pickup_date) }))
      .filter((s) => s.parsed && s.parsed.getTime() >= Date.now() - 86400000)
      .sort((a, b) => (a.parsed as Date).getTime() - (b.parsed as Date).getTime())
      .slice(0, 12);
  }, [schedules, draft.country, draft.collectionPostcode, draft.collectionCity]);

  const { lines, estimate, hasCustom, symbol } = draftLines(draft);
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
          if (d.collectionCity && !cityAutoFilled) return d;
          if (d.collectionCity === place.city) return d;
          return { ...d, collectionCity: place.city };
        });
        setCityAutoFilled(true);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draft.collectionPostcode, isIrelandPickup, cityAutoFilled]);

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
      case 2: return draft.goodsDescription.trim().length >= 15;
      case 3: return hasDelivery;
      case 4: return lines.length > 0;
      default: return true;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const created = await createBooking(draft, session?.user?.id ?? null);

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
      Alert.alert('Booking failed', e?.message || 'Please try again, or ask Zimmy to book for you.');
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
                  // postcode too, so the three fields can't disagree.
                  set({
                    collectionAddress: suggestion.primary,
                    ...(town ? { collectionCity: town } : {}),
                    ...(postcode && !isIrelandPickup ? { collectionPostcode: postcode } : {}),
                  });
                  setCityAutoFilled(Boolean(town));
                }}
              />

              <Field
                label="Town / city"
                value={draft.collectionCity}
                onChangeText={(v) => { setCityAutoFilled(false); set({ collectionCity: v }); }}
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
                    autoCapitalize="none"
                    value={draft.collectionPostcode}
                    onChangeText={(v) => set({ collectionPostcode: v.toUpperCase() })}
                    placeholder="LU1 1AA"
                    hint="Your postcode decides which collection route covers you."
                    fetcher={async (query) => {
                      const options = await autocompletePostcode(query);
                      return options.map((option) => ({ key: option, primary: option }));
                    }}
                    onPick={(suggestion) => set({ collectionPostcode: prettyPostcode(suggestion.primary) })}
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
              <SectionTitle text="Describe your goods in detail" />
              <View style={[styles.guidance, { backgroundColor: palette.greenSoft }]}>
                <Ionicons name="information-circle-outline" size={17} color={palette.greenDark} />
                <Text style={[styles.guidanceText, { color: palette.greenDark }]}>{DESCRIPTION_GUIDANCE}</Text>
              </View>
              <Field
                label="Detailed goods description (required)"
                value={draft.goodsDescription}
                onChangeText={(v) => set({ goodsDescription: v })}
                multiline
                placeholder="e.g. 2 blue 220L plastic drums packed with clothes, shoes and groceries; 1 silver LG washing machine (good condition); 1 brown wooden trunk 90×50×50cm marked 'T. Moyo' containing kitchenware — fragile plates inside…"
              />
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                The driver checks your goods against this description at collection, and it appears on your invoice and delivery note.
              </Text>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle text="How should the receiver get the goods?" />
              <View style={styles.methodRow}>
                {([
                  { value: 'door' as const, title: 'Door delivery', note: `${symbol}${DELIVERY_FEE} per address`, icon: 'car-outline' as const },
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
                Select one or more saved delivery addresses — door delivery is {symbol}{DELIVERY_FEE} per address, added to your total.
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

          {step === 4 && (
            <>
              {!draft.quote && (
                <>
                  <SectionTitle text="What are you shipping?" />
                  {CATALOGUE.filter((c) => c.id !== 'seal').map((item) => {
                    const price = priceFor(item, draft.country);
                    return (
                      <View key={item.id} style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemLabel, { color: palette.text }]}>{item.label}</Text>
                          <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{price != null ? `${symbol}${price}` : item.note || 'Custom quote'}</Text>
                        </View>
                        <View style={styles.qtyRow}>
                          <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, -1)}><Text style={styles.qtyBtnText}>−</Text></Pressable>
                          <Text style={styles.qtyText}>{qty(item.id)}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => bump(item.id, 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                        </View>
                      </View>
                    );
                  })}
                  <Field label="Anything else? (cars, furniture, commercial goods…)" value={draft.otherItems} onChangeText={(v) => set({ otherItems: v })} multiline placeholder="Describe the item — our team sends a custom quote" />
                </>
              )}
              {draft.quote && (
                <Card>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Approved quote</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted }]} numberOfLines={3}>{draft.quote.description}</Text>
                  <Text style={[styles.quoteAmount, { color: palette.greenDark }]}>{money(draft.quote.amount, draft.quote.currency === 'EUR' ? '€' : '£')}</Text>
                  <Text style={[styles.hint, { color: palette.textMuted }]}>This price was set by our team and can't be changed here. You can still add drums, trunks and other extras below.</Text>
                </Card>
              )}

              <SectionTitle text="Metal coded seals (optional)" />
              <View style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Metal coded seal</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted }]}>
                    {symbol}{priceFor(CATALOGUE.find((c) => c.id === 'seal')!, draft.country)} each — the driver seals your drums/trunks and records every code
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
                  {CATALOGUE.filter((c) => c.id !== 'seal' && priceFor(c, draft.country) != null).map((item) => (
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

              <View style={[styles.switchRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>I am a returning resident</Text>
                  <Text style={styles.hint}>Moving back for good? You get a discount + customs help</Text>
                </View>
                <Switch value={draft.returningResident} onValueChange={(v) => set({ returningResident: v })} trackColor={{ true: colors.green }} />
              </View>
              <Field label="Referred by (optional)" value={draft.referredBy} onChangeText={(v) => set({ referredBy: v })} placeholder="Friend's name — they get £20/€20 off" autoCapitalize="words" />
            </>
          )}

          {step === 5 && (
            <>
              <SectionTitle text="Pick a collection date" />
              {upcoming.length === 0 && (
                <Text style={styles.hint}>No published dates for {draft.country} yet — book anyway and our team will confirm your collection date.</Text>
              )}
              {upcoming.map((s) => {
                const selected = draft.scheduleId === s.id;
                return (
                  <Pressable key={s.id} onPress={() => set({ scheduleId: s.id, route: s.route, collectionDate: s.pickup_date })}
                    style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, selected && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemLabel, { color: palette.text }]}>{s.route}</Text>
                      <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{s.parsed ? longDate(s.parsed) : s.pickup_date}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.green} />}
                  </Pressable>
                );
              })}
              <Pressable onPress={() => set({ scheduleId: null, route: null, collectionDate: null })}
                style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, !draft.scheduleId && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>Let the team pick for me</Text>
                  <Text style={[styles.itemPrice, { color: palette.textMuted }]}>We confirm the next date for your area</Text>
                </View>
                {!draft.scheduleId && <Ionicons name="checkmark-circle" size={22} color={colors.green} />}
              </Pressable>

              <SectionTitle text="Choose payment method" />
              {PAYMENT_METHODS.map((m) => (
                <Pressable key={m.value} onPress={() => set({ paymentMethod: m.value })}
                  style={[styles.dateCard, { backgroundColor: palette.surface, borderColor: palette.border }, draft.paymentMethod === m.value && { borderColor: palette.green, backgroundColor: palette.greenSoft }]}>
                  <View style={[styles.payIcon, { backgroundColor: palette.greenSoft }]}>
                    <Ionicons name={m.icon} size={17} color={palette.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: palette.text }]}>{m.value}</Text>
                    {m.note ? <Text style={[styles.itemPrice, { color: palette.textMuted }]}>{m.note}</Text> : null}
                  </View>
                  <Ionicons name={draft.paymentMethod === m.value ? 'radio-button-on' : 'radio-button-off'} size={21} color={draft.paymentMethod === m.value ? colors.green : palette.textFaint} />
                </Pressable>
              ))}
            </>
          )}

          {step === 6 && (
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
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Goods: </Text>{draft.goodsDescription.slice(0, 140)}{draft.goodsDescription.length > 140 ? '…' : ''}</Text>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Date: </Text>{draft.route ? `${draft.route} — ${draft.collectionDate}` : 'Team confirms next available'}</Text>
                <Text style={[styles.reviewLine, { color: palette.text }]}><Text style={styles.reviewKey}>Payment: </Text>{draft.paymentMethod}</Text>
                {draft.returningResident && <Text style={styles.reviewLine}>✓ Returning resident discount requested</Text>}
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
                <Text accessibilityRole="link" onPress={() => Linking.openURL('https://zimbabweshipping.com/terms-and-conditions')} style={styles.legalLink}>Read Terms & Conditions</Text>
                <Text accessibilityRole="link" onPress={() => Linking.openURL('https://zimbabweshipping.com/privacy-policy')} style={styles.legalLink}>Read Privacy Notice</Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < STEPS.length - 1
            ? <Button title="Continue" onPress={() => setStep(step + 1)} disabled={!stepValid()} />
            : <Button title="CONFIRM BOOKING" onPress={submit} busy={submitting} disabled={!agreed} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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
});
