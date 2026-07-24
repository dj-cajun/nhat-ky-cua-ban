/**
 * Domain types — shared client/server contracts.
 * Swap in database.generated.ts after migrations.
 */

export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'OFFLINE'
  | 'UPLOAD_FAILED'
  | 'REALTIME_FAILED'
  | 'EXTERNAL_SERVICE_FAILED'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public retryable = false,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Screen view-model states — every primary screen should handle these. */
export type ScreenState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'offline';

export type CircleStatus = 'draft' | 'pending_accept' | 'open' | 'archived';
export type MemberStatus = 'active' | 'left' | 'removed';
export type DraftResponseStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type RecommendationDecision = 'pending' | 'recommended' | 'unknown' | 'later';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
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
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'tired', label: 'Tired', emoji: '😮‍💨' },
  { id: 'excited', label: 'Excited', emoji: '✨' },
  { id: 'sad', label: 'Sad', emoji: '😔' },
  { id: 'anxious', label: 'Anxious', emoji: '😰' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏' },
  { id: 'neutral', label: 'Okay', emoji: '😐' },
];
