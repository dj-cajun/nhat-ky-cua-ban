/**
 * 데모 모드: 온보딩 없이 호치민 Marie Curie 11A로 바로 시작
 * VITE_DEMO_MODE=true 일 때 활성화
 */
import {
  LOGGED_IN_ZALO_USER,
  REGION,
  DEFAULT_HINT,
} from '@/config/app-content';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export function initDemoSession(): boolean {
  if (localStorage.getItem('onboarding_complete') === 'true') {
    return false;
  }

  db.initProfile(
    LOGGED_IN_ZALO_USER.id,
    LOGGED_IN_ZALO_USER.name,
    REGION.defaultSchool,
    REGION.defaultClass,
    DEFAULT_HINT,
  );

  localStorage.setItem('onboarding_complete', 'true');
  emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
  return true;
}
