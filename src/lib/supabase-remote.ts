import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

let remoteAvailable: boolean | null = null;
let checkPromise: Promise<boolean> | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isRemoteEnabled(): boolean {
  return remoteAvailable === true;
}

/** Supabase URL·키가 있고 REST API가 응답할 때만 true */
export async function ensureRemoteAvailable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    remoteAvailable = false;
    return false;
  }
  if (remoteAvailable !== null) return remoteAvailable;
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        remoteAvailable = false;
        return false;
      }
      const { error } = await supabase.from('schools').select('id').limit(1);
      remoteAvailable = !error;
      return remoteAvailable;
    } catch {
      remoteAvailable = false;
      return false;
    } finally {
      checkPromise = null;
    }
  })();

  return checkPromise;
}
