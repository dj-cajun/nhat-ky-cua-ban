import { clearLocalDb } from '@/features/local/repository';
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
    await clearLocalDb();
  }
  secureLog('info', 'session_ended', {
    wiped_db: Boolean(opts?.wipeLocalDb),
  });
}

export async function switchAccountIsolation(previousUserId: string | null): Promise<void> {
  await endSession({ previousUserId, wipeLocalDb: false });
}
