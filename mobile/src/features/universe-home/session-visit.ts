/** First My Universe focus this JS session = cold; later focuses = tab return. */
let visitedThisSession = false;

export function consumeUniverseVisitKind(): 'cold' | 'tab-return' {
  if (!visitedThisSession) {
    visitedThisSession = true;
    return 'cold';
  }
  return 'tab-return';
}

/** Test helper */
export function resetUniverseVisitSession(): void {
  visitedThisSession = false;
}
