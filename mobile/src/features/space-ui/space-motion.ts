/**
 * E4 intentional motion tokens — presence/hierarchy, not decoration noise.
 * Keep durations calm; avoid bounce/glow spam.
 */
export const spaceMotion = {
  /** Intro handoff already owned by INTRO_HANDOFF */
  breathPeriodMs: 2400,
  breathScale: 1.035,
  focusPullMs: 380,
  focusCardMs: 220,
  roomEnterMs: 520,
  roomStaggerMs: 70,
  sceneEnterMs: 480,
  objectPressMs: 120,
} as const;
