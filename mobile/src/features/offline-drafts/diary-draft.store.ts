import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryMood, DiaryVisibilityMode } from '@/types/domain';

export type DiaryDraftStatus = 'draft' | 'syncing' | 'synced' | 'failed';

export type DiaryDraft = {
  userId: string;
  entryDate: string;
  timezone: string;
  mood?: DiaryMood;
  tenCharText?: string;
  shortText?: string;
  photoLocalUri?: string;
  spotifyTrackIdPending?: string;
  visibilityMode: DiaryVisibilityMode;
  status: DiaryDraftStatus;
  updatedAt: string;
  /** Server version known when draft was last synced — used for conflict checks */
  serverUpdatedAt?: string;
};

const keyFor = (userId: string, entryDate: string) =>
  `your-diary:diary-draft:${userId}:${entryDate}`;

export async function saveDiaryDraft(draft: DiaryDraft): Promise<void> {
  const next: DiaryDraft = {
    ...draft,
    status: draft.status === 'synced' ? 'synced' : 'draft',
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(keyFor(draft.userId, draft.entryDate), JSON.stringify(next));
}

export async function getDiaryDraft(
  userId: string,
  entryDate: string,
): Promise<DiaryDraft | null> {
  const raw = await AsyncStorage.getItem(keyFor(userId, entryDate));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DiaryDraft;
  } catch {
    return null;
  }
}

export async function clearDiaryDraft(userId: string, entryDate: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId, entryDate));
}

export async function markDraftStatus(
  userId: string,
  entryDate: string,
  status: DiaryDraftStatus,
): Promise<DiaryDraft | null> {
  const existing = await getDiaryDraft(userId, entryDate);
  if (!existing) return null;
  const next = { ...existing, status, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(keyFor(userId, entryDate), JSON.stringify(next));
  return next;
}

/** Remove all drafts for a user (logout / account switch). */
export async function clearAllDiaryDraftsForUser(userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(`your-diary:diary-draft:${userId}:`));
  if (mine.length) await AsyncStorage.multiRemove(mine);
}
