import { AppError, type AppErrorCode } from '@/types/domain';
import { en } from '@/i18n/en';

const USER_MESSAGES: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: en.errors.auth,
  SESSION_EXPIRED: en.errors.sessionExpired,
  FORBIDDEN: en.errors.forbidden,
  NOT_FOUND: en.errors.notFound,
  CONFLICT: en.errors.conflictDiary,
  VALIDATION: en.errors.validation,
  RATE_LIMITED: en.errors.rateLimited,
  OFFLINE: en.errors.offline,
  UPLOAD_FAILED: en.errors.uploadFailed,
  REALTIME_FAILED: en.errors.realtimeFailed,
  EXTERNAL_SERVICE_FAILED: en.errors.externalService,
  UNKNOWN: en.errors.unknown,
};

export function messageForCode(code: AppErrorCode): string {
  return USER_MESSAGES[code] ?? en.errors.unknown;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return new AppError(
      error.code,
      friendlyMessage(error.message) || messageForCode(error.code),
      error.retryable,
    );
  }

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : en.errors.unknown;

  if (/offline|network|fetch|Failed to fetch|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return new AppError('OFFLINE', en.errors.offline, true);
  }
  if (/JWT expired|session.*expired|refresh.*token/i.test(message)) {
    return new AppError('SESSION_EXPIRED', en.errors.sessionExpired);
  }
  if (/JWT|not authenticated|Auth session|AUTH_REQUIRED/i.test(message)) {
    return new AppError('AUTH_REQUIRED', en.errors.auth);
  }
  if (/permission|RLS|row-level|forbidden|42501|PGRST301/i.test(message)) {
    return new AppError('FORBIDDEN', en.errors.forbidden);
  }
  if (/not found|PGRST116|404/i.test(message)) {
    return new AppError('NOT_FOUND', en.errors.notFound);
  }
  if (/duplicate|unique|23505|conflict/i.test(message)) {
    return new AppError('CONFLICT', en.errors.conflictDiary);
  }
  if (/rate|429|too many/i.test(message)) {
    return new AppError('RATE_LIMITED', en.errors.rateLimited, true);
  }
  if (/upload|storage|multipart/i.test(message)) {
    return new AppError('UPLOAD_FAILED', en.errors.uploadFailed, true);
  }
  if (/realtime|channel|websocket/i.test(message)) {
    return new AppError('REALTIME_FAILED', en.errors.realtimeFailed, true);
  }
  if (/spotify|external|upstream|5\d\d/i.test(message)) {
    return new AppError('EXTERNAL_SERVICE_FAILED', en.errors.externalService, true);
  }

  return new AppError('UNKNOWN', friendlyMessage(message));
}

function friendlyMessage(raw: string): string {
  if (!raw) return en.errors.unknown;
  // Never surface SQL / permission / stack internals
  if (/permission denied|relation | foreig|stack|at Object\.|supabase/i.test(raw)) {
    return en.errors.forbidden;
  }
  if (raw.includes('duplicate key')) return en.errors.alreadyHandled;
  return raw.length > 160 ? en.errors.unknown : raw;
}

export function assertNever(code: AppErrorCode): never {
  throw new AppError(code, 'Unsupported error code.');
}

export function isRetryableError(error: unknown): boolean {
  const app = toAppError(error);
  if (app.retryable) return true;
  return (
    app.code === 'OFFLINE' ||
    app.code === 'RATE_LIMITED' ||
    app.code === 'UPLOAD_FAILED' ||
    app.code === 'REALTIME_FAILED' ||
    app.code === 'EXTERNAL_SERVICE_FAILED'
  );
}
