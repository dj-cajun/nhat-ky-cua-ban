import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { APP_NAME, APP_TAGLINE, DEFAULT_TIMEZONE, en, type Messages } from '@/i18n/en';
import { ko } from '@/i18n/ko';

export type Locale = 'en' | 'ko';

export type { Messages };
export { en, ko, APP_NAME, APP_TAGLINE, DEFAULT_TIMEZONE };

const STORAGE_KEY = 'your-diary-mobile-locale';
const listeners = new Set<() => void>();

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ko') return saved;
  } catch {
    /* ignore */
  }
  try {
    const nav = navigator.language?.toLowerCase() ?? '';
    if (nav.startsWith('ko')) return 'ko';
  } catch {
    /* ignore */
  }
  return 'en';
}

let current: Locale = typeof window === 'undefined' ? 'en' : detectLocale();

function emit() {
  for (const l of listeners) l();
}

const catalogs: Record<Locale, Messages> = {
  en,
  ko: ko as unknown as Messages,
};

export function getLocale(): Locale {
  return current;
}

export function getMessages(): Messages {
  return catalogs[current];
}

export function getBrandName(): 'Your Diary' | '너의 다이어리' {
  return current === 'ko' ? '너의 다이어리' : 'Your Diary';
}

export function setLocale(locale: Locale) {
  if (locale === current) return;
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocale(): [Locale, (locale: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getLocale, () => 'en' as Locale);
  return [locale, setLocale];
}

export function useMessages(): Messages {
  const [locale] = useLocale();
  return useMemo(() => catalogs[locale], [locale]);
}

export function useSetLocale() {
  return useCallback((locale: Locale) => setLocale(locale), []);
}
