import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, type DashboardRole } from '../context/AuthContext';
import { useViewRole } from '../context/ViewRoleContext';
import { supabase } from '../lib/supabase';
import { COMPANY, COMPANY_WHATSAPP_URL } from '../config/company';
import { colors, radius, shadow, spacing } from '../theme';
import { getStaffBusinessConfig } from '../lib/businessConfig';

export default function AccountScreen() {
  const { session, profile, signOut, dashboardRole, canSwitchDashboards } = useAuth();
  const { chooseRole } = useViewRole();
  const [switching, setSwitching] = useState(false);
  // Show the viewer's real role — this screen is also reached from the admin
  // Menu → Settings, where a hardcoded "Finance" label is wrong.
  const roleLabel = canSwitchDashboards
    ? 'Admin'
    : dashboardRole === 'driver' ? 'Driver'
    : dashboardRole === 'admin' ? 'Admin'
    : dashboardRole === 'finance' ? 'Finance'
    : dashboardRole === 'dispatcher' ? 'Dispatcher'
    : profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Staff';
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(String(session?.user.user_metadata?.phone || ''));
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const initial = (profile?.full_name || session?.user.email || 'V').charAt(0).toUpperCase();
  const business=getStaffBusinessConfig();

  useEffect(() => {
    AsyncStorage.getItem('finance_notifications').then((value) => {
      if (value !== null) setNotifications(value === 'true');
    });
  }, []);

  const saveProfile = async () => {
    if (!session?.user.id || !name.trim()) {
      Alert.alert('Name required', 'Enter the name to display on your staff profile.');
      return;
    }
    setSaving(true);
    const [profileResult, authResult] = await Promise.all([
      supabase.from('profiles').update({ full_name: name.trim() }).eq('id', session.user.id),
      supabase.auth.updateUser({ data: { phone: phone.trim() } }),
      AsyncStorage.setItem('finance_notifications', String(notifications)),
    ]);
    setSaving(false);
    const error = profileResult.error || authResult.error;
    if (error) Alert.alert('Could not save profile', error.message);
    else Alert.alert('Profile saved', 'Your staff profile preferences have been updated.');
  };

  const selectDashboard = (role: DashboardRole) => {
    setSwitching(false);
    chooseRole(role);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.title}>Account</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.full_name || 'Staff member'}</Text>
            <Text style={styles.muted} numberOfLines={1}>{COMPANY.name} staff account</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
        </View>

        <SectionTitle text="Company profile" />
        <View style={styles.card}>
          <DetailRow icon="business-outline" label="Company name" value={COMPANY.name} />
          <Pressable onPress={() => Linking.openURL(COMPANY.websiteUrl)}>
            <DetailRow icon="globe-outline" label="Website" value={COMPANY.websiteLabel} />
          </Pressable>
          <DetailRow icon="mail-outline" label="Contact email" value={COMPANY.supportEmail} />
          <DetailRow icon="logo-whatsapp" label="Contact number" value={COMPANY.supportPhone} last />
        </View>

        <SectionTitle text="Payment methods" />
        <View style={styles.card}>
          {(business?.payments.methods||[]).map((method,index)=><PaymentRow key={method.id} icon={method.id==='cash_on_collection'?'cash-outline':method.id==='pay_on_arrival'?'airplane-outline':'wallet-outline'} title={method.label} description={method.note||''} last={index===(business?.payments.methods.length||0)-1}/>) }
        </View>

        <SectionTitle text="Profile settings" />
        <View style={styles.settingsCard}>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Staff profile name" placeholderTextColor={colors.textFaint} />
          <Text style={styles.fieldLabel}>Contact number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Your contact number" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Staff notifications</Text><Text style={styles.muted}>Operations, payment and account alerts</Text></View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primarySoft }} thumbColor={notifications ? colors.primary : '#D0D5DD'} />
          </View>
          <Pressable style={styles.primary} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save Profile Settings</Text>}
          </Pressable>
        </View>

        <SectionTitle text="Help & support" />
        <View style={styles.card}>
          <Pressable style={styles.supportRow} onPress={() => Linking.openURL(`mailto:${COMPANY.supportEmail}`)}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Email support</Text><Text style={styles.muted}>{COMPANY.supportEmail}</Text></View>
            <Ionicons name="open-outline" size={17} color={colors.textFaint} />
          </Pressable>
          <Pressable style={[styles.supportRow, styles.lastRow]} onPress={() => Linking.openURL(COMPANY_WHATSAPP_URL)}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>WhatsApp support</Text><Text style={styles.muted}>{COMPANY.supportPhone}</Text></View>
            <Ionicons name="open-outline" size={17} color={colors.textFaint} />
          </Pressable>
          <Pressable style={[styles.supportRow, styles.lastRow]} onPress={() => Linking.openURL(`${COMPANY.websiteUrl}/privacy-policy`)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Staff privacy notice</Text><Text style={styles.muted}>Work accounts, job evidence, audit logs and active-job location</Text></View>
            <Ionicons name="open-outline" size={17} color={colors.textFaint} />
          </Pressable>
        </View>

        {canSwitchDashboards ? (
          <Pressable style={styles.switchDashboard} onPress={() => setSwitching(true)}>
            <Ionicons name="swap-horizontal-outline" size={19} color={colors.primary} />
            <Text style={styles.switchText}>Switch dashboard</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign Out</Text></Pressable>
      </ScrollView>
      <Modal visible={switching} transparent animationType="fade" onRequestClose={() => setSwitching(false)}>
        <Pressable style={styles.modalShade} onPress={() => setSwitching(false)}><Pressable style={styles.dashboardSheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Switch dashboard</Text><Text style={styles.sheetSub}>Choose where you want to work. Your account stays signed in.</Text>
          {([
            ['admin','grid-outline','Admin','Operations, bookings and staff'],
            ['finance','stats-chart-outline','Finance','Accounting and financial control'],
            ['driver','car-outline','Driver','Routes, scans and handovers'],
            ['dispatcher','map-outline','Dispatcher','Live routes and driver locations'],
          ] as const).map(([role,icon,title,sub])=><Pressable accessibilityRole="button" key={role} style={styles.dashboardChoice} onPress={()=>selectDashboard(role)}><View style={styles.choiceIcon}><Ionicons name={icon} size={21} color={colors.primary}/></View><View style={{flex:1}}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.muted}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textFaint}/></Pressable>)}
          <Pressable style={styles.modalCancel} onPress={()=>setSwitching(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
        </Pressable></Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function DetailRow({ icon, label, value, last = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return <View style={[styles.detailRow, last && styles.lastRow]}><Ionicons name={icon} size={19} color={colors.textMuted} /><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.muted}>{value}</Text></View></View>;
}

function PaymentRow({ icon, title, description, last = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; last?: boolean }) {
  return <View style={[styles.paymentRow, last && styles.lastRow]}><View style={styles.paymentIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.paymentDescription}>{description}</Text></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 110 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text },
  sectionTitle: { marginTop: 3, fontSize: 10.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: colors.white, fontSize: 21, fontWeight: '800' },
  profileName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  role: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  card: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  detailRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  lastRow: { borderBottomWidth: 0 },
  paymentRow: { minHeight: 77, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  paymentDescription: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  settingsCard: { gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.bg },
  switchRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  primary: { minHeight: 49, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.primary, marginTop: 3 },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  supportRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  switchDashboard: { minHeight: 49, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm },
  switchText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  signOut: { minHeight: 49, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm },
  signOutText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.5)', justifyContent: 'center', padding: spacing.xl },
  dashboardSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  sheetSub: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, marginBottom: spacing.sm },
  dashboardChoice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  choiceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  modalCancel: { alignItems: 'center', paddingVertical: 10 }, modalCancelText: { color: colors.textMuted, fontWeight: '700' },
});
