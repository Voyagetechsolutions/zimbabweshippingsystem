import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Which dashboard a signed-in user gets. The canonical admin check is the
// database's own is_admin() function — the same source the website's
// make_admin() writes to. profiles.role covers the rest:
//   admin / logistics -> admin dashboard
//   finance           -> finance dashboard
//   driver            -> driver dashboard
//   customer / other  -> no access
export type DashboardRole = 'admin' | 'finance' | 'driver';

type Profile = { id: string; full_name?: string | null; role?: string | null; is_admin?: boolean | null };

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isStaff: boolean;
  dashboardRole: DashboardRole | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminFlag, setAdminFlag] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    // 1. Canonical admin check — the DB's own security-definer function for the
    //    logged-in user. This is exactly what the website's make_admin() sets.
    try {
      const { data: adm } = await supabase.rpc('is_admin');
      setAdminFlag(adm === true);
    } catch {
      setAdminFlag(false);
    }

    // 2. Profile for display + secondary role/is_admin signals.
    let { data } = await supabase.from('profiles').select('id, full_name, role, is_admin').eq('id', userId).maybeSingle();
    if (!data && email) {
      const byEmail = await supabase.from('profiles').select('id, full_name, role, is_admin').eq('email', email).maybeSingle();
      data = byEmail.data;
    }
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id, data.session.user.email ?? undefined);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id, s.user.email ?? undefined);
      } else {
        setProfile(null);
        setAdminFlag(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAdminFlag(false);
  }, []);

  // Resolve which dashboard this user gets. Admin wins (DB is_admin() function,
  // profiles.is_admin flag, or admin/logistics role); then finance; then driver.
  const role = (profile?.role || '').toLowerCase();
  let dashboardRole: DashboardRole | null = null;
  if (adminFlag || profile?.is_admin === true || role === 'admin' || role === 'logistics') {
    dashboardRole = 'admin';
  } else if (role === 'finance') {
    dashboardRole = 'finance';
  } else if (role === 'driver') {
    dashboardRole = 'driver';
  }
  const isStaff = dashboardRole !== null;

  return (
    <AuthContext.Provider value={{ session, profile, loading, isStaff, dashboardRole, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
