/** 공통 타입 — 프리셋·app-content 공유 */

export interface LoggedInUserConfig {
  id: string;
  name: string;
  avatar?: string;
}

export interface AffiliateItemConfig {
  id: string;
  name: string;
  emoji: string;
  price: string;
  url: string;
  platform: 'shopee' | 'lazada' | 'tiktok' | 'agoda';
}

export interface ClassmateSeed {
  id: string;
  realName: string;
  surname: string;
  statusMessage: string;
}

export interface SeedPost {
  authorId: string;
  content: string;
  hasPhoto?: boolean;
  hasVideo?: boolean;
  hasLink?: boolean;
  targetUserId?: string;
}
