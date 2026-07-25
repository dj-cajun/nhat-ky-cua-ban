/** Static fixture data only — no repository / Supabase. */
export const e2Fixtures = {
  brand: 'Your Diary',
  me: {
    id: 'me',
    displayName: 'Alex',
    presenceLabel: 'you',
  },
  circles: [
    {
      id: 'circle-brooklyn',
      name: 'Brooklyn Friends',
      symbol: '◌',
      blurb: 'three quiet orbits',
      x: 0.18,
      y: 0.28,
    },
    {
      id: 'circle-late',
      name: 'Late Night',
      symbol: '✦',
      blurb: 'soft check-ins',
      x: 0.78,
      y: 0.36,
    },
    {
      id: 'circle-study',
      name: 'Study Quiet',
      symbol: '◦',
      blurb: 'focus together',
      x: 0.62,
      y: 0.68,
    },
  ],
  activeCircleId: 'circle-brooklyn',
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
} as const;

export type E2Circle = (typeof e2Fixtures.circles)[number];
export type E2Friend = (typeof e2Fixtures.friends)[number];
