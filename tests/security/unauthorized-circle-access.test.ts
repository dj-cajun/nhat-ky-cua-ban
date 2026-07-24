/**
 * Phase 4.5 — unauthorized circle access (domain mirror / CI)
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
  return { me, circle, yujin: 'demo-applicant-yujin' };
}

describe('unauthorized-circle-access', () => {
  beforeEach(() => localStorage.clear());

  it('non-member cannot list circle_members', () => {
    const { circle, yujin } = openCircle();
    expect(() => store.listCircleMembers(circle.id, yujin)).toThrow(/멤버만/);
  });

  it('invite preview never includes member ids', () => {
    const { circle, yujin } = openCircle();
    const preview = store.getCircleInvitePreview(circle.id, yujin);
    expect(preview).toBeTruthy();
    expect(JSON.stringify(preview)).not.toMatch(/demo-friend/);
    expect(preview!.isMember).toBe(false);
  });
});
