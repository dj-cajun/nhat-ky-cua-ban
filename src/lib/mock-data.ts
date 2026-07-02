import type { UserProfile } from '@/types';
import { DEFAULT_STATUS_MESSAGE } from '@/config/app-content';

export const mockCurrentUser: UserProfile = {
  id: 'user-1',
  realName: 'Nguyễn Minh Anh',
  surname: 'Nguyễn',
  schoolName: 'THPT Marie Curie',
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
  schoolName: 'THPT Marie Curie',
  className: 'Lớp 11A',
  statusMessage: 'Tan học chạy xe về nè',
  dotoriBalance: 3,
  visitCountToday: 12,
  visitCountTotal: 456,
};
