import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { Button, Field, FlagStripe, Pill, SectionTitle } from '../components/ui';
import { CustomerAddress, AddressInput, listAddresses, saveAddress, deleteAddress, addressSummary } from '../lib/addresses';
import { COVERED_ZIM_PLACES } from '../lib/catalogue';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

const EMPTY_FORM: AddressInput = {
  recipient_name: '', recipient_phone: '', address_line1: '', address_line2: '',
  city: '', province: '', country: 'Zimbabwe', postal_code: '', delivery_instructions: '', is_default: false,
};

// Saved Zimbabwe delivery addresses. Each address selected during booking adds
// the £25/€25 door-delivery fee (charged per address, priced server-side).
export default function AddressesScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { palette } = useAppTheme();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AddressInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try { setAddresses(await listAddresses(session.user.id)); }
    catch (e: any) { Alert.alert('Could not load addresses', e?.message || 'Try again.'); }
    finally { setLoading(false); }
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (patch: Partial<AddressInput>) => setForm((f) => ({ ...(f || EMPTY_FORM), ...patch }));

  const submit = async () => {
    if (!form || !session?.user.id) return;
    if (!form.recipient_name.trim() || !form.recipient_phone.trim() || !form.address_line1.trim() || !form.city.trim()) {
      Alert.alert('Missing details', 'Recipient name, phone, address and city are required.');
      return;
    }
    const covered = COVERED_ZIM_PLACES.some((p) => form.city.trim().toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(form.city.trim().toLowerCase()));
    const doSave = async () => {
      setBusy(true);
      try {
        await saveAddress(session.user.id, form, editingId || undefined);
        setForm(null); setEditingId(null);
        await load();
      } catch (e: any) { Alert.alert('Could not save', e?.message || 'Try again.'); }
      finally { setBusy(false); }
    };
    if (!covered) {
      Alert.alert(
        'Check the delivery city',
        `We deliver to major cities and towns. "${form.city.trim()}" doesn't match our covered list — rural addresses are collected from the nearest covered town instead. Save anyway?`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Save anyway', onPress: doSave }],
      );
      return;
    }
    await doSave();
  };

  const remove = (a: CustomerAddress) => {
    Alert.alert('Delete address', `Remove ${a.recipient_name}'s address in ${a.city}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteAddress(session!.user.id, a.id); await load(); } catch (e: any) { Alert.alert('Could not delete', e?.message); } } },
    ]);
  };

  const makeDefault = async (a: CustomerAddress) => {
    try { await saveAddress(session!.user.id, { recipient_name: a.recipient_name, recipient_phone: a.recipient_phone, address_line1: a.address_line1, address_line2: a.address_line2 || undefined, city: a.city, province: a.province || undefined, country: a.country, postal_code: a.postal_code || undefined, delivery_instructions: a.delivery_instructions || undefined, is_default: true }, a.id); await load(); }
    catch (e: any) { Alert.alert('Could not update', e?.message); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={['top']}>
      <FlagStripe />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Delivery Addresses</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.hint, { color: palette.textMuted }]}>
            Save the people and places we deliver to in Zimbabwe. Door delivery is £25 per address from the UK or €25 from Ireland — selected addresses are each added to your booking total.
          </Text>

          {loading && <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />}
          {!loading && addresses.map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: a.is_default ? colors.green : palette.border }]}>
              <View style={styles.cardTop}>
                <Text style={[styles.name, { color: palette.text }]}>{a.recipient_name}</Text>
                {a.is_default ? <Pill text="Default" /> : (
                  <Pressable onPress={() => makeDefault(a)} hitSlop={8}><Text style={[styles.link, { color: palette.green }]}>Make default</Text></Pressable>
                )}
              </View>
              <Text style={[styles.meta, { color: palette.textMuted }]}>{a.recipient_phone}</Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>{addressSummary(a)}{a.postal_code ? `, ${a.postal_code}` : ''}, {a.country}</Text>
              {Boolean(a.delivery_instructions) && <Text style={[styles.meta, { color: palette.textFaint }]}>Note: {a.delivery_instructions}</Text>}
              <View style={styles.actions}>
                <Pressable onPress={() => { setForm({ recipient_name: a.recipient_name, recipient_phone: a.recipient_phone, address_line1: a.address_line1, address_line2: a.address_line2 || '', city: a.city, province: a.province || '', country: a.country, postal_code: a.postal_code || '', delivery_instructions: a.delivery_instructions || '', is_default: a.is_default }); setEditingId(a.id); }} hitSlop={8}>
                  <Text style={[styles.link, { color: palette.green }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => remove(a)} hitSlop={8}><Text style={[styles.link, { color: colors.red }]}>Delete</Text></Pressable>
              </View>
            </View>
          ))}

          {form ? (
            <>
              <SectionTitle text={editingId ? 'Edit address' : 'New delivery address'} />
              <Field label="Recipient name" value={form.recipient_name} onChangeText={(v) => set({ recipient_name: v })} autoCapitalize="words" />
              <Field label="Recipient phone" value={form.recipient_phone} onChangeText={(v) => set({ recipient_phone: v })} keyboardType="phone-pad" placeholder="+263 7…" />
              <Field label="Address line 1" value={form.address_line1} onChangeText={(v) => set({ address_line1: v })} />
              <Field label="Address line 2 (optional)" value={form.address_line2 || ''} onChangeText={(v) => set({ address_line2: v })} />
              <Field label="City / town" value={form.city} onChangeText={(v) => set({ city: v })} autoCapitalize="words" placeholder="Harare, Bulawayo, Gweru…" />
              <Field label="Province / region (optional)" value={form.province || ''} onChangeText={(v) => set({ province: v })} autoCapitalize="words" />
              <Field label="Postal code (optional)" value={form.postal_code || ''} onChangeText={(v) => set({ postal_code: v })} autoCapitalize="none" />
              <Field label="Delivery instructions (optional)" value={form.delivery_instructions || ''} onChangeText={(v) => set({ delivery_instructions: v })} multiline placeholder="Gate code, landmarks, best delivery times…" />
              <Pressable onPress={() => set({ is_default: !form.is_default })} style={styles.defaultRow} hitSlop={6}>
                <Ionicons name={form.is_default ? 'checkbox' : 'square-outline'} size={22} color={form.is_default ? colors.green : palette.textFaint} />
                <Text style={[styles.meta, { color: palette.text, marginTop: 0 }]}>Use as my default delivery address</Text>
              </Pressable>
              <Button title={editingId ? 'Save changes' : 'Save address'} onPress={submit} busy={busy} style={{ marginTop: spacing.md }} />
              <Button title="Cancel" variant="ghost" onPress={() => { setForm(null); setEditingId(null); }} style={{ marginTop: spacing.xs }} />
            </>
          ) : (
            <Button title="+ Add delivery address" variant="outline" onPress={() => { setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 }); setEditingId(null); }} style={{ marginTop: spacing.md }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  body: { padding: spacing.lg, paddingTop: 0, paddingBottom: 48 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  card: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  link: { fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
});
