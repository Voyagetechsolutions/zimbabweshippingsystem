import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

/**
 * Forced password change on first sign-in.
 *
 * New staff are created with a temporary password an admin reads out to them,
 * so that password has been spoken aloud and possibly written down. This screen
 * stands in front of the whole app until it is replaced — there is no skip.
 *
 * `must_change_password` is cleared in the same update that sets the new
 * password, so the two cannot get out of step.
 */
export default function SetPasswordScreen() {
  const { session, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors the project's Supabase password policy so the failure is explained
  // here rather than bounced back from the server.
  const problems: string[] = [];
  if (password.length < 8) problems.push('at least 8 characters');
  if (!/[a-z]/.test(password)) problems.push('a lower-case letter');
  if (!/[A-Z]/.test(password)) problems.push('an upper-case letter');
  if (!/\d/.test(password)) problems.push('a number');
  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = problems.length === 0 && !mismatch && confirm.length > 0;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (updateError) throw updateError;
      // The auth listener picks up the refreshed user and the gate falls away.
    } catch (e: any) {
      setError(e?.message || 'Could not set your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}><Ionicons name="key-outline" size={26} color={colors.primary} /></View>
          <Text style={styles.title}>Choose your password</Text>
          <Text style={styles.subtitle}>
            You signed in with a temporary password. Pick your own before you start —
            only you should know it.
          </Text>

          <Text style={styles.label}>New password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="New password"
              placeholderTextColor={colors.textFaint}
            />
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={[styles.input, styles.inputSolo]}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Type it again"
            placeholderTextColor={colors.textFaint}
          />

          {password.length > 0 && problems.length > 0 && (
            <Text style={styles.hint}>Needs {problems.join(', ')}.</Text>
          )}
          {mismatch && <Text style={styles.error}>Both entries must match.</Text>}
          {Boolean(error) && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.button, (!ready || busy) && styles.buttonDisabled]} onPress={submit} disabled={!ready || busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save and continue</Text>}
          </Pressable>

          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign in as someone else</Text>
          </Pressable>

          <Text style={styles.account}>{session?.user?.email}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  badge: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, lineHeight: 20, marginTop: 6, marginBottom: spacing.lg },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginBottom: 6, marginTop: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingRight: 12 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colors.text },
  inputSolo: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },
  error: { fontSize: 12.5, color: colors.danger, marginTop: 8, lineHeight: 17 },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  signOut: { alignItems: 'center', paddingVertical: spacing.md },
  signOutText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  account: { textAlign: 'center', fontSize: 11.5, color: colors.textFaint },
});
