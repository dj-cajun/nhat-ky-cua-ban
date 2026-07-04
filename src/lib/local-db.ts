import type {
  BoardType,
  CalendarEntry,
  FeedPost,
  PhotoAlbum,
  PhotoCard,
  UserProfile,
  Visitor,
} from '@/types';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';
import { CLASSMATES, DEFAULT_POSTS, DEFAULT_VISITORS } from '@/lib/seed-data';
import {
  DEFAULT_DOTORI_BALANCE,
  DEFAULT_VISIT_TODAY,
  DEFAULT_VISIT_TOTAL,
  SEED_CALENDAR,
  SEED_PHOTO_URL,
} from '@/config/app-content';

type StoredPhotoData = { photos: PhotoCard[] } | PhotoAlbum;

function normalizePhotoGallery(raw: StoredPhotoData | null): PhotoCard[] {
  if (raw && 'photos' in raw && Array.isArray(raw.photos)) {
    if (raw.photos.length === 0) return [];
    return raw.photos
      .filter((photo) => photo.imageUrl && photo.imageUrl !== SEED_PHOTO_URL)
      .map((photo) => ({
      id: photo.id,
      imageUrl: photo.imageUrl,
      caption: photo.caption || '',
    }));
  }

  if (raw && 'imageUrl' in raw) {
    if (!raw.imageUrl || raw.imageUrl === SEED_PHOTO_URL) return [];
    return [
      {
        id: 'photo-1',
        imageUrl: raw.imageUrl,
        caption: raw.caption || '',
      },
    ];
  }

  return [];
}

const KEYS = {
  profile: 'diary_profile',
  hint: 'diary_hint_enc',
  posts: 'diary_posts',
  visitors: 'diary_visitors',
  calendar: 'diary_calendar',
  photo: 'diary_photo',
  votes: 'diary_votes',
  dotoriMissions: 'diary_dotori_missions',
  dotoriPurchases: 'diary_dotori_purchases',
  dotoriGifts: 'diary_dotori_gifts',
  dotoriGiftDaily: 'diary_dotori_gift_daily',
  comments: 'diary_comments',
  nominations: 'diary_nominations',
  classmates: 'diary_classmates',
  blockedUsers: 'diary_blocked_users',
  reports: 'diary_reports',
  defenseDaily: 'diary_defense_daily',
} as const;

export interface StoredProfile extends UserProfile {
  zaloId: string;
  classId: string;
  hintEncrypted: string;
}

export interface VoteRecord {
  questionIndex: number;
  selectedUserId: string;
  hintShield: string;
  date: string;
}

export interface Nomination {
  targetUserId: string;
  voterId: string;
  hintShield: string;
  hintText: string;
  date: string;
}

export interface ReportRecord {
  id: string;
  targetUserId: string;
  reason: string;
  createdAt: string;
}

interface DefenseDaily {
  date: string;
  fakeHint: boolean;
  surnameBlur: boolean;
  nominationErase: number;
}

