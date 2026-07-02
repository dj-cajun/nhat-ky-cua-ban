import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseEnabled = import.meta.env.VITE_SUPABASE_ENABLED !== 'false';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!);
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return supabaseEnabled && Boolean(supabaseUrl && supabaseAnonKey);
}
