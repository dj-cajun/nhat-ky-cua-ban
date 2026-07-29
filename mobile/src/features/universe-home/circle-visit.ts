import { router, type Href } from 'expo-router';

/**
 * Remembers which circle graph the user is visiting so diary → back
 * always returns to that graph even if URL query params are dropped
 * (common with Expo Router + shared `/diary/[userId]` screen).
 */
let activeCircleGraphId: string | null = null;

export function rememberCircleGraph(circleId: string) {
  activeCircleGraphId = circleId;
}

export function clearCircleGraph() {
  activeCircleGraphId = null;
}

export function peekCircleGraph(): string | null {
  return activeCircleGraphId;
}

export function resolveCircleGraphId(fromParam?: string | string[]): string | null {
  const raw = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  if (raw && raw.length > 0) return raw;
  return activeCircleGraphId;
}

/** Prefer replace on web — dismissTo/back stacks get weird across tabs. */
function go(href: Href) {
  try {
    router.replace(href);
  } catch {
    router.push(href);
  }
}

/** Universe → circle friends graph */
export function openCircleGraph(circleId: string) {
  rememberCircleGraph(circleId);
  router.push(`/circles/${circleId}/graph`);
}

/** Circle graph → friend (or self) mini-hompy, keeping return target */
export function openDiaryFromCircle(userId: string, circleId: string) {
  rememberCircleGraph(circleId);
  router.push(`/diary/${userId}?fromCircleId=${encodeURIComponent(circleId)}`);
}

/** Friend/my home → circle graph (always, not universe) */
export function backToCircleGraph(fromParam?: string | string[]) {
  const circleId = resolveCircleGraphId(fromParam);
  if (circleId) {
    rememberCircleGraph(circleId);
    go(`/circles/${circleId}/graph` as Href);
    return;
  }
  go('/(tabs)/universe');
}

/** Circle graph → My Universe (circles wrapping A) */
export function backToUniverseCircles() {
  clearCircleGraph();
  go('/(tabs)/universe');
}
