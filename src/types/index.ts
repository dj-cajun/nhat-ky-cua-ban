export type BoardType = 'diary' | 'school' | 'vote' | 'guestbook';

export type ViewMode = 'my' | 'stranger';

export type HintShield = 'surname' | 'height' | 'gender' | 'commute';

export interface UserProfile {
  id: string;
  realName: string;
  surname: string;
  schoolName: string;
  className: string;
  classId?: string;
  /** Supabase classes.id (UUID) */
  remoteClassId?: string;
  avatarUrl?: string;
  statusMessage: string;
  dotoriBalance: number;
  visitCountToday: number;
  visitCountTotal: number;
  themeId?: import('@/types/dotori').ProfileThemeId;
  fontId?: import('@/types/dotori').ProfileFontId;
  badgeEmoji?: string;
  /** ISO — 성씨 24h 블러 (D-05) */
  surnameBlurUntil?: string;
}

export interface CalendarEntry {
  date: string;
  content: string;
}

export interface PhotoCard {
  id: string;
  imageUrl: string;
  caption: string;
}

export interface PhotoAlbum {
  imageUrl: string;
  caption: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  boardType: BoardType;
  content: string;
  hasPhoto: boolean;
  hasVideo: boolean;
  hasLink: boolean;
  createdAt: string;
  targetUserId?: string;
}

export interface Visitor {
  id: string;
  surname: string;
  visitedAt: string;
}

export interface HintData {
  gender: 'male' | 'female' | 'other';
  heightRange: string;
  mbtiPrefix: string;
  commute: 'motorbike' | 'bicycle' | 'walk' | 'bus' | 'other';
}

/** @deprecated Prefer getMessages().boards / useMessages().boards */
export const BOARD_LABELS: Record<BoardType, string> = {
  diary: 'Diary',
  school: 'School board',
  vote: 'Vote vault',
  guestbook: 'Guestbook',
};

export const MAX_DIARY_CHARS = 15;
export const MAX_CAPTION_CHARS = 10;
export const MAX_STATUS_MESSAGE_CHARS = 40;
export const MAX_ALBUM_PHOTOS = 30;
