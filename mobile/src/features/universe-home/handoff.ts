/**
 * Must match the final frame of `assets/intro/universe-birth.mp4` (9:16).
 * Live 2D/3D starts at the cover-matched intro size, then settles smaller.
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
  /** Intro-size → home-size shrink after crossfade */
  settleDurationSec: 2.4,
  /** Short cold-start when full intro already seen */
  shortAppearSec: 0.55,
  sphere: {
    /** Normalized center (0–1) of the 9:16 video frame */
    cx: 0.5,
    cy: 0.48,
    /** Diameter as fraction of **video** width (not necessarily viewport width) */
    diameterRatio: 0.42,
    /**
     * Settled home diameter as fraction of **viewport** width.
     * Smaller than the cover-matched intro orb → shrink effect after handoff.
     */
    homeDiameterRatio: 0.34,
    color: '#F0C36A',
    glow: '#FFE6A8',
    core: '#FFF6D6',
  },
  spaceBg: '#05060A',
} as const;

export type IntroMode = 'full' | 'short' | 'none';
