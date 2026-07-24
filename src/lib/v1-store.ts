/**
 * v1 로컬 스토어 — Supabase 미연결 시 localStorage 폴백
 * 서클 생성(3인 개척) · 가입 추천 · 다이어리 · 프레즌스
 */
import type {
  AppProfile,
  Circle,
  CircleCreationInvite,
  CircleDraft,
  CircleJoinRequest,
  CircleMember,
  CirclePost,
  CirclePresence,
  CircleRecommendation,
  CircleResponse,
  DiaryEntry,
  DiaryEntryVisibility,
  DiaryMood,
  DiaryVisibilityMode,
  GuestbookEntry,
  InviteStatus,
  JoinRequestStatus,
} from '@/types/circle';
import {
  CIRCLE_COLORS,
  CIRCLE_JOIN_RECOMMENDATION_COUNT,
  CIRCLE_PIONEER_COUNT,
  CIRCLE_SYMBOLS,
  MAX_TEN_CHAR,
} from '@/types/circle';

const KEYS = {
  profile: 'v1_profile',
  profiles: 'v1_profiles_directory',
  circles: 'v1_circles',
  members: 'v1_circle_members',
  drafts: 'v1_circle_drafts',
  invites: 'v1_circle_creation_invites',
  joinRequests: 'v1_circle_join_requests',
  recommendations: 'v1_circle_recommendations',
  presence: 'v1_circle_presence',
  posts: 'v1_circle_posts',
  responses: 'v1_circle_responses',
  diary: 'v1_diary_entries',
  diaryVisibility: 'v1_diary_visibility',
  guestbook: 'v1_guestbook',
  session: 'v1_auth_session',
} as const;

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function upsertDirectory(profile: AppProfile): void {
  const all = read<AppProfile[]>(KEYS.profiles, []);
  const next = all.filter((p) => p.id !== profile.id);
  next.push(profile);
  write(KEYS.profiles, next);
}

/** 데모용 시드 유저 (개척 초대 대상) */
export function ensureDemoDirectory(selfId: string): AppProfile[] {
  const seeds: AppProfile[] = [
    {
      id: 'demo-friend-a',
      displayName: '민서',
      authProvider: 'demo',
      createdAt: now(),
      avatarUrl: undefined,
      bio: '함께 개척할 친구',
    },
    {
      id: 'demo-friend-b',
      displayName: '준호',
      authProvider: 'demo',
      createdAt: now(),
      bio: '함께 개척할 친구',
    },
    {
      id: 'demo-friend-c',
      displayName: '서연',
      authProvider: 'demo',
      createdAt: now(),
      bio: '서클 멤버',
    },
    {
      id: 'demo-applicant-yujin',
      displayName: '유진',
      authProvider: 'demo',
      createdAt: now(),
      bio: '가입 신청자',
    },
  ];
  const all = read<AppProfile[]>(KEYS.profiles, []);
  for (const s of seeds) {
    if (!all.some((p) => p.id === s.id) && s.id !== selfId) {
      all.push(s);
    }
  }
  write(KEYS.profiles, all);
  return all.filter((p) => p.id !== selfId);
}

export function getSessionProfile(): AppProfile | null {
  return read<AppProfile | null>(KEYS.profile, null);
}

export function setSessionProfile(profile: AppProfile): void {
  write(KEYS.profile, profile);
  upsertDirectory(profile);
  write(KEYS.session, { userId: profile.id, at: now() });
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.profile);
  localStorage.removeItem(KEYS.session);
}

export function getProfileById(id: string): AppProfile | null {
  const self = getSessionProfile();
  if (self?.id === id) return self;
  return read<AppProfile[]>(KEYS.profiles, []).find((p) => p.id === id) ?? null;
}

export function listDirectoryProfiles(excludeId?: string): AppProfile[] {
  return read<AppProfile[]>(KEYS.profiles, []).filter((p) => p.id !== excludeId);
}

