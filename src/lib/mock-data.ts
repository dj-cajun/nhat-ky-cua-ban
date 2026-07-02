import type { CalendarEntry, FeedPost, UserProfile, Visitor } from '@/types';
import { DEFAULT_STATUS_MESSAGE } from '@/config/app-content';

export const mockCurrentUser: UserProfile = {
  id: 'user-1',
  realName: 'Nguyễn Minh Anh',
  surname: 'Nguyễn',
  schoolName: 'Marie Curie',
  className: 'Lớp 11A',
  statusMessage: DEFAULT_STATUS_MESSAGE,
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
  statusMessage: 'Tan học chạy xe về',
  dotoriBalance: 3,
  visitCountToday: 12,
  visitCountTotal: 456,
};

export const mockVisitors: Visitor[] = [
  { id: 'user-2', surname: 'Nguyễn', visitedAt: new Date().toISOString() },
  { id: 'user-3', surname: 'Trần', visitedAt: new Date().toISOString() },
];

export const mockCalendarEntries: CalendarEntry[] = [
  { date: '2026-07-01', content: 'Nhìnnhau' },
  { date: '2026-07-02', content: 'Bựcmình' },
];

export const mockPosts: Record<string, FeedPost[]> = {
  diary: [
    {
      id: 'd1',
      authorId: 'user-1',
      boardType: 'diary',
      content: 'Thitrượt huhu',
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
        'Hôm nay ai hút thuốc sau căng tin tầng 2 gặp thầy hiệu trưởng vậy =)))',
      hasPhoto: true,
      hasVideo: false,
      hasLink: true,
      createdAt: '2026-07-02T10:30:00Z',
    },
    {
      id: 's2',
      authorId: 'user-2',
      boardType: 'school',
      content: 'Ngày mai hội thao sẵn sàng chưa?',
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
      content: 'Bỏ phiếu hôm nay: Ai nổi bật nhất?',
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
      content: 'Nhật ký đẹp quá kk',
      hasPhoto: false,
      hasVideo: false,
      hasLink: false,
      createdAt: '2026-07-01T20:00:00Z',
    },
  ],
};
