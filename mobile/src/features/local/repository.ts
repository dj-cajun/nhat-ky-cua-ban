/**
 * Local demo store when Supabase is not configured.
 * Mirrors server RPC rules for founding/join; production trusts Edge Functions / DB only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TIMEZONE } from '@/i18n';
import {
  AppError,
  CIRCLE_COLORS,
  CIRCLE_JOIN_RECOMMENDATION_COUNT,
  CIRCLE_PIONEER_COUNT,
  CIRCLE_SYMBOLS,
  type Circle,
  type CircleSummary,
  type DiaryEntry,
  type DiaryMood,
  type DiaryVisibilityMode,
  type Profile,
} from '@/types/domain';
import {
  BETA_SCHOOL_CODE,
  BETA_SCHOOL_ID,
  BETA_SCHOOL_NAME,
  BETA_SCHOOL_SLUG,
  OTHER_SCHOOL_ID,
  OTHER_SCHOOL_NAME,
  canAccessCircleLocal,
  isSchoolMemberForAccess,
  isVerifiedSchoolMember,
  type SchoolAuditEventRow,
  type SchoolChangeRequestRow,
  type SchoolInviteCodeRow,
  type SchoolMembershipRow,
  type SchoolMembershipStatus,
  type SchoolRow,
  type SchoolVerificationRequestRow,
} from '@/features/local/school';

const KEY = 'nk_local_v1';

interface DraftMember {
  draftId: string;
  userId: string;
  memberType: 'proposer' | 'invitee';
  responseStatus: 'pending' | 'accepted' | 'declined' | 'expired';
}

interface CircleDraft {
  id: string;
  proposerId: string;
  proposedName: string;
  status: 'pending' | 'opened' | 'cancelled';
  createdAt: string;
}

interface JoinRequest {
  id: string;
  circleId: string;
  applicantId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  expiresAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Recommendation {
  id: string;
  requestId: string;
  recommenderId: string;
  decision: 'pending' | 'recommended' | 'unknown';
  respondedAt?: string;
  createdAt: string;
}

interface NotificationEvent {
  id: string;
  userId: string;
  eventType: string;
  payload: Record<string, string>;
  createdAt: string;
  readAt?: string;
}

interface RealtimeOutboxRow {
  id: string;
  eventType: string;
  circleId: string;
  postId?: string;
  userId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  deliveredAt?: string;
  attemptCount: number;
}

interface Member {
  circleId: string;
  userId: string;
  role: 'admin' | 'pioneer' | 'member';
  isPioneer: boolean;
  status: 'active' | 'left' | 'removed';
}

interface LocalDb {
  profiles: Profile[];
  sessionUserId: string | null;
  drafts: CircleDraft[];
  draftMembers: DraftMember[];
  circles: Circle[];
  members: Member[];
  joinRequests: JoinRequest[];
  recommendations: Recommendation[];
  diary: DiaryEntry[];
  diaryVisibility: { entryId: string; circleId: string }[];
  blocks: { blockerId: string; blockedId: string }[];
  posts: CirclePostRecord[];
  pollOptions: PollOptionRecord[];
  responses: ResponseRecord[];
  reports: ReportRecord[];
  notifications: NotificationEvent[];
  realtimeOutbox: RealtimeOutboxRow[];
  hiddenContent: HiddenContentRow[];
  moderationStatus: ModerationStatusRow[];
  guestbook: GuestbookRow[];
  /** Personal free board posts — visible only on that user's homepage. */
  freeBoard: FreeBoardRow[];
  photos: PhotoAssetRow[];
  circleAliases: {
    id: string;
    circleId: string;
    userId: string;
    aliasName: string;
    createdAt: string;
  }[];
  anonymousPosts: {
    id: string;
    circleId: string;
    authorUserId: string;
    aliasId: string;
    body: string;
    status: 'active' | 'deleted' | 'removed';
    createdAt: string;
    clientRequestId?: string;
  }[];
  adminAuditLogs: {
    id: string;
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason: string;
    createdAt: string;
  }[];
  privateMessages: {
    id: string;
    circleId: string;
    senderId: string;
    recipientId: string;
    senderMode: 'named' | 'alias';
    aliasId?: string;
    body: string;
    replyToMessageId?: string;
    status: 'active' | 'sender_deleted' | 'recipient_deleted' | 'removed';
    clientRequestId: string;
    createdAt: string;
  }[];
  privateMessageUserStates: {
    messageId: string;
    userId: string;
    hiddenAt?: string;
    openedAt?: string;
  }[];
  messagePreferences: {
    userId: string;
    namedEnabled: boolean;
    aliasEnabled: boolean;
    updatedAt: string;
  }[];
  diaryMusic: {
    id: string;
    diaryEntryId: string;
    externalTrackId: string;
    spotifyUri: string;
    externalUrl: string;
    trackName: string;
    artistNames: string[];
    albumName: string | null;
    artworkUrl: string | null;
    durationMs: number | null;
    explicit: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  /** 019 school trust boundary (local mirror) */
  schools: SchoolRow[];
  schoolMemberships: SchoolMembershipRow[];
  schoolVerificationRequests: SchoolVerificationRequestRow[];
  schoolInviteCodes: SchoolInviteCodeRow[];
  schoolChangeRequests: SchoolChangeRequestRow[];
  schoolAuditEvents: SchoolAuditEventRow[];
  /** Aggregate counters only (no per-user visit history). */
  opsMetricCounters: { metricKey: string; metricDay: string; value: number }[];
  /** B.1: local mirror of app_moderators — never imply all signed-in users */
  operatorUserIds: string[];
  /** moderator | admin — defaults to moderator when missing */
  operatorRoles: Record<string, 'moderator' | 'admin'>;
  circleSchoolIncidents: {
    id: string;
    circleId: string;
    canonicalSchoolId: string;
    status: 'open' | 'resolved' | 'cancelled';
    autoWriteBlocked: boolean;
    memberSnapshot: {
      userId: string;
      memberSchoolId?: string;
      memberSchoolName?: string;
      membershipStatus?: string;
    }[];
    detectedAt: string;
    resolvedAt?: string;
    resolverId?: string;
    resolveNote?: string;
  }[];
}

export interface CirclePostRecord {
  id: string;
  circleId: string;
  type: 'notice' | 'poll';
  title: string;
  body: string;
  status: 'active' | 'closed' | 'cancelled' | 'hidden';
  closesAt: string;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
}

interface PollOptionRecord {
  id: string;
  postId: string;
  label: string;
  sortOrder: number;
}

interface ResponseRecord {
  postId: string;
  userId: string;
  responseType: 'acknowledged' | 'poll_option';
  optionId?: string;
  respondedAt: string;
  updatedAt: string;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  contentSnapshot: string;
  status: 'submitted' | 'reviewing' | 'resolved' | 'dismissed' | 'open';
  createdAt: string;
  reviewedAt?: string;
  resolvedAt?: string;
}

interface HiddenContentRow {
  userId: string;
  targetType: string;
  targetId: string;
  hiddenAt: string;
}

interface ModerationStatusRow {
  userId: string;
  accountStatus: 'active' | 'restricted' | 'suspended';
  reasonCode?: string;
  updatedAt: string;
}

export interface GuestbookRow {
  id: string;
  ownerUserId: string;
  authorUserId: string;
  body: string;
  hidden: boolean;
  createdAt: string;
}

/** Free board on a personal mini-hompy (owner + visitors can write). */
export interface FreeBoardRow {
  id: string;
  ownerUserId: string;
  authorUserId: string;
  body: string;
  hidden: boolean;
  createdAt: string;
}

/** Local-first photo row (later: Supabase `photo_assets` + `diary-photos` bucket). */
export interface PhotoAssetRow {
  id: string;
  userId: string;
  /** file:// under documentDirectory, or demo/http URI for display */
  storagePath: string;
  createdAt: string;
}

export type PhotoAsset = PhotoAssetRow;

export const MAX_ALBUM_PHOTOS = 30;
export const CORK_SLOT_COUNT = 3;

const empty: LocalDb = {
  profiles: [],
  sessionUserId: null,
  drafts: [],
  draftMembers: [],
  circles: [],
  members: [],
  joinRequests: [],
  recommendations: [],
  diary: [],
  diaryVisibility: [],
  blocks: [],
  posts: [],
  pollOptions: [],
  responses: [],
  reports: [],
  notifications: [],
  realtimeOutbox: [],
  hiddenContent: [],
  moderationStatus: [],
  guestbook: [],
  freeBoard: [],
  photos: [],
  circleAliases: [],
  anonymousPosts: [],
  adminAuditLogs: [],
  privateMessages: [],
  privateMessageUserStates: [],
  messagePreferences: [],
  diaryMusic: [],
  schools: [],
  schoolMemberships: [],
  schoolVerificationRequests: [],
  schoolInviteCodes: [],
  schoolChangeRequests: [],
  schoolAuditEvents: [],
  opsMetricCounters: [],
  operatorUserIds: [],
  operatorRoles: {},
  circleSchoolIncidents: [],
};

let memory: LocalDb = structuredClone(empty);
let loaded = false;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function todayInTz(tz = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function persist(): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(memory));
}

export async function loadLocalDb(): Promise<void> {
  if (loaded) return;
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    memory = { ...structuredClone(empty), ...(JSON.parse(raw) as Partial<LocalDb>) };
    memory.posts ??= [];
    memory.pollOptions = (memory.pollOptions ?? []).map((o, i) => ({
      id: o.id,
      postId: o.postId,
      label: o.label,
      sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : i + 1,
    }));
    memory.responses = (memory.responses ?? []).map((r) => ({
      postId: r.postId,
      userId: r.userId,
      responseType:
        r.responseType ?? (r.optionId ? ('poll_option' as const) : ('acknowledged' as const)),
      optionId: r.optionId,
      respondedAt: r.respondedAt,
      updatedAt: r.updatedAt ?? r.respondedAt,
    }));
    memory.reports ??= [];
    memory.blocks ??= [];
    memory.notifications ??= [];
    memory.realtimeOutbox ??= [];
    memory.hiddenContent ??= [];
    memory.moderationStatus ??= [];
    memory.guestbook ??= [];
    memory.freeBoard ??= [];
    memory.photos ??= [];
    memory.circleAliases ??= [];
    memory.anonymousPosts ??= [];
    memory.adminAuditLogs ??= [];
    memory.privateMessages ??= [];
    memory.privateMessageUserStates ??= [];
    memory.messagePreferences ??= [];
    memory.diaryMusic ??= [];
    memory.schools ??= [];
    memory.schoolMemberships ??= [];
    memory.schoolVerificationRequests ??= [];
    memory.schoolInviteCodes ??= [];
    memory.operatorUserIds ??= [];
    memory.operatorRoles ??= {};
    memory.opsMetricCounters ??= [];
    memory.circleSchoolIncidents ??= [];
    memory.schoolChangeRequests ??= [];
    memory.schoolAuditEvents ??= [];
    memory.recommendations = (memory.recommendations ?? []).map((r) => {
      const rawDecision = String((r as Recommendation).decision ?? 'pending');
      return {
        id: (r as Recommendation).id ?? uid(),
        requestId: r.requestId,
        recommenderId: r.recommenderId,
        decision: (rawDecision === 'later' || rawDecision === 'pending'
          ? 'pending'
          : rawDecision === 'recommended'
            ? 'recommended'
            : 'unknown') as Recommendation['decision'],
        respondedAt: (r as Recommendation).respondedAt,
        createdAt: (r as Recommendation).createdAt ?? now(),
      };
    });
    memory.joinRequests = (memory.joinRequests ?? []).map((j) => ({
      ...j,
      expiresAt: (j as JoinRequest).expiresAt ?? new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: (j as JoinRequest).createdAt ?? now(),
      updatedAt: (j as JoinRequest).updatedAt ?? now(),
    }));
  } else {
    memory = structuredClone(empty);
  }
  ensureSchoolSeed();
  backfillCircleSchoolsAndMemberships();
  loaded = true;
}

function ensureSchoolSeed(): void {
  if (!memory.schools.some((s) => s.id === BETA_SCHOOL_ID)) {
    memory.schools.push({
      id: BETA_SCHOOL_ID,
      displayName: BETA_SCHOOL_NAME,
      slug: BETA_SCHOOL_SLUG,
      status: 'active',
    });
  }
  if (!memory.schools.some((s) => s.id === OTHER_SCHOOL_ID)) {
    memory.schools.push({
      id: OTHER_SCHOOL_ID,
      displayName: OTHER_SCHOOL_NAME,
      slug: 'other-school-test',
      status: 'active',
    });
  }
  if (!memory.schoolInviteCodes.some((c) => c.code === BETA_SCHOOL_CODE)) {
    memory.schoolInviteCodes.push({
      id: 'invite-beta-default',
      schoolId: BETA_SCHOOL_ID,
      code: BETA_SCHOOL_CODE,
      label: 'Beta default',
      disabled: false,
      createdAt: now(),
    });
  }
}

function pushSchoolAudit(input: {
  schoolId?: string;
  actorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): void {
  memory.schoolAuditEvents.unshift({
    id: uid(),
    schoolId: input.schoolId,
    actorId: input.actorId,
    eventType: input.eventType,
    payload: input.payload,
    createdAt: now(),
  });
  if (memory.schoolAuditEvents.length > 200) {
    memory.schoolAuditEvents.length = 200;
  }
}

/** Demo continuity: existing circle members inherit beta verified membership. */
function backfillCircleSchoolsAndMemberships(): void {
  for (const c of memory.circles) {
    if (!c.schoolId) c.schoolId = BETA_SCHOOL_ID;
  }
  const userIds = new Set<string>();
  for (const m of memory.members) userIds.add(m.userId);
  for (const d of memory.draftMembers) userIds.add(d.userId);
  for (const id of userIds) {
    ensureVerifiedSchoolMembership(id, BETA_SCHOOL_ID);
  }
}

function schoolById(schoolId: string): SchoolRow | undefined {
  return memory.schools.find((s) => s.id === schoolId);
}

function membershipForUser(userId: string, schoolId: string): SchoolMembershipRow | undefined {
  return memory.schoolMemberships.find((m) => m.userId === userId && m.schoolId === schoolId);
}

function primaryMembership(userId: string): SchoolMembershipRow | undefined {
  const rank: Record<string, number> = {
    verified: 0,
    pending_change: 1,
    needs_more_info: 2,
    pending: 3,
    rejected: 4,
    suspended: 5,
    expired: 6,
  };
  return [...memory.schoolMemberships]
    .filter((m) => m.userId === userId)
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))[0];
}

function ensureVerifiedSchoolMembership(userId: string, schoolId: string): void {
  const existing = membershipForUser(userId, schoolId);
  if (existing) {
    if (existing.status === 'pending' || existing.status === 'rejected') {
      existing.status = 'verified';
      existing.verifiedAt = now();
      existing.updatedAt = now();
    }
    return;
  }
  memory.schoolMemberships.push({
    id: uid(),
    schoolId,
    userId,
    status: 'verified',
    verifiedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  });
}

function assertActiveCircleMemberRow(circleId: string, userId: string): boolean {
  return memory.members.some(
    (m) => m.circleId === circleId && m.userId === userId && m.status === 'active',
  );
}

async function assertCanAccessCircle(circleId: string, userId: string): Promise<void> {
  if (!(await canAccessCircle(circleId, userId))) {
    throw new AppError('FORBIDDEN', 'School or circle access denied.');
  }
}

async function assertCanWriteCircle(circleId: string, userId: string): Promise<void> {
  if (!(await canWriteCircle(circleId, userId))) {
    throw new AppError('FORBIDDEN', 'Verified school membership required to write.');
  }
}

export async function canAccessCircle(circleId: string, userId: string): Promise<boolean> {
  await loadLocalDb();
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle?.schoolId) return false;
  const membership = membershipForUser(userId, circle.schoolId);
  const school = schoolById(circle.schoolId);
  const blocked = false; // caller checks pairwise blocks where needed
  return canAccessCircleLocal({
    membership,
    school,
    sameSchoolAsCircle: membership?.schoolId === circle.schoolId,
    activeCircleMember: assertActiveCircleMemberRow(circleId, userId),
    blocked,
  });
}

export async function circleWritesFrozen(circleId: string): Promise<boolean> {
  await loadLocalDb();
  return memory.circleSchoolIncidents.some(
    (i) => i.circleId === circleId && i.status === 'open' && i.autoWriteBlocked,
  );
}

export async function canWriteCircle(circleId: string, userId: string): Promise<boolean> {
  await loadLocalDb();
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle?.schoolId) return false;
  if (!(await canAccessCircle(circleId, userId))) return false;
  if (await circleWritesFrozen(circleId)) return false;
  const membership = membershipForUser(userId, circle.schoolId);
  const school = schoolById(circle.schoolId);
  return isVerifiedSchoolMember(membership, school);
}

const OPS_ACTIONS_MODERATOR = [
  'overview_read',
  'verification_review',
  'change_review',
  'invite_codes',
  'membership_suspend',
  'mixed_resolve',
  'reports_moderate',
  'school_audit_read',
] as const;

const OPS_ACTIONS_ADMIN = [...OPS_ACTIONS_MODERATOR, 'school_merge'] as const;

export type OpsAction = (typeof OPS_ACTIONS_ADMIN)[number];

/** Mirror get_my_operator_capabilities / is_app_moderator — server table only. */
export async function getMyOperatorCapabilities(userId: string): Promise<{
  isModerator: boolean;
  role: 'moderator' | 'admin' | null;
  allowedActions: OpsAction[];
}> {
  await loadLocalDb();
  const ok = memory.operatorUserIds.includes(userId);
  if (!ok) return { isModerator: false, role: null, allowedActions: [] };
  const role = memory.operatorRoles[userId] ?? 'moderator';
  return {
    isModerator: true,
    role,
    allowedActions: [...(role === 'admin' ? OPS_ACTIONS_ADMIN : OPS_ACTIONS_MODERATOR)],
  };
}

export async function grantAppModeratorForTests(userId: string): Promise<void> {
  await loadLocalDb();
  if (!memory.operatorUserIds.includes(userId)) {
    memory.operatorUserIds.push(userId);
  }
  memory.operatorRoles[userId] ??= 'moderator';
  await persist();
}

export async function grantAppAdminForTests(userId: string): Promise<void> {
  await loadLocalDb();
  if (!memory.operatorUserIds.includes(userId)) {
    memory.operatorUserIds.push(userId);
  }
  memory.operatorRoles[userId] = 'admin';
  await persist();
}

