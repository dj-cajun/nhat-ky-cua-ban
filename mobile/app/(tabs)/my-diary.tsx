import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppErrorState, AppLoadingState } from '@/components/states';
import {
  getSessionProfile,
  listMyCircleSummaries,
} from '@/features/local/repository';
import {
  openDiaryFromCircle,
  peekCircleGraph,
} from '@/features/universe-home/circle-visit';
import { colors } from '@/constants/theme';
import { toAppError } from '@/lib/errors';

/**
 * Diary tab → pastel mini-hompy at `/diary/[userId]`.
 * Prefer last/primary circle context so back returns to the orb room.
 */
export default function MyDiaryTab() {
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setError('');
        try {
          const p = await getSessionProfile();
          if (cancelled) return;
          if (!p) {
            router.replace('/(auth)/sign-in');
            return;
          }
          const remembered = peekCircleGraph();
          if (remembered) {
            openDiaryFromCircle(p.id, remembered);
            return;
          }
          const circles = await listMyCircleSummaries(p.id);
          const primary = circles[0]?.id;
          if (primary) {
            openDiaryFromCircle(p.id, primary);
            return;
          }
          router.replace(`/diary/${p.id}`);
        } catch (e) {
          if (!cancelled) setError(toAppError(e).message);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      {error ? (
        <AppErrorState message={error} onRetry={() => router.replace('/(tabs)/my-diary')} />
      ) : (
        <AppLoadingState />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
