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
  clearLocalDb,
  createJoinRequest,
  createCirclePost,
  decideRecommendation,
  demoAcceptAll,
  getPollSummary,
  hasResponded,
  isBlockedBetween,
  listPollOptions,
  openCircleFromDraft,
  proposeCircleDraft,
  respondDraftInvite,
  respondToPost,
  blockUser,
  canViewDiary,
  signUpLocal,
  submitReport,
  upsertDiary,
} from '@/features/local/repository';

describe('open_circle_from_draft rules', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('does not open until both invitees accept', async () => {
    const me = await signUpLocal('Alex');
    const { draftId } = await proposeCircleDraft(me.id, 'Study group', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);

    expect(
      await respondDraftInvite(draftId, '00000000-0000-4000-8000-0000000000a1', true),
    ).toBeNull();

    const opened = await respondDraftInvite(
      draftId,
      '00000000-0000-4000-8000-0000000000b2',
      true,
    );
    expect(opened?.status).toBe('open');
  });

  it('cancels when one declines', async () => {
    const me = await signUpLocal('Alex');
    const { draftId } = await proposeCircleDraft(me.id, 'Failed attempt', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    expect(
      await respondDraftInvite(draftId, '00000000-0000-4000-8000-0000000000a1', false),
    ).toBeNull();
    await expect(openCircleFromDraft(draftId, me.id)).rejects.toThrow();
  });

  it('demoAcceptAll opens with 3 pioneers', async () => {
    const me = await signUpLocal('Alex');
    const { draftId } = await proposeCircleDraft(me.id, 'Demo circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    expect(circle.status).toBe('open');
  });
});

describe('join recommendations', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('approves only after 3 recommendations', async () => {
    const me = await signUpLocal('Pioneer');
    const { draftId } = await proposeCircleDraft(me.id, 'Circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    const applicant = '00000000-0000-4000-8000-0000000000c3';
    const req = await createJoinRequest(circle.id, applicant, [
      me.id,
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);

    expect(await decideRecommendation(req.id, me.id, 'recommended')).toMatchObject({
      status: 'pending',
    });
    expect(
      await decideRecommendation(req.id, '00000000-0000-4000-8000-0000000000a1', 'recommended'),
    ).toMatchObject({ status: 'pending' });
    const done = await decideRecommendation(
      req.id,
      '00000000-0000-4000-8000-0000000000b2',
      'recommended',
    );
    expect(done?.status).toBe('approved');
  });
});

describe('diary privacy', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('blocks private diary from others', async () => {
    const me = await signUpLocal('Alex');
    const entry = await upsertDiary({
      userId: me.id,
      tenCharText: 'Quiet day',
      visibilityMode: 'private',
    });
    expect(await canViewDiary('other', me.id, entry)).toBe(false);
    expect(await canViewDiary(me.id, me.id, entry)).toBe(true);
  });

  it('hides diary when either user blocked the other', async () => {
    const me = await signUpLocal('Alex');
    const other = '00000000-0000-4000-8000-0000000000a1';
    const entry = await upsertDiary({
      userId: me.id,
      tenCharText: 'Shared',
      visibilityMode: 'all_circles',
    });
    await blockUser(me.id, other);
    expect(await isBlockedBetween(me.id, other)).toBe(true);
    expect(await canViewDiary(other, me.id, entry)).toBe(false);
  });
});

describe('notices and polls', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  async function openDemoCircle() {
    const me = await signUpLocal('Alex');
    const { draftId } = await proposeCircleDraft(me.id, 'Notice circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    return { me, circle };
  }

  it('allows only one active post per circle', async () => {
    const { me, circle } = await openDemoCircle();
    const closesAt = new Date(Date.now() + 60_000).toISOString();
    await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'notice',
      title: 'Bring snacks',
      closesAt,
    });
    await expect(
      createCirclePost({
        circleId: circle.id,
        createdBy: me.id,
        type: 'poll',
        title: 'Second item',
        closesAt,
        options: ['Yes', 'No'],
      }),
    ).rejects.toThrow(/already has an active/);
  });

  it('returns poll totals without revealing who voted what', async () => {
    const { me, circle } = await openDemoCircle();
    const closesAt = new Date(Date.now() + 60_000).toISOString();
    const post = await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'poll',
      title: 'Friday hang?',
      closesAt,
      options: ['Yes', 'No'],
    });
    const options = await listPollOptions(post.id);
    await respondToPost({ postId: post.id, userId: me.id, optionId: options[0].id });
    expect(await hasResponded(post.id, me.id)).toBe(true);

    const summary = await getPollSummary(post.id, me.id);
    expect(summary.totalResponded).toBe(1);
    expect(summary.options.map((o) => o.count).sort()).toEqual([0, 1]);
    expect(JSON.stringify(summary)).not.toContain(me.id);
  });
});

describe('reports', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('stores a content snapshot with the report', async () => {
    const me = await signUpLocal('Alex');
    const report = await submitReport({
      reporterId: me.id,
      targetType: 'diary',
      targetId: '00000000-0000-4000-8000-0000000000a1',
      reason: 'harassment',
      contentSnapshot: '{"tenCharText":"bad note"}',
    });
    expect(report.contentSnapshot).toContain('bad note');
    expect(report.status).toBe('open');
  });
});