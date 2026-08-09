import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Customer accounts are the same Supabase auth users as the website —
// one account works everywhere.
export type Profile = { id: string; full_name?: string | null; email?: string | null; phone_number?: string | null; first_name?:string|null;last_name?:string|null;pickup_address?:string|null;pickup_city?:string|null;postal_code?:string|null;country?:string|null;customer_code?:string|null;onboarding_completed?:boolean|null;notification_preferences?:any;preferred_theme?:string|null };

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean; existing?: boolean }>;
  signInWithApple: () => Promise<{ error?: string; cancelled?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile:()=>Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Website bookings made before this customer had an account carry
  // user_id = null. Claiming them by confirmed sender email is what makes them
  // show up under Shipments here. Best effort — never blocks sign-in.
  const claimedForRef = useRef<string | null>(null);
  const claimGuestBookings = useCallback(async (userId: string) => {
    if (claimedForRef.current === userId) return;
    claimedForRef.current = userId;
    try {
      await supabase.rpc('claim_guest_bookings');
    } catch (e) {
      console.warn('Could not claim guest bookings', e);
    }
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email,phone_number,first_name,last_name,pickup_address,pickup_city,postal_code,country,customer_code,onboarding_completed,notification_preferences,preferred_theme')
      .eq('id', userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
        claimGuestBookings(data.session.user.id);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
        claimGuestBookings(s.user.id);
      } else {
        setProfile(null);
        claimedForRef.current = null;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, claimGuestBookings]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return { existing: true };
      return { error: error.message };
    }
    // With email confirmation on, Supabase obfuscates existing confirmed
    // accounts as a "success" with zero identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { existing: true };
    }
    return { needsConfirm: !data.session };
  }, []);

  /**
   * Native Sign in with Apple. Apple hands back an identity token that Supabase
   * exchanges for a session — the Apple provider must have the bundle ID
   * `com.voyagetech.zimbabweshipphing` listed as an authorised client.
   *
   * Apple returns the user's name and email ONLY on the very first sign-in and
   * never again, so persist them immediately or they are lost for good. Apple
   * also lets users hide their real address, in which case the email is a
   * privaterelay.appleid.com forwarding address — still deliverable.
   *
   * The authorization code is likewise a one-shot: it expires after five minutes
   * and can only be redeemed once. It is handed to the `apple-auth` edge
   * function so the resulting refresh token can be stored and later revoked when
   * the customer deletes their account, which Apple requires of every app
   * offering Sign in with Apple.
   */
  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') return { error: 'Sign in with Apple is only available on iPhone and iPad.' };

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) return { error: 'Apple did not return a sign-in token. Please try again.' };

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) return { error: error.message };

      // Best effort, and deliberately not fatal: a customer who cannot reach
      // this function should still get signed in. The cost of failure is that
      // deletion later has no token to revoke, which is logged server-side.
      if (credential.authorizationCode) {
        try {
          const { error: linkError } = await supabase.functions.invoke('apple-auth', {
            body: { action: 'link', authorizationCode: credential.authorizationCode },
          });
          if (linkError) console.warn('Could not store Apple refresh token', linkError.message);
        } catch (linkError) {
          console.warn('Could not reach apple-auth', linkError);
        }
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (data.user && (fullName || credential.email)) {
        // First sign-in only. Don't clobber details the customer already has —
        // they may have signed up by email first and linked Apple afterwards.
        const { data: existing } = await supabase
          .from('profiles')
          .select('full_name,email')
          .eq('id', data.user.id)
          .maybeSingle();

        const patch: Record<string, string> = {};
        if (fullName && !existing?.full_name) patch.full_name = fullName;
        if (credential.email && !existing?.email) patch.email = credential.email;

        if (Object.keys(patch).length) {
          await supabase.from('profiles').update(patch).eq('id', data.user.id);
          await loadProfile(data.user.id);
        }
      }

      return {};
    } catch (e: any) {
      // Tapping "Cancel" on the Apple sheet is a normal outcome, not a failure.
      if (e?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
      return { error: e?.message ?? 'Sign in with Apple failed.' };
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);
  const refreshProfile=useCallback(async()=>{if(session?.user.id)await loadProfile(session.user.id);},[session?.user.id,loadProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signInWithApple, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
