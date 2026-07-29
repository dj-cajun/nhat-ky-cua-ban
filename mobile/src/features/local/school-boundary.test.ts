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
  getMyOperatorCapabilities,
  grantAppAdminForTests,
  grantAppModeratorForTests,
  opsFlagFakeSchoolVerification,
  opsGetOverviewMetrics,
  opsListSchoolAuditEvents,
  opsMergeSchools,
  opsReviewSchoolChange,
  opsReviewSchoolVerification,
  opsScanMixedSchoolCircles,
  opsSetSchoolMembershipStatus,
  proposeCircleDraft,
  requestSchoolChange,
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

  it('ops needs_more_info requires reason and surfaces note', async () => {
    const me = await signUpLocal('Alex');
    const ops = await signUpLocal('Ops');
    await grantAppModeratorForTests(ops.id);
    const { requestId } = await submitSchoolInviteCode(me.id, BETA_SCHOOL_CODE);
    await expect(
      opsReviewSchoolVerification({
        actorId: ops.id,
        requestId,
        decision: 'needs_more_info',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await opsReviewSchoolVerification({
      actorId: ops.id,
      requestId,
      decision: 'needs_more_info',
      note: 'Upload student ID',
    });
    const m = await getMySchoolMembership(me.id);
    expect(m.status).toBe('needs_more_info');
    expect(m.reviewNote).toBe('Upload student ID');
  });

  it('school change sets pending_change without moving circles', async () => {
    const me = await signUpLocal('Host');
    const ops = await signUpLocal('Ops');
    await grantAppModeratorForTests(ops.id);
    await setSchoolMembershipStatusForTests({
      userId: me.id,
      schoolId: BETA_SCHOOL_ID,
      status: 'verified',
    });
    const { draftId } = await proposeCircleDraft(me.id, 'Beta circle', [
      '00000000-0000-4000-8000-0000000000a1',
      '00000000-0000-4000-8000-0000000000b2',
    ]);
    const circle = await demoAcceptAll(draftId);
    const { requestId } = await requestSchoolChange({
      userId: me.id,
      toSchoolId: OTHER_SCHOOL_ID,
      reason: 'transfer',
    });
    expect((await getMySchoolMembership(me.id)).status).toBe('pending_change');
    expect(await canAccessCircle(circle.id, me.id)).toBe(true);
    expect(await canWriteCircle(circle.id, me.id)).toBe(false);

    await opsReviewSchoolChange({
      actorId: ops.id,
      requestId,
      decision: 'rejected',
      note: 'stay at beta',
    });
    expect((await getMySchoolMembership(me.id)).status).toBe('verified');
    expect(await canWriteCircle(circle.id, me.id)).toBe(true);

    const audit = await opsListSchoolAuditEvents(ops.id);
    expect(audit.some((e) => e.eventType === 'school_change_rejected')).toBe(true);
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

  it('ops overview is aggregate-only and role-gated', async () => {
    const me = await signUpLocal('Alex');
    const ops = await signUpLocal('Ops');
    await expect(opsGetOverviewMetrics(me.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await grantAppModeratorForTests(ops.id);
    const m = await opsGetOverviewMetrics(ops.id);
    expect(m.totalUsers).toBeGreaterThanOrEqual(2);
    expect(m).toHaveProperty('openReports');
    expect(m).toHaveProperty('friendDiaryVisitsToday');
    expect(typeof m.note).toBe('string');
  });

  it('membership suspend requires reason; school merge is admin-only', async () => {
    const me = await signUpLocal('Host');
    const mod = await signUpLocal('Mod');
    const admin = await signUpLocal('Admin');
    await grantAppModeratorForTests(mod.id);
    await grantAppAdminForTests(admin.id);
    await setSchoolMembershipStatusForTests({
      userId: me.id,
      schoolId: BETA_SCHOOL_ID,
      status: 'verified',
    });

    await expect(
      opsSetSchoolMembershipStatus({
        actorId: mod.id,
        userId: me.id,
        schoolId: BETA_SCHOOL_ID,
        status: 'suspended',
        note: '',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });

    await opsSetSchoolMembershipStatus({
      actorId: mod.id,
      userId: me.id,
      schoolId: BETA_SCHOOL_ID,
      status: 'suspended',
      note: 'policy',
    });
    expect((await getMySchoolMembership(me.id)).status).toBe('suspended');

    await expect(
      opsMergeSchools({
        actorId: mod.id,
        keepSchoolId: BETA_SCHOOL_ID,
        absorbSchoolId: OTHER_SCHOOL_ID,
        note: 'dup',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const caps = await getMyOperatorCapabilities(admin.id);
    expect(caps.allowedActions).toContain('school_merge');
    await opsMergeSchools({
      actorId: admin.id,
      keepSchoolId: BETA_SCHOOL_ID,
      absorbSchoolId: OTHER_SCHOOL_ID,
      note: 'duplicate school',
    });
  });

  it('flag fake verification opens report + needs_more_info', async () => {
    const me = await signUpLocal('Alex');
    const ops = await signUpLocal('Ops');
    await grantAppModeratorForTests(ops.id);
    const { requestId } = await submitSchoolInviteCode(me.id, BETA_SCHOOL_CODE);
    const { reportId } = await opsFlagFakeSchoolVerification({
      actorId: ops.id,
      requestId,
      note: 'stolen code',
    });
    expect(reportId).toBeTruthy();
    expect((await getMySchoolMembership(me.id)).status).toBe('needs_more_info');
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
