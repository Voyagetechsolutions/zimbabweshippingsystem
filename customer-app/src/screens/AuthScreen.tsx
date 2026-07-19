import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { Field, Button } from '../components/ui';
import { useAppTheme } from '../context/ThemeContext';
import { IMG } from '../img';

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const {palette}=useAppTheme();

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
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

          <Button
            title={mode === 'signin' ? 'Create New Account' : 'I already have an account'}
            variant="outline"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />

          <Text style={[styles.terms,{color:palette.textFaint}]}>
            By continuing, you agree to our <Text style={styles.termsLink}>Terms & Conditions</Text>
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
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: spacing.lg },
  forgotText: { color: colors.green, fontWeight: '700', fontSize: 13 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontWeight: '700' },
  terms: { fontSize: 12, textAlign: 'center', marginTop: spacing.xl, lineHeight: 17 },
  termsLink: { color: colors.green, fontWeight: '700' },
});
