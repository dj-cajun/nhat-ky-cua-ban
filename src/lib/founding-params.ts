const PENDING_JOIN_KEY = 'founding_pending_join_token';

export type FoundingUrlIntent = {
  joinToken: string | null;
};

/** URL: ?founding=join&token=... — Zalo 단톡 초대 링크 */
export function parseFoundingUrl(): FoundingUrlIntent {
  const params = new URLSearchParams(window.location.search);
  const founding = params.get('founding');
  const joinToken = founding === 'join' ? params.get('token') : null;

  if (joinToken) {
    stashJoinToken(joinToken);
    params.delete('founding');
    params.delete('token');
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', next);
  }

  return { joinToken };
}

export function stashJoinToken(token: string): void {
  sessionStorage.setItem(PENDING_JOIN_KEY, token);
}

export function peekJoinToken(): string | null {
  return sessionStorage.getItem(PENDING_JOIN_KEY);
}

export function consumeJoinToken(): string | null {
  const token = sessionStorage.getItem(PENDING_JOIN_KEY);
  sessionStorage.removeItem(PENDING_JOIN_KEY);
  return token;
}
