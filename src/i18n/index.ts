import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { en, type Messages } from '@/i18n/en';
import { ko } from '@/i18n/ko';

export type Locale = 'en' | 'ko';

export type { Messages };
export { en, ko };

export function getBoardLabels() {
  return getMessages().boards;
}

/** Live board labels for the active locale */
export const BOARD_LABELS = new Proxy({} as Messages['boards'], {
  get(_t, prop: string | symbol) {
    return (getMessages().boards as Record<string | symbol, string>)[prop];
  },
});

const STORAGE_KEY = 'your-diary-locale';
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

function applyDocumentLang(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'ko' ? 'ko' : 'en';
  document.title = locale === 'ko' ? '너의 다이어리' : 'Your Diary';
}

applyDocumentLang(current);

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

/** @deprecated Use getMessages() — kept for gradual migration */
export const vi = new Proxy({} as Messages, {
  get(_t, prop) {
    return (getMessages() as Record<string | symbol, unknown>)[prop];
  },
});

export function setLocale(locale: Locale) {
  if (locale === current) return;
  current = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  applyDocumentLang(locale);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
