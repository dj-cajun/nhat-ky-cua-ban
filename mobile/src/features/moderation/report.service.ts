import {
  hideContentForMe as localHide,
  listMyReports as localList,
  submitReportServerSnapshot,
} from '@/features/local/repository';
import { toPublicReportStatus } from './blocked-user-filter';
import type { SubmitReportInput } from './moderation.types';

export async function submitReport(input: SubmitReportInput): Promise<{ id: string }> {
  const id = await submitReportServerSnapshot({
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    details: input.details,
    hideForMe: input.hideForMe ?? true,
  });
  return { id };
}

export async function hideContentForMe(input: {
  userId: string;
  targetType: string;
  targetId: string;
}): Promise<void> {
  return localHide(input);
}

export async function listMyReports(reporterId: string) {
  const rows = await localList(reporterId);
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    status: toPublicReportStatus(r.status),
    createdAt: r.createdAt,
  }));
}
