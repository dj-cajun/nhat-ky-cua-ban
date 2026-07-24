/**
 * Local demo store when Supabase is not configured.
 * Mirrors server RPC rules for founding/join; production trusts Edge Functions / DB only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TIMEZONE } from '@/i18n/en';
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

interface GuestbookRow {
  id: string;
  ownerUserId: string;
  authorUserId: string;
  body: string;
  hidden: boolean;
  createdAt: string;
}

interface PhotoAssetRow {
  id: string;
  userId: string;
  storagePath: string;
  createdAt: string;
}

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
  photos: [],
  circleAliases: [],
  anonymousPosts: [],
  adminAuditLogs: [],
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
    memory.photos ??= [];
    memory.circleAliases ??= [];
    memory.anonymousPosts ??= [];
    memory.adminAuditLogs ??= [];
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
  loaded = true;
}

export async function clearLocalDb(): Promise<void> {
  memory = structuredClone(empty);
  loaded = true;
  await persist();
}

function ensureDemoFriends(selfId: string): void {
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
  ensureDemoFriends(profile.id);
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

  const circle: Circle = {
    id: uid(),
    name: draft.proposedName,
    description: '',
    color: CIRCLE_COLORS[0],
    symbol: CIRCLE_SYMBOLS[0],
    createdBy: draft.proposerId,
    status: 'open',
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
  await loadLocalDb();
  return memory.members.some(
    (m) => m.circleId === circleId && m.userId === userId && m.status === 'active',
  );
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
  if (!circle) return null;
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
  if (!(await isCircleMember(request.circleId, actorId))) {
    throw new AppError('FORBIDDEN', 'Only circle members can recommend.');
  }
  if (await isBlockedBetween(actorId, request.applicantId)) {
    throw new AppError('FORBIDDEN', 'Blocked users can’t complete this recommendation.');
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
    await persist();
  }
  return profile;
}

export async function switchSession(userId: string): Promise<Profile> {
  await loadLocalDb();
  const profile = memory.profiles.find((p) => p.id === userId);
  if (!profile) throw new AppError('NOT_FOUND', 'Profile not found.');
  memory.sessionUserId = userId;
  await persist();
  return profile;
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
}): Promise<DiaryEntry> {
  await loadLocalDb();
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const entryDate = todayInTz(timezone);
  const existing = memory.diary.find((d) => d.userId === input.userId && d.entryDate === entryDate);

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

export async function canViewDiary(
  viewerId: string,
  ownerId: string,
  entry: DiaryEntry,
): Promise<boolean> {
  await loadLocalDb();
  if (viewerId === ownerId) return true;
  if (await isBlockedBetween(viewerId, ownerId)) return false;
  if (entry.visibilityMode === 'private') return false;

  const viewerCircles = new Set(
    memory.members.filter((m) => m.userId === viewerId && m.status === 'active').map((m) => m.circleId),
  );
  const ownerCircles = new Set(
    memory.members.filter((m) => m.userId === ownerId && m.status === 'active').map((m) => m.circleId),
  );
  const shared = [...viewerCircles].filter((id) => ownerCircles.has(id));
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
  if (!(await isCircleMember(input.circleId, input.createdBy))) {
    throw new AppError('FORBIDDEN', 'Only members can post.');
  }
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
  if (!(await isCircleMember(post.circleId, input.userId))) {
    throw new AppError('FORBIDDEN', 'Only members can respond.');
  }

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
  if (!(await isCircleMember(post.circleId, input.userId))) {
    throw new AppError('FORBIDDEN', 'Only members can respond.');
  }
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
  }
  return { photoId: photo.id, storagePath: photo.storagePath, allowed: true };
}

export async function addDemoPhoto(userId: string, path: string): Promise<PhotoAssetRow> {
  await loadLocalDb();
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

export async function addGuestbookEntry(input: {
  ownerUserId: string;
  authorUserId: string;
  body: string;
}): Promise<GuestbookRow> {
  await loadLocalDb();
  if (await isBlockedBetween(input.ownerUserId, input.authorUserId)) {
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
  return memory.guestbook.filter(
    (g) =>
      g.ownerUserId === ownerUserId &&
      !g.hidden &&
      !memory.hiddenContent.some(
        (h) =>
          h.userId === viewerId &&
          h.targetType === 'guestbook_entry' &&
          h.targetId === g.id,
      ),
  );
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
  if (!(await isCircleMember(circleId, userId))) {
    throw new AppError('FORBIDDEN', 'Only members can use the alias board.');
  }
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
  if (!(await isCircleMember(input.circleId, input.userId))) {
    throw new AppError('FORBIDDEN', 'Only members can post.');
  }
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
