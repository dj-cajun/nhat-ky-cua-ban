import { useState } from 'react';
import { toAppError } from '@/lib/errors';
import { AnalyticsEvents, track } from '@/lib/logger';
import { blockUser } from './block.service';
import { submitReport } from './report.service';
import type { ReportReason, ReportTargetType } from './moderation.types';

export function useReportContent(input: {
  reporterId: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (opts: {
    reason: ReportReason;
    details?: string;
    hideForMe?: boolean;
    alsoBlock?: boolean;
  }) => {
    if (!input.reporterId) return;
    setPending(true);
    setError('');
    try {
      await submitReport({
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: opts.reason,
        details: opts.details,
        hideForMe: opts.hideForMe ?? true,
      });
      if (opts.alsoBlock && input.targetUserId) {
        await blockUser(input.reporterId, input.targetUserId);
      }
      track(AnalyticsEvents.report_submitted, { reason_code: opts.reason, market: 'US' });
      setDone(true);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setPending(false);
    }
  };

  return { submit, pending, error, done };
}