export async function revokeAppModeratorForTests(userId: string): Promise<void> {
  await loadLocalDb();
  memory.operatorUserIds = memory.operatorUserIds.filter((id) => id !== userId);
  delete memory.operatorRoles[userId];
  await persist();
}

async function assertLocalModerator(userId: string): Promise<void> {
  const caps = await getMyOperatorCapabilities(userId);
  if (!caps.isModerator) {
    throw new AppError('FORBIDDEN', 'Moderator only.');
  }
}

async function assertLocalOpsAction(userId: string, action: OpsAction): Promise<void> {
  const caps = await getMyOperatorCapabilities(userId);
  if (!caps.allowedActions.includes(action)) {
    throw new AppError('FORBIDDEN', 'Action not allowed for this operator role.');
  }
}

export async function opsScanMixedSchoolCircles(actorId: string): Promise<{
  opened: number;
  updated: number;
}> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  let opened = 0;
  let updated = 0;
  for (const circle of memory.circles.filter((c) => c.status === 'open' && c.schoolId)) {
    const foreign = memory.members
      .filter((m) => m.circleId === circle.id && m.status === 'active')
      .map((m) => {
        const mem = primaryMembership(m.userId);
        return {
          userId: m.userId,
          memberSchoolId: mem?.schoolId,
          memberSchoolName: mem ? schoolById(mem.schoolId)?.displayName : undefined,
          membershipStatus: mem?.status,
        };
      })
      .filter(
        (row) =>
          row.memberSchoolId != null &&
          row.memberSchoolId !== circle.schoolId,
      );
    if (foreign.length === 0) continue;
    const existing = memory.circleSchoolIncidents.find(
      (i) => i.circleId === circle.id && i.status === 'open',
    );
    if (!existing) {
      memory.circleSchoolIncidents.push({
        id: uid(),
        circleId: circle.id,
        canonicalSchoolId: circle.schoolId!,
        status: 'open',
        autoWriteBlocked: true,
        memberSnapshot: foreign,
        detectedAt: now(),
      });
      opened += 1;
    } else {
      existing.memberSnapshot = foreign;
      existing.autoWriteBlocked = true;
      updated += 1;
    }
  }
  await persist();
  return { opened, updated };
}

export async function opsListMixedSchoolCircles(actorId: string): Promise<
  {
    id: string;
    circleId: string;
    circleName: string;
    canonicalSchoolId: string;
    canonicalSchoolName: string;
    autoWriteBlocked: boolean;
    memberSnapshot: {
      userId: string;
      memberSchoolId?: string;
      memberSchoolName?: string;
      membershipStatus?: string;
    }[];
    detectedAt: string;
    frozenAt: string;
    lastActivityAt: string | null;
    resolvedAt?: string;
    resolverId?: string;
    resolveNote?: string;
  }[]
> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  return memory.circleSchoolIncidents
    .filter((i) => i.status === 'open')
    .map((i) => {
      const activityCandidates = [
        ...memory.posts.filter((p) => p.circleId === i.circleId).map((p) => p.createdAt),
        ...memory.anonymousPosts.filter((p) => p.circleId === i.circleId).map((p) => p.createdAt),
        ...memory.privateMessages.filter((m) => m.circleId === i.circleId).map((m) => m.createdAt),
      ];
      const lastActivityAt =
        activityCandidates.length > 0
          ? activityCandidates.sort((a, b) => (a < b ? 1 : -1))[0]!
          : null;
      return {
        id: i.id,
        circleId: i.circleId,
        circleName: memory.circles.find((c) => c.id === i.circleId)?.name ?? i.circleId,
        canonicalSchoolId: i.canonicalSchoolId,
        canonicalSchoolName:
          schoolById(i.canonicalSchoolId)?.displayName ?? i.canonicalSchoolId,
        autoWriteBlocked: i.autoWriteBlocked,
        memberSnapshot: i.memberSnapshot,
        detectedAt: i.detectedAt,
        frozenAt: i.detectedAt,
        lastActivityAt,
        resolvedAt: i.resolvedAt,
        resolverId: i.resolverId,
        resolveNote: i.resolveNote,
      };
    });
}

export async function opsResolveMixedSchoolCircle(input: {
  actorId: string;
  incidentId: string;
  note?: string;
}): Promise<void> {
  await loadLocalDb();
  await assertLocalModerator(input.actorId);
  const inc = memory.circleSchoolIncidents.find((i) => i.id === input.incidentId);
  if (!inc) throw new AppError('NOT_FOUND', 'Incident not found.');
  if (inc.status !== 'open') throw new AppError('CONFLICT', 'Already resolved.');
  if (!input.note?.trim()) {
    throw new AppError('VALIDATION', 'Resolve note is required for audit.');
  }
  inc.status = 'resolved';
  inc.autoWriteBlocked = false;
  inc.resolvedAt = now();
  inc.resolverId = input.actorId;
  inc.resolveNote = input.note.trim();
  await persist();
}

/** Mirror submit_school_invite_code — pending only, never auto-verified. */
export async function submitSchoolInviteCode(
  userId: string,
  code: string,
): Promise<{ schoolId: string; membershipStatus: 'pending'; requestId: string }> {
  await loadLocalDb();
  const trimmed = code.trim();
  if (!trimmed) throw new AppError('VALIDATION', 'Enter a school code.');
  const invite = memory.schoolInviteCodes.find((c) => c.code === trimmed && !c.disabled);
  if (!invite) throw new AppError('FORBIDDEN', 'Invalid school code.');

  let membership = membershipForUser(userId, invite.schoolId);
  if (!membership) {
    membership = {
      id: uid(),
      schoolId: invite.schoolId,
      userId,
      status: 'pending',
      createdAt: now(),
      updatedAt: now(),
    };
    memory.schoolMemberships.push(membership);
  } else if (
    membership.status !== 'verified' &&
    membership.status !== 'suspended' &&
    membership.status !== 'pending_change'
  ) {
    membership.status = 'pending';
    membership.updatedAt = now();
  }

  const request: SchoolVerificationRequestRow = {
    id: uid(),
    schoolId: invite.schoolId,
    userId,
    status: 'pending',
    method: 'beta_code',
    createdAt: now(),
  };
  memory.schoolVerificationRequests.push(request);
  pushSchoolAudit({
    schoolId: invite.schoolId,
    actorId: userId,
    eventType: 'verification_submitted',
    payload: { requestId: request.id, method: 'beta_code' },
  });
  await persist();
  return {
    schoolId: invite.schoolId,
    membershipStatus: 'pending',
    requestId: request.id,
  };
}

export async function getMySchoolMembership(userId: string): Promise<{
  status: SchoolMembershipStatus;
  schoolId?: string;
  schoolName?: string;
  verifiedAt?: string;
  requestStatus?: string;
  reviewNote?: string;
  pendingChange?: {
    requestId: string;
    toSchoolId: string;
    toSchoolName: string;
    status: string;
    reason?: string;
  };
}> {
  await loadLocalDb();
  const m = primaryMembership(userId);
  if (!m) return { status: 'none' };
  const school = schoolById(m.schoolId);
  const latestReq = [...memory.schoolVerificationRequests]
    .filter((r) => r.userId === userId && r.schoolId === m.schoolId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const change = memory.schoolChangeRequests.find(
    (c) => c.userId === userId && c.status === 'pending',
  );
  return {
    status: m.status,
    schoolId: m.schoolId,
    schoolName: school?.displayName,
    verifiedAt: m.verifiedAt,
    requestStatus: latestReq?.status,
    reviewNote: latestReq?.reviewNote,
    pendingChange: change
      ? {
          requestId: change.id,
          toSchoolId: change.toSchoolId,
          toSchoolName: schoolById(change.toSchoolId)?.displayName ?? change.toSchoolId,
          status: change.status,
          reason: change.reason,
        }
      : undefined,
  };
}

export async function listActiveSchoolsForChange(userId: string): Promise<
  { id: string; displayName: string; slug: string }[]
> {
  await loadLocalDb();
  const m = primaryMembership(userId);
  if (!m || (m.status !== 'verified' && m.status !== 'pending_change')) {
    throw new AppError('FORBIDDEN', 'Verified school membership required.');
  }
  return memory.schools
    .filter((s) => s.status === 'active' && s.id !== m.schoolId)
    .map((s) => ({ id: s.id, displayName: s.displayName, slug: s.slug }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function requestSchoolChange(input: {
  userId: string;
  toSchoolId: string;
  reason?: string;
}): Promise<{ requestId: string; status: 'pending' }> {
  await loadLocalDb();
  const toSchool = schoolById(input.toSchoolId);
  if (!toSchool || toSchool.status !== 'active') {
    throw new AppError('NOT_FOUND', 'School not found.');
  }
  const from = memory.schoolMemberships.find(
    (m) => m.userId === input.userId && m.status === 'verified',
  );
  if (!from) {
    throw new AppError('FORBIDDEN', 'Verified school membership required.');
  }
  if (from.schoolId === input.toSchoolId) {
    throw new AppError('VALIDATION', 'Pick a different school.');
  }
  if (memory.schoolChangeRequests.some((c) => c.userId === input.userId && c.status === 'pending')) {
    throw new AppError('CONFLICT', 'A school change is already pending.');
  }
  from.status = 'pending_change';
  from.updatedAt = now();
  const request: SchoolChangeRequestRow = {
    id: uid(),
    userId: input.userId,
    fromSchoolId: from.schoolId,
    toSchoolId: input.toSchoolId,
    reason: input.reason?.trim() || undefined,
    status: 'pending',
    createdAt: now(),
  };
  memory.schoolChangeRequests.push(request);
  pushSchoolAudit({
    schoolId: from.schoolId,
    actorId: input.userId,
    eventType: 'school_change_requested',
    payload: { requestId: request.id, toSchoolId: input.toSchoolId },
  });
  await persist();
  return { requestId: request.id, status: 'pending' };
}

/** Ops: requires local operator role (mirror app_moderators). */
export async function opsListSchoolVerificationRequests(actorId: string): Promise<
  {
    id: string;
    schoolId: string;
    schoolName: string;
    userId: string;
    status: string;
    method: string;
    reviewNote?: string;
    createdAt: string;
  }[]
> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  return memory.schoolVerificationRequests
    .filter((r) => r.status === 'pending' || r.status === 'needs_more_info')
    .map((r) => ({
      id: r.id,
      schoolId: r.schoolId,
      schoolName: schoolById(r.schoolId)?.displayName ?? r.schoolId,
      userId: r.userId,
      status: r.status,
      method: r.method,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
    }));
}

export async function opsReviewSchoolVerification(input: {
  actorId: string;
  requestId: string;
  decision: 'approved' | 'rejected' | 'needs_more_info';
  note?: string;
}): Promise<void> {
  await loadLocalDb();
  await assertLocalModerator(input.actorId);
  const req = memory.schoolVerificationRequests.find((r) => r.id === input.requestId);
  if (!req) throw new AppError('NOT_FOUND', 'Request not found.');
  if (req.status !== 'pending' && req.status !== 'needs_more_info') {
    throw new AppError('CONFLICT', 'Already reviewed.');
  }
  if (
    (input.decision === 'rejected' || input.decision === 'needs_more_info') &&
    !input.note?.trim()
  ) {
    throw new AppError('VALIDATION', 'A reason is required.');
  }
  req.status = input.decision;
  req.reviewedAt = now();
  req.reviewNote = input.note?.trim() || undefined;
  const membership = membershipForUser(req.userId, req.schoolId);
  if (input.decision === 'approved') {
    if (membership) {
      membership.status = 'verified';
      membership.verifiedAt = now();
      membership.updatedAt = now();
    } else {
      ensureVerifiedSchoolMembership(req.userId, req.schoolId);
    }
  } else if (input.decision === 'rejected') {
    if (membership && (membership.status === 'pending' || membership.status === 'needs_more_info')) {
      membership.status = 'rejected';
      membership.updatedAt = now();
    }
  } else if (
    membership &&
    (membership.status === 'pending' || membership.status === 'needs_more_info')
  ) {
    membership.status = 'needs_more_info';
    membership.updatedAt = now();
  }
  pushSchoolAudit({
    schoolId: req.schoolId,
    actorId: input.actorId,
    eventType: `verification_${input.decision}`,
    payload: { requestId: req.id, userId: req.userId, note: req.reviewNote },
  });
  await persist();
}

export async function opsListSchoolChangeRequests(actorId: string): Promise<
  {
    id: string;
    userId: string;
    fromSchoolId?: string;
    fromSchoolName?: string;
    toSchoolId: string;
    toSchoolName: string;
    reason?: string;
    status: string;
    createdAt: string;
  }[]
> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  return memory.schoolChangeRequests
    .filter((c) => c.status === 'pending')
    .map((c) => ({
      id: c.id,
      userId: c.userId,
      fromSchoolId: c.fromSchoolId,
      fromSchoolName: c.fromSchoolId ? schoolById(c.fromSchoolId)?.displayName : undefined,
      toSchoolId: c.toSchoolId,
      toSchoolName: schoolById(c.toSchoolId)?.displayName ?? c.toSchoolId,
      reason: c.reason,
      status: c.status,
      createdAt: c.createdAt,
    }));
}

export async function opsReviewSchoolChange(input: {
  actorId: string;
  requestId: string;
  decision: 'approved' | 'rejected';
  note?: string;
}): Promise<void> {
  await loadLocalDb();
  await assertLocalModerator(input.actorId);
  const req = memory.schoolChangeRequests.find((r) => r.id === input.requestId);
  if (!req) throw new AppError('NOT_FOUND', 'Request not found.');
  if (req.status !== 'pending') throw new AppError('CONFLICT', 'Already reviewed.');
  if (!input.note?.trim()) {
    throw new AppError('VALIDATION', 'A reason is required.');
  }
  req.status = input.decision;
  req.reviewedAt = now();
  req.reviewerId = input.actorId;
  req.reviewNote = input.note.trim();

  if (input.decision === 'approved') {
    if (req.fromSchoolId) {
      const from = membershipForUser(req.userId, req.fromSchoolId);
      if (from && (from.status === 'verified' || from.status === 'pending_change')) {
        from.status = 'expired';
        from.updatedAt = now();
      }
    }
    ensureVerifiedSchoolMembership(req.userId, req.toSchoolId);
    const to = membershipForUser(req.userId, req.toSchoolId);
    if (to) {
      to.status = 'verified';
      to.verifiedAt = now();
      to.updatedAt = now();
    }
  } else if (req.fromSchoolId) {
    const from = membershipForUser(req.userId, req.fromSchoolId);
    if (from?.status === 'pending_change') {
      from.status = 'verified';
      from.updatedAt = now();
    }
  }

  pushSchoolAudit({
    schoolId: req.toSchoolId ?? req.fromSchoolId,
    actorId: input.actorId,
    eventType: `school_change_${input.decision}`,
    payload: {
      requestId: req.id,
      userId: req.userId,
      fromSchoolId: req.fromSchoolId,
      toSchoolId: req.toSchoolId,
      note: req.reviewNote,
    },
  });
  await persist();
}

export async function opsListSchoolInviteCodes(actorId: string): Promise<
  {
    id: string;
    schoolId: string;
    schoolName: string;
    label?: string;
    disabled: boolean;
    createdAt?: string;
  }[]
> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  return memory.schoolInviteCodes.map((c) => ({
    id: c.id,
    schoolId: c.schoolId,
    schoolName: schoolById(c.schoolId)?.displayName ?? c.schoolId,
    label: c.label,
    disabled: c.disabled,
    createdAt: c.createdAt,
  }));
}

export async function opsCreateSchoolInviteCode(input: {
  actorId: string;
  schoolId: string;
  code: string;
  label?: string;
}): Promise<{ id: string; schoolId: string; label?: string }> {
  await loadLocalDb();
  await assertLocalModerator(input.actorId);
  const school = schoolById(input.schoolId);
  if (!school || school.status !== 'active') {
    throw new AppError('NOT_FOUND', 'School not found.');
  }
  const trimmed = input.code.trim();
  if (!trimmed) throw new AppError('VALIDATION', 'Enter a code.');
  if (memory.schoolInviteCodes.some((c) => c.code === trimmed && !c.disabled)) {
    throw new AppError('CONFLICT', 'Code already active.');
  }
  const row: SchoolInviteCodeRow = {
    id: uid(),
    schoolId: input.schoolId,
    code: trimmed,
    label: input.label?.trim() || undefined,
    disabled: false,
    createdAt: now(),
  };
  memory.schoolInviteCodes.push(row);
  pushSchoolAudit({
    schoolId: input.schoolId,
    actorId: input.actorId,
    eventType: 'invite_code_created',
    payload: { codeId: row.id, label: row.label },
  });
  await persist();
  return { id: row.id, schoolId: row.schoolId, label: row.label };
}

export async function opsDisableSchoolInviteCode(input: {
  actorId: string;
  codeId: string;
}): Promise<void> {
  await loadLocalDb();
  await assertLocalModerator(input.actorId);
  const row = memory.schoolInviteCodes.find((c) => c.id === input.codeId);
  if (!row) throw new AppError('NOT_FOUND', 'Code not found.');
  row.disabled = true;
  row.disabledAt = row.disabledAt ?? now();
  pushSchoolAudit({
    schoolId: row.schoolId,
    actorId: input.actorId,
    eventType: 'invite_code_disabled',
    payload: { codeId: row.id },
  });
  await persist();
}

export async function opsListSchoolAuditEvents(actorId: string): Promise<
  {
    id: string;
    schoolId?: string;
    schoolName?: string;
    actorId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    createdAt: string;
  }[]
> {
  await loadLocalDb();
  await assertLocalOpsAction(actorId, 'school_audit_read');
  return memory.schoolAuditEvents.slice(0, 50).map((e) => ({
    id: e.id,
    schoolId: e.schoolId,
    schoolName: e.schoolId ? schoolById(e.schoolId)?.displayName : undefined,
    actorId: e.actorId,
    eventType: e.eventType,
    payload: e.payload,
    createdAt: e.createdAt,
  }));
}

function localActiveUsersSince(msAgo: number): number {
  const cutoff = new Date(Date.now() - msAgo).toISOString();
  const ids = new Set<string>();
  for (const d of memory.diary) {
    if ((d.updatedAt ?? d.createdAt) >= cutoff) ids.add(d.userId);
  }
  for (const p of memory.posts) {
    if (p.createdAt >= cutoff) ids.add(p.createdBy);
  }
  for (const m of memory.privateMessages) {
    if (m.createdAt >= cutoff) {
      ids.add(m.senderId);
      ids.add(m.recipientId);
    }
  }
  return ids.size;
}

function localMetricToday(key: string): number {
  const day = todayInTz('UTC');
  return (
    memory.opsMetricCounters.find((c) => c.metricKey === key && c.metricDay === day)?.value ?? 0
  );
}

/** Aggregates only — never returns diary/message bodies or per-user visit lists. */
export async function opsGetOverviewMetrics(actorId: string): Promise<{
  totalUsers: number;
  activeUsers1d: number;
  activeUsers7d: number;
  activeUsers30d: number;
  schoolVerified: number;
  schoolPending: number;
  circlesOpened: number;
  circlesActive7d: number;
  diaryEntriesToday: number;
  friendDiaryVisitsToday: number;
  openReports: number;
  openMixedIncidents: number;
  note: string;
}> {
  await loadLocalDb();
  await assertLocalOpsAction(actorId, 'overview_read');
  const today = todayInTz();
  const openCircleIds = new Set(
    memory.circles.filter((c) => c.status === 'open').map((c) => c.id),
  );
  const activeCircleIds = new Set<string>();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  for (const p of memory.posts) {
    if (p.createdAt >= weekAgo && openCircleIds.has(p.circleId)) activeCircleIds.add(p.circleId);
  }
  for (const m of memory.members) {
    if (m.status === 'active' && openCircleIds.has(m.circleId)) {
      /* membership alone is not activity — only count if circle had recent posts above */
    }
  }
  return {
    totalUsers: memory.profiles.length,
    activeUsers1d: localActiveUsersSince(86400000),
    activeUsers7d: localActiveUsersSince(7 * 86400000),
    activeUsers30d: localActiveUsersSince(30 * 86400000),
    schoolVerified: memory.schoolMemberships.filter((m) => m.status === 'verified').length,
    schoolPending: memory.schoolMemberships.filter(
      (m) => m.status === 'pending' || m.status === 'needs_more_info',
    ).length,
    circlesOpened: openCircleIds.size,
    circlesActive7d: activeCircleIds.size || openCircleIds.size,
    diaryEntriesToday: memory.diary.filter((d) => d.entryDate === today).length,
    friendDiaryVisitsToday: localMetricToday('friend_diary_visit'),
    openReports: memory.reports.filter(
      (r) => r.status === 'submitted' || r.status === 'reviewing' || r.status === 'open',
    ).length,
    openMixedIncidents: memory.circleSchoolIncidents.filter((i) => i.status === 'open').length,
    note: 'Aggregates only — not personal surveillance.',
  };
}

export async function recordFriendDiaryVisit(): Promise<void> {
  await loadLocalDb();
  const day = todayInTz('UTC');
  const row = memory.opsMetricCounters.find(
    (c) => c.metricKey === 'friend_diary_visit' && c.metricDay === day,
  );
  if (row) row.value += 1;
  else memory.opsMetricCounters.push({ metricKey: 'friend_diary_visit', metricDay: day, value: 1 });
  await persist();
}

export async function opsSetSchoolMembershipStatus(input: {
  actorId: string;
  userId: string;
  schoolId: string;
  status: 'suspended' | 'verified';
  note: string;
}): Promise<void> {
  await loadLocalDb();
  await assertLocalOpsAction(input.actorId, 'membership_suspend');
  if (!input.note.trim()) throw new AppError('VALIDATION', 'A reason is required.');
  const m = membershipForUser(input.userId, input.schoolId);
  if (!m) throw new AppError('NOT_FOUND', 'Membership not found.');
  const prev = m.status;
  if (input.status === 'verified' && prev !== 'suspended') {
    throw new AppError('CONFLICT', 'Only suspended memberships can be reinstated.');
  }
  m.status = input.status;
  m.updatedAt = now();
  if (input.status === 'verified') m.verifiedAt = m.verifiedAt ?? now();
  pushSchoolAudit({
    schoolId: input.schoolId,
    actorId: input.actorId,
    eventType: `membership_${input.status}`,
    payload: {
      userId: input.userId,
      fromStatus: prev,
      toStatus: input.status,
      note: input.note.trim(),
    },
  });
  await persist();
}

export async function opsFlagFakeSchoolVerification(input: {
  actorId: string;
  requestId: string;
  note: string;
}): Promise<{ reportId: string }> {
  await loadLocalDb();
  await assertLocalOpsAction(input.actorId, 'verification_review');
  if (!input.note.trim()) throw new AppError('VALIDATION', 'A reason is required.');
  const req = memory.schoolVerificationRequests.find((r) => r.id === input.requestId);
  if (!req) throw new AppError('NOT_FOUND', 'Request not found.');
  if (!['pending', 'needs_more_info', 'approved'].includes(req.status)) {
    throw new AppError('CONFLICT', 'Request not flaggable.');
  }
  req.status = 'needs_more_info';
  req.reviewNote = input.note.trim();
  req.reviewedAt = now();
  const membership = membershipForUser(req.userId, req.schoolId);
  if (
    membership &&
    (membership.status === 'pending' ||
      membership.status === 'needs_more_info' ||
      membership.status === 'verified')
  ) {
    membership.status = 'needs_more_info';
    membership.updatedAt = now();
  }
  const reportId = uid();
  memory.reports.push({
    id: reportId,
    reporterId: input.actorId,
    targetType: 'school_verification',
    targetId: req.id,
    reason: 'impersonation',
    details: input.note.trim(),
    contentSnapshot: JSON.stringify({
      kind: 'school_verification',
      requestId: req.id,
      userId: req.userId,
      schoolId: req.schoolId,
    }),
    status: 'reviewing',
    createdAt: now(),
  });
  pushSchoolAudit({
    schoolId: req.schoolId,
    actorId: input.actorId,
    eventType: 'verification_flagged_fake',
    payload: { requestId: req.id, reportId, note: input.note.trim() },
  });
  await persist();
  return { reportId };
}

export async function opsMergeSchools(input: {
  actorId: string;
  keepSchoolId: string;
  absorbSchoolId: string;
  note: string;
}): Promise<{ movedCircles: number; movedCodes: number }> {
  await loadLocalDb();
  await assertLocalOpsAction(input.actorId, 'school_merge');
  if (!input.note.trim()) throw new AppError('VALIDATION', 'A reason is required.');
  if (input.keepSchoolId === input.absorbSchoolId) {
    throw new AppError('VALIDATION', 'Pick two different schools.');
  }
  const keep = schoolById(input.keepSchoolId);
  const absorb = schoolById(input.absorbSchoolId);
  if (!keep || keep.status !== 'active') throw new AppError('NOT_FOUND', 'Keep school not found.');
  if (!absorb) throw new AppError('NOT_FOUND', 'Absorb school not found.');

  for (const m of memory.schoolMemberships.filter((x) => x.schoolId === input.absorbSchoolId)) {
    const conflict = membershipForUser(m.userId, input.keepSchoolId);
    if (conflict) {
      m.status = 'expired';
      m.updatedAt = now();
    } else if (m.status !== 'expired') {
      m.schoolId = input.keepSchoolId;
      m.updatedAt = now();
    }
  }

  let movedCodes = 0;
  for (const c of memory.schoolInviteCodes) {
    if (c.schoolId === input.absorbSchoolId) {
      c.schoolId = input.keepSchoolId;
      movedCodes += 1;
    }
  }

  let movedCircles = 0;
  for (const c of memory.circles) {
    if (c.schoolId === input.absorbSchoolId) {
      c.schoolId = input.keepSchoolId;
      movedCircles += 1;
    }
  }

  absorb.status = 'archived';
  pushSchoolAudit({
    schoolId: input.keepSchoolId,
    actorId: input.actorId,
    eventType: 'school_merged',
    payload: {
      absorbSchoolId: input.absorbSchoolId,
      movedCircles,
      movedCodes,
      note: input.note.trim(),
    },
  });
  await persist();
  return { movedCircles, movedCodes };
}

export async function listActiveSchoolsForOps(actorId: string): Promise<
  { id: string; displayName: string; status: string }[]
> {
  await loadLocalDb();
  await assertLocalModerator(actorId);
  return memory.schools.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    status: s.status,
  }));
}

