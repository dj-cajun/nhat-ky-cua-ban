/**
 * Static fixture data only — no repository / Supabase.
 *
 * Spatial placement is a private viewer layout:
 * - up to 3 close friends are manually selected (never inferred from visits/notes/presence)
 * - size + distance = private emphasis, not a public score
 * - no reciprocal notification of selection
 */

export type SpatialTier = 'close' | 'near' | 'distant';

export type SpatialMember = {
  id: string;
  displayName: string;
  circleName: string;
  tier: SpatialTier;
  /** Unique close-friend color; near/distant use muted dots */
  color: string;
  /** Polar placement from self (degrees, clockwise from top) */
  angleDeg: number;
  /** 0 = on self, 1 = stage edge — close < near < distant */
  radius: number;
  /** Visual depth cue for close friends (not a score) */
  depth?: 'front' | 'mid' | 'back';
  hasDiaryToday: boolean;
  vibe?: string;
};

export const e2Fixtures = {
  brand: 'Your Diary',
  me: {
    id: 'me',
    displayName: 'Alex',
    presenceLabel: 'you',
  },
  /** Private: viewer chose these three for “near my universe” — not engagement-ranked */
  closeFriendIds: ['friend-minseo', 'friend-junho', 'friend-sam'] as const,
  members: [
    {
      id: 'friend-minseo',
      displayName: 'Minseo',
      circleName: 'Brooklyn Friends',
      tier: 'close' as const,
      color: '#C97B63',
      angleDeg: -48,
      radius: 0.34,
      depth: 'front' as const,
      hasDiaryToday: true,
      vibe: 'warm dusk',
    },
    {
      id: 'friend-junho',
      displayName: 'Junho',
      circleName: 'Brooklyn Friends',
      tier: 'close' as const,
      color: '#6FA3C2',
      angleDeg: 128,
      radius: 0.4,
      depth: 'mid' as const,
      hasDiaryToday: true,
      vibe: 'cool air',
    },
    {
      id: 'friend-sam',
      displayName: 'Sam',
      circleName: 'Late Night',
      tier: 'close' as const,
      color: '#7FAF9A',
      angleDeg: 52,
      radius: 0.46,
      depth: 'back' as const,
      hasDiaryToday: false,
      vibe: 'soft lamp',
    },
    // Near — same-circle access, not in private close-3
    {
      id: 'near-casey',
      displayName: 'Casey',
      circleName: 'Brooklyn Friends',
      tier: 'near' as const,
      color: '#9AA7B8',
      angleDeg: -110,
      radius: 0.62,
      hasDiaryToday: true,
    },
    {
      id: 'near-riley',
      displayName: 'Riley',
      circleName: 'Study Quiet',
      tier: 'near' as const,
      color: '#9AA7B8',
      angleDeg: 200,
      radius: 0.66,
      hasDiaryToday: false,
    },
    // Distant — loose clusters by circle; names hidden until focus
    {
      id: 'far-a1',
      displayName: 'Minji',
      circleName: 'Brooklyn Friends',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: -18,
      radius: 0.86,
      hasDiaryToday: true,
    },
    {
      id: 'far-a2',
      displayName: 'Noah',
      circleName: 'Brooklyn Friends',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 8,
      radius: 0.9,
      hasDiaryToday: false,
    },
    {
      id: 'far-a3',
      displayName: 'Hana',
      circleName: 'Brooklyn Friends',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: -32,
      radius: 0.92,
      hasDiaryToday: false,
    },
    {
      id: 'far-b1',
      displayName: 'Theo',
      circleName: 'Late Night',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 78,
      radius: 0.88,
      hasDiaryToday: true,
    },
    {
      id: 'far-b2',
      displayName: 'Ivy',
      circleName: 'Late Night',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 98,
      radius: 0.93,
      hasDiaryToday: false,
    },
    {
      id: 'far-c1',
      displayName: 'Quinn',
      circleName: 'Study Quiet',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 168,
      radius: 0.87,
      hasDiaryToday: false,
    },
    {
      id: 'far-c2',
      displayName: 'Jules',
      circleName: 'Study Quiet',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 188,
      radius: 0.91,
      hasDiaryToday: true,
    },
    {
      id: 'far-c3',
      displayName: 'Sky',
      circleName: 'Study Quiet',
      tier: 'distant' as const,
      color: '#6B7384',
      angleDeg: 210,
      radius: 0.94,
      hasDiaryToday: false,
    },
  ] satisfies SpatialMember[],
  circles: [
    {
      id: 'circle-brooklyn',
      name: 'Brooklyn Friends',
      symbol: '◌',
      blurb: 'three quiet orbits',
    },
    {
      id: 'circle-late',
      name: 'Late Night',
      symbol: '✦',
      blurb: 'soft check-ins',
    },
    {
      id: 'circle-study',
      name: 'Study Quiet',
      symbol: '◦',
      blurb: 'focus together',
    },
  ],
  activeCircleId: 'circle-brooklyn',
  /** Circle graph screen still uses these three as spatial members */
  friends: [
    {
      id: 'friend-minseo',
      displayName: 'Minseo',
      vibe: 'warm dusk',
      x: 0.22,
      y: 0.42,
      colorKey: 'friendA' as const,
    },
    {
      id: 'friend-junho',
      displayName: 'Junho',
      vibe: 'cool air',
      x: 0.72,
      y: 0.38,
      colorKey: 'friendB' as const,
    },
    {
      id: 'friend-sam',
      displayName: 'Sam',
      vibe: 'soft lamp',
      x: 0.5,
      y: 0.62,
      colorKey: 'friendC' as const,
    },
  ],
  noticeTeaser: 'Friday picnic?',
  boardTeaser: 'alias board',
  friendToday: {
    ownerName: 'Minseo',
    mood: 'quiet bright',
    sentence: 'the light stayed on the desk a little longer today',
    music: 'Moonlight Drive · soft instrumental',
    photoLabel: 'afternoon window',
  },
  myToday: {
    ownerName: 'Alex',
    mood: 'slow clear',
    sentence: 'I kept one sentence and let the rest wait',
    music: 'Harbor Morning · lo-fi piano',
    photoLabel: 'my desk corner',
    writeHint: 'tap the scene to write today',
  },
  objects: {
    album: 'album',
    letter: 'letters',
    calendar: 'days',
    tomato: 'focus',
  },
  privacyNote:
    'Close-friend placement is private and manually chosen. Size and distance never mean online status, popularity, or reciprocal affection.',
} as const;

export type E2Circle = (typeof e2Fixtures.circles)[number];
export type E2Friend = (typeof e2Fixtures.friends)[number];

export function membersByTier(tier: SpatialTier): SpatialMember[] {
  return e2Fixtures.members.filter((m) => m.tier === tier);
}
