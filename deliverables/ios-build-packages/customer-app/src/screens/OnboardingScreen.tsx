import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Field, FlagStripe } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { parseCollectionDate, longDate } from '../lib/format';
import { lookupUkPostcode, normalizePostcode, outwardCode, routeForIrelandCity, routeForUkPostcode, scheduleMatchesPostcode } from '../lib/postcode';

type ScheduleRow = { route: string; pickup_date: string; country?: string | null; areas?: any };

export default function OnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const { palette } = useAppTheme();
  const parts = (profile?.full_name || '').split(' ');
  const [first, setFirst] = useState(profile?.first_name || parts[0] || '');
  const [last, setLast] = useState(profile?.last_name || parts.slice(1).join(' ') || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [address, setAddress] = useState(profile?.pickup_address || '');
  const [city, setCity] = useState(profile?.pickup_city || '');
  const [postcode, setPostcode] = useState(profile?.postal_code || '');
  const [country, setCountry] = useState<'United Kingdom' | 'Ireland'>(profile?.country === 'Ireland' ? 'Ireland' : 'United Kingdom');
  const [busy, setBusy] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [ukLookup, setUkLookup] = useState<{ city: string; candidates: string[] } | null>(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    supabase.from('collection_schedules').select('route, pickup_date, country, areas').limit(300)
      .then(({ data }) => setSchedules((data as ScheduleRow[]) || []));
  }, []);

  const isIreland = country === 'Ireland';
  const ukRoute = useMemo(() => routeForUkPostcode(postcode), [postcode]);
  const routeHint = isIreland ? routeForIrelandCity(city, schedules) : ukRoute.route;

  // UK: resolve the typed postcode to its town via postcodes.io (debounced),
  // and auto-fill the city so the collection route appears without extra typing.
  useEffect(() => {
    if (isIreland) { setUkLookup(null); return; }
    const clean = normalizePostcode(postcode);
    if (clean.length < 5) { setUkLookup(null); return; }
    let cancelled = false;
    setLooking(true);
    const timer = setTimeout(async () => {
      const result = await lookupUkPostcode(postcode);
      if (cancelled) return;
      setUkLookup(result);
      setLooking(false);
      if (result?.city) setCity((current) => (current.trim() ? current : result.city));
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); setLooking(false); };
  }, [postcode, isIreland]);

  // The user has typed enough for a meaningful route lookup.
  const lookupReady = isIreland
    ? city.trim().length >= 3
    : Boolean(ukLookup) || city.trim().length >= 3 || outwardCode(postcode).length >= 2;

  // Live collection-area match: one entry per route with its next pickup date.
  const matchedRoutes = useMemo(() => {
    if (!lookupReady) return [];
    const wantIreland = isIreland;
    const townCandidates = wantIreland ? [city] : [city, ...(ukLookup?.candidates || [])];
    const byRoute = new Map<string, Date | null>();
    schedules
      .filter((s) => s.route !== 'SCOTLAND ROUTE')
      .filter((s) => {
        const c = String(s.country || 'UK').toLowerCase();
        return wantIreland ? c.includes('ireland') : !c.includes('ireland');
      })
      .filter((s) => s.route === routeHint || townCandidates.some((town) => scheduleMatchesPostcode(s.areas, postcode, town, country)))
      .forEach((s) => {
        const date = parseCollectionDate(s.pickup_date);
        const upcoming = date && date.getTime() >= Date.now() - 86400000 ? date : null;
        const existing = byRoute.get(s.route);
        if (!byRoute.has(s.route) || (upcoming && (!existing || upcoming < existing))) {
          byRoute.set(s.route, upcoming || existing || null);
        }
      });
    // Route prefixes are part of the shipping service definition, so keep the
    // route visible even when there is no future collection date published yet.
    if (routeHint && !byRoute.has(routeHint)) byRoute.set(routeHint, null);
    return [...byRoute.entries()].slice(0, 3).map(([route, date]) => ({ route, date }));
  }, [schedules, lookupReady, isIreland, postcode, city, country, ukLookup, routeHint]);

  const submit = async () => {
    if (!first.trim() || !last.trim() || phone.replace(/\D/g, '').length < 7 || address.trim().length < 5 || (isIreland ? city.trim().length < 2 : postcode.replace(/\s/g, '').length < 3)) {
      Alert.alert('Complete your profile', isIreland
        ? 'Name, phone, pickup address and city are required.'
        : 'Name, phone, pickup address and postcode are required.');
      return;
    }
    if (!session?.user.id) return;
    setBusy(true);
    try {
      const values = {
        id: session.user.id,
        email: session.user.email,
        full_name: `${first.trim()} ${last.trim()}`,
        first_name: first.trim(),
        last_name: last.trim(),
        phone_number: phone.trim(),
        pickup_address: address.trim(),
        pickup_city: city.trim(),
        postal_code: postcode.trim().toUpperCase(),
        country,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      // Update first so an existing website customer keeps the same profile.
      // Only insert when this auth user has no profile row yet.
      const updated = await supabase.from('profiles')
        .update(values)
        .eq('id', session.user.id)
        .select('id')
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) {
        const inserted = await supabase.from('profiles').insert(values);
        if (inserted.error) throw inserted.error;
      }
      await refreshProfile();
    } catch (e: any) {
      const message = /row-level security/i.test(String(e?.message))
        ? 'We could not create your profile — please close the app and try again, or contact us on WhatsApp +44 7584 100552.'
        : e?.message || 'Try again.';
      Alert.alert('Profile not saved', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.bg }]}>
      <FlagStripe />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.title, { color: palette.text }]}>Set up your shipping profile</Text>
          <Text style={[s.sub, { color: palette.textMuted }]}>
            {isIreland
              ? 'Your city connects you to a monthly collection route.'
              : 'Your postcode connects you to a monthly collection route.'}
          </Text>

          <Text style={[s.label, { color: palette.textMuted }]}>Where do we collect from?</Text>
          <View style={s.toggleRow}>
            {(['United Kingdom', 'Ireland'] as const).map((c) => (
              <Pressable key={c} onPress={() => setCountry(c)}
                style={[s.toggle, { backgroundColor: palette.surface }, country === c && s.toggleOn]}>
                <Text style={[s.toggleText, country !== c && { color: palette.green }]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.row}>
            <View style={s.flex}><Field label="First name" value={first} onChangeText={setFirst} autoCapitalize="words" /></View>
            <View style={s.flex}><Field label="Surname" value={last} onChangeText={setLast} autoCapitalize="words" /></View>
          </View>
          <Field label="WhatsApp / phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={isIreland ? '+353 8...' : '+44 7...'} />
          <Field label="Default pickup address" value={address} onChangeText={setAddress} placeholder="24 King Street" />
          <Field label={isIreland ? 'City / town' : 'Town / city'} value={city} onChangeText={setCity} autoCapitalize="words" placeholder={isIreland ? 'Dublin' : 'Luton'} />
          {!isIreland && <Field label="Postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="none" placeholder="LU1 3XX" />}
          {isIreland && <Field label="Eircode (optional)" value={postcode} onChangeText={setPostcode} autoCapitalize="none" placeholder="D01 F2P8" />}

          {!isIreland && ukRoute.restricted && (
            <View style={[s.routeCard, { backgroundColor: palette.yellowSoft, borderColor: colors.yellow }]}>
              <View style={s.routeHeader}>
                <Ionicons name="information-circle" size={16} color="#8a6d00" />
                <Text style={[s.routeKicker, { color: '#8a6d00' }]}>SPECIAL COLLECTION AREA</Text>
              </View>
              <Text style={[s.routeDate, { color: palette.textMuted }]}>This postcode needs collection confirmation from our team. You can still finish setting up your account.</Text>
            </View>
          )}

          {lookupReady && matchedRoutes.length > 0 && (
            <View style={[s.routeCard, { backgroundColor: palette.greenSoft, borderColor: colors.green }]}>
              <View style={s.routeHeader}>
                <Ionicons name="location" size={16} color={palette.greenDark} />
                <Text style={[s.routeKicker, { color: palette.greenDark }]}>YOUR COLLECTION AREA</Text>
              </View>
              {matchedRoutes.map((m) => (
                <View key={m.route} style={s.routeRow}>
                  <Text style={[s.routeName, { color: palette.text }]}>{m.route}</Text>
                  <Text style={[s.routeDate, { color: palette.textMuted }]}>
                    {m.date ? `Next collection: ${longDate(m.date)}` : 'Next date to be announced'}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {lookupReady && schedules.length > 0 && matchedRoutes.length === 0 && !ukRoute.restricted && (
            <View style={[s.routeCard, { backgroundColor: palette.yellowSoft, borderColor: colors.yellow }]}>
              <View style={s.routeHeader}>
                <Ionicons name="information-circle" size={16} color="#8a6d00" />
                <Text style={[s.routeKicker, { color: '#8a6d00' }]}>AREA NOT MATCHED YET</Text>
              </View>
              <Text style={[s.routeDate, { color: palette.textMuted }]}>
                No published route covers {isIreland ? city.trim() : postcode.trim().toUpperCase()} yet — you can still register and our team will confirm your collection area.
              </Text>
            </View>
          )}

          <Button title="Save and continue" onPress={submit} busy={busy} />
          <Text style={[s.hint, { color: palette.textMuted }]}>Your permanent customer code will be generated from your name, joining month and phone number.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { flexGrow: 1, padding: spacing.xl, paddingBottom: 220 },
  title: { fontSize: 25, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggle: { flex: 1, borderWidth: 1.5, borderColor: colors.green, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  toggleOn: { backgroundColor: colors.green },
  toggleText: { fontWeight: '700', color: colors.white, fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  routeCard: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  routeKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  routeRow: { marginBottom: 6 },
  routeName: { fontSize: 15, fontWeight: '800' },
  routeDate: { fontSize: 12.5, lineHeight: 18, marginTop: 1 },
  hint: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: spacing.md },
});
