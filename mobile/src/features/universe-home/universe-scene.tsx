import type { CircleSummary, Profile } from '@/types/domain';
import { FallbackUniverse } from './fallback-universe';

export type UniverseSceneProps = {
  profile: Profile;
  circles: CircleSummary[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  /** Prefer 2D glow spheres (no GL). */
  forceFallback?: boolean;
};

/**
 * Default / web: same handoff pose via 2D glow spheres.
 * Native overrides this file with `universe-scene.native.tsx` (R3F).
 */
export function UniverseScene3D(props: UniverseSceneProps) {
  return <FallbackUniverse {...props} />;
}