export function createProfile(input: {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: AppProfile['authProvider'];
}): AppProfile {
  const profile: AppProfile = {
    id: uid(),
    displayName: input.displayName.trim(),
    email: input.email,
    avatarUrl: input.avatarUrl,
    authProvider: input.authProvider ?? 'email',
    createdAt: now(),
    termsAcceptedAt: now(),
    bio: '',
  };
  setSessionProfile(profile);
  return profile;
}

export function updateProfile(patch: Partial<AppProfile>): AppProfile | null {
  const current = getSessionProfile();
  if (!current) return null;
  const next = { ...current, ...patch, id: current.id };
  setSessionProfile(next);
  return next;
}

export function listMyCircles(userId: string): Circle[] {
  const memberOf = read<CircleMember[]>(KEYS.members, []).filter((m) => m.userId === userId);
  const circles = read<Circle[]>(KEYS.circles, []);
  return circles.filter(
    (c) => c.status === 'open' && memberOf.some((m) => m.circleId === c.id),
  );
}

export function getCircle(id: string): Circle | null {
  return read<Circle[]>(KEYS.circles, []).find((c) => c.id === id) ?? null;
}

export function proposeCircle(input: {
  name: string;
  inviterId: string;
  inviteeIds: [string, string];
}): { draft: CircleDraft; invites: CircleCreationInvite[] } {
  if (input.inviteeIds[0] === input.inviteeIds[1]) {
    throw new Error('서로 다른 두 사람을 지목해야 합니다.');
  }
  if (input.inviteeIds.includes(input.inviterId)) {
    throw new Error('자기 자신은 초대할 수 없습니다.');
  }

  const draft: CircleDraft = {
    id: uid(),
    name: input.name.trim(),
    inviterId: input.inviterId,
    inviteeIds: input.inviteeIds,
    createdAt: now(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const invites: CircleCreationInvite[] = input.inviteeIds.map((inviteeId) => ({
    id: uid(),
    circleDraftId: draft.id,
    inviterId: input.inviterId,
    inviteeId,
    status: 'pending' as InviteStatus,
    createdAt: now(),
  }));

  write(KEYS.drafts, [...read<CircleDraft[]>(KEYS.drafts, []), draft]);
  write(KEYS.invites, [...read<CircleCreationInvite[]>(KEYS.invites, []), ...invites]);
  return { draft, invites };
}

export function listPendingInvitesFor(userId: string): CircleCreationInvite[] {
  return read<CircleCreationInvite[]>(KEYS.invites, []).filter(
    (i) => i.inviteeId === userId && i.status === 'pending',
  );
}

export function respondToCreationInvite(
  inviteId: string,
  userId: string,
  accept: boolean,
): Circle | null {
  const invites = read<CircleCreationInvite[]>(KEYS.invites, []);
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite || invite.inviteeId !== userId) {
    throw new Error('초대를 찾을 수 없습니다.');
  }
  if (invite.status !== 'pending') {
    throw new Error('이미 응답한 초대입니다.');
  }

  invite.status = accept ? 'accepted' : 'declined';
  invite.respondedAt = now();
  write(KEYS.invites, invites);

  if (!accept) {
    const siblings = invites.filter((i) => i.circleDraftId === invite.circleDraftId);
    for (const s of siblings) {
      if (s.status === 'pending') {
        s.status = 'expired';
        s.respondedAt = now();
      }
    }
    write(KEYS.invites, invites);
    return null;
  }

  const related = invites.filter((i) => i.circleDraftId === invite.circleDraftId);
  const allAccepted = related.every((i) => i.status === 'accepted');
  if (!allAccepted) return null;

  return finalizeCircleFromDraft(invite.circleDraftId);
}

function finalizeCircleFromDraft(draftId: string): Circle {
  const drafts = read<CircleDraft[]>(KEYS.drafts, []);
  const draft = drafts.find((d) => d.id === draftId);
  if (!draft) throw new Error('초안을 찾을 수 없습니다.');

  const circle: Circle = {
    id: uid(),
    name: draft.name,
    description: '',
    color: CIRCLE_COLORS[0],
    symbol: CIRCLE_SYMBOLS[0],
    createdBy: draft.inviterId,
    status: 'open',
    openedAt: now(),
    createdAt: now(),
  };

  const pioneerIds = [draft.inviterId, ...draft.inviteeIds];
  if (pioneerIds.length !== CIRCLE_PIONEER_COUNT) {
    throw new Error('개척자는 정확히 세 명이어야 합니다.');
  }

  const members: CircleMember[] = pioneerIds.map((userId) => ({
    circleId: circle.id,
    userId,
    role: userId === draft.inviterId ? 'admin' : 'pioneer',
    isPioneer: true,
    joinedAt: now(),
  }));
  // 제안자도 pioneer
  members[0].role = 'admin';
  members[0].isPioneer = true;

  write(KEYS.circles, [...read<Circle[]>(KEYS.circles, []), circle]);
  write(KEYS.members, [...read<CircleMember[]>(KEYS.members, []), ...members]);
  write(
    KEYS.drafts,
    drafts.filter((d) => d.id !== draftId),
  );
  return circle;
}

/** 데모: 두 초대 즉시 수락 후 서클 개설 */
export function demoAcceptAllAndOpen(draftId: string): Circle {
  const pending = read<CircleCreationInvite[]>(KEYS.invites, []).filter(
    (i) => i.circleDraftId === draftId && i.status === 'pending',
  );
  let opened: Circle | null = null;
  for (const invite of pending) {
    opened = respondToCreationInvite(invite.id, invite.inviteeId, true);
  }
  if (opened) return opened;
  const all = read<Circle[]>(KEYS.circles, []);
  const found = all.find((c) =>
    listCircleMembers(c.id).some((m) => m.userId === pending[0]?.inviterId),
  );
  if (!found) throw new Error('서클 개설에 실패했습니다.');
  return found;
}

export function updateCircleDesign(
  circleId: string,
  actorId: string,
  patch: Partial<Pick<Circle, 'name' | 'description' | 'color' | 'symbol'>>,
): Circle {
  const members = listCircleMembers(circleId);
  const me = members.find((m) => m.userId === actorId);
  if (!me || (me.role !== 'admin' && !me.isPioneer)) {
    throw new Error('서클 정보를 수정할 권한이 없습니다.');
  }
  const circles = read<Circle[]>(KEYS.circles, []);
  const idx = circles.findIndex((c) => c.id === circleId);
  if (idx < 0) throw new Error('서클을 찾을 수 없습니다.');
  circles[idx] = { ...circles[idx], ...patch };
  write(KEYS.circles, circles);
  return circles[idx];
}

export function listCircleMembers(circleId: string, viewerId?: string): CircleMember[] {
  if (viewerId) {
    const ok = read<CircleMember[]>(KEYS.members, []).some(
      (m) => m.circleId === circleId && m.userId === viewerId,
    );
    if (!ok) throw new Error('멤버만 목록을 볼 수 있습니다.');
  }
  return read<CircleMember[]>(KEYS.members, []).filter((m) => m.circleId === circleId);
}

export function getCircleInvitePreview(circleId: string, viewerId: string) {
  const circle = getCircle(circleId);
  if (!circle || circle.status !== 'open') return null;
  const members = read<CircleMember[]>(KEYS.members, []).filter((m) => m.circleId === circleId);
  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    color: circle.color,
    symbol: circle.symbol,
    memberCount: members.length,
    isMember: members.some((m) => m.userId === viewerId),
  };
}

