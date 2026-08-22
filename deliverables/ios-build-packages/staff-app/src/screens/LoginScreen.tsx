import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Zimbabwe Shipping</Text>
        <Text style={styles.subtitle}>Staff Portal</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@zimbabweshipping.com"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.button, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
          <Text style={styles.hint}>Staff access only. Use your admin account.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  logo: { alignSelf: 'center', width: 120, height: 120 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xl },
  form: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  button: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  hint: { textAlign: 'center', fontSize: 12, color: colors.textFaint, marginTop: spacing.md },
});
