import { describe, expect, it } from 'vitest';
import {
  filterBlockedUserIds,
  filterPresenceMap,
  toPublicReportStatus,
} from '../blocked-user-filter';

describe('blocked-user-filter', () => {
  it('filters presence map and id lists', () => {
    const map = filterPresenceMap(
      {
        a: { sessionCount: 1 },
        b: { sessionCount: 2 },
      },
      ['b'],
    );
    expect(map.a).toBeTruthy();
    expect(map.b).toBeUndefined();
    expect(filterBlockedUserIds(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
  });

  it('maps internal statuses to public wording', () => {
    expect(toPublicReportStatus('submitted')).toBe('received');
    expect(toPublicReportStatus('dismissed')).toBe('closed');
    expect(toPublicReportStatus('resolved')).toBe('closed');
  });
});