export function requestJoin(
  circleId: string,
  applicantId: string,
  recommenderIds: string[],
): CircleJoinRequest {
  const circle = getCircle(circleId);
  if (!circle || circle.status !== 'open') throw new Error('열린 서클이 아닙니다.');
  const members = read<CircleMember[]>(KEYS.members, []).filter((m) => m.circleId === circleId);
  if (members.some((m) => m.userId === applicantId)) {
    throw new Error('이미 멤버입니다.');
  }
  if (recommenderIds.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new Error(`추천인 ${CIRCLE_JOIN_RECOMMENDATION_COUNT}명을 선택해야 합니다.`);
  }
  const unique = new Set(recommenderIds);
  if (unique.size !== CIRCLE_JOIN_RECOMMENDATION_COUNT) {
    throw new Error('서로 다른 추천인 3명을 선택해야 합니다.');
  }
  if (unique.has(applicantId)) {
    throw new Error('본인을 추천인으로 지정할 수 없습니다.');
  }
  const pending = read<CircleJoinRequest[]>(KEYS.joinRequests, []).some(
    (r) => r.circleId === circleId && r.applicantId === applicantId && r.status === 'pending',
  );
  if (pending) throw new Error('이미 대기 중인 신청이 있습니다.');

  for (const id of recommenderIds) {
    if (!members.some((m) => m.userId === id)) {
      throw new Error('추천인은 기존 멤버여야 합니다.');
    }
  }

  const stamp = now();
  const request: CircleJoinRequest = {
    id: uid(),
    circleId,
    applicantId,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  write(KEYS.joinRequests, [...read<CircleJoinRequest[]>(KEYS.joinRequests, []), request]);

  const recs: CircleRecommendation[] = recommenderIds.map((recommenderId) => ({
    id: uid(),
    joinRequestId: request.id,
    recommenderId,
    status: 'pending',
    createdAt: stamp,
  }));
  write(KEYS.recommendations, [
    ...read<CircleRecommendation[]>(KEYS.recommendations, []),
    ...recs,
  ]);
  return request;
}

export function respondRecommendation(
  recommendationId: string,
  userId: string,
  status: 'recommended' | 'unknown' | 'later',
): CircleJoinRequest | null {
  if (status === 'later') return null;

  const recs = read<CircleRecommendation[]>(KEYS.recommendations, []);
  const rec = recs.find((r) => r.id === recommendationId);
  if (!rec || rec.recommenderId !== userId) throw new Error('추천 요청을 찾을 수 없습니다.');
  if (rec.status !== 'pending') throw new Error('이미 응답했습니다.');

  const requests = read<CircleJoinRequest[]>(KEYS.joinRequests, []);
  const req = requests.find((r) => r.id === rec.joinRequestId);
  if (!req || req.status !== 'pending') throw new Error('이미 처리된 신청입니다.');
  if (new Date(req.expiresAt).getTime() <= Date.now()) {
    req.status = 'expired';
    req.updatedAt = now();
    write(KEYS.joinRequests, requests);
    throw new Error('만료된 신청입니다.');
  }

  const members = read<CircleMember[]>(KEYS.members, []);
  if (!members.some((m) => m.circleId === req.circleId && m.userId === userId)) {
    throw new Error('서클 멤버만 추천할 수 있습니다.');
  }

  rec.status = status;
  rec.respondedAt = now();
  write(KEYS.recommendations, recs);

  if (status !== 'recommended') return null;

  const related = recs.filter((r) => r.joinRequestId === rec.joinRequestId);
  const recommended = new Set(
    related.filter((r) => r.status === 'recommended').map((r) => r.recommenderId),
  ).size;
  if (recommended < CIRCLE_JOIN_RECOMMENDATION_COUNT) return req;

  if (!members.some((m) => m.circleId === req.circleId && m.userId === req.applicantId)) {
    members.push({
      circleId: req.circleId,
      userId: req.applicantId,
      role: 'member',
      isPioneer: false,
      joinedAt: now(),
    });
    write(KEYS.members, members);
  }

  req.status = 'approved';
  req.approvedAt = now();
  req.updatedAt = now();
  write(KEYS.joinRequests, requests);

  for (const r of recs) {
    if (r.joinRequestId === req.id && r.status === 'pending') {
      r.status = 'unknown';
      r.respondedAt = r.respondedAt ?? now();
    }
  }
  write(KEYS.recommendations, recs);
  return req;
}

/** Applicant-safe: counts only */
export function getJoinProgress(
  requestId: string,
  viewerId?: string,
): { recommended: number; total: number; status: JoinRequestStatus; circleId: string } {
  const requests = read<CircleJoinRequest[]>(KEYS.joinRequests, []);
  const req = requests.find((r) => r.id === requestId);
  if (!req) throw new Error('신청을 찾을 수 없습니다.');
  if (viewerId && req.applicantId !== viewerId) {
    throw new Error('본인 신청만 확인할 수 있습니다.');
  }
  const recs = read<CircleRecommendation[]>(KEYS.recommendations, []).filter(
    (r) => r.joinRequestId === requestId,
  );
  return {
    recommended: new Set(recs.filter((r) => r.status === 'recommended').map((r) => r.recommenderId))
      .size,
    total: CIRCLE_JOIN_RECOMMENDATION_COUNT,
    status: req.status,
    circleId: req.circleId,
  };
}

export function listMyRecommendations(recommenderId: string): CircleRecommendation[] {
  const recs = read<CircleRecommendation[]>(KEYS.recommendations, []);
  const requests = read<CircleJoinRequest[]>(KEYS.joinRequests, []);
  return recs.filter((r) => {
    if (r.recommenderId !== recommenderId || r.status !== 'pending') return false;
    const req = requests.find((j) => j.id === r.joinRequestId);
    return req?.status === 'pending';
  });
}

export function cancelJoinRequest(requestId: string, applicantId: string): void {
  const requests = read<CircleJoinRequest[]>(KEYS.joinRequests, []);
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.applicantId !== applicantId || req.status !== 'pending') {
    throw new Error('취소할 수 없습니다.');
  }
  req.status = 'cancelled';
  req.updatedAt = now();
  write(KEYS.joinRequests, requests);
}

