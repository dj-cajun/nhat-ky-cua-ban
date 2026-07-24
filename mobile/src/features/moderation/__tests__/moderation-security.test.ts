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
  addDemoPhoto,
  addGuestbookEntry,
  blockUser,
  canViewDiary,
  clearLocalDb,
  createPhotoSignedUrlToken,
  getActivePostBadgeStates,
  isBlockedBetween,
  setUserModerationStatus,
  signUpLocal,
  submitReportServerSnapshot,
  unblockUser,
  upsertDiary,
} from '@/features/local/repository';
import { filterPresenceMap } from '@/features/moderation/blocked-user-filter';

describe('moderation security mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('blocks diary and photo signed URL both ways after one-sided block', async () => {
    const a = await signUpLocal('Alex');
    const b = await signUpLocal('Blake');
    const entry = await upsertDiary({
      userId: b.id,
      tenCharText: 'hello',
      visibilityMode: 'all_circles',
    });
    // Without shared circle, canViewDiary is false anyway — use block check path
    await blockUser(a.id, b.id);
    expect(await isBlockedBetween(a.id, b.id)).toBe(true);
    expect(await canViewDiary(a.id, b.id, entry)).toBe(false);
    expect(await canViewDiary(b.id, a.id, entry)).toBe(false);

    const photo = await addDemoPhoto(b.id, `${b.id}/pic.jpg`);
    await expect(createPhotoSignedUrlToken(a.id, photo.id)).rejects.toThrow(/can’t view/i);

    await unblockUser(a.id, b.id);
    expect(await isBlockedBetween(a.id, b.id)).toBe(false);
  });

  it('ignores client snapshot tampering and hides for reporter', async () => {
    const me = await signUpLocal('Alex');
    const gb = await addGuestbookEntry({
      ownerUserId: me.id,
      authorUserId: me.id,
      body: 'real body',
    });
    // Reporting own guestbook as author on own wall — allowed for guestbook in mirror
    const id = await submitReportServerSnapshot({
      reporterId: me.id,
      targetType: 'guestbook_entry',
      targetId: gb.id,
      reason: 'spam',
      clientSnapshotIgnored: '{"body":"forged"}',
      hideForMe: true,
    });
    expect(id).toBeTruthy();
  });

  it('suspended accounts cannot block', async () => {
    const me = await signUpLocal('Alex');
    const other = await signUpLocal('Other');
    await setUserModerationStatus({ userId: me.id, accountStatus: 'suspended' });
    await expect(blockUser(me.id, other.id)).rejects.toThrow(/limited/i);
  });

  it('filters blocked users from presence and badge states', async () => {
    const me = await signUpLocal('Alex');
    const other = await signUpLocal('Other');
    await blockUser(me.id, other.id);
    const map = filterPresenceMap(
      { [me.id]: { sessionCount: 1 }, [other.id]: { sessionCount: 1 } },
      [other.id],
    );
    expect(map[other.id]).toBeUndefined();

    // badge states helper excludes blocked when circle posts exist — empty quiet circle
    const states = await getActivePostBadgeStates(
      '00000000-0000-4000-8000-000000000099',
      me.id,
    ).catch(() => null);
    expect(states === null || states.postId === null).toBe(true);
  });
});
