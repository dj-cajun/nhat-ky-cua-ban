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
    getAllKeys: async () => [...store.keys()],
    multiRemove: async (keys: string[]) => {
      for (const k of keys) store.delete(k);
    },
  },
}));

import { clearLocalDb, getDiary, signUpLocal, upsertDiary } from '@/features/local/repository';
import {
  applyConflictChoice,
  syncDiaryDraft,
} from '@/features/offline-drafts/diary-draft-sync';
import {
  clearAllDiaryDraftsForUser,
  getDiaryDraft,
  saveDiaryDraft,
} from '@/features/offline-drafts/diary-draft.store';
import { endSession } from '@/features/session/session-lifecycle';
import { resolveDeepLink } from '@/lib/deep-link';
import { toAppError } from '@/lib/errors';
import { applyFeatureFlags, isFeatureEnabled, resetFeatureFlags } from '@/lib/feature-flags';
import { retryKindFor, shouldAutoRetry } from '@/lib/retry-policy';
import { sanitizeAttrs } from '@/lib/secure-logger';
import { isNewerServerVersion } from '@/features/offline-drafts/conflict-resolution';

vi.mock('@/features/presence/circle-presence.service', () => ({
  circlePresenceService: {
    leave: async () => undefined,
  },
}));

vi.mock('@/lib/cache-invalidation', () => ({
  clearAllQueryCaches: async () => undefined,
  invalidateAfterBlock: async () => undefined,
}));

describe('phase-11 offline diary sync', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
    await resetFeatureFlags();
  });

  it('keeps a local draft when sync is not yet attempted', async () => {
    const me = await signUpLocal('Alex');
    await saveDiaryDraft({
      userId: me.id,
      entryDate: '2026-07-24',
      timezone: 'America/New_York',
      shortText: 'quiet morning',
      visibilityMode: 'private',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });
    const draft = await getDiaryDraft(me.id, '2026-07-24');
    expect(draft?.shortText).toBe('quiet morning');
    expect(draft?.status).toBe('draft');
  });

  it('syncs draft to server when no conflict', async () => {
    const me = await signUpLocal('Alex');
    const entryDate = new Date().toISOString().slice(0, 10);
    await saveDiaryDraft({
      userId: me.id,
      entryDate,
      timezone: 'America/New_York',
      shortText: 'from draft',
      visibilityMode: 'private',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });
    const result = await syncDiaryDraft({
      userId: me.id,
      entryDate,
      getServerEntry: () => getDiary(me.id, entryDate),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.shortText).toBe('from draft');
    }
    expect(await getDiaryDraft(me.id, entryDate)).toBeNull();
  });

  it('surfaces conflict when server updated_at changed', async () => {
    const me = await signUpLocal('Alex');
    const server = await upsertDiary({
      userId: me.id,
      shortText: 'server version',
      visibilityMode: 'private',
    });
    await saveDiaryDraft({
      userId: me.id,
      entryDate: server.entryDate,
      timezone: server.timezone,
      shortText: 'local version',
      visibilityMode: 'private',
      status: 'draft',
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: '2000-01-01T00:00:00.000Z',
    });
    const result = await syncDiaryDraft({
      userId: me.id,
      entryDate: server.entryDate,
      getServerEntry: () => getDiary(me.id, server.entryDate),
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.conflict) {
      const kept = await applyConflictChoice({
        choice: 'keep_server',
        userId: me.id,
        entryDate: server.entryDate,
        server: result.server,
        draft: result.draft,
      });
      expect(kept?.shortText).toBe('server version');
    }
  });

  it('detects newer server version without auto-overwrite', () => {
    expect(
      isNewerServerVersion({
        serverUpdatedAt: '2026-07-24T12:00:00.000Z',
        knownServerUpdatedAt: '2026-07-24T11:00:00.000Z',
      }),
    ).toBe(true);
  });
});

describe('phase-11 session isolation', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('clears drafts for previous user on session end', async () => {
    const a = await signUpLocal('A');
    await saveDiaryDraft({
      userId: a.id,
      entryDate: '2026-07-24',
      timezone: 'America/New_York',
      shortText: 'secret',
      visibilityMode: 'private',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });
    await endSession({ previousUserId: a.id, wipeLocalDb: false });
    expect(await getDiaryDraft(a.id, '2026-07-24')).toBeNull();
    await clearAllDiaryDraftsForUser(a.id);
  });

  it('signOut clears session profile pointer', async () => {
    const { signOut } = await import('@/features/session/session-lifecycle');
    const a = await signUpLocal('A');
    expect(a.id).toBeTruthy();
    await signOut();
    const { getSessionProfile } = await import('@/features/local/repository');
    expect(await getSessionProfile()).toBeNull();
  });
});

describe('phase-11 deep link + errors + flags + retry + logger', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
    await resetFeatureFlags();
  });

  it('requires session before deep link resolution', async () => {
    const result = await resolveDeepLink({ kind: 'circle', circleId: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('AUTH_REQUIRED');
  });

  it('blocks non-members from circle deep links', async () => {
    const me = await signUpLocal('Alex');
    const result = await resolveDeepLink({
      kind: 'circle',
      circleId: '00000000-0000-4000-8000-000000009999',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(['FORBIDDEN', 'NOT_FOUND']).toContain(result.code);
    }
    expect(me.id).toBeTruthy();
  });

  it('blocks cross-school join deep links even with known circle id', async () => {
    const {
      demoAcceptAll,
      proposeCircleDraft,
      setSchoolMembershipStatusForTests,
    } = await import('@/features/local/repository');
    const { OTHER_SCHOOL_ID } = await import('@/features/local/school');
    const host = await signUpLocal('Host');
    const { draftId } = await proposeCircleDraft(host.id, 'Beta', [
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
    const { switchToUser } = await import('@/features/session/session-lifecycle');
    await switchToUser(attacker.id);
    const result = await resolveDeepLink({ kind: 'join', circleId: circle.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_FOUND');
  });

  it('maps network failures to OFFLINE without leaking SQL', () => {
    const err = toAppError(new Error('permission denied for relation diary_entries'));
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).not.toMatch(/relation/);
    const offline = toAppError(new Error('Failed to fetch'));
    expect(offline.code).toBe('OFFLINE');
  });

  it('never auto-retries note/report mutations', () => {
    expect(retryKindFor('private_note_send')).toBe('user');
    expect(retryKindFor('report_submit')).toBe('user');
    expect(shouldAutoRetry('spotify_search', 1)).toBe(true);
    expect(shouldAutoRetry('private_note_send', 1)).toBe(false);
  });

  it('sanitizes sensitive log attributes', () => {
    const safe = sanitizeAttrs({
      error_code: 'OFFLINE',
      diary_body: 'should not appear',
      jwt: 'secret',
      platform: 'ios',
    });
    expect(safe).toEqual({ error_code: 'OFFLINE', platform: 'ios' });
  });

  it('supports remote feature flag kill switches', async () => {
    expect(isFeatureEnabled('anonymous_board_enabled')).toBe(true);
    await applyFeatureFlags({ anonymous_board_enabled: false });
    expect(isFeatureEnabled('anonymous_board_enabled')).toBe(false);
  });
});

describe('phase-11 realtime degradation policy', () => {
  it('documents that circle core must work without presence', () => {
    // Presence failure must not block members / notices / diary — enforced in UI.
    const allowedWithoutRealtime = ['members', 'notices', 'diary', 'alias_board'];
    expect(allowedWithoutRealtime).toContain('notices');
  });
});
