import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  signOut: () => Promise<void>;
  refreshProfile:()=>Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);
  const refreshProfile=useCallback(async()=>{if(session?.user.id)await loadProfile(session.user.id);},[session?.user.id,loadProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
