import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  canCreateCirclePost,
  getActiveCirclePost,
  getCirclePostSummary,
  listCirclePollOptions,
} from './circle-post.service';
import type { CirclePost, CirclePostSummary, PollOption } from './circle-post.types';

export function useActiveCirclePost(circleId: string | undefined, userId: string | null) {
  const [post, setPost] = useState<CirclePost | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [summary, setSummary] = useState<CirclePostSummary | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!circleId || !userId) {
      setPost(null);
      setOptions([]);
      setSummary(null);
      setCanCreate(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const active = await getActiveCirclePost(circleId);
    setPost(active);
    setCanCreate(await canCreateCirclePost(circleId, userId));
    if (active) {
      const sum = await getCirclePostSummary(active.id, userId);
      setSummary(sum);
      if (active.type === 'poll') {
        setOptions(await listCirclePollOptions(active.id));
      } else {
        setOptions([]);
      }
    } else {
      setSummary(null);
      setOptions([]);
    }
    setLoading(false);
  }, [circleId, userId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { post, options, summary, canCreate, loading, reload };
}
