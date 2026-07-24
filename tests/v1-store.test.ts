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
