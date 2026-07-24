import { useState } from 'react';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import {
  replyToPrivateMessage,
  sendAliasMessage,
  sendNamedMessage,
} from './private-message.service';
import type { SenderMode } from './private-message.types';

export function useSendMessage(input: {
  senderId: string | null;
  recipientId: string | undefined;
  circleId: string | undefined;
  replyToMessageId?: string | null;
  onSent?: () => void;
}) {
  const [mode, setMode] = useState<SenderMode>('named');
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!input.senderId) return;
    setPending(true);
    setError('');
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      if (input.replyToMessageId) {
        await replyToPrivateMessage({
          sourceMessageId: input.replyToMessageId,
          actorId: input.senderId,
          senderMode: mode,
          body,
          clientRequestId,
        });
      } else {
        if (!input.recipientId || !input.circleId) return;
        if (mode === 'alias') {
          await sendAliasMessage({
            circleId: input.circleId,
            senderId: input.senderId,
            recipientId: input.recipientId,
            body,
            clientRequestId,
          });
        } else {
          await sendNamedMessage({
            circleId: input.circleId,
            senderId: input.senderId,
            recipientId: input.recipientId,
            body,
            clientRequestId,
          });
        }
      }
      track('private_note_sent', { mode, market: 'US' });
      setBody('');
      input.onSent?.();
    } catch (e) {
      const msg = toAppError(e).message;
      if (/alias note/i.test(msg)) {
        setError("You can't send an alias note to this person right now.");
      } else {
        setError(msg);
      }
    } finally {
      setPending(false);
    }
  };

  return {
    mode,
    setMode,
    body,
    setBody,
    pending,
    error,
    submit,
  };
}