/** Test helper — set membership status without ops UI. */
export async function setSchoolMembershipStatusForTests(input: {
  userId: string;
  schoolId: string;
  status: Exclude<SchoolMembershipStatus, 'none'>;
}): Promise<void> {
  await loadLocalDb();
  // Drop other-school rows so attacker personas stay single-school.
  memory.schoolMemberships = memory.schoolMemberships.filter(
    (row) => !(row.userId === input.userId && row.schoolId !== input.schoolId),
  );
  let m = membershipForUser(input.userId, input.schoolId);
  if (!m) {
    m = {
      id: uid(),
      schoolId: input.schoolId,
      userId: input.userId,
      status: input.status,
      createdAt: now(),
      updatedAt: now(),
      verifiedAt: input.status === 'verified' ? now() : undefined,
    };
    memory.schoolMemberships.push(m);
  } else {
    m.status = input.status;
    m.updatedAt = now();
    if (input.status === 'verified') m.verifiedAt = now();
  }
  await persist();
}

export async function clearLocalDb(): Promise<void> {
  memory = structuredClone(empty);
  ensureSchoolSeed();
  loaded = true;
  await persist();
}

/** Demo convenience: verify at beta unless user already belongs to another school. */
function ensureDemoSchoolForUser(userId: string): void {
  const primary = primaryMembership(userId);
  if (
    primary &&
    primary.schoolId !== BETA_SCHOOL_ID &&
    (primary.status === 'verified' ||
      primary.status === 'pending_change' ||
      primary.status === 'suspended')
  ) {
    return;
  }
  ensureVerifiedSchoolMembership(userId, BETA_SCHOOL_ID);
}

function ensureDemoFriendProfiles(selfId: string): void {
  const seeds: Profile[] = [
    { id: '00000000-0000-4000-8000-0000000000a1', displayName: 'Minseo', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000b2', displayName: 'Junho', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000c3', displayName: 'Seoyeon', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000d4', displayName: 'Sam', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000e5', displayName: 'Casey', status: 'active', createdAt: now() },
  ];
  for (const s of seeds) {
    if (s.id !== selfId && !memory.profiles.some((p) => p.id === s.id)) {
      memory.profiles.push(s);
    }
  }
}

function ensureDemoFriends(selfId: string): void {
  ensureDemoFriendProfiles(selfId);
  for (const s of memory.profiles) {
    if (
      s.id === selfId ||
      s.id.startsWith('00000000-0000-4000-8000-0000000000')
    ) {
      ensureDemoSchoolForUser(s.id);
    }
  }
  ensureDemoSchoolForUser(selfId);
}

export async function signUpLocal(displayName: string): Promise<Profile> {
  await loadLocalDb();
  const profile: Profile = {
    id: uid(),
    displayName: displayName.trim(),
    status: 'active',
    createdAt: now(),
  };
  memory.profiles.push(profile);
  memory.sessionUserId = profile.id;
  // Seed demo directory contacts only — school stays unverified until code/ops/circle open.
  ensureDemoFriendProfiles(profile.id);
  await persist();
  return profile;
}

export async function getSessionProfile(): Promise<Profile | null> {
  await loadLocalDb();
  if (!memory.sessionUserId) return null;
  return memory.profiles.find((p) => p.id === memory.sessionUserId) ?? null;
}

export async function listDirectory(excludeId: string): Promise<Profile[]> {
  await loadLocalDb();
  ensureDemoFriends(excludeId);
  await persist();
  return memory.profiles.filter((p) => p.id !== excludeId && p.status === 'active');
}

export async function getProfile(id: string): Promise<Profile | null> {
  await loadLocalDb();
  return memory.profiles.find((p) => p.id === id) ?? null;
}

/** Same rules as open_circle_from_draft (§6) */
export async function proposeCircleDraft(
  proposerId: string,
  proposedName: string,
  inviteeIds: [string, string],
): Promise<{ draftId: string }> {
  await loadLocalDb();
  if (inviteeIds[0] === inviteeIds[1]) {
    throw new AppError('VALIDATION', 'Pick two different people.');
  }
  if (inviteeIds.includes(proposerId)) {
    throw new AppError('VALIDATION', 'You can’t invite yourself.');
  }
  ensureDemoFriends(proposerId);
  ensureDemoSchoolForUser(proposerId);
  ensureDemoSchoolForUser(inviteeIds[0]);
  ensureDemoSchoolForUser(inviteeIds[1]);

  const draft: CircleDraft = {
    id: uid(),
    proposerId,
    proposedName: proposedName.trim(),
    status: 'pending',
    createdAt: now(),
  };
  memory.drafts.push(draft);
  memory.draftMembers.push(
    {
      draftId: draft.id,
      userId: proposerId,
      memberType: 'proposer',
      responseStatus: 'accepted',
    },
    {
      draftId: draft.id,
      userId: inviteeIds[0],
      memberType: 'invitee',
      responseStatus: 'pending',
    },
    {
      draftId: draft.id,
      userId: inviteeIds[1],
      memberType: 'invitee',
      responseStatus: 'pending',
    },
  );
  await persist();
  return { draftId: draft.id };
}

export async function respondDraftInvite(
  draftId: string,
  userId: string,
  accept: boolean,
): Promise<Circle | null> {
  await loadLocalDb();
  const members = memory.draftMembers.filter((m) => m.draftId === draftId);
  const me = members.find((m) => m.userId === userId);
  if (!me || me.memberType !== 'invitee') {
    throw new AppError('FORBIDDEN', 'You can’t respond to this invite.');
  }
  if (me.responseStatus !== 'pending') {
    throw new AppError('CONFLICT', 'You already responded to this invite.');
  }

  if (!accept) {
    me.responseStatus = 'declined';
    for (const m of members) {
      if (m.responseStatus === 'pending') m.responseStatus = 'expired';
    }
    const draft = memory.drafts.find((d) => d.id === draftId);
    if (draft) draft.status = 'cancelled';
    await persist();
    return null;
  }

  me.responseStatus = 'accepted';
  await persist();
  return openCircleFromDraft(draftId, userId);
}

/** Mirror of open_circle_from_draft */
export async function openCircleFromDraft(
  draftId: string,
  actorId: string,
): Promise<Circle | null> {
  await loadLocalDb();
  const draft = memory.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status !== 'pending') {
    throw new AppError('CONFLICT', 'This draft was already handled.');
  }

  const members = memory.draftMembers.filter((m) => m.draftId === draftId);
  const unique = new Set(members.map((m) => m.userId));
  if (unique.size !== CIRCLE_PIONEER_COUNT) {
    throw new AppError('VALIDATION', 'A circle needs exactly three pioneers.');
  }
  if (!unique.has(actorId)) {
    throw new AppError('FORBIDDEN', 'Only draft members can open the circle.');
  }
  if (!members.every((m) => m.responseStatus === 'accepted')) {
    return null;
  }

  // Server assigns school from proposer's verified membership (never client school_id)
  const proposerMembership = primaryMembership(draft.proposerId);
  const proposerSchool = proposerMembership
    ? schoolById(proposerMembership.schoolId)
    : undefined;
  if (!isVerifiedSchoolMember(proposerMembership, proposerSchool) || !proposerMembership) {
    throw new AppError('FORBIDDEN', 'Verified school membership required to open a circle.');
  }
  for (const m of members) {
    const mem = membershipForUser(m.userId, proposerMembership.schoolId);
    const sch = schoolById(proposerMembership.schoolId);
    if (!isVerifiedSchoolMember(mem, sch)) {
      throw new AppError('FORBIDDEN', 'All pioneers must be verified at the same school.');
    }
  }

  const circle: Circle = {
    id: uid(),
    name: draft.proposedName,
    description: '',
    color: CIRCLE_COLORS[0],
    symbol: CIRCLE_SYMBOLS[0],
    createdBy: draft.proposerId,
    status: 'open',
    schoolId: proposerMembership.schoolId,
    openedAt: now(),
    createdAt: now(),
  };

  memory.circles.push(circle);
  for (const m of members) {
    memory.members.push({
      circleId: circle.id,
      userId: m.userId,
      role: m.userId === draft.proposerId ? 'admin' : 'pioneer',
      isPioneer: true,
      status: 'active',
    });
  }
  draft.status = 'opened';
  await persist();
  return circle;
}

/** Demo: both invites accept immediately */
export async function demoAcceptAll(draftId: string): Promise<Circle> {
  await loadLocalDb();
  const pending = memory.draftMembers.filter(
    (m) => m.draftId === draftId && m.memberType === 'invitee' && m.responseStatus === 'pending',
  );
  let opened: Circle | null = null;
  for (const m of pending) {
    opened = await respondDraftInvite(draftId, m.userId, true);
  }
  if (!opened) throw new AppError('UNKNOWN', 'Couldn’t open the circle.');
  return opened;
}

/**
 * Local demo path: ensure the user has at least one open circle (planets after intro).
 * Idempotent — skips if they already belong to an open circle.
 */
export async function ensureDemoOpenCircle(userId: string): Promise<CircleSummary[]> {
  await loadLocalDb();
  const existing = await listMyCircleSummaries(userId);
  if (existing.length > 0) return existing;

  ensureDemoFriends(userId);
  ensureVerifiedSchoolMembership(userId, BETA_SCHOOL_ID);
  const friendA = '00000000-0000-4000-8000-0000000000a1'; // Minseo
  const friendB = '00000000-0000-4000-8000-0000000000b2'; // Junho
  ensureVerifiedSchoolMembership(friendA, BETA_SCHOOL_ID);
  ensureVerifiedSchoolMembership(friendB, BETA_SCHOOL_ID);
  const { draftId } = await proposeCircleDraft(userId, 'Brooklyn Friends', [friendA, friendB]);
  const circle = await demoAcceptAll(draftId);
  // Give the demo circle a second companion planet feel via design tweak only if needed
  await updateCircleDesign(circle.id, userId, {
    color: CIRCLE_COLORS[2] ?? CIRCLE_COLORS[0],
    symbol: CIRCLE_SYMBOLS[2] ?? CIRCLE_SYMBOLS[0],
  });
  seedHompyBoardDemo(userId, friendA, circle.id);
  await persist();
  return listMyCircleSummaries(userId);
}

/** Soft demo rows for existing local sessions that already have a circle. */
export async function ensureHompyBoardSeeds(userId: string): Promise<void> {
  await loadLocalDb();
  const circles = await listMyCircleSummaries(userId);
  if (circles.length === 0) return;
  const friendA = '00000000-0000-4000-8000-0000000000a1';
  const before =
    memory.guestbook.length + memory.freeBoard.length + memory.anonymousPosts.length;
  seedHompyBoardDemo(userId, friendA, circles[0]!.id);
  const after =
    memory.guestbook.length + memory.freeBoard.length + memory.anonymousPosts.length;
  if (after !== before) await persist();
}

