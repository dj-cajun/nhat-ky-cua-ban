import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSentMessages } from './private-message.service';
import type { SentMessageItem } from './private-message.types';

export function useSentMessages(userId: string | null) {
  const [items, setItems] = useState<SentMessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const page = await getSentMessages({ viewerId: userId, limit: 20 });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !nextCursor) return;
    const page = await getSentMessages({
      viewerId: userId,
      cursorCreatedAt: nextCursor.createdAt,
      cursorId: nextCursor.id,
      limit: 20,
    });
    setItems((prev) => [...prev, ...page.items]);
    setNextCursor(page.nextCursor);
  }, [userId, nextCursor]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { items, nextCursor, loading, error, reload, loadMore };
}
