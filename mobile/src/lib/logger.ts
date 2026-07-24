type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 본문·메시지·사진 URL·가명·투표 선택·검색어는 절대 기록하지 않는다 */
export function log(level: LogLevel, event: string, attrs?: Record<string, string | number | boolean>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`[${event}]`, attrs ?? {});
  }
}

export function track(event: string, attrs?: Record<string, string | number | boolean>) {
  // 분석 도구 연동 전까지 로컬 로그만
  log('info', event, attrs);
}
