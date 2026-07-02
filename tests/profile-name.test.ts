import { describe, expect, it } from 'vitest';
import { LOGGED_IN_ZALO_USER } from '@/config/app-content';
import { getProfileDisplayName } from '@/lib/profile-name';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';
import type { UserProfile } from '@/types';

const baseProfile: UserProfile = {
  id: 'user-1',
  realName: 'User Name',
  surname: 'User',
  schoolName: 'THPT Marie Curie',
  className: 'Lớp 11A',
  statusMessage: 'hi',
  dotoriBalance: 0,
  visitCountToday: 0,
  visitCountTotal: 0,
};

describe('profile-name', () => {
  it('detects Zalo localhost placeholder', () => {
    expect(isPlaceholderZaloName('User Name')).toBe(true);
    expect(isPlaceholderZaloName('Nguyễn Minh Anh')).toBe(false);
  });

  it('falls back to demo name when profile has placeholder', () => {
    expect(getProfileDisplayName(baseProfile)).toBe(LOGGED_IN_ZALO_USER.name);
  });
});
