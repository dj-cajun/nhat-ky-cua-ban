/**
 * Phase 4.5 — attack scenarios against the local rule mirror.
 * Live Supabase RLS: supabase/tests/*.sql
 */
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
  blockUser,
  cancelJoinRequest,
  clearLocalDb,
  countJoinArtifacts,
  createJoinRequest,
  decideRecommendation,
  demoAcceptAll,
  DEMO_JOIN_IDS,
  ensureDemoJoinApplicant,
  getJoinProgress,
  isCircleMember,
  listCircleMembers,
  listMyJoinRecommendations,
  proposeCircleDraft,
  respondCircleRecommendation,
  signUpLocal,
} from '@/features/local/repository';

describe('4.5 security — join / RLS mirror', () => {
  let pioneerId = '';
  let circleId = '';

  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
    const me = await signUpLocal('PioneerA');
    pioneerId = me.id;
    const { draftId } = await proposeCircleDraft(me.id, 'Secure Circle', [
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    const circle = await demoAcceptAll(draftId);
    circleId = circle.id;
    await ensureDemoJoinApplicant();
  });

  it('blocks non-member D from listing members', async () => {
    await expect(listCircleMembers(circleId, DEMO_JOIN_IDS.yujin)).rejects.toThrow(/Only members/);
  });

  it('rejects forged create payloads and leaves zero artifacts', async () => {
    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [pioneerId, DEMO_JOIN_IDS.minseo]),
    ).rejects.toThrow();

    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
        pioneerId,
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
        DEMO_JOIN_IDS.seoyeon,
      ]),
    ).rejects.toThrow();

    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
        pioneerId,
        pioneerId,
        DEMO_JOIN_IDS.minseo,
      ]),
    ).rejects.toThrow(/different/);

    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
        DEMO_JOIN_IDS.yujin,
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
      ]),
    ).rejects.toThrow(/yourself|recommend/i);

    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
        pioneerId,
        DEMO_JOIN_IDS.minseo,
        '00000000-0000-4000-8000-0000000000d4',
      ]),
    ).rejects.toThrow(/members/);

    await expect(
      createJoinRequest(circleId, pioneerId, [
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
        DEMO_JOIN_IDS.minseo,
      ]),
    ).rejects.toThrow();

    const artifacts = await countJoinArtifacts(circleId, DEMO_JOIN_IDS.yujin);
    expect(artifacts.requests).toBe(0);
    expect(artifacts.recommendations).toBe(0);
    expect(artifacts.membership).toBe(0);
  });

  it('rejects second pending request', async () => {
    await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await expect(
      createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
        pioneerId,
        DEMO_JOIN_IDS.minseo,
        DEMO_JOIN_IDS.junho,
      ]),
    ).rejects.toThrow(/pending/);
    expect((await countJoinArtifacts(circleId, DEMO_JOIN_IDS.yujin)).requests).toBe(1);
  });

  it('blocks recommendation tampering', async () => {
    await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    const inbox = await listMyJoinRecommendations(pioneerId);
    const recId = inbox[0].recommendationId;

    await expect(
      respondCircleRecommendation(recId, DEMO_JOIN_IDS.yujin, 'recommended'),
    ).rejects.toThrow();

    await expect(
      respondCircleRecommendation(recId, DEMO_JOIN_IDS.minseo, 'recommended'),
    ).rejects.toThrow();

    await respondCircleRecommendation(recId, pioneerId, 'recommended');
    await expect(respondCircleRecommendation(recId, pioneerId, 'recommended')).rejects.toThrow(
      /already/,
    );
  });

  it('hides recommender identity from applicant progress', async () => {
    const req = await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, DEMO_JOIN_IDS.minseo, 'unknown');
    const prog = await getJoinProgress(req.id, DEMO_JOIN_IDS.yujin);
    const json = JSON.stringify(prog);
    expect(json).not.toContain(DEMO_JOIN_IDS.minseo);
    expect(json).not.toContain(pioneerId);
    expect(json).not.toContain('unknown');
    expect(prog.recommended).toBe(0);
    await expect(getJoinProgress(req.id, pioneerId)).rejects.toThrow();
  });

  it('blocks respond when recommender blocked applicant', async () => {
    const req = await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await blockUser(pioneerId, DEMO_JOIN_IDS.yujin);
    await expect(decideRecommendation(req.id, pioneerId, 'recommended')).rejects.toThrow(/block/i);
    expect(await isCircleMember(circleId, DEMO_JOIN_IDS.yujin)).toBe(false);
  });

  it('rejects respond after cancel; allows fresh request', async () => {
    const req = await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await cancelJoinRequest(req.id, DEMO_JOIN_IDS.yujin);
    await expect(decideRecommendation(req.id, pioneerId, 'recommended')).rejects.toThrow();
    const next = await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    expect(next.id).not.toBe(req.id);
    expect(
      (await listMyJoinRecommendations(pioneerId)).filter((r) => r.requestId === req.id),
    ).toHaveLength(0);
  });

  it('approves with exactly one membership and one approval notification', async () => {
    const req = await createJoinRequest(circleId, DEMO_JOIN_IDS.yujin, [
      pioneerId,
      DEMO_JOIN_IDS.minseo,
      DEMO_JOIN_IDS.junho,
    ]);
    await decideRecommendation(req.id, pioneerId, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.minseo, 'recommended');
    await decideRecommendation(req.id, DEMO_JOIN_IDS.junho, 'recommended');
    const artifacts = await countJoinArtifacts(circleId, DEMO_JOIN_IDS.yujin);
    expect(artifacts.membership).toBe(1);
    expect(artifacts.approvals).toBe(1);
    expect((await getJoinProgress(req.id, DEMO_JOIN_IDS.yujin)).status).toBe('approved');
  });
});
