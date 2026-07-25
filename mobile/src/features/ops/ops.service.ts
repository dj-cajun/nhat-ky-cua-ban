import {
  adminHideContent,
  adminSetAccountStatus,
  getMyOperatorCapabilities,
  getReportForOps,
  listActiveSchoolsForOps,
  listAdminAuditLogs,
  listAllReportsForOps,
  opsCreateSchoolInviteCode,
  opsDisableSchoolInviteCode,
  opsFlagFakeSchoolVerification,
  opsGetOverviewMetrics,
  opsListMixedSchoolCircles,
  opsListSchoolAuditEvents,
  opsListSchoolChangeRequests,
  opsListSchoolInviteCodes,
  opsListSchoolVerificationRequests,
  opsMergeSchools,
  opsResolveMixedSchoolCircle,
  opsReviewSchoolChange,
  opsReviewSchoolVerification,
  opsScanMixedSchoolCircles,
  opsSetSchoolMembershipStatus,
} from '@/features/local/repository';

/**
 * Ops surfaces must not ship service-role keys or hard-coded moderator JWTs.
 * Capability comes from server `app_moderators` (local: operatorUserIds).
 * No diary/message browse helpers belong here.
 */
export const opsService = {
  getCapabilities: getMyOperatorCapabilities,
  getOverviewMetrics: opsGetOverviewMetrics,
  listReports: listAllReportsForOps,
  getReport: getReportForOps,
  hideContent: adminHideContent,
  setAccountStatus: adminSetAccountStatus,
  listAuditLogs: listAdminAuditLogs,
  listSchoolVerifications: opsListSchoolVerificationRequests,
  reviewSchoolVerification: opsReviewSchoolVerification,
  flagFakeSchoolVerification: opsFlagFakeSchoolVerification,
  listSchoolChangeRequests: opsListSchoolChangeRequests,
  reviewSchoolChange: opsReviewSchoolChange,
  listSchoolInviteCodes: opsListSchoolInviteCodes,
  createSchoolInviteCode: opsCreateSchoolInviteCode,
  disableSchoolInviteCode: opsDisableSchoolInviteCode,
  listSchoolAuditEvents: opsListSchoolAuditEvents,
  setSchoolMembershipStatus: opsSetSchoolMembershipStatus,
  mergeSchools: opsMergeSchools,
  listSchools: listActiveSchoolsForOps,
  scanMixedSchoolCircles: opsScanMixedSchoolCircles,
  listMixedSchoolCircles: opsListMixedSchoolCircles,
  resolveMixedSchoolCircle: opsResolveMixedSchoolCircle,
};
