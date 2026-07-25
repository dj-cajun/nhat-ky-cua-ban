import * as localDb from '@/lib/local-db';
import type { ReportRecord } from '@/lib/local-db';

export type { ReportRecord };

export function isBlocked(userId: string): boolean {
  return localDb.getBlockedUserIds().includes(userId);
}

export function blockUser(userId: string): void {
  localDb.addBlockedUser(userId);
}

export function unblockUser(userId: string): void {
  localDb.removeBlockedUser(userId);
}

export function reportUser(targetUserId: string, reason: string): ReportRecord {
  const report: ReportRecord = {
    id: `report-${Date.now()}`,
    targetUserId,
    reason: reason.trim(),
    createdAt: new Date().toISOString(),
  };
  localDb.addReport(report);
  return report;
}

export function getReports(): ReportRecord[] {
  return localDb.getReports();
}
