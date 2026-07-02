import type { BoardType, FeedPost, UserProfile, Visitor } from '@/types';
import {
  CLASSMATES_SEED,
  VOTE_QUESTIONS,
  LOGGED_IN_ZALO_USER,
  SEED_SCHOOL_POSTS,
  SEED_DIARY_POSTS,
  SEED_GUESTBOOK_POSTS,
  SEED_VOTE_POSTS,
  SEED_VISITORS,
  REGION,
} from '@/config/app-content';

export { VOTE_QUESTIONS };

const schoolName = REGION.defaultSchool;
const className = REGION.defaultClass;

export const CLASSMATES: UserProfile[] = CLASSMATES_SEED.map((c, i) => ({
  id: c.id,
  realName: c.realName,
  surname: c.surname,
  schoolName,
  className,
  statusMessage: c.statusMessage,
  dotoriBalance: (i % 5) + 1,
  visitCountToday: 5 + (i % 15),
  visitCountTotal: 100 + i * 80,
}));

export const DEFAULT_VISITORS: Visitor[] = SEED_VISITORS.map((v) => ({
  id: v.id,
  surname: v.surname,
  visitedAt: new Date().toISOString(),
}));

function toFeedPost(
  p: {
    authorId: string;
    content: string;
    hasPhoto?: boolean;
    hasVideo?: boolean;
    hasLink?: boolean;
    targetUserId?: string;
  },
  boardType: BoardType,
  id: string,
): FeedPost {
  return {
    id,
    authorId: p.authorId,
    boardType,
    content: p.content,
    hasPhoto: p.hasPhoto ?? false,
    hasVideo: p.hasVideo ?? false,
    hasLink: p.hasLink ?? false,
    targetUserId: p.targetUserId,
    createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  };
}

export const DEFAULT_POSTS: Record<BoardType, FeedPost[]> = {
  diary: SEED_DIARY_POSTS.map((p, i) => toFeedPost(p, 'diary', `d${i + 1}`)),
  school: SEED_SCHOOL_POSTS.map((p, i) => toFeedPost(p, 'school', `s${i + 1}`)),
  vote: SEED_VOTE_POSTS.map((p, i) =>
    toFeedPost({ ...p, hasPhoto: false, hasVideo: false, hasLink: false }, 'vote', `v${i + 1}`),
  ),
  guestbook: SEED_GUESTBOOK_POSTS.map((p, i) =>
    toFeedPost({ ...p, hasPhoto: false, hasVideo: false, hasLink: false }, 'guestbook', `g${i + 1}`),
  ),
};

export const DEFAULT_USER_ID = LOGGED_IN_ZALO_USER.id;
