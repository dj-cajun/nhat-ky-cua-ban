import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getReceivedMessages } from './private-message.service';
import type { ReceivedMessageItem } from './private-message.types';

export function useReceivedMessages(userId: string | null) {
  const [items, setItems] = useState<ReceivedMessageItem[]>([]);
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
      const page = await getReceivedMessages({ viewerId: userId, limit: 20 });
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
    const page = await getReceivedMessages({
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
