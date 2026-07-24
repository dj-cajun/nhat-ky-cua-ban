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
  decideRecommendation,
  demoAcceptAll,
  openCircleFromDraft,
  proposeCircleDraft,
  respondDraftInvite,
  signUpLocal,
  upsertDiary,
  canViewDiary,
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
});
