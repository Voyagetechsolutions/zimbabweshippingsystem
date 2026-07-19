import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  const { session, profile } = useAuth();
  const { palette } = useAppTheme();
  const [country, setCountry] = useState<Country>(profile?.country === 'Ireland' ? 'Ireland' : 'United Kingdom');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (description.trim().length < 15) {
      Alert.alert('Add more detail', 'Please describe your goods in detail so our team can price them accurately.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone number needed', 'Add a WhatsApp or phone number so the team can reach you about your quote.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from('custom_quotes').insert({
        user_id: session?.user.id ?? null,
        phone_number: phone.trim(),
        description: `[${country}] ${description.trim()}`,
        currency: country === 'Ireland' ? 'EUR' : 'GBP',
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert(
        'Quote request sent',
        'Our team is pricing your request. You will get a notification when your quote is ready — see it any time under My Quotes.',
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
        <Text style={[styles.headerTitle, { color: palette.text }]}>Get a Quote</Text>
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

          <SectionTitle text="Detailed description of your goods" />
          <View style={[styles.guidance, { backgroundColor: palette.greenSoft, borderColor: palette.border }]}>
            <Ionicons name="information-circle-outline" size={17} color={palette.greenDark} />
            <Text style={[styles.guidanceText, { color: palette.greenDark }]}>{DESCRIPTION_GUIDANCE}</Text>
          </View>
          <Field
            label="Describe everything you want to ship"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="e.g. 2 blue 220L plastic drums packed with clothes and groceries; 1 Samsung 55-inch TV (boxed, fragile); 1 wooden trunk 90×50×50cm with kitchenware…"
          />

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
  hint: { fontSize: 12, marginTop: 6, marginBottom: spacing.sm, lineHeight: 17 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
});
