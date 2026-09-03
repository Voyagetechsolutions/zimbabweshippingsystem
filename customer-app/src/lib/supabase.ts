import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Surfaced loudly during development so a missing .env is obvious.
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Same Supabase project the website and WhatsApp bot use — one source of truth.
export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * `autoRefreshToken` alone is not enough on a phone. The refresh ticker is a
 * plain JS interval, and both iOS and Android suspend JS timers as soon as the
 * app leaves the foreground — so a customer who closes the app for an hour
 * comes back holding an access token that quietly expired while nothing was
 * running to renew it. Everything they can see still looks signed in (the
 * stored session, their name, their shipments), but the next authenticated
 * call fails and the app tells them to sign in.
 *
 * Restarting the ticker on foreground is Supabase's documented requirement for
 * React Native. `startAutoRefresh` also refreshes immediately, so the token is
 * renewed the moment the app comes back rather than on the next tick.
 */
AppState.addEventListener('change', (state) => {
  const change = state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
  change.catch(() => { /* refreshing again is only ever a retry away */ });
});
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh().catch(() => {});
