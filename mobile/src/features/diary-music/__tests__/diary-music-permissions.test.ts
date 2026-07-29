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
  applyDiarySpotifyTrackLocal,
  blockUser,
  canViewDiary,
  clearLocalDb,
  getDiaryMusicLocal,
  removeDiaryMusicLocal,
  resolveSpotifyTrackLocal,
  searchSpotifyTracksLocal,
  signUpLocal,
  upsertDiary,
} from '@/features/local/repository';

describe('diary music permissions mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('searches demo catalog and rejects playlist-shaped ids via resolve', async () => {
    const hits = await searchSpotifyTracksLocal({ query: 'season' });
    expect(hits[0]?.trackName).toMatch(/season/i);
    expect(await resolveSpotifyTrackLocal('https://open.spotify.com/album/x')).toBeNull();
  });

  it('only owner can set/remove; viewers follow diary visibility', async () => {
    const a = await signUpLocal('Alex');
    const b = await signUpLocal('Blake');
    const entry = await upsertDiary({
      userId: a.id,
      shortText: 'hello',
      visibilityMode: 'private',
    });
    const track = (await searchSpotifyTracksLocal({ query: 'quiet' }))[0];
    await applyDiarySpotifyTrackLocal({
      diaryEntryId: entry.id,
      actorId: a.id,
      track,
    });
    await expect(
      applyDiarySpotifyTrackLocal({
        diaryEntryId: entry.id,
        actorId: b.id,
        track,
      }),
    ).rejects.toThrow(/can't edit|can’t edit/i);

    await expect(getDiaryMusicLocal(entry.id, b.id)).rejects.toThrow(/can't view|can’t view/i);

    const open = await upsertDiary({
      userId: a.id,
      shortText: 'shared',
      visibilityMode: 'all_circles',
    });
    // without shared circle, canViewDiary still false for all_circles
    expect(await canViewDiary(b.id, a.id, open)).toBe(false);

    await removeDiaryMusicLocal(entry.id, a.id);
    await expect(getDiaryMusicLocal(entry.id, a.id)).resolves.toBeNull();
  });

  it('blocks music access when users block each other', async () => {
    const a = await signUpLocal('Alex');
    const b = await signUpLocal('Blake');
    const entry = await upsertDiary({
      userId: a.id,
      shortText: 'hi',
      visibilityMode: 'all_circles',
    });
    const track = (await searchSpotifyTracksLocal({ query: 'night' }))[0];
    await applyDiarySpotifyTrackLocal({
      diaryEntryId: entry.id,
      actorId: a.id,
      track,
    });
    await blockUser(b.id, a.id);
    await expect(getDiaryMusicLocal(entry.id, b.id)).rejects.toThrow(/can't view|can’t view/i);
  });
});
