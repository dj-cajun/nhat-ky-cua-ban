/** 「너의 다이어리」 v1 — 서클·다이어리 도메인 (§3, §18) */

export type CircleStatus = 'draft' | 'pending_accept' | 'open' | 'archived';

export type MemberRole = 'member' | 'admin' | 'pioneer';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

export type RecommendationStatus = 'pending' | 'recommended' | 'unknown' | 'later';

export type CirclePostType = 'notice' | 'poll';

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

export type MessageSenderMode = 'real_name' | 'alias';

export type AuthProvider = 'email' | 'google' | 'apple' | 'demo';

export interface AppProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  authProvider: AuthProvider;
  email?: string;
  createdAt: string;
  termsAcceptedAt?: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  color: string;
  symbol: string;
  createdBy: string;
  status: CircleStatus;
  openedAt?: string;
  createdAt: string;
}

export interface CircleMember {
  circleId: string;
  userId: string;
  role: MemberRole;
  isPioneer: boolean;
  joinedAt: string;
}

export interface CircleDraft {
  id: string;
  name: string;
  inviterId: string;
  inviteeIds: [string, string];
  createdAt: string;
  expiresAt: string;
}

export interface CircleCreationInvite {
  id: string;
  circleDraftId: string;
  inviterId: string;
  inviteeId: string;
  status: InviteStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface CircleJoinRequest {
  id: string;
  circleId: string;
  applicantId: string;
  status: JoinRequestStatus;
  expiresAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CircleRecommendation {
  id: string;
  joinRequestId: string;
  recommenderId: string;
  status: RecommendationStatus;
  respondedAt?: string;
  createdAt: string;
}

export interface CirclePresence {
  circleId: string;
  userId: string;
  lastHeartbeat: string;
  activeSessionId: string;
}

export interface CirclePost {
  id: string;
  circleId: string;
  type: CirclePostType;
  title: string;
  body: string;
  closesAt: string;
  createdBy: string;
  createdAt: string;
}

export interface CirclePollOption {
  id: string;
  postId: string;
  label: string;
}

export interface CircleResponse {
  postId: string;
  userId: string;
  optionId?: string;
  respondedAt: string;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  entryDate: string;
  mood?: DiaryMood;
  tenCharText?: string;
  shortText?: string;
  representativePhotoId?: string;
  musicModuleId?: string;
  visibilityMode: DiaryVisibilityMode;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryVisibility {
  entryId: string;
  circleId: string;
}

export interface PhotoAsset {
  id: string;
  userId: string;
  storagePath: string;
  thumbnailPath: string;
  createdAt: string;
}

export interface GuestbookEntry {
  id: string;
  ownerUserId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  hidden?: boolean;
}

export interface AliasProfile {
  id: string;
  circleId: string;
  userId: string;
  aliasName: string;
  assignedAt: string;
  expiresAt: string;
}

export interface AnonymousPost {
  id: string;
  circleId: string;
  authorUserId: string;
  aliasProfileId: string;
  body: string;
  createdAt: string;
  hidden?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  circleId: string;
  senderMode: MessageSenderMode;
  aliasProfileId?: string;
  body: string;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface BlockRecord {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface MusicModule {
  id: string;
  userId: string;
  spotifyUrl: string;
  title: string;
  artist: string;
  albumImageUrl?: string;
  createdAt: string;
}

/** 서클 개척 완료에 필요한 인원 (제안자 포함 3명) */
export const CIRCLE_PIONEER_COUNT = 3;
export const CIRCLE_JOIN_RECOMMENDATION_COUNT = 3;
export const MAX_TEN_CHAR = 10;
export const MAX_SHORT_TEXT = 280;
export const MAX_GUESTBOOK_CHARS = 120;
export const MAX_ALIAS_POST_CHARS = 200;
export const MAX_DAILY_ALIAS_POSTS = 5;

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
