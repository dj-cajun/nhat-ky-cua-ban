import { AnalyticsEvents, type SafeAnalyticsAttrs } from '@/lib/analytics-events';
import { secureLog } from '@/lib/secure-logger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Never log diary bodies, messages, photo URLs, aliases, votes, or search terms */
export function log(level: LogLevel, event: string, attrs?: Record<string, string | number | boolean>) {
  secureLog(level, event, attrs);
}

export function track(event: string, attrs?: SafeAnalyticsAttrs & Record<string, string | number | boolean>) {
  log('info', event, attrs);
}

export { AnalyticsEvents };
