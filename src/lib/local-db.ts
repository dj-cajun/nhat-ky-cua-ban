import type {
  BoardType,
  CalendarEntry,
  FeedPost,
  HintData,
  PhotoAlbum,
  UserProfile,
  Visitor,
} from '@/types';
import { encryptHintData } from '@/lib/hint-crypto';
import { CLASSMATES, DEFAULT_POSTS, DEFAULT_VISITORS } from '@/lib/seed-data';

const KEYS = {
  profile: 'diary_profile',
  hint: 'diary_hint_enc',
  posts: 'diary_posts',
  visitors: 'diary_visitors',
  calendar: 'diary_calendar',
  photo: 'diary_photo',
  votes: 'diary_votes',
  dotoriMissions: 'diary_dotori_missions',
  comments: 'diary_comments',
  nominations: 'diary_nominations',
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
  hint: HintData,
): StoredProfile {
  const existing = getProfile();
  if (existing && existing.zaloId === zaloId) return existing;

  const surname = realName.split(/\s+/)[0] ?? realName;
  const profile: StoredProfile = {
    id: `user-${zaloId}`,
    zaloId,
    realName,
    surname,
    schoolName,
    className,
    classId: `${schoolName}-${className}`,
    statusMessage: '오늘 나랑 눈 마주치고 웃은 애...',
    dotoriBalance: 5,
    visitCountToday: 24,
    visitCountTotal: 1204,
    hintEncrypted: encryptHintData(hint),
  };

  write(KEYS.profile, profile);
  write(KEYS.hint, profile.hintEncrypted);
  write(KEYS.posts, DEFAULT_POSTS);
  write(KEYS.visitors, DEFAULT_VISITORS);
  write(KEYS.calendar, [
    { date: todayStr(), content: '오늘개빡침' },
    { date: offsetDate(-1), content: '걔랑눈맞춤' },
  ] satisfies CalendarEntry[]);
  write(KEYS.photo, { imageUrl: '', caption: '우리단짝단짝' } satisfies PhotoAlbum);
  write(KEYS.votes, [] satisfies VoteRecord[]);
  write(KEYS.comments, [] satisfies Comment[]);
  write(KEYS.nominations, [] satisfies Nomination[]);
  write(KEYS.dotoriMissions, { shopee: false, tiktok: false, video: 0 });

  return profile;
}

export function getProfile(): StoredProfile | null {
  return read<StoredProfile | null>(KEYS.profile, null);
}

export function updateProfile(patch: Partial<UserProfile>): StoredProfile | null {
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

export function getPhotoAlbum(): PhotoAlbum {
  return read(KEYS.photo, { imageUrl: '', caption: '' });
}

export function savePhotoCaption(caption: string): void {
  const album = getPhotoAlbum();
  write(KEYS.photo, { ...album, caption });
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

export function getClassmates(): UserProfile[] {
  return CLASSMATES;
}

export function getClassmateById(id: string): UserProfile | undefined {
  return CLASSMATES.find((c) => c.id === id);
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

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
