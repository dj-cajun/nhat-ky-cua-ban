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
}

interface Recommendation {
  requestId: string;
  recommenderId: string;
  decision: 'pending' | 'recommended' | 'unknown' | 'later';
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
}

export interface CirclePostRecord {
  id: string;
  circleId: string;
  type: 'notice' | 'poll';
  title: string;
  body: string;
  status: 'active' | 'closed' | 'hidden';
  closesAt: string;
  createdBy: string;
  createdAt: string;
}

interface PollOptionRecord {
  id: string;
  postId: string;
  label: string;
}

interface ResponseRecord {
  postId: string;
  userId: string;
  optionId?: string;
  respondedAt: string;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  contentSnapshot: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
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
    memory.pollOptions ??= [];
    memory.responses ??= [];
    memory.reports ??= [];
    memory.blocks ??= [];
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
    { id: '00000000-0000-4000-8000-0000000000a1', displayName: 'Maya', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000b2', displayName: 'Jordan', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000c3', displayName: 'Avery', status: 'active', createdAt: now() },
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

export async function listCircleMembers(circleId: string): Promise<Member[]> {
  await loadLocalDb();
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

export async function createJoinRequest(
  circleId: string,
  applicantId: string,
  recommenderIds: string[],
): Promise<JoinRequest> {
  await loadLocalDb();
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
  for (const id of recommenderIds) {
    if (!(await isCircleMember(circleId, id))) {
      throw new AppError('VALIDATION', 'Recommenders must be circle members.');
    }
    if (memory.blocks.some((b) => b.blockerId === id && b.blockedId === applicantId)) {
      throw new AppError('FORBIDDEN', 'Blocked members can’t be recommenders.');
    }
  }

  const request: JoinRequest = {
    id: uid(),
    circleId,
    applicantId,
    status: 'pending',
  };
  memory.joinRequests.push(request);
  for (const recommenderId of recommenderIds) {
    memory.recommendations.push({
      requestId: request.id,
      recommenderId,
      decision: 'pending',
    });
  }
  await persist();
  return request;
}

/** §7 approve mirror — insert recommendation then membership in one logical txn */
export async function decideRecommendation(
  requestId: string,
  recommenderId: string,
  decision: 'recommended' | 'unknown' | 'later',
): Promise<JoinRequest | null> {
  await loadLocalDb();
  const rec = memory.recommendations.find(
    (r) => r.requestId === requestId && r.recommenderId === recommenderId,
  );
  if (!rec) throw new AppError('NOT_FOUND', 'Recommendation request not found.');
  if (rec.decision !== 'pending' && rec.decision !== 'later') {
    throw new AppError('CONFLICT', 'You already responded.');
  }

  const request = memory.joinRequests.find((r) => r.id === requestId);
  if (!request || request.status !== 'pending') {
    throw new AppError('CONFLICT', 'This request was already handled.');
  }
  if (!(await isCircleMember(request.circleId, recommenderId))) {
    throw new AppError('FORBIDDEN', 'Only circle members can recommend.');
  }

  rec.decision = decision;
  if (decision !== 'recommended') {
    await persist();
    return null;
  }

  const recommendedCount = memory.recommendations.filter(
    (r) => r.requestId === requestId && r.decision === 'recommended',
  ).length;

  if (recommendedCount < CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    await persist();
    return request;
  }

  // Join at most once
  if (await isCircleMember(request.circleId, request.applicantId)) {
    request.status = 'approved';
    await persist();
    return request;
  }

  memory.members.push({
    circleId: request.circleId,
    userId: request.applicantId,
    role: 'member',
    isPioneer: false,
    status: 'active',
  });
  request.status = 'approved';
  await persist();
  return request;
}

export async function getJoinProgress(requestId: string): Promise<{ recommended: number; total: number }> {
  await loadLocalDb();
  const recommended = memory.recommendations.filter(
    (r) => r.requestId === requestId && r.decision === 'recommended',
  ).length;
  return { recommended, total: CIRCLE_JOIN_RECOMMENDATION_COUNT };
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
  if (blockerId === blockedId) {
    throw new AppError('VALIDATION', 'You can’t block yourself.');
  }
  if (!memory.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) {
    memory.blocks.push({ blockerId, blockedId });
    await persist();
  }
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

/** One active post per circle (mirrors partial unique index) */
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
  const member = memory.members.find(
    (m) => m.circleId === input.circleId && m.userId === input.createdBy && m.status === 'active',
  );
  if (!member || (member.role !== 'admin' && !member.isPioneer)) {
    throw new AppError('FORBIDDEN', 'Only admins can create notices or polls.');
  }
  if (!input.title.trim()) {
    throw new AppError('VALIDATION', 'Enter a title.');
  }
  if (new Date(input.closesAt).getTime() <= Date.now()) {
    throw new AppError('VALIDATION', 'Choose an end time in the future.');
  }
  const active = memory.posts.find(
    (p) =>
      p.circleId === input.circleId &&
      p.status === 'active' &&
      new Date(p.closesAt).getTime() > Date.now(),
  );
  if (active) {
    throw new AppError('CONFLICT', 'This circle already has an active notice or poll.');
  }
  if (input.type === 'poll') {
    const opts = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2 || opts.length > 4) {
      throw new AppError('VALIDATION', 'Polls need 2–4 options.');
    }
  }

  const post: CirclePostRecord = {
    id: uid(),
    circleId: input.circleId,
    type: input.type,
    title: input.title.trim(),
    body: input.body?.trim() ?? '',
    status: 'active',
    closesAt: input.closesAt,
    createdBy: input.createdBy,
    createdAt: now(),
  };
  memory.posts.push(post);

  if (input.type === 'poll') {
    for (const label of input.options ?? []) {
      if (!label.trim()) continue;
      memory.pollOptions.push({ id: uid(), postId: post.id, label: label.trim() });
    }
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

/** Persist response first; UI may turn orange only after success */
export async function respondToPost(input: {
  postId: string;
  userId: string;
  optionId?: string;
}): Promise<ResponseRecord> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === input.postId);
  if (!post || post.status !== 'active' || new Date(post.closesAt).getTime() <= Date.now()) {
    throw new AppError('CONFLICT', 'This notice or poll is closed.');
  }
  if (!(await isCircleMember(post.circleId, input.userId))) {
    throw new AppError('FORBIDDEN', 'Only members can respond.');
  }
  if (post.type === 'poll') {
    if (!input.optionId) {
      throw new AppError('VALIDATION', 'Pick an option.');
    }
    if (!memory.pollOptions.some((o) => o.id === input.optionId && o.postId === post.id)) {
      throw new AppError('VALIDATION', 'Invalid option.');
    }
  }

  memory.responses = memory.responses.filter(
    (r) => !(r.postId === input.postId && r.userId === input.userId),
  );
  const response: ResponseRecord = {
    postId: input.postId,
    userId: input.userId,
    optionId: input.optionId,
    respondedAt: now(),
  };
  memory.responses.push(response);
  await persist();
  return response;
}

export async function hasResponded(postId: string, userId: string): Promise<boolean> {
  await loadLocalDb();
  return memory.responses.some((r) => r.postId === postId && r.userId === userId);
}

export async function listRespondedUserIds(postId: string): Promise<string[]> {
  await loadLocalDb();
  return memory.responses.filter((r) => r.postId === postId).map((r) => r.userId);
}

/** Aggregates only — never returns who picked what */
export async function getPollSummary(
  postId: string,
  viewerId: string,
): Promise<{ totalResponded: number; options: { id: string; label: string; count: number }[] }> {
  await loadLocalDb();
  const post = memory.posts.find((p) => p.id === postId);
  if (!post) throw new AppError('NOT_FOUND', 'Poll not found.');
  if (!(await isCircleMember(post.circleId, viewerId))) {
    throw new AppError('FORBIDDEN', 'Only members can view results.');
  }
  const options = memory.pollOptions.filter((o) => o.postId === postId);
  return {
    totalResponded: memory.responses.filter((r) => r.postId === postId).length,
    options: options.map((o) => ({
      id: o.id,
      label: o.label,
      count: memory.responses.filter((r) => r.optionId === o.id).length,
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
  if (!member || (member.role !== 'admin' && !member.isPioneer)) {
    throw new AppError('FORBIDDEN', 'Only admins can close this.');
  }
  post.status = 'closed';
  await persist();
}

export async function submitReport(input: {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  contentSnapshot: string;
}): Promise<ReportRecord> {
  await loadLocalDb();
  if (!input.reason.trim()) {
    throw new AppError('VALIDATION', 'Choose a reason.');
  }
  const report: ReportRecord = {
    id: uid(),
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason.trim(),
    contentSnapshot: input.contentSnapshot.slice(0, 2000),
    status: 'open',
    createdAt: now(),
  };
  memory.reports.push(report);
  await persist();
  return report;
}

export async function listMyReports(reporterId: string): Promise<ReportRecord[]> {
  await loadLocalDb();
  return memory.reports.filter((r) => r.reporterId === reporterId);
}