export function switchDemoSession(profileId: string): AppProfile {
  const all = read<AppProfile[]>(KEYS.profiles, []);
  const profile = all.find((p) => p.id === profileId);
  if (!profile) throw new Error('프로필을 찾을 수 없습니다.');
  write(KEYS.profile, profile);
  return profile;
}

export function demoAddMember(circleId: string, userId: string): void {
  const members = read<CircleMember[]>(KEYS.members, []);
  if (members.some((m) => m.circleId === circleId && m.userId === userId)) return;
  members.push({
    circleId,
    userId,
    role: 'member',
    isPioneer: false,
    joinedAt: now(),
  });
  write(KEYS.members, members);
}

export function listMemberProfilesForJoinPicker(
  circleId: string,
  applicantId: string,
): AppProfile[] {
  const memberIds = read<CircleMember[]>(KEYS.members, [])
    .filter((m) => m.circleId === circleId)
    .map((m) => m.userId)
    .filter((id) => id !== applicantId);
  return memberIds
    .map((id) => getProfileById(id))
    .filter((p): p is AppProfile => Boolean(p));
}

export function heartbeatPresence(circleId: string, userId: string, sessionId: string): void {
  const all = read<CirclePresence[]>(KEYS.presence, []).filter(
    (p) => !(p.circleId === circleId && p.userId === userId),
  );
  all.push({
    circleId,
    userId,
    lastHeartbeat: now(),
    activeSessionId: sessionId,
  });
  write(KEYS.presence, all);
}

