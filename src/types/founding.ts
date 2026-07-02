export type FoundingStatus = 'pending' | 'forming' | 'active' | 'expired';

export interface FoundingMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface ClassFoundingRecord {
  classKey: string;
  schoolName: string;
  className: string;
  status: FoundingStatus;
  founderUserId: string;
  founderName: string;
  inviteToken: string;
  members: FoundingMember[];
  quizzes: string[];
  createdAt: string;
  expiresAt: string;
  activatedAt?: string;
}

export const FOUNDING_REQUIRED_MEMBERS = 3;
export const FOUNDING_QUIZ_COUNT = 3;
export const FOUNDING_TTL_MS = 24 * 60 * 60 * 1000;

export function buildClassKey(schoolName: string, className: string): string {
  return `${schoolName}::${className}`;
}
