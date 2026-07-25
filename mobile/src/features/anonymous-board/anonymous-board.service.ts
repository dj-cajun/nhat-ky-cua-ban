import {
  blockAnonymousPostAuthor as localBlockAuthor,
  createAnonymousPost as localCreate,
  deleteAnonymousPost as localDelete,
  getAnonymousCirclePosts as localList,
  getOrCreateCircleAlias as localAlias,
} from '@/features/local/repository';
import { validateAnonymousPostBody } from './anonymous-board.validation';
import type { AnonymousPostsPage, CircleAlias } from './anonymous-board.types';

export async function getOrCreateCircleAlias(
  circleId: string,
  userId: string,
): Promise<CircleAlias> {
  return localAlias(circleId, userId);
}

export async function createAnonymousPost(input: {
  circleId: string;
  userId: string;
  body: string;
  clientRequestId?: string;
}) {
  validateAnonymousPostBody(input.body);
  return localCreate(input);
}

export async function getAnonymousCirclePosts(input: {
  circleId: string;
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<AnonymousPostsPage> {
  return localList(input);
}

export async function getAnonymousCirclePreview(
  circleId: string,
  viewerId: string,
): Promise<AnonymousPostsPage> {
  return localList({ circleId, viewerId, limit: 3 });
}

export async function deleteAnonymousPost(postId: string, userId: string): Promise<void> {
  return localDelete(postId, userId);
}

export async function blockAnonymousPostAuthor(
  postId: string,
  actorId: string,
): Promise<void> {
  return localBlockAuthor(postId, actorId);
}
