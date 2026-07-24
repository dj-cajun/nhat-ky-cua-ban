import { beforeEach, describe, expect, it } from 'vitest';
import { parseVerifiedBroadcastPayload } from '../verified-response.bus';
import { useVerifiedResponseStore } from '../verified-response.store';

describe('verified-response-sync', () => {
  beforeEach(() => {
    useVerifiedResponseStore.getState().clear();
  });

  it('hydrates from RPC and ignores stale post ids on broadcast', () => {
    const store = useVerifiedResponseStore.getState();
    store.resetForCircle('circle-1', 'post-1');
    store.hydrateFromRpc({
      postId: 'post-1',
      respondedUserIds: ['user-a'],
    });
    expect(useVerifiedResponseStore.getState().map['user-a']?.postId).toBe('post-1');

    store.applyVerified({
      type: 'circle_response_verified',
      circleId: 'circle-1',
      postId: 'post-old',
      userId: 'user-b',
      responded: true,
    });
    expect(useVerifiedResponseStore.getState().map['user-b']).toBeUndefined();

    store.applyVerified({
      type: 'circle_response_verified',
      circleId: 'circle-1',
      postId: 'post-1',
      userId: 'user-b',
      responded: true,
    });
    expect(useVerifiedResponseStore.getState().map['user-b']?.responded).toBe(true);
  });

  it('clears map on post closed', () => {
    const store = useVerifiedResponseStore.getState();
    store.resetForCircle('c', 'p1');
    store.hydrateFromRpc({ postId: 'p1', respondedUserIds: ['u1'] });
    store.applyClosed({ type: 'circle_post_closed', circleId: 'c', postId: 'p1' });
    expect(useVerifiedResponseStore.getState().map).toEqual({});
    expect(useVerifiedResponseStore.getState().activePostId).toBeNull();
  });

  it('strips forbidden fields from broadcast parse', () => {
    const parsed = parseVerifiedBroadcastPayload({
      type: 'circle_response_verified',
      circleId: 'c',
      postId: 'p',
      userId: 'u',
      responded: true,
      optionId: 'should-not-leak',
      respondedAt: '2020-01-01',
    });
    expect(parsed).toEqual({
      type: 'circle_response_verified',
      circleId: 'c',
      postId: 'p',
      userId: 'u',
      responded: true,
    });
    expect(JSON.stringify(parsed)).not.toContain('optionId');
  });
});
