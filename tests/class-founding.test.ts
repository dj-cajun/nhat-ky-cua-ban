// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  canEnterClassHome,
  claimFounding,
  isClassActive,
  joinFoundingByToken,
  markGatePassed,
  resetAllFoundings,
  submitFoundingQuizzes,
  verifyFoundingGate,
} from '@/lib/class-founding';
import { resolveFoundingRoute } from '@/lib/founding-router';

const SCHOOL = 'Close circle';
const CLASS = 'Weekend crew';

describe('class-founding', () => {
  beforeEach(() => {
    resetAllFoundings();
  });

  it('locks circle on first claim and activates after 3 members + quizzes', () => {
    const claim = claimFounding(SCHOOL, CLASS, 'u1', 'Maya');
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const token = claim.record.inviteToken;
    const join2 = joinFoundingByToken(token, 'u2', 'Sam');
    const join3 = joinFoundingByToken(token, 'u3', 'Casey');
    expect(join2.ok && join3.ok).toBe(true);
    if (!join2.ok || !join3.ok) return;

    expect(join3.record.status).toBe('forming');

    const quizzes = submitFoundingQuizzes(SCHOOL, CLASS, [
      'friday study',
      'blue couch',
      'corner cafe',
    ]);
    expect(quizzes.ok).toBe(true);
    if (!quizzes.ok) return;

    expect(quizzes.record.status).toBe('active');
    expect(isClassActive(SCHOOL, CLASS)).toBe(true);
    expect(canEnterClassHome(SCHOOL, CLASS, 'u1')).toBe(true);
    expect(canEnterClassHome(SCHOOL, CLASS, 'u9')).toBe(false);

    const gate = verifyFoundingGate(
      SCHOOL,
      CLASS,
      ['friday study', 'blue couch', 'corner cafe'],
      'u9',
    );
    expect(gate.ok).toBe(true);
    expect(canEnterClassHome(SCHOOL, CLASS, 'u9')).toBe(true);
  });

  it('routes non-members to waiting while pending', () => {
    claimFounding(SCHOOL, CLASS, 'u1', 'Maya');
    const route = resolveFoundingRoute(SCHOOL, CLASS, 'u9');
    expect(route.stage).toBe('waiting');
  });

  it('routes 4th user to gate when circle is active', () => {
    const claim = claimFounding(SCHOOL, CLASS, 'u1', 'Maya');
    if (!claim.ok) return;
    joinFoundingByToken(claim.record.inviteToken, 'u2', 'Sam');
    joinFoundingByToken(claim.record.inviteToken, 'u3', 'Casey');
    submitFoundingQuizzes(SCHOOL, CLASS, ['a', 'b', 'c']);

    const route = resolveFoundingRoute(SCHOOL, CLASS, 'u9');
    expect(route.stage).toBe('gate');
    markGatePassed(SCHOOL, CLASS, 'u9');
    expect(resolveFoundingRoute(SCHOOL, CLASS, 'u9').stage).toBe('home');
  });
});
