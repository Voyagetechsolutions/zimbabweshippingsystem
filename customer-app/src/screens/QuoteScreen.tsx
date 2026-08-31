import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { Button, Field, SectionTitle, FlagStripe } from '../components/ui';
import { Country } from '../lib/catalogue';
import { DESCRIPTION_GUIDANCE } from '../lib/booking';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

// Custom quote request: the admin team prices it in the staff app, the
// customer gets notified and can book directly from the approved quote.
export default function QuoteScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session, profile } = useAuth();
  const { palette } = useAppTheme();
  const [country, setCountry] = useState<Country>(profile?.country === 'Ireland' ? 'Ireland' : 'United Kingdom');
  const returningResident = route.params?.type === 'returning_resident';
  const [items, setItems] = useState(['']);
  const [moveDate, setMoveDate] = useState('');
  const [destination, setDestination] = useState('');
  const [leftZimbabwe, setLeftZimbabwe] = useState('');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cleanItems = items.map((item) => item.trim()).filter(Boolean);
    if (!cleanItems.length || cleanItems.some((item) => item.length < 3)) {
      Alert.alert('Add your items', 'List each item separately so our team can quote Item 1, Item 2 and so on.');
      return;
    }
    if (returningResident && (!moveDate.trim() || !destination.trim() || !leftZimbabwe.trim())) {
      Alert.alert('Complete the returning-resident details', 'Add your planned move date, Zimbabwe destination and when you left Zimbabwe.'); return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone number needed', 'Add a WhatsApp or phone number so the team can reach you about your quote.');
      return;
    }
    setBusy(true);
    try {
      const description = cleanItems.map((item, index) => `Item ${index + 1}: ${item}`).join('\n');
      const { error } = await supabase.from('custom_quotes').insert({
        user_id: session?.user.id ?? null,
        phone_number: phone.trim(),
        description: `[${country}] ${description.trim()}`,
        quote_items: cleanItems.map((item, index) => ({ item: index + 1, description: item, amount: null })),
        request_type: returningResident ? 'returning_resident' : 'custom',
        category: returningResident ? 'Returning resident' : 'Customer app',
        sender_details: returningResident ? { plannedMoveDate: moveDate.trim(), leftZimbabwe: leftZimbabwe.trim() } : {},
        recipient_details: returningResident ? { destination: destination.trim() } : {},
        currency: country === 'Ireland' ? 'EUR' : 'GBP',
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert(
        'Quote request sent',
        `Our team is pricing your ${returningResident ? 'returning-resident ' : ''}request item by item. You will get a notification when it is ready.`,
        [{ text: 'View My Quotes', onPress: () => navigation.replace('SavedQuotes') }, { text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Could not send request', e?.message || 'Please try again or ask Zimmy.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>{returningResident ? 'Returning Resident Quote' : 'Get a Quote'}</Text>
        <Pressable onPress={() => navigation.navigate('SavedQuotes')} hitSlop={12}>
          <Ionicons name="albums-outline" size={21} color={palette.green} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <SectionTitle text="Collection country" />
          <View style={styles.toggleRow}>
            {(['United Kingdom', 'Ireland'] as Country[]).map((c) => (
              <Pressable key={c} onPress={() => setCountry(c)}
                style={[styles.toggle, { backgroundColor: palette.surface }, country === c && styles.toggleOn]}>
                <Text style={[styles.toggleText, country !== c && { color: palette.green }]}>{c === 'United Kingdom' ? '🇬🇧 United Kingdom' : '🇮🇪 Ireland'}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle text="Delivery country" />
          <View style={[styles.fixedField, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.fixedText, { color: palette.text }]}>🇿🇼 Zimbabwe</Text>
            <Text style={[styles.hint, { color: palette.textFaint, marginTop: 0, marginBottom: 0 }]}>All major cities & towns</Text>
          </View>

          {returningResident && (
            <>
              <SectionTitle text="Returning-resident details" />
              <Field label="When did you leave Zimbabwe?" value={leftZimbabwe} onChangeText={setLeftZimbabwe} placeholder="Month and year" />
              <Field label="Planned move date" value={moveDate} onChangeText={setMoveDate} placeholder="Month and year" />
              <Field label="Destination in Zimbabwe" value={destination} onChangeText={setDestination} placeholder="Town / city and address if known" />
            </>
          )}

          <SectionTitle text="List every item separately" />
          <View style={[styles.guidance, { backgroundColor: palette.greenSoft, borderColor: palette.border }]}>
            <Ionicons name="information-circle-outline" size={17} color={palette.greenDark} />
            <Text style={[styles.guidanceText, { color: palette.greenDark }]}>{DESCRIPTION_GUIDANCE}</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.itemInputRow}>
              <View style={{ flex: 1 }}><Field label={`Item ${index + 1}`} value={item} onChangeText={(value) => setItems((current) => current.map((entry, i) => i === index ? value : entry))} multiline placeholder="Quantity, item, size/material, contents and condition" /></View>
              {items.length > 1 && <Pressable onPress={() => setItems((current) => current.filter((_, i) => i !== index))} hitSlop={10}><Ionicons name="trash-outline" size={21} color={colors.red} /></Pressable>}
            </View>
          ))}
          <Button title="+ ADD ANOTHER ITEM" variant="outline" onPress={() => setItems((current) => [...current, ''])} style={{ marginBottom: spacing.md }} />

          <Field label="WhatsApp / phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+44 7…" />

          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Our team reviews your description and sends back a custom price, usually within a few hours.
            You'll get a notification, and approved quotes can be booked straight from the app.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
          <Button title="REQUEST QUOTE" onPress={submit} busy={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  body: { padding: spacing.lg, paddingTop: 0, paddingBottom: 24 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: { flex: 1, borderWidth: 1.5, borderColor: colors.green, borderRadius: radius.sm, paddingVertical: 11, alignItems: 'center' },
  toggleOn: { backgroundColor: colors.green },
  toggleText: { fontWeight: '700', color: colors.white, fontSize: 13 },
  fixedField: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fixedText: { fontSize: 14, fontWeight: '700' },
  guidance: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  guidanceText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  itemInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hint: { fontSize: 12, marginTop: 6, marginBottom: spacing.sm, lineHeight: 17 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
});
