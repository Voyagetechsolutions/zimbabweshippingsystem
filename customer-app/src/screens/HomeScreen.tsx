import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { Card, Pill } from '../components/ui';
import { greeting, parseCollectionDate, longDate, daysUntil } from '../lib/format';
import { Shipment, journeyIndex, JOURNEY_STAGES, itemsSummary, statusTone } from '../lib/shipment';
import { useBusinessConfig } from '../lib/businessConfig';
import { loadSchedules, pickNextCollection, realValue, type NextCollection } from '../lib/collectionSchedule';
import { CollectionSlot, loadMySlots, slotState, slotSummary } from '../lib/collectionSlots';
import { useAppTheme, useThemedStyles } from '../context/ThemeContext';
import { IMG } from '../img';

const HEADER_GREEN = '#0b4a2f';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { session, profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [nextCollection, setNextCollection] = useState<NextCollection | null>(null);
  // The customer's own booked collection, which is a different question from
  // "when does the van next come to this area" — they may have booked onto a
  // later run, or onto a route their postcode does not obviously belong to.
  const [myCollection, setMyCollection] = useState<
    { slot: CollectionSlot | null; shipmentId: string; reference: string; route: string | null; date: Date | null } | null
  >(null);
  const {palette}=useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const { config: business } = useBusinessConfig();
  const referralDiscount = business.fees.referralDiscount;

  const load = useCallback(async () => {
    // Resolved first, because a booking that has not been given its own date
    // yet is shown against this one rather than against "to be confirmed".
    const area = { postcode: profile?.postal_code, city: profile?.pickup_city, country: profile?.country };
    const next = pickNextCollection(await loadSchedules(), area);
    setNextCollection(next);

    if (session?.user) {
      const { data } = await supabase
        .from('shipments')
        .select('id, tracking_number, customer_reference, status, origin, destination, created_at, metadata')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      const mine = (data as Shipment[]) || [];
      setShipments(mine);

      // Driven by the booking, not by the slot row: a slot only exists once the
      // customer has been asked (48 hours out) or has volunteered a time, and
      // this card has to be there from the moment they book.
      const slots = await loadMySlots().catch(() => []);
      const byShipment = Object.fromEntries(slots.map((slot) => [slot.shipment_id, slot]));
      const waiting = mine
        .filter((shipment) => journeyIndex(shipment.status) === 0)
        .map((shipment) => {
          const slot = byShipment[shipment.id];
          return {
            shipment,
            slot,
            route: realValue(slot?.route) || realValue(shipment.metadata?.collection?.route) || next?.route || null,
            // A booking whose own date has not been written yet falls back to
            // the published date for the route we would collect it on.
            date: parseCollectionDate(slot?.collection_date ?? shipment.metadata?.collection?.date)
              ?? next?.date
              ?? null,
          };
        })
        // A date we cannot read sorts last rather than dropping out — the
        // customer still needs to see that the booking is waiting on a date.
        .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

      const soonest = waiting[0];
      setMyCollection(soonest
        ? {
            slot: soonest.slot ?? null,
            shipmentId: soonest.shipment.id,
            reference: soonest.shipment.customer_reference || soonest.shipment.tracking_number,
            route: soonest.route,
            date: soonest.date,
          }
        : null);
    } else {
      setShipments([]);
      setMyCollection(null);
    }
  }, [session?.user?.id,profile?.postal_code,profile?.pickup_city,profile?.country]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!business.journeyStages.length) return <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]}><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{color:palette.textMuted}}>Loading current shipment settings…</Text></View></SafeAreaView>;

  const firstName = profile?.full_name?.split(' ')[0];
  const active = shipments.find((s) => journeyIndex(s.status) < 5);
  const stageIndex = active ? journeyIndex(active.status) : 0;

  const shareReferral = () => {
    Share.share({
      message: `I ship my drums and goods home with ${business.company.name || 'our shipping team'} — door to door from the UK & Ireland to Zimbabwe. Mention my name${firstName ? ` (${profile?.full_name})` : ''} when you book and I get £${referralDiscount} off my next shipment! ${business.company.website || ''}`,
    }).catch(() => {});
  };

  const actions = [
    { label: 'Get a\nQuote', icon: 'pricetag' as const, onPress: () => navigation.navigate('Quote') },
    { label: 'Book\nShipment', icon: 'cube' as const, onPress: () => navigation.navigate('Book', { freshToken: Date.now() }) },
    { label: 'Track\nShipment', icon: 'locate' as const, onPress: () => navigation.navigate('Tabs', { screen: 'Shipments' }) },
    { label: 'Ask\nZimmy', icon: 'chatbubbles' as const, onPress: () => navigation.navigate('Tabs', { screen: 'Zimmy' }) },
    { label: 'Returning\nResident', icon: 'home' as const, onPress: () => navigation.navigate('Quote', { type: 'returning_resident' }) },
  ];

  // Pull origin/destination city names for the shipment rows.
  const routeOf = (s: Shipment) => {
    const from = (s.origin || '').split(':')[0].trim() || s.metadata?.sender?.country || 'UK';
    const to = s.metadata?.recipient?.city || (s.destination || '').split(',').pop()?.trim() || 'Zimbabwe';
    return `${from} → ${to}`;
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:HEADER_GREEN}]} edges={['top']}>
      <ScrollView style={{backgroundColor:palette.bg}} contentContainerStyle={styles.scroll} stickyHeaderIndices={[]}>
        <View style={styles.header}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
              <Text style={styles.helloSub}>What would you like to ship today?</Text>
            </View>
            <Pressable onPress={()=>navigation.navigate('Notifications')} hitSlop={10} style={styles.bell}>
              <Ionicons name="notifications-outline" size={22} color={colors.white}/>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate('Quote')}>
            <ImageBackground source={IMG.heroLondon} style={styles.hero} imageStyle={{ borderRadius: radius.lg }} resizeMode="cover">
              <View style={styles.heroShade} />
              <View style={styles.heroInner}>
                <Text style={styles.heroKicker}>Ship from</Text>
                <Text style={styles.heroTitle}>UK & Ireland{'\n'}to Zimbabwe</Text>
                <View style={styles.heroCta}>
                  <Text style={styles.heroCtaText}>Get a Quote</Text>
                  <Ionicons name="arrow-forward" size={13} color={HEADER_GREEN} />
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        </View>

        <View style={[styles.body,{backgroundColor:palette.bg}]}>
          <Text style={[styles.sectionLabel,{color:palette.text}]}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {actions.map((a) => (
              <Pressable key={a.label} style={styles.action} onPress={a.onPress}>
                <View style={[styles.actionIcon,{backgroundColor:palette.greenSoft,borderColor:palette.border}]}>
                  <Ionicons name={a.icon} size={22} color={palette.green} />
                </View>
                <Text style={[styles.actionText,{color:palette.text}]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {active && (
            <Pressable onPress={() => navigation.navigate('ShipmentDetail', { id: active.id })}>
              <Card style={{ borderColor: colors.green }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardKicker}>ACTIVE SHIPMENT</Text>
                  <Pill text={active.status} bg={statusTone(active.status).bg} fg={statusTone(active.status).fg} />
                </View>
                <Text style={[styles.cardTitle,{color:palette.text}]}>{itemsSummary(active)}</Text>
                <Text style={[styles.cardMeta,{color:palette.textMuted}]}>{active.customer_reference || active.tracking_number}</Text>
                <View style={[styles.progressTrack,{backgroundColor:palette.border}]}>
                  <View style={[styles.progressFill, { width: `${((stageIndex + 1) / JOURNEY_STAGES.length) * 100}%` }]} />
                </View>
                <Text style={[styles.progressLabel,{color:palette.greenDark}]}>{JOURNEY_STAGES[stageIndex].label}</Text>
              </Card>
            </Pressable>
          )}

          {session && (
            <>
              <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
                <Text style={[styles.sectionLabel,{color:palette.text,marginBottom:0}]}>My Shipments</Text>
                {shipments.length > 0 && (
                  <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Shipments' })} hitSlop={8}>
                    <Text style={styles.viewAll}>View All</Text>
                  </Pressable>
                )}
              </View>
              {shipments.length === 0 ? (
                <Card><Text style={[styles.cardMeta,{color:palette.textMuted}]}>No shipments yet — book your first collection and it will appear here.</Text></Card>
              ) : (
                shipments.slice(0, 3).map((s) => {
                  const tone = statusTone(s.status);
                  return (
                    <Pressable key={s.id} onPress={() => navigation.navigate('ShipmentDetail', { id: s.id })}
                      style={[styles.shipRow,{backgroundColor:palette.surface,borderColor:palette.border}]}>
                      <View style={[styles.shipIcon,{backgroundColor:palette.greenSoft}]}>
                        <Ionicons name="cube-outline" size={19} color={palette.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shipRef,{color:palette.text}]}>#{s.customer_reference || s.tracking_number}</Text>
                        <Text style={[styles.shipMeta,{color:palette.textMuted}]}>{routeOf(s)}</Text>
                      </View>
                      <Pill text={s.status} bg={tone.bg} fg={tone.fg} />
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          {/* One collection card.
              These used to be two — "next collection in your area" and "your
              collection" — which on the common path printed the same route and
              the same date twice, one above the other. The customer's own
              booking is the answer when they have one; the area's next date is
              the answer when they don't, and it is only worth repeating
              alongside a booking when the two genuinely differ. */}
          {myCollection ? (() => {
            const state = slotState(myCollection.slot);
            // Two states want something from the customer, one is just news;
            // a settled time stays quiet green.
            const needsAttention = state === 'awaiting_customer'
              || state === 'dispatch_moved_untold' || state === 'dispatch_moved_told';
            const days = myCollection.date ? daysUntil(myCollection.date) : null;
            // A booking still carrying the old "To be assigned" placeholder
            // falls back to the route we would actually collect it on.
            const route = realValue(myCollection.route) || nextCollection?.route || null;
            // Only mention the area's next run when it is not the same day the
            // customer is already booked onto.
            const areaDiffers = Boolean(nextCollection && myCollection.date
              && nextCollection.date.toDateString() !== myCollection.date.toDateString());
            return (
              <Pressable onPress={() => navigation.navigate('ConfirmCollection', { id: myCollection.shipmentId })}>
                <Card style={{ borderColor: needsAttention ? colors.yellow : colors.green }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardKicker}>YOUR COLLECTION</Text>
                    <Text style={[styles.cardKicker, { color: palette.textMuted }]}>{myCollection.reference}</Text>
                  </View>
                  {route ? <Text style={[styles.cardTitle, { color: palette.text }]}>{route}</Text> : null}
                  {myCollection.date ? (
                    <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                      {longDate(myCollection.date)}
                      {days !== null && days >= 0 ? ` · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}
                    </Text>
                  ) : null}
                  {areaDiffers && nextCollection ? (
                    <Text style={[styles.cardMeta, { color: palette.textFaint }]}>
                      Next {nextCollection.route} run: {longDate(nextCollection.date)}
                    </Text>
                  ) : null}
                  <View style={styles.slotRow}>
                    <Ionicons
                      name={state === 'awaiting_customer' ? 'alarm-outline' : needsAttention ? 'swap-horizontal' : 'checkmark-circle'}
                      size={15}
                      color={needsAttention ? '#8a6d00' : palette.greenDark}
                    />
                    <Text style={[styles.slotText, { color: needsAttention ? '#8a6d00' : palette.greenDark }]}>
                      {slotSummary(myCollection.slot)}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={palette.textFaint} />
                  </View>
                </Card>
              </Pressable>
            );
          })() : nextCollection ? (
            <Card>
              <Text style={styles.cardKicker}>NEXT COLLECTION</Text>
              <Text style={[styles.cardTitle,{color:palette.text}]}>{nextCollection.route}</Text>
              <Text style={[styles.cardMeta,{color:palette.textMuted}]}>
                {longDate(nextCollection.date)}
                {nextCollection.isMyArea ? '' : ` · next published ${nextCollection.country} collection`}
              </Text>
              {daysUntil(nextCollection.date) >= 0 && (
                <Pill text={daysUntil(nextCollection.date) === 0 ? 'Today!' : `In ${daysUntil(nextCollection.date)} day${daysUntil(nextCollection.date) === 1 ? '' : 's'}`} />
              )}
            </Card>
          ) : null}

          <Pressable onPress={shareReferral}>
            <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink }}>
              <Text style={[styles.cardKicker, { color: colors.yellow }]}>REFER & SAVE</Text>
              <Text style={[styles.cardTitle, { color: colors.white }]}>Get £{referralDiscount}/€{referralDiscount} off your next shipment</Text>
              <Text style={[styles.cardMeta, { color: '#c8ccc7' }]}>Refer a friend — they mention your name when booking, you save. Tap to share.</Text>
            </Card>
          </Pressable>

          {!session && (
            <Card style={{ backgroundColor: palette.greenSoft, borderColor: colors.green }}>
              <Text style={[styles.cardTitle,{color:palette.text}]}>Create an account</Text>
              <Text style={[styles.cardMeta,{color:palette.textMuted}]}>Sign in to see your bookings, invoices and collection QR codes.</Text>
              <Pressable onPress={() => navigation.navigate('Auth')} style={styles.link}>
                <Text style={styles.linkText}>Sign in or register</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.green} />
              </Pressable>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 48 },
  header: { backgroundColor: HEADER_GREEN, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontSize: 22, fontWeight: '800', color: colors.white },
  helloSub: { fontSize: 13, color: '#bcd6c6', marginTop: 2 },
  bell: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: 9 },
  hero: { height: 150, marginTop: spacing.lg, justifyContent: 'flex-end' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 20, 12, 0.42)', borderRadius: radius.lg },
  heroInner: { padding: spacing.lg },
  heroKicker: { color: '#ffe89a', fontSize: 12, fontWeight: '700' },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 26, marginTop: 2 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  heroCtaText: { color: HEADER_GREEN, fontWeight: '800', fontSize: 12 },
  body: { padding: spacing.lg, paddingTop: spacing.lg },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  action: { alignItems: 'center', width: '18%' },
  actionIcon: { width: 54, height: 54, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  actionText: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', lineHeight: 15 },
  cardKicker: { fontSize: 11, fontWeight: '800', color: colors.green, letterSpacing: 0.8 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  cardMeta: { fontSize: 13, marginTop: 2, marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: radius.pill, marginTop: spacing.sm },
  progressFill: { height: 6, backgroundColor: colors.green, borderRadius: radius.pill },
  progressLabel: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  viewAll: { color: colors.green, fontWeight: '700', fontSize: 13 },
  shipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  shipIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  shipRef: { fontSize: 14, fontWeight: '700' },
  shipMeta: { fontSize: 12, marginTop: 1 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  slotText: { flex: 1, fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  linkText: { color: colors.green, fontWeight: '700', fontSize: 14 },
});
