import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScroll } from '../components/KeyboardAwareScroll';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Button, Field, FlagStripe, SectionTitle } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import { longDate, parseCollectionDate } from '../lib/format';
import { useBusinessConfig } from '../lib/businessConfig';

export default function EditShipmentScreen() {
  const navigation = useNavigation<any>();
  const { id } = useRoute<any>().params || {};
  const { palette } = useAppTheme();
  // Keep "Save changes" clear of Android's system navigation bar.
  const insets = useSafeAreaInsets();
  const { config: business } = useBusinessConfig();
  const payments = [...business.payments.methods.filter((m) => m.id !== 'other_payment').map((m) => m.label), ...business.payments.otherProviders.map((m) => m.label)];
  const [busy, setBusy] = useState(true);
  const [sender, setSender] = useState<any>({});
  const [recipient, setRecipient] = useState<any>({});
  const [collection, setCollection] = useState<any>({});
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const [{ data: shipment, error }, { data: dates }] = await Promise.all([
      supabase.from('shipments').select('id,origin,destination,status,collection_status,driver_status,metadata').eq('id', id).single(),
      supabase.from('collection_schedules').select('id,route,pickup_date,country').limit(200),
    ]);
    if (error || !shipment) { Alert.alert('Could not open booking', error?.message || 'Shipment not found.'); navigation.goBack(); return; }
    const meta: any = shipment.metadata || {};
    setSender(meta.sender || {}); setRecipient(meta.recipient || {}); setCollection(meta.collection || {});
    setPaymentMethod(meta.pricing?.paymentMethod || 'Bank Transfer');
    const ireland = String(meta.sender?.country || '').toLowerCase().includes('ireland');
    setSchedules((dates || []).filter((date: any) => ireland ? String(date.country || '').toLowerCase().includes('ireland') : !String(date.country || '').toLowerCase().includes('ireland')).map((date: any) => ({ ...date, parsed: parseCollectionDate(date.pickup_date) })).filter((date: any) => date.parsed && date.parsed.getTime() >= Date.now() - 86400000).sort((a: any,b: any) => a.parsed.getTime()-b.parsed.getTime()));
    setBusy(false);
  })(); }, [id]);

  const save = async () => {
    if (!sender.phone?.trim() || !recipient.name?.trim() || !recipient.phone?.trim()) { Alert.alert('Complete the details', 'Sender phone, receiver name and receiver phone are required.'); return; }
    setBusy(true);
    const origin = `${sender.country || 'United Kingdom'}: ${sender.address || ''}, ${sender.city || ''} ${sender.postalCode || ''}`;
    const destination = `${recipient.address || ''}, ${recipient.city || ''}`;
    const { error } = await supabase.rpc('update_customer_shipment', { p_shipment_id: id, p: { sender, recipient, route: collection.route, collectionDate: collection.date, scheduleId: collection.scheduleId, paymentMethod, origin, destination } });
    setBusy(false);
    if (error) { Alert.alert('Could not save changes', error.message); return; }
    Alert.alert('Booking updated', 'Your changes are now visible to the collection team.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
  };

  return <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}><FlagStripe />
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={palette.text} /></Pressable><Text style={[styles.title,{color:palette.text}]}>Edit booking</Text><View style={{width:22}} /></View>
    <KeyboardAwareScroll contentContainerStyle={[styles.body, { paddingBottom: 48 + insets.bottom }]}>
      <SectionTitle text="Collection contact" />
      <Field label="Collection address" value={sender.address || ''} onChangeText={(address) => setSender({...sender,address})} />
      <Field label="Town / city" value={sender.city || ''} onChangeText={(city) => setSender({...sender,city})} />
      <Field label="Postcode / Eircode" value={sender.postalCode || ''} onChangeText={(postalCode) => setSender({...sender,postalCode})} />
      <Field label="Sender phone" value={sender.phone || ''} onChangeText={(phone) => setSender({...sender,phone})} keyboardType="phone-pad" />
      <SectionTitle text="Receiver" />
      <Field label="Full name" value={recipient.name || ''} onChangeText={(name) => setRecipient({...recipient,name})} />
      <Field label="Phone" value={recipient.phone || ''} onChangeText={(phone) => setRecipient({...recipient,phone})} keyboardType="phone-pad" />
      <Field label="Delivery address" value={recipient.address || ''} onChangeText={(address) => setRecipient({...recipient,address})} multiline />
      <Field label="Town / city" value={recipient.city || ''} onChangeText={(city) => setRecipient({...recipient,city})} />
      <SectionTitle text="Upcoming collection date" />
      {schedules.map((date) => <Pressable key={date.id} onPress={() => setCollection({route:date.route,date:date.pickup_date,scheduleId:date.id})} style={[styles.option,{backgroundColor:palette.surface,borderColor:collection.scheduleId===date.id?colors.green:palette.border}]}><View style={{flex:1}}><Text style={[styles.optionTitle,{color:palette.text}]}>{date.route}</Text><Text style={{color:palette.textMuted}}>{longDate(date.parsed)}</Text></View><Ionicons name={collection.scheduleId===date.id?'radio-button-on':'radio-button-off'} size={21} color={collection.scheduleId===date.id?colors.green:palette.textFaint}/></Pressable>)}
      <SectionTitle text="Payment method" />
      {payments.map((method) => <Pressable key={method} onPress={() => setPaymentMethod(method)} style={[styles.option,{backgroundColor:palette.surface,borderColor:paymentMethod===method?colors.green:palette.border}]}><Text style={[styles.optionTitle,{color:palette.text,flex:1}]}>{method}</Text><Ionicons name={paymentMethod===method?'radio-button-on':'radio-button-off'} size={21} color={paymentMethod===method?colors.green:palette.textFaint}/></Pressable>)}
      <Text style={[styles.note,{color:palette.textMuted}]}>Items and prices are locked after booking. Ask the team if those need changing.</Text>
      <Button title="SAVE CHANGES" onPress={save} busy={busy} />
    </KeyboardAwareScroll>
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:spacing.lg},title:{fontSize:17,fontWeight:'800'},body:{padding:spacing.lg,paddingTop:0,paddingBottom:48},option:{flexDirection:'row',alignItems:'center',borderWidth:1.5,borderRadius:radius.md,padding:spacing.md,marginBottom:spacing.sm},optionTitle:{fontSize:14,fontWeight:'700'},note:{fontSize:12,lineHeight:17,marginVertical:spacing.md}});
