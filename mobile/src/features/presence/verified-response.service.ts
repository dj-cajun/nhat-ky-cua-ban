import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getActivePostBadgeStates as localBadgeStates } from '@/features/local/repository';
import { useVerifiedResponseStore } from './verified-response.store';
import type { ActivePostBadgeStates } from './verified-response.types';

export {
  emitLocalVerifiedEvent as publishLocalVerifiedEvent,
  parseVerifiedBroadcastPayload,
  subscribeLocalVerifiedBus,
} from './verified-response.bus';

export async function fetchActivePostBadgeStates(
  circleId: string,
  viewerId: string,
): Promise<ActivePostBadgeStates> {
  if (!isSupabaseConfigured) {
    return localBadgeStates(circleId, viewerId);
  }

  const { data, error } = await supabase.rpc('get_active_post_badge_states', {
    target_circle_id: circleId,
  });
  if (error) throw error;

  const raw = data as {
    postId?: string | null;
    respondedUserIds?: string[];
  };

  return {
    postId: raw.postId ?? null,
    respondedUserIds: Array.isArray(raw.respondedUserIds) ? raw.respondedUserIds : [],
  };
}

export async function syncVerifiedBadges(input: {
  circleId: string;
  viewerId: string;
}): Promise<ActivePostBadgeStates> {
  const store = useVerifiedResponseStore.getState();
  const states = await fetchActivePostBadgeStates(input.circleId, input.viewerId);
  store.resetForCircle(input.circleId, states.postId);
  store.hydrateFromRpc(states);
  return states;
}
