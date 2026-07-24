/**
 * 로컬 데모 저장소 — Supabase 미연결 시 도메인 규칙 검증용.
 * 개설/가입 승인은 서버 RPC와 동일한 조건을 클라이언트에서도 재현하되,
 * 프로덕션에서는 Edge Function / DB 함수만 신뢰한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
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
};

let memory: LocalDb = { ...empty, profiles: [], draftMembers: [], drafts: [], circles: [], members: [], joinRequests: [], recommendations: [], diary: [], diaryVisibility: [], blocks: [] };
let loaded = false;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function todayInTz(tz = 'Asia/Seoul'): string {
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
  memory = raw ? (JSON.parse(raw) as LocalDb) : structuredClone(empty);
  loaded = true;
}

export async function clearLocalDb(): Promise<void> {
  memory = structuredClone(empty);
  loaded = true;
  await persist();
}

function ensureDemoFriends(selfId: string): void {
  const seeds: Profile[] = [
    { id: '00000000-0000-4000-8000-0000000000a1', displayName: '민서', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000b2', displayName: '준호', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000c3', displayName: '하은', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000d4', displayName: '서연', status: 'active', createdAt: now() },
    { id: '00000000-0000-4000-8000-0000000000e5', displayName: '지훈', status: 'active', createdAt: now() },
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

/** §6 open_circle_from_draft 와 동일한 조건 */
export async function proposeCircleDraft(
  proposerId: string,
  proposedName: string,
  inviteeIds: [string, string],
): Promise<{ draftId: string }> {
  await loadLocalDb();
  if (inviteeIds[0] === inviteeIds[1]) {
    throw new AppError('VALIDATION', '서로 다른 두 사람을 지목해야 해요.');
  }
  if (inviteeIds.includes(proposerId)) {
    throw new AppError('VALIDATION', '자기 자신은 초대할 수 없어요.');
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
    throw new AppError('FORBIDDEN', '이 초대를 응답할 권한이 없어요.');
  }
  if (me.responseStatus !== 'pending') {
    throw new AppError('CONFLICT', '이미 응답한 초대예요.');
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

/** 서버 함수 open_circle_from_draft 미러 */
export async function openCircleFromDraft(
  draftId: string,
  actorId: string,
): Promise<Circle | null> {
  await loadLocalDb();
  const draft = memory.drafts.find((d) => d.id === draftId);
  if (!draft || draft.status !== 'pending') {
    throw new AppError('CONFLICT', '이미 처리된 초안이에요.');
  }

  const members = memory.draftMembers.filter((m) => m.draftId === draftId);
  const unique = new Set(members.map((m) => m.userId));
  if (unique.size !== CIRCLE_PIONEER_COUNT) {
    throw new AppError('VALIDATION', '개척자는 정확히 세 명이어야 해요.');
  }
  if (!unique.has(actorId)) {
    throw new AppError('FORBIDDEN', '초안 멤버만 개설할 수 있어요.');
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

/** 데모: 두 초대 즉시 수락 */
export async function demoAcceptAll(draftId: string): Promise<Circle> {
  await loadLocalDb();
  const pending = memory.draftMembers.filter(
    (m) => m.draftId === draftId && m.memberType === 'invitee' && m.responseStatus === 'pending',
  );
  let opened: Circle | null = null;
  for (const m of pending) {
    opened = await respondDraftInvite(draftId, m.userId, true);
  }
  if (!opened) throw new AppError('UNKNOWN', '서클 개설에 실패했어요.');
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
    throw new AppError('FORBIDDEN', '서클 정보를 수정할 권한이 없어요.');
  }
  const circle = memory.circles.find((c) => c.id === circleId);
  if (!circle) throw new AppError('NOT_FOUND', '서클을 찾을 수 없어요.');
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
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        symbol: c.symbol,
        activeMemberCount: members.length,
        wroteTodayCount,
        hasActiveNotice: false,
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
    throw new AppError('CONFLICT', '이미 멤버예요.');
  }
  if (recommenderIds.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new AppError(
      'VALIDATION',
      `나를 아는 멤버 ${CIRCLE_JOIN_RECOMMENDATION_COUNT}명을 선택해 주세요.`,
    );
  }
  const unique = new Set(recommenderIds);
  if (unique.size !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new AppError('VALIDATION', '서로 다른 추천자를 선택해 주세요.');
  }
  if (unique.has(applicantId)) {
    throw new AppError('VALIDATION', '자기 자신을 추천자로 선택할 수 없어요.');
  }
  for (const id of recommenderIds) {
    if (!(await isCircleMember(circleId, id))) {
      throw new AppError('VALIDATION', '추천자는 서클 멤버여야 해요.');
    }
    if (memory.blocks.some((b) => b.blockerId === id && b.blockedId === applicantId)) {
      throw new AppError('FORBIDDEN', '차단 관계의 멤버는 추천자로 선택할 수 없어요.');
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

/** §7 승인 함수 미러 — 추천 삽입 후 3명이면 멤버십 삽입을 한 트랜잭션처럼 처리 */
export async function decideRecommendation(
  requestId: string,
  recommenderId: string,
  decision: 'recommended' | 'unknown' | 'later',
): Promise<JoinRequest | null> {
  await loadLocalDb();
  const rec = memory.recommendations.find(
    (r) => r.requestId === requestId && r.recommenderId === recommenderId,
  );
  if (!rec) throw new AppError('NOT_FOUND', '추천 요청을 찾을 수 없어요.');
  if (rec.decision !== 'pending' && rec.decision !== 'later') {
    throw new AppError('CONFLICT', '이미 응답했어요.');
  }

  const request = memory.joinRequests.find((r) => r.id === requestId);
  if (!request || request.status !== 'pending') {
    throw new AppError('CONFLICT', '이미 처리된 신청이에요.');
  }
  if (!(await isCircleMember(request.circleId, recommenderId))) {
    throw new AppError('FORBIDDEN', '서클 멤버만 추천할 수 있어요.');
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

  // 한 번만 가입
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
  const timezone = input.timezone ?? 'Asia/Seoul';
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
  if (memory.blocks.some((b) => b.blockerId === ownerId && b.blockedId === viewerId)) {
    return false;
  }
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
  if (!memory.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) {
    memory.blocks.push({ blockerId, blockedId });
    await persist();
  }
}
