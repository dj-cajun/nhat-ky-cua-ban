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
  'diary_classmates',
  'diary_blocked_users',
  'diary_reports',
  'diary_defense_daily',
  'diary_profanity_cache',
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
  localStorage.removeItem('vote_demo');
  localStorage.removeItem('notify_demo');
}

/** 데모 URL 플래그를 localStorage에 저장 (리다이렉트·리로드 후에도 유지) */
export function captureDemoFlags(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get('vote') === 'demo') {
    localStorage.setItem('vote_demo', 'true');
  }
  if (params.get('notify') === 'demo') {
    localStorage.setItem('notify_demo', 'true');
  }
}

export function isVoteDemoActive(): boolean {
  return (
    new URLSearchParams(window.location.search).get('vote') === 'demo' ||
    localStorage.getItem('vote_demo') === 'true'
  );
}

export function isNotifyDemoActive(): boolean {
  return (
    new URLSearchParams(window.location.search).get('notify') === 'demo' ||
    localStorage.getItem('notify_demo') === 'true'
  );
}

/** 개발용: URL에 ?reset=1 이면 세션 초기화 */
export function handleDevReset(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') !== '1') {
    return false;
  }

  clearAppData();
  params.delete('reset');
  captureDemoFlags();
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState({}, '', next);
  return true;
}
