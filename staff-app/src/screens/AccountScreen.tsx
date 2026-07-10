import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';
import { colors, radius, spacing } from '../theme';

export default function AccountScreen() {
  const { session, profile, signOut } = useAuth();
  const initial = (profile?.full_name || session?.user?.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Account</Text>
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.full_name || 'Staff member'}</Text>
              <Text style={styles.email}>{session?.user?.email}</Text>
              {profile?.role ? <Text style={styles.role}>{profile.role}</Text> : null}
            </View>
          </View>
        </Card>

        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  role: { fontSize: 12, color: colors.primary, marginTop: 4, textTransform: 'capitalize' },
  signOut: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
