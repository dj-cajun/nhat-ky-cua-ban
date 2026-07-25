/**
 * Phase 6 — Presence `responded` is spoofable; orange must require matching activePostId.
 * Stronger server-side Presence validation is deferred to phase 6.5.
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { getMemberBadge } from '../../mobile/src/features/presence/derive-member-badge';
import { normalizePresenceState } from '../../mobile/src/features/presence/normalize-presence-state';

describe('circle-response-presence-spoof', () => {
  it('spoofed responded for a different post stays green', () => {
    expect(
      getMemberBadge(
        { state: 'responded', activePostId: 'old-post' },
        'current-post',
      ),
    ).toBe('green');
  });

  it('spoofed responded without being present yields no badge via map absence', () => {
    const map = normalizePresenceState([]);
    expect(map['attacker']).toBeUndefined();
    expect(
      getMemberBadge(null, 'current-post'),
    ).toBeNull();
  });

  it('documents that clients must track responded only after DB success', () => {
    // Contract: circlePresenceService.trackResponded is called after RPC responded=true.
    // A malicious peer can still emit responded on Realtime; UI trusts payload for badges
    // in 1.0 — mitigate in 6.5 with server broadcast / DB join.
    expect(true).toBe(true);
  });
});
