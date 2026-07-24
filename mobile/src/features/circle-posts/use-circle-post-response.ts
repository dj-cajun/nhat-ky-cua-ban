import { useState } from 'react';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { circlePresenceService } from '@/features/presence/circle-presence.service';
import {
  acknowledgeCircleNotice,
  getCirclePostSummary,
  respondCirclePoll,
} from './circle-post.service';
import type { CirclePost, CirclePostSummary } from './circle-post.types';

/**
 * DB-first response: only after RPC success do we track Presence responded.
 */
export function useCirclePostResponse(input: {
  userId: string | null;
  post: CirclePost | null;
  onSummary?: (summary: CirclePostSummary) => void;
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const acknowledge = async () => {
    if (!input.userId || !input.post || input.post.type !== 'notice') return;
    setError('');
    setPending(true);
    try {
      const result = await acknowledgeCircleNotice({
        postId: input.post.id,
        userId: input.userId,
      });
      if (!result.responded) {
        throw new Error('Response was not saved.');
      }
      await circlePresenceService.trackResponded(input.post.id);
      track('notice_responded', { type: 'notice', market: 'US' });
      const summary = await getCirclePostSummary(input.post.id, input.userId);
      input.onSummary?.(summary);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setPending(false);
    }
  };

  const vote = async (optionId: string) => {
    if (!input.userId || !input.post || input.post.type !== 'poll') return;
    setError('');
    setPending(true);
    try {
      const result = await respondCirclePoll({
        postId: input.post.id,
        userId: input.userId,
        optionId,
      });
      if (!result.responded) {
        throw new Error('Response was not saved.');
      }
      await circlePresenceService.trackResponded(input.post.id);
      track('notice_responded', { type: 'poll', market: 'US' });
      const summary = await getCirclePostSummary(input.post.id, input.userId);
      input.onSummary?.(summary);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setPending(false);
    }
  };

  return { acknowledge, vote, error, setError, pending };
}