/** Soft demo rows so school-style boards aren’t empty on first open. */
function seedHompyBoardDemo(ownerId: string, friendId: string, circleId: string): void {
  if (!memory.guestbook.some((g) => g.ownerUserId === ownerId)) {
    memory.guestbook.push({
      id: uid(),
      ownerUserId: ownerId,
      authorUserId: friendId,
      body: '다녀가요~ 오늘 기분 좋아 보여요.',
      hidden: false,
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    });
  }
  if (!memory.freeBoard.some((p) => p.ownerUserId === ownerId)) {
    memory.freeBoard.push(
      {
        id: uid(),
        ownerUserId: ownerId,
        authorUserId: ownerId,
        body: '자유게시판 첫 글 — 여기에 아무거나 남겨요.',
        hidden: false,
        createdAt: new Date(Date.now() - 7200_000).toISOString(),
      },
      {
        id: uid(),
        ownerUserId: ownerId,
        authorUserId: friendId,
        body: '사진첩이랑 캘린더 느낌 좋아요!',
        hidden: false,
        createdAt: new Date(Date.now() - 1800_000).toISOString(),
      },
    );
  }
  if (!memory.anonymousPosts.some((p) => p.circleId === circleId)) {
    const alias = {
      id: uid(),
      circleId,
      userId: friendId,
      aliasName: 'Quiet Lantern',
      createdAt: now(),
    };
    memory.circleAliases.push(alias);
    memory.anonymousPosts.push({
      id: uid(),
      circleId,
      authorUserId: friendId,
      aliasId: alias.id,
      body: '같은 서클만 보는 써클게시판이에요.',
      status: 'active',
      createdAt: new Date(Date.now() - 5400_000).toISOString(),
    });
  }
}

export async function updateCircleDesign(
  circleId: string,
  actorId: string,
  patch: Partial<Pick<Circle, 'name' | 'description' | 'color' | 'symbol'>>,
): Promise<Circle> {
  await loadLocalDb();
  const member = memory.members.find(
    (m) => m.circleId === circleId && m.userId === actorId && m.status === 'active',
  );
  if (!member || (member.role !== 'admin' && !member.isPioneer)) {
    throw new AppError('FORBIDDEN', 'You can’t edit this circle.');
  }
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle) throw new AppError('NOT_FOUND', 'Circle not found.');
  Object.assign(circle, patch);
  await persist();
  return circle;
}

export async function listMyCircleSummaries(userId: string): Promise<CircleSummary[]> {
  await loadLocalDb();
  const my = memory.members.filter((m) => m.userId === userId && m.status === 'active');
  const today = todayInTz();
  return my
    .map((m) => memory.circles.find((c) => c.id === m.circleId && c.status === 'open'))
    .filter((c): c is Circle => Boolean(c))
    .map((c) => {
      const members = memory.members.filter((x) => x.circleId === c.id && x.status === 'active');
      const wroteTodayCount = members.filter((x) =>
        memory.diary.some((d) => d.userId === x.userId && d.entryDate === today),
      ).length;
      const hasActiveNotice = memory.posts.some(
        (p) =>
          p.circleId === c.id &&
          p.status === 'active' &&
          new Date(p.closesAt).getTime() > Date.now(),
      );
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        symbol: c.symbol,
        activeMemberCount: members.length,
        wroteTodayCount,
        hasActiveNotice,
      };
    });
}

export async function listCircleMembers(
  circleId: string,
  viewerId?: string,
): Promise<Member[]> {
  await loadLocalDb();
  if (viewerId && !(await isCircleMember(circleId, viewerId))) {
    throw new AppError('FORBIDDEN', 'Only members can view the roster.');
  }
  return memory.members.filter((m) => m.circleId === circleId && m.status === 'active');
}

export async function getCircle(circleId: string): Promise<Circle | null> {
  await loadLocalDb();
  return memory.circles.find((c) => c.id === circleId) ?? null;
}

export async function isCircleMember(circleId: string, userId: string): Promise<boolean> {
  // Mirrors SQL is_circle_member → can_access_circle (school + active member)
  return canAccessCircle(circleId, userId);
}

/** Invite-link preview — minimal fields only (mirrors get_circle_invite_preview) */
export async function getCircleInvitePreview(
  circleId: string,
  viewerId: string,
): Promise<{
  id: string;
  name: string;
  description: string;
  color: string;
  symbol: string;
  memberCount: number;
  isMember: boolean;
} | null> {
  await loadLocalDb();
  const circle = memory.circles.find((c) => c.id === circleId && c.status === 'open');
  if (!circle?.schoolId) return null;
  const membership = membershipForUser(viewerId, circle.schoolId);
  const school = schoolById(circle.schoolId);
  if (!isSchoolMemberForAccess(membership, school)) return null;
  const members = memory.members.filter((m) => m.circleId === circleId && m.status === 'active');
  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    color: circle.color,
    symbol: circle.symbol,
    memberCount: members.length,
    isMember: await isCircleMember(circleId, viewerId),
  };
}

/** Members eligible as recommenders for an applicant (active, not blocked, not self) */
export async function listJoinRecommenderCandidates(
  circleId: string,
  applicantId: string,
): Promise<Profile[]> {
  await loadLocalDb();
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle || circle.status !== 'open') {
    throw new AppError('NOT_FOUND', 'Circle not found.');
  }
  if (await isCircleMember(circleId, applicantId)) {
    throw new AppError('CONFLICT', 'You’re already a member.');
  }
  const members = memory.members.filter((m) => m.circleId === circleId && m.status === 'active');
  const out: Profile[] = [];
  for (const m of members) {
    if (m.userId === applicantId) continue;
    if (await isBlockedBetween(applicantId, m.userId)) continue;
    const profile = memory.profiles.find((p) => p.id === m.userId);
    if (profile) out.push(profile);
  }
  return out;
}

/** Mirrors create_circle_join_request RPC */
export async function createJoinRequest(
  circleId: string,
  applicantId: string,
  recommenderIds: string[],
): Promise<JoinRequest> {
  await loadLocalDb();
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle) throw new AppError('NOT_FOUND', 'Circle not found.');
  if (circle.status !== 'open') {
    throw new AppError('VALIDATION', 'This circle isn’t open for joins.');
  }
  if (await isCircleMember(circleId, applicantId)) {
    throw new AppError('CONFLICT', 'You’re already a member.');
  }
  if (recommenderIds.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new AppError(
      'VALIDATION',
      `Choose ${CIRCLE_JOIN_RECOMMENDATION_COUNT} members who actually know you.`,
    );
  }
  const unique = new Set(recommenderIds);
  if (unique.size !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new AppError('VALIDATION', 'Choose different recommenders.');
  }
  if (unique.has(applicantId)) {
    throw new AppError('VALIDATION', 'You can’t recommend yourself.');
  }
  if (
    memory.joinRequests.some(
      (r) => r.circleId === circleId && r.applicantId === applicantId && r.status === 'pending',
    )
  ) {
    throw new AppError('CONFLICT', 'You already have a pending request.');
  }

  if (!circle.schoolId) {
    throw new AppError('FORBIDDEN', 'Circle has no school boundary.');
  }
  const applicantMem = membershipForUser(applicantId, circle.schoolId);
  const applicantSchool = schoolById(circle.schoolId);
  if (!isVerifiedSchoolMember(applicantMem, applicantSchool)) {
    throw new AppError('FORBIDDEN', 'Verified same-school membership required to join.');
  }

  for (const id of recommenderIds) {
    if (!(await isCircleMember(circleId, id))) {
      throw new AppError('VALIDATION', 'Recommenders must be circle members.');
    }
    if (await isBlockedBetween(applicantId, id)) {
      throw new AppError('FORBIDDEN', 'Blocked members can’t be recommenders.');
    }
  }

  const stamp = now();
  const request: JoinRequest = {
    id: uid(),
    circleId,
    applicantId,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  memory.joinRequests.push(request);
  for (const recommenderId of recommenderIds) {
    memory.recommendations.push({
      id: uid(),
      requestId: request.id,
      recommenderId,
      decision: 'pending',
      createdAt: stamp,
    });
    memory.notifications.push({
      id: uid(),
      userId: recommenderId,
      eventType: 'join_recommendation_requested',
      payload: { requestId: request.id, circleId },
      createdAt: stamp,
    });
  }
  await persist();
  return request;
}

function expireJoinRequestIfNeeded(request: JoinRequest): void {
  if (request.status === 'pending' && new Date(request.expiresAt).getTime() <= Date.now()) {
    request.status = 'expired';
    request.updatedAt = now();
  }
}

/** Mirrors respond_circle_recommendation — decision by recommendation row id */
export async function respondCircleRecommendation(
  recommendationId: string,
  actorId: string,
  decision: 'recommended' | 'unknown',
): Promise<'pending' | 'approved'> {
  await loadLocalDb();
  const rec = memory.recommendations.find((r) => r.id === recommendationId);
  if (!rec) throw new AppError('NOT_FOUND', 'Recommendation request not found.');
  if (rec.recommenderId !== actorId) {
    throw new AppError('FORBIDDEN', 'This recommendation isn’t yours.');
  }
  if (rec.decision !== 'pending') {
    throw new AppError('CONFLICT', 'You already responded.');
  }

  const request = memory.joinRequests.find((r) => r.id === rec.requestId);
  if (!request) throw new AppError('NOT_FOUND', 'Join request not found.');
  expireJoinRequestIfNeeded(request);
  if (request.status !== 'pending') {
    throw new AppError('CONFLICT', 'This request was already handled.');
  }
  await assertCanWriteCircle(request.circleId, actorId);
  if (await isBlockedBetween(actorId, request.applicantId)) {
    throw new AppError('FORBIDDEN', 'Blocked users can’t complete this recommendation.');
  }
  const circle = memory.circles.find((c) => c.id === request.circleId);
  if (circle?.schoolId) {
    const appMem = membershipForUser(request.applicantId, circle.schoolId);
    const appSchool = schoolById(circle.schoolId);
    if (!isVerifiedSchoolMember(appMem, appSchool)) {
      throw new AppError('FORBIDDEN', 'Applicant must be verified at the same school.');
    }
  }

  if (decision === 'recommended') {
    const already = memory.recommendations.filter(
      (r) => r.requestId === request.id && r.decision === 'recommended',
    );
    const wouldBe = new Set([...already.map((r) => r.recommenderId), actorId]);
    if (wouldBe.size >= CIRCLE_JOIN_RECOMMENDATION_COUNT) {
      for (const rid of wouldBe) {
        if (await isBlockedBetween(request.applicantId, rid)) {
          throw new AppError('FORBIDDEN', 'A block prevents joining this circle.');
        }
      }
    }
  }

  rec.decision = decision;
  rec.respondedAt = now();

  if (decision !== 'recommended') {
    await persist();
    return 'pending';
  }

  const recommendedCount = new Set(
    memory.recommendations
      .filter((r) => r.requestId === request.id && r.decision === 'recommended')
      .map((r) => r.recommenderId),
  ).size;

  if (recommendedCount < CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    await persist();
    return 'pending';
  }

  if (!(await isCircleMember(request.circleId, request.applicantId))) {
    memory.members.push({
      circleId: request.circleId,
      userId: request.applicantId,
      role: 'member',
      isPioneer: false,
      status: 'active',
    });
  }

  request.status = 'approved';
  request.approvedAt = request.approvedAt ?? now();
  request.updatedAt = now();

  for (const r of memory.recommendations) {
    if (r.requestId === request.id && r.decision === 'pending') {
      r.decision = 'unknown';
      r.respondedAt = r.respondedAt ?? now();
    }
  }

  const exists = memory.notifications.some(
    (n) =>
      n.userId === request.applicantId &&
      n.eventType === 'join_request_approved' &&
      n.payload.requestId === request.id,
  );
  if (!exists) {
    memory.notifications.push({
      id: uid(),
      userId: request.applicantId,
      eventType: 'join_request_approved',
      payload: { requestId: request.id, circleId: request.circleId },
      createdAt: now(),
    });
  }

  await persist();
  return 'approved';
}

/** @deprecated prefer respondCircleRecommendation(recommendationId) */
export async function decideRecommendation(
  requestId: string,
  recommenderId: string,
  decision: 'recommended' | 'unknown' | 'later',
): Promise<JoinRequest | null> {
  if (decision === 'later') return null;
  await loadLocalDb();
  const rec = memory.recommendations.find(
    (r) => r.requestId === requestId && r.recommenderId === recommenderId,
  );
  if (!rec) throw new AppError('NOT_FOUND', 'Recommendation request not found.');
  const status = await respondCircleRecommendation(rec.id, recommenderId, decision);
  const request = memory.joinRequests.find((r) => r.id === requestId) ?? null;
  if (!request) return null;
  return status === 'approved' || request.status === 'pending' ? request : null;
}

export async function cancelJoinRequest(requestId: string, applicantId: string): Promise<void> {
  await loadLocalDb();
  const request = memory.joinRequests.find((r) => r.id === requestId);
  if (!request || request.applicantId !== applicantId || request.status !== 'pending') {
    throw new AppError('CONFLICT', 'This request can’t be cancelled.');
  }
  request.status = 'cancelled';
  request.updatedAt = now();
  await persist();
}

/** Applicant-safe progress — never returns recommender identities or decisions */
export async function getJoinProgress(
  requestId: string,
  viewerId?: string,
): Promise<{
  requestId: string;
  circleId: string;
  status: JoinRequest['status'];
  recommended: number;
  total: number;
  expiresAt: string;
}> {
  await loadLocalDb();
  const request = memory.joinRequests.find((r) => r.id === requestId);
  if (!request) throw new AppError('NOT_FOUND', 'Join request not found.');
  if (viewerId && request.applicantId !== viewerId) {
    throw new AppError('FORBIDDEN', 'Only the applicant can view progress.');
  }
  expireJoinRequestIfNeeded(request);
  const recommended = new Set(
    memory.recommendations
      .filter((r) => r.requestId === requestId && r.decision === 'recommended')
      .map((r) => r.recommenderId),
  ).size;
  return {
    requestId: request.id,
    circleId: request.circleId,
    status: request.status,
    recommended,
    total: CIRCLE_JOIN_RECOMMENDATION_COUNT,
    expiresAt: request.expiresAt,
  };
}

/** Recommender inbox — applicant name + circle name only */
export async function listMyJoinRecommendations(recommenderId: string): Promise<
  {
    recommendationId: string;
    requestId: string;
    decision: Recommendation['decision'];
    createdAt: string;
    applicantDisplayName: string;
    circleId: string;
    circleName: string;
    requestedAt: string;
  }[]
> {
  await loadLocalDb();
  const out = [];
  for (const r of memory.recommendations) {
    if (r.recommenderId !== recommenderId || r.decision !== 'pending') continue;
    const req = memory.joinRequests.find((j) => j.id === r.requestId);
    if (!req || req.status !== 'pending') continue;
    expireJoinRequestIfNeeded(req);
    if (req.status !== 'pending') continue;
    const applicant = memory.profiles.find((p) => p.id === req.applicantId);
    const circle = memory.circles.find((c) => c.id === req.circleId);
    out.push({
      recommendationId: r.id,
      requestId: r.requestId,
      decision: r.decision,
      createdAt: r.createdAt,
      applicantDisplayName: applicant?.displayName ?? 'Someone',
      circleId: req.circleId,
      circleName: circle?.name ?? 'Circle',
      requestedAt: req.createdAt,
    });
  }
  return out;
}

export async function getJoinRequest(
  requestId: string,
  viewerId: string,
): Promise<JoinRequest | null> {
  await loadLocalDb();
  const request = memory.joinRequests.find((r) => r.id === requestId) ?? null;
  if (!request) return null;
  if (request.applicantId !== viewerId) {
    throw new AppError('FORBIDDEN', 'Only the applicant can view this request.');
  }
  expireJoinRequestIfNeeded(request);
  return request;
}

export async function getRecommendationForViewer(
  recommendationId: string,
  viewerId: string,
): Promise<{
  recommendationId: string;
  applicantDisplayName: string;
  circleName: string;
  circleId: string;
  requestedAt: string;
  decision: Recommendation['decision'];
} | null> {
  await loadLocalDb();
  const r = memory.recommendations.find((x) => x.id === recommendationId);
  if (!r || r.recommenderId !== viewerId) return null;
  const req = memory.joinRequests.find((j) => j.id === r.requestId);
  if (!req) return null;
  const applicant = memory.profiles.find((p) => p.id === req.applicantId);
  const circle = memory.circles.find((c) => c.id === req.circleId);
  return {
    recommendationId: r.id,
    applicantDisplayName: applicant?.displayName ?? 'Someone',
    circleName: circle?.name ?? 'Circle',
    circleId: req.circleId,
    requestedAt: req.createdAt,
    decision: r.decision,
  };
}

/** Demo: Yujin applies; Minseo / Junho / Seoyeon recommend (fixed seeds) */
export const DEMO_JOIN_IDS = {
  yujin: '00000000-0000-4000-8000-0000000000f6',
  minseo: '00000000-0000-4000-8000-0000000000a1',
  junho: '00000000-0000-4000-8000-0000000000b2',
  seoyeon: '00000000-0000-4000-8000-0000000000c3',
} as const;

export async function ensureDemoJoinApplicant(): Promise<Profile> {
  await loadLocalDb();
  let profile = memory.profiles.find((p) => p.id === DEMO_JOIN_IDS.yujin);
  if (!profile) {
    profile = {
      id: DEMO_JOIN_IDS.yujin,
      displayName: 'Yujin',
      status: 'active',
      createdAt: now(),
    };
    memory.profiles.push(profile);
  }
  ensureDemoSchoolForUser(DEMO_JOIN_IDS.yujin);
  ensureDemoSchoolForUser(DEMO_JOIN_IDS.minseo);
  ensureDemoSchoolForUser(DEMO_JOIN_IDS.junho);
  ensureDemoSchoolForUser(DEMO_JOIN_IDS.seoyeon);
  await persist();
  return profile;
}

export async function switchSession(userId: string): Promise<Profile> {
  await loadLocalDb();
  const previous = memory.sessionUserId;
  const profile = memory.profiles.find((p) => p.id === userId);
  if (!profile) throw new AppError('NOT_FOUND', 'Profile not found.');
  // Caller should also run switchAccountIsolation(previous) for query/presence teardown.
  memory.sessionUserId = userId;
  await persist();
  void previous;
  return profile;
}

