import { resetAllFoundings } from '@/lib/class-founding';

export type FoundingUrlIntent = {
  demo: boolean;
  joinToken: string | null;
};

/** URL: ?founding=demo 또는 ?founding=join&token=... */
export function parseFoundingUrl(): FoundingUrlIntent {
  const params = new URLSearchParams(window.location.search);
  const founding = params.get('founding');
  const joinToken = founding === 'join' ? params.get('token') : null;
  const demo = founding === 'demo';

  if (demo || joinToken) {
    if (demo) {
      resetAllFoundings();
    }
    params.delete('founding');
    params.delete('token');
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', next);
  }

  return { demo, joinToken };
}
