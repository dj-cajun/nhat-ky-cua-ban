import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

/** After blocking someone — drop personal content caches for both sides. */
export async function invalidateAfterBlock(input: {
  actorId: string;
  targetUserId: string;
  sharedCircleIds?: string[];
}): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.profile(input.targetUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.diary(input.targetUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.album(input.targetUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.guestbook(input.targetUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.messagesInbox(input.actorId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.messagesSent(input.actorId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.blocks(input.actorId) }),
    ...(input.sharedCircleIds ?? []).flatMap((circleId) => [
      queryClient.invalidateQueries({ queryKey: queryKeys.presence(circleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.anonymousBoard(circleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.circleHome(circleId) }),
    ]),
  ]);
}

export async function invalidateAfterCircleLeave(input: {
  userId: string;
  circleId: string;
}): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.universe(input.userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.circle(input.circleId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.circleHome(input.circleId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.circleMembers(input.circleId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.circleNotice(input.circleId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.anonymousBoard(input.circleId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.presence(input.circleId) }),
  ]);
}

export async function invalidateAfterReportHide(input: {
  userId: string;
  targetType: string;
  targetId: string;
  circleId?: string;
}): Promise<void> {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.reports(input.userId) }),
  ];
  if (input.targetType === 'anonymous_post' && input.circleId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.anonymousBoard(input.circleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.anonymousPreview(input.circleId) }),
    );
  }
  if (input.targetType === 'message') {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.messagesInbox(input.userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.message(input.targetId) }),
    );
  }
  if (input.targetType === 'diary' || input.targetType === 'diary_entry') {
    tasks.push(queryClient.invalidateQueries({ queryKey: ['diary'] }));
  }
  await Promise.all(tasks);
}

export async function invalidateAfterSpotifyChange(input: {
  ownerUserId: string;
  entryId: string;
  entryDate?: string;
}): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.diary(input.ownerUserId, input.entryDate) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.diaryMusic(input.entryId) }),
  ]);
}

/** Full wipe on logout / account switch — prevent cross-account flash. */
export async function clearAllQueryCaches(): Promise<void> {
  queryClient.clear();
}
