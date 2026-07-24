/**
 * Circle posts — demo uses local repository mirror of SECURITY DEFINER RPCs.
 * Production path: supabase.rpc only (never direct DML on posts/responses).
 */
import {
  acknowledgeCircleNotice as localAck,
  canCreateCirclePost as localCanCreate,
  closePost as localClose,
  createCirclePost as localCreate,
  getActivePost as localActive,
  getCirclePostSummary as localSummary,
  listPollOptions as localOptions,
  respondCirclePoll as localPoll,
} from '@/features/local/repository';
import { validateCreateCirclePost } from './circle-post.validation';
import type {
  CirclePost,
  CirclePostSummary,
  CreateCirclePostInput,
  PollOption,
} from './circle-post.types';

export async function createCirclePost(input: CreateCirclePostInput): Promise<CirclePost> {
  validateCreateCirclePost(input);
  return localCreate(input);
}

export async function getActiveCirclePost(circleId: string): Promise<CirclePost | null> {
  return localActive(circleId);
}

export async function listCirclePollOptions(postId: string): Promise<PollOption[]> {
  return localOptions(postId);
}

export async function acknowledgeCircleNotice(input: {
  postId: string;
  userId: string;
}): Promise<{ responded: true; postId: string }> {
  return localAck(input);
}

export async function respondCirclePoll(input: {
  postId: string;
  userId: string;
  optionId: string;
}): Promise<{ responded: true; postId: string; optionId: string }> {
  return localPoll(input);
}

export async function getCirclePostSummary(
  postId: string,
  viewerId: string,
): Promise<CirclePostSummary> {
  return localSummary(postId, viewerId);
}

export async function closeCirclePost(postId: string, actorId: string): Promise<void> {
  return localClose(postId, actorId);
}

export async function canCreateCirclePost(
  circleId: string,
  userId: string,
): Promise<boolean> {
  return localCanCreate(circleId, userId);
}
