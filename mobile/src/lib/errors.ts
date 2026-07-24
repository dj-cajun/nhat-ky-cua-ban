import { AppError, type AppErrorCode } from '@/types/domain';
import { en } from '@/i18n/en';

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : en.errors.unknown;

  if (/network|fetch|Failed to fetch/i.test(message)) {
    return new AppError('NETWORK', en.errors.network);
  }
  if (/JWT|not authenticated|Auth session/i.test(message)) {
    return new AppError('AUTH_REQUIRED', en.errors.auth);
  }
  if (/permission|RLS|row-level|forbidden|42501/i.test(message)) {
    return new AppError('FORBIDDEN', en.errors.forbidden);
  }
  if (/duplicate|unique|23505/i.test(message)) {
    return new AppError('CONFLICT', en.errors.conflictDiary);
  }
  if (/rate|429/i.test(message)) {
    return new AppError('RATE_LIMITED', en.errors.rateLimited);
  }

  return new AppError('UNKNOWN', friendlyMessage(message));
}

function friendlyMessage(raw: string): string {
  if (raw.includes('duplicate key')) return en.errors.alreadyHandled;
  return en.errors.unknown;
}

export function assertNever(code: AppErrorCode): never {
  throw new AppError(code, 'Unsupported error code.');
}
