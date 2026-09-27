import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

function isValidUrl(url: string): boolean {
  return (
    (url.startsWith('https://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1')) &&
    !url.includes('your-project-ref')
  );
}

export function isSupabaseConfigured(): boolean {
  return isValidUrl(SUPABASE_URL) && SUPABASE_KEY.length > 15;
}

let activeClient: SupabaseClient | null = null;
let appStateListenerRegistered = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!activeClient) {
    activeClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });

    if (!appStateListenerRegistered) {
      appStateListenerRegistered = true;
      AppState.addEventListener('change', (state) => {
        if (!activeClient) return;
        if (state === 'active') {
          activeClient.auth.startAutoRefresh();
        } else {
          activeClient.auth.stopAutoRefresh();
        }
      });
    }
  }

  return activeClient;
}