export interface RemoteClassmate {
  id: string;
  realName: string;
  surname: string;
  schoolName: string;
  className: string;
  statusMessage: string;
  hintEncrypted?: string;
  dotoriBalance: number;
  visitCountToday: number;
  visitCountTotal: number;
  surnameBlurUntil?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function initLocalDb(
  zaloId: string,
  realName: string,
  schoolName: string,
  className: string,
  hintSeal: string,
): StoredProfile {
  const existing = getProfile();
  if (existing && existing.zaloId === zaloId) {
    if (isPlaceholderZaloName(existing.realName) && !isPlaceholderZaloName(realName)) {
      const repaired = updateProfile({
        realName,
        surname: realName.split(/\s+/)[0] ?? realName,
      });
      return repaired ?? existing;
    }
    return existing;
  }

  const surname = realName.split(/\s+/)[0] ?? realName;
  const profile: StoredProfile = {
    id: `user-${zaloId}`,
    zaloId,
    realName,
    surname,
    schoolName,
    className,
    classId: `${schoolName}-${className}`,
    statusMessage: '',
    dotoriBalance: DEFAULT_DOTORI_BALANCE,
    visitCountToday: DEFAULT_VISIT_TODAY,
    visitCountTotal: DEFAULT_VISIT_TOTAL,
    hintEncrypted: hintSeal,
  };

  write(KEYS.profile, profile);
  write(KEYS.hint, profile.hintEncrypted);
  write(KEYS.posts, DEFAULT_POSTS);
  write(KEYS.visitors, DEFAULT_VISITORS);
  write(KEYS.calendar, SEED_CALENDAR satisfies CalendarEntry[]);
  write(KEYS.photo, { photos: [] });
  write(KEYS.votes, [] satisfies VoteRecord[]);
  write(KEYS.comments, [] satisfies Comment[]);
  write(KEYS.nominations, [] satisfies Nomination[]);
  write(KEYS.dotoriMissions, { shopee: false, tiktok: false, video: 0 });

  pushWelcomeGift();

  return profile;
}

function pushWelcomeGift(): void {
  const gifts = read<import('@/types/dotori').DotoriGift[]>(KEYS.dotoriGifts, []);
  if (gifts.length > 0) return;
  write(KEYS.dotoriGifts, [
    {
      id: 'welcome-gift',
      senderLabel: '🤫 Ai đó',
      giftType: 'dotori',
      amount: 3,
      message: 'Chào bạn!',
      opened: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}

export function getProfile(): StoredProfile | null {
  return read<StoredProfile | null>(KEYS.profile, null);
}

export function updateProfile(patch: Partial<StoredProfile>): StoredProfile | null {
  const profile = getProfile();
  if (!profile) return null;
  const updated = { ...profile, ...patch };
  write(KEYS.profile, updated);
  return updated;
}

export function getPosts(): Record<BoardType, FeedPost[]> {
  return read(KEYS.posts, DEFAULT_POSTS);
}

export function addPost(
  post: Omit<FeedPost, 'id' | 'createdAt'> & { targetUserId?: string },
): FeedPost {
  const posts = getPosts();
  const newPost: FeedPost = {
    ...post,
    id: `post-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const board = post.boardType;
  posts[board] = [newPost, ...(posts[board] ?? [])];
  write(KEYS.posts, posts);
  return newPost;
}

export function getVisitors(): Visitor[] {
  return read(KEYS.visitors, DEFAULT_VISITORS);
}

export function getTodayVisitors(): Visitor[] {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return getVisitors().filter((v) => {
    const visitedDay = new Date(v.visitedAt).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    return visitedDay === today;
  });
}

export function addVisitor(visitor: Visitor): void {
  const visitors = getVisitors().filter((v) => v.id !== visitor.id);
  write(KEYS.visitors, [visitor, ...visitors].slice(0, 10));
}

export function getCalendarEntries(): CalendarEntry[] {
  return read(KEYS.calendar, []);
}

export function saveCalendarEntry(date: string, content: string): void {
  const entries = getCalendarEntries().filter((e) => e.date !== date);
  if (content.trim()) entries.push({ date, content: content.trim() });
  write(KEYS.calendar, entries);
}

export function getPhotoGallery(): PhotoCard[] {
  const raw = read<StoredPhotoData | null>(KEYS.photo, null);
  return normalizePhotoGallery(raw);
}

export function getPhotoAlbum(): PhotoAlbum {
  const first = getPhotoGallery()[0];
  if (!first?.imageUrl) {
    return { imageUrl: '', caption: '' };
  }
  return {
    imageUrl: first.imageUrl,
    caption: first.caption || '',
  };
}

export function savePhotoGallery(photos: PhotoCard[]): void {
  write(KEYS.photo, { photos });
}

export function updatePhotoCard(id: string, patch: Partial<Pick<PhotoCard, 'imageUrl' | 'caption'>>): void {
  const photos = getPhotoGallery().map((photo) =>
    photo.id === id ? { ...photo, ...patch } : photo,
  );
  savePhotoGallery(photos);
}

export function addPhotoCard(imageUrl: string, caption = ''): PhotoCard {
  const photos = getPhotoGallery();
  const card: PhotoCard = {
    id: `photo-${Date.now()}`,
    imageUrl,
    caption,
  };
  savePhotoGallery([...photos, card]);
  return card;
}

export function deletePhotoCard(id: string): void {
  savePhotoGallery(getPhotoGallery().filter((photo) => photo.id !== id));
}

export function getVoteRecords(): VoteRecord[] {
  return read(KEYS.votes, []);
}

export function saveVoteRecord(record: VoteRecord): void {
  const votes = getVoteRecords().filter(
    (v) => !(v.date === record.date && v.questionIndex === record.questionIndex),
  );
  votes.push(record);
  write(KEYS.votes, votes);
}

export function getTodayVoteCount(): number {
  const today = todayStr();
  return getVoteRecords().filter((v) => v.date === today).length;
}

export function isVoteCompleteToday(): boolean {
  return getTodayVoteCount() >= 12;
}

export function getComments(postId: string): Comment[] {
  return read<Comment[]>(KEYS.comments, []).filter((c) => c.postId === postId);
}

export function addComment(postId: string, authorId: string, content: string): Comment {
  const comments = read<Comment[]>(KEYS.comments, []);
  const comment: Comment = {
    id: `cmt-${Date.now()}`,
    postId,
    authorId,
    content,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  write(KEYS.comments, comments);
  return comment;
}

export function addDotori(amount: number): number {
  const profile = getProfile();
  if (!profile) return 0;
  const balance = profile.dotoriBalance + amount;
  updateProfile({ dotoriBalance: balance });
  return balance;
}

export function spendDotori(amount: number): number | null {
  const profile = getProfile();
  if (!profile || profile.dotoriBalance < amount) return null;
  const balance = profile.dotoriBalance - amount;
  updateProfile({ dotoriBalance: balance });
  return balance;
}

export function hasDotoriPurchase(key: string): boolean {
  const purchases = read<Record<string, true>>(KEYS.dotoriPurchases, {});
  return Boolean(purchases[key]);
}

export function markDotoriPurchase(key: string): void {
  const purchases = read<Record<string, true>>(KEYS.dotoriPurchases, {});
  purchases[key] = true;
  write(KEYS.dotoriPurchases, purchases);
}

export function getGiftInbox(): import('@/types/dotori').DotoriGift[] {
  return read(KEYS.dotoriGifts, []);
}

export function pushGiftInbox(gift: import('@/types/dotori').DotoriGift): void {
  const gifts = getGiftInbox();
  write(KEYS.dotoriGifts, [gift, ...gifts]);
}

export function openGift(giftId: string): import('@/types/dotori').DotoriGift | null {
  const gifts = getGiftInbox();
  const index = gifts.findIndex((gift) => gift.id === giftId);
  if (index < 0) return null;
  const gift = { ...gifts[index], opened: true };
  gifts[index] = gift;
  write(KEYS.dotoriGifts, gifts);
  return gift;
}

export function countDotoriGiftsSentToday(): number {
  const today = todayStr();
  const record = read<{ date: string; count: number; dotori: number }>(KEYS.dotoriGiftDaily, {
    date: '',
    count: 0,
    dotori: 0,
  });
  return record.date === today ? record.count : 0;
}

export function recordGiftSent(dotoriAmount: number): void {
  const today = todayStr();
  const record = read<{ date: string; count: number; dotori: number }>(KEYS.dotoriGiftDaily, {
    date: '',
    count: 0,
    dotori: 0,
  });
  const next =
    record.date === today
      ? { date: today, count: record.count + 1, dotori: record.dotori + dotoriAmount }
      : { date: today, count: 1, dotori: dotoriAmount };
  write(KEYS.dotoriGiftDaily, next);
}

export function getClassmates(): UserProfile[] {
  const remote = read<RemoteClassmate[]>(KEYS.classmates, []);
  if (remote.length > 0) {
    return remote.map((c) => ({
      id: c.id,
      realName: c.realName,
      surname: c.surname,
      schoolName: c.schoolName,
      className: c.className,
      statusMessage: c.statusMessage,
      dotoriBalance: c.dotoriBalance,
      visitCountToday: c.visitCountToday,
      visitCountTotal: c.visitCountTotal,
      surnameBlurUntil: c.surnameBlurUntil,
    }));
  }
  return CLASSMATES;
}

export function getClassmateById(id: string): UserProfile | undefined {
  return getClassmates().find((c) => c.id === id);
}

export function setRemoteClassmates(classmates: RemoteClassmate[]): void {
  write(KEYS.classmates, classmates);
}

export function getBlockedUserIds(): string[] {
  return read<string[]>(KEYS.blockedUsers, []);
}

export function addBlockedUser(userId: string): void {
  const ids = getBlockedUserIds();
  if (!ids.includes(userId)) {
    write(KEYS.blockedUsers, [...ids, userId]);
  }
}

export function removeBlockedUser(userId: string): void {
  write(
    KEYS.blockedUsers,
    getBlockedUserIds().filter((id) => id !== userId),
  );
}

export function addReport(report: ReportRecord): void {
  const reports = read<ReportRecord[]>(KEYS.reports, []);
  reports.push(report);
  write(KEYS.reports, reports.slice(-50));
}

export function getReports(): ReportRecord[] {
  return read<ReportRecord[]>(KEYS.reports, []);
}

function getDefenseDaily(): DefenseDaily {
  const today = todayStr();
  const record = read<DefenseDaily>(KEYS.defenseDaily, {
    date: '',
    fakeHint: false,
    surnameBlur: false,
    nominationErase: 0,
  });
  if (record.date !== today) {
    return { date: today, fakeHint: false, surnameBlur: false, nominationErase: 0 };
  }
  return record;
}

function saveDefenseDaily(patch: Partial<DefenseDaily>): DefenseDaily {
  const current = getDefenseDaily();
  const next = { ...current, ...patch, date: todayStr() };
  write(KEYS.defenseDaily, next);
  return next;
}

export function hasFakeHintActive(): boolean {
  return getDefenseDaily().fakeHint;
}

export function activateFakeHint(): void {
  saveDefenseDaily({ fakeHint: true });
}

export function hasSurnameBlurActive(): boolean {
  return getDefenseDaily().surnameBlur;
}

export function activateSurnameBlur(): void {
  saveDefenseDaily({ surnameBlur: true });
  const until = new Date(Date.now() + 86_400_000).toISOString();
  updateProfile({ surnameBlurUntil: until });
}

export function isSurnameBlurred(profile: UserProfile): boolean {
  if (!profile.surnameBlurUntil) return false;
  return new Date(profile.surnameBlurUntil).getTime() > Date.now();
}

export function canEraseNominationToday(): boolean {
  return getDefenseDaily().nominationErase < 1;
}

export function recordNominationErase(): void {
  const daily = getDefenseDaily();
  saveDefenseDaily({ nominationErase: daily.nominationErase + 1 });
}

export function eraseNomination(targetUserId: string, voterId: string, date: string): boolean {
  const list = read<Nomination[]>(KEYS.nominations, []);
  const index = list.findIndex(
    (n) => n.targetUserId === targetUserId && n.voterId === voterId && n.date === date,
  );
  if (index < 0) return false;
  list.splice(index, 1);
  write(KEYS.nominations, list);
  return true;
}

export function getClassmateHintEncrypted(id: string): string | undefined {
  const remote = read<RemoteClassmate[]>(KEYS.classmates, []);
  return remote.find((c) => c.id === id)?.hintEncrypted;
}

export function setPosts(posts: Record<BoardType, FeedPost[]>): void {
  write(KEYS.posts, posts);
}

export function addNomination(nomination: Nomination): void {
  const list = read<Nomination[]>(KEYS.nominations, []);
  list.push(nomination);
  write(KEYS.nominations, list);
}

export function getNominationsForUser(userId: string, date: string): Nomination[] {
  return read<Nomination[]>(KEYS.nominations, []).filter(
    (n) => n.targetUserId === userId && n.date === date,
  );
}

export function getDotoriMissions(): { shopee: boolean; tiktok: boolean; video: number } {
  return read(KEYS.dotoriMissions, { shopee: false, tiktok: false, video: 0 });
}

export function completeDotoriMission(mission: 'shopee' | 'tiktok' | 'video'): number {
  const missions = getDotoriMissions();
  if (mission === 'video') {
    missions.video += 1;
  } else {
    missions[mission] = true;
  }
  write(KEYS.dotoriMissions, missions);
  const reward = mission === 'tiktok' ? 3 : 2;
  return addDotori(reward);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
