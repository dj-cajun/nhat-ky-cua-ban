import {
  adminHideContent,
  adminSetAccountStatus,
  getReportForOps,
  listAdminAuditLogs,
  listAllReportsForOps,
} from '@/features/local/repository';

/**
 * Ops surfaces must not ship service-role keys in the client bundle.
 * Local demo gates on isModerator; production uses Edge + is_app_moderator().
 */
export const opsService = {
  listReports: listAllReportsForOps,
  getReport: getReportForOps,
  hideContent: adminHideContent,
  setAccountStatus: adminSetAccountStatus,
  listAuditLogs: listAdminAuditLogs,
};
