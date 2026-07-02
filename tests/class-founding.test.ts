// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  claimFounding,
  isClassActive,
  joinFoundingByToken,
  resetAllFoundings,
  submitFoundingQuizzes,
  verifyFoundingGate,
} from '@/lib/class-founding';

const SCHOOL = 'THPT Marie Curie';
const CLASS = 'Lớp 11A';

describe('class-founding', () => {
  beforeEach(() => {
    resetAllFoundings();
  });

  it('locks class on first claim and activates after 3 members + quizzes', () => {
    const claim = claimFounding(SCHOOL, CLASS, 'u1', 'Minh');
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const token = claim.record.inviteToken;
    expect(claim.record.status).toBe('pending');
    expect(claim.record.members).toHaveLength(1);

    const join2 = joinFoundingByToken(token, 'u2', 'Lan');
    const join3 = joinFoundingByToken(token, 'u3', 'Hùng');
    expect(join2.ok && join3.ok).toBe(true);
    if (!join2.ok || !join3.ok) return;

    expect(join3.record.status).toBe('forming');
    expect(join3.record.members).toHaveLength(3);

    const quizzes = submitFoundingQuizzes(SCHOOL, CLASS, [
      'cô Lan',
      'bảng đen',
      'góc cửa sổ',
    ]);
    expect(quizzes.ok).toBe(true);
    if (!quizzes.ok) return;

    expect(quizzes.record.status).toBe('active');
    expect(isClassActive(SCHOOL, CLASS)).toBe(true);

    const gate = verifyFoundingGate(SCHOOL, CLASS, ['cô Lan', 'bảng đen', 'góc cửa sổ']);
    expect(gate.ok).toBe(true);

    const wrong = verifyFoundingGate(SCHOOL, CLASS, ['wrong', 'wrong', 'wrong']);
    expect(wrong.ok).toBe(false);
  });

  it('rejects duplicate claim while pending', () => {
    claimFounding(SCHOOL, CLASS, 'u1', 'Minh');
    const again = claimFounding(SCHOOL, CLASS, 'u9', 'Spy');
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe('already_pending');
  });
});