/** Clear session pointer without wiping demo DB (logout → sign-in). */
export async function clearSessionUser(): Promise<string | null> {
  await loadLocalDb();
  const previous = memory.sessionUserId;
  memory.sessionUserId = null;
  await persist();
  return previous;
}

export async function countJoinArtifacts(
  circleId: string,
  applicantId: string,
): Promise<{ requests: number; recommendations: number; membership: number; approvals: number }> {
  await loadLocalDb();
  const requests = memory.joinRequests.filter(
    (r) => r.circleId === circleId && r.applicantId === applicantId,
  );
  const requestIds = new Set(requests.map((r) => r.id));
  return {
    requests: requests.length,
    recommendations: memory.recommendations.filter((r) => requestIds.has(r.requestId)).length,
    membership: memory.members.filter(
      (m) => m.circleId === circleId && m.userId === applicantId && m.status === 'active',
    ).length,
    approvals: memory.notifications.filter(
      (n) =>
        n.userId === applicantId &&
        n.eventType === 'join_request_approved' &&
        n.payload.circleId === circleId,
    ).length,
  };
}

export async function upsertDiary(input: {
  userId: string;
  mood?: DiaryMood;
  tenCharText?: string;
  shortText?: string;
  visibilityMode?: DiaryVisibilityMode;
  circleIds?: string[];
  timezone?: string;
  clientRequestId?: string;
  /** If set and server row differs, throw CONFLICT (no silent overwrite). */
  expectedUpdatedAt?: string;
  /** Explicit user choice after conflict UI. */
  forceOverwrite?: boolean;
}): Promise<DiaryEntry> {
  await loadLocalDb();
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const entryDate = todayInTz(timezone);
  const existing = memory.diary.find((d) => d.userId === input.userId && d.entryDate === entryDate);

  if (
    existing &&
    input.expectedUpdatedAt &&
    !input.forceOverwrite &&
    existing.updatedAt !== input.expectedUpdatedAt
  ) {
    throw new AppError(
      'CONFLICT',
      'This entry was updated on another device. Choose which version to keep.',
    );
  }

  const entry: DiaryEntry = existing
    ? {
        ...existing,
        mood: input.mood ?? existing.mood,
        tenCharText: input.tenCharText ?? existing.tenCharText,
        shortText: input.shortText ?? existing.shortText,
        visibilityMode: input.visibilityMode ?? existing.visibilityMode,
        updatedAt: now(),
      }
    : {
        id: input.clientRequestId ?? uid(),
        userId: input.userId,
        entryDate,
        timezone,
        mood: input.mood,
        tenCharText: input.tenCharText,
        shortText: input.shortText,
        visibilityMode: input.visibilityMode ?? 'private',
        createdAt: now(),
        updatedAt: now(),
      };

  memory.diary = memory.diary.filter((d) => d.id !== entry.id);
  memory.diary.push(entry);

  if (input.circleIds) {
    memory.diaryVisibility = memory.diaryVisibility.filter((v) => v.entryId !== entry.id);
    for (const circleId of input.circleIds) {
      memory.diaryVisibility.push({ entryId: entry.id, circleId });
    }
  }

  await persist();
  return entry;
}

export async function getDiary(userId: string, entryDate?: string): Promise<DiaryEntry | null> {
  await loadLocalDb();
  const date = entryDate ?? todayInTz();
  return memory.diary.find((d) => d.userId === userId && d.entryDate === date) ?? null;
}

/** Recent entries for mini-hompy week calendar (newest first). */
export async function listRecentDiaryEntries(
  userId: string,
  limit = 14,
): Promise<DiaryEntry[]> {
  await loadLocalDb();
  return memory.diary
    .filter((d) => d.userId === userId)
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .slice(0, limit);
}

export async function canViewDiary(
  viewerId: string,
  ownerId: string,
  entry: DiaryEntry,
): Promise<boolean> {
  await loadLocalDb();
  if (viewerId === ownerId) return true;
  if (await isBlockedBetween(viewerId, ownerId)) return false;
  if (entry.visibilityMode === 'private') return false;

  const shared: string[] = [];
  for (const circle of memory.circles.filter((c) => c.status === 'open')) {
    if (
      (await canAccessCircle(circle.id, viewerId)) &&
      (await canAccessCircle(circle.id, ownerId))
    ) {
      shared.push(circle.id);
    }
  }
  if (shared.length === 0) return false;
  if (entry.visibilityMode === 'all_circles') return true;

  const allowed = new Set(
    memory.diaryVisibility.filter((v) => v.entryId === entry.id).map((v) => v.circleId),
  );
  return shared.some((id) => allowed.has(id));
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await loadLocalDb();
  assertNotSuspended(blockerId);
  if (blockerId === blockedId) {
    throw new AppError('VALIDATION', 'You can’t block yourself.');
  }
  if (!memory.profiles.some((p) => p.id === blockedId)) {
    throw new AppError('NOT_FOUND', 'User not found.');
  }
  if (!memory.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) {
    memory.blocks.push({ blockerId, blockedId });
    await persist();
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await loadLocalDb();
  memory.blocks = memory.blocks.filter(
    (b) => !(b.blockerId === blockerId && b.blockedId === blockedId),
  );
  await persist();
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  await loadLocalDb();
  return memory.blocks.some(
    (x) =>
      (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a),
  );
}

export async function listBlocks(blockerId: string): Promise<string[]> {
  await loadLocalDb();
  return memory.blocks.filter((b) => b.blockerId === blockerId).map((b) => b.blockedId);
}

function assertNotSuspended(userId: string): void {
  const row = memory.moderationStatus.find((m) => m.userId === userId);
  if (row?.accountStatus === 'suspended') {
    throw new AppError('FORBIDDEN', 'This account is temporarily limited.');
  }
}

const POST_TITLE_MAX = 80;
const POST_BODY_MAX = 300;
const OPTION_MAX = 40;
const MIN_ACTIVE_MS = 10 * 60 * 1000;
const MAX_ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

export async function canCreateCirclePost(circleId: string, userId: string): Promise<boolean> {
  await loadLocalDb();
  if (!(await canWriteCircle(circleId, userId))) return false;
  const member = memory.members.find(
    (m) => m.circleId === circleId && m.userId === userId && m.status === 'active',
  );
  if (!member) return false;
  return member.role === 'admin' || member.role === 'pioneer' || member.isPioneer;
}

/** One active post per circle (mirrors partial unique index + create_circle_post RPC) */
export async function createCirclePost(input: {
  circleId: string;
  createdBy: string;
  type: 'notice' | 'poll';
  title: string;
  body?: string;
  closesAt: string;
  options?: string[];
}): Promise<CirclePostRecord> {
  await loadLocalDb();
  await assertCanWriteCircle(input.circleId, input.createdBy);
  if (!(await canCreateCirclePost(input.circleId, input.createdBy))) {
    throw new AppError('FORBIDDEN', 'Only admins can create notices or polls.');
  }

  const title = input.title.trim();
  if (title.length < 1 || title.length > POST_TITLE_MAX) {
    throw new AppError('VALIDATION', 'Title must be 1–80 characters.');
  }
  const body = input.body?.trim() ?? '';
  if (body.length > POST_BODY_MAX) {
    throw new AppError('VALIDATION', 'Body must be at most 300 characters.');
  }

  const closes = new Date(input.closesAt).getTime();
  const t = Date.now();
  if (!Number.isFinite(closes) || closes <= t) {
    throw new AppError('VALIDATION', 'Choose an end time in the future.');
  }
  if (closes < t + MIN_ACTIVE_MS) {
    throw new AppError('VALIDATION', 'Active period must be at least 10 minutes.');
  }
  if (closes > t + MAX_ACTIVE_MS) {
    throw new AppError('VALIDATION', 'Active period cannot exceed 7 days.');
  }

  // Expire lingering active rows (mirror 013)
  for (const p of memory.posts) {
    if (
      p.circleId === input.circleId &&
      p.status === 'active' &&
      new Date(p.closesAt).getTime() <= t
    ) {
      p.status = 'closed';
      p.closedAt = now();
    }
  }

  const active = memory.posts.find(
    (p) => p.circleId === input.circleId && p.status === 'active',
  );
  if (active) {
    throw new AppError('CONFLICT', 'This circle already has an active notice or poll.');
  }

  if (input.type === 'notice') {
    if ((input.options ?? []).some((o) => o.trim())) {
      throw new AppError('VALIDATION', 'Notices cannot have poll options.');
    }
  } else {
    const opts = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2 || opts.length > 4) {
      throw new AppError('VALIDATION', 'Polls need 2–4 options.');
    }
    if (new Set(opts).size !== opts.length) {
      throw new AppError('VALIDATION', 'Poll options must be unique.');
    }
    for (const label of opts) {
      if (label.length < 1 || label.length > OPTION_MAX) {
        throw new AppError('VALIDATION', 'Each option must be 1–40 characters.');
      }
    }
  }

  const post: CirclePostRecord = {
    id: uid(),
    circleId: input.circleId,
    type: input.type,
    title,
    body,
    status: 'active',
    closesAt: input.closesAt,
    createdBy: input.createdBy,
    createdAt: now(),
  };
  memory.posts.push(post);

  if (input.type === 'poll') {
    let sort = 0;
    for (const label of input.options ?? []) {
      if (!label.trim()) continue;
      sort += 1;
      memory.pollOptions.push({
        id: uid(),
        postId: post.id,
        label: label.trim(),
        sortOrder: sort,
      });
    }
  }

  // One-shot notify other members (no repeat nag)
  for (const m of memory.members) {
    if (m.circleId !== input.circleId || m.status !== 'active' || m.userId === input.createdBy) {
      continue;
    }
    memory.notifications.push({
      id: uid(),
      userId: m.userId,
      eventType: 'circle_post_created',
      payload: { postId: post.id, circleId: input.circleId, postType: input.type },
      createdAt: now(),
    });
  }

  await persist();
  return post;
}

export async function getActivePost(circleId: string): Promise<CirclePostRecord | null> {
  await loadLocalDb();
  return (
    memory.posts.find(
      (p) =>
        p.circleId === circleId &&
        p.status === 'active' &&
        new Date(p.closesAt).getTime() > Date.now(),
    ) ?? null
  );
}

export async function listPollOptions(postId: string): Promise<PollOptionRecord[]> {
  await loadLocalDb();
  return memory.pollOptions.filter((o) => o.postId === postId);
}

function assertPostOpen(post: CirclePostRecord | undefined): asserts post is CirclePostRecord {
  if (!post || post.status !== 'active' || new Date(post.closesAt).getTime() <= Date.now()) {
    throw new AppError('CONFLICT', 'This notice or poll just ended.');
  }
}

async function enqueueAndPublishVerified(input: {
  circleId: string;
  postId: string;
  userId: string;
}): Promise<void> {
  memory.realtimeOutbox.push({
    id: uid(),
    eventType: 'circle_response_verified',
    circleId: input.circleId,
    postId: input.postId,
    userId: input.userId,
    payload: {
      type: 'circle_response_verified',
      circleId: input.circleId,
      postId: input.postId,
      userId: input.userId,
      responded: true,
    },
    createdAt: now(),
    attemptCount: 0,
  });
  await persist();
  const { emitLocalVerifiedEvent } = await import(
    '@/features/presence/verified-response.bus'
  );
  emitLocalVerifiedEvent({
    type: 'circle_response_verified',
    circleId: input.circleId,
    postId: input.postId,
    userId: input.userId,
    responded: true,
  });
}

async function enqueueAndPublishClosed(input: {
  circleId: string;
  postId: string;
}): Promise<void> {
  memory.realtimeOutbox.push({
    id: uid(),
    eventType: 'circle_post_closed',
    circleId: input.circleId,
    postId: input.postId,
    payload: {
      type: 'circle_post_closed',
      circleId: input.circleId,
      postId: input.postId,
    },
    createdAt: now(),
    attemptCount: 0,
  });
  await persist();
  const { emitLocalVerifiedEvent } = await import(
    '@/features/presence/verified-response.bus'
  );
  emitLocalVerifiedEvent({
    type: 'circle_post_closed',
    circleId: input.circleId,
    postId: input.postId,
  });
}

/** Mirror acknowledge_circle_notice — idempotent + outbox */
export async function acknowledgeCircleNotice(input: {
  postId: string;
  userId: string;
}): Promise<{ responded: true; postId: string }> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === input.postId);
  assertPostOpen(post);
  if (post.type !== 'notice') {
    throw new AppError('VALIDATION', 'Not a notice.');
  }
  await assertCanWriteCircle(post.circleId, input.userId);

  const existing = memory.responses.find(
    (r) => r.postId === input.postId && r.userId === input.userId,
  );
  if (existing) {
    existing.updatedAt = now();
    existing.responseType = 'acknowledged';
    existing.optionId = undefined;
  } else {
    memory.responses.push({
      postId: input.postId,
      userId: input.userId,
      responseType: 'acknowledged',
      respondedAt: now(),
      updatedAt: now(),
    });
  }
  await persist();
  await enqueueAndPublishVerified({
    circleId: post.circleId,
    postId: input.postId,
    userId: input.userId,
  });
  return { responded: true, postId: input.postId };
}

/** Mirror respond_circle_poll — changeable before close + outbox */
export async function respondCirclePoll(input: {
  postId: string;
  userId: string;
  optionId: string;
}): Promise<{ responded: true; postId: string; optionId: string }> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === input.postId);
  assertPostOpen(post);
  if (post.type !== 'poll') {
    throw new AppError('VALIDATION', 'Not a poll.');
  }
  await assertCanWriteCircle(post.circleId, input.userId);
  if (!memory.pollOptions.some((o) => o.id === input.optionId && o.postId === post.id)) {
    throw new AppError('VALIDATION', 'Invalid option.');
  }

  const existing = memory.responses.find(
    (r) => r.postId === input.postId && r.userId === input.userId,
  );
  if (existing) {
    existing.optionId = input.optionId;
    existing.responseType = 'poll_option';
    existing.updatedAt = now();
  } else {
    memory.responses.push({
      postId: input.postId,
      userId: input.userId,
      responseType: 'poll_option',
      optionId: input.optionId,
      respondedAt: now(),
      updatedAt: now(),
    });
  }
  await persist();
  await enqueueAndPublishVerified({
    circleId: post.circleId,
    postId: input.postId,
    userId: input.userId,
  });
  return { responded: true, postId: input.postId, optionId: input.optionId };
}

/** @deprecated Prefer acknowledgeCircleNotice / respondCirclePoll */
export async function respondToPost(input: {
  postId: string;
  userId: string;
  optionId?: string;
}): Promise<ResponseRecord> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === input.postId);
  assertPostOpen(post);
  if (post.type === 'notice') {
    await acknowledgeCircleNotice({ postId: input.postId, userId: input.userId });
  } else {
    if (!input.optionId) throw new AppError('VALIDATION', 'Pick an option.');
    await respondCirclePoll({
      postId: input.postId,
      userId: input.userId,
      optionId: input.optionId,
    });
  }
  const row = memory.responses.find(
    (r) => r.postId === input.postId && r.userId === input.userId,
  )!;
  return row;
}

export async function hasResponded(postId: string, userId: string): Promise<boolean> {
  await loadLocalDb();
  return memory.responses.some((r) => r.postId === postId && r.userId === userId);
}

/**
 * Demo-only. Prefer getActivePostBadgeStates for UI badges (membership-scoped).
 */
export async function listRespondedUserIds(postId: string): Promise<string[]> {
  await loadLocalDb();
  return memory.responses.filter((r) => r.postId === postId).map((r) => r.userId);
}

/** Mirror get_active_post_badge_states — responded ids only for active post */
export async function getActivePostBadgeStates(
  circleId: string,
  viewerId: string,
): Promise<{ postId: string | null; respondedUserIds: string[] }> {
  await loadLocalDb();
  if (!(await isCircleMember(circleId, viewerId))) {
    throw new AppError('FORBIDDEN', 'Only members can view badge states.');
  }

  const post =
    memory.posts.find(
      (p) =>
        p.circleId === circleId &&
        p.status === 'active' &&
        new Date(p.closesAt).getTime() > Date.now(),
    ) ?? null;

  if (!post) {
    return { postId: null, respondedUserIds: [] };
  }

  const activeMemberIds = new Set(
    memory.members
      .filter((m) => m.circleId === circleId && m.status === 'active')
      .map((m) => m.userId),
  );

  return {
    postId: post.id,
    respondedUserIds: memory.responses
      .filter((r) => r.postId === post.id && activeMemberIds.has(r.userId))
      .map((r) => r.userId)
      .filter((id) => {
        // Exclude users in a block relation with the viewer
        return !memory.blocks.some(
          (b) =>
            (b.blockerId === viewerId && b.blockedId === id) ||
            (b.blockerId === id && b.blockedId === viewerId),
        );
      })
      .sort(),
  };
}

/** Mirror get_circle_post_summary — aggregates only; poll counts after respond */
export async function getCirclePostSummary(
  postId: string,
  viewerId: string,
): Promise<{
  postId: string;
  postType: 'notice' | 'poll';
  status: string;
  isActive: boolean;
  totalResponded: number | null;
  currentUserResponded: boolean;
  currentUserOptionId: string | null;
  options: { id: string; label: string; count: number | null; sortOrder: number }[];
}> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === postId);
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  if (!(await isCircleMember(post.circleId, viewerId))) {
    throw new AppError('FORBIDDEN', 'Only members can view results.');
  }

  const isActive = post.status === 'active' && new Date(post.closesAt).getTime() > Date.now();
  const mine = memory.responses.find((r) => r.postId === postId && r.userId === viewerId);
  const total = memory.responses.filter((r) => r.postId === postId).length;
  const options = memory.pollOptions
    .filter((o) => o.postId === postId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (post.type === 'notice') {
    return {
      postId,
      postType: 'notice',
      status: post.status,
      isActive,
      totalResponded: total,
      currentUserResponded: Boolean(mine),
      currentUserOptionId: null,
      options: [],
    };
  }

  if (!mine && isActive) {
    return {
      postId,
      postType: 'poll',
      status: post.status,
      isActive,
      totalResponded: null,
      currentUserResponded: false,
      currentUserOptionId: null,
      options: options.map((o) => ({
        id: o.id,
        label: o.label,
        count: null,
        sortOrder: o.sortOrder,
      })),
    };
  }

  return {
    postId,
    postType: 'poll',
    status: post.status,
    isActive,
    totalResponded: total,
    currentUserResponded: Boolean(mine),
    currentUserOptionId: mine?.optionId ?? null,
    options: options.map((o) => ({
      id: o.id,
      label: o.label,
      count: memory.responses.filter((r) => r.optionId === o.id).length,
      sortOrder: o.sortOrder,
    })),
  };
}

