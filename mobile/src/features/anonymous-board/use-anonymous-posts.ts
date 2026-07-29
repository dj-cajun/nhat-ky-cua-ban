import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAnonymousCirclePosts } from './anonymous-board.service';
import type { AnonymousPostItem } from './anonymous-board.types';

export function useAnonymousPosts(circleId: string | undefined, userId: string | null) {
  const [items, setItems] = useState<AnonymousPostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!circleId || !userId) {
      setItems([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const page = await getAnonymousCirclePosts({
        circleId,
        viewerId: userId,
        limit: 20,
      });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [circleId, userId]);

  const loadMore = useCallback(async () => {
    if (!circleId || !userId || !nextCursor) return;
    const page = await getAnonymousCirclePosts({
      circleId,
      viewerId: userId,
      cursorCreatedAt: nextCursor.createdAt,
      cursorId: nextCursor.id,
      limit: 20,
    });
    setItems((prev) => [...prev, ...page.items]);
    setNextCursor(page.nextCursor);
  }, [circleId, userId, nextCursor]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { items, nextCursor, loading, error, reload, loadMore };
}
