/**
 * Phase E2 static prototype tokens — continuous night-space language.
 * Not production theme. Avoids purple glow / cream+terracotta / newspaper stacks.
 */
export const e2 = {
  space: {
    void: '#070B14',
    deep: '#0E1526',
    mist: '#1A2438',
    haze: '#24314A',
    star: '#D7DEEA',
    starDim: 'rgba(215,222,234,0.35)',
    dust: 'rgba(180,198,220,0.12)',
  },
  brand: {
    wordmark: '#F4EFE6',
    whisper: 'rgba(244,239,230,0.62)',
  },
  self: {
    orbCore: '#F7E7C8',
    orbRim: '#E8C78A',
    orbGlow: 'rgba(232,199,138,0.28)',
    label: '#F4EFE6',
  },
  circle: {
    wash: '#17362F',
    washEdge: '#0F241F',
    accent: '#7FAF9A',
    accentSoft: 'rgba(127,175,154,0.35)',
    ink: '#E7F2EC',
    muted: 'rgba(231,242,236,0.7)',
    friendA: '#F0D3B0',
    friendB: '#B8D4E8',
    friendC: '#E8C4D4',
    object: 'rgba(231,242,236,0.14)',
    objectBorder: 'rgba(231,242,236,0.28)',
  },
  friendDiary: {
    wash: '#241820',
    washEdge: '#140E14',
    scene: '#3A2430',
    ink: '#F8EDE8',
    muted: 'rgba(248,237,232,0.72)',
    mood: '#E8B4A0',
    musicBar: 'rgba(248,237,232,0.16)',
    object: 'rgba(248,237,232,0.12)',
    objectBorder: 'rgba(248,237,232,0.26)',
  },
  myDiary: {
    wash: '#152028',
    washEdge: '#0C141A',
    scene: '#1E3340',
    ink: '#EAF3F6',
    muted: 'rgba(234,243,246,0.72)',
    mood: '#9FCBD8',
    musicBar: 'rgba(234,243,246,0.16)',
    object: 'rgba(234,243,246,0.12)',
    objectBorder: 'rgba(234,243,246,0.26)',
    tomato: '#D46A5C',
    tomatoSoft: 'rgba(212,106,92,0.22)',
  },
  type: {
    display: 'Fraunces_600SemiBold',
    displayItalic: 'Fraunces_500Medium_Italic',
    body: 'Outfit_400Regular',
    bodyMed: 'Outfit_500Medium',
    bodySemi: 'Outfit_600SemiBold',
  },
  spacePad: 20,
  orbSelf: 112,
  /** Close friends — large unique orbs nearest to self */
  orbClose: 56,
  orbCloseFront: 64,
  orbCloseBack: 48,
  /** Near members — medium graph nodes */
  orbNear: 22,
  /** Distant members — small dots */
  orbDistant: 9,
  orbCircle: 72,
  orbFriend: 64,
  objectSize: 52,
  linkFaint: 'rgba(215,222,234,0.14)',
  linkFocus: 'rgba(232,199,138,0.55)',
} as const;
