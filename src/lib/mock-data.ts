import type { CalendarEntry, FeedPost, UserProfile, Visitor } from '@/types';

export const mockCurrentUser: UserProfile = {
  id: 'user-1',
  realName: 'Nguyễn Minh Anh',
  surname: 'Nguyễn',
  schoolName: 'Marie Curie',
  className: 'Lớp 11A',
  statusMessage: '오늘 나랑 눈 마주치고 웃은 애...',
  dotoriBalance: 5,
  visitCountToday: 24,
  visitCountTotal: 1204,
};

export const mockStrangerUser: UserProfile = {
  id: 'user-2',
  realName: 'Trần Văn Bình',
  surname: 'Trần',
  schoolName: 'Marie Curie',
  className: 'Lớp 11A',
  statusMessage: '방과후 스쿠터 타고 감',
  dotoriBalance: 3,
  visitCountToday: 12,
  visitCountTotal: 456,
};

export const mockVisitors: Visitor[] = [
  { id: 'user-2', surname: 'Nguyễn', visitedAt: new Date().toISOString() },
  { id: 'user-3', surname: 'Trần', visitedAt: new Date().toISOString() },
];

export const mockCalendarEntries: CalendarEntry[] = [
  { date: '2026-07-01', content: '걔랑눈맞춤' },
  { date: '2026-07-02', content: '오늘개빡침' },
];

export const mockPosts: Record<string, FeedPost[]> = {
  diary: [
    {
      id: 'd1',
      authorId: 'user-1',
      boardType: 'diary',
      content: '수학시험 망함 ㅠㅠ',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: '2026-07-02T08:00:00Z',
    },
  ],
  school: [
    {
      id: 's1',
      authorId: 'user-3',
      boardType: 'school',
      content:
        '오늘 2층 매점 뒤에서 담배 피우다 교장 선생님이랑 마주친 새끼 누구냐 진짜 개웃기네',
      hasPhoto: true,
      hasVideo: false,
      hasLink: true,
      createdAt: '2026-07-02T10:30:00Z',
    },
    {
      id: 's2',
      authorId: 'user-2',
      boardType: 'school',
      content: '내일 체육대회 준비 다 했나?',
      hasPhoto: false,
      hasVideo: true,
      hasLink: false,
      createdAt: '2026-07-02T09:15:00Z',
    },
  ],
  vote: [
    {
      id: 'v1',
      authorId: 'user-1',
      boardType: 'vote',
      content: '오늘 투표: 가장 인싸인 사람은?',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: '2026-07-02T17:00:00Z',
    },
  ],
  guestbook: [
    {
      id: 'g1',
      authorId: 'user-4',
      boardType: 'guestbook',
      content: '다이어리 잘 꾸몄네 ㅋㅋ',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: '2026-07-01T20:00:00Z',
    },
  ],
};
