import { describe, expect, it } from 'vitest';
import { isPresentInMap, normalizePresenceState } from '../normalize-presence-state';
import type { CirclePresencePayload } from '../circle-presence.types';
import { assertCircleTopic, circleTopic, parseCircleTopic } from '../topic';

describe('circle topic', () => {
  const id = '50a7b2c3-d4e5-4f67-8901-234567890abc';

  it('builds and parses canonical topics', () => {
    expect(circleTopic(id)).toBe(`circle:${id}`);
    expect(parseCircleTopic(`circle:${id}`)).toBe(id);
    expect(assertCircleTopic(`circle:${id}`)).toBe(id);
  });

  it('rejects tampered topics', () => {
    expect(parseCircleTopic('circle:')).toBeNull();
    expect(parseCircleTopic('circle:not-a-uuid')).toBeNull();
    expect(parseCircleTopic(`circle:${id}:extra`)).toBeNull();
    expect(parseCircleTopic(`user:${id}`)).toBeNull();
    expect(parseCircleTopic('circle-general')).toBeNull();
    expect(parseCircleTopic('online-users')).toBeNull();
    expect(() => assertCircleTopic('circle:nope')).toThrow();
  });
});

describe('normalizePresenceState', () => {
  it('counts multiple sessions for one user as one present badge', () => {
    const sessions: CirclePresencePayload[] = [
      {
        userId: 'a',
        circleId: 'c',
        activePostId: null,
        state: 'present',
        sessionId: '1',
      },
      {
        userId: 'a',
        circleId: 'c',
        activePostId: null,
        state: 'present',
        sessionId: '2',
      },
      {
        userId: 'b',
        circleId: 'c',
        activePostId: null,
        state: 'present',
        sessionId: '3',
      },
    ];
    const map = normalizePresenceState(sessions);
    expect(map.a.sessionCount).toBe(2);
    expect(map.b.sessionCount).toBe(1);
    expect(isPresentInMap(map, 'a')).toBe(true);
    expect(isPresentInMap(map, 'z')).toBe(false);
  });

  it('any responded session wins for multi-device (orange priority)', () => {
    const map = normalizePresenceState([
      {
        userId: 'a',
        circleId: 'c',
        activePostId: 'post-1',
        state: 'present',
        sessionId: 'phone',
      },
      {
        userId: 'a',
        circleId: 'c',
        activePostId: 'post-1',
        state: 'responded',
        sessionId: 'tablet',
      },
    ]);
    expect(map.a.state).toBe('responded');
    expect(map.a.activePostId).toBe('post-1');
    expect(map.a.sessionCount).toBe(2);
  });

  it('normalizes Realtime presenceState shape', () => {
    const raw = {
      'sess-1': [
        {
          userId: 'u1',
          circleId: 'c',
          activePostId: null,
          state: 'present' as const,
          sessionId: 'sess-1',
        },
      ],
      'sess-2': [
        {
          userId: 'u1',
          circleId: 'c',
          activePostId: null,
          state: 'present' as const,
          sessionId: 'sess-2',
        },
      ],
    };
    const map = normalizePresenceState(raw);
    expect(map.u1.sessionCount).toBe(2);
  });
});
