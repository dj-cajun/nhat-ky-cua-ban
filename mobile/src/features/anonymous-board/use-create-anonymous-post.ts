import { useState } from 'react';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { createAnonymousPost, getOrCreateCircleAlias } from './anonymous-board.service';
import type { CircleAlias } from './anonymous-board.types';

export function useCreateAnonymousPost(input: {
  circleId: string | undefined;
  userId: string | null;
  onCreated?: () => void;
}) {
  const [alias, setAlias] = useState<CircleAlias | null>(null);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const ensureAlias = async () => {
    if (!input.circleId || !input.userId) return null;
    const a = await getOrCreateCircleAlias(input.circleId, input.userId);
    setAlias(a);
    return a;
  };

  const submit = async () => {
    if (!input.circleId || !input.userId) return;
    setPending(true);
    setError('');
    try {
      await ensureAlias();
      await createAnonymousPost({
        circleId: input.circleId,
        userId: input.userId,
        body,
        clientRequestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      track('anonymous_post_created', { market: 'US' });
      setBody('');
      input.onCreated?.();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setPending(false);
    }
  };

  return { alias, body, setBody, pending, error, submit, ensureAlias };
}
