/**
 * 도메인 타입 — 서버/클라이언트가 공유하는 계약
 * DB 생성 타입은 database.generated.ts 로 대체 예정
 */

export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type CircleStatus = 'draft' | 'pending_accept' | 'open' | 'archived';
export type MemberStatus = 'active' | 'left' | 'removed';
export type DraftResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
export type RecommendationDecision = 'pending' | 'recommended' | 'unknown' | 'later';
export type DiaryVisibilityMode = 'private' | 'selected_circles' | 'all_circles';
export type DiaryMood =
  | 'happy'
  | 'calm'
  | 'tired'
  | 'excited'
  | 'sad'
  | 'anxious'
  | 'grateful'
  | 'neutral';

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  color: string;
  symbol: string;
  createdBy: string;
  status: CircleStatus;
  openedAt?: string | null;
  createdAt: string;
}

export interface CircleSummary {
  id: string;
  name: string;
  color: string;
  symbol: string;
  activeMemberCount: number;
  wroteTodayCount: number;
  hasActiveNotice: boolean;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  entryDate: string;
  timezone: string;
  mood?: DiaryMood | null;
  tenCharText?: string | null;
  shortText?: string | null;
  visibilityMode: DiaryVisibilityMode;
  createdAt: string;
  updatedAt: string;
}

export const CIRCLE_PIONEER_COUNT = 3;
export const CIRCLE_JOIN_RECOMMENDATION_COUNT = 3;
export const MAX_TEN_CHAR = 10;

export const CIRCLE_COLORS = [
  '#7C9A8E',
  '#C4A484',
  '#8B7E74',
  '#6B8CAE',
  '#B88B8B',
  '#9A8FB8',
] as const;

export const CIRCLE_SYMBOLS = ['○', '◇', '△', '☆', '❀', '✦'] as const;

export const DIARY_MOODS: { id: DiaryMood; label: string; emoji: string }[] = [
  { id: 'happy', label: '기쁨', emoji: '😊' },
  { id: 'calm', label: '평온', emoji: '😌' },
  { id: 'tired', label: '피곤', emoji: '😮‍💨' },
  { id: 'excited', label: '설렘', emoji: '✨' },
  { id: 'sad', label: '슬픔', emoji: '😔' },
  { id: 'anxious', label: '불안', emoji: '😰' },
  { id: 'grateful', label: '감사', emoji: '🙏' },
  { id: 'neutral', label: '그저 그럼', emoji: '😐' },
];
