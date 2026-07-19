import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Share, Pressable, ActivityIndicator, ImageBackground, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { FlagStripe, Card, Pill, Button, SectionTitle } from '../components/ui';
import { Shipment, JOURNEY_STAGES, journeyIndex, itemsSummary, invoiceOf, senderOf, recipientOf, statusTone } from '../lib/shipment';
import { buildInvoiceHtml, buildDeliveryNoteHtml, sharePdf } from '../lib/documents';
import { money } from '../lib/format';
import { useAppTheme } from '../context/ThemeContext';
import { IMG } from '../img';

// Friendly headline for the hero banner, keyed by journey stage.
const STAGE_HEADLINES = [
  { title: 'Booking Confirmed', sub: "We're preparing your collection" },
  { title: 'Collected', sub: 'Your items are safely with our team' },
  { title: 'In Transit', sub: 'Your shipment is on the way' },
  { title: 'Arrived in Zimbabwe', sub: 'Clearing customs and heading to the depot' },
  { title: 'Out for Delivery', sub: 'Your receiver should be ready today' },
  { title: 'Delivered 🎉', sub: 'Thank you for shipping with us' },
] as const;

export default function ShipmentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id, celebrate } = route.params || {};
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const {palette}=useAppTheme();

  useEffect(() => {
    supabase
      .from('shipments')
      .select('id, tracking_number, customer_reference, status, origin, destination, qr_token, collection_code, delivery_code, driver_status, goods_description, driver_description_correction, created_at, metadata')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => { setShipment(data as Shipment | null); setLoading(false); });
    // A unique channel name avoids reusing a subscribed channel during Expo
    // Fast Refresh or React development-mode effect remounts.
    const channel=supabase.channel(`customer-shipment-${id}-${Date.now()}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'shipments',filter:`id=eq.${id}`},(payload)=>setShipment((current)=>current?{...current,...(payload.new as any)}:payload.new as Shipment)).subscribe();
    return()=>{supabase.removeChannel(channel);};
  }, [id]);

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View></SafeAreaView>;
  }
  if (!shipment) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.metaText}>Shipment not found.</Text></View></SafeAreaView>;
  }

  const stage = journeyIndex(shipment.status);
  const invoice = invoiceOf(shipment);
  const sender = senderOf(shipment);
  const recipient = recipientOf(shipment);
  const collection = shipment.metadata?.collection || {};
  const qrValue = shipment.qr_token || shipment.metadata?.qrToken;
  const symbol = invoice?.currency === 'EUR' ? '€' : '£';
  const tone = statusTone(shipment.status);

  const shareTracking = () => {
    Share.share({
      message: `Track our Zimbabwe Shipping delivery: ${shipment.tracking_number} — https://zimbabweshipping.com/track?number=${shipment.tracking_number}`,
    }).catch(() => {});
  };

  const seals = shipment.metadata?.seals;
  const sealsRequested = Number(shipment.metadata?.sealsRequested || 0);
  const deliveryAddresses: any[] = Array.isArray(shipment.metadata?.deliveryAddresses) ? shipment.metadata.deliveryAddresses : [];
  const goodsDescription = (shipment as any).goods_description || shipment.metadata?.shipment?.description;
  const driverCorrection = (shipment as any).driver_description_correction;
  const deliveryNoteReady = stage >= 5 || shipment.metadata?.deliveryConfirmation;

  const downloadInvoice = async () => {
    setDownloading('invoice');
    try { await sharePdf(buildInvoiceHtml(shipment), `${shipment.metadata?.invoice?.invoiceNumber || 'invoice'}.pdf`); }
    catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };

  const downloadDeliveryNote = async () => {
    setDownloading('note');
    try {
      const { data: note } = await supabase.from('delivery_notes').select('*').eq('shipment_id', shipment.id).maybeSingle();
      await sharePdf(buildDeliveryNoteHtml(shipment, { deliveryNote: note }), `${note?.note_number || 'delivery-note'}.pdf`);
    } catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Ionicons name="arrow-back" size={22} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle,{color:palette.text}]}>{shipment.customer_reference || shipment.tracking_number}</Text>
        <Pressable onPress={shareTracking} hitSlop={12}><Ionicons name="share-social-outline" size={21} color={colors.green} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ImageBackground source={IMG.trackBanner} style={styles.banner} imageStyle={{ borderRadius: radius.lg }} resizeMode="cover">
          <View style={styles.bannerShade} />
          <View style={styles.bannerInner}>
            <Text style={styles.bannerTitle}>{STAGE_HEADLINES[stage].title}</Text>
            <Text style={styles.bannerSub}>{STAGE_HEADLINES[stage].sub}</Text>
          </View>
        </ImageBackground>

        {celebrate && (
          <Card style={{ backgroundColor: colors.greenSoft, borderColor: colors.green }}>
            <Text style={styles.celebrate}>🎉 Booking confirmed!</Text>
            <Text style={styles.metaText}>We've alerted the team. Keep your QR code below ready for collection day — the driver scans it at your door.</Text>
          </Card>
        )}

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{itemsSummary(shipment)}</Text>
            <Pill text={shipment.status} bg={tone.bg} fg={tone.fg} />
          </View>
          <Text style={styles.metaText}>Tracking: {shipment.tracking_number}</Text>
          {Boolean(collection.route) && <Text style={styles.metaText}>Collection: {collection.route} — {collection.date}</Text>}
        </Card>

        <SectionTitle text="Journey" />
        <Card>
          {JOURNEY_STAGES.map((s, i) => {
            const done = i <= stage;
            const current = i === stage;
            return (
              <View key={s.key} style={styles.stageRow}>
                <View style={styles.stageRail}>
                  <View style={[styles.stageDot, done && { backgroundColor: colors.green, borderColor: colors.green }]}>
                    {done && <Ionicons name="checkmark" size={11} color={colors.white} />}
                  </View>
                  {i < JOURNEY_STAGES.length - 1 && <View style={[styles.stageLine, i < stage && { backgroundColor: colors.green }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < JOURNEY_STAGES.length - 1 ? 18 : 0 }}>
                  <Text style={[styles.stageLabel, current && { color: colors.greenDark, fontWeight: '800' }]}>{s.label}</Text>
                  {current && stage < 5 && <Text style={styles.stageNow}>Current stage</Text>}
                </View>
                <Ionicons name={s.icon as any} size={18} color={done ? colors.green : colors.textFaint} />
              </View>
            );
          })}
        </Card>

        {invoice && (
          <>
            <SectionTitle text="Invoice" />
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.metaText}>Estimated total</Text>
                <Text style={styles.invoiceTotal}>{money(invoice.total, symbol)}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.metaText}>Status</Text>
                <Pill text={invoice.paid ? 'Paid' : 'Payment due'} bg={invoice.paid ? colors.greenSoft : colors.yellowSoft} fg={invoice.paid ? colors.greenDark : '#8a6d00'} />
              </View>
              {!invoice.paid && (
                <Text style={styles.hint}>
                  We accept bank transfer, cash on collection, or pay on arrival. For bank details contact Mr. Moyo on +44 7984 099041 and reference your tracking number, initials and surname.
                </Text>
              )}
            </Card>
          </>
        )}

        {qrValue && (
          <>
            <SectionTitle text="Collection QR code" />
            <Card style={{ alignItems: 'center', gap: 10 }}>
              <QRCode value={String(qrValue)} size={170} />
              <Text style={[styles.hint, { textAlign: 'center',color:palette.textMuted }]}>Show this to the assigned driver. Scanning it records your digital handover signature.</Text>
            </Card>
          </>
        )}

        {(shipment.collection_code||shipment.delivery_code)&&<><SectionTitle text="Handover security codes"/><Card><Text style={[styles.hint,{color:palette.textMuted}]}>Only give a code to the driver when the correct handover is being completed.</Text>{shipment.collection_code?<View style={styles.codeRow}><Text style={[styles.metaText,{color:palette.textMuted}]}>Collection code</Text><Text style={[styles.code,{color:palette.green}]}>{shipment.collection_code}</Text></View>:null}{shipment.delivery_code?<View style={styles.codeRow}><Text style={[styles.metaText,{color:palette.textMuted}]}>Delivery code</Text><Text style={[styles.code,{color:palette.green}]}>{shipment.delivery_code}</Text></View>:null}</Card></>}

        <SectionTitle text="Details" />
        <Card>
          <Text style={styles.metaText}><Text style={styles.bold}>From: </Text>{sender.name || '—'}, {shipment.origin || sender.address}</Text>
          <Text style={styles.metaText}><Text style={styles.bold}>To: </Text>{recipient.name || '—'}, {shipment.destination || recipient.address}</Text>
          <Text style={styles.metaText}><Text style={styles.bold}>Receiver phone: </Text>{recipient.phone || '—'}</Text>
          {Boolean(goodsDescription) && <Text style={styles.metaText}><Text style={styles.bold}>Goods: </Text>{goodsDescription}</Text>}
          {Boolean(driverCorrection) && <Text style={[styles.metaText, { color: '#b45309' }]}><Text style={styles.bold}>Driver correction: </Text>{driverCorrection}</Text>}
        </Card>

        {deliveryAddresses.length > 1 && (
          <>
            <SectionTitle text={`Delivery addresses (${deliveryAddresses.length})`} />
            <Card>
              {deliveryAddresses.map((a: any, i: number) => (
                <Text key={i} style={styles.metaText}>
                  <Text style={styles.bold}>{i + 1}. {a.recipientName || a.name}: </Text>{a.address}, {a.city}{a.instructions ? ` — ${a.instructions}` : ''}
                </Text>
              ))}
            </Card>
          </>
        )}

        {(seals || sealsRequested > 0) && (
          <>
            <SectionTitle text="Metal coded seals" />
            <Card>
              {seals ? (
                <>
                  <Text style={styles.metaText}><Text style={styles.bold}>Seals used: </Text>{seals.used ? `Yes — ${seals.count}` : 'No'}</Text>
                  {Array.isArray(seals.codes) && seals.codes.length > 0 && (
                    <Text style={styles.metaText}><Text style={styles.bold}>Codes: </Text>{seals.codes.join(', ')}</Text>
                  )}
                  {Boolean(seals.condition) && <Text style={styles.metaText}><Text style={styles.bold}>Condition: </Text>{seals.condition}</Text>}
                  {Boolean(seals.notes) && <Text style={styles.metaText}><Text style={styles.bold}>Driver notes: </Text>{seals.notes}</Text>}
                </>
              ) : (
                <Text style={styles.metaText}>{sealsRequested} metal coded seal{sealsRequested > 1 ? 's' : ''} requested — the driver records every code at collection.</Text>
              )}
            </Card>
          </>
        )}

        <SectionTitle text="Documents" />
        {invoice && (
          <Button title={downloading === 'invoice' ? 'Preparing invoice…' : 'Download invoice (PDF)'} variant="outline"
            onPress={downloadInvoice} busy={downloading === 'invoice'} style={{ marginBottom: spacing.sm }} />
        )}
        {deliveryNoteReady ? (
          <Button title={downloading === 'note' ? 'Preparing delivery note…' : 'Download delivery note (PDF)'} variant="outline"
            onPress={downloadDeliveryNote} busy={downloading === 'note'} style={{ marginBottom: spacing.sm }} />
        ) : (
          <Text style={[styles.hint, { color: palette.textMuted, marginBottom: spacing.sm }]}>Your delivery note becomes available for download once the delivery is completed.</Text>
        )}

        <Button title="Need help? Ask Zimmy" variant="outline" onPress={() => navigation.navigate('Tabs', { screen: 'Zimmy', params: { prefill: `I need help with my shipment ${shipment.tracking_number}` } })} />
        <Button title="Invoices & payment proof" variant="outline" onPress={()=>navigation.navigate('Billing')} style={{marginTop:spacing.sm}}/>
        {stage>=1?<Button title="Rate driver and service" variant="outline" onPress={()=>navigation.navigate('Feedback')} style={{marginTop:spacing.sm}}/>:null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  body: { padding: spacing.lg, paddingTop: 0, paddingBottom: 48 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1, paddingRight: 8 },
  metaText: { fontSize: 13, color: colors.textMuted, marginBottom: 3, lineHeight: 18 },
  bold: { fontWeight: '700', color: colors.text },
  celebrate: { fontSize: 17, fontWeight: '800', color: colors.greenDark, marginBottom: 4 },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stageRail: { alignItems: 'center', width: 22 },
  stageDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stageLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: colors.border, marginVertical: 2 },
  stageLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  stageNow: { fontSize: 11, color: colors.green, fontWeight: '700', marginTop: 1 },
  invoiceTotal: { fontSize: 17, fontWeight: '800', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  codeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},code:{fontSize:22,fontWeight:'900',letterSpacing:4},
  banner: { height: 130, marginBottom: spacing.md, justifyContent: 'flex-end' },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 20, 12, 0.45)', borderRadius: radius.lg },
  bannerInner: { padding: spacing.lg },
  bannerTitle: { color: colors.white, fontSize: 21, fontWeight: '900' },
  bannerSub: { color: '#dbe7de', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
