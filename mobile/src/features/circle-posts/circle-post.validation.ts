import { AppError } from '@/types/domain';
import type { CirclePostType } from './circle-post.types';

export const POST_LIMITS = {
  titleMin: 1,
  titleMax: 80,
  bodyMax: 300,
  optionMin: 1,
  optionMax: 40,
  optionsMin: 2,
  optionsMax: 4,
  minActiveMs: 10 * 60 * 1000,
  maxActiveMs: 7 * 24 * 60 * 60 * 1000,
  defaultActiveMs: 24 * 60 * 60 * 1000,
} as const;

export function validateCreateCirclePost(input: {
  type: CirclePostType;
  title: string;
  body?: string;
  closesAt: string;
  options?: string[];
}): void {
  const title = input.title.trim();
  if (title.length < POST_LIMITS.titleMin || title.length > POST_LIMITS.titleMax) {
    throw new AppError('VALIDATION', 'Title must be 1–80 characters.');
  }
  if (input.body != null && input.body.length > POST_LIMITS.bodyMax) {
    throw new AppError('VALIDATION', 'Body must be at most 300 characters.');
  }

  const closes = new Date(input.closesAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(closes) || closes <= now) {
    throw new AppError('VALIDATION', 'Choose an end time in the future.');
  }
  if (closes < now + POST_LIMITS.minActiveMs) {
    throw new AppError('VALIDATION', 'Active period must be at least 10 minutes.');
  }
  if (closes > now + POST_LIMITS.maxActiveMs) {
    throw new AppError('VALIDATION', 'Active period cannot exceed 7 days.');
  }

  if (input.type === 'notice') {
    if (input.options && input.options.filter((o) => o.trim()).length > 0) {
      throw new AppError('VALIDATION', 'Notices cannot have poll options.');
    }
    return;
  }

  const opts = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (opts.length < POST_LIMITS.optionsMin || opts.length > POST_LIMITS.optionsMax) {
    throw new AppError('VALIDATION', 'Polls need 2–4 options.');
  }
  if (new Set(opts).size !== opts.length) {
    throw new AppError('VALIDATION', 'Poll options must be unique.');
  }
  for (const label of opts) {
    if (label.length < POST_LIMITS.optionMin || label.length > POST_LIMITS.optionMax) {
      throw new AppError('VALIDATION', 'Each option must be 1–40 characters.');
    }
  }
}

export function defaultClosesAt(ms = POST_LIMITS.defaultActiveMs): string {
  return new Date(Date.now() + ms).toISOString();
}
