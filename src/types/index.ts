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
  avatarUrl?: string;
  statusMessage: string;
  dotoriBalance: number;
  visitCountToday: number;
  visitCountTotal: number;
}

export interface CalendarEntry {
  date: string;
  content: string;
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

export const BOARD_LABELS: Record<BoardType, string> = {
  diary: 'Nhật ký',
  school: 'Bảng tin toàn trường',
  vote: 'Kho phiếu bầu',
  guestbook: 'Sổ lưu bút',
};

export const MAX_DIARY_CHARS = 5;
export const MAX_CAPTION_CHARS = 10;
