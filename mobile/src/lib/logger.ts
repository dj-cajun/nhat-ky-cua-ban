type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Never log diary bodies, messages, photo URLs, aliases, votes, or search terms */
export function log(level: LogLevel, event: string, attrs?: Record<string, string | number | boolean>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`[${event}]`, attrs ?? {});
  }
}

export function track(event: string, attrs?: Record<string, string | number | boolean>) {
  // Local logs until analytics is wired
  log('info', event, attrs);
}
