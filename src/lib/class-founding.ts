import {
  buildClassKey,
  FOUNDING_QUIZ_COUNT,
  FOUNDING_REQUIRED_MEMBERS,
  FOUNDING_TTL_MS,
  type ClassFoundingRecord,
  type FoundingMember,
} from '@/types/founding';

const STORAGE_KEY = 'diary_class_foundings';

function readAll(): Record<string, ClassFoundingRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ClassFoundingRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, ClassFoundingRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function createToken(): string {
  return `fc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function touchExpiry(record: ClassFoundingRecord): ClassFoundingRecord {
  if (record.status !== 'pending' && record.status !== 'forming') {
    return record;
  }
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    return { ...record, status: 'expired' };
  }
  return record;
}

function saveRecord(record: ClassFoundingRecord): ClassFoundingRecord {
  const records = readAll();
  const next = touchExpiry(record);
  records[next.classKey] = next;
  writeAll(records);
  return next;
}

function findByToken(token: string): ClassFoundingRecord | null {
  const records = readAll();
  for (const record of Object.values(records)) {
    const fresh = touchExpiry(record);
    if (fresh.inviteToken === token) {
      return fresh;
    }
  }
  return null;
}

export function getFounding(schoolName: string, className: string): ClassFoundingRecord | null {
  const classKey = buildClassKey(schoolName, className);
  const record = readAll()[classKey];
  return record ? touchExpiry(record) : null;
}

export function isClassActive(schoolName: string, className: string): boolean {
  const record = getFounding(schoolName, className);
  return record?.status === 'active';
}

export function getInviteUrl(token: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('founding', 'join');
  url.searchParams.set('token', token);
  return url.toString();
}

export type ClaimResult =
  | { ok: true; record: ClassFoundingRecord }
  | { ok: false; reason: 'already_active' | 'already_pending' };

export function claimFounding(
  schoolName: string,
  className: string,
  userId: string,
  userName: string,
): ClaimResult {
  const existing = getFounding(schoolName, className);
  if (existing?.status === 'active') {
    return { ok: false, reason: 'already_active' };
  }
  if (existing?.status === 'pending' || existing?.status === 'forming') {
    return { ok: false, reason: 'already_pending' };
  }

  const now = new Date();
  const record: ClassFoundingRecord = {
    classKey: buildClassKey(schoolName, className),
    schoolName,
    className,
    status: 'pending',
    founderUserId: userId,
    founderName: userName,
    inviteToken: createToken(),
    members: [{ userId, name: userName, joinedAt: now.toISOString() }],
    quizzes: [],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + FOUNDING_TTL_MS).toISOString(),
  };

  return { ok: true, record: saveRecord(record) };
}

export type JoinResult =
  | { ok: true; record: ClassFoundingRecord }
  | { ok: false; reason: 'not_found' | 'expired' | 'full' | 'already_member' };

export function joinFoundingByToken(
  token: string,
  userId: string,
  userName: string,
): JoinResult {
  const record = findByToken(token);
  if (!record) {
    return { ok: false, reason: 'not_found' };
  }
  if (record.status === 'expired') {
    return { ok: false, reason: 'expired' };
  }
  if (record.status === 'active') {
    return { ok: true, record };
  }
  if (record.members.some((member) => member.userId === userId)) {
    return { ok: true, record };
  }
  if (record.members.length >= FOUNDING_REQUIRED_MEMBERS) {
    return { ok: false, reason: 'full' };
  }

  const member: FoundingMember = {
    userId,
    name: userName,
    joinedAt: new Date().toISOString(),
  };
  const members = [...record.members, member];
  const status = members.length >= FOUNDING_REQUIRED_MEMBERS ? 'forming' : 'pending';

  return {
    ok: true,
    record: saveRecord({
      ...record,
      members,
      status,
    }),
  };
}

export type QuizSubmitResult =
  | { ok: true; record: ClassFoundingRecord }
  | { ok: false; reason: 'not_forming' | 'invalid_quizzes' };

export function submitFoundingQuizzes(
  schoolName: string,
  className: string,
  quizzes: string[],
): QuizSubmitResult {
  const record = getFounding(schoolName, className);
  if (!record || record.status !== 'forming') {
    return { ok: false, reason: 'not_forming' };
  }

  const trimmed = quizzes.map((quiz) => quiz.trim()).filter(Boolean);
  if (trimmed.length !== FOUNDING_QUIZ_COUNT) {
    return { ok: false, reason: 'invalid_quizzes' };
  }

  return {
    ok: true,
    record: saveRecord({
      ...record,
      status: 'active',
      quizzes: trimmed,
      activatedAt: new Date().toISOString(),
    }),
  };
}

export type GateResult = { ok: true } | { ok: false; reason: 'wrong_answer' };

export function verifyFoundingGate(
  schoolName: string,
  className: string,
  answers: string[],
): GateResult {
  const record = getFounding(schoolName, className);
  if (!record || record.status !== 'active') {
    return { ok: false, reason: 'wrong_answer' };
  }

  const normalizedAnswers = answers.map((answer) => answer.trim().toLowerCase());
  const normalizedQuizzes = record.quizzes.map((quiz) => quiz.trim().toLowerCase());
  const allMatch = normalizedQuizzes.every(
    (quiz, index) => normalizedAnswers[index] === quiz,
  );

  return allMatch ? { ok: true } : { ok: false, reason: 'wrong_answer' };
}

/** 데모: 가짜 반 친구 1명 입장 시뮬레이션 */
export function simulateFoundingJoin(classKey: string): ClassFoundingRecord | null {
  const records = readAll();
  const record = records[classKey];
  if (!record) return null;

  const touched = touchExpiry(record);
  if (touched.status !== 'pending' && touched.status !== 'forming') {
    return touched;
  }
  if (touched.members.length >= FOUNDING_REQUIRED_MEMBERS) {
    return touched;
  }

  const fakeId = `demo-${touched.members.length + 1}`;
  const fakeName = `Bạn ${String.fromCharCode(64 + touched.members.length)}`;
  const result = joinFoundingByToken(touched.inviteToken, fakeId, fakeName);
  return result.ok ? result.record : null;
}

export function resetAllFoundings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function resetFounding(schoolName: string, className: string): void {
  const records = readAll();
  delete records[buildClassKey(schoolName, className)];
  writeAll(records);
}
