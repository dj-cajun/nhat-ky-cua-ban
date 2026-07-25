import {
  adminHideContent,
  adminSetAccountStatus,
  getMyOperatorCapabilities,
  getReportForOps,
  listAdminAuditLogs,
  listAllReportsForOps,
  opsCreateSchoolInviteCode,
  opsDisableSchoolInviteCode,
  opsListMixedSchoolCircles,
  opsListSchoolAuditEvents,
  opsListSchoolChangeRequests,
  opsListSchoolInviteCodes,
  opsListSchoolVerificationRequests,
  opsResolveMixedSchoolCircle,
  opsReviewSchoolChange,
  opsReviewSchoolVerification,
  opsScanMixedSchoolCircles,
} from '@/features/local/repository';

/**
 * Ops surfaces must not ship service-role keys or hard-coded moderator JWTs.
 * Capability comes from server `app_moderators` (local: operatorUserIds).
 */
export const opsService = {
  getCapabilities: getMyOperatorCapabilities,
  listReports: listAllReportsForOps,
  getReport: getReportForOps,
  hideContent: adminHideContent,
  setAccountStatus: adminSetAccountStatus,
  listAuditLogs: listAdminAuditLogs,
  listSchoolVerifications: opsListSchoolVerificationRequests,
  reviewSchoolVerification: opsReviewSchoolVerification,
  listSchoolChangeRequests: opsListSchoolChangeRequests,
  reviewSchoolChange: opsReviewSchoolChange,
  listSchoolInviteCodes: opsListSchoolInviteCodes,
  createSchoolInviteCode: opsCreateSchoolInviteCode,
  disableSchoolInviteCode: opsDisableSchoolInviteCode,
  listSchoolAuditEvents: opsListSchoolAuditEvents,
  scanMixedSchoolCircles: opsScanMixedSchoolCircles,
  listMixedSchoolCircles: opsListMixedSchoolCircles,
  resolveMixedSchoolCircle: opsResolveMixedSchoolCircle,
};
