/**
 * Phase 4.5 — information leakage (domain mirror / CI)
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import * as store from '@/lib/v1-store';

function openCircle() {
  const me = store.createProfile({ displayName: 'A-개척자', authProvider: 'demo' });
  store.ensureDemoDirectory(me.id);
  const friends = store.listDirectoryProfiles(me.id);
  const minseo = friends.find((f) => f.displayName === 'Minseo')!;
  const junho = friends.find((f) => f.displayName === 'Junho')!;
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

describe('information-leakage', () => {
  beforeEach(() => localStorage.clear());

  it('applicant progress has counts only', () => {
    const { me, circle, minseo, seoyeon, yujin } = openCircle();
    const req = store.requestJoin(circle.id, yujin, [me.id, minseo.id, seoyeon]);
    store.respondRecommendation(store.listMyRecommendations(minseo.id)[0].id, minseo.id, 'unknown');
    const prog = store.getJoinProgress(req.id, yujin);
    const json = JSON.stringify(prog);
    expect(prog.recommended).toBe(0);
    expect(json).not.toContain(minseo.id);
    expect(json).not.toContain('unknown');
    expect(json).not.toContain(me.id);
    expect(() => store.getJoinProgress(req.id, me.id)).toThrow(/본인/);
  });
});
