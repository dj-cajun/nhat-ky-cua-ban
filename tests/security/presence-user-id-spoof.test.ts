/**
 * Phase 6.5 — Presence userId spoof contract
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { normalizePresenceState } from '../../mobile/src/features/presence/normalize-presence-state';

describe('presence-user-id-spoof', () => {
  it('ignores metas whose userId disagrees with presence key prefix', () => {
    const attacker = '11111111-1111-4111-8111-111111111111';
    const victim = '22222222-2222-4222-8222-222222222222';
    const map = normalizePresenceState({
      [`${attacker}:device`]: [
        {
          userId: victim,
          circleId: 'c',
          state: 'present',
          sessionId: `${attacker}:device`,
        },
      ],
    });
    expect(map[victim]).toBeUndefined();
    expect(map[attacker]).toBeUndefined();
  });
});
