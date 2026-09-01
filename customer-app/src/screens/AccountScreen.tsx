import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { FlagStripe, Card, Button } from '../components/ui';
import { useBusinessConfig } from '../lib/businessConfig';
import { useAppTheme } from '../context/ThemeContext';

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const { session, profile, signOut } = useAuth();
  const {dark,palette,setPreference}=useAppTheme();
  const { config: business } = useBusinessConfig();
  const referralDiscount = business.fees.referralDiscount;
  const ukPhone = business.company.ukPhone || '';

  const shareReferral = () => {
    Share.share({
      message: `I ship home with ${business.company.name || 'our shipping team'} — UK & Ireland to Zimbabwe. Mention my name${profile?.full_name ? ` (${profile.full_name})` : ''} when you book! ${business.company.website || ''}`,
    }).catch(() => {});
  };

  // Apple guideline 5.1.1(v) / Google Play data-safety: an account created in the
  // app must be deletable from inside the app. The flow itself lives on the site.
  const requestAccountDeletion = () => {
    Alert.alert(
      'Delete your account?',
      'This starts permanent deletion of your profile, saved addresses and contact details. Invoices we must keep for UK tax law are anonymised, not removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => Linking.openURL(`${business.company.website || ''}/delete-account`),
        },
      ],
    );
  };

  const rows = [
    { icon: 'cube-outline' as const, label: 'My Shipments', sub: 'Track and manage your bookings', onPress: () => navigation.navigate('Tabs', { screen: 'Shipments' }) },
    { icon: 'pricetag-outline' as const, label: 'My Quotes', sub: 'Requests and approved quotes ready to book', onPress: () => navigation.navigate('SavedQuotes') },
    { icon: 'location-outline' as const, label: 'Delivery Addresses', sub: 'Saved receivers in Zimbabwe', onPress: () => navigation.navigate('Addresses') },
    { icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Schedule, shipment and finance updates', onPress: () => navigation.navigate('Notifications') },
    { icon: 'receipt-outline' as const, label: 'Invoices & payments', sub: 'View invoices and upload payment proof', onPress: () => navigation.navigate('Billing') },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp us', sub: ukPhone, onPress: () => Linking.openURL(`https://wa.me/${business.company.whatsappPhone || ''}`) },
    { icon: 'call-outline' as const, label: 'Call us', sub: ukPhone, onPress: () => Linking.openURL(`tel:${ukPhone.replace(/\s/g, '')}`) },
    { icon: 'gift-outline' as const, label: `Refer a friend — £${referralDiscount}/€${referralDiscount} off`, sub: 'Share your name with someone who ships', onPress: shareReferral },
    { icon: 'star-outline' as const, label: 'Rate driver & service', sub: 'Review your goods and overall experience', onPress: () => navigation.navigate('Feedback') },
    { icon: 'help-circle-outline' as const, label: 'FAQ & shipping guidelines', sub: 'Prices, customs, coverage', onPress: () => Linking.openURL(`${business.company.website || ''}/faq`) },
    { icon: 'document-text-outline' as const, label: 'Terms & Conditions', sub: 'Your booking and shipping terms', onPress: () => Linking.openURL(`${business.company.website || ''}/terms-and-conditions`) },
    { icon: 'shield-checkmark-outline' as const, label: 'Privacy & complaints', sub: 'How we use data and how to raise a concern', onPress: () => Linking.openURL(`${business.company.website || ''}/privacy-policy`) },
  ];

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}>
      <FlagStripe />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.title,{color:palette.text}]}>My Profile</Text>

        <Card>
          {session ? (
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || session.user.email || '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name,{color:palette.text}]}>{profile?.full_name || 'Customer'}</Text>
                <Text style={[styles.meta,{color:palette.textMuted}]}>{session.user.email}</Text>
                {Boolean(profile?.phone_number) && <Text style={[styles.meta,{color:palette.textMuted}]}>{profile?.phone_number}</Text>}
                {profile?.customer_code ? <Text style={[styles.code,{color:palette.green}]}>Customer code: {profile.customer_code}</Text> : null}
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.name,{color:palette.text}]}>You're browsing as a guest</Text>
              <Text style={[styles.meta,{color:palette.textMuted}]}>Sign in to see your bookings, invoices and QR codes.</Text>
              <Button title="Sign in or register" onPress={() => navigation.navigate('Auth')} style={{ marginTop: spacing.sm }} />
            </>
          )}
        </Card>

        <Pressable style={[styles.row,{backgroundColor:palette.surface,borderColor:palette.border}]} onPress={()=>setPreference(dark?'light':'dark')}>
          <View style={[styles.rowIcon,{backgroundColor:palette.greenSoft}]}><Ionicons name={dark?'sunny-outline':'moon-outline'} size={19} color={palette.green}/></View><View style={{flex:1}}><Text style={[styles.rowLabel,{color:palette.text}]}>Dark mode</Text><Text style={[styles.rowSub,{color:palette.textMuted}]}>{dark?'On · tap for light mode':'Off · tap for dark mode'}</Text></View><Ionicons name={dark?'toggle':'toggle-outline'} size={28} color={palette.green}/>
        </Pressable>

        {rows.map((r) => (
          <Pressable key={r.label} style={[styles.row,{backgroundColor:palette.surface,borderColor:palette.border}]} onPress={r.onPress}>
            <View style={[styles.rowIcon,{backgroundColor:palette.greenSoft}]}><Ionicons name={r.icon} size={19} color={palette.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel,{color:palette.text}]}>{r.label}</Text>
              <Text style={[styles.rowSub,{color:palette.textMuted}]}>{r.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
          </Pressable>
        ))}

        {session && (
          <>
            <Button
              title="Sign out"
              variant="outline"
              style={{ marginTop: spacing.lg }}
              onPress={() => Alert.alert('Sign out?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
              ])}
            />
            <Pressable style={styles.deleteRow} onPress={requestAccountDeletion}>
              <Ionicons name="trash-outline" size={16} color={colors.red} />
              <Text style={styles.deleteText}>Delete my account</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.footer}>{business.company.name}{business.company.tagline ? ` — ${business.company.tagline}` : ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  code:{fontSize:12,fontWeight:'800',marginTop:7},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowIcon: { backgroundColor: colors.greenSoft, borderRadius: radius.sm, padding: 8 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, padding: spacing.sm },
  deleteText: { fontSize: 13, fontWeight: '700', color: colors.red },
  footer: { fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl, lineHeight: 18 },
});
