import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ensureRemoteAvailable } from '@/lib/supabase-remote';
import { EXTRA_PROFANITY_WORDS } from '@/config/app-content';

const CACHE_KEY = 'diary_profanity_cache';
const CACHE_TTL_MS = 86_400_000;

const DEFAULT_BLACKLIST = [...EXTRA_PROFANITY_WORDS];

let memoryCache: string[] | null = null;

function readCache(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { words: string[]; fetchedAt: number };
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.words;
  } catch {
    return null;
  }
}

function writeCache(words: string[]): void {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ words, fetchedAt: Date.now() }),
  );
}

/** Supabase profanity_blacklist + 로컬 fallback */
export async function loadProfanityBlacklist(): Promise<string[]> {
  if (memoryCache) return memoryCache;

  const cached = readCache();
  if (cached?.length) {
    memoryCache = cached;
    return cached;
  }

  if (!isSupabaseConfigured() || !(await ensureRemoteAvailable())) {
    memoryCache = DEFAULT_BLACKLIST;
    return memoryCache;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      memoryCache = DEFAULT_BLACKLIST;
      return memoryCache;
    }

    const { data } = await supabase.from('profanity_blacklist').select('word').limit(500);
    const remoteWords = data?.map((row) => row.word).filter(Boolean) ?? [];
    const merged = [...new Set([...DEFAULT_BLACKLIST, ...remoteWords])];
    writeCache(merged);
    memoryCache = merged;
    return merged;
  } catch {
    memoryCache = DEFAULT_BLACKLIST;
    return memoryCache;
  }
}

export function primeProfanityBlacklist(): void {
  void loadProfanityBlacklist();
}
