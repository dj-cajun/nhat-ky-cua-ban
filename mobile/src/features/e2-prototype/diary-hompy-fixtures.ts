import type { DiaryMusicCard } from '@/features/diary-music/diary-music.types';
import type {
  FreeBoardRow,
  GuestbookRow,
  HompyCirclePreview,
} from '@/features/local/repository';
import { e2Fixtures } from '@/features/e2-prototype/fixtures';
import type { CircleSummary, DiaryEntry, Profile } from '@/types/domain';

const now = new Date().toISOString();
const today = now.slice(0, 10);

export const e2DiaryMe: Profile = {
  id: 'me',
  displayName: e2Fixtures.me.displayName,
  status: 'active',
  createdAt: now,
};

export const e2DiaryFriend: Profile = {
  id: 'friend-minseo',
  displayName: e2Fixtures.friendToday.ownerName,
  status: 'active',
  createdAt: now,
};

export const e2DiaryCircles: CircleSummary[] = e2Fixtures.circles.map((c) => ({
  id: c.id,
  name: c.name,
  color: '#7C9A8E',
  symbol: c.symbol,
  activeMemberCount: 3,
  wroteTodayCount: 1,
  hasActiveNotice: false,
}));

function entryFor(
  userId: string,
  mood: DiaryEntry['mood'],
  text: string,
): DiaryEntry {
  return {
    id: `entry-${userId}`,
    userId,
    entryDate: today,
    timezone: 'America/New_York',
    mood,
    tenCharText: text.slice(0, 10),
    shortText: text,
    visibilityMode: 'all_circles',
    createdAt: now,
    updatedAt: now,
  };
}

export const e2FriendEntry = entryFor(
  e2DiaryFriend.id,
  'calm',
  e2Fixtures.friendToday.sentence,
);

export const e2MyEntry = entryFor(
  e2DiaryMe.id,
  'grateful',
  e2Fixtures.myToday.sentence,
);

/** Prototype cork preview — empty slots use cork_empty sprites. */
export const e2CorkSlots: Array<string | null> = [null, null, null];

export const e2Guestbook: GuestbookRow[] = [
  {
    id: 'gb1',
    ownerUserId: e2DiaryFriend.id,
    authorUserId: e2DiaryMe.id,
    body: 'the light looked warm today',
    hidden: false,
    createdAt: now,
  },
];

export const e2GuestbookAuthors: Record<string, string> = {
  [e2DiaryMe.id]: e2DiaryMe.displayName,
};

export const e2FreeBoard: FreeBoardRow[] = [
  {
    id: 'fb1',
    ownerUserId: e2DiaryFriend.id,
    authorUserId: e2DiaryFriend.id,
    body: 'quiet afternoon notes',
    hidden: false,
    createdAt: now,
  },
];

export const e2FreeBoardAuthors: Record<string, string> = {
  [e2DiaryFriend.id]: e2DiaryFriend.displayName,
};

export const e2CircleBoard = {
  circleId: e2DiaryCircles[0]!.id,
  circleName: e2DiaryCircles[0]!.name,
};

export const e2CircleBoardItems: HompyCirclePreview[] = [
  {
    id: 'cb1',
    aliasName: 'soft breeze',
    body: 'Friday picnic?',
    createdAt: now,
  },
];

export function e2MusicCard(entryId: string, track: string, artist: string): DiaryMusicCard {
  return {
    id: `music-${entryId}`,
    diaryEntryId: entryId,
    externalTrackId: 'demo',
    spotifyUri: 'spotify:track:demo',
    externalUrl: 'https://open.spotify.com',
    trackName: track,
    artistNames: [artist],
    albumName: null,
    artworkUrl: null,
    durationMs: null,
    explicit: false,
  };
}
