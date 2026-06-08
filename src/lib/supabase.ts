import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * Single Supabase client for the app. Auth sessions persist to localStorage
 * and refresh automatically, so a signed-in user stays signed in across
 * reloads and the Capacitor (Android) WebView relaunch.
 *
 * When the env vars are missing the client is `null` — callers should treat
 * that as "auth not configured" and surface a setup hint instead of crashing.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // no OAuth redirect handling in the WebView build
      },
    })
  : null;
