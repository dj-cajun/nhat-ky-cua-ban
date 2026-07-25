import { AppError, type AppErrorCode } from '@/types/domain';
import { getMessages } from '@/i18n';
function userMessages(): Record<AppErrorCode, string> {
  return {
  AUTH_REQUIRED: getMessages().errors.auth,
  SESSION_EXPIRED: getMessages().errors.sessionExpired,
  FORBIDDEN: getMessages().errors.forbidden,
  NOT_FOUND: getMessages().errors.notFound,
  CONFLICT: getMessages().errors.conflictDiary,
  VALIDATION: getMessages().errors.validation,
  RATE_LIMITED: getMessages().errors.rateLimited,
  OFFLINE: getMessages().errors.offline,
  UPLOAD_FAILED: getMessages().errors.uploadFailed,
  REALTIME_FAILED: getMessages().errors.realtimeFailed,
  EXTERNAL_SERVICE_FAILED: getMessages().errors.externalService,
  UNKNOWN: getMessages().errors.unknown,
};
}

export function messageForCode(code: AppErrorCode): string {
  return userMessages()[code] ?? getMessages().errors.unknown;
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
      : getMessages().errors.unknown;

  if (/offline|network|fetch|Failed to fetch|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return new AppError('OFFLINE', getMessages().errors.offline, true);
  }
  if (/JWT expired|session.*expired|refresh.*token/i.test(message)) {
    return new AppError('SESSION_EXPIRED', getMessages().errors.sessionExpired);
  }
  if (/JWT|not authenticated|Auth session|AUTH_REQUIRED/i.test(message)) {
    return new AppError('AUTH_REQUIRED', getMessages().errors.auth);
  }
  if (/permission|RLS|row-level|forbidden|42501|PGRST301/i.test(message)) {
    return new AppError('FORBIDDEN', getMessages().errors.forbidden);
  }
  if (/not found|PGRST116|404/i.test(message)) {
    return new AppError('NOT_FOUND', getMessages().errors.notFound);
  }
  if (/duplicate|unique|23505|conflict/i.test(message)) {
    return new AppError('CONFLICT', getMessages().errors.conflictDiary);
  }
  if (/rate|429|too many/i.test(message)) {
    return new AppError('RATE_LIMITED', getMessages().errors.rateLimited, true);
  }
  if (/upload|storage|multipart/i.test(message)) {
    return new AppError('UPLOAD_FAILED', getMessages().errors.uploadFailed, true);
  }
  if (/realtime|channel|websocket/i.test(message)) {
    return new AppError('REALTIME_FAILED', getMessages().errors.realtimeFailed, true);
  }
  if (/spotify|external|upstream|5\d\d/i.test(message)) {
    return new AppError('EXTERNAL_SERVICE_FAILED', getMessages().errors.externalService, true);
  }

  return new AppError('UNKNOWN', friendlyMessage(message));
}

function friendlyMessage(raw: string): string {
  if (!raw) return getMessages().errors.unknown;
  // Never surface SQL / permission / stack internals
  if (/permission denied|relation | foreig|stack|at Object\.|supabase/i.test(raw)) {
    return getMessages().errors.forbidden;
  }
  if (raw.includes('duplicate key')) return getMessages().errors.alreadyHandled;
  return raw.length > 160 ? getMessages().errors.unknown : raw;
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
