import { describe, expect, it } from 'vitest';
import { deriveMemberBadge } from '../derive-member-badge';
import { normalizePresenceState } from '../normalize-presence-state';

describe('presence-spoof', () => {
  it('spoofed responded Presence does not create orange without verified map', () => {
    const uid = '50a7b2c3-d4e5-4f67-8901-234567890abc';
    const map = normalizePresenceState({
      [`${uid}:x`]: [
        {
          userId: uid,
          circleId: 'c',
          state: 'responded',
          activePostId: 'post-1',
          sessionId: `${uid}:x`,
        } as never,
      ],
    });
    expect(map[uid].sessionCount).toBe(1);
    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: 'post-1',
        verifiedResponse: null,
      }),
    ).toBe('green');
  });
});
