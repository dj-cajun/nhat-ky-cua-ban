/**
 * Phase B — school trust boundary (domain contract)
 * Complements supabase/tests/019_school_boundary_checklist.sql
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

/**
 * Mirrors SQL helpers in 019:
 *   is_verified_school_member / is_school_member_for_access /
 *   can_access_circle / can_write_circle
 */
type MembershipStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'pending_change'
  | 'none';

function isVerifiedSchoolMember(status: MembershipStatus, schoolActive = true): boolean {
  return schoolActive && status === 'verified';
}

function isSchoolMemberForAccess(status: MembershipStatus, schoolActive = true): boolean {
  return schoolActive && (status === 'verified' || status === 'pending_change');
}

function canAccessCircle(input: {
  membership: MembershipStatus;
  sameSchoolAsCircle: boolean;
  activeCircleMember: boolean;
  blocked: boolean;
}): boolean {
  if (input.blocked) return false;
  if (!input.sameSchoolAsCircle) return false;
  if (!input.activeCircleMember) return false;
  return isSchoolMemberForAccess(input.membership);
}

function canWriteCircle(input: {
  membership: MembershipStatus;
  sameSchoolAsCircle: boolean;
  activeCircleMember: boolean;
  blocked: boolean;
}): boolean {
  if (input.blocked) return false;
  if (!input.sameSchoolAsCircle) return false;
  if (!input.activeCircleMember) return false;
  return isVerifiedSchoolMember(input.membership);
}

describe('school boundary authorization contract', () => {
  it('same-school non-member cannot access circle internals', () => {
    expect(
      canAccessCircle({
        membership: 'verified',
        sameSchoolAsCircle: true,
        activeCircleMember: false,
        blocked: false,
      }),
    ).toBe(false);
  });

  it('different-school verified attacker is denied even with known ids', () => {
    const attacker = {
      membership: 'verified' as const,
      sameSchoolAsCircle: false,
      activeCircleMember: false,
      blocked: false,
    };
    expect(canAccessCircle(attacker)).toBe(false);
    expect(canWriteCircle(attacker)).toBe(false);
  });

  it('unverified / suspended / expired cannot access', () => {
    for (const membership of ['pending', 'suspended', 'expired', 'none'] as const) {
      expect(
        canAccessCircle({
          membership,
          sameSchoolAsCircle: true,
          activeCircleMember: true,
          blocked: false,
        }),
      ).toBe(false);
    }
  });

  it('pending_change may read but not write', () => {
    const row = {
      membership: 'pending_change' as const,
      sameSchoolAsCircle: true,
      activeCircleMember: true,
      blocked: false,
    };
    expect(canAccessCircle(row)).toBe(true);
    expect(canWriteCircle(row)).toBe(false);
  });

  it('block wins over school match', () => {
    expect(
      canAccessCircle({
        membership: 'verified',
        sameSchoolAsCircle: true,
        activeCircleMember: true,
        blocked: true,
      }),
    ).toBe(false);
  });

  it('invite code alone never equals verified', () => {
    // submit_school_invite_code → pending only
    expect(isVerifiedSchoolMember('pending')).toBe(false);
    expect(isSchoolMemberForAccess('pending')).toBe(false);
  });

  it('full AND gate required for member access', () => {
    expect(
      canAccessCircle({
        membership: 'verified',
        sameSchoolAsCircle: true,
        activeCircleMember: true,
        blocked: false,
      }),
    ).toBe(true);
    expect(
      canWriteCircle({
        membership: 'verified',
        sameSchoolAsCircle: true,
        activeCircleMember: true,
        blocked: false,
      }),
    ).toBe(true);
  });

  it('documents required RPC surfaces for school checks', () => {
    const required = [
      'open_circle_from_draft',
      'create_circle_join_request',
      'respond_circle_recommendation',
      'create_circle_post',
      'acknowledge_circle_notice',
      'respond_circle_poll',
      'close_circle_post',
      'create_anonymous_post',
      'delete_anonymous_post',
      'get_or_create_circle_alias',
      'send_named_message',
      'send_alias_message',
      'reply_to_private_message',
      '_send_private_message',
      'can_view_diary_entry',
      'get_circle_invite_preview',
      'is_circle_member',
      'shares_open_circle',
      'can_write_shared_with',
      'is_active_circle_member_from_topic',
      'can_write_circle_from_topic',
      'submit_school_invite_code',
      'ops_review_school_verification',
      'ops_review_school_change',
    ];
    expect(required.length).toBeGreaterThan(20);
  });
});
