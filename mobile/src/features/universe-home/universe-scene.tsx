import type { CircleSummary, Profile } from '@/types/domain';
import { FallbackUniverse, type UniverseGraphFriend } from './fallback-universe';

export type UniverseSceneProps = {
  profile: Profile;
  circles: CircleSummary[];
  friends?: UniverseGraphFriend[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  onPressFriend?: (userId: string) => void;
  /** Prefer 2D glow spheres (no GL). */
  forceFallback?: boolean;
  /** Shrink intro → home after handoff. Off for tab-return. */
  animateSettle?: boolean;
};

/**
 * Universe home scene — Obsidian-like knowledge graph (2D).
 * Native package still includes three/R3F for future GL experiments;
 * the live product path is this graph on every platform.
 */
export function UniverseScene3D(props: UniverseSceneProps) {
  return <FallbackUniverse {...props} />;
}
