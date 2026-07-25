/**
 * Tab-return detection must NOT use mount counts (React Strict Mode remounts
 * look like a second visit and were skipping the intro).
 *
 * Call `markUniverseTabBlurred()` from a navigation 'blur' listener only.
 */
let blurredOnce = false;

export function markUniverseTabBlurred(): void {
  blurredOnce = true;
}

export function isUniverseTabReturn(): boolean {
  return blurredOnce;
}

/** Test helper */
export function resetUniverseVisitSession(): void {
  blurredOnce = false;
}

/** @deprecated use isUniverseTabReturn + markUniverseTabBlurred */
export function consumeUniverseVisitKind(): 'cold' | 'tab-return' {
  return blurredOnce ? 'tab-return' : 'cold';
}
