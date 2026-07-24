/**
 * Must match the final frame of `assets/intro/universe-birth.mp4`.
 * Video creators: keep the end sphere locked to these ratios.
 */
export const INTRO_HANDOFF = {
  /** Expected full intro length (seconds) */
  durationSec: 4,
  /** Start crossfade while video still shows the locked sphere */
  crossfadeStartSec: 3.5,
  crossfadeDurationSec: 0.5,
  /** After handoff: profile fade */
  profileFadeSec: 0.8,
  /** After profile: planets stagger */
  planetsStaggerSec: 1.0,
  /** Short cold-start when full intro already seen */
  shortAppearSec: 0.55,
  sphere: {
    /** Normalized center (0–1) of screen */
    cx: 0.5,
    cy: 0.48,
    /** Diameter as fraction of screen width */
    diameterRatio: 0.42,
    color: '#F0C36A',
    glow: '#FFE6A8',
    core: '#FFF6D6',
  },
  spaceBg: '#05060A',
} as const;

export type IntroMode = 'full' | 'short' | 'none';