export function clearPresence(circleId: string, userId: string): void {
  write(
    KEYS.presence,
    read<CirclePresence[]>(KEYS.presence, []).filter(
      (p) => !(p.circleId === circleId && p.userId === userId),
    ),
  );
}

export function listActivePresence(circleId: string, maxAgeMs = 45_000): CirclePresence[] {
  const cutoff = Date.now() - maxAgeMs;
  return read<CirclePresence[]>(KEYS.presence, []).filter(
    (p) => p.circleId === circleId && new Date(p.lastHeartbeat).getTime() >= cutoff,
  );
}

export function createNotice(input: {
  circleId: string;
  createdBy: string;
  title: string;
  body?: string;
  closesAt: string;
}): CirclePost {
  const active = listActivePosts(input.circleId);
  if (active.length > 0) {
    throw new Error('활성 공지·투표는 한 번에 하나만 가능합니다.');
  }
  const post: CirclePost = {
    id: uid(),
    circleId: input.circleId,
    type: 'notice',
    title: input.title.trim(),
    body: input.body?.trim() ?? '',
    closesAt: input.closesAt,
    createdBy: input.createdBy,
    createdAt: now(),
  };
  write(KEYS.posts, [...read<CirclePost[]>(KEYS.posts, []), post]);
  return post;
}

