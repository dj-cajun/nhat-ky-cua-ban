const ZALO_SESSION_KEY = 'zalo_session';
const ONBOARDING_KEY = 'onboarding_complete';
const INTRO_SEEN_KEY = 'app_intro_seen';

const APP_DATA_KEYS = [
  'diary_profile',
  'diary_hint_enc',
  'diary_posts',
  'diary_visitors',
  'diary_calendar',
  'diary_photo',
  'diary_votes',
  'diary_dotori_missions',
  'diary_dotori_purchases',
  'diary_dotori_gifts',
  'diary_dotori_gift_daily',
  'diary_comments',
  'diary_nominations',
  'diary_class_foundings',
  'diary_founding_gates',
] as const;

export function isIntroSeen(): boolean {
  return localStorage.getItem(INTRO_SEEN_KEY) === 'true';
}

export function markIntroSeen(): void {
  localStorage.setItem(INTRO_SEEN_KEY, 'true');
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboarded(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function getZaloSessionKey(): string {
  return ZALO_SESSION_KEY;
}

export function clearAppData(): void {
  for (const key of APP_DATA_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(INTRO_SEEN_KEY);
  localStorage.removeItem(ZALO_SESSION_KEY);
}

/** 개발용: URL에 ?reset=1 이면 세션 초기화 */
export function handleDevReset(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') !== '1') {
    return false;
  }

  clearAppData();
  params.delete('reset');
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState({}, '', next);
  return true;
}
