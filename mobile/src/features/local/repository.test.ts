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
  DEMO_JOIN_IDS,
  ensureDemoOpenCircle,
  ensureDemoJoinApplicant,
  getJoinProgress,
  getCirclePostSummary,
  hasResponded,
  isBlockedBetween,
  isCircleMember,
  listCircleMembers,
  listPollOptions,
  openCircleFromDraft,
  proposeCircleDraft,
  respondCirclePoll,
  respondDraftInvite,
  respondToPost,
  blockUser,
  canViewDiary,
  signUpLocal,
  submitReport,
  addGuestbookEntry,
  addFreeBoardPost,
  listFreeBoard,
  listGuestbook,
  listHompyCircleBoardPreview,
  isContentHiddenForMe,
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

  it('ensureDemoOpenCircle seeds a circle for intro → planets', async () => {
    const me = await signUpLocal('Alex');
    const first = await ensureDemoOpenCircle(me.id);
    expect(first.length).toBeGreaterThanOrEqual(1);
    const again = await ensureDemoOpenCircle(me.id);
    expect(again.map((c) => c.id)).toEqual(first.map((c) => c.id));
  });
});

describe('join recommendations', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  async function openDemoCircle() {
    const me = await signUpLocal('Pioneer');
    const { draftId } = await proposeCircleDraft(me.id, 'Circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    return { me, circle };
  }

  it('approves only after 3 recommendations', async () => {
    const { me, circle } = await openDemoCircle();
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

  it('does not approve with only 2 recommendations', async () => {
    const { me, circle } = await openDemoCircle();
    const applicant = DEMO_JOIN_IDS.yujin;
    await ensureDemoJoinApplicant();
    const req = await createJoinRequest(circle.id, applicant, [
      me.id,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, me.id, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.minseo, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.junho, 'unknown');
    const prog = await getJoinProgress(req.id, applicant);
    expect(prog.recommended).toBe(2);
    expect(prog.status).toBe('pending');
    expect(await isCircleMember(circle.id, applicant)).toBe(false);
  });

  it('rejects duplicate recommenders and self', async () => {
    const { me, circle } = await openDemoCircle();
    await expect(
      createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [me.id, me.id, DEMO_JOIN_IDS.minseo]),
    ).rejects.toThrow(/different/);
    await expect(
      createJoinRequest(circle.id, me.id, [
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
        DEMO_JOIN_IDS.seoyeon,
      ]),
    ).rejects.toThrow(/already a member/);
  });

  it('rejects non-member recommenders', async () => {
    const { me, circle } = await openDemoCircle();
    await ensureDemoJoinApplicant();
    await expect(
      createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [
        me.id,
        DEMO_JOIN_IDS.minseo,
        '00000000-0000-4000-8000-0000000000d4',
      ]),
    ).rejects.toThrow(/members/);
  });

  it('hides recommender decisions from applicant progress', async () => {
    const { me, circle } = await openDemoCircle();
    await ensureDemoJoinApplicant();
    const req = await createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [
      me.id,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, DEMO_JOIN_IDS.minseo, 'unknown');
    const prog = await getJoinProgress(req.id, DEMO_JOIN_IDS.yujin);
    expect(JSON.stringify(prog)).not.toContain(DEMO_JOIN_IDS.minseo);
    expect(prog.recommended).toBe(0);
  });

  it('blocks non-members from listing circle members', async () => {
    const { circle } = await openDemoCircle();
    await ensureDemoJoinApplicant();
    await expect(listCircleMembers(circle.id, DEMO_JOIN_IDS.yujin)).rejects.toThrow(/Only members/);
  });

  it('allows access after approval', async () => {
    const { me, circle } = await openDemoCircle();
    await ensureDemoJoinApplicant();
    // Need Seoyeon in circle — open with minseo+junho then add seoyeon via join... 
    // Circle already has pioneer + minseo + junho. Use those three.
    const req = await createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [
      me.id,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, me.id, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.minseo, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.junho, 'recommended');
    expect(await isCircleMember(circle.id, DEMO_JOIN_IDS.yujin)).toBe(true);
    const members = await listCircleMembers(circle.id, DEMO_JOIN_IDS.yujin);
    expect(members.some((m) => m.userId === DEMO_JOIN_IDS.yujin)).toBe(true);
  });

  it('does not allow double response', async () => {
    const { me, circle } = await openDemoCircle();
    await ensureDemoJoinApplicant();
    const req = await createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [
      me.id,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, me.id, 'recommended');
    await expect(decideRecommendation(req.id, me.id, 'recommended')).rejects.toThrow(/already/);
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
    const closesAt = new Date(Date.now() + 11 * 60_000).toISOString();
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

  it('hides poll counts until the viewer responds, then hides voter ids', async () => {
    const { me, circle } = await openDemoCircle();
    const closesAt = new Date(Date.now() + 11 * 60_000).toISOString();
    const post = await createCirclePost({
      circleId: circle.id,
      createdBy: me.id,
      type: 'poll',
      title: 'Friday hang?',
      closesAt,
      options: ['Yes', 'No'],
    });
    const options = await listPollOptions(post.id);

    const before = await getCirclePostSummary(post.id, me.id);
    expect(before.currentUserResponded).toBe(false);
    expect(before.totalResponded).toBeNull();
    expect(before.options.every((o) => o.count === null)).toBe(true);

    await respondToPost({ postId: post.id, userId: me.id, optionId: options[0].id });
    expect(await hasResponded(post.id, me.id)).toBe(true);

    // Change vote before close
    await respondCirclePoll({ postId: post.id, userId: me.id, optionId: options[1].id });

    const summary = await getCirclePostSummary(post.id, me.id);
    expect(summary.totalResponded).toBe(1);
    expect(summary.currentUserOptionId).toBe(options[1].id);
    expect(summary.options.map((o) => o.count).sort()).toEqual([0, 1]);
    expect(JSON.stringify(summary)).not.toContain(me.id);
  });
});

describe('reports', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('stores a server-built content snapshot with the report', async () => {
    const me = await signUpLocal('Alex');
    const other = '00000000-0000-4000-8000-0000000000a1';
    const entry = await addGuestbookEntry({
      ownerUserId: other,
      authorUserId: other,
      body: 'bad note for review',
    });
    // Ensure target profile exists via demo directory after signup
    const report = await submitReport({
      reporterId: me.id,
      targetType: 'guestbook_entry',
      targetId: entry.id,
      reason: 'harassment',
      contentSnapshot: '{"forged":"should be ignored"}',
    });
    expect(report.contentSnapshot).toContain('bad note for review');
    expect(report.contentSnapshot).not.toContain('forged');
    expect(report.status).toBe('submitted');
    expect(await isContentHiddenForMe(me.id, 'guestbook_entry', entry.id)).toBe(true);
  });
});
describe('hompy boards', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('keeps free board on the homepage owner and lets the owner write', async () => {
    const me = await signUpLocal('Alex');
    const friend = '00000000-0000-4000-8000-0000000000a1';
    await addFreeBoardPost({
      ownerUserId: me.id,
      authorUserId: me.id,
      body: '주인 첫 글',
    });
    await addFreeBoardPost({
      ownerUserId: me.id,
      authorUserId: friend,
      body: '손님 댓글',
    });
    const mine = await listFreeBoard(me.id, me.id);
    expect(mine.map((p) => p.body).sort()).toEqual(['손님 댓글', '주인 첫 글'].sort());
    expect(mine.every((p) => p.ownerUserId === me.id)).toBe(true);
    const otherHome = await listFreeBoard(friend, me.id);
    expect(otherHome).toEqual([]);
  });

  it('shows circle board preview only when viewers share a circle', async () => {
    const me = await signUpLocal('Alex');
    await ensureDemoOpenCircle(me.id);
    const friend = '00000000-0000-4000-8000-0000000000a1';
    const outsider = await signUpLocal('Blake');

    const asMember = await listHompyCircleBoardPreview(me.id, friend, 3);
    expect(asMember.circle).not.toBeNull();
    expect(asMember.items.length).toBeGreaterThan(0);

    const asOutsider = await listHompyCircleBoardPreview(outsider.id, friend, 3);
    expect(asOutsider.circle).toBeNull();
    expect(asOutsider.items).toEqual([]);
  });

  it('lists guestbook newest-first on that homepage only', async () => {
    const me = await signUpLocal('Alex');
    await ensureDemoOpenCircle(me.id);
    const friend = '00000000-0000-4000-8000-0000000000a1';
    await addGuestbookEntry({
      ownerUserId: me.id,
      authorUserId: friend,
      body: '첫 방문',
    });
    const rows = await listGuestbook(me.id, me.id);
    expect(rows[0]?.body).toBe('첫 방문');
  });
});
