import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('schools').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export { isSupabaseConfigured, getSupabase };
