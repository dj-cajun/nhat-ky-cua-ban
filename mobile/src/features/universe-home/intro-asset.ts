/**
 * Intro video drop-in.
 * Place `mobile/assets/intro/universe-birth.mp4` — `npm run sync:intro` (or start/typecheck) regenerates the source.
 */
import { HAS_INTRO_VIDEO, INTRO_VIDEO_SOURCE } from './intro-asset.generated';

export { HAS_INTRO_VIDEO, INTRO_VIDEO_SOURCE };

export function getIntroVideoSource(): number | null {
  return HAS_INTRO_VIDEO ? INTRO_VIDEO_SOURCE : null;
}
