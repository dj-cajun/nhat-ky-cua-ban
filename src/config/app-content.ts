/**
 * ============================================================
 *  앱 콘텐츠 진입점
 *
 *  지역 교체: 아래 import 한 줄만 변경
 *    import * as preset from './presets/hochiminh';
 *    import * as preset from './presets/hanoi';   (추후)
 * ============================================================
 */

import * as preset from './presets/hochiminh';

export type {
  LoggedInUserConfig,
  AffiliateItemConfig,
  ClassmateSeed,
  SeedPost,
} from './app-content.types';

// ─── 프리셋에서 re-export (교체 시 이 파일의 import만 수정) ───
export const REGION_ID = preset.REGION_ID;
export const REGION_LABEL = preset.REGION_LABEL;
export const REGION = preset.REGION;

export const LOGGED_IN_ZALO_USER = preset.LOGGED_IN_ZALO_USER;
export const SCHOOLS = preset.SCHOOLS;
export const CLASSES = preset.CLASSES;

export const DEFAULT_STATUS_MESSAGE = preset.DEFAULT_STATUS_MESSAGE;
export const DEFAULT_DOTORI_BALANCE = preset.DEFAULT_DOTORI_BALANCE;
export const DEFAULT_VISIT_TODAY = preset.DEFAULT_VISIT_TODAY;
export const DEFAULT_VISIT_TOTAL = preset.DEFAULT_VISIT_TOTAL;
export const DEFAULT_HINT = preset.DEFAULT_HINT;

export const VOTE_QUESTIONS = preset.VOTE_QUESTIONS;
export const CLASSMATES_SEED = preset.CLASSMATES_SEED;
export const SEED_VISITORS = preset.SEED_VISITORS;

export const SEED_DIARY_POSTS = preset.SEED_DIARY_POSTS;
export const SEED_SCHOOL_POSTS = preset.SEED_SCHOOL_POSTS;
export const SEED_GUESTBOOK_POSTS = preset.SEED_GUESTBOOK_POSTS;
export const SEED_VOTE_POSTS = preset.SEED_VOTE_POSTS;
export const SEED_CALENDAR = preset.SEED_CALENDAR;
export const SEED_PHOTO_CAPTION = preset.SEED_PHOTO_CAPTION;
export const SEED_PHOTO_URL = preset.SEED_PHOTO_URL;
export const SEED_PHOTO_GALLERY = preset.SEED_PHOTO_GALLERY;

export const AFFILIATE_ITEMS = preset.AFFILIATE_ITEMS;
export const OFFERWALL_URLS = preset.OFFERWALL_URLS;
export const EXTRA_PROFANITY_WORDS = preset.EXTRA_PROFANITY_WORDS;
export const REALTIME_MESSAGES = preset.REALTIME_MESSAGES;
export const APP_META = preset.APP_META;
