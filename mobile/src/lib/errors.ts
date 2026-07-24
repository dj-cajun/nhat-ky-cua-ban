import { AppError, type AppErrorCode } from '@/types/domain';

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : '알 수 없는 오류가 발생했어요.';

  if (/network|fetch|Failed to fetch/i.test(message)) {
    return new AppError('NETWORK', '네트워크 연결을 확인해 주세요.');
  }
  if (/JWT|not authenticated|Auth session/i.test(message)) {
    return new AppError('AUTH_REQUIRED', '로그인이 필요해요.');
  }
  if (/permission|RLS|row-level|forbidden|42501/i.test(message)) {
    return new AppError('FORBIDDEN', '이 작업을 할 권한이 없어요.');
  }
  if (/duplicate|unique|23505/i.test(message)) {
    return new AppError('CONFLICT', '이미 같은 날짜의 기록이 있어요. 기존 기록을 수정할까요?');
  }
  if (/rate|429/i.test(message)) {
    return new AppError('RATE_LIMITED', '조금 뒤에 다시 시도해 주세요.');
  }

  return new AppError('UNKNOWN', friendlyMessage(message));
}

function friendlyMessage(raw: string): string {
  if (raw.includes('duplicate key')) return '이미 처리된 요청이에요.';
  return '잠시 후 다시 시도해 주세요.';
}

export function assertNever(code: AppErrorCode): never {
  throw new AppError(code, '지원하지 않는 오류 코드입니다.');
}
