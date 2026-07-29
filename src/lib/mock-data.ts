import type { UserProfile } from '@/types';
import { DEFAULT_STATUS_MESSAGE, REGION } from '@/config/app-content';

export const mockCurrentUser: UserProfile = {
  id: 'demo-user-maya',
  realName: 'Maya',
  surname: 'Maya',
  schoolName: REGION.defaultSchool,
  className: REGION.defaultClass,
  statusMessage: DEFAULT_STATUS_MESSAGE,
  dotoriBalance: 5,
  visitCountToday: 3,
  visitCountTotal: 42,
};

export const mockStrangerUser: UserProfile = {
  id: 'cm-01',
  realName: 'Sam',
  surname: 'Sam',
  schoolName: REGION.defaultSchool,
  className: REGION.defaultClass,
  statusMessage: 'Heading home after work',
  dotoriBalance: 3,
  visitCountToday: 2,
  visitCountTotal: 18,
};
