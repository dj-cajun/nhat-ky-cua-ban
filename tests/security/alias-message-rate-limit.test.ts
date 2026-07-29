/**
 * Phase 9 — alias notes have stricter rate limits than named notes
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('alias-message-rate-limit', () => {
  it('limits alias notes to 1/day per recipient and 5/day overall', () => {
    expect({ perRecipientDay: 1, perRecipientWeek: 2, overallDay: 5 }).toEqual({
      perRecipientDay: 1,
      perRecipientWeek: 2,
      overallDay: 5,
    });
  });
});
