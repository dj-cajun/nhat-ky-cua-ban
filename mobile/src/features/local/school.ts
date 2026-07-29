/**
 * Local demo mirror of 019 school trust boundary helpers.
 * Does not replace server RPC — keeps demo UX aligned with can_access / can_write.
 */
import { AppError } from '@/types/domain';

export const BETA_SCHOOL_ID = 'a0000000-0000-4000-8000-0000000000b1';
export const BETA_SCHOOL_SLUG = 'yd-beta-school';
export const BETA_SCHOOL_NAME = 'Your Diary Beta School';
export const BETA_SCHOOL_CODE = 'BETA-SCHOOL-2026';

export const OTHER_SCHOOL_ID = 'a0000000-0000-4000-8000-0000000000b2';
export const OTHER_SCHOOL_NAME = 'Other School (test)';

export type SchoolMembershipStatus =
  | 'pending'
  | 'needs_more_info'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'pending_change'
  | 'none';

export type SchoolRow = {
  id: string;
  displayName: string;
  slug: string;
  status: 'active' | 'archived';
};

export type SchoolMembershipRow = {
  id: string;
  schoolId: string;
  userId: string;
  status: Exclude<SchoolMembershipStatus, 'none'>;
  verifiedAt?: string;
  updatedAt: string;
  createdAt: string;
};

export type SchoolVerificationRequestRow = {
  id: string;
  schoolId: string;
  userId: string;
  status: 'pending' | 'needs_more_info' | 'approved' | 'rejected' | 'cancelled';
  method: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type SchoolInviteCodeRow = {
  id: string;
  schoolId: string;
  /** Demo stores plain code; production hashes server-side only. */
  code: string;
  label?: string;
  disabled: boolean;
  disabledAt?: string;
  createdAt?: string;
};

export type SchoolChangeRequestRow = {
  id: string;
  userId: string;
  fromSchoolId?: string;
  toSchoolId: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  reviewerId?: string;
};

export type SchoolAuditEventRow = {
  id: string;
  schoolId?: string;
  actorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export function isVerifiedSchoolMember(
  membership: SchoolMembershipRow | undefined,
  school: SchoolRow | undefined,
): boolean {
  if (!membership || !school) return false;
  if (school.status !== 'active') return false;
  return membership.status === 'verified';
}

export function isSchoolMemberForAccess(
  membership: SchoolMembershipRow | undefined,
  school: SchoolRow | undefined,
): boolean {
  if (!membership || !school) return false;
  if (school.status !== 'active') return false;
  return membership.status === 'verified' || membership.status === 'pending_change';
}

export function assertCanWriteCircleLocal(input: {
  membership: SchoolMembershipRow | undefined;
  school: SchoolRow | undefined;
  sameSchoolAsCircle: boolean;
  activeCircleMember: boolean;
  blocked: boolean;
}): void {
  if (input.blocked) throw new AppError('FORBIDDEN', 'Blocked.');
  if (!input.sameSchoolAsCircle || !input.activeCircleMember) {
    throw new AppError('FORBIDDEN', 'School or circle access denied.');
  }
  if (!isVerifiedSchoolMember(input.membership, input.school)) {
    throw new AppError('FORBIDDEN', 'Verified school membership required.');
  }
}

export function canAccessCircleLocal(input: {
  membership: SchoolMembershipRow | undefined;
  school: SchoolRow | undefined;
  sameSchoolAsCircle: boolean;
  activeCircleMember: boolean;
  blocked: boolean;
}): boolean {
  if (input.blocked) return false;
  if (!input.sameSchoolAsCircle || !input.activeCircleMember) return false;
  return isSchoolMemberForAccess(input.membership, input.school);
}
