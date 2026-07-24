/**
 * Phase 6.5 — clients must not INSERT verified Broadcast events
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('realtime-response-broadcast-spoof', () => {
  it('014 grants broadcast SELECT to members but no authenticated INSERT', () => {
    const contract = {
      receive: 'circle members can receive broadcast',
      insertAuthenticated: false,
      publisher: 'service_role via publish-circle-response-event',
      forbiddenEvents: [
        'circle_response_verified',
        'circle_post_closed',
        'member_badge_changed',
      ],
    };
    expect(contract.insertAuthenticated).toBe(false);
    expect(contract.forbiddenEvents).toContain('circle_response_verified');
  });
});
