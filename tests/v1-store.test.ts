// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import * as store from '@/lib/v1-store';

describe('v1 circle founding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens circle only after both invitees accept', () => {
    const me = store.createProfile({ displayName: '나', authProvider: 'demo' });
    store.ensureDemoDirectory(me.id);
    const friends = store.listDirectoryProfiles(me.id);
    const { draft, invites } = store.proposeCircle({
      name: '스터디',
      inviterId: me.id,
      inviteeIds: [friends[0].id, friends[1].id],
    });

    expect(store.respondToCreationInvite(invites[0].id, friends[0].id, true)).toBeNull();
    expect(store.listMyCircles(me.id)).toHaveLength(0);

    const opened = store.respondToCreationInvite(invites[1].id, friends[1].id, true);
    expect(opened?.name).toBe('스터디');
    expect(opened?.status).toBe('open');
    expect(store.listCircleMembers(opened!.id)).toHaveLength(3);
    expect(store.listCircleMembers(opened!.id).every((m) => m.isPioneer)).toBe(true);
    expect(draft.id).toBeTruthy();
  });

  it('cancels founding when one declines', () => {
    const me = store.createProfile({ displayName: '나', authProvider: 'demo' });
    store.ensureDemoDirectory(me.id);
    const friends = store.listDirectoryProfiles(me.id);
    const { invites } = store.proposeCircle({
      name: '실패',
      inviterId: me.id,
      inviteeIds: [friends[0].id, friends[1].id],
    });

    expect(store.respondToCreationInvite(invites[0].id, friends[0].id, false)).toBeNull();
    expect(store.listMyCircles(me.id)).toHaveLength(0);
    expect(store.listPendingInvitesFor(friends[1].id)).toHaveLength(0);
  });
});

describe('v1 diary visibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps private entries from other users', () => {
    const me = store.createProfile({ displayName: '나', authProvider: 'demo' });
    const entry = store.upsertDiaryEntry({
      userId: me.id,
      mood: 'calm',
      tenCharText: '조용한하루',
      visibilityMode: 'private',
    });
    expect(store.canViewDiary('other', me.id, entry)).toBe(false);
    expect(store.canViewDiary(me.id, me.id, entry)).toBe(true);
  });
});

describe('v1 three-recommendation join', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function openCircle() {
    const me = store.createProfile({ displayName: '개척자', authProvider: 'demo' });
    store.ensureDemoDirectory(me.id);
    const friends = store.listDirectoryProfiles(me.id);
    const minseo = friends.find((f) => f.displayName === 'Minseo')!;
    const junho = friends.find((f) => f.displayName === 'Junho')!;
    const { invites } = store.proposeCircle({
      name: '금요 스터디',
      inviterId: me.id,
      inviteeIds: [minseo.id, junho.id],
    });
    store.respondToCreationInvite(invites[0].id, minseo.id, true);
    const opened = store.respondToCreationInvite(invites[1].id, junho.id, true)!;
    store.demoAddMember(opened.id, 'demo-friend-c');
    return { me, circle: opened, minseo, junho, seoyeonId: 'demo-friend-c' };
  }

  it('approves after exactly 3 recommendations', () => {
    const { me, circle, minseo, seoyeonId } = openCircle();
    store.requestJoin(circle.id, 'demo-applicant-yujin', [me.id, minseo.id, seoyeonId]);
    const r1 = store.listMyRecommendations(me.id)[0];
    expect(store.respondRecommendation(r1.id, me.id, 'recommended')?.status).toBe('pending');
    const r2 = store.listMyRecommendations(minseo.id)[0];
    expect(store.respondRecommendation(r2.id, minseo.id, 'recommended')?.status).toBe('pending');
    const r3 = store.listMyRecommendations(seoyeonId)[0];
    expect(store.respondRecommendation(r3.id, seoyeonId, 'recommended')?.status).toBe('approved');
    expect(store.listCircleMembers(circle.id).some((m) => m.userId === 'demo-applicant-yujin')).toBe(
      true,
    );
  });

  it('stays pending when one chooses unknown', () => {
    const { me, circle, minseo, seoyeonId } = openCircle();
    const req = store.requestJoin(circle.id, 'demo-applicant-yujin', [
      me.id,
      minseo.id,
      seoyeonId,
    ]);
    store.respondRecommendation(store.listMyRecommendations(me.id)[0].id, me.id, 'recommended');
    store.respondRecommendation(
      store.listMyRecommendations(minseo.id)[0].id,
      minseo.id,
      'recommended',
    );
    store.respondRecommendation(
      store.listMyRecommendations(seoyeonId)[0].id,
      seoyeonId,
      'unknown',
    );
    const prog = store.getJoinProgress(req.id, 'demo-applicant-yujin');
    expect(prog.recommended).toBe(2);
    expect(prog.status).toBe('pending');
    expect(JSON.stringify(prog)).not.toContain(seoyeonId);
  });

  it('blocks non-members from member roster', () => {
    const { circle } = openCircle();
    expect(() => store.listCircleMembers(circle.id, 'demo-applicant-yujin')).toThrow(/멤버만/);
  });

  it('rejects duplicate recommenders', () => {
    const { me, circle, minseo } = openCircle();
    expect(() =>
      store.requestJoin(circle.id, 'demo-applicant-yujin', [me.id, me.id, minseo.id]),
    ).toThrow(/서로 다른/);
  });
});
