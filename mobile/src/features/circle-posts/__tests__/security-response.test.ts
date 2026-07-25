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
  getCirclePostSummary,
  listPollOptions,
  proposeCircleDraft,
  respondCirclePoll,
  signUpLocal,
} from '@/features/local/repository';

describe('circle-posts security mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  async function setup() {
    const me = await signUpLocal('Alex');
    const { draftId } = await proposeCircleDraft(me.id, 'Sec circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    const closesAt = new Date(Date.now() + 11 * 60_000).toISOString();
    return { me, circle, closesAt };
  }

  it('rejects poll RPC on notice and foreign option ids', async () => {
    const { me, circle, closesAt } = await setup();
    const notice = await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'notice',
      title: 'Quiet notice',
      closesAt,
    });
    await expect(
      respondCirclePoll({ postId: notice.id, userId: me.id, optionId: 'fake' }),
    ).rejects.toThrow(/Not a poll/);
    await acknowledgeCircleNotice({ postId: notice.id, userId: me.id });
  });

  it('summary never includes voter user ids', async () => {
    const { me, circle, closesAt } = await setup();
    const post = await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'poll',
      title: 'Friday?',
      closesAt,
      options: ['School', 'Cafe'],
    });
    const opts = await listPollOptions(post.id);
    await respondCirclePoll({ postId: post.id, userId: me.id, optionId: opts[0].id });
    const summary = await getCirclePostSummary(post.id, me.id);
    expect(JSON.stringify(summary)).not.toContain(me.id);
  });
});