/** @deprecated Prefer getCirclePostSummary */
export async function getPollSummary(
  postId: string,
  viewerId: string,
): Promise<{ totalResponded: number; options: { id: string; label: string; count: number }[] }> {
  const summary = await getCirclePostSummary(postId, viewerId);
  return {
    totalResponded: summary.totalResponded ?? 0,
    options: summary.options.map((o) => ({
      id: o.id,
      label: o.label,
      count: o.count ?? 0,
    })),
  };
}

export async function closePost(postId: string, actorId: string): Promise<void> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === postId);
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  const member = memory.members.find(
    (m) => m.circleId === post.circleId && m.userId === actorId && m.status === 'active',
  );
  if (!member) throw new AppError('FORBIDDEN', 'Only members can close this.');
  const allowed =
    post.createdBy === actorId ||
    member.role === 'admin' ||
    member.role === 'pioneer' ||
    member.isPioneer;
  if (!allowed) {
    throw new AppError('FORBIDDEN', 'Only the author or admins can close this.');
  }
  if (post.status === 'active') {
    post.status = 'closed';
    post.closedAt = now();
    await persist();
    await enqueueAndPublishClosed({ circleId: post.circleId, postId: post.id });
    return;
  }
  await persist();
}

export async function submitReport(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  contentSnapshot: string;
}): Promise<ReportRecord> {
  // Legacy path — prefer submitReportServerSnapshot (server builds snapshot)
  return submitReportServerSnapshot({
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason === 'sexual' ? 'sexual_content' : input.reason,
    details: undefined,
    hideForMe: true,
    clientSnapshotIgnored: input.contentSnapshot,
  }).then(async (id) => {
    await loadLocalDb();
    return memory.reports.find((r) => r.id === id)!;
  });
}

function buildLocalReportSnapshot(targetType: string, targetId: string): Record<string, unknown> {
  if (targetType === 'profile') {
    const p = memory.profiles.find((x) => x.id === targetId);
    if (!p) throw new AppError('NOT_FOUND', 'Target not found.');
    return { authorId: p.id, displayName: p.displayName, createdAt: now() };
  }
  if (targetType === 'diary' || targetType === 'diary_entry') {
    const e = memory.diary.find((d) => d.id === targetId || d.userId === targetId);
    if (!e) throw new AppError('NOT_FOUND', 'Target not found.');
    return {
      authorId: e.userId,
      body: e.shortText ?? e.tenCharText ?? '',
      mood: e.mood,
      entryDate: e.entryDate,
      createdAt: e.createdAt,
      visibilityMode: e.visibilityMode,
    };
  }
  if (targetType === 'guestbook_entry') {
    const g = memory.guestbook.find((x) => x.id === targetId);
    if (!g) throw new AppError('NOT_FOUND', 'Target not found.');
    return {
      authorId: g.authorUserId,
      ownerId: g.ownerUserId,
      body: g.body,
      createdAt: g.createdAt,
    };
  }
  if (targetType === 'photo') {
    const ph = memory.photos.find((x) => x.id === targetId);
    if (!ph) throw new AppError('NOT_FOUND', 'Target not found.');
    return { authorId: ph.userId, mediaPaths: [ph.storagePath], createdAt: ph.createdAt };
  }
  if (targetType === 'anonymous_post') {
    const ap = memory.anonymousPosts.find((x) => x.id === targetId);
    if (!ap) throw new AppError('NOT_FOUND', 'Target not found.');
    const alias = memory.circleAliases.find((a) => a.id === ap.aliasId);
    return {
      postId: ap.id,
      circleId: ap.circleId,
      authorUserId: ap.authorUserId,
      aliasName: alias?.aliasName ?? 'Unknown',
      body: ap.body,
      createdAt: ap.createdAt,
    };
  }
  if (targetType === 'message') {
    const m = memory.privateMessages.find((x) => x.id === targetId);
    if (!m) throw new AppError('NOT_FOUND', 'Target not found.');
    const alias = m.aliasId
      ? memory.circleAliases.find((a) => a.id === m.aliasId)
      : undefined;
    return {
      messageId: m.id,
      circleId: m.circleId,
      senderId: m.senderId,
      recipientId: m.recipientId,
      senderMode: m.senderMode,
      aliasName: alias?.aliasName,
      body: m.body,
      createdAt: m.createdAt,
    };
  }
  return { targetId };
}

async function assertCanReportTarget(
  reporterId: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  if (targetType === 'profile') {
    if (!memory.profiles.some((p) => p.id === targetId)) {
      throw new AppError('NOT_FOUND', 'Target not found.');
    }
    if (await isBlockedBetween(reporterId, targetId)) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
    return;
  }
  if (targetType === 'diary' || targetType === 'diary_entry') {
    const e =
      memory.diary.find((d) => d.id === targetId) ??
      memory.diary.find((d) => d.userId === targetId);
    if (!e) throw new AppError('NOT_FOUND', 'Target not found.');
    if (e.userId === reporterId) {
      throw new AppError('VALIDATION', 'You can’t report your own diary.');
    }
    if (!(await canViewDiary(reporterId, e.userId, e))) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
    return;
  }
  if (targetType === 'anonymous_post') {
    const ap = memory.anonymousPosts.find((x) => x.id === targetId);
    if (!ap) throw new AppError('NOT_FOUND', 'Target not found.');
    if (!(await isCircleMember(ap.circleId, reporterId))) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
    if (await isBlockedBetween(reporterId, ap.authorUserId)) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
  }
  if (targetType === 'message') {
    const m = memory.privateMessages.find((x) => x.id === targetId);
    if (!m) throw new AppError('NOT_FOUND', 'Target not found.');
    if (m.senderId !== reporterId && m.recipientId !== reporterId) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
  }
}

/** Mirror submit_report — server builds snapshot; client snapshot ignored */
export async function submitReportServerSnapshot(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  hideForMe?: boolean;
  clientSnapshotIgnored?: string;
}): Promise<string> {
  await loadLocalDb();
  assertNotSuspended(input.reporterId);

  const allowedReasons = new Set([
    'harassment',
    'threat',
    'hate',
    'sexual_content',
    'privacy',
    'spam',
    'impersonation',
    'self_harm',
    'other',
  ]);
  const reason =
    input.reason === 'sexual' ? 'sexual_content' : input.reason.trim();
  if (!allowedReasons.has(reason)) {
    throw new AppError('VALIDATION', 'Choose a valid reason.');
  }

  const targetType =
    input.targetType === 'diary' ? 'diary_entry' : input.targetType;

  await assertCanReportTarget(input.reporterId, targetType, input.targetId);

  // Always build snapshot from local “server” store — never trust client payload
  const snap = buildLocalReportSnapshot(targetType, input.targetId);
  void input.clientSnapshotIgnored;

  const existing = memory.reports.find(
    (r) =>
      r.reporterId === input.reporterId &&
      r.targetType === targetType &&
      r.targetId === input.targetId,
  );
  if (existing) {
    if (input.details?.trim()) existing.details = input.details.trim();
    await persist();
    if (input.hideForMe !== false) {
      await hideContentForMe({
        userId: input.reporterId,
        targetType,
        targetId: input.targetId,
      });
    }
    return existing.id;
  }

  const report: ReportRecord = {
    id: uid(),
    reporterId: input.reporterId,
    targetType,
    targetId: input.targetId,
    reason,
    details: input.details?.trim() || undefined,
    contentSnapshot: JSON.stringify(snap).slice(0, 4000),
    status: 'submitted',
    createdAt: now(),
  };
  memory.reports.push(report);
  await persist();

  if (input.hideForMe !== false) {
    await hideContentForMe({
      userId: input.reporterId,
      targetType,
      targetId: input.targetId,
    });
  }
  return report.id;
}

export async function hideContentForMe(input: {
  userId: string;
  targetType: string;
  targetId: string;
}): Promise<void> {
  await loadLocalDb();
  if (
    !memory.hiddenContent.some(
      (h) =>
        h.userId === input.userId &&
        h.targetType === input.targetType &&
        h.targetId === input.targetId,
    )
  ) {
    memory.hiddenContent.push({
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      hiddenAt: now(),
    });
    await persist();
  }
}

export async function isContentHiddenForMe(
  userId: string,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  await loadLocalDb();
  return memory.hiddenContent.some(
    (h) =>
      h.userId === userId && h.targetType === targetType && h.targetId === targetId,
  );
}

export async function listMyReports(reporterId: string): Promise<ReportRecord[]> {
  await loadLocalDb();
  return memory.reports.filter((r) => r.reporterId === reporterId);
}

/** Ops console — moderator only (local demo uses isModerator flag). */
export async function listAllReportsForOps(input: {
  adminId: string;
  isModerator: boolean;
}): Promise<ReportRecord[]> {
  await loadLocalDb();
  await assertLocalOpsAction(input.adminId, 'reports_moderate');
  return [...memory.reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReportForOps(input: {
  reportId: string;
  adminId: string;
  isModerator: boolean;
}): Promise<ReportRecord> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  const row = memory.reports.find((r) => r.id === input.reportId);
  if (!row) throw new AppError('NOT_FOUND', 'Report not found.');
  return row;
}

export async function adminHideContent(input: {
  adminId: string;
  isModerator: boolean;
  targetType: string;
  targetId: string;
  reason: string;
}): Promise<void> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  if (!input.reason.trim()) throw new AppError('VALIDATION', 'Reason required.');

  if (input.targetType === 'anonymous_post') {
    const post = memory.anonymousPosts.find((p) => p.id === input.targetId);
    if (post) post.status = 'removed';
  } else if (input.targetType === 'message') {
    const msg = memory.privateMessages.find((m) => m.id === input.targetId);
    if (msg) msg.status = 'removed';
  } else if (input.targetType === 'guestbook_entry') {
    const g = memory.guestbook.find((x) => x.id === input.targetId);
    if (g) g.hidden = true;
  }

  memory.adminAuditLogs.push({
    id: uid(),
    adminId: input.adminId,
    action: 'admin_hide_content',
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason.trim(),
    createdAt: now(),
  });
  await persist();
}

export async function adminSetAccountStatus(input: {
  adminId: string;
  isModerator: boolean;
  userId: string;
  accountStatus: 'active' | 'restricted' | 'suspended';
  reason: string;
}): Promise<void> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  if (!input.reason.trim()) throw new AppError('VALIDATION', 'Reason required.');
  await setUserModerationStatus({
    userId: input.userId,
    accountStatus: input.accountStatus,
    reasonCode: input.reason.trim(),
  });
  memory.adminAuditLogs.push({
    id: uid(),
    adminId: input.adminId,
    action: `admin_set_status_${input.accountStatus}`,
    targetType: 'user',
    targetId: input.userId,
    reason: input.reason.trim(),
    createdAt: now(),
  });
  await persist();
}

export async function listAdminAuditLogs(input: {
  adminId: string;
  isModerator: boolean;
  limit?: number;
}): Promise<typeof memory.adminAuditLogs> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  const lim = input.limit ?? 50;
  return [...memory.adminAuditLogs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, lim);
}

export async function createPhotoSignedUrlToken(
  viewerId: string,
  photoId: string,
): Promise<{ photoId: string; storagePath: string; allowed: true }> {
  await loadLocalDb();
  assertNotSuspended(viewerId);
  const photo = memory.photos.find((p) => p.id === photoId);
  if (!photo) throw new AppError('NOT_FOUND', 'Photo not found.');
  if (photo.userId !== viewerId) {
    if (await isBlockedBetween(viewerId, photo.userId)) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
    if (!(await sharesOpenCircleLocal(viewerId, photo.userId, false))) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
  }
  return { photoId: photo.id, storagePath: photo.storagePath, allowed: true };
}

export async function listPhotosForUser(
  userId: string,
  limit = MAX_ALBUM_PHOTOS,
): Promise<PhotoAsset[]> {
  await loadLocalDb();
  return memory.photos
    .filter((p) => p.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, Math.max(0, limit));
}

/** Newest photos fill cork slots (max 3); unused slots are null. */
export async function listCorkSlotUris(
  userId: string,
): Promise<Array<string | null>> {
  const photos = await listPhotosForUser(userId, CORK_SLOT_COUNT);
  const slots: Array<string | null> = photos.map((p) => p.storagePath);
  while (slots.length < CORK_SLOT_COUNT) slots.push(null);
  return slots;
}

/**
 * Owner always; others need a shared open circle and no block.
 * Used by album screen (read-only for friends).
 */
export async function listPhotosVisibleTo(
  viewerId: string,
  ownerId: string,
  limit = MAX_ALBUM_PHOTOS,
): Promise<PhotoAsset[]> {
  await loadLocalDb();
  assertNotSuspended(viewerId);
  if (viewerId !== ownerId) {
    if (await isBlockedBetween(viewerId, ownerId)) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
    if (!(await sharesOpenCircleLocal(viewerId, ownerId, false))) {
      throw new AppError('FORBIDDEN', 'You can’t view this.');
    }
  }
  return listPhotosForUser(ownerId, limit);
}

export async function addPhoto(userId: string, storagePath: string): Promise<PhotoAsset> {
  await loadLocalDb();
  assertNotSuspended(userId);
  const path = storagePath.trim();
  if (!path) throw new AppError('VALIDATION', 'Photo path required.');
  const owned = memory.photos.filter((p) => p.userId === userId);
  if (owned.length >= MAX_ALBUM_PHOTOS) {
    throw new AppError('VALIDATION', `Album limit is ${MAX_ALBUM_PHOTOS} photos.`);
  }
  const row: PhotoAssetRow = {
    id: uid(),
    userId,
    storagePath: path,
    createdAt: now(),
  };
  memory.photos.push(row);
  await persist();
  return row;
}

/** @deprecated Prefer addPhoto — kept for existing tests/seeds. */
export async function addDemoPhoto(userId: string, path: string): Promise<PhotoAssetRow> {
  return addPhoto(userId, path);
}

export async function deletePhoto(ownerId: string, photoId: string): Promise<void> {
  await loadLocalDb();
  assertNotSuspended(ownerId);
  const idx = memory.photos.findIndex((p) => p.id === photoId);
  if (idx < 0) throw new AppError('NOT_FOUND', 'Photo not found.');
  const photo = memory.photos[idx]!;
  if (photo.userId !== ownerId) {
    throw new AppError('FORBIDDEN', 'You can’t delete this.');
  }
  memory.photos.splice(idx, 1);
  await persist();
}

async function sharesOpenCircleLocal(a: string, b: string, write: boolean): Promise<boolean> {
  if (a === b) return true;
  for (const circle of memory.circles.filter((c) => c.status === 'open' && c.schoolId)) {
    const aMember = assertActiveCircleMemberRow(circle.id, a);
    const bMember = assertActiveCircleMemberRow(circle.id, b);
    if (!aMember || !bMember || !circle.schoolId) continue;
    const aMem = membershipForUser(a, circle.schoolId);
    const bMem = membershipForUser(b, circle.schoolId);
    const school = schoolById(circle.schoolId);
    if (write) {
      if (isVerifiedSchoolMember(aMem, school) && isSchoolMemberForAccess(bMem, school)) {
        return true;
      }
    } else if (
      isSchoolMemberForAccess(aMem, school) &&
      isSchoolMemberForAccess(bMem, school)
    ) {
      return true;
    }
  }
  return false;
}

export async function addGuestbookEntry(input: {
  ownerUserId: string;
  authorUserId: string;
  body: string;
}): Promise<GuestbookRow> {
  await loadLocalDb();
  if (await isBlockedBetween(input.ownerUserId, input.authorUserId)) {
    throw new AppError('FORBIDDEN', 'You can’t post here.');
  }
  if (
    input.ownerUserId !== input.authorUserId &&
    !(await sharesOpenCircleLocal(input.authorUserId, input.ownerUserId, true))
  ) {
    throw new AppError('FORBIDDEN', 'You can’t post here.');
  }
  const row: GuestbookRow = {
    id: uid(),
    ownerUserId: input.ownerUserId,
    authorUserId: input.authorUserId,
    body: input.body.trim().slice(0, 200),
    hidden: false,
    createdAt: now(),
  };
  memory.guestbook.push(row);
  await persist();
  return row;
}

