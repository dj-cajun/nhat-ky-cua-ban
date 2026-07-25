import { useEffect } from 'react';
import { syncVerifiedBadges } from './verified-response.service';
import { useVerifiedResponseStore } from './verified-response.store';

/** Explicit hook when a screen only needs verified badge hydration */
export function useVerifiedResponseBadges(input: {
  circleId: string | undefined;
  userId: string | null;
  enabled?: boolean;
}) {
  const map = useVerifiedResponseStore((s) => s.map);
  const activePostId = useVerifiedResponseStore((s) => s.activePostId);

  useEffect(() => {
    if (!input.circleId || !input.userId || input.enabled === false) return;
    void syncVerifiedBadges({
      circleId: input.circleId,
      viewerId: input.userId,
    });
  }, [input.circleId, input.userId, input.enabled]);

  return { map, activePostId };
}
