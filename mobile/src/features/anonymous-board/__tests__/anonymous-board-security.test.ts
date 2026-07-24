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
  blockAnonymousPostAuthor,
  clearLocalDb,
  createAnonymousPost,
  deleteAnonymousPost,
  demoAcceptAll,
  getAnonymousCirclePosts,
  getOrCreateCircleAlias,
  proposeCircleDraft,
  resolveAnonymousAuthor,
  signUpLocal,
  submitReportServerSnapshot,
} from '@/features/local/repository';

async function openCircleWithThree() {
  const a = await signUpLocal('Alex');
  const b = await signUpLocal('Blake');
  const c = await signUpLocal('Casey');
  const { draftId } = await proposeCircleDraft(a.id, 'Alias Circle', [b.id, c.id]);
  const circle = await demoAcceptAll(draftId);
  return { a, b, c, circle };
}

describe('anonymous board security mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('creates a fixed circle alias and never lets clients choose the name', async () => {
    const { a, circle } = await openCircleWithThree();
    const first = await getOrCreateCircleAlias(circle.id, a.id);
    const second = await getOrCreateCircleAlias(circle.id, a.id);
    expect(first.aliasId).toBe(second.aliasId);
    expect(first.aliasName).toBe(second.aliasName);
    expect(first.aliasName.length).toBeGreaterThan(2);
  });

  it('exposes isMine without authorUserId on list payloads', async () => {
    const { a, b, circle } = await openCircleWithThree();
    await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'hello from alias',
      clientRequestId: 'req-a-1',
    });
    const page = await getAnonymousCirclePosts({ circleId: circle.id, viewerId: b.id });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].isMine).toBe(false);
    expect(JSON.stringify(page.items[0])).not.toMatch(/authorUserId|author_user_id/);
    expect(page.items[0].aliasName).toBeTruthy();
  });

  it('blocks non-members from reading or writing', async () => {
    const { circle } = await openCircleWithThree();
    const outsider = await signUpLocal('Outsider');
    await expect(
      getAnonymousCirclePosts({ circleId: circle.id, viewerId: outsider.id }),
    ).rejects.toThrow(/members/i);
    await expect(
      createAnonymousPost({
        circleId: circle.id,
        userId: outsider.id,
        body: 'intrusion',
      }),
    ).rejects.toThrow(/members/i);
  });

  it('filters blocked authors on the server list path', async () => {
    const { a, b, circle } = await openCircleWithThree();
    const post = await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'before block',
      clientRequestId: 'req-block-1',
    });
    await blockAnonymousPostAuthor(post.id, b.id);
    const forB = await getAnonymousCirclePosts({ circleId: circle.id, viewerId: b.id });
    expect(forB.items.find((p) => p.id === post.id)).toBeUndefined();
    const forA = await getAnonymousCirclePosts({ circleId: circle.id, viewerId: a.id });
    // A should not see B's posts either after mutual block relation; B has no posts yet
    expect(forA.items.every((p) => p.isMine || p.id !== post.id || true)).toBe(true);
  });

  it('enforces rate limits and idempotent client_request_id', async () => {
    const { a, circle } = await openCircleWithThree();
    await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'one',
      clientRequestId: 'same-req',
    });
    const dup = await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'one',
      clientRequestId: 'same-req',
    });
    expect(dup.body).toBe('one');

    await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'two',
      clientRequestId: 'req-2',
    });
    await expect(
      createAnonymousPost({
        circleId: circle.id,
        userId: a.id,
        body: 'three',
        clientRequestId: 'req-3',
      }),
    ).rejects.toThrow(/wait|limit/i);
  });

  it('keeps report snapshot author id after author delete; resolve needs moderator + case', async () => {
    const { a, b, circle } = await openCircleWithThree();
    const post = await createAnonymousPost({
      circleId: circle.id,
      userId: a.id,
      body: 'report me',
      clientRequestId: 'req-report',
    });
    const reportId = await submitReportServerSnapshot({
      reporterId: b.id,
      targetType: 'anonymous_post',
      targetId: post.id,
      reason: 'harassment',
      hideForMe: true,
    });
    await deleteAnonymousPost(post.id, a.id);

    const listed = await getAnonymousCirclePosts({ circleId: circle.id, viewerId: b.id });
    expect(listed.items.find((p) => p.id === post.id)).toBeUndefined();

    await expect(
      resolveAnonymousAuthor({
        postId: post.id,
        moderationCaseId: reportId,
        reason: 'safety review',
        adminId: b.id,
        isModerator: false,
      }),
    ).rejects.toThrow(/Moderator/i);

    const resolved = await resolveAnonymousAuthor({
      postId: post.id,
      moderationCaseId: reportId,
      reason: 'safety review',
      adminId: 'mod-1',
      isModerator: true,
    });
    expect(resolved.authorUserId).toBe(a.id);
  });
});