export async function listGuestbook(
  ownerUserId: string,
  viewerId: string,
): Promise<GuestbookRow[]> {
  await loadLocalDb();
  if (await isBlockedBetween(ownerUserId, viewerId)) {
    throw new AppError('FORBIDDEN', 'You can’t view this.');
  }
  return memory.guestbook
    .filter(
      (g) =>
        g.ownerUserId === ownerUserId &&
        !g.hidden &&
        !memory.hiddenContent.some(
          (h) =>
            h.userId === viewerId &&
            h.targetType === 'guestbook_entry' &&
            h.targetId === g.id,
        ),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function validateHompyBoardBody(body: string, max = 200): string {
  const trim = body.trim();
  if (trim.length < 1 || trim.length > max) {
    throw new AppError('VALIDATION', `Write 1–${max} characters.`);
  }
  if (/https?:\/\//i.test(trim) || /www\./i.test(trim)) {
    throw new AppError('VALIDATION', 'Links aren’t allowed.');
  }
  return trim;
}

/**
 * Free board — personal homepage only.
 * Homepage owner and visitors who can open the hompy may write.
 */
export async function addFreeBoardPost(input: {
  ownerUserId: string;
  authorUserId: string;
  body: string;
}): Promise<FreeBoardRow> {
  await loadLocalDb();
  assertNotSuspended(input.authorUserId);
  if (await isBlockedBetween(input.ownerUserId, input.authorUserId)) {
    throw new AppError('FORBIDDEN', 'You can’t post here.');
  }
  const row: FreeBoardRow = {
    id: uid(),
    ownerUserId: input.ownerUserId,
    authorUserId: input.authorUserId,
    body: validateHompyBoardBody(input.body, 300),
    hidden: false,
    createdAt: now(),
  };
  memory.freeBoard.push(row);
  await persist();
  return row;
}

export async function listFreeBoard(
  ownerUserId: string,
  viewerId: string,
): Promise<FreeBoardRow[]> {
  await loadLocalDb();
  if (await isBlockedBetween(ownerUserId, viewerId)) {
    throw new AppError('FORBIDDEN', 'You can’t view this.');
  }
  return memory.freeBoard
    .filter(
      (p) =>
        p.ownerUserId === ownerUserId &&
        !p.hidden &&
        !memory.hiddenContent.some(
          (h) =>
            h.userId === viewerId &&
            h.targetType === 'free_board_post' &&
            h.targetId === p.id,
        ),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteFreeBoardPost(
  postId: string,
  actorId: string,
): Promise<void> {
  await loadLocalDb();
  const post = memory.freeBoard.find((p) => p.id === postId);
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  if (post.authorUserId !== actorId && post.ownerUserId !== actorId) {
    throw new AppError('FORBIDDEN', 'Only the author or homepage owner can delete.');
  }
  post.hidden = true;
  await persist();
}

/**
 * Circle board on a mini-hompy:
 * - Own home → first open circle
 * - Friend home → first shared open circle (null if none → board hidden)
 */
export async function resolveHompyCircleBoard(
  viewerId: string,
  ownerId: string,
): Promise<{ circleId: string; circleName: string } | null> {
  await loadLocalDb();
  if (await isBlockedBetween(viewerId, ownerId)) {
    throw new AppError('FORBIDDEN', "You can't view this.");
  }
  if (viewerId === ownerId) {
    const mine = await listMyCircleSummaries(viewerId);
    const c = mine[0];
    return c ? { circleId: c.id, circleName: c.name } : null;
  }
  const shared = await listSharedCirclesWith(viewerId, ownerId);
  const c = shared[0];
  return c ? { circleId: c.id, circleName: c.name } : null;
}

export type HompyCirclePreview = {
  id: string;
  aliasName: string;
  body: string;
  createdAt: string;
};

/** Latest circle-board (alias) posts for hompy preview; empty if no shared circle. */
export async function listHompyCircleBoardPreview(
  viewerId: string,
  ownerId: string,
  limit = 3,
): Promise<{
  circle: { circleId: string; circleName: string } | null;
  items: HompyCirclePreview[];
}> {
  const circle = await resolveHompyCircleBoard(viewerId, ownerId);
  if (!circle) return { circle: null, items: [] };
  const { items } = await getAnonymousCirclePosts({
    circleId: circle.circleId,
    viewerId,
    limit,
  });
  return {
    circle,
    items: items.map((i) => ({
      id: i.id,
      aliasName: i.aliasName,
      body: i.body,
      createdAt: i.createdAt,
    })),
  };
}

export async function setUserModerationStatus(input: {
  userId: string;
  accountStatus: 'active' | 'restricted' | 'suspended';
  reasonCode?: string;
}): Promise<void> {
  await loadLocalDb();
  const existing = memory.moderationStatus.find((m) => m.userId === input.userId);
  if (existing) {
    existing.accountStatus = input.accountStatus;
    existing.reasonCode = input.reasonCode;
    existing.updatedAt = now();
  } else {
    memory.moderationStatus.push({
      userId: input.userId,
      accountStatus: input.accountStatus,
      reasonCode: input.reasonCode,
      updatedAt: now(),
    });
  }
  await persist();
}

export async function getAccountStatus(
  userId: string,
): Promise<'active' | 'restricted' | 'suspended'> {
  await loadLocalDb();
  return (
    memory.moderationStatus.find((m) => m.userId === userId)?.accountStatus ?? 'active'
  );
}

const ALIAS_ADJ = [
  'Quiet', 'Slow', 'Soft', 'Small', 'Calm', 'Gentle', 'Bright', 'Warm',
  'Cool', 'Silent', 'Pale', 'Kind', 'Still', 'Light', 'Clear', 'Mild',
];
const ALIAS_NOUN = [
  'Comet', 'Wave', 'Lantern', 'Cloud', 'Stone', 'River', 'Pine', 'Ember',
  'Moss', 'Drift', 'Harbor', 'Meadow', 'Pebble', 'Breeze', 'Grove', 'Dusk',
];

function pickAliasName(circleId: string): string {
  for (let i = 0; i < 40; i++) {
    const name = `${ALIAS_ADJ[Math.floor(Math.random() * ALIAS_ADJ.length)]} ${
      ALIAS_NOUN[Math.floor(Math.random() * ALIAS_NOUN.length)]
    }`;
    if (!memory.circleAliases.some((a) => a.circleId === circleId && a.aliasName === name)) {
      return name;
    }
  }
  return `Quiet Star ${uid().slice(0, 6)}`;
}

export async function getOrCreateCircleAlias(
  circleId: string,
  userId: string,
): Promise<{ aliasName: string; aliasId: string }> {
  await loadLocalDb();
  assertNotSuspended(userId);
  await assertCanWriteCircle(circleId, userId);
  const existing = memory.circleAliases.find(
    (a) => a.circleId === circleId && a.userId === userId,
  );
  if (existing) return { aliasName: existing.aliasName, aliasId: existing.id };

  const row = {
    id: uid(),
    circleId,
    userId,
    aliasName: pickAliasName(circleId),
    createdAt: now(),
  };
  memory.circleAliases.push(row);
  await persist();
  return { aliasName: row.aliasName, aliasId: row.id };
}

function validateAnonBodyLocal(body: string): void {
  const trim = body.trim();
  if (trim.length < 1 || trim.length > 300) {
    throw new AppError('VALIDATION', 'Write 1–300 characters.');
  }
  if (/https?:\/\//i.test(trim) || /www\./i.test(trim)) {
    throw new AppError('VALIDATION', 'Links aren’t allowed.');
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(trim)) {
    throw new AppError('VALIDATION', 'Email addresses aren’t allowed.');
  }
  if (trim.replace(/\D/g, '').length >= 7) {
    throw new AppError('VALIDATION', 'Phone numbers aren’t allowed.');
  }
  if (/(.)\1{9,}/.test(trim)) {
    throw new AppError('VALIDATION', 'That text looks spammy.');
  }
}

export async function createAnonymousPost(input: {
  circleId: string;
  userId: string;
  body: string;
  clientRequestId?: string;
}): Promise<{
  id: string;
  aliasName: string;
  body: string;
  createdAt: string;
  isMine: true;
}> {
  await loadLocalDb();
  assertNotSuspended(input.userId);
  await assertCanWriteCircle(input.circleId, input.userId);
  const mod = memory.moderationStatus.find((m) => m.userId === input.userId);
  if (mod?.accountStatus === 'restricted') {
    throw new AppError('FORBIDDEN', 'Posting is temporarily limited.');
  }
  validateAnonBodyLocal(input.body);

  if (input.clientRequestId) {
    const dup = memory.anonymousPosts.find(
      (p) =>
        p.authorUserId === input.userId && p.clientRequestId === input.clientRequestId,
    );
    if (dup) {
      const alias = memory.circleAliases.find((a) => a.id === dup.aliasId)!;
      return {
        id: dup.id,
        aliasName: alias.aliasName,
        body: dup.body,
        createdAt: dup.createdAt,
        isMine: true,
      };
    }
  }

  const tenMin = Date.now() - 10 * 60_000;
  const day = Date.now() - 24 * 60 * 60_000;
  const recent = memory.anonymousPosts.filter(
    (p) =>
      p.authorUserId === input.userId &&
      p.circleId === input.circleId &&
      new Date(p.createdAt).getTime() > tenMin,
  ).length;
  if (recent >= 2) throw new AppError('RATE_LIMITED', 'Please wait before posting again.');
  const dayCount = memory.anonymousPosts.filter(
    (p) =>
      p.authorUserId === input.userId &&
      p.circleId === input.circleId &&
      new Date(p.createdAt).getTime() > day,
  ).length;
  if (dayCount >= 10) throw new AppError('RATE_LIMITED', 'Daily post limit reached.');

  const alias = await getOrCreateCircleAlias(input.circleId, input.userId);
  const post = {
    id: uid(),
    circleId: input.circleId,
    authorUserId: input.userId,
    aliasId: alias.aliasId,
    body: input.body.trim(),
    status: 'active' as const,
    createdAt: now(),
    clientRequestId: input.clientRequestId,
  };
  memory.anonymousPosts.push(post);
  await persist();
  return {
    id: post.id,
    aliasName: alias.aliasName,
    body: post.body,
    createdAt: post.createdAt,
    isMine: true,
  };
}

export async function getAnonymousCirclePosts(input: {
  circleId: string;
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<{
  items: {
    id: string;
    aliasName: string;
    body: string;
    createdAt: string;
    isMine: boolean;
  }[];
  nextCursor: { createdAt: string; id: string } | null;
}> {
  await loadLocalDb();
  assertNotSuspended(input.viewerId);
  if (!(await isCircleMember(input.circleId, input.viewerId))) {
    throw new AppError('FORBIDDEN', 'Only members can view this board.');
  }
  const lim = Math.max(1, Math.min(input.limit ?? 20, 20));
  let rows = memory.anonymousPosts
    .filter((p) => p.circleId === input.circleId && p.status === 'active')
    .sort((a, b) => {
      const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return t !== 0 ? t : b.id.localeCompare(a.id);
    });

  rows = rows.filter((p) => {
    const blocked = memory.blocks.some(
      (b) =>
        (b.blockerId === input.viewerId && b.blockedId === p.authorUserId) ||
        (b.blockerId === p.authorUserId && b.blockedId === input.viewerId),
    );
    if (blocked) return false;
    if (
      memory.hiddenContent.some(
        (h) =>
          h.userId === input.viewerId &&
          h.targetType === 'anonymous_post' &&
          h.targetId === p.id,
      )
    ) {
      return false;
    }
    if (input.cursorCreatedAt && input.cursorId) {
      const ct = new Date(input.cursorCreatedAt).getTime();
      const pt = new Date(p.createdAt).getTime();
      if (pt > ct) return false;
      if (pt === ct && p.id >= input.cursorId) return false;
    }
    return true;
  });

  const page = rows.slice(0, lim);
  const items = page.map((p) => {
    const alias = memory.circleAliases.find((a) => a.id === p.aliasId);
    return {
      id: p.id,
      aliasName: alias?.aliasName ?? 'Member',
      body: p.body,
      createdAt: p.createdAt,
      isMine: p.authorUserId === input.viewerId,
    };
  });

  return {
    items,
    nextCursor:
      page.length === lim
        ? { createdAt: page[page.length - 1].createdAt, id: page[page.length - 1].id }
        : null,
  };
}

export async function deleteAnonymousPost(postId: string, userId: string): Promise<void> {
  await loadLocalDb();
  const post = memory.anonymousPosts.find((p) => p.id === postId);
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  if (post.authorUserId !== userId) throw new AppError('FORBIDDEN', 'Only the author can delete.');
  if (post.status === 'active') {
    post.status = 'deleted';
    await persist();
  }
}

export async function blockAnonymousPostAuthor(
  postId: string,
  actorId: string,
): Promise<void> {
  await loadLocalDb();
  const post = memory.anonymousPosts.find((p) => p.id === postId && p.status === 'active');
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  if (post.authorUserId === actorId) {
    throw new AppError('VALIDATION', 'You can’t block yourself.');
  }
  if (!(await isCircleMember(post.circleId, actorId))) {
    throw new AppError('FORBIDDEN', 'Only members can do this.');
  }
  await blockUser(actorId, post.authorUserId);
}

export async function resolveAnonymousAuthor(input: {
  postId: string;
  moderationCaseId: string;
  reason: string;
  adminId: string;
  isModerator: boolean;
}): Promise<{ postId: string; authorUserId: string; circleId: string }> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  if (!input.reason.trim() || input.reason.trim().length < 3) {
    throw new AppError('VALIDATION', 'Reason required.');
  }
  const post = memory.anonymousPosts.find((p) => p.id === input.postId);
  if (!post) throw new AppError('NOT_FOUND', 'Post not found.');
  const report = memory.reports.find((r) => r.id === input.moderationCaseId);
  if (
    !report ||
    report.targetType !== 'anonymous_post' ||
    report.targetId !== input.postId
  ) {
    throw new AppError('FORBIDDEN', 'A linked report case is required.');
  }
  memory.adminAuditLogs.push({
    id: uid(),
    adminId: input.adminId,
    action: 'resolve_anonymous_author',
    targetType: 'anonymous_post',
    targetId: input.postId,
    reason: input.reason.trim(),
    createdAt: now(),
  });
  await persist();
  return { postId: post.id, authorUserId: post.authorUserId, circleId: post.circleId };
}

// ---------------------------------------------------------------------------
// Phase 9 — private notes (letter-style, not chat)
// ---------------------------------------------------------------------------

function ensureMessagePrefs(userId: string) {
  let row = memory.messagePreferences.find((p) => p.userId === userId);
  if (!row) {
    row = {
      userId,
      namedEnabled: true,
      aliasEnabled: true,
      updatedAt: now(),
    };
    memory.messagePreferences.push(row);
  }
  return row;
}

function validateNoteBodyLocal(body: string): void {
  const trim = body.trim();
  if (trim.length < 1 || trim.length > 300) {
    throw new AppError('VALIDATION', 'Write 1–300 characters.');
  }
  if (/https?:\/\//i.test(trim) || /www\./i.test(trim)) {
    throw new AppError('VALIDATION', 'Links aren’t allowed.');
  }
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(trim)) {
    throw new AppError('VALIDATION', 'Email addresses aren’t allowed.');
  }
  if (trim.replace(/\D/g, '').length >= 7) {
    throw new AppError('VALIDATION', 'Phone numbers aren’t allowed.');
  }
  if (/(.)\1{9,}/.test(trim)) {
    throw new AppError('VALIDATION', 'That text looks spammy.');
  }
  if (/@\w{2,}/.test(trim)) {
    throw new AppError('VALIDATION', 'Mentions aren’t allowed.');
  }
}

function replyDepthLocal(messageId: string): number {
  let id: string | undefined = messageId;
  let depth = 0;
  while (id && depth < 10) {
    const m = memory.privateMessages.find((x) => x.id === id);
    if (!m?.replyToMessageId) break;
    depth += 1;
    id = m.replyToMessageId;
  }
  return depth;
}

export async function listSharedCirclesWith(
  viewerId: string,
  otherUserId: string,
): Promise<{ id: string; name: string }[]> {
  await loadLocalDb();
  if (!otherUserId || otherUserId === viewerId) {
    throw new AppError('VALIDATION', 'Pick someone else.');
  }
  if (await isBlockedBetween(viewerId, otherUserId)) {
    throw new AppError('FORBIDDEN', "You can't view this.");
  }
  const mine = memory.members.filter(
    (m) => m.userId === viewerId && m.status === 'active',
  );
  const out: { id: string; name: string }[] = [];
  for (const m of mine) {
    const other = memory.members.find(
      (x) =>
        x.circleId === m.circleId && x.userId === otherUserId && x.status === 'active',
    );
    if (!other) continue;
    const circle = memory.circles.find((c) => c.id === m.circleId && c.status === 'open');
    if (circle) out.push({ id: circle.id, name: circle.name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMyMessagePreferences(
  userId: string,
): Promise<{ namedEnabled: boolean; aliasEnabled: boolean }> {
  await loadLocalDb();
  assertNotSuspended(userId);
  const row = ensureMessagePrefs(userId);
  return { namedEnabled: row.namedEnabled, aliasEnabled: row.aliasEnabled };
}

export async function updateMyMessagePreferences(
  userId: string,
  namedEnabled: boolean,
  aliasEnabled: boolean,
): Promise<{ namedEnabled: boolean; aliasEnabled: boolean }> {
  await loadLocalDb();
  assertNotSuspended(userId);
  const row = ensureMessagePrefs(userId);
  row.namedEnabled = namedEnabled;
  row.aliasEnabled = aliasEnabled;
  row.updatedAt = now();
  await persist();
  return { namedEnabled: row.namedEnabled, aliasEnabled: row.aliasEnabled };
}

async function sendPrivateMessageLocal(input: {
  circleId: string;
  senderId: string;
  recipientId: string;
  body: string;
  senderMode: 'named' | 'alias';
  replyToMessageId?: string | null;
  clientRequestId: string;
}): Promise<{ id: string; senderMode: 'named' | 'alias'; createdAt: string }> {
  await loadLocalDb();
  assertNotSuspended(input.senderId);
  if (!input.recipientId || input.recipientId === input.senderId) {
    throw new AppError('VALIDATION', 'Pick someone else.');
  }
  await assertCanWriteCircle(input.circleId, input.senderId);
  if (!(await canAccessCircle(input.circleId, input.recipientId))) {
    throw new AppError('FORBIDDEN', 'Only members can send notes.');
  }
  if (await isBlockedBetween(input.senderId, input.recipientId)) {
    throw new AppError('FORBIDDEN', "You can't send this.");
  }
  const mod = memory.moderationStatus.find((m) => m.userId === input.senderId);
  if (mod?.accountStatus === 'restricted' || mod?.accountStatus === 'suspended') {
    throw new AppError('FORBIDDEN', 'Messaging is temporarily limited.');
  }
  const prefs = ensureMessagePrefs(input.recipientId);
  if (input.senderMode === 'named' && !prefs.namedEnabled) {
    throw new AppError('FORBIDDEN', "You can't send a named note to this person right now.");
  }
  if (input.senderMode === 'alias' && !prefs.aliasEnabled) {
    throw new AppError(
      'FORBIDDEN',
      "You can't send an alias note to this person right now.",
    );
  }
  validateNoteBodyLocal(input.body);

  const dup = memory.privateMessages.find(
    (m) =>
      m.senderId === input.senderId && m.clientRequestId === input.clientRequestId,
  );
  if (dup) {
    return { id: dup.id, senderMode: dup.senderMode, createdAt: dup.createdAt };
  }

  if (input.replyToMessageId) {
    const reply = memory.privateMessages.find((m) => m.id === input.replyToMessageId);
    if (!reply) throw new AppError('NOT_FOUND', 'Note not found.');
    if (reply.status === 'removed') throw new AppError('FORBIDDEN', "You can't reply.");
    if (
      input.senderId !== reply.senderId &&
      input.senderId !== reply.recipientId
    ) {
      throw new AppError('FORBIDDEN', "You can't reply.");
    }
    if (
      input.recipientId !== reply.senderId &&
      input.recipientId !== reply.recipientId
    ) {
      throw new AppError('FORBIDDEN', "You can't reply.");
    }
    if (replyDepthLocal(input.replyToMessageId) >= 3) {
      throw new AppError('VALIDATION', 'This letter chain is long enough.');
    }
  }

  const nowMs = Date.now();
  if (input.senderMode === 'named') {
    const tenMin = memory.privateMessages.filter(
      (m) =>
        m.senderId === input.senderId &&
        m.recipientId === input.recipientId &&
        m.senderMode === 'named' &&
        nowMs - new Date(m.createdAt).getTime() < 10 * 60_000,
    ).length;
    if (tenMin >= 3) throw new AppError('RATE_LIMITED', 'Please wait before sending again.');
    const day = memory.privateMessages.filter(
      (m) =>
        m.senderId === input.senderId &&
        m.recipientId === input.recipientId &&
        m.senderMode === 'named' &&
        nowMs - new Date(m.createdAt).getTime() < 24 * 60 * 60_000,
    ).length;
    if (day >= 10) throw new AppError('RATE_LIMITED', 'Daily note limit reached.');
  } else {
    const dayPair = memory.privateMessages.filter(
      (m) =>
        m.senderId === input.senderId &&
        m.recipientId === input.recipientId &&
        m.senderMode === 'alias' &&
        nowMs - new Date(m.createdAt).getTime() < 24 * 60 * 60_000,
    ).length;
    if (dayPair >= 1) throw new AppError('RATE_LIMITED', 'Please wait before sending again.');
    const weekPair = memory.privateMessages.filter(
      (m) =>
        m.senderId === input.senderId &&
        m.recipientId === input.recipientId &&
        m.senderMode === 'alias' &&
        nowMs - new Date(m.createdAt).getTime() < 7 * 24 * 60 * 60_000,
    ).length;
    if (weekPair >= 2) throw new AppError('RATE_LIMITED', 'Weekly alias note limit reached.');
    const dayAll = memory.privateMessages.filter(
      (m) =>
        m.senderId === input.senderId &&
        m.senderMode === 'alias' &&
        nowMs - new Date(m.createdAt).getTime() < 24 * 60 * 60_000,
    ).length;
    if (dayAll >= 5) throw new AppError('RATE_LIMITED', 'Daily alias note limit reached.');
  }

  let aliasId: string | undefined;
  if (input.senderMode === 'alias') {
    const alias = await getOrCreateCircleAlias(input.circleId, input.senderId);
    aliasId = alias.aliasId;
  }

  const msg = {
    id: uid(),
    circleId: input.circleId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    senderMode: input.senderMode,
    aliasId,
    body: input.body.trim(),
    replyToMessageId: input.replyToMessageId ?? undefined,
    status: 'active' as const,
    clientRequestId: input.clientRequestId,
    createdAt: now(),
  };
  memory.privateMessages.push(msg);
  memory.privateMessageUserStates.push({
    messageId: msg.id,
    userId: input.recipientId,
  });

  const sender = memory.profiles.find((p) => p.id === input.senderId);
  memory.notifications.push({
    id: uid(),
    userId: input.recipientId,
    eventType: 'private_message_received',
    payload: {
      messageId: msg.id,
      senderMode: input.senderMode,
      ...(input.senderMode === 'named'
        ? { senderDisplay: sender?.displayName ?? 'Someone' }
        : {}),
      circleId: input.circleId,
    },
    createdAt: now(),
  });
  await persist();
  return { id: msg.id, senderMode: msg.senderMode, createdAt: msg.createdAt };
}

export async function sendNamedMessage(input: {
  circleId: string;
  senderId: string;
  recipientId: string;
  body: string;
  replyToMessageId?: string | null;
  clientRequestId: string;
}) {
  return sendPrivateMessageLocal({ ...input, senderMode: 'named' });
}

export async function sendAliasMessage(input: {
  circleId: string;
  senderId: string;
  recipientId: string;
  body: string;
  replyToMessageId?: string | null;
  clientRequestId: string;
}) {
  return sendPrivateMessageLocal({ ...input, senderMode: 'alias' });
}

export async function replyToPrivateMessage(input: {
  sourceMessageId: string;
  actorId: string;
  senderMode: 'named' | 'alias';
  body: string;
  clientRequestId: string;
}) {
  await loadLocalDb();
  const src = memory.privateMessages.find((m) => m.id === input.sourceMessageId);
  if (!src) throw new AppError('NOT_FOUND', 'Note not found.');
  if (input.actorId !== src.senderId && input.actorId !== src.recipientId) {
    throw new AppError('FORBIDDEN', "You can't reply.");
  }
  const recipientId =
    input.actorId === src.senderId ? src.recipientId : src.senderId;
  return sendPrivateMessageLocal({
    circleId: src.circleId,
    senderId: input.actorId,
    recipientId,
    body: input.body,
    senderMode: input.senderMode,
    replyToMessageId: input.sourceMessageId,
    clientRequestId: input.clientRequestId,
  });
}

export async function getReceivedMessages(input: {
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<{
  items: {
    id: string;
    senderMode: 'named' | 'alias';
    senderDisplay: string;
    body: string;
    circle: { id: string; name: string };
    isOpened: boolean;
    createdAt: string;
    replyToMessageId: string | null;
  }[];
  nextCursor: { createdAt: string; id: string } | null;
}> {
  await loadLocalDb();
  assertNotSuspended(input.viewerId);
  const lim = Math.max(1, Math.min(input.limit ?? 20, 20));
  let rows = memory.privateMessages
    .filter(
      (m) =>
        m.recipientId === input.viewerId &&
        (m.status === 'active' || m.status === 'sender_deleted'),
    )
    .sort((a, b) => {
      const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return t !== 0 ? t : b.id.localeCompare(a.id);
    });

  rows = rows.filter((m) => {
    if (
      memory.blocks.some(
        (b) =>
          (b.blockerId === input.viewerId && b.blockedId === m.senderId) ||
          (b.blockerId === m.senderId && b.blockedId === input.viewerId),
      )
    ) {
      return false;
    }
    const st = memory.privateMessageUserStates.find(
      (s) => s.messageId === m.id && s.userId === input.viewerId,
    );
    if (st?.hiddenAt) return false;
    if (
      memory.hiddenContent.some(
        (h) =>
          h.userId === input.viewerId &&
          h.targetType === 'message' &&
          h.targetId === m.id,
      )
    ) {
      return false;
    }
    if (input.cursorCreatedAt && input.cursorId) {
      const ct = new Date(input.cursorCreatedAt).getTime();
      const pt = new Date(m.createdAt).getTime();
      if (pt > ct) return false;
      if (pt === ct && m.id >= input.cursorId) return false;
    }
    return true;
  });

  const page = rows.slice(0, lim);
  const items = page.map((m) => {
    const circle = memory.circles.find((c) => c.id === m.circleId);
    const st = memory.privateMessageUserStates.find(
      (s) => s.messageId === m.id && s.userId === input.viewerId,
    );
    let senderDisplay = 'Someone';
    if (m.senderMode === 'alias') {
      senderDisplay =
        memory.circleAliases.find((a) => a.id === m.aliasId)?.aliasName ?? 'Alias';
    } else {
      senderDisplay =
        memory.profiles.find((p) => p.id === m.senderId)?.displayName ?? 'Someone';
    }
    return {
      id: m.id,
      senderMode: m.senderMode,
      senderDisplay,
      body: m.body,
      circle: { id: m.circleId, name: circle?.name ?? 'Circle' },
      isOpened: Boolean(st?.openedAt),
      createdAt: m.createdAt,
      replyToMessageId: m.replyToMessageId ?? null,
    };
  });

  return {
    items,
    nextCursor:
      page.length === lim
        ? { createdAt: page[page.length - 1].createdAt, id: page[page.length - 1].id }
        : null,
  };
}

export async function getSentMessages(input: {
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<{
  items: {
    id: string;
    senderMode: 'named' | 'alias';
    recipientDisplay: string;
    body: string;
    circle: { id: string; name: string };
    createdAt: string;
    replyToMessageId: string | null;
  }[];
  nextCursor: { createdAt: string; id: string } | null;
}> {
  await loadLocalDb();
  assertNotSuspended(input.viewerId);
  const lim = Math.max(1, Math.min(input.limit ?? 20, 20));
  let rows = memory.privateMessages
    .filter(
      (m) =>
        m.senderId === input.viewerId &&
        (m.status === 'active' || m.status === 'recipient_deleted'),
    )
    .sort((a, b) => {
      const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return t !== 0 ? t : b.id.localeCompare(a.id);
    });

  rows = rows.filter((m) => {
    const st = memory.privateMessageUserStates.find(
      (s) => s.messageId === m.id && s.userId === input.viewerId,
    );
    if (st?.hiddenAt) return false;
    if (input.cursorCreatedAt && input.cursorId) {
      const ct = new Date(input.cursorCreatedAt).getTime();
      const pt = new Date(m.createdAt).getTime();
      if (pt > ct) return false;
      if (pt === ct && m.id >= input.cursorId) return false;
    }
    return true;
  });

  const page = rows.slice(0, lim);
  const items = page.map((m) => {
    const circle = memory.circles.find((c) => c.id === m.circleId);
    return {
      id: m.id,
      senderMode: m.senderMode,
      recipientDisplay:
        memory.profiles.find((p) => p.id === m.recipientId)?.displayName ?? 'Someone',
      body: m.body,
      circle: { id: m.circleId, name: circle?.name ?? 'Circle' },
      createdAt: m.createdAt,
      replyToMessageId: m.replyToMessageId ?? null,
    };
  });

  return {
    items,
    nextCursor:
      page.length === lim
        ? { createdAt: page[page.length - 1].createdAt, id: page[page.length - 1].id }
        : null,
  };
}

export async function openPrivateMessage(
  messageId: string,
  viewerId: string,
): Promise<{
  id: string;
  senderMode: 'named' | 'alias';
  senderDisplay: string;
  body: string;
  circle: { id: string; name: string };
  isOpened: boolean;
  createdAt: string;
  replyToMessageId: string | null;
}> {
  await loadLocalDb();
  const msg = memory.privateMessages.find((m) => m.id === messageId);
  if (!msg) throw new AppError('NOT_FOUND', 'Note not found.');
  if (msg.recipientId !== viewerId) throw new AppError('FORBIDDEN', "You can't open this.");
  if (msg.status === 'removed') throw new AppError('FORBIDDEN', "You can't open this.");
  if (await isBlockedBetween(viewerId, msg.senderId)) {
    throw new AppError('FORBIDDEN', "You can't open this.");
  }
  let st = memory.privateMessageUserStates.find(
    (s) => s.messageId === messageId && s.userId === viewerId,
  );
  if (!st) {
    st = { messageId, userId: viewerId, openedAt: now() };
    memory.privateMessageUserStates.push(st);
  } else if (!st.openedAt) {
    st.openedAt = now();
  }
  await persist();

  let senderDisplay = 'Someone';
  if (msg.senderMode === 'alias') {
    senderDisplay =
      memory.circleAliases.find((a) => a.id === msg.aliasId)?.aliasName ?? 'Alias';
  } else {
    senderDisplay =
      memory.profiles.find((p) => p.id === msg.senderId)?.displayName ?? 'Someone';
  }
  const circle = memory.circles.find((c) => c.id === msg.circleId);
  return {
    id: msg.id,
    senderMode: msg.senderMode,
    senderDisplay,
    body: msg.body,
    circle: { id: msg.circleId, name: circle?.name ?? 'Circle' },
    isOpened: true,
    createdAt: msg.createdAt,
    replyToMessageId: msg.replyToMessageId ?? null,
  };
}

export async function hidePrivateMessage(messageId: string, userId: string): Promise<void> {
  await loadLocalDb();
  const msg = memory.privateMessages.find((m) => m.id === messageId);
  if (!msg) throw new AppError('NOT_FOUND', 'Note not found.');
  if (userId !== msg.senderId && userId !== msg.recipientId) {
    throw new AppError('FORBIDDEN', "You can't hide this.");
  }
  const st = memory.privateMessageUserStates.find(
    (s) => s.messageId === messageId && s.userId === userId,
  );
  if (!st) {
    memory.privateMessageUserStates.push({
      messageId,
      userId,
      hiddenAt: now(),
    });
  } else {
    st.hiddenAt = now();
  }
  await persist();
}

export async function blockPrivateMessageSender(
  messageId: string,
  actorId: string,
): Promise<void> {
  await loadLocalDb();
  const msg = memory.privateMessages.find((m) => m.id === messageId);
  if (!msg) throw new AppError('NOT_FOUND', 'Note not found.');
  if (msg.recipientId !== actorId) {
    throw new AppError('FORBIDDEN', 'Only the recipient can do this.');
  }
  if (msg.senderId === actorId) {
    throw new AppError('VALIDATION', "You can't block yourself.");
  }
  await blockUser(actorId, msg.senderId);
}

export async function resolvePrivateMessageSender(input: {
  messageId: string;
  moderationCaseId: string;
  reason: string;
  adminId: string;
  isModerator: boolean;
}): Promise<{
  messageId: string;
  senderId: string;
  recipientId: string;
  circleId: string;
  senderMode: 'named' | 'alias';
}> {
  await loadLocalDb();
  if (!input.isModerator) throw new AppError('FORBIDDEN', 'Moderator only.');
  if (!input.reason.trim() || input.reason.trim().length < 3) {
    throw new AppError('VALIDATION', 'Reason required.');
  }
  const msg = memory.privateMessages.find((m) => m.id === input.messageId);
  if (!msg) throw new AppError('NOT_FOUND', 'Note not found.');
  const report = memory.reports.find((r) => r.id === input.moderationCaseId);
  if (!report || report.targetType !== 'message' || report.targetId !== input.messageId) {
    throw new AppError('FORBIDDEN', 'A linked report case is required.');
  }
  memory.adminAuditLogs.push({
    id: uid(),
    adminId: input.adminId,
    action: 'resolve_private_message_sender',
    targetType: 'message',
    targetId: input.messageId,
    reason: input.reason.trim(),
    createdAt: now(),
  });
  await persist();
  return {
    messageId: msg.id,
    senderId: msg.senderId,
    recipientId: msg.recipientId,
    circleId: msg.circleId,
    senderMode: msg.senderMode,
  };
}

// ---------------------------------------------------------------------------
// Phase 10 — diary Spotify music (local catalog mirror)
// ---------------------------------------------------------------------------

const DEMO_SPOTIFY_TRACKS = [
  {
    id: 'demoTrackSeasons',
    uri: 'spotify:track:demoTrackSeasons',
    externalUrl: 'https://open.spotify.com/track/demoTrackSeasons',
    trackName: 'seasons',
    artistNames: ['wave to earth'],
    albumName: 'summer flies',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273demo0001' as string | null,
    durationMs: 240000,
    explicit: false,
  },
  {
    id: 'demoTrackQuiet',
    uri: 'spotify:track:demoTrackQuiet',
    externalUrl: 'https://open.spotify.com/track/demoTrackQuiet',
    trackName: 'Quiet Morning',
    artistNames: ['Demo Artist'],
    albumName: 'Soft Days',
    artworkUrl: null as string | null,
    durationMs: 198000,
    explicit: false,
  },
  {
    id: 'demoTrackNight',
    uri: 'spotify:track:demoTrackNight',
    externalUrl: 'https://open.spotify.com/track/demoTrackNight',
    trackName: 'Night Walk',
    artistNames: ['Harbor Lights'],
    albumName: 'City Notes',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273demo0002' as string | null,
    durationMs: 212000,
    explicit: true,
  },
];

function parseSpotifyTrackIdLocal(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/\/(album|artist|playlist|episode|show)\//i.test(v)) return null;
  const uri = v.match(/spotify:track:([A-Za-z0-9]+)/i);
  if (uri?.[1]) return uri[1];
  const url = v.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  if (url?.[1]) return url[1];
  if (/^[A-Za-z0-9]{10,30}$/.test(v)) return v;
  return null;
}

export async function searchSpotifyTracksLocal(input: {
  query: string;
  limit?: number;
}) {
  const q = input.query.trim().toLowerCase();
  const lim = Math.max(1, Math.min(input.limit ?? 10, 10));
  return DEMO_SPOTIFY_TRACKS.filter(
    (t) =>
      t.trackName.toLowerCase().includes(q) ||
      t.artistNames.some((a) => a.toLowerCase().includes(q)),
  ).slice(0, lim);
}

export async function resolveSpotifyTrackLocal(urlOrUri: string) {
  const id = parseSpotifyTrackIdLocal(urlOrUri);
  if (!id) return null;
  return DEMO_SPOTIFY_TRACKS.find((t) => t.id === id) ?? null;
}

export async function applyDiarySpotifyTrackLocal(input: {
  diaryEntryId: string;
  actorId: string;
  track: (typeof DEMO_SPOTIFY_TRACKS)[number];
}) {
  await loadLocalDb();
  const entry = memory.diary.find((d) => d.id === input.diaryEntryId);
  if (!entry) throw new AppError('NOT_FOUND', 'Diary entry not found.');
  if (entry.userId !== input.actorId) {
    throw new AppError('FORBIDDEN', "You can't edit this diary.");
  }
  const art =
    input.track.artworkUrl && /^https:\/\/i\.scdn\.co\//i.test(input.track.artworkUrl)
      ? input.track.artworkUrl
      : null;
  const existing = memory.diaryMusic.find((m) => m.diaryEntryId === input.diaryEntryId);
  const row = {
    id: existing?.id ?? uid(),
    diaryEntryId: input.diaryEntryId,
    externalTrackId: input.track.id,
    spotifyUri: input.track.uri,
    externalUrl: input.track.externalUrl,
    trackName: input.track.trackName,
    artistNames: input.track.artistNames,
    albumName: input.track.albumName,
    artworkUrl: art,
    durationMs: input.track.durationMs,
    explicit: input.track.explicit,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  memory.diaryMusic = memory.diaryMusic.filter((m) => m.diaryEntryId !== input.diaryEntryId);
  memory.diaryMusic.push(row);
  await persist();
  return row;
}

export async function removeDiaryMusicLocal(
  diaryEntryId: string,
  actorId: string,
): Promise<void> {
  await loadLocalDb();
  const entry = memory.diary.find((d) => d.id === diaryEntryId);
  if (!entry) throw new AppError('NOT_FOUND', 'Diary entry not found.');
  if (entry.userId !== actorId) {
    throw new AppError('FORBIDDEN', "You can't edit this diary.");
  }
  memory.diaryMusic = memory.diaryMusic.filter((m) => m.diaryEntryId !== diaryEntryId);
  await persist();
}

export async function getDiaryMusicLocal(diaryEntryId: string, viewerId: string) {
  await loadLocalDb();
  const entry = memory.diary.find((d) => d.id === diaryEntryId);
  if (!entry) return null;
  if (!(await canViewDiary(viewerId, entry.userId, entry))) {
    throw new AppError('FORBIDDEN', "You can't view this.");
  }
  return memory.diaryMusic.find((m) => m.diaryEntryId === diaryEntryId) ?? null;
}

