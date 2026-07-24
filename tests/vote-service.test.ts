import { describe, expect, it } from 'vitest';
import { generateVoteQuestions } from '@/lib/vote-service';
import { VOTE_QUESTIONS } from '@/lib/seed-data';

describe('vote-service', () => {
  it('generates 12 vote questions with 4 options each', () => {
    const questions = generateVoteQuestions();
    expect(questions).toHaveLength(12);
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options[0].name).toBeTruthy();
  });

  it('has 12 seed question templates', () => {
    expect(VOTE_QUESTIONS).toHaveLength(12);
  });
});
