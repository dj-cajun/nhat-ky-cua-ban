import type { BoardType, FeedPost, UserProfile, Visitor } from '@/types';
import {
  CLASSMATES_SEED,
  VOTE_QUESTIONS,
  LOGGED_IN_ZALO_USER,
  SEED_SCHOOL_POSTS,
} from '@/config/app-content';

export { VOTE_QUESTIONS };

export const CLASSMATES: UserProfile[] = CLASSMATES_SEED.map((c) => ({
  id: c.id,
  realName: c.realName,
  surname: c.surname,
  schoolName: 'Marie Curie',
  className: 'Lớp 11A',
  statusMessage: c.statusMessage,
  dotoriBalance: 3,
  visitCountToday: 10,
  visitCountTotal: 100,
}));

export const DEFAULT_VISITORS: Visitor[] = [
  { id: 'cm-1', surname: 'Nguyễn', visitedAt: new Date().toISOString() },
  { id: 'cm-2', surname: 'Trần', visitedAt: new Date().toISOString() },
];

export const DEFAULT_POSTS: Record<BoardType, FeedPost[]> = {
  diary: [
    {
      id: 'd1',
      authorId: `user-${LOGGED_IN_ZALO_USER.id}`,
      boardType: 'diary',
      content: '수학시험 망함 ㅠㅠ',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: new Date().toISOString(),
    },
  ],
  school: SEED_SCHOOL_POSTS.map((p, i) => ({
    id: `s${i + 1}`,
    authorId: p.authorId,
    boardType: 'school' as const,
    content: p.content,
    hasPhoto: p.hasPhoto,
    hasVideo: p.hasVideo,
    hasLink: p.hasLink,
    createdAt: new Date().toISOString(),
  })),
  vote: [
    {
      id: 'v1',
      authorId: 'cm-1',
      boardType: 'vote',
      content: `오늘 투표: ${VOTE_QUESTIONS[0]}`,
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: new Date().toISOString(),
    },
  ],
  guestbook: [
    {
      id: 'g1',
      authorId: 'cm-4',
      boardType: 'guestbook',
      content: '다이어리 잘 꾸몄네 ㅋㅋ',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: new Date().toISOString(),
    },
  ],
};
