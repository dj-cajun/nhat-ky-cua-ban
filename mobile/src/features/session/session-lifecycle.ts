import {
  clearSessionUser,
  getSessionProfile,
  switchSession as localSwitchSession,
} from '@/features/local/repository';
import type { Profile } from '@/types/domain';
import { clearAllDiaryDraftsForUser } from '@/features/offline-drafts/diary-draft.store';
import { circlePresenceService } from '@/features/presence/circle-presence.service';
import { clearAllQueryCaches } from '@/lib/cache-invalidation';
import { secureLog } from '@/lib/secure-logger';

/**
 * Tear down session-scoped state so account B never sees account A's data.
 */
export async function endSession(opts?: {
  previousUserId?: string | null;
  wipeLocalDb?: boolean;
}): Promise<void> {
  try {
    await circlePresenceService.leave();
  } catch {
    /* ignore */
  }
  await clearAllQueryCaches();
  if (opts?.previousUserId) {
    await clearAllDiaryDraftsForUser(opts.previousUserId);
  }
  if (opts?.wipeLocalDb) {
    const { clearLocalDb } = await import('@/features/local/repository');
    await clearLocalDb();
  }
  secureLog('info', 'session_ended', {
    wiped_db: Boolean(opts?.wipeLocalDb),
  });
}

export async function switchAccountIsolation(previousUserId: string | null): Promise<void> {
  await endSession({ previousUserId, wipeLocalDb: false });
}

/** Logout: drop session pointer + caches/drafts, keep local demo fixtures. */
export async function signOut(): Promise<void> {
  const previous = await clearSessionUser();
  await endSession({ previousUserId: previous, wipeLocalDb: false });
}

/**
 * Demo / multi-account switch — isolate previous account before binding new session.
 */
export async function switchToUser(userId: string): Promise<Profile> {
  const current = await getSessionProfile();
  await switchAccountIsolation(current?.id ?? null);
  return localSwitchSession(userId);
}
