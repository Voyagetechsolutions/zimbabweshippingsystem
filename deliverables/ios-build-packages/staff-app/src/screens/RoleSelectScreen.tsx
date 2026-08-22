import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useViewRole } from '../context/ViewRoleContext';
import type { DashboardRole } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const OPTIONS: Array<{ role: DashboardRole; icon: keyof typeof Ionicons.glyphMap; title: string; description: string }> = [
  { role: 'admin', icon: 'grid-outline', title: 'Admin dashboard', description: 'Shipments, bookings, runs, schedules and the full operations menu' },
  { role: 'finance', icon: 'stats-chart-outline', title: 'Finance dashboard', description: 'Payments, invoices, payment proofs, expenses and the books' },
  { role: 'driver', icon: 'car-outline', title: 'Driver dashboard', description: 'Today’s run, stop-by-stop workflow, QR scanning and handovers' },
];

export default function RoleSelectScreen() {
  const { profile, signOut } = useAuth();
  const { chooseRole } = useViewRole();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.hello}>Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
        <Text style={styles.sub}>You have admin access. Pick the dashboard you want to work in — you can switch anytime from the Account tab.</Text>

        {OPTIONS.map((option) => (
          <Pressable key={option.role} style={styles.card} onPress={() => chooseRole(option.role)}>
            <View style={styles.iconWrap}><Ionicons name={option.icon} size={24} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardText}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}

        <Pressable onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.md },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg,
  },
  iconWrap: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardText: { fontSize: 12.5, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  signOut: { alignItems: 'center', marginTop: spacing.lg },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
