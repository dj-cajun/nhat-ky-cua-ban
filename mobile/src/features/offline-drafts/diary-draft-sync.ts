import { AppError } from '@/types/domain';
import type { DiaryEntry } from '@/types/domain';
import { upsertDiary } from '@/features/local/repository';
import {
  clearDiaryDraft,
  getDiaryDraft,
  markDraftStatus,
  type DiaryDraft,
} from './diary-draft.store';
import { resolveDiaryConflict, type ConflictChoice } from './conflict-resolution';

export type SyncResult =
  | { ok: true; entry: DiaryEntry; conflict: false }
  | { ok: false; conflict: true; server: DiaryEntry; draft: DiaryDraft }
  | { ok: false; conflict: false; error: AppError };

/**
 * Attempt to push a local draft. Never auto-overwrite a newer server row.
 */
export async function syncDiaryDraft(input: {
  userId: string;
  entryDate: string;
  getServerEntry: () => Promise<DiaryEntry | null>;
}): Promise<SyncResult> {
  const draft = await getDiaryDraft(input.userId, input.entryDate);
  if (!draft) {
    return {
      ok: false,
      conflict: false,
      error: new AppError('NOT_FOUND', 'No local draft.'),
    };
  }

  await markDraftStatus(input.userId, input.entryDate, 'syncing');

  try {
    const server = await input.getServerEntry();
    if (server && draft.serverUpdatedAt && server.updatedAt !== draft.serverUpdatedAt) {
      await markDraftStatus(input.userId, input.entryDate, 'failed');
      return { ok: false, conflict: true, server, draft };
    }

    const entry = await upsertDiary({
      userId: draft.userId,
      mood: draft.mood,
      tenCharText: draft.tenCharText,
      shortText: draft.shortText,
      visibilityMode: draft.visibilityMode,
      timezone: draft.timezone,
      expectedUpdatedAt: draft.serverUpdatedAt,
    });

    await clearDiaryDraft(input.userId, input.entryDate);
    return { ok: true, entry, conflict: false };
  } catch (e) {
    await markDraftStatus(input.userId, input.entryDate, 'failed');
    if (e instanceof AppError && e.code === 'CONFLICT') {
      const server = await input.getServerEntry();
      if (server) {
        return { ok: false, conflict: true, server, draft };
      }
    }
    return {
      ok: false,
      conflict: false,
      error: e instanceof AppError ? e : new AppError('UNKNOWN', 'Sync failed.'),
    };
  }
}

export async function applyConflictChoice(input: {
  choice: ConflictChoice;
  userId: string;
  entryDate: string;
  server: DiaryEntry;
  draft: DiaryDraft;
}): Promise<DiaryEntry | null> {
  const decision = resolveDiaryConflict(input.choice);
  if (decision === 'keep_server') {
    await clearDiaryDraft(input.userId, input.entryDate);
    return input.server;
  }

  const entry = await upsertDiary({
    userId: input.draft.userId,
    mood: input.draft.mood,
    tenCharText: input.draft.tenCharText,
    shortText: input.draft.shortText,
    visibilityMode: input.draft.visibilityMode,
    timezone: input.draft.timezone,
    forceOverwrite: true,
  });
  await clearDiaryDraft(input.userId, input.entryDate);
  return entry;
}
