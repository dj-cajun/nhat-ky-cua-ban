/**
 * Phase 4.5 — recommendation RPC / create forgery (domain mirror / CI)
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import * as store from '@/lib/v1-store';

function openCircle() {
  const me = store.createProfile({ displayName: 'A-개척자', authProvider: 'demo' });
  store.ensureDemoDirectory(me.id);
  const friends = store.listDirectoryProfiles(me.id);
  const minseo = friends.find((f) => f.displayName === '민서')!;
  const junho = friends.find((f) => f.displayName === '준호')!;
  const { invites } = store.proposeCircle({
    name: '보안서클',
    inviterId: me.id,
    inviteeIds: [minseo.id, junho.id],
  });
  store.respondToCreationInvite(invites[0].id, minseo.id, true);
  const circle = store.respondToCreationInvite(invites[1].id, junho.id, true)!;
  store.demoAddMember(circle.id, 'demo-friend-c');
  return {
    me,
    circle,
    minseo,
    seoyeon: 'demo-friend-c',
    yujin: 'demo-applicant-yujin',
  };
}

describe('recommendation-tampering', () => {
  beforeEach(() => localStorage.clear());

  it('rejects bad create inputs without leftover rows', () => {
    const { me, circle, minseo, yujin } = openCircle();
    const before = JSON.parse(localStorage.getItem('v1_circle_join_requests') || '[]').length;

    expect(() => store.requestJoin(circle.id, yujin, [me.id, minseo.id])).toThrow();
    expect(() => store.requestJoin(circle.id, yujin, [me.id, me.id, minseo.id])).toThrow(
      /서로 다른/,
    );
    expect(() => store.requestJoin(circle.id, yujin, [yujin, me.id, minseo.id])).toThrow(/본인/);
    expect(() =>
      store.requestJoin(circle.id, yujin, [me.id, minseo.id, 'not-a-member']),
    ).toThrow(/멤버/);

    const after = JSON.parse(localStorage.getItem('v1_circle_join_requests') || '[]').length;
    expect(after).toBe(before);
    expect(store.listCircleMembers(circle.id).some((m) => m.userId === yujin)).toBe(false);
  });

  it('wrong recommender cannot respond', () => {
    const { me, circle, minseo, seoyeon, yujin } = openCircle();
    store.requestJoin(circle.id, yujin, [me.id, minseo.id, seoyeon]);
    const rec = store.listMyRecommendations(me.id)[0];
    expect(() => store.respondRecommendation(rec.id, minseo.id, 'recommended')).toThrow();
  });

  it('double respond is rejected', () => {
    const { me, circle, minseo, seoyeon, yujin } = openCircle();
    store.requestJoin(circle.id, yujin, [me.id, minseo.id, seoyeon]);
    const rec = store.listMyRecommendations(me.id)[0];
    store.respondRecommendation(rec.id, me.id, 'recommended');
    expect(() => store.respondRecommendation(rec.id, me.id, 'recommended')).toThrow(/이미/);
  });
});
