import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
  },
}));

import {
  acknowledgeCircleNotice,
  clearLocalDb,
  createCirclePost,
  demoAcceptAll,
  getActivePostBadgeStates,
  proposeCircleDraft,
  signUpLocal,
} from '@/features/local/repository';
import { deriveMemberBadge } from '@/features/presence/derive-member-badge';
import { useVerifiedResponseStore } from '@/features/presence/verified-response.store';

describe('badge-state domain mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
    useVerifiedResponseStore.getState().clear();
  });

  it('syncs verified badges from RPC; non-member forbidden', async () => {
    const me = await signUpLocal('Alex');
    const stranger = await signUpLocal('Stranger');
    const { draftId } = await proposeCircleDraft(me.id, 'Badge circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    const post = await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'notice',
      title: 'Hello',
      closesAt: new Date(Date.now() + 11 * 60_000).toISOString(),
    });
    await acknowledgeCircleNotice({ postId: post.id, userId: me.id });

    await expect(getActivePostBadgeStates(circle.id, stranger.id)).rejects.toThrow(
      /Only members/,
    );

    const states = await getActivePostBadgeStates(circle.id, me.id);
    expect(states.respondedUserIds).toContain(me.id);
    expect(JSON.stringify(states)).not.toMatch(/option|respondedAt/i);

    useVerifiedResponseStore.getState().resetForCircle(circle.id, states.postId);
    useVerifiedResponseStore.getState().hydrateFromRpc(states);

    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: post.id,
        verifiedResponse: useVerifiedResponseStore.getState().map[me.id],
      }),
    ).toBe('orange');

    // Spoof presence alone stays green without verified map entry for other user
    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: post.id,
        verifiedResponse: null,
      }),
    ).toBe('green');
  });
});
