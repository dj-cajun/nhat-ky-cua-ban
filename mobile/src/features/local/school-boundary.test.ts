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
  canAccessCircle,
  canViewDiary,
  canWriteCircle,
  clearLocalDb,
  createJoinRequest,
  createAnonymousPost,
  demoAcceptAll,
  DEMO_JOIN_IDS,
  ensureDemoJoinApplicant,
  getAnonymousCirclePosts,
  getCircleInvitePreview,
  getMySchoolMembership,
  grantAppModeratorForTests,
  opsReviewSchoolVerification,
  opsScanMixedSchoolCircles,
  proposeCircleDraft,
  setSchoolMembershipStatusForTests,
  signUpLocal,
  submitSchoolInviteCode,
  upsertDiary,
} from '@/features/local/repository';
import { BETA_SCHOOL_CODE, BETA_SCHOOL_ID, OTHER_SCHOOL_ID } from '@/features/local/school';

describe('school boundary local mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('invite code alone never verifies', async () => {
    const me = await signUpLocal('Alex');
    const res = await submitSchoolInviteCode(me.id, BETA_SCHOOL_CODE);
    expect(res.membershipStatus).toBe('pending');
    const m = await getMySchoolMembership(me.id);
    expect(m.status).toBe('pending');
  });

  it('ops approve moves pending → verified', async () => {
    const me = await signUpLocal('Alex');
    const ops = await signUpLocal('Ops');
    await grantAppModeratorForTests(ops.id);
    const { requestId } = await submitSchoolInviteCode(me.id, BETA_SCHOOL_CODE);
    await opsReviewSchoolVerification({
      actorId: ops.id,
      requestId,
      decision: 'approved',
    });
    expect((await getMySchoolMembership(me.id)).status).toBe('verified');
  });

  it('non-operator cannot review school verification', async () => {
    const me = await signUpLocal('Alex');
    const { requestId } = await submitSchoolInviteCode(me.id, BETA_SCHOOL_CODE);
    await expect(
      opsReviewSchoolVerification({
        actorId: me.id,
        requestId,
        decision: 'approved',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('mixed-school circle freezes writes until ops resolve', async () => {
    const me = await signUpLocal('Host');
    const ops = await signUpLocal('Ops');
    await grantAppModeratorForTests(ops.id);
    const { draftId } = await proposeCircleDraft(me.id, 'Beta circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    // Force a pioneer onto another school while remaining a circle member row
    await setSchoolMembershipStatusForTests({
      userId: '00000000-0000-4000-8000-0000000000a1',
      schoolId: OTHER_SCHOOL_ID,
      status: 'verified',
    });
    const scan = await opsScanMixedSchoolCircles(ops.id);
    expect(scan.opened).toBeGreaterThanOrEqual(1);
    expect(await canWriteCircle(circle.id, me.id)).toBe(false);
  });

  it('cross-school attacker denied with known circle/content ids', async () => {
    const me = await signUpLocal('Host');
    const { draftId } = await proposeCircleDraft(me.id, 'Beta circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);

    const attacker = await signUpLocal('Attacker');
    await setSchoolMembershipStatusForTests({
      userId: attacker.id,
      schoolId: OTHER_SCHOOL_ID,
      status: 'verified',
    });

    expect(await canAccessCircle(circle.id, attacker.id)).toBe(false);
    expect(await canWriteCircle(circle.id, attacker.id)).toBe(false);
    expect(await getCircleInvitePreview(circle.id, attacker.id)).toBeNull();
    await expect(
      createJoinRequest(circle.id, attacker.id, [
        me.id,
        '00000000-0000-4000-8000-0000000000a1',
        '00000000-0000-4000-8000-0000000000b2',
      ]),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      getAnonymousCirclePosts({ circleId: circle.id, viewerId: attacker.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const entry = await upsertDiary({
      userId: me.id,
      shortText: 'hello',
      visibilityMode: 'all_circles',
    });
    expect(await canViewDiary(attacker.id, me.id, entry)).toBe(false);
  });

  it('pending_change may read but not write', async () => {
    const me = await signUpLocal('Host');
    const { draftId } = await proposeCircleDraft(me.id, 'Beta circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    await setSchoolMembershipStatusForTests({
      userId: me.id,
      schoolId: BETA_SCHOOL_ID,
      status: 'pending_change',
    });
    expect(await canAccessCircle(circle.id, me.id)).toBe(true);
    expect(await canWriteCircle(circle.id, me.id)).toBe(false);
    await expect(
      createAnonymousPost({ circleId: circle.id, userId: me.id, body: 'hi there' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('unverified cannot join even with recommenders', async () => {
    const me = await signUpLocal('Host');
    const { draftId } = await proposeCircleDraft(me.id, 'Beta circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    await ensureDemoJoinApplicant();
    await setSchoolMembershipStatusForTests({
      userId: DEMO_JOIN_IDS.yujin,
      schoolId: BETA_SCHOOL_ID,
      status: 'pending',
    });
    await expect(
      createJoinRequest(circle.id, DEMO_JOIN_IDS.yujin, [
        me.id,
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
      ]),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
