import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { Field, Button } from '../components/ui';
import { useAppTheme } from '../context/ThemeContext';
import { IMG } from '../img';
import { useBusinessConfig } from '../lib/businessConfig';

// Mirrors the Supabase project's password policy so new users are guided before
// the request is sent. Returns a human message when the password falls short,
// or null when it satisfies every rule.
function passwordRequirement(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/.test(pw)) return 'Add a lowercase letter (a–z).';
  if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter (A–Z).';
  if (!/[0-9]/.test(pw)) return 'Add a number (0–9).';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Add a symbol (e.g. ! ? @ #).';
  return null;
}

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const {dark,palette}=useAppTheme();
  const {config:business}=useBusinessConfig();

  // Sign in with Apple needs iOS 13+, so ask rather than assume.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => { if (alive) setAppleReady(ok); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const appleSignIn = async () => {
    setBusy(true);
    try {
      const { error, cancelled } = await signInWithApple();
      if (cancelled) return;
      if (error) Alert.alert('Sign in with Apple failed', error);
      else navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try {
      const { error, cancelled } = await signInWithGoogle();
      if (cancelled) return;
      if (error) Alert.alert('Sign in with Google failed', error);
      else navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (mode === 'signup') {
      // The Supabase project enforces a strong-password policy (lower + upper +
      // number + symbol). Validate here so users get a friendly message up front
      // instead of the raw backend error string.
      const missing = passwordRequirement(password);
      if (missing) {
        Alert.alert('Choose a stronger password', missing);
        return;
      }
    }
    if (!password) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(normalizedEmail, password);
        if (error) Alert.alert('Sign in failed', error);
        else navigation.goBack();
      } else {
        const { error, needsConfirm, existing } = await signUp(normalizedEmail, password);
        if (existing) {
          // The email already has an account — try signing them straight in
          // with the password they just typed.
          const { error: signInError } = await signIn(normalizedEmail, password);
          if (!signInError) { navigation.goBack(); return; }
          setMode('signin');
          Alert.alert('You already have an account', 'This email is already registered. Enter your password to sign in — or use Forgot Password.');
        } else if (error) {
          Alert.alert('Registration failed', error);
        } else if (needsConfirm) {
          Alert.alert('Check your email', 'We sent a confirmation link. Confirm your email, then sign in here.');
          setMode('signin');
        } else {
          navigation.goBack();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) { Alert.alert('Forgot password', 'Enter your email above first, then tap Forgot Password again.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) Alert.alert('Could not send reset email', error.message);
    else Alert.alert('Check your email', 'We sent a password reset link.');
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Pressable>

          <Image source={IMG.logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title,{color:palette.text}]}>{mode === 'signin' ? 'Welcome Back!' : 'Create Your Account'}</Text>
          <Text style={[styles.sub,{color:palette.textMuted}]}>
            {mode === 'signin' ? 'Login to your account' : 'Just your email and a password — shipping details come next'}
          </Text>

          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" placeholder="Password" />

          {mode === 'signup' && (
            <Text style={[styles.pwHint,{color:palette.textMuted}]}>
              At least 8 characters with an uppercase letter, a number and a symbol.
            </Text>
          )}

          {mode === 'signin' && (
            <Pressable onPress={forgotPassword} style={styles.forgot} hitSlop={8}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          )}

          <Button title={mode === 'signin' ? 'LOGIN' : 'CREATE ACCOUNT'} onPress={submit} busy={busy} disabled={!email.trim() || !password} />

          <View style={styles.orRow}>
            <View style={[styles.orLine,{backgroundColor:palette.border}]} />
            <Text style={[styles.orText,{color:palette.textFaint}]}>OR</Text>
            <View style={[styles.orLine,{backgroundColor:palette.border}]} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            disabled={busy}
            onPress={googleSignIn}
            style={({ pressed }) => [styles.googleButton, { backgroundColor: palette.surface, borderColor: palette.border }, (pressed || busy) && { opacity: 0.65 }]}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={[styles.googleButtonText, { color: palette.text }]}>Continue with Google</Text>
          </Pressable>

          {appleReady && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                mode === 'signin'
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              }
              // Apple's HIG requires their own button, and it must contrast with
              // the surface it sits on.
              buttonStyle={
                dark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius.md}
              style={styles.appleButton}
              onPress={appleSignIn}
            />
          )}

          <Button
            title={mode === 'signin' ? 'Create New Account' : 'I already have an account'}
            variant="outline"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />

          <Text style={[styles.terms,{color:palette.textFaint}]}>
            By continuing, you agree to our{' '}
            <Text accessibilityRole="link" onPress={() => Linking.openURL(`${business.company.website || ''}/terms-and-conditions`)} style={styles.termsLink}>Terms & Conditions</Text>
            {' '}and confirm you have read our{' '}
            <Text accessibilityRole="link" onPress={() => Linking.openURL(`${business.company.website || ''}/privacy-policy`)} style={styles.termsLink}>Privacy Notice</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: spacing.xl, paddingBottom: 180, gap: 2, flexGrow: 1, justifyContent: 'center' },
  logo: { width: 110, height: 110, alignSelf: 'center', marginTop: spacing.md },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  sub: { fontSize: 14, textAlign: 'center', marginBottom: spacing.xl },
  pwHint: { fontSize: 12, lineHeight: 16, marginTop: 4, marginBottom: spacing.sm },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: spacing.lg },
  forgotText: { color: colors.green, fontWeight: '700', fontSize: 13 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '700' },
  googleButton: { height: 50, width: '100%', marginBottom: spacing.md, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  googleButtonText: { fontSize: 15, fontWeight: '700' },
  appleButton: { height: 50, width: '100%', marginBottom: spacing.md },
  terms: { fontSize: 12, textAlign: 'center', marginTop: spacing.xl, lineHeight: 17 },
  termsLink: { color: colors.green, fontWeight: '700' },
});
