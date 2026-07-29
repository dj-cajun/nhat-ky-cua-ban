import type { VerifiedResponseMap } from './verified-response.types';

export type MemberBadge = 'green' | 'orange' | null;

/**
 * Phase 6.5 — Presence proves "here"; verified map proves "responded".
 * Spoofed Presence `responded` is irrelevant.
 */
export function deriveMemberBadge(input: {
  isPresent: boolean;
  activePostId: string | null;
  verifiedResponse?: {
    postId: string;
    responded: true;
  } | null;
}): MemberBadge {
  if (!input.isPresent) return null;

  if (
    input.activePostId &&
    input.verifiedResponse?.responded === true &&
    input.verifiedResponse.postId === input.activePostId
  ) {
    return 'orange';
  }

  return 'green';
}

export function getMemberBadgeFromMaps(input: {
  presenceMap: { [userId: string]: { sessionCount: number } };
  verifiedMap: VerifiedResponseMap;
  userId: string;
  activePostId: string | null;
}): MemberBadge {
  const sessions = input.presenceMap[input.userId]?.sessionCount ?? 0;
  return deriveMemberBadge({
    isPresent: sessions > 0,
    activePostId: input.activePostId,
    verifiedResponse: input.verifiedMap[input.userId] ?? null,
  });
}

/** @deprecated Prefer deriveMemberBadge — kept for transition */
export function getMemberBadge(
  presence:
    | {
        state?: string;
        activePostId?: string | null;
      }
    | null
    | undefined,
  currentPostId: string | null,
  verified?: { postId: string; responded: true } | null,
): MemberBadge {
  if (!presence) return null;
  return deriveMemberBadge({
    isPresent: true,
    activePostId: currentPostId,
    verifiedResponse: verified ?? null,
  });
}
