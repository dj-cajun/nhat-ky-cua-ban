import { describe, expect, it } from 'vitest';
import { defaultClosesAt, validateCreateCirclePost } from '../circle-post.validation';

describe('validateCreateCirclePost', () => {
  it('accepts a valid notice', () => {
    expect(() =>
      validateCreateCirclePost({
        type: 'notice',
        title: 'Bring gym clothes',
        closesAt: defaultClosesAt(),
      }),
    ).not.toThrow();
  });

  it('rejects short active windows and duplicate poll options', () => {
    expect(() =>
      validateCreateCirclePost({
        type: 'notice',
        title: 'Hi',
        closesAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
    ).toThrow(/10 minutes/);

    expect(() =>
      validateCreateCirclePost({
        type: 'poll',
        title: 'Where?',
        closesAt: defaultClosesAt(),
        options: ['School', 'School'],
      }),
    ).toThrow(/unique/);
  });
});
