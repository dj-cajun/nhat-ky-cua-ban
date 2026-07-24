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
    expect(() => assertCircleTopic('circle:nope')).toThrow();
  });
});

describe('normalizePresenceState', () => {
  it('counts multiple sessions for one user', () => {
    const sessions: CirclePresencePayload[] = [
      { userId: 'a', circleId: 'c', state: 'present', sessionId: '1' },
      { userId: 'a', circleId: 'c', state: 'present', sessionId: '2' },
      { userId: 'b', circleId: 'c', state: 'present', sessionId: '3' },
    ];
    const map = normalizePresenceState(sessions);
    expect(map.a.sessionCount).toBe(2);
    expect(map.b.sessionCount).toBe(1);
    expect(isPresentInMap(map, 'a')).toBe(true);
  });

  it('ignores spoofed responded payloads (phase 6.5)', () => {
    const uid = '50a7b2c3-d4e5-4f67-8901-234567890abc';
    const raw = {
      [`${uid}:sess`]: [
        {
          userId: uid,
          circleId: 'c',
          state: 'responded',
          activePostId: 'post-1',
          sessionId: `${uid}:sess`,
        },
      ],
    };
    const map = normalizePresenceState(raw as Record<string, CirclePresencePayload[]>);
    expect(map[uid].sessionCount).toBe(1);
    expect(Object.keys(map[uid])).not.toContain('state');
  });

  it('drops payload.userId that disagrees with presence key', () => {
    const real = '50a7b2c3-d4e5-4f67-8901-234567890abc';
    const victim = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const raw = {
      [`${real}:sess`]: [
        {
          userId: victim,
          circleId: 'c',
          state: 'present' as const,
          sessionId: `${real}:sess`,
        },
      ],
    };
    const map = normalizePresenceState(raw);
    expect(map[victim]).toBeUndefined();
    expect(map[real]).toBeUndefined();
  });
});
