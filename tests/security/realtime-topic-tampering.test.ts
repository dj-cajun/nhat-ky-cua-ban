/**
 * Phase 5 security — topic tampering (CI, no live Realtime required)
 */
import { describe, expect, it } from 'vitest';

const CIRCLE_TOPIC_RE =
  /^circle:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function parseCircleTopic(topic: string): string | null {
  if (!CIRCLE_TOPIC_RE.test(topic)) return null;
  return topic.slice('circle:'.length) || null;
}

describe('realtime-topic-tampering', () => {
  const good = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('only accepts circle:{uuid}', () => {
    expect(parseCircleTopic(`circle:${good}`)).toBe(good);
  });

  it('rejects forged topics', () => {
    const bad = [
      'circle:',
      'circle:not-a-uuid',
      `circle:${good}:extra`,
      `user:${good}`,
      'circle-general',
      'online-users',
      'global-presence',
      `CIRCLE:${good}`,
    ];
    for (const t of bad) {
      expect(parseCircleTopic(t)).toBeNull();
    }
  });
});