export function listActivePosts(circleId: string): CirclePost[] {
  const t = Date.now();
  return read<CirclePost[]>(KEYS.posts, []).filter(
    (p) => p.circleId === circleId && new Date(p.closesAt).getTime() > t,
  );
}

export function respondToPost(postId: string, userId: string, optionId?: string): CircleResponse {
  const responses = read<CircleResponse[]>(KEYS.responses, []).filter(
    (r) => !(r.postId === postId && r.userId === userId),
  );
  const response: CircleResponse = {
    postId,
    userId,
    optionId,
    respondedAt: now(),
  };
  responses.push(response);
  write(KEYS.responses, responses);
  return response;
}

export function hasResponded(postId: string, userId: string): boolean {
  return read<CircleResponse[]>(KEYS.responses, []).some(
    (r) => r.postId === postId && r.userId === userId,
  );
}

export function getDiaryEntry(userId: string, entryDate = today()): DiaryEntry | null {
  return (
    read<DiaryEntry[]>(KEYS.diary, []).find(
      (e) => e.userId === userId && e.entryDate === entryDate,
    ) ?? null
  );
}

export function listDiaryEntries(userId: string): DiaryEntry[] {
  return read<DiaryEntry[]>(KEYS.diary, [])
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export function upsertDiaryEntry(input: {
  userId: string;
  entryDate?: string;
  mood?: DiaryMood;
  tenCharText?: string;
  shortText?: string;
  visibilityMode?: DiaryVisibilityMode;
  circleIds?: string[];
}): DiaryEntry {
  const entryDate = input.entryDate ?? today();
  if (input.tenCharText && input.tenCharText.length > MAX_TEN_CHAR) {
    throw new Error(`10자 기록은 ${MAX_TEN_CHAR}자까지입니다.`);
  }

  const all = read<DiaryEntry[]>(KEYS.diary, []);
  const existing = all.find((e) => e.userId === input.userId && e.entryDate === entryDate);
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
        id: uid(),
        userId: input.userId,
        entryDate,
        mood: input.mood,
        tenCharText: input.tenCharText,
        shortText: input.shortText,
        visibilityMode: input.visibilityMode ?? 'private',
        createdAt: now(),
        updatedAt: now(),
      };

  const next = all.filter((e) => e.id !== entry.id);
  next.push(entry);
  write(KEYS.diary, next);

  if (input.circleIds) {
    const vis = read<DiaryEntryVisibility[]>(KEYS.diaryVisibility, []).filter(
      (v) => v.entryId !== entry.id,
    );
    for (const circleId of input.circleIds) {
      vis.push({ entryId: entry.id, circleId });
    }
    write(KEYS.diaryVisibility, vis);
  }

  return entry;
}

export function canViewDiary(viewerId: string, ownerId: string, entry: DiaryEntry): boolean {
  if (viewerId === ownerId) return true;
  if (entry.visibilityMode === 'private') return false;

  const myCircles = new Set(listMyCircles(viewerId).map((c) => c.id));
  const ownerCircles = new Set(listMyCircles(ownerId).map((c) => c.id));
  const shared = [...myCircles].filter((id) => ownerCircles.has(id));
  if (shared.length === 0) return false;

  if (entry.visibilityMode === 'all_circles') return true;

  const allowed = new Set(
    read<DiaryEntryVisibility[]>(KEYS.diaryVisibility, [])
      .filter((v) => v.entryId === entry.id)
      .map((v) => v.circleId),
  );
  return shared.some((id) => allowed.has(id));
}

export function addGuestbook(ownerUserId: string, authorUserId: string, body: string): GuestbookEntry {
  const entry: GuestbookEntry = {
    id: uid(),
    ownerUserId,
    authorUserId,
    body: body.trim(),
    createdAt: now(),
  };
  write(KEYS.guestbook, [...read<GuestbookEntry[]>(KEYS.guestbook, []), entry]);
  return entry;
}

export function listGuestbook(ownerUserId: string, limit = 20): GuestbookEntry[] {
  return read<GuestbookEntry[]>(KEYS.guestbook, [])
    .filter((g) => g.ownerUserId === ownerUserId && !g.hidden)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function clearV1Data(): void {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key);
  }
}
